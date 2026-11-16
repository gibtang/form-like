import { ObjectId, type Collection, type Db, type Filter, type OptionalUnlessRequiredId } from "mongodb";
import { newId } from "./ids";
import { getDb } from "./db";

/**
 * Plain typed documents mirroring the shapes mongoose previously wrote to
 * Atlas. The mongodb driver returns these as-is (always includes _id), so no
 * hydration or lean() conversion is needed.
 */
export interface UserDoc {
  _id: ObjectId;
  email: string;
  emailVerified: Date | null;
  name: string | null;
  image: string | null;
  passwordHash: string | null;
  /** Stripe billing snapshot; subscriptionStatus is the last-seen Stripe status. */
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: string | null;
  proSince: Date | null;
  proUntil: Date | null;
  proCancelAtPeriodEnd: boolean;
  /** Submissions rejected this month because the free cap was reached. */
  quotaRejectedMonth: string | null;
  quotaRejectedCount: number;
  createdAt: Date;
}

export interface VerificationTokenDoc {
  _id: ObjectId;
  userId: string;
  tokenHash: string;
  purpose: "verify" | "reset";
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export interface FormFieldDoc {
  fieldId: string;
  type: "short_text" | "long_text" | "email" | "number" | "date" | "single_choice" | "multiple_choice" | "rating";
  label: string;
  description: string | null;
  required: boolean;
  options: { optionId: string; label: string }[] | null;
  ratingMax: number | null;
  placeholder?: string | null;
  conditionalRule: { fieldId: string; operator: string; value: unknown } | null;
}

export interface FormDraftDoc {
  title: string;
  description: string | null;
  fields: FormFieldDoc[];
}

export interface FormDoc {
  _id: ObjectId;
  formId: string;
  ownerId: string;
  title: string;
  description: string | null;
  draft: FormDraftDoc;
  status: "draft" | "published" | "closed" | "archived";
  versionCounter: number;
  latestVersionId: string | null;
  notifyEmail: string | null;
  /**
   * Auto-send submission notifications. Default true covers new forms;
   * forms created before this field existed have no value, and an absent
   * field reads as off so legacy forms stay silent until toggled.
   */
  emailNotifications?: boolean;
  /** Consecutive failed notification sends; reset on a success. */
  notificationFailureCount: number;
  /** Set after repeated send failures; auto-email stays off until re-enabled. */
  notificationsDisabledAt: Date | null;
  notificationsDisabledReason: string | null;
  /** Daily send-cap bookkeeping (UTC date string + count). */
  notificationsSentOn: string | null;
  notificationsSentCount: number;
  closedAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FormVersionDoc {
  _id: ObjectId;
  versionId: string;
  formId: string;
  versionNumber: number;
  definition: FormDraftDoc;
  publishedAt: Date;
}

export interface SubmissionDoc {
  _id: ObjectId;
  submissionId: string;
  formId: string;
  versionId: string;
  answers: { fieldId: string; value: unknown; optionIds: string[] }[];
  submittedAt: Date;
}

export interface ApiTokenDoc {
  _id: ObjectId;
  tokenId: string;
  userId: string;
  name: string;
  keyHash: string;
  keyPrefix: string;
  revokedAt: Date | null;
  lastUsedAt: Date | null;
  createdAt: Date;
}

/** Casts a stored string id (e.g. a serialized user id) back to ObjectId. */
export function toId(id: string): ObjectId {
  return new ObjectId(id);
}

type UpdateSpec = Record<string, unknown>;

/** Wraps bare field updates in $set like mongoose did; $-operators pass through. */
function normalizeUpdate(update: UpdateSpec): UpdateSpec {
  return Object.keys(update).some((k) => k.startsWith("$")) ? update : { $set: update };
}

interface FindOneAndUpdateOptions {
  new?: boolean;
  upsert?: boolean;
  returnDocument?: "after" | "before";
  projection?: Record<string, unknown>;
}

/** Awaitable find chain covering sort/limit/lean as used across the app. */
class FindQuery<T extends Doc> implements PromiseLike<T[]> {
  #exec: () => Promise<T[]>;

  constructor(
    private col: () => Promise<Collection<T>>,
    private filter: Filter<T>,
    private sortSpec: Record<string, 1 | -1> = {},
    private limitN?: number,
    private projection?: Record<string, unknown>,
  ) {
    this.#exec = async () => {
      const options: Record<string, unknown> = {};
      if (Object.keys(this.sortSpec).length > 0) options.sort = this.sortSpec;
      if (this.limitN !== undefined) options.limit = this.limitN;
      if (this.projection) options.projection = this.projection;
      return (await this.col()).find(this.filter, options).toArray() as Promise<T[]>;
    };
  }

  sort(spec: Record<string, 1 | -1>): FindQuery<T> {
    return new FindQuery(this.col, this.filter, spec, this.limitN, this.projection);
  }

  limit(n: number): FindQuery<T> {
    return new FindQuery(this.col, this.filter, this.sortSpec, n, this.projection);
  }

  /** Kept for call-site compatibility with the mongoose API; driver docs are already plain. */
  lean(): Promise<T[]> {
    return this.#exec();
  }

