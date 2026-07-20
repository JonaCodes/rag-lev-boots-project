import { ingestAllData } from './rag/ingestionService';
import { retrieveRelevantChunks } from './rag/retrievalService';
import { generateAnswer } from './rag/generationService';
import { getCachedAnswer, setCachedAnswer } from './rag/answerCache';
import { IngestionStats } from './rag/types';

export const loadAllData = async (): Promise<IngestionStats> => {
  return await ingestAllData();
};

export const ask = async (userQuestion: string): Promise<string> => {
  const cached = getCachedAnswer(userQuestion);
  if (cached !== undefined) {
    return cached;
  }

  const chunks = await retrieveRelevantChunks(userQuestion);
  const answer = await generateAnswer(userQuestion, chunks);
  setCachedAnswer(userQuestion, answer);
  return answer;
};

