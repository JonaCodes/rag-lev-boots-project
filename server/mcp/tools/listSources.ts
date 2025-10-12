import { ARTICLE_IDS, PDF_FILES } from '../../config/constants';

export const listSourcesSchema = {};

export const listSourcesHandler = async () => {
  const pdfs = PDF_FILES.map((pdf) => ({ type: 'pdf', name: pdf }));
  const articles = ARTICLE_IDS.map((id) => ({ type: 'article', id }));

  const result = { pdfs, articles };

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
};
