// NOTE: a better practice would be to re-use the existing fetchers from the codebase.
// Here we're re-creating quite a bit of code which is not DRY, but for educational purposes it's easier to see how the tool works like this

import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { PDFParse } from 'pdf-parse';
import { fetchArticle } from '../../services/articleDataSource';
import { ARTICLE_IDS, PDF_FILES } from '../../config/constants';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export type ContentType = 'pdf' | 'article';

export interface ContentResult {
  type: ContentType;
  name: string;
  content: string;
}

export const detectContentType = (contentName: string): ContentType | null => {
  const isPdf = PDF_FILES.some((pdf) => pdf === contentName);
  if (isPdf) return 'pdf';

  const isArticle = ARTICLE_IDS.some((id) => id === contentName);
  if (isArticle) return 'article';

  return null;
};

export const fetchContent = async (
  contentName: string,
  contentType?: ContentType
): Promise<ContentResult> => {
  const type = contentType || detectContentType(contentName);

  if (!type) {
    throw new Error(
      `Content "${contentName}" not found. Available PDFs: ${PDF_FILES.join(
        ', '
      )}. Available articles: ${ARTICLE_IDS.join(', ')}`
    );
  }

  if (type === 'pdf') {
    const pdfPath = join(__dirname, '../../knowledge_pdfs', contentName);
    const buffer = await fs.readFile(pdfPath);
    const pdfParser = new PDFParse({ data: buffer });
    const data = await pdfParser.getText();
    await pdfParser.destroy();

    return {
      type: 'pdf',
      name: contentName,
      content: data.text,
    };
  }

  const articleIndex = ARTICLE_IDS.indexOf(
    contentName as (typeof ARTICLE_IDS)[number]
  );
  const article = await fetchArticle(articleIndex + 1, contentName);

  return {
    type: 'article',
    name: contentName,
    content: article.content,
  };
};
