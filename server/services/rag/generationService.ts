import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { RetrievedChunk } from './types';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error('GEMINI_API_KEY environment variable is required in server/.env');
}

const ai = new GoogleGenerativeAI(apiKey);

const systemInstruction =
  `You are a strict factual RAG assistant. Answer the user's question strictly and only from the provided context.
You must adhere to these absolute safety rules:
1. Never expand or assume the meaning of acronyms (such as ASL) unless the exact full name is explicitly linked to that acronym in the provided context.
2. Never invent, guess, or modify the names of entities, leagues, systems, or organizations (e.g., do not call ASL the 'Hover Polo League' when the text defines it as the 'Aerial Sports League').
3. Do not combine or synthesize facts across different sources or chunks to draw speculative connections or inferences that are not explicitly stated.
4. If the exact, complete answer is not fully present in the context, or if there is any ambiguity, you must reply with exactly: "I do not know based on the available knowledge."
5. Do not speculate, do not mention external facts, and do not use any training-data knowledge outside the provided text.`;

// Using gemini-2.0-flash which is widely supported, highly stable, fast, and has mature production capacity in 2026
const model = ai.getGenerativeModel({
  model: 'gemini-2.0-flash',
  systemInstruction,
});

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generates an answer from the retrieved chunks to the user question.
 * Strict system instructions are passed to prevent hallucinations and restrict answering to context only.
 * Includes robust exponential backoff retry logic to handle transient 503/429 errors from the Gemini API.
 */
export async function generateAnswer(
  userQuestion: string,
  chunks: RetrievedChunk[]
): Promise<string> {
  if (!chunks || chunks.length === 0) {
    return 'I do not know based on the available knowledge.';
  }

  // Format the context nicely
  const context = chunks
    .map(
      (chunk, index) =>
        `[Source ${index + 1}: ${chunk.source} (${chunk.sourceId}), Chunk #${chunk.chunkIndex}]:\n${chunk.chunkContent}`
    )
    .join('\n\n---\n\n');

  const prompt = `
Context:
${context}

Question:
${userQuestion}

Answer strictly based on the provided context only:
`;

  const retries = 5;
  let delay = 1000;

  for (let i = 0; i < retries; i++) {
    try {
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0,
        },
      });

      const responseText = result.response.text();
      return responseText ? responseText.trim() : 'I do not know based on the available knowledge.';
    } catch (error: any) {
      const isTransient = 
        error?.status === 503 || 
        error?.status === 429 || 
        String(error).includes('Service Unavailable') || 
        String(error).includes('high demand') ||
        String(error).includes('Rate limit');

      if (isTransient && i < retries - 1) {
        console.warn(`[Gemini API] Temporary error (attempt ${i + 1}/${retries}). Retrying in ${delay}ms...`, error.message || error);
        await sleep(delay);
        delay *= 2;
        continue;
      }
      
      console.error('Error during response generation:', error);
      throw error;
    }
  }

  throw new Error(`Failed to generate answer after ${retries} retries due to persistent API errors.`);
}
