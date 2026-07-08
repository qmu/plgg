# Pragmatic — input-field model (AI-generatable + AI-operable)

**Status:** Specification (2026-07-08). The input half of the near-term specification work derived from the Pragmatic concept ([`20260708-pragmatic-ai-native-ui-concept.md`](20260708-pragmatic-ai-native-ui-concept.md)). It **reuses — does not fork — the shared "AI-generatable / AI-operable" property set defined in §5 of the sibling transition spec** ([`20260708-pragmatic-screen-transition-model.md`](20260708-pragmatic-screen-transition-model.md)); the two specs compose into one model.

> **Naming.** *Pragmatic* is the concept/product name; `plggmatic` is the package. This document describes the **input-field** mechanism: how an input carries its *function* — which control expresses which data type, what validation/casting it enforces, what affordance it presents — so a generating AI can assemble the right input for a data structure, and an operating agent (including a browser-side WebMCP agent) can fill and submit it.

**How to read the evidence.** Every claim about *current, shipped behavior* cites the code by `path:line`. Every property not yet realized is tagged **Proposed** (a target) or **Partial** (present but incomplete). Unqualified prose describes the current samples (per `workaholic:implementation` / `objective-documentation.md`).

The two grounding samples are:

- **plggmatic's `Form/` layer** — `FieldSpec`/`parseForm`/`errorFor` (`packages/plggmatic/src/Form/`), the `ControlKind` union (`Form/model/control.ts`), the `SubmissionState` (`Form/model/submission.ts`), and the controls `textInput`/`textArea`/`selectInput`/`checkbox` (`packages/plggmatic/src/Component/`), with caster-parsed submission and framework-owned accessibility wiring (`Form/usecase/controlParts.ts`).
- **Demo 1** — the `SectionField` descriptor (`packages/plggmatic-example/src/demo1/fields.ts`) that drives control kind, label, validation, and the field-input message from data, and the descriptor → caster → record path (`packages/plggmatic-example/src/demo1/logic.ts`).

---

## 1. Vocabulary (fixed terms)

Aligned with the transition spec (`20260708-pragmatic-screen-transition-model.md` §1); the input-specific terms:

- **Field** — one input's parse contract: a name plus a caster: `FieldSpec` (`packages/plggmatic/src/Form/usecase/parseForm.ts:25`).
- **Control** — the visual/interactive form element expressing a field: the closed `ControlKind` union `text | textarea | select | checkbox` (`packages/plggmatic/src/Form/model/control.ts:7`) and the components that render each (`packages/plggmatic/src/Component/`).
- **Caster / validation** — the `asX(unknown) => Result<X, InvalidError>` function that *is* the validation ("parse, don't validate"): the `cast` field of a `FieldSpec` (`parseForm.ts:25-30`).
- **Payload** — the parsed, typed result: `Payload = Record<string, Datum>` (`parseForm.ts:38-40`).
- **Submission state** — the form's in-flight state: `SubmissionState = Idle | Pending` (`Form/model/submission.ts:18-20`).

---

## 2. The current model, factually (with evidence)

### 2.1 A field is a name + a caster; the caster IS the validation

`FieldSpec` is `{ name, cast: (value: unknown) => Result<Datum, InvalidError> }` (`Form/usecase/parseForm.ts:25-30`). There is no second validate-then-convert layer — the caster parses the raw draft directly into a typed value or an `InvalidError` (`parseForm.ts:18-24`, "parse, don't validate"). This is the crux of the whole model: the caster is the field's **contract**, the boundary where an untrusted string becomes a domain type (`workaholic:implementation` / `type-driven-design.md`).

Demo 1's casters are concrete instances: `asFilled` rejects blank/whitespace with `"Required"`, `asOptionalText` always succeeds with a trimmed string (`packages/plggmatic-example/src/demo1/logic.ts:98-111`). A field's `required` flag simply selects which caster applies (`logic.ts:121-133`).

### 2.2 Control kinds are a closed set

Which control renders a field is one of four closed `ControlKind`s — `text | textarea | select | checkbox` (`Form/model/control.ts:7-14`). The union is closed, so a renderer's `match` is exhaustive and a new control kind cannot be added without every interpreter site acknowledging it (`control.ts:1-6`).

### 2.3 Every control is a pure, controlled, accessible function of props

