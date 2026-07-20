# Project Handoff

This note is for someone opening the GitHub project for the first time after
downloading the original Lev-Boots RAG exercise.

The original project provided the React UI, Express backend shell, database
model, migrations, PDFs, and the assignment instructions. The work in this
version fills in the backend RAG implementation and adds a few production-style
guards around it.

For the detailed technical flow, read [RAG_FLOW.md](RAG_FLOW.md).

## What This Project Does

- Loads Lev-Boots knowledge from PDFs, markdown articles, and the simulated
  Slack API.
- Splits documents into overlapping text chunks.
- Embeds chunks with Gemini using 768-dimensional vectors.
- Stores chunks and embeddings in Postgres with pgvector.
- Answers user questions by retrieving relevant chunks and asking Gemini to
  answer only from that retrieved context.
- Returns "I do not know based on the available knowledge." when no trustworthy
  context is found.

## Main Features Added

- Source loaders for:
  - 3 local PDFs in `server/knowledge_pdfs/`
  - 5 remote markdown articles
  - simulated Slack channels with pagination and retry handling
- Chunking with overlap and protection against tiny trailing chunks.
- Gemini embedding service with retry logic and vector-size validation.
- pgvector similarity search using cosine distance.
- Relevance filtering before generation, so unrelated chunks do not reach the
  LLM.
- Strict generation prompt to reduce hallucinations.
- In-memory answer cache for repeated questions.
- Per-IP rate limits for `/api/ask` and `/api/load_data`.
- Input validation for empty, non-string, and oversized questions.
- Safer ingestion using a unique index and atomic `INSERT ... ON CONFLICT`.

## Setup

1. Install dependencies from the repository root:

   ```bash
   npm i
   ```

2. Create `server/.env`:

   ```env
   DATABASE_URL=your_postgres_pgvector_url
   GEMINI_API_KEY=your_gemini_api_key
   PORT=3000
   ```

3. The database must be Postgres with pgvector support. Supabase works well for
   this exercise.

4. Start the app:

   ```bash
   npm run dev
   ```

5. Open the UI:

   ```text
   http://localhost:5173/
   ```

## First Run

1. Make sure `server/.env` is valid.
2. Start the server once so migrations can run.
3. Ingest the knowledge base:

   ```bash
   npm run reingest
   ```

   or call:

   ```text
   POST /api/load_data
   ```

4. Ask questions through the UI or:

   ```text
   POST /api/ask
   body: { "userQuestion": "How do LevBoots work?" }
   ```

## Important Files

- `server/services/ragService.ts` - main backend entry point.
- `server/services/rag/ingestionService.ts` - loads, chunks, embeds, and stores
  knowledge.
- `server/services/rag/retrievalService.ts` - embeds a question and retrieves
  the closest chunks.
- `server/services/rag/generationService.ts` - builds the final prompt and asks
  Gemini for the answer.
- `server/services/rag/ragConfig.ts` - relevance threshold, cache size, input
  limits, and rate limits.
- `server/controllers/ragController.ts` - API validation and response handling.
- `docs/RAG_FLOW.md` - detailed explanation of the full RAG pipeline.

## Known Notes

- A real `GEMINI_API_KEY` is required for full end-to-end use.
- Relevance threshold values should be rechecked after changing the knowledge
  base or embedding model.
- The answer cache is in memory only, so it resets when the server restarts.
- The rate limiter is also in memory and is intended for this local exercise,
  not a multi-instance production deployment.

## Quick Validation

Run:

```bash
npm run build
```

Expected result: the frontend builds with Vite and the server TypeScript compile
passes.
