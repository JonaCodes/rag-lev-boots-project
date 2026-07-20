# Lev-Boots RAG Flow

## TL;DR

- **Ingestion**: load 3 PDFs + 5 gist articles + 3 Slack channels → split into ~400-word overlapping chunks → embed each with Gemini (768-dim) → atomically upsert into Postgres/pgvector, skipping chunks already stored.
- **Retrieval**: embed the user's question → pull the 10 nearest chunks by cosine distance → throw out any that aren't actually close enough → keep at most 5.
- **Generation**: if nothing survived the filter, answer "I do not know based on the available knowledge." immediately (no LLM call). Otherwise, hand the surviving chunks to Gemini with a strict system prompt that forbids guessing, inventing, or using outside knowledge.
- **New in this pass**: the similarity filter above (stops irrelevant chunks from ever reaching the LLM), an in-memory cache for repeated questions, and per-IP rate limits on both endpoints.
- **Tunable constants** live in `server/services/rag/ragConfig.ts` (relevance threshold, pool/top-N sizes, cache size, question length cap, rate limits) and `server/services/rag/chunkText.ts` (chunk size/overlap/min size). 
---

## Detailed flow

### 1. Ingestion (`ragService.loadAllData` → `ingestionService.ingestAllData`)

**Load.** Three independent loaders run, each isolated in its own try/catch so one bad source (missing PDF, unreachable gist, Slack API down) doesn't stop the others:
- `pdfLoader.ts` — reads 3 hardcoded PDFs from `server/knowledge_pdfs/`.
- `articleLoader.ts` — fetches 5 hardcoded markdown articles from a Gist.
- `slackLoader.ts` — paginates through 3 Slack channels (`lab-notes`, `engineering`, `offtopic`) against a simulated rate-limited API, filters out system messages (joins/leaves/pins), and groups messages into threads (parent + chronologically-sorted replies, with orphaned replies handled separately).

Every loader retries transient failures with exponential backoff.

**Chunk.** `chunkText.ts` splits each document's cleaned text into ~400-word chunks with a 40-word overlap between consecutive chunks (so a fact sitting on a chunk boundary is likely to appear whole in at least one chunk). If splitting leaves a trailing remainder smaller than 30 words, that remainder is merged into the previous chunk (re-sliced from that chunk's own start, so the overlapped words aren't duplicated) rather than being dropped — earlier versions of this logic silently discarded up to 29 words of real content at the end of some documents.

**Embed.** `embeddingService.ts` calls Gemini's `gemini-embedding-001` model requesting 768 output dimensions, with exponential-backoff retries and a hard assertion that the returned vector really is 768-dim.

**Store.** For each chunk, `ingestionService.ts`:
1. Checks whether a row already exists for `(source, source_id, chunk_index)` — if so, skip (saves re-embedding cost on repeat ingestion runs).
2. Otherwise embeds the chunk, validates every value in the resulting vector is a finite number, and performs an atomic `INSERT ... ON CONFLICT (source, source_id, chunk_index) DO NOTHING` (backed by a unique index added in migration `20260720120000`). This makes the insert safe even if two ingestion runs overlap — the earlier check-then-insert pattern could otherwise race and create duplicate chunks, which would get double-weighted during retrieval.

`ingestAllData()` returns a stats object (`docCount`, `chunkCount`, `insertedCount`, `skippedCount`, `errorCount`) instead of just logging — `POST /api/load_data` surfaces this, and returns a failure status if every loader failed (`docCount === 0` with errors), instead of always reporting success.

### 2. Retrieval (`retrievalService.retrieveRelevantChunks`)

1. Embed the user's question with the same model/dimensionality used at ingestion time (embeddings from different models/dimensions aren't comparable).
2. Query `knowledge_base` for the `CANDIDATE_POOL_SIZE` (10) nearest rows by pgvector's `<=>` cosine-distance operator.
3. **Relevance gate**: drop any candidate whose distance is above `SIMILARITY_DISTANCE_THRESHOLD` (0.45 — see the range note below), then keep at most `FINAL_TOP_N` (5) of what remains.

