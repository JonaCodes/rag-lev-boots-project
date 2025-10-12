import { z } from 'zod';
import { fetchContent, ContentType } from '../utils/contentFetcher';

export const readSourceSchema = {
  sourceName: z.string().describe('The PDF file name or article ID'),
  sourceType: z
    .enum(['pdf', 'article'])
    .optional()
    .describe('Type of source (pdf or article). If omitted, auto-detected'),
};

export const readSourceHandler = async ({
  sourceName,
  sourceType,
}: {
  sourceName: string;
  sourceType?: ContentType;
}) => {
  try {
    const content = await fetchContent(sourceName, sourceType);

    return {
      content: [
        {
          type: 'text' as const,
          text: `Source: ${content.name} (${content.type})\n\n${content.content}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error reading source: ${error}`,
        },
      ],
    };
  }
};