  then<R1 = T[], R2 = never>(
    onfulfilled?: ((value: T[]) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ): PromiseLike<R1 | R2> {
    return this.#exec().then(onfulfilled, onrejected);
  }
}

type DefaultsFactory<T> = () => Partial<T>;

/** Any stored document: plain object with an ObjectId _id. */
type Doc = { _id: ObjectId };

/**
 * Minimal model facade over one collection: the subset of the mongoose model
 * API this app uses, backed by the raw mongodb driver (required for
 * Cloudflare Workers nodejs_compat; mongoose is not Workers-compatible).
 */
export class Model<T extends Doc> {
  constructor(
    private collectionName: string,
    private defaults: DefaultsFactory<T>,
  ) {}

  private async col(): Promise<Collection<T>> {
    const db: Db = await getDb();
    return db.collection<T>(this.collectionName);
  }

  async findOne(filter: Filter<T>, opts: { projection?: Record<string, unknown> } = {}): Promise<T | null> {
    // Collection<T> is typed to return WithId<T>; stored docs already carry _id.
    return (await this.col()).findOne(filter, opts) as unknown as T | null;
  }

  /** Accepts a hex ObjectId string; null for malformed ids (not an error). */
  async findById(id: string): Promise<T | null> {
    if (!ObjectId.isValid(id)) return null;
    return this.findOne({ _id: new ObjectId(id) } as Filter<T>);
  }

  find(filter: Filter<T>, opts: { projection?: Record<string, unknown> } = {}): FindQuery<T> {
    return new FindQuery(() => this.col(), filter, {}, undefined, opts.projection);
  }

  /** Applies schema defaults, inserts, and returns the full stored doc. */
  async create(data: Partial<T>): Promise<T> {
    const doc = { ...this.defaults(), ...data } as OptionalUnlessRequiredId<T>;
    const result = await (await this.col()).insertOne(doc);
    return { ...(doc as T), _id: result.insertedId } as T;
  }

  async updateOne(
    filter: Filter<T>,
    update: UpdateSpec,
    opts: { upsert?: boolean } = {},
  ): Promise<{ matchedCount: number; modifiedCount: number }> {
    const result = await (await this.col()).updateOne(filter, normalizeUpdate(update), { upsert: opts.upsert });
    return { matchedCount: result.matchedCount, modifiedCount: result.modifiedCount };
  }

  async deleteOne(filter: Filter<T>): Promise<{ deletedCount: number }> {
    const result = await (await this.col()).deleteOne(filter);
    return { deletedCount: result.deletedCount ?? 0 };
  }

  async deleteMany(filter: Filter<T>): Promise<{ deletedCount: number }> {
    const result = await (await this.col()).deleteMany(filter);
    return { deletedCount: result.deletedCount ?? 0 };
  }

  async findOneAndUpdate(
    filter: Filter<T>,
    update: UpdateSpec,
    opts: FindOneAndUpdateOptions = {},
  ): Promise<T | null> {
    const after = opts.new === true || opts.returnDocument === "after";
    return (await this.col()).findOneAndUpdate(filter, normalizeUpdate(update), {
      returnDocument: after ? "after" : "before",
      upsert: opts.upsert,
      projection: opts.projection,
      includeResultMetadata: false,
    }) as unknown as T | null;
  }

  async countDocuments(filter: Filter<T>): Promise<number> {
    return (await this.col()).countDocuments(filter);
  }
}

/* Auth.js v5 (MongoDB adapter) owns the core identity fields; passwordHash is
 * null for Google-only accounts. email is unique and lowercased. */
export const User = new Model<UserDoc>("users", () => ({
  emailVerified: null,
  name: null,
  image: null,
  passwordHash: null,
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  subscriptionStatus: null,
  proSince: null,
  proUntil: null,
  proCancelAtPeriodEnd: false,
  quotaRejectedMonth: null,
  quotaRejectedCount: 0,
  createdAt: new Date(),
}));

export const VerificationToken = new Model<VerificationTokenDoc>("verification_tokens", () => ({
  usedAt: null,
  createdAt: new Date(),
}));

/**
 * The creator's editable container. `draft` holds the working definition;
 * published snapshots live in FormVersion and never change. Status tracks
 * the public lifecycle: draft → published → (closed | archived).
 */
export const Form = new Model<FormDoc>("forms", () => ({
  formId: newId("frm_"),
  description: null,
  status: "draft",
  versionCounter: 0,
  latestVersionId: null,
  notifyEmail: null,
  emailNotifications: true,
  notificationFailureCount: 0,
  notificationsDisabledAt: null,
  notificationsDisabledReason: null,
  notificationsSentOn: null,
  notificationsSentCount: 0,
  closedAt: null,
  archivedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}));

/** Immutable published snapshot; the public link serves the latest one. */
export const FormVersion = new Model<FormVersionDoc>("form_versions", () => ({
  versionId: newId("ver_"),
  publishedAt: new Date(),
}));

/** Each submission is tied to the exact version the respondent answered. */
export const Submission = new Model<SubmissionDoc>("submissions", () => ({
  submissionId: newId("sub_"),
  submittedAt: new Date(),
}));

/** Bearer tokens for the authenticated MCP server (fl_live_…). */
export const ApiToken = new Model<ApiTokenDoc>("api_tokens", () => ({
  revokedAt: null,
  lastUsedAt: null,
  createdAt: new Date(),
}));
