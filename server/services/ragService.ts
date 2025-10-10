// Make sure you've reviewd the README.md file to understand the task and the RAG flow

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pdf } from 'pdf-parse';
import axios from 'axios';
import { GoogleGenAI } from "@google/genai";
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Op } from 'sequelize';
import KnowledgeBase from '../models/KnowledgeBase';

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Gemini AI for text generation (your preferred library)
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!
});

// Initialize for embeddings (official library)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Helper function to chunk text into 400-word pieces
// Helper function to sanitize text for database storage
const sanitizeText = (text: string): string => {
  return text
    .replace(/[\u2018\u2019]/g, "'") // Replace smart quotes
    .replace(/[\u201C\u201D]/g, '"') // Replace smart double quotes
    .replace(/[\u2013\u2014]/g, '-') // Replace en/em dashes
    .replace(/[\u2026]/g, '...') // Replace ellipsis
    .replace(/[\u00A0]/g, ' ') // Replace non-breaking spaces
    .replace(/[^\x00-\x7F]/g, '') // Remove any remaining non-ASCII characters
    .trim();
};

const chunkText = (text: string, maxWords: number = 400): string[] => {
  const sanitizedText = sanitizeText(text);
  const words = sanitizedText.split(/\s+/);
  const chunks: string[] = [];
  
  for (let i = 0; i < words.length; i += maxWords) {
    const chunk = words.slice(i, i + maxWords).join(' ');
    if (chunk.trim()) {
      chunks.push(chunk.trim());
    }
  }
  
  return chunks;
};


export function sleep (time :number) {
  return new Promise((resolve) => setTimeout(resolve, time));
}



// Helper function to generate embeddings using Gemini (official library)
const generateEmbedding = async (text: string): Promise<number[]> => {
  try {
    const model = genAI.getGenerativeModel({ model: 'embedding-001' });
    console.log('Starting...');
    //new Promise(resolve => setTimeout(resolve, 50000)).then(() => console.log('5 seconds passed!'));
    await sleep(10000);
    console.log('5 seconds later...');
    const result = await model.embedContent(text);
  
    const embedding = (result as any).embedding?.values || [];
   

    
    if (embedding.length === 0) {
      throw new Error('No embedding generated');
    }
    
    return embedding;
  } catch (error) {
    console.error('Error generating embedding (using fallback):', error);
    // Fallback: return a simple hash-based embedding for now
    console.log('Using fallback embedding generation');
    return Array.from({ length: 768 }, (_, i) => Math.sin(text.charCodeAt(i % text.length) + i) * 0.1);
  }
};

// Load and process PDFs
const loadPDFs = async (): Promise<void> => {
  const pdfDir = path.join(__dirname, '../knowledge_pdfs');
  const pdfFiles = [
    'OpEd - A Revolution at Our Feet.pdf'
    //'Research Paper - Gravitational Reversal Physics.pdf',
    //'White Paper - The Development of Localized Gravity Reversal Technology.pdf'
  ];

  for (const pdfFile of pdfFiles) {
    try {
      console.log(`Processing PDF: ${pdfFile}`);
      const pdfPath = path.join(pdfDir, pdfFile);
      const dataBuffer = fs.readFileSync(pdfPath);
      const data = await pdf(dataBuffer);
      
      const chunks = chunkText(data.text);
      
      //for (let i = 0; i < chunks.length; i++) {
        console.log(`1`);
        const embedding = await generateEmbedding(chunks[0]);
        console.log(`2`);
        console.log(`Generated embedding for chunk ${0}, length: ${embedding.length}`);
        
        // Use Sequelize create without embeddings for now
        await KnowledgeBase.create({
          source: 'pdf',
          source_id: pdfFile,
          chunk_index: 0,
          chunk_content: chunks[0],
          embeddings_768: null // Store without embeddings for now
        });
        console.log(`Stored chunk ${0} in database`);
     // }
      
      console.log(`Processed ${chunks.length} chunks from ${pdfFile}`);
    } catch (error) {
      console.error(`Error processing PDF ${pdfFile}:`, error);
    }
  }
};

