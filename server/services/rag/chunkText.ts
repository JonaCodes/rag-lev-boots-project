import { RawDocument, TextChunk } from './types';

export function chunkDocument(doc: RawDocument): TextChunk[] {
  // Clean extra whitespace
  const cleanedText = doc.content
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanedText) {
    return [];
  }

  const words = cleanedText.split(' ');
  const chunkSize = 400;
  const overlap = 40;
  const minWords = 30; // Threshold for tiny chunk

  const chunks: TextChunk[] = [];
  let chunkIndex = 0;

  if (words.length <= chunkSize) {
    // If the document is very short, keep it as one chunk even if it's less than minWords
    chunks.push({
      source: doc.source,
      sourceId: doc.sourceId,
      chunkIndex: chunkIndex++,
      chunkContent: cleanedText,
    });
    return chunks;
  }

  let i = 0;
  let lastChunkStart = 0;
  while (i < words.length) {
    const chunkWords = words.slice(i, i + chunkSize);
    if (chunkWords.length === 0) {
      break;
    }

    // If this is a trailing remainder and it's too small to stand on its own,
    // merge it into the previous chunk instead of dropping it. Re-slice from
    // the previous chunk's own start (rather than concatenating strings) so
    // the words already shared via `overlap` aren't duplicated.
    if (chunkWords.length < minWords && chunks.length > 0) {
      chunks[chunks.length - 1].chunkContent = words.slice(lastChunkStart).join(' ');
      break;
    }

    const chunkContent = chunkWords.join(' ');
    chunks.push({
      source: doc.source,
      sourceId: doc.sourceId,
      chunkIndex: chunkIndex++,
      chunkContent,
    });
    lastChunkStart = i;

    if (i + chunkSize >= words.length) {
      break;
    }
    i += chunkSize - overlap;
  }

  return chunks;
}
