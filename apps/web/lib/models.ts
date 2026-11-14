import mongoose, { Schema, type Model, type InferSchemaType } from "mongoose";
import { newId } from "./ids";

/**
 * Auth.js v5 (MongoDB adapter) owns the core identity fields; passwordHash is
 * null for Google-only accounts. email is unique and lowercased.
 */
const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    emailVerified: { type: Date, default: null },
    name: { type: String, default: null },
    image: { type: String, default: null },
    passwordHash: { type: String, default: null },
    createdAt: { type: Date, required: true, default: () => new Date() },
  },
  { collection: "users" },
);

const verificationTokenSchema = new Schema(
  {
    userId: { type: String, required: true },
    tokenHash: { type: String, required: true, unique: true },
    purpose: { type: String, enum: ["verify", "reset"], required: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
    createdAt: { type: Date, required: true, default: () => new Date() },
  },
  { collection: "verification_tokens" },
);
verificationTokenSchema.index({ userId: 1, purpose: 1 });

const fieldSubSchema = new Schema(
  {
    fieldId: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: [
        "short_text",
        "long_text",
        "email",
        "number",
        "date",
        "single_choice",
        "multiple_choice",
        "rating",
      ],
    },
    label: { type: String, required: true },
    description: { type: String, default: null },
    required: { type: Boolean, default: false },
    options: [
      new Schema(
        {
          optionId: { type: String, required: true },
          label: { type: String, required: true },
        },
        { _id: false },
      ),
    ],
    ratingMax: { type: Number, default: null },
    placeholder: { type: String, default: null },
    conditionalRule: {
      type: new Schema(
        {
          fieldId: { type: String, required: true },
          operator: { type: String, required: true },
          value: { type: Schema.Types.Mixed, required: true },
        },
        { _id: false },
      ),
      default: null,
    },
  },
  { _id: false },
);

/**
 * The creator's editable container. `draft` holds the working definition;
 * published snapshots live in FormVersion and never change. Status tracks
 * the public lifecycle: draft → published → (closed | archived).
 */
const formSchema = new Schema(
  {
    formId: { type: String, required: true, default: () => newId("frm_"), unique: true },
    ownerId: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: null },
    draft: {
      type: new Schema(
        {
          title: { type: String, required: true },
          description: { type: String, default: null },
          fields: { type: [fieldSubSchema], default: [] },
        },
        { _id: false },
      ),
      required: true,
    },
    status: {
      type: String,
      enum: ["draft", "published", "closed", "archived"],
      required: true,
      default: "draft",
    },
    versionCounter: { type: Number, required: true, default: 0 },
    latestVersionId: { type: String, default: null },
    /** Optional creator notification address; null = creator's verified account email. */
    notifyEmail: { type: String, default: null },
    /**
     * Auto-send submission notifications. Schema default true covers new
     * forms; forms created before this field existed have no value, and an
     * absent field reads as off so legacy forms stay silent until toggled.
     */
    emailNotifications: { type: Boolean, default: true },
    /** Consecutive failed notification sends; reset on a success. */
    notificationFailureCount: { type: Number, default: 0 },
    /** Set after repeated send failures; auto-email stays off until re-enabled. */
    notificationsDisabledAt: { type: Date, default: null },
    notificationsDisabledReason: { type: String, default: null },
    /** Daily send-cap bookkeeping (UTC date string + count). */
    notificationsSentOn: { type: String, default: null },
    notificationsSentCount: { type: Number, default: 0 },
    closedAt: { type: Date, default: null },
    archivedAt: { type: Date, default: null },
    createdAt: { type: Date, required: true, default: () => new Date() },
    updatedAt: { type: Date, required: true, default: () => new Date() },
  },
  { collection: "forms" },
);
formSchema.index({ ownerId: 1, updatedAt: -1 });