If the knowledge base genuinely has nothing relevant to the question, this returns an empty array — deliberately, so the next stage never has to "make do" with distant, likely-irrelevant chunks.

**Cosine distance range**: pgvector's `<=>` returns 0 (identical direction) to 2 (opposite direction), with 1 meaning orthogonal/unrelated. A lower threshold is stricter (fewer false positives, more "I do not know" answers); a higher threshold is more lenient (more recall, more risk of borderline context reaching the LLM).

### 3. Generation (`generationService.generateAnswer`)

- If zero chunks were retrieved, return the canned fallback (`"I do not know based on the available knowledge."`) immediately — no LLM call, no cost, no chance of the model trying to answer from nothing.
- Otherwise, format the surviving chunks into a labeled context block and send them to Gemini `gemini-2.0-flash` with `temperature: 0` and a system prompt that explicitly forbids: expanding acronyms not defined in context, inventing or renaming entities, combining facts across chunks to infer things not explicitly stated, and using anything outside the provided context. Ambiguous or incomplete answers must use the same canned fallback string.
- Retries on detected-transient errors (429/503/"rate limit"/"high demand").

### 4. New additions this pass

**Answer cache** (`answerCache.ts`). A small in-process LRU (keyed on the trimmed/lowercased/whitespace-collapsed question — the actual text sent to the embedding model and the LLM is never altered, only the cache key is normalized). Repeating a question skips both the embedding call and the generation call. Capped at `ANSWER_CACHE_MAX_SIZE` (200) entries; cleared on restart. Not shared across multiple server instances.

**Rate limiting** (`middleware/rateLimiter.ts`). A hand-rolled per-IP fixed-window limiter (no new dependency — two routes didn't justify pulling in a library). `/api/ask` allows more requests than `/api/load_data`, since the latter re-embeds the entire knowledge base and is unauthenticated.

**Why these three together**: the relevance gate directly serves the "don't answer from irrelevant context, don't hallucinate" goal. The cache and rate limiter don't affect answer quality — they're cost/abuse controls, included because they were cheap to add alongside the gate.

---

## Tunable constants

| Constant | File | Current value | Notes |
|---|---|---|---|
| `chunkSize` | `chunkText.ts` | 400 words | Larger = more context per chunk, fewer chunks, coarser retrieval granularity. |
| `overlap` | `chunkText.ts` | 40 words | Reduces the chance a fact is split across a chunk boundary. |
| `minWords` | `chunkText.ts` | 30 words | Below this, a trailing remainder is merged into the previous chunk instead of standing alone. |
| `CANDIDATE_POOL_SIZE` | `ragConfig.ts` | 10 | How many nearest neighbors to fetch before filtering. |
| `FINAL_TOP_N` | `ragConfig.ts` | 5 | Max chunks actually sent to the LLM. |
| `SIMILARITY_DISTANCE_THRESHOLD` | `ragConfig.ts` | 0.45 | **Needs your own testing.** Cosine distance cutoff (0=identical, 1=unrelated, 2=opposite). Lower = stricter. |
| `ANSWER_CACHE_MAX_SIZE` | `ragConfig.ts` | 200 | Number of distinct questions cached in memory. |
| `MAX_QUESTION_LENGTH` | `ragConfig.ts` | 2000 chars | Input validation cap on `/api/ask`. |
| `ASK_RATE_LIMIT` | `ragConfig.ts` | 20 / 60s per IP | **Needs your own testing** against expected traffic. |
| `LOAD_DATA_RATE_LIMIT` | `ragConfig.ts` | 2 / 5min per IP | Stricter — this endpoint is expensive and unauthenticated. |

The threshold and rate-limit values above were chosen as reasonable starting points without access to live embeddings — verify them against real questions/answers and adjust.
