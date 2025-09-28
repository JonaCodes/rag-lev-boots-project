export interface ContentChunk {
  content: string;
  wordCount: number;
  startPosition: number;
}

const splitWords = (text: string): string[] => {
  return text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0);
};

const countWords = (text: string): number => {
  return splitWords(text).length;
};

const splitIntoParagraphs = (content: string): string[] => {
  // Split by double newlines first (preferred paragraph breaks)
  let paragraphs = content.split(/\n\s*\n/);

  // If no double newlines, fall back to single newlines
  if (paragraphs.length === 1) {
    paragraphs = content.split(/\n/);
  }

  return paragraphs.filter((p) => p.trim().length > 0);
};

const mergeSmallTrailingChunk = (
  chunks: ContentChunk[],
  minTrailingWords: number = 100
): ContentChunk[] => {
  if (chunks.length < 2) return chunks;

  const lastChunk = chunks[chunks.length - 1];
  if (lastChunk.wordCount >= minTrailingWords) return chunks;

  // Merge last chunk into second-to-last chunk
  const secondToLast = chunks[chunks.length - 2];
  const mergedChunk: ContentChunk = {
    content: secondToLast.content + '\n\n' + lastChunk.content,
    wordCount: secondToLast.wordCount + lastChunk.wordCount,
    startPosition: secondToLast.startPosition,
  };

  return [...chunks.slice(0, -2), mergedChunk];
};

// Chunks into whole paragraphs of at least 400 words total, ensuring no dangling paragraphs with <100 words
export const chunkContentByWords = (
  content: string,
  minWordCount: number = 400
): ContentChunk[] => {
  if (!content.trim()) return [];

  const paragraphs = splitIntoParagraphs(content);
  if (!paragraphs.length) return [];

  const chunks: ContentChunk[] = [];
  let currentChunk = '';
  let currentWordCount = 0;
  let startPosition = 0;

  for (const paragraph of paragraphs) {
    const paragraphWordCount = countWords(paragraph);

    // If adding this paragraph would exceed our target and we already have enough words
    if (currentWordCount > 0 && currentWordCount >= minWordCount) {
      // Save current chunk
      chunks.push({
        content: currentChunk.trim(),
        wordCount: currentWordCount,
        startPosition,
      });

      // Start new chunk
      startPosition += currentChunk.length;
      currentChunk = paragraph;
      currentWordCount = paragraphWordCount;
    } else {
      // Add paragraph to current chunk
      if (currentChunk) {
        currentChunk += '\n\n' + paragraph;
      } else {
        currentChunk = paragraph;
      }
      currentWordCount += paragraphWordCount;
    }
  }

  // Add final chunk if it has content
  if (currentChunk.trim()) {
    chunks.push({
      content: currentChunk.trim(),
      wordCount: currentWordCount,
      startPosition,
    });
  }

  // Merge small trailing chunk if necessary
  return mergeSmallTrailingChunk(chunks);
};
