import { z } from 'zod';
import { ask } from '../../services/ragService';

export const ragSearchSchema = {
  question: z.string().describe('The user question to search for'),
};

export const ragSearchHandler = async ({ question }: { question: string }) => {
  try {
    const answer = await ask(question);
    return { content: [{ type: 'text' as const, text: answer }] };
  } catch (error) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error performing RAG search: ${error}`,
        },
      ],
    };
  }
};
