import sequelize from '../config/database';
import { QueryTypes } from 'sequelize';
import { embedContent } from './llmService';

export interface SimilarChunk {
  id: number;
  source: string;
  sourceId: string;
  chunkIndex: number;
  chunkContent: string;
  similarity: number;
}

export const findSimilarChunks = async (
  userQuestion: string,
  limit: number = 3
): Promise<SimilarChunk[]> => {
  const embeddings = await embedContent(userQuestion);
  const questionVector = embeddings?.[0]?.values;

  if (!questionVector || questionVector.length === 0) {
    throw new Error('Failed to generate embeddings for user question');
  }
  const vectorString = `[${questionVector.join(',')}]`;

  const query = `
    SELECT
      id,
      source,
      source_id as "sourceId",
      chunk_index as "chunkIndex",
      chunk_content as "chunkContent",
      1 - (embeddings_768 <=> '${vectorString}'::vector) as similarity
    FROM knowledge_base
    WHERE embeddings_768 IS NOT NULL
    LIMIT ${limit}
  `;

  const results = await sequelize.query(query, {
    type: QueryTypes.SELECT,
  });

  return results as SimilarChunk[];
};
