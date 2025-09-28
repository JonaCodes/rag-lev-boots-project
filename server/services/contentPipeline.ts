import { chunkContentByWords, ContentChunk } from './chunkingService';
import { embedContent } from './llmService';
import { PROCESSING_CONFIG } from '../config/constants';

export interface ProcessedContentChunk {
  source: string;
  sourceId: string;
  chunkIndex: number;
  chunkContent: string;
  embeddings: number[];
}

export interface ContentMetadata {
  source: string;
  sourceId: string;
  content: string;
}

export const processContent = async (
  metadata: ContentMetadata
): Promise<ProcessedContentChunk[]> => {
  const { source, sourceId, content } = metadata;

  console.log(`Processing content for ${source}:${sourceId}...`);

  const chunks: ContentChunk[] = chunkContentByWords(
    content,
    PROCESSING_CONFIG.CHUNK_WORD_COUNT
  );
  const processedChunks: ProcessedContentChunk[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    try {
      const embeddings = await embedContent(chunk.content);
      const embeddingVector = embeddings?.[0]?.values;

      if (!embeddingVector || embeddingVector.length === 0) {
        throw new Error('Embedding vector is empty or undefined');
      }

      processedChunks.push({
        source,
        sourceId,
        chunkIndex: i,
        chunkContent: chunk.content,
        embeddings: embeddingVector,
      });

      // Add a small delay to avoid hitting rate limits
      await new Promise((resolve) =>
        setTimeout(resolve, PROCESSING_CONFIG.RATE_LIMIT_DELAY)
      );
    } catch (error) {
      console.error(
        `Failed to generate embeddings for ${sourceId} chunk ${i}:`,
        error
      );
      throw new Error(`Failed to process chunk ${i} for ${sourceId}: ${error}`);
    }
  }

  console.log(
    `Successfully processed ${processedChunks.length} chunks for ${sourceId}`
  );
  return processedChunks;
};

export const processBatchContent = async (
  contentItems: ContentMetadata[]
): Promise<ProcessedContentChunk[]> => {
  console.log(`Processing ${contentItems.length} content items...`);
  if (contentItems.length === 0) return [];

  const allProcessedChunks: ProcessedContentChunk[] = [];

  for (const contentMetadata of contentItems) {
    try {
      const processedChunks = await processContent(contentMetadata);
      allProcessedChunks.push(...processedChunks);
    } catch (error) {
      console.error(
        `Failed to process content ${contentMetadata.sourceId}:`,
        error
      );
      // Continue processing other items even if one fails
    }
  }

  console.log(
    `Processed ${allProcessedChunks.length} total chunks from ${contentItems.length} content items`
  );
  return allProcessedChunks;
};
