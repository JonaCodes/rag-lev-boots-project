import { loadArticles } from './articleLoader';
import { loadPDFs } from './pdfLoader';
import { loadSlackMessages } from './slackLoader';
import { chunkDocument } from './chunkText';
import { embedText } from './embeddingService';
import sequelize from '../../config/database';
import { QueryTypes } from 'sequelize';
import { RawDocument, IngestionStats } from './types';

export async function ingestAllData(): Promise<IngestionStats> {
  let docCount = 0;
  let chunkCount = 0;
  let insertedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  console.log('Starting ingestion process...');

  const documents: RawDocument[] = [];

  // 1. Load PDFs
  try {
    console.log('Loading PDFs...');
    const pdfs = await loadPDFs();
    documents.push(...pdfs);
    console.log(`Loaded ${pdfs.length} PDFs.`);
  } catch (error) {
    console.error('Error loading PDFs:', error);
    errorCount++;
  }

  // 2. Load Articles
  try {
    console.log('Loading articles...');
    const articles = await loadArticles();
    documents.push(...articles);
    console.log(`Loaded ${articles.length} articles.`);
  } catch (error) {
    console.error('Error loading articles:', error);
    errorCount++;
  }

  // 3. Load Slack Messages
  try {
    console.log('Loading Slack messages...');
    const slackDocs = await loadSlackMessages();
    documents.push(...slackDocs);
    console.log(`Loaded ${slackDocs.length} Slack channels.`);
  } catch (error) {
    console.error('Error loading Slack messages:', error);
    errorCount++;
  }

  docCount = documents.length;
  console.log(`Total documents successfully loaded: ${docCount}`);

  // 4. Chunk and Ingest
  for (const doc of documents) {
    const chunks = chunkDocument(doc);
    chunkCount += chunks.length;

    console.log(`Processing ${chunks.length} chunks for ${doc.source}:${doc.sourceId}...`);

    for (const chunk of chunks) {
      try {
        // Cheap pre-check to avoid burning Gemini quota re-embedding chunks
        // that are already stored (the common case on a normal re-run).
        // This check is itself racy under concurrent ingestion runs, but the
        // INSERT below is atomic regardless, so a race here can only cost an
        // extra embedding call, never a duplicate row.
        const existing = await sequelize.query<{ id: number }>(
          `SELECT id FROM knowledge_base WHERE source = :source AND source_id = :sourceId AND chunk_index = :chunkIndex LIMIT 1`,
          {
            replacements: { source: chunk.source, sourceId: chunk.sourceId, chunkIndex: chunk.chunkIndex },
            type: QueryTypes.SELECT,
          }
        );
        if (existing.length > 0) {
          skippedCount++;
          continue;
        }

        console.log(`Embedding chunk ${chunk.chunkIndex} of ${doc.source}:${doc.sourceId}...`);
        const embedding = await embedText(chunk.chunkContent);

        if (!embedding.every(Number.isFinite)) {
          throw new Error(
            `Non-finite embedding value for ${doc.source}:${doc.sourceId}#${chunk.chunkIndex}, refusing to insert`
          );
        }

        // Atomic upsert: relies on the unique index on (source, source_id,
        // chunk_index) added in migration 20260720120000. Replaces the old
        // findOne-then-create pair, which raced under concurrent ingestion
        // runs and could insert duplicate chunks. `vector` is bound as a
        // replacement (not string-interpolated) even though it's always
        // API-derived numeric data — see the comment on the embedding
        // column type mismatch below and in models/KnowledgeBase.ts.
        const vectorStr = `[${embedding.join(',')}]`;
        const rows = await sequelize.query<{ id: number }>(
          `INSERT INTO knowledge_base (source, source_id, chunk_index, chunk_content, embeddings_768, created_at, updated_at)
           VALUES (:source, :sourceId, :chunkIndex, :chunkContent, CAST(:vector AS vector), NOW(), NOW())
           ON CONFLICT (source, source_id, chunk_index) DO NOTHING
           RETURNING id`,
          {
            replacements: {
              source: chunk.source,
              sourceId: chunk.sourceId,
              chunkIndex: chunk.chunkIndex,
              chunkContent: chunk.chunkContent,
              vector: vectorStr,
            },
            type: QueryTypes.SELECT,
          }
        );

        if (rows.length > 0) {
          insertedCount++;
        } else {
          skippedCount++;
        }

        // Polite sleep to be gentle on Gemini rate limit
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error processing chunk ${chunk.chunkIndex} for ${doc.source}:${doc.sourceId}:`, error);
        errorCount++;
      }
    }
  }

  console.log('Ingestion process completed.');
  console.log(`- documents loaded: ${docCount}`);
  console.log(`- chunks created: ${chunkCount}`);
  console.log(`- chunks inserted: ${insertedCount}`);
  console.log(`- chunks skipped: ${skippedCount}`);
  console.log(`- errors: ${errorCount}`);

  return { docCount, chunkCount, insertedCount, skippedCount, errorCount };
}