/** Immutable published snapshot; the public link serves the latest one. */
const formVersionSchema = new Schema(
  {
    versionId: { type: String, required: true, default: () => newId("ver_"), unique: true },
    formId: { type: String, required: true },
    versionNumber: { type: Number, required: true },
    definition: {
      type: new Schema(
        {
          title: { type: String, required: true },
          description: { type: String, default: null },
          fields: { type: [fieldSubSchema], required: true },
        },
        { _id: false },
      ),
      required: true,
    },
    publishedAt: { type: Date, required: true, default: () => new Date() },
  },
  { collection: "form_versions" },
);
formVersionSchema.index({ formId: 1, versionNumber: -1 });

/** Each submission is tied to the exact version the respondent answered. */
const submissionSchema = new Schema(
  {
    submissionId: { type: String, required: true, default: () => newId("sub_"), unique: true },
    formId: { type: String, required: true },
    versionId: { type: String, required: true },
    answers: [
      new Schema(
        {
          fieldId: { type: String, required: true },
          /** Text/email/number/date/rating answers. */
          value: { type: Schema.Types.Mixed, default: null },
          /** Choice answers reference the version's optionIds. */
          optionIds: { type: [String], default: [] },
        },
        { _id: false },
      ),
    ],
    submittedAt: { type: Date, required: true, default: () => new Date() },
  },
  { collection: "submissions" },
);
submissionSchema.index({ formId: 1, submittedAt: -1 });
submissionSchema.index({ versionId: 1 });

export type UserDoc = mongoose.HydratedDocument<InferSchemaType<typeof userSchema>>;
export type VerificationTokenDoc = mongoose.HydratedDocument<
  InferSchemaType<typeof verificationTokenSchema>
>;
export type FormDoc = mongoose.HydratedDocument<InferSchemaType<typeof formSchema>>;
export type FormVersionDoc = mongoose.HydratedDocument<InferSchemaType<typeof formVersionSchema>>;
export type SubmissionDoc = mongoose.HydratedDocument<InferSchemaType<typeof submissionSchema>>;

export const User: Model<UserDoc> =
  (mongoose.models.User as Model<UserDoc>) ?? mongoose.model<UserDoc>("User", userSchema);

export const VerificationToken: Model<VerificationTokenDoc> =
  (mongoose.models.VerificationToken as Model<VerificationTokenDoc>) ??
  mongoose.model<VerificationTokenDoc>("VerificationToken", verificationTokenSchema);

export const Form: Model<FormDoc> =
  (mongoose.models.Form as Model<FormDoc>) ?? mongoose.model<FormDoc>("Form", formSchema);

export const FormVersion: Model<FormVersionDoc> =
  (mongoose.models.FormVersion as Model<FormVersionDoc>) ??
  mongoose.model<FormVersionDoc>("FormVersion", formVersionSchema);

export const Submission: Model<SubmissionDoc> =
  (mongoose.models.Submission as Model<SubmissionDoc>) ??
  mongoose.model<SubmissionDoc>("Submission", submissionSchema);

/** Bearer tokens for the authenticated MCP server (fl_live_…). */
const apiTokenSchema = new Schema(
  {
    tokenId: { type: String, required: true, default: () => newId("tok_"), unique: true },
    userId: { type: String, required: true },
    name: { type: String, required: true },
    keyHash: { type: String, required: true, unique: true },
    keyPrefix: { type: String, required: true },
    revokedAt: { type: Date, default: null },
    lastUsedAt: { type: Date, default: null },
    createdAt: { type: Date, required: true, default: () => new Date() },
  },
  { collection: "api_tokens" },
);
apiTokenSchema.index({ userId: 1 });

export type ApiTokenDoc = mongoose.HydratedDocument<InferSchemaType<typeof apiTokenSchema>>;

export const ApiToken: Model<ApiTokenDoc> =
  (mongoose.models.ApiToken as Model<ApiTokenDoc>) ?? mongoose.model<ApiTokenDoc>("ApiToken", apiTokenSchema);
