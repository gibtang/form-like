# Prompt Form SaaS

The language of a product where people describe forms, refine them through further prompts, and share them publicly.

## Language

**Form**:
A collection of fields and explanatory content intended to collect information from people.

**Field**:
A named item of information requested within a form.

**Creator prompt**:
An instruction describing a form to create or a change to an existing form.
_Avoid_: Prompt, when distinguishing a creator's request from the operator's private generation instructions.

**Generation instructions**:
The operator's instructions guiding how creator prompts become forms and form edits.
_Avoid_: Creator prompt.

**Creator**:
A person who creates, refines, and publishes a form. A visitor holding a guest draft becomes a creator when the draft is saved.
_Avoid_: User, when distinguishing the person building a form from the person answering it.

**Respondent**:
A person who provides answers to a published form.
_Avoid_: User, when distinguishing the person answering a form from its creator.

**Draft**:
A form being prepared or revised by its creator before publication.

**Guest draft**:
A draft built without a creator account, kept in the visitor's browser until saved into an account. A form does not exist until a guest draft is saved.
_Avoid_: Anonymous form, when referring to the unsaved browser artifact.

**Published form**:
A form made available to respondents through a public link, serving the version most recently published by its creator.

**Form version**:
A fixed snapshot of a form's questions, answer options, and presentation at publication.

**Submission**:
A respondent's submitted set of answers, associated with the form version they answered.
_Avoid_: Response, when referring to the complete submission rather than an individual answer.

**Answer**:
A value supplied for a particular field within a submission.

**Conditional rule**:
A creator-configured condition that shows a field based on another field's answer.
_Avoid_: AI adaptation, when referring to branching established before publication.

**Proposed edit**:
An AI-generated change to a draft presented for the creator to apply or discard.

**Closed form**:
A published form that has stopped accepting submissions and displays a closed message at its public link.

**Archived form**:
A form put aside by its creator without permanently deleting its definition or submissions.

**Publish update**:
The creator's explicit action that makes a revised draft available at an existing public link.

**Public link**:
A stable, shareable address through which people can access a published form across subsequent updates.
