import axios from 'axios';
import { DATA_SOURCES, GIST_BASE_URL, ARTICLE_IDS, PROCESSING_CONFIG } from '../config/constants';

export interface ArticleData {
  id: string;
  content: string;
  source: typeof DATA_SOURCES.GIST;
  url: string;
}

export const fetchArticle = async (
  index: number,
  articleId: string
): Promise<ArticleData> => {
  const url = `${GIST_BASE_URL}/article-${index}_${articleId}.md`;

  try {
    const response = await axios.get(url, {
      timeout: PROCESSING_CONFIG.HTTP_TIMEOUT,
      responseType: 'text',
    });

    return {
      id: articleId,
      content: response.data,
      source: DATA_SOURCES.GIST,
      url,
    };
  } catch (error) {
    console.error(`Failed to fetch article ${articleId}:`, error);
    throw new Error(`Failed to fetch article ${articleId}: ${error}`);
  }
};

export const fetchAllArticles = async (): Promise<ArticleData[]> => {
  const fetchPromises = ARTICLE_IDS.map((id, index) =>
    fetchArticle(index + 1, id)
  );

  try {
    const articles = await Promise.allSettled(fetchPromises);

    const successful: ArticleData[] = [];
    const failed: string[] = [];

    articles.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successful.push(result.value);
      } else {
        failed.push(ARTICLE_IDS[index]);
        console.error(
          `Failed to fetch article ${ARTICLE_IDS[index]}:`,
          result.reason
        );
      }
    });

    if (failed.length > 0) {
      console.warn(
        `Failed to fetch ${failed.length} articles: ${failed.join(', ')}`
      );
    }

    console.log(`Successfully fetched ${successful.length} articles`);
    return successful;
  } catch (error) {
    console.error('Error fetching articles:', error);
    throw error;
  }
};