Each control is a pure `(props) => Html<Msg>` whose value comes from props, never internal state. `textInput` (`Component/usecase/textInput.ts:51-88`) and `selectInput` (`Component/usecase/selectInput.ts:51-85`) both: associate a real `<label for=name>` (`controlParts.ts:29-39`), carry `id`/`name` equal to the field name (`textInput.ts:60-61`, `selectInput.ts:60-62`), report changes via `onInput`/`onChange` (`textInput.ts:82`, `selectInput.ts:68`), and surface errors via `aria-invalid` + `aria-describedby` pointing at a `role="alert"` error node (`controlParts.ts:53-88`). A `select` marks the current option `selected` from props (`selectInput.ts:74-78`). The accessibility + labelling pieces are framework-owned and identical across all four controls (`controlParts.ts:19-26`).

### 2.4 Parsing collects every error in one pass

`parseForm(specs, draftOf)` runs every field's caster in one pass and collects **all** failures — not fail-fast — so a form shows every field's error at once (`parseForm.ts:49-84`). It returns `Ok(Payload)` when all fields parse or `Err(FormErrors)` (a list of `[name, message]` pairs) otherwise (`parseForm.ts:81-84`). It is total and DOM-free. `errorFor(errors, name)` looks up a field's message as an `Option` (`parseForm.ts:87-104`).

### 2.5 Submission state is a closed union, distinct from the action lifecycle

`SubmissionState = Idle | Pending` (`Form/model/submission.ts:18-20`). `Pending` disables every control and the submit button and withholds hover/press feedback; the action's completion `Msg` folds back to `Idle` (`submission.ts:8-17`). This is the local view state a control reads to disable itself — the *scheduler* (transition spec) owns the action **lifecycle**; this is not a second action state machine (`submission.ts:12-17`). `formView` disables the submit button and dims it while `submitting` (`Form/usecase/formView.ts:38-69`).

Mapping to `workaholic:design` / `interaction-design-standard.md`'s four input states:

| Input state | Where it lives now |
| --- | --- |
| idle | `SubmissionState.Idle` (`submission.ts:22-24`) |
| pending | `SubmissionState.Pending` → controls + submit disabled (`submission.ts:26-28`, `formView.ts:48-67`) |
| error | `errorFor` → `aria-invalid` + `role="alert"` text (`parseForm.ts:87`, `controlParts.ts:53-88`) |
| success | `parseForm` → `Ok(Payload)`, form resets (`parseForm.ts:81`, `logic.ts:263-291`) |

### 2.6 Demo 1 — a worked, data-driven input instance

`SectionField` (`fields.ts:36-45`) is the descriptor that *generates* an input from data: `{ name, label, kind, placeholder, options, required, initial, input }`. One descriptor list per section (`clientFields`, `projectFields` — `fields.ts:47-173`) is the single source that the form, drafts, parse, and submit code paths all read from, replacing hand-written parallel blocks (`fields.ts:13-18`). The path from a descriptor to a stored record is explicit:

1. `parseSectionForm` maps each descriptor to a `FieldSpec` — `required ? asFilled : asOptionalText` — and runs `parseForm` (`logic.ts:121-133`).
2. On `Ok(payload)`, `commitRecord` builds the domain record from the typed payload (`logic.ts:139-182`).
3. `submitSection` folds the `Result`: errors back to the form, or the new record + a navigation to it (`logic.ts:247-297`).

This is a concrete instance of *data structure ↔ input ↔ update procedure*: the descriptor declares the fields the `commitRecord` procedure needs, the caster validates the agent- or human-supplied value into the domain type, and the message vocabulary (`FieldInputKind`, `fields.ts:22-34`) is derived from the descriptors so each input kind lives in one place (`targetOf`, `fields.ts:189-214`).

---

## 3. Data → input mapping: the rule a generating agent applies

The concept's mechanism: *an AI that knows the data structures and the procedures that update them produces the fields those procedures need* ([concept](20260708-pragmatic-ai-native-ui-concept.md) §"The mechanism"). For inputs, the rule the current model encodes is:

Given a data type (the domain shape an update procedure expects) and its caster, the input is assembled as:

