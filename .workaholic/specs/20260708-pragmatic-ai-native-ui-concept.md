# Pragmatic — Concept: an AI-native UI design system

**Status:** Concept record (2026-07-08). Elevates plggmatic from "a column-oriented UI design framework" (its current README framing) to its guiding purpose. This is the north-star document the plggmatic package answers to; it should travel with the package when it moves to `../plggmatic`, and it grounds the pending `/trip` on the extraction (ticket `20260708195655`).

> **Naming.** "Pragmatic" is the concept/product name for what the `plggmatic` package embodies. This document uses *Pragmatic* for the idea and `plggmatic` for the package.

## Thesis

Pragmatic is a **UI design system built for AI**. The single defining property, from which everything else follows:

> **The UI is AI-generatable, and the generated UI is itself AI-operable.**

A design system "for AI" means both halves hold at once:

1. **AI-generatable** — an AI can produce a correct, coherent user interface from the design system's vocabulary, not just hand-assemble arbitrary markup.
2. **AI-operable** — the interface an AI generated can then be operated by an AI (including a *different* AI, or a browser-side agent), because its structure carries enough machine-legible meaning to drive it.

This is what separates Pragmatic from a conventional component library: a conventional library optimizes for a human author writing screens once. Pragmatic optimizes for **an AI assembling the screen needed in the moment and an AI (or the user) operating it** — the same premise as MCP Apps and WebMCP, where an agent generates the interface a task needs on demand and drives it to completion.

## The mechanism

Given that an AI understands (a) the **data structures** of a domain and (b) the **procedures that update them**, it can:

1. **Generate** the user interface that the current situation calls for — the fields, the list, the confirmation, the transition — assembled from Pragmatic's vocabulary rather than improvised.
2. **Prompt operation** — present that interface to the user (or to another agent) and invite the specific action the situation needs.
3. **Perform the processing** — route the operation back through the update procedures it already understands.

Because the interface is AI-operable, the loop can also close **without a human in it**: if the generated UI is **WebMCP-compatible**, a browser-side AI can operate the interface directly and complete the task on the user's behalf.

This is **on-demand UI**: the interface is not a fixed artifact shipped ahead of time, but something generated to fit the moment and then operated.

## Why "probabilistic by structure"

Screen transitions and input-field behavior in Pragmatic are, and should remain, **structurally probabilistic** — the flow between screens and the meaning/affordance of an input are determined by the situation and the data, not hard-wired into a fixed, hand-authored navigation graph. The design system's job is to make that probabilistic assembly:

- **Legible** — a generating AI can reason about which transition or input the data implies.
- **Constrained** — the space of well-formed screens and transitions is bounded by the vocabulary, so a generated UI is coherent by construction rather than by luck.
- **Operable** — an operating AI can read the generated structure and act on it deterministically.

Specifying these mechanisms — how screen transitions arise from the data/situation, and how input fields carry their function — is the near-term work (see the tickets derived from this concept). The current plggmatic scheduler (declare → schedule → render, the TEA runtime) and the `--pm-*` scheme are the seed material; the samples (`plggmatic-example` workbench, `site` docs, the Demo 1 business app) are how the shape of the system is being discovered empirically before it is generalized.

## The end goal: a DSL

The terminal form of Pragmatic is a **DSL (Domain-Specific Language)**. An AI writes code in that DSL, and the result is a working system **including its user interface** — an on-demand UI realized from a declarative description. The DSL is the contract that makes both halves of the thesis true at once: writing in it yields UI that is generatable (the AI produced it from the DSL) and operable (the DSL's structure is what an operating agent reads).

The path to the DSL is empirical and staged:

1. **Now — build from samples.** Discover, from concrete sample apps, what a Pragmatic UI actually needs to be (screen-transition model, input-field model, the component/theme vocabulary).
2. **Specify.** Turn the discovered patterns into an explicit specification of the probabilistic screen-transition and input-field mechanisms — the machine-legible, AI-generatable/operable model.
3. **Distill the DSL.** Generalize the specification into the DSL from which AI-authored, on-demand UIs are produced.

## Positioning in the plgg project

- **plgg** is the pure functional foundation; **plgg-view** the Html/rendering layer; the plgg family provides the generic engine primitives.
- **Pragmatic / plggmatic** sits above them as the **AI-native UI design system** — the vocabulary and runtime that make UI AI-generatable and AI-operable, en route to the DSL.
- **Consumers** (e.g. plggpress's admin, the demo apps) are proofs that the vocabulary can assemble real interfaces.

This positioning is why the pending extraction (`../plggmatic`) is not a mechanical move: the `/trip` on ticket `20260708195655` must decide the package boundaries **in light of this concept** — which parts are the generic plgg-family engine (layout, render, TEA scheduler, form) versus what is Pragmatic's AI-native design-system identity (the vocabulary, the `--pm-*` design language, and — ultimately — the DSL). The near-98%-engine finding from that ticket's analysis should be read against this concept: Pragmatic's durable value is the **AI-native design system and its DSL**, not the generic engine, which may well belong to the plgg family.

## Open questions (for the /trip and the derived tickets)

- What exactly makes a screen-transition "AI-generatable and AI-operable" — the concrete, testable properties an interface must carry (identifiers, action affordances, state legibility) for a WebMCP/MCP-Apps agent to drive it.
- The boundary between the generic plgg-family engine and Pragmatic's design-system identity, decided with this concept as the lens.
- The shape of the DSL and how far the current declare→schedule→render vocabulary is already a proto-DSL.
- WebMCP compatibility: what the generated UI must expose so a browser agent can operate it.
