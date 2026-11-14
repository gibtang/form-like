import { auth } from "@/auth";
import { newId } from "@/lib/ids";
import type { FormDefinition } from "@/lib/form-schema";
import { DraftEditor } from "../dashboard/forms/[formId]/editor";

export const metadata = { title: "Create a form" };

const STARTER: FormDefinition = {
  title: "Untitled form",
  description: null,
  fields: [
    {
      fieldId: newId("fld_"),
      type: "short_text",
      label: "Your question",
      description: null,
      required: false,
      options: null,
      ratingMax: null,
      placeholder: null,
      conditionalRule: null,
    },
  ],
};

/**
 * Open builder: no account required. The draft lives in browser storage;
 * saving prompts anonymous visitors to create an account, then persists the
 * draft into it (see DraftEditor guest mode).
 */
export default async function CreatePage() {
  const session = await auth();
  return <DraftEditor mode="guest" authed={!!session?.user?.id} initialDefinition={STARTER} />;
}