1. **Control from type/shape.** A short scalar → `text`; long prose → `textarea`; a value from a fixed set → `select` with that set as `options`; a boolean → `checkbox`. Demo 1 shows this concretely: a free-text `name` is `kind: "text"`, `notes` is `kind: "textarea"`, a `status` drawn from `clientStatuses` is `kind: "select"` with `options: clientStatuses` (`fields.ts:49-98`). *(The mapping is applied by the descriptor author today; it is not yet a machine-encoded rule — see §6.)*
2. **Validation from the caster.** The field's caster is the update procedure's expected type at the boundary: `asFilled` for a required value, `asOptionalText` for an optional one (`logic.ts:98-111`, `logic.ts:121-133`). A generating agent picks the caster that matches the domain type the procedure consumes.
3. **Affordance from the descriptor.** `label`, `placeholder`, `options`, `required`, `initial` give the input its self-explanatory affordance (`fields.ts:36-45`) — the same legibility a generating/operating AI relies on (`workaholic:design` / `self-explanatory-ui.md`).

A generating agent produces a *correct* input by reading the update procedure's payload type and emitting a descriptor whose control + caster match it; `parseForm` then guarantees the submitted value is well-typed or the form reports per-field errors.

---

## 4. Shared property set

This spec **reuses the shared property set defined in the transition spec's §5** (`20260708-pragmatic-screen-transition-model.md` §5): the generatable properties **G1 (vocabulary-closed)**, **G2 (data-derived)**, **G3 (totality)**, and the operable properties **O1 (stable identity)**, **O2 (enumerated affordances)**, **O3 (legible state)**, **O4 (deterministic drive)**, **O5 (human-observable & interruptible)**. The sections below instantiate that same set for inputs; they do not define a competing one.

---

## 5. AI-generatable properties (input scope)

Instantiating G1–G3 for input fields, with current status:

| Property | Requirement | Status |
| --- | --- | --- |
| Closed control set (G1) | The agent picks a control from a closed union | **Present** — `ControlKind` (`control.ts:7`) |
| Caster-typed field (G1) | A field's validation is a typed `asX ⇒ Result<X, InvalidError>` contract, not free prose | **Present** — `FieldSpec.cast` (`parseForm.ts:25-30`) |
| Data-derived descriptor (G2) | An input is a pure function of the data type + update procedure's payload | **Present (by construction, author-applied)** — `SectionField` → `FieldSpec` → `commitRecord` (`fields.ts:36`, `logic.ts:121-182`) |
| Collect-all-errors totality (G3) | Parsing any drafts never throws; every failure is reported | **Present** — `parseForm` total, collects all (`parseForm.ts:49-84`) |
| Type → control rule, machine-encoded | The "which control for which type" mapping is data an agent applies, not author judgment | **Proposed** — Demo 1 encodes the *outcome* (`fields.ts`), but the type→control rule itself is not yet a first-class, machine-readable mapping |
| Published descriptor schema | The descriptor vocabulary is a schema an agent generates against | **Proposed** — the types exist; a schema/DSL surface does not yet (§7) |

---

## 6. AI-operable properties (input scope, incl. WebMCP + WCAG floor)

Instantiating O1–O5 for input fields. Note that the *same structural affordances* serve a human via assistive tech and an operating agent alike (`workaholic:planning` / `accessibility-first.md`) — the WCAG 2.2 AA floor and AI-operability are met by one structure, not two.

