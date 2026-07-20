import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error('GEMINI_API_KEY environment variable is required in server/.env');
}

const ai = new GoogleGenerativeAI(apiKey);
// Using gemini-embedding-001 as it is widely supported, requesting 768 dimensions specifically
const embeddingModel = ai.getGenerativeModel({ model: 'gemini-embedding-001' });

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Embeds a given text string using the Gemini gemini-embedding-001 model.
 * Always returns a 768-dimensional array.
 * Includes exponential backoff retries for robust rate-limit handling.
 */
export async function embedText(text: string, retries = 5, delay = 1000): Promise<number[]> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await embeddingModel.embedContent({
        content: { role: 'user', parts: [{ text }] },
        // @ts-ignore
        outputDimensionality: 768,
      });
      if (!response || !response.embedding || !response.embedding.values) {
        throw new Error('Invalid response structure from Gemini Embedding API');
      }
      const embedding = response.embedding.values;
      if (embedding.length !== 768) {
        throw new Error(`Embedding size mismatch: expected 768, got ${embedding.length}`);
      }
      return embedding;
    } catch (error) {
      if (i === retries - 1) {
        throw error;
      }
      console.warn(`Embedding failed. Retrying in ${delay}ms...`, error);
      await sleep(delay);
      delay *= 2;
    }
  }
  throw new Error(`Failed to embed text after ${retries} retries`);
}
