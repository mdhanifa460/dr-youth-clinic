# 0001 — `KnowledgeChunk` is a derived, non-authoritative collection

**Status:** Active

**Context:** The RAG chatbot and recommendation engine need to run vector search across ten very differently-shaped content types (services, doctors, blog posts, FAQs, results, offers, videos, stories, locations, documents). Running `$vectorSearch` against ten separate collections, each with its own embedding logic, would mean ten near-duplicate retrieval code paths and ten places search relevance tuning has to happen.

**Decision:** `KnowledgeChunk` flattens every source type into one collection with a unified shape (`text`, `embedding`, `sourceType`, `sourceId`, `url`), built by a `BUILDERS` map (one small function per source type) and kept in sync via `post('save')` / `post('findOneAndUpdate')` / `post('findOneAndDelete')` hooks on each source model. It is a read-optimized index, never the source of truth — the source model (`Service`, `Blog`, etc.) always wins if the two ever disagree, and the reindex endpoint can always rebuild `KnowledgeChunk` from scratch.

**Consequences:** One vector index, one relevance-tuning surface, one place to add a new content type to search (a new `BUILDERS` entry + hooks). The cost: every new content type's model must remember to add sync hooks and, if it needs `.populate()` at index-build time, must import the populated model directly (see [0003](0003-populate-requires-explicit-model-import.md)) — the sync is opt-in per model, not automatic, so a new model silently isn't searchable until someone wires it up.
