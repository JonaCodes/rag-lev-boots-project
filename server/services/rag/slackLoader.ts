import { RawDocument } from './types';

interface SlackMessage {
  id: string;
  channel: string;
  user: string;
  role: string;
  ts: string;
  text: string;
  thread_ts?: string;
}

interface SlackAPIResponse {
  channel: string;
  page: number;
  limit: number;
  total: number;
  items: SlackMessage[];
}

const CHANNELS = ['lab-notes', 'engineering', 'offtopic'];

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanSlackText(text: string): string {
  if (!text) return '';

  return text
    // 1. Strip bold formatting asterisks (e.g. *bold*)
    .replace(/\*/g, '')
    // 2. Strip italic formatting underscores only at word boundaries (to preserve technical_identifiers)
    .replace(/(?<!\w)_(?=\w)|(?<=\w)_(?!\w)/g, '')
    // 3. Strip backticks for code block styling (e.g. `code`)
    .replace(/`/g, '');
}

async function fetchWithRetry(url: string, retries = 5, delay = 500): Promise<SlackAPIResponse> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (response.status === 429) {
        console.warn(`Rate limited (429) on URL: ${url}. Retrying in ${delay}ms...`);
        await sleep(delay);
        delay *= 2;
        continue;
      }
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return (await response.json()) as SlackAPIResponse;
    } catch (error) {
      if (i === retries - 1) throw error;
      console.warn(`Fetch error for URL: ${url}. Retrying in ${delay}ms...`, error);
      await sleep(delay);
      delay *= 2;
    }
  }
  throw new Error(`Failed to fetch after ${retries} retries`);
}

export async function loadSlackMessages(): Promise<RawDocument[]> {
  const documents: RawDocument[] = [];

  for (const channel of CHANNELS) {
    let page = 1;
    const allMessages: SlackMessage[] = [];

    while (true) {
      const url = `https://lev-boots-slack-api.jona-581.workers.dev/?channel=${channel}&page=${page}`;
      console.log(`Fetching Slack channel ${channel}, page ${page}...`);
      const data = await fetchWithRetry(url);
      if (!data.items || data.items.length === 0) {
        break;
      }

      allMessages.push(...data.items);

      if (data.items.length < data.limit) {
        break;
      }

      page++;
      await sleep(800);
    }

    // Filter out system messages
    const filteredMessages = allMessages.filter((msg) => {
      if (!msg.text || !msg.user) return false;
      // Filter typical system message patterns
      const systemPatterns = [
        /joined the #/i,
        /left the #/i,
        /has integrated/i,
        /pinned a message/i,
        /shared a file/i,
      ];
      return !systemPatterns.some((pattern) => pattern.test(msg.text));
    });

    // Thread grouping algorithm
    const parentMessages: SlackMessage[] = [];
    const repliesByThread = new Map<string, SlackMessage[]>();

    for (const msg of filteredMessages) {
      const isReply = msg.thread_ts && msg.thread_ts !== msg.ts;
      if (isReply) {
        const threadTs = msg.thread_ts!;
        if (!repliesByThread.has(threadTs)) {
          repliesByThread.set(threadTs, []);
        }
        repliesByThread.get(threadTs)!.push(msg);
      } else {
        parentMessages.push(msg);
      }
    }

    // Sort parent messages chronologically
    parentMessages.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());

    const formattedBlocks: string[] = [];
    const processedThreadTs = new Set<string>();

    for (const parent of parentMessages) {
      const cleanedParentText = cleanSlackText(parent.text);
      formattedBlocks.push(`[${parent.user} (${parent.role}) at ${parent.ts}]: ${cleanedParentText}`);
      
      const replies = repliesByThread.get(parent.ts);
      if (replies) {
        // Sort replies chronologically
        replies.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
        for (const reply of replies) {
          const cleanedReplyText = cleanSlackText(reply.text);
          formattedBlocks.push(`  -> [Reply from ${reply.user} (${reply.role}) at ${reply.ts}]: ${cleanedReplyText}`);
        }
        processedThreadTs.add(parent.ts);
      }
    }

    // Handle any orphaned replies (just in case parent message was not fetched)
    const orphanedReplies: SlackMessage[] = [];
    for (const [threadTs, replies] of repliesByThread.entries()) {
      if (!processedThreadTs.has(threadTs)) {
        orphanedReplies.push(...replies);
      }
    }

    if (orphanedReplies.length > 0) {
      orphanedReplies.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
      for (const reply of orphanedReplies) {
        const cleanedReplyText = cleanSlackText(reply.text);
        formattedBlocks.push(`[Orphaned Reply from ${reply.user} (${reply.role}) at ${reply.ts}]: ${cleanedReplyText}`);
      }
    }

    const formattedText = formattedBlocks.join('\n');

    documents.push({
      source: 'slack',
      sourceId: channel,
      content: formattedText,
    });
  }

  return documents;
}
