import { loadArticles } from '../articleDataSource';
import { chunkText, embedChunks } from '../contentPipeline';
import { saveToKnowledgeBase } from '../dataStorage';

export const processArticles = async (): Promise<void> => {
  console.log('Processing articles...');

  const articles = await loadArticles();

  for (const article of articles) {
    const chunks = chunkText(article.content);
    const embeddings = await embedChunks(chunks);

    await saveToKnowledgeBase(article.source, article.id, chunks, embeddings);
  }

  console.log(`Successfully processed ${articles.length} articles`);
};
