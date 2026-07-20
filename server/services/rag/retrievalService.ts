import sequelize from '../../config/database';
import { QueryTypes } from 'sequelize';
import { embedText } from './embeddingService';
import { RetrievedChunk } from './types';
import { CANDIDATE_POOL_SIZE, FINAL_TOP_N, SIMILARITY_DISTANCE_THRESHOLD } from './ragConfig';

/**
 * Retrieves the most relevant text chunks for a given user question.
 *
 * Two-stage widen-then-filter design: fetch a wider candidate pool from
 * pgvector than we intend to use, then drop any candidate whose cosine
 * distance is past SIMILARITY_DISTANCE_THRESHOLD, then cap what's left to
 * FINAL_TOP_N. If nothing survives the filter, an empty array is returned —
 * generateAnswer() treats that as "no relevant knowledge" and skips the LLM
 * call entirely rather than forcing an answer from irrelevant context.
 */
export async function retrieveRelevantChunks(userQuestion: string): Promise<RetrievedChunk[]> {
  // 1. Embed the user question
  const questionEmbedding = await embedText(userQuestion);

  // Convert the array of numbers into postgres pgvector string format: '[0.123,0.456,...]'
  const vectorStr = `[${questionEmbedding.join(',')}]`;

  // 2. Query knowledge_base using raw SQL with the cosine distance operator <=>
  // (embeddings_768 is native pgvector `vector` type — see the type-mismatch
  // note in models/KnowledgeBase.ts for why reads always go through raw SQL
  // rather than the Sequelize model.)
  const results = await sequelize.query<{
    source: string;
    source_id: string;
    chunk_index: number;
    chunk_content: string;
    distance: number;
  }>(
    `SELECT
       source,
       source_id,
       chunk_index,
       chunk_content,
       (embeddings_768 <=> CAST(:vector AS vector)) AS distance
     FROM knowledge_base
     WHERE embeddings_768 IS NOT NULL
     ORDER BY embeddings_768 <=> CAST(:vector AS vector) ASC
     LIMIT :limit`,
    {
      replacements: { vector: vectorStr, limit: CANDIDATE_POOL_SIZE },
      type: QueryTypes.SELECT,
    }
  );

  const candidates: RetrievedChunk[] = results.map((row) => ({
    source: row.source,
    sourceId: row.source_id,
    chunkIndex: row.chunk_index,
    chunkContent: row.chunk_content,
    distance: Number(row.distance),
  }));

  // 3. Relevance gate: cosine distance 0=identical, 1=orthogonal/unrelated,
  // 2=opposite. Anything past the threshold isn't relevant enough to trust.
  return candidates
    .filter((c) => c.distance <= SIMILARITY_DISTANCE_THRESHOLD)
    .slice(0, FINAL_TOP_N);
}
