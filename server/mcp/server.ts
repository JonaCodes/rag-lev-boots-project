// NOTE: this MCP server is *embedded* in the lev-boots project
// This is fine sometimes (e.g if you want your MCP server to access the internal tools/DBs)
// Though generally MCP servers are hosted independently and access any relevant tools via HTTP

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ragSearchSchema, ragSearchHandler } from './tools/ragSearch.js';
import { listSourcesSchema, listSourcesHandler } from './tools/listSources.js';
import { readSourceSchema, readSourceHandler } from './tools/readSource.js';

const mcpServer = new McpServer({
  name: 'lev-boots-server',
  version: '1.0.0',
});

mcpServer.registerTool(
  'rag_search',
  {
    title: 'RAG Search',
    description:
      'Search the Lev-Boots knowledge base using RAG (Retrieval-Augmented Generation) - great for broad knowledge coverage, not specific questions about a single source',
    inputSchema: ragSearchSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  ragSearchHandler
);

mcpServer.registerTool(
  'list_knowledge_sources',
  {
    title: 'List Knowledge Sources',
    description:
      'List all available PDF names and article IDs in the Lev-Boots knowledge base',
    inputSchema: listSourcesSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  listSourcesHandler
);

mcpServer.registerTool(
  'read_source',
  {
    title: 'Read Source',
    description:
      'Read the full content of a PDF or article from the knowledge base. Optionally specify source type (pdf/article) or let it auto-detect.',
    inputSchema: readSourceSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  readSourceHandler
);

const transport = new StdioServerTransport();
await mcpServer.connect(transport);
