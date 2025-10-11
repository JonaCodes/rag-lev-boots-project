import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { chunkText, embedChunks } from '../contentPipeline';
import { saveToKnowledgeBase } from '../dataStorage';
import { DATA_SOURCES, PDF_FILES } from '../../config/constants';
import { PDFParse } from 'pdf-parse';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const processPDFs = async (): Promise<void> => {
  console.log('Processing PDFs...');

  for (const filename of PDF_FILES) {
    console.log(`Processing PDF: ${filename}...`);

    const pdfPath = join(__dirname, '../../knowledge_pdfs', filename);
    const buffer = await fs.readFile(pdfPath);
    const pdfParser = new PDFParse({ data: buffer });

    const data = await pdfParser.getText();
    const text = data.text;
    await pdfParser.destroy();

    const chunks = chunkText(text);
    const embeddings = await embedChunks(chunks);

    await saveToKnowledgeBase(DATA_SOURCES.PDF, filename, chunks, embeddings);
    console.log(`Saved ${chunks.length} chunks for PDF ${filename}`);
  }

  console.log(`Successfully processed ${PDF_FILES.length} PDFs`);
};
