import { askGemini } from './llmService';
import { parseJSONFromString } from './llmUtils';
import { RAG_SYSTEM_PROMPT } from '../prompts/ragSystemPrompt';
import { GEMINI_MODEL, LLM_CONFIG } from '../config/constants';
import { SimilarChunk } from './similaritySearch';

export interface RagResponse {
  answer: string;
}

export const generateRagResponse = async (
  userQuestion: string,
  chunks: SimilarChunk[]
): Promise<string> => {
  const contextChunks = chunks
    .map((chunk, index) => `Chunk ${index + 1}:\n${chunk.chunkContent}`)
    .join('\n\n');

  const userPrompt = `##Context:\n${contextChunks}\n\n##Question: ${userQuestion}`;
  const rawResponse = await askGemini(
    GEMINI_MODEL,
    RAG_SYSTEM_PROMPT,
    userPrompt
  );

  const parsedResponse = parseJSONFromString(
    rawResponse,
    LLM_CONFIG.RESPONSE_TYPES.OBJECT
  ) as RagResponse;

  return parsedResponse.answer;
};
