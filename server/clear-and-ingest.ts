import sequelize from './config/database';
import KnowledgeBase from './models/KnowledgeBase';
import { ingestAllData } from './services/rag/ingestionService';

async function main() {
  try {
    console.log('--- STARTING CLEAN RE-INGESTION ---');
    
    // Authenticate database connection
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');

    // Truncate table to remove all old chunks
    console.log('Clearing the knowledge_base table...');
    await KnowledgeBase.destroy({ where: {}, truncate: true });
    console.log('knowledge_base table has been truncated successfully.');

    // Run full ingestion
    console.log('Starting full data ingestion...');
    await ingestAllData();
    console.log('Clean data ingestion completed successfully!');

  } catch (error) {
    console.error('Clean re-ingestion failed with error:', error);
  } finally {
    // Close database connection
    await sequelize.close();
    console.log('Database connection closed.');
  }
}

main();
