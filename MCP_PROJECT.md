# MCP Server

## Overview

Your task is to build a local MCP server that exposes the Lev-Boots RAG system
(and its underlying resources) in this repo, then connect it to Claude Desktop

Here is the
[official guide](https://modelcontextprotocol.io/docs/develop/build-server) for
building MCP servers

---

## Setup

### Install MCP SDK and zod

```bash
cd server
npm install @modelcontextprotocol/sdk zod
```

### Directory Structure

At the very least, create the following structure in your `server/` directory:

```
server/
└── mcp/
    ├── server.ts          # Main MCP server
    ├── tools/             # Tool implementations
```

---

## Requirements

You need to implement **three tools**. Each tool should be in its own file in
`mcp/tools/`.

### 1. `rag_search`

The core RAG tool – lets clients ask questions about Lev-Boots.

- **Input**: `question` (string)
- **Output**: Answer from your RAG system
- **Implementation**: Call the existing `ask()` function from `ragService.ts`

### 2. `list_knowledge_sources`

Lists all available PDFs and articles in the knowledge base.

- **Input**: None
- **Output**: JSON object with two arrays:
  - `pdfs`: Array of objects with `{ type: 'pdf', name: string }`
  - `articles`: Array of objects with `{ type: 'article', id: string }`
- **Implementation**: Reference the `PDF_FILES` and `ARTICLE_IDS` constants from
  `config/constants.ts`

### 3. `read_source`

Reads the full content of a PDF or article.

- **Input**:
  - `sourceName` (string) - the PDF filename or article ID
  - `sourceType` (optional: `'pdf'` | `'article'`) - if omitted, auto-detect
- **Output**: Raw text content of the source
- **Implementation**:
  - For PDFs: Read from `knowledge_pdfs/` directory using `pdf-parse`
  - For articles: Fetch from the GitHub gist URLs
  - Ideally re-use existing logic

---

## Testing

### MCP Inspector

Start by running the inspector (`npx @modelcontextprotocol/inspector`) and
ensuring your tools work

You'll have to add the relevant environment variables in the inspector UI

### Connect to Claude Desktop

Once you verify your actual tools work, you can connect to Claude Desktop and
ask questions like:

- "How do levboots work?"

  - This should run the RAG tool

- "Summarize the first paragraph of the article about military something"
  - This should run both the `list_knowledge_sources` tool _and_ the
    `read_source` tool, then claude itself will do the summarizing
  - This is the power of MCP; you expose an LLM to data/tools outside its
    existing knowledge, and it combines them on its own

---

**Notes**

- Yes, you could dump this whole file into Claude/Gemini/Codex and let them do
  the work

  - _But then you won't learn much_
  - This project is not technically complicated - it's mostly set up and
    configuration, but hopefully it helps MCPS "click" in your mind

- I recommend you build the MCP server file yourself, configure all the tools
  (and their schemas/descriptions), and let your LLM coders do the actual tool
  implementations
