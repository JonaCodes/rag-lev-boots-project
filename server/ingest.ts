import { loadAllData } from './services/ragService';
import sequelize from './config/database';

async function main() {
  try {
    console.log('Starting full data ingestion...');
    await loadAllData();
    console.log('Full data ingestion completed successfully!');
  } catch (error) {
    console.error('Ingestion failed with error:', error);
  } finally {
    await sequelize.close();
  }
}

main();