| Property | Requirement | Status |
| --- | --- | --- |
| Stable field identity (O1) | Each input exposes a stable `id`/`name` an operator addresses | **Present** — `id_`/`name_` = field name (`textInput.ts:60-61`, `selectInput.ts:60-62`) |
| Labelled affordance (O1/O2) | Each input is associated with a real `<label for=name>` | **Present** — `fieldLabel` (`controlParts.ts:29-39`) |
| Enumerated allowed values (O2) | A constrained input exposes its options as data | **Present** — `select` renders `options` with `selected` (`selectInput.ts:70-81`); descriptor `options` (`fields.ts:41`) |
| Current value readable (O3) | The input's current value is on the element (controlled) | **Present** — `value_(props.value)` / `selected` from props (`textInput.ts:63`, `selectInput.ts:74-78`) |
| Legible validation state (O3) | Error state is machine-readable, not just visual | **Present** — `aria-invalid` + `aria-describedby` → `role="alert"` text (`controlParts.ts:53-88`) |
| Legible submission state (O3) | idle/pending readable; pending disables controls | **Present** — `SubmissionState`, `disabled_` (`submission.ts:18`, `formView.ts:48-67`) |
| Submit affordance (O2) | A single, addressable submit path | **Present** — one `onSubmit` Msg; `<form>` `preventDefault`ed (`formView.ts:38-69`) |
| Deterministic fill+submit (O4) | Setting a value then submitting yields a predictable parse result | **Present** — `parseForm` pure/total; caster deterministic (`parseForm.ts:49`) |
| Human observability (O5) | An agent filling/submitting is visible and interruptible by the user | **Present** — controlled inputs reflect every set value in the DOM; no agent-private state |
| WCAG 2.2 AA floor | Label association, error identification, focus, name/role/value | **Present** — `<label for>`, `aria-invalid`/`aria-describedby`, `focusRing`, `role="alert"` (`controlParts.ts`, `textInput.ts:75-81`); *a full audit against every 2.2 AA success criterion is **Proposed*** |
| WebMCP fill/submit surface | A browser agent can discover the field's id/type/options/value/error and submit — via ARIA + a WebMCP manifest or equivalent | **Proposed** — the controls already emit the ARIA structure a browser agent reads; whether that is sufficient for a WebMCP agent to *discover and drive* the whole form (field enumeration, option lists, submit) without app-specific knowledge is **not yet specified** (§7) |

**On O5 / A2A specifically:** because every control is *controlled* (its value is always props, never hidden internal state — `textInput.ts:31-40`), an agent that sets a value writes it into the observable DOM; the human sees exactly the value the agent entered and can edit or abandon it before submit. The caster boundary (`FieldSpec.cast`, §2.1) means an agent-supplied value is validated into the domain type by the *same* code path as a human's, so an operator cannot bypass validation. This is the input model's strongest AI-native property.

---

## 7. Open questions handed to the DSL

The input-scope items the concept's open-questions list ([concept](20260708-pragmatic-ai-native-ui-concept.md) §"Open questions") leaves for the `/trip` on the plggmatic extraction ([`20260708195655`](../tickets/todo/a-qmu-jp/20260708195655-extract-plggmatic-reusable-seam-to-plgg-family.md)) and the DSL:

1. **Machine-encoded type → control mapping (highest priority for generation).** Demo 1 encodes the *outcome* of "which control for which type" as hand-authored descriptors (`fields.ts`); the DSL needs the mapping itself as data an agent applies, so an input is derived from the domain type rather than authored per field (§5, rows 5–6).
2. **WebMCP discovery surface (highest priority for operation).** What must the emitted form expose — beyond the ARIA already present — so a browser agent can *discover* the field set, each field's type and allowed values, current value, error state, and the submit path, and drive the form without app-specific code (§6, last row).
3. **Richer casters / control kinds.** The four control kinds and the two Demo 1 casters cover the samples; dates, numbers, media (deferred: scheduler design record §10) need typed casters + controls before the model claims them — stay descriptive of what the samples prove.
4. **Full WCAG 2.2 AA audit.** The controls meet the core criteria (§6); a criterion-by-criterion audit is a target.
5. **How much of `Form/` is already the DSL's input layer.** `FieldSpec` + `ControlKind` + `parseForm` is a proto-DSL for inputs; the `/trip` decides what is generic plgg-family engine vs Pragmatic identity, *with this input model as one input* — this spec cross-references, it does not pre-decide the boundary.

---

## 8. Cross-references

- Concept: [`20260708-pragmatic-ai-native-ui-concept.md`](20260708-pragmatic-ai-native-ui-concept.md)
- Sibling (transition half, defines the shared §5 property set this spec reuses): [`20260708-pragmatic-screen-transition-model.md`](20260708-pragmatic-screen-transition-model.md)
- Scheduler design record: [`20260704-plggmatic-scheduler-design.md`](20260704-plggmatic-scheduler-design.md)
- Caster/brand vocabulary the inputs validate against: `packages/plgg/src/**` (`asX(unknown) => Result<X, InvalidError>`)
- Feeds the `/trip` on ticket [`20260708195655-extract-plggmatic-reusable-seam-to-plgg-family.md`](../tickets/todo/a-qmu-jp/20260708195655-extract-plggmatic-reusable-seam-to-plgg-family.md)
