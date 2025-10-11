import { chunkContentByWords } from './chunkingService';
import { embedContent } from './llmService';
import { PROCESSING_CONFIG } from '../config/constants';
import { sleep } from '../utils/utils';

export const chunkText = (text: string): string[] => {
  const chunks = chunkContentByWords(text, PROCESSING_CONFIG.CHUNK_WORD_COUNT);
  return chunks.map((chunk) => chunk.content);
};

export const embedChunks = async (chunks: string[]): Promise<number[][]> => {
  const embeddings: number[][] = [];

  for (const chunk of chunks) {
    const result = await embedContent(chunk);
    const embeddingVector = result?.[0]?.values;

    if (!embeddingVector || embeddingVector.length === 0) {
      console.error('Failed to generate embedding for chunk, skipping');
      embeddings.push([]);
    } else {
      embeddings.push(embeddingVector);
    }

    await sleep(PROCESSING_CONFIG.RATE_LIMIT_DELAY);
  }

  return embeddings;
};
