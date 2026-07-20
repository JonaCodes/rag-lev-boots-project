import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');
import { RawDocument } from './types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pdfDir = path.resolve(__dirname, '../../knowledge_pdfs');

const PDF_FILES = [
  'OpEd - A Revolution at Our Feet.pdf',
  'Research Paper - Gravitational Reversal Physics.pdf',
  'White Paper - The Development of Localized Gravity Reversal Technology.pdf',
];

function cleanPDFText(text: string): string {
  if (!text) return '';

  return text
    // 1. Reconnect hyphenated words split across newlines
    .replace(/(\w+)-\s*\r?\n\s*(\w+)/g, '$1$2')
    // 2. Strip page numbers and headers
    .replace(/\bPage \d+( of \d+)?\b/gi, '')
    .replace(/\b\d+\s+\|\s+Page\b/gi, '')
    // 3. Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

export async function loadPDFs(): Promise<RawDocument[]> {
  const documents: RawDocument[] = [];

  for (const fileName of PDF_FILES) {
    const filePath = path.join(pdfDir, fileName);
    if (!fs.existsSync(filePath)) {
      throw new Error(`PDF file not found at path: ${filePath}`);
    }

    try {
      const dataBuffer = fs.readFileSync(filePath);
      const parser = new PDFParse({ data: dataBuffer });
      const data = await parser.getText();
      const cleanedContent = cleanPDFText(data.text);
      documents.push({
        source: 'pdf',
        sourceId: fileName,
        content: cleanedContent,
      });
    } catch (error) {
      console.error(`Failed to parse PDF file ${fileName}:`, error);
      throw error;
    }
  }

  return documents;
}
