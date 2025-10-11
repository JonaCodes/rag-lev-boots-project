import KnowledgeBase from '../models/KnowledgeBase';

// Naive implementation, but the important note is this: duplicate data is *bad*, it will throw off your similarity search
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

export const saveToKnowledgeBase = async (
  source: string,
  sourceId: string,
  chunks: string[],
  embeddings: number[][]
): Promise<void> => {
  if (chunks.length !== embeddings.length) {
    throw new Error(
      `Chunk count (${chunks.length}) does not match embedding count (${embeddings.length})`
    );
  }

  const dataToInsert = chunks.map((chunkContent, index) => ({
    source,
    source_id: sourceId,
    chunk_index: index,
    chunk_content: chunkContent,
    embeddings_768: embeddings[index],
    embeddings_1536: null,
  }));

  await KnowledgeBase.bulkCreate(dataToInsert, {
    validate: true,
    returning: true,
  });
};
