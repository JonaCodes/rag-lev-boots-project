import { RawDocument } from './types';

const ARTICLES = [
  { id: 'military-deployment-report', index: 1 },
  { id: 'urban-commuting', index: 2 },
  { id: 'hover-polo', index: 3 },
  { id: 'warehousing', index: 4 },
  { id: 'consumer-safety', index: 5 },
];

function cleanArticleText(text: string): string {
  if (!text) return '';

  return text
    // 1. Strip Markdown image syntax: ![alt](url)
    .replace(/!\[.*?\]\(.*?\)/g, '')
    // 2. Convert links [anchor](url) -> anchor
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    // 3. Strip HTML comments: <!-- comment -->
    .replace(/<!--[\s\S]*?-->/g, '')
    // 4. Reconnect hyphenated words split across newlines
    .replace(/(\w+)-\s*\r?\n\s*(\w+)/g, '$1$2')
    // 5. Strip Markdown bold formatting marks (**, __)
    .replace(/\*\*|__/g, '')
    // 6. Strip Markdown italics formatting marks (*, _)
    // We strip underscores only at word boundaries to preserve technical snake_case identifiers
    .replace(/(?<!\w)_(?=\w)|(?<=\w)_(?!\w)/g, '')
    .replace(/\*/g, '')
    // 7. Strip code backticks (`)
    .replace(/`/g, '');
}

export async function loadArticles(): Promise<RawDocument[]> {
  const documents: RawDocument[] = [];

  for (const article of ARTICLES) {
    const url = `https://gist.githubusercontent.com/JonaCodes/394d01021d1be03c9fe98cd9696f5cf3/raw/article-${article.index}_${article.id}.md`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const text = await response.text();
      const cleanedContent = cleanArticleText(text);
      documents.push({
        source: 'article',
        sourceId: article.id,
        content: cleanedContent,
      });
    } catch (error) {
      console.error(`Failed to fetch article ${article.id} from ${url}:`, error);
      throw error;
    }
  }

  return documents;
}
