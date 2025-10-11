import { processArticles } from './processors/articleProcessor';
import { processPDFs } from './processors/pdfProcessor';
import { processSlackMessages } from './processors/slackProcessor';
import { findSimilarChunks } from './similaritySearch';
import { generateRagResponse } from './ragResponseService';
import { clearExistingData } from './dataStorage';
import { DATA_SOURCES } from '../config/constants';

export const loadAllData = async (): Promise<void> => {
  console.log('Starting data ingestion process...');

  try {
    await clearExistingData(DATA_SOURCES.ARTICLE);
    await processArticles();

    await clearExistingData(DATA_SOURCES.PDF);
    await processPDFs();

    await clearExistingData(DATA_SOURCES.SLACK);
    await processSlackMessages();

    console.log('Data ingestion completed successfully');
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
