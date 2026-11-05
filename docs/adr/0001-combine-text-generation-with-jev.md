---
status: accepted
---

# Combine text generation with Jev for form creation

Creators describe forms and subsequent changes in natural language. A text-generating model drafts questions, descriptions, and answer options; Jev selects appropriate controls and presentation from a supplied component catalogue. Gibson accepted this recommendation on 2026-11-05: this supports original question wording while using Jev's bounded decisions to assemble an interface from existing components.

Jev alone could select existing questions and components, but would require the wording to come from user input or a prewritten catalogue.

Gibson accepted OpenAI's Responses API with GPT-5.4 Mini for drafting structured definitions and edits, followed by Jev selection from a form-specific shadcn/ui catalogue. Initial defaults are `gpt-5.4-mini-2026-03-17` and `jev-1.14.0`, configurable in the server environment. The application validates field types, references, limits, and edit operations before presenting a proposal; schema-conforming output alone does not establish that a form is usable or that an edit matches the creator's intent.

References: [TypeSafe quick start](https://docs.typesafe.ai/introduction/quickstart), [Instinct demonstration](https://github.com/joevidev/ui-generator-instinct-jev), [GPT-5.4 Mini](https://developers.openai.com/api/docs/models/gpt-5.4-mini), [TypeSafe model versions](https://docs.typesafe.ai/models).
