import { fetchAllArticles } from './articleDataSource';
import { processBatchContent, ContentMetadata } from './contentPipeline';
import { saveContentChunksWithClear } from './dataStorage';
import { findSimilarChunks } from './similaritySearch';
import { generateRagResponse } from './ragResponseService';
import { DATA_SOURCES } from '../config/constants';

export const loadAllData = async (): Promise<void> => {
  console.log('Starting data ingestion process...');

  try {
    // TODO: adding the papers and slack messages is trivial, simply fetch and add them to the contentMetaData array with same mapping
    const articles = await fetchAllArticles();

    const contentMetadata: ContentMetadata[] = articles.map((article) => ({
      source: article.source,
      sourceId: article.id,
      content: article.content,
    }));

    const processedChunks = await processBatchContent(contentMetadata);
    await saveContentChunksWithClear(processedChunks, DATA_SOURCES.GIST);
  } catch (error) {
    console.error('Data ingestion failed:', error);
    throw new Error(`Data ingestion failed: ${error}`);
  }
};

export const ask = async (userQuestion: string): Promise<string> => {
  const similarChunks = await findSimilarChunks(userQuestion, 3);
  const answer = await generateRagResponse(userQuestion, similarChunks);
  return answer;
};
