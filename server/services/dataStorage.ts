import KnowledgeBase from '../models/KnowledgeBase';
import { ProcessedContentChunk } from './contentPipeline';

export const saveContentChunks = async (
  chunks: ProcessedContentChunk[]
): Promise<void> => {
  if (chunks.length === 0) {
    console.log('No chunks to save');
    return;
  }

  console.log(`Saving ${chunks.length} chunks to database...`);

  try {
    const dataToInsert = chunks.map((chunk) => ({
      source: chunk.source,
      source_id: chunk.sourceId,
      chunk_index: chunk.chunkIndex,
      chunk_content: chunk.chunkContent,
      embeddings_768: chunk.embeddings,
      embeddings_1536: null,
    }));

    const savedRecords = await KnowledgeBase.bulkCreate(dataToInsert, {
      validate: true,
      returning: true,
    });

    console.log(`Successfully saved ${savedRecords.length} chunks to database`);
  } catch (error) {
    console.error('Error saving chunks to database:', error);
    throw new Error(`Failed to save chunks to database: ${error}`);
  }
};

export const clearExistingData = async (source: string): Promise<void> => {
  console.log(`Clearing existing data for source: ${source}...`);

  try {
    const deletedCount = await KnowledgeBase.destroy({
      where: {
        source: source,
      },
    });

    console.log(
      `Deleted ${deletedCount} existing records for source: ${source}`
    );
  } catch (error) {
    console.error(`Error clearing existing data for source ${source}:`, error);
    throw new Error(
      `Failed to clear existing data for source ${source}: ${error}`
    );
  }
};

// Naive implementation, but the important note is this: duplicate data is *bad*, it will throw off your similarity search
export const saveContentChunksWithClear = async (
  chunks: ProcessedContentChunk[],
  source: string
): Promise<void> => {
  console.log(`Saving chunks for source: ${source} (with clear)`);

  try {
    // Avoid duplicate data
    await clearExistingData(source);
    await saveContentChunks(chunks);

    console.log(`Successfully replaced all data for source: ${source}`);
  } catch (error) {
    console.error(
      `Error in saveContentChunksWithClear for source ${source}:`,
      error
    );
    throw error;
  }
};
