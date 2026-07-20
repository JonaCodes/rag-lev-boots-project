export interface RawDocument {
  source: string;
  sourceId: string;
  content: string;
}

export interface TextChunk {
  source: string;
  sourceId: string;
  chunkIndex: number;
  chunkContent: string;
}

export interface RetrievedChunk {
  source: string;
  sourceId: string;
  chunkIndex: number;
  chunkContent: string;
  distance: number;
}

export interface IngestionStats {
  docCount: number;
  chunkCount: number;
  insertedCount: number;
  skippedCount: number;
  errorCount: number;
}