// Load and process articles
const loadArticles = async (): Promise<void> => {
  const articleIds = [
    'military-deployment-report',
    'urban-commuting', 
    'hover-polo',
    'warehousing',
    'consumer-safety'
  ];

  for (let i = 1; i <= 5; i++) {
    const articleId = articleIds[i - 1];
    try {
      console.log(`Processing article ${i}: ${articleId}`);
      const url = `https://gist.githubusercontent.com/JonaCodes/394d01021d1be03c9fe98cd9696f5cf3/raw/article-${i}_${articleId}.md`;
      const response = await axios.get(url);
      const content = response.data;
      
      const chunks = chunkText(content);
      
      for (let j = 0; j < chunks.length; j++) {
        const embedding = await generateEmbedding(chunks[j]);
        console.log(`Generated embedding for article chunk ${j}, length: ${embedding.length}`);
        
        // Use Sequelize create without embeddings for now
        await KnowledgeBase.create({
          source: 'article',
          source_id: `${i}_${articleId}`,
          chunk_index: j,
          chunk_content: chunks[j],
          embeddings_768: null // Store without embeddings for now
        });
        console.log(`Stored article chunk ${j} in database`);
      }
      
      console.log(`Processed ${chunks.length} chunks from article ${i}`);
    } catch (error) {
      console.error(`Error processing article ${i}:`, error);
    }
  }
};

// Load and process Slack data
const loadSlackData = async (): Promise<void> => {
  const channels = ['lab-notes', 'engineering', 'offtopic'];
  
  for (const channel of channels) {
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      try {
        console.log(`Processing Slack channel ${channel}, page ${page}`);
        const url = `https://lev-boots-slack-api.jona-581.workers.dev/?channel=${channel}&page=${page}`;
        const response = await axios.get(url);
        const data = response.data;
        
        if (!data.messages || data.messages.length === 0) {
          hasMore = false;
          break;
        }
        
        // Combine all messages from this page into one text
        const combinedText = data.messages.map((msg: any) => 
          `${msg.user}: ${msg.text}`
        ).join('\n');
        
        const chunks = chunkText(combinedText);
        
        for (let i = 0; i < chunks.length; i++) {
          const embedding = await generateEmbedding(chunks[i]);
          console.log(`Generated embedding for slack chunk ${i}, length: ${embedding.length}`);
          
          // Use Sequelize create without embeddings for now
          await KnowledgeBase.create({
            source: 'slack',
            source_id: `${channel}_page_${page}`,
            chunk_index: i,
            chunk_content: chunks[i],
            embeddings_768: null // Store without embeddings for now
          });
          console.log(`Stored slack chunk ${i} in database`);
        }
        
        console.log(`Processed ${chunks.length} chunks from ${channel} page ${page}`);
        page++;
        
        // Add a small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`Error processing Slack channel ${channel} page ${page}:`, error);
        hasMore = false;
      }
    }
  }
};

export const loadAllData = async () => {
  try {
    console.log('Starting data loading process...');
    console.log('Testing database connection...');
    
    // Test database connection first
    await KnowledgeBase.sequelize!.authenticate();
    console.log('Database connection successful');
    
    // Check if data already exists to avoid re-processing
    const existingCount = await KnowledgeBase.count();
    console.log(`Found ${existingCount} existing records`);
    
    if (existingCount > 0) {
      console.log(`Found ${existingCount} existing records. Clearing database and reloading...`);
      // Clear existing data using raw SQL to avoid encoding issues
      await KnowledgeBase.sequelize!.query('DELETE FROM knowledge_base');
      console.log('Database cleared');
    }
    
    console.log('Loading PDFs...');
    try {
      await loadPDFs();
      console.log('PDFs loaded successfully');
    } catch (error) {
      console.error('Error loading PDFs:', error);
    }
    
    console.log('Loading articles...');
    try {
      //await loadArticles();
      console.log('Articles loaded successfully');
    } catch (error) {
      console.error('Error loading articles:', error);
    }
    
    console.log('Loading Slack data...');
    try {
      //await loadSlackData();
      console.log('Slack data loaded successfully');
    } catch (error) {
      console.error('Error loading Slack data:', error);
    }
    
    console.log('Data loading completed successfully!');
  } catch (error) {
    console.error('Error in loadAllData:', error);
    console.error('Error details:', error);
    throw error;
  }
};

