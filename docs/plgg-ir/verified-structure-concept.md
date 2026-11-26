# Verified structure — Concept: models you can argue on because a machine has checked them

**Status:** Concept record (2026-11-26). Direction stated by the author in conversation; recorded by Claude Code. Nothing here is scheduled or ticketed yet. It names the purpose that plgg-flow, its DSL and the plgg-ir foundation answer to, and the order in which the foundation would have to change to serve it.

## Thesis

plgg-flow is not a drawing tool. The point of the whole stack is:

> **A structure that is drawn is a model whose soundness a machine can decide, so that discussion happens on a model already known to be well-formed.**

Drawing, the DSL, and the language foundation under the DSL are the entrance and the footing for that. The far end is a formal-verification approach — for example an encoding into an SMT solver such as Z3 — in which constraints over a structure are checked, and a violated constraint comes back as a counterexample.

Four statements by the author lead here. Each is a requirement on its own.

## 1. Constraints belong inside the language, not above it

Today a richer semantics could guide what is drawn and then be *translated* into the plgg-flow DSL: a two-storey arrangement. Each further level of meaning would need another language and another translator, and the constraint is lost in the lower text — edit the DSL directly and nothing notices the breach.

The alternative: the DSL itself can state constraints, and a constraint is itself something the DSL describes. Then the number of storeys is not the number of languages but the depth of reference inside one language, and it can be as deep as a model needs (n storeys, self-organising).

- A constraint is a **predicate over attributes** (sketch, not syntax: "an edge a → b requires layer(a) ≤ layer(b)").
- A rule is **data like a node is**: it has a name and attributes, so a rule about rules is written the same way.
- A rule may refer only to levels **below** it. Without that discipline, checks need not terminate and rules can contradict each other undetectably.

## 2. The structure goes in and out as a JSON object, always

What the DSL describes must be available outside the diagram as a JSON object at any time: put in, taken out, observed as it changes.

## 3. A diagram's object and a Markdown file are the same kind of thing

A Markdown file with front matter is "attributes + body". A node in a diagram is "attributes + label". Both are named things with attributes that relate to other things, so they can be treated as entities under one semantics.

| | Markdown file | Node in a diagram |
|---|---|---|
| name | path | node name |
| attributes | front matter | `key=value` |
| content | body | label |
| relations | links | edges |
| nesting | a body can embed a diagram | a group holds nodes |

The difference is granularity. Nesting already happens: a diagram lives inside a page body.

Consequences: a constraint can cross the boundary ("a published page does not link to a draft" and "the screen layer does not reach the storage layer directly" are the same kind of rule); one interchange shape serves both; a diagram can be the map of a set of pages, and a node can open as a page.

## 4. The end is formal verification

The predicates of §1 are not there to make the language more expressive. They are there to fix, as language, **the fragment that can be handed to a solver**: comparison of attributes, finite enumerations, order, counting, reachability. An extension that can express anything can no longer be verified.

What this buys:

- **A counterexample is a diagram.** The smallest structure that breaks a constraint is drawn with the same tool.
- **Guidance while drawing.** "Adding this edge makes the model unsatisfiable" is decided before the edge is drawn, so only admissible targets are offered.
- **A fixed premise for discussion.** "This model satisfies A, B and C" is established, so the argument is about content, not about a malformed structure.

## Where the code stands (read 2026-11-26)

Read at the level of package entries, descriptions and the layout of the language framework; not every module was read.

- **plgg-flow's DSL** (`packages/plgg-flow/src/dsl.ts`) is a line-based syntax of its own (`node A 層=画面`, `A -> B`, `axis`, `layout`, `rule`). It does not use plgg-ir. Its only constraints are two built-in words: `rule acyclic` and `rule max-outputs N`. Attributes are untyped string pairs; `axis` declares the values of an attribute but not their nature (ordered or not).
- **Two diagram languages coexist.** `plgg-ir-diagram` also holds an S-expression diagram dialect built on plgg-ir-language (`diagramDialect`, `compileDiagram`), used by its `widget`/`editor` entries. The sheet that pages embed and edit (`flowSheet`, `mountSheet`) runs on the plgg-flow DSL instead.
- **JSON exists for the drawing, not for the specification.** `plgg-flow/interchange` saves and loads `{format:"plgg-flow", version:1, nodes, edges, camera, …}` with validation, and converts to and from React Flow, Graphviz and CSV. Rules, axes and layout (`Spec`) are not in that JSON; a round trip through it drops the constraints. `mountSheet` takes DSL text once; there is no way to put a structure into a running sheet or to be told of its changes.
- **plgg-ir-language** registers forms, operators with typed signatures, scopes and a type checker, and composes dialects. Registration is TypeScript code: the author of a dialect can extend the language, a document written in it cannot. Its normal form is canonical **text**.
- **Dialects are closed vocabularies.** manifest (entity, field, relation, invariant), thesis (assertion, concept, relation, attack) and diagram (node, group, port, edge) each define "named things, attributes, relations, constraints" in their own words. manifest already has boolean-typed invariant expressions.
- **A seed of verification exists.** plgg-ir-thesis model-checks an argumentation structure and rejects with ranged counterexamples; plgg-ir-thesis-proof proves rebuttal completeness and grounded-extension survival on worked examples. Both are purpose-built checks in TypeScript. No solver (Z3, SMT-LIB) is used anywhere in the repository.

## What to reconsider in plgg-ir and its foundation

1. **One diagram language.** Decide which language carries constraints and entities; keeping two means every extension is made twice or in the wrong one.
2. **Extension from inside the language.** Open exactly one thing to documents: naming a predicate and using it as a constraint. Not general macro power.
3. **The normal form is data.** Define the canonical form as a tree of data; S-expressions, the line syntax and JSON become three notations of it.
4. **A shared footing for dialects.** Entity, relation and predicate one level above plgg-ir-language; manifest, thesis and diagram as specialisations. The predicate language is most likely lifted from manifest's invariants.
5. **Typed attributes.** Enumeration, order, number, reference. plgg-ir-language's type checker supplies this once the DSL stands on it.

## Stages

Each stage is useful on its own and leaves the drawn result unchanged until the last two.

1. **Canonical data form.** One JSON shape for nodes, edges, axes and rules — defined as an entity shape (name, attributes, content, relations, children), not as a diagram-only shape. Text ⇄ structure ⇄ JSON round-trips without loss.
2. **A way in and out.** The sheet accepts that JSON from outside and reports changes outward.
3. **The line syntax as a notation over plgg-ir.** Same surface syntax, standing on the framework; attributes gain types.
4. **The predicate fragment.** Attribute comparison, enumeration, order, counting, reachability; rules as data; the stratification rule.
5. **Shared footing.** Pages and nodes described by the same entity vocabulary.
6. **SMT-LIB output.** The package emits a solver problem as text. The solver is a replaceable part outside the package.
7. **Counterexamples drawn.** A solver's model is rendered by plgg-flow.

## Decisions still open

- **What stays in-house, what goes to a solver.** Acyclicity and output counts are faster checked directly and immediately, as now. A solver earns its place for constraints that contradict only in combination.
- **Where the solver runs.** Z3 has a WebAssembly build, of tens of megabytes. Immediate checking inside the browser sheet, or checking on a server or from a command, are different designs.
- **Dependencies.** The family has been built without external dependencies. Emitting SMT-LIB text and keeping the solver outside preserves that; embedding a solver does not.
- **Which diagram language survives** (§ reconsider 1), and whether the S-expression dialect becomes a notation of the same canonical form or is retired.
- **Whether manifest's vocabulary can describe both a page and a node.** Not examined.
