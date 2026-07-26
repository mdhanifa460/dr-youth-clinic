# Architecture Decisions

Short records of *why* a non-obvious choice was made — not a design doc, not a tutorial. Each one should be readable in under two minutes and answer one question: "why is it built this way, and not the more obvious other way?"

Add one whenever a decision would otherwise only live in a commit message, a Slack thread, or a conversation with an AI assistant — i.e. whenever the next person (human or AI) could plausibly "fix" something that was actually deliberate, or repeat a mistake that's already been made and understood once.

## Index

| # | Decision | Status |
|---|---|---|
| [0001](0001-knowledge-chunk-derived-collection.md) | `KnowledgeChunk` is a derived, non-authoritative collection | Active |
| [0002](0002-settings-singleton.md) | `Settings` is a single document, not one per city/tenant | Active |
| [0003](0003-populate-requires-explicit-model-import.md) | Every `.populate()` call site must import the referenced model directly | Active — learned the hard way |
| [0004](0004-ai-drafts-human-publishes.md) | AI-generated content is never auto-published | Active — permanent principle |
| [0005](0005-eslint-flat-config-fix-and-warning-baseline.md) | Fixed a broken ESLint flat config; `lint:check`'s max-warnings is a ratchet, not zero | Active |

## Format

```
# NNNN — Short, decision-shaped title

**Status:** Active | Superseded by NNNN

**Context:** What situation forced a choice.
**Decision:** What was actually decided.
**Consequences:** What this makes easy, what it makes harder, what to watch for.
```