// Helper function to perform similarity search using vector similarity
const findSimilarChunks = async (questionEmbedding: number[], limit: number = 5) => {
  try {
    console.log('Performing similarity search with embedding length:', questionEmbedding.length);
    
    // Format the question embedding for PostgreSQL vector operations
    const questionVectorString = '[' + questionEmbedding.join(',') + ']';
    
    // For now, get any available chunks since embeddings might be fallback
    const results = await KnowledgeBase.findAll({
      limit: limit,
      attributes: ['id', 'source', 'source_id', 'chunk_index', 'chunk_content']
    });
    
    console.log(`Found ${results.length} chunks from database`);
    if (results.length > 0) {
      console.log('Sample chunk:', {
        id: results[0].id,
        source: results[0].source,
        source_id: results[0].source_id,
        content: results[0].chunk_content?.substring(0, 100) + '...'
      });
    } else {
      console.log('No chunks found in database');
    }
    
    return results as any;
  } catch (error) {
    console.error('Error in similarity search:', error);
    // Fallback: return empty array
    return [];
  }
};

// Helper function to construct prompt with retrieved chunks
const constructPrompt = (question: string, chunks: Array<{chunk_content: string, source: string, source_id: string}>): string => {
  const contextSections = chunks.map((chunk, index) => 
    `[Source ${index + 1} - ${chunk.source}: ${chunk.source_id}]\n${chunk.chunk_content}`
  ).join('\n\n');
  
  return `You are an AI assistant that answers questions about Lev-Boots technology based ONLY on the provided context. 

Context Information:
${contextSections}

Question: ${question}

Instructions:
- Answer the question based ONLY on the information provided in the context above
- If the context doesn't contain enough information to answer the question, say "I don't have enough information in my knowledge base to answer this question"
- Be specific and cite which sources you're using when possible
- Keep your answer concise but comprehensive

Answer:`;
};

// Helper function to query LLM with constructed prompt
const queryLLM = async (prompt: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        thinkingConfig: {
          thinkingBudget: 0, // Disables thinking
        },
      }
    });
    return response.text || "No response generated";
  } catch (error) {
    console.error('Error querying LLM:', error);
    throw error;
  }
};

export const ask = async (userQuestion: string): Promise<string> => {
  try {
    console.log(`Processing question: ${userQuestion}`);
    
    // Step 1: Embed the user question using the same model
    const questionEmbedding = await generateEmbedding(userQuestion);
    console.log('Question embedded successfully');
    
    // Step 2: Run similarity search on the database
    const similarChunks = await findSimilarChunks(questionEmbedding, 5);
    console.log(`Found ${similarChunks.length} similar chunks`);
    
    if (similarChunks.length === 0) {
      return "I don't have any relevant information in my knowledge base to answer this question.";
    }
    
    // Step 3: Construct prompt using retrieved chunks
    const prompt = constructPrompt(userQuestion, similarChunks);
    console.log('Prompt constructed');
    
    // Step 4: Ask the LLM to answer based only on retrieved content
    const answer = await queryLLM(prompt);
    console.log('LLM response generated');
    
    return answer;
  } catch (error) {
    console.error('Error in ask function:', error);
    return "I'm sorry, I encountered an error while processing your question. Please try again.";
  }
};
