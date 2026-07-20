import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import { promisify } from 'util';
import { exec } from 'child_process';
import { createRequire } from 'module';

dotenv.config();

const execPromise = promisify(exec);

// encodePasswordUrl.cjs is plain CommonJS (not compiled TS) so that
// server/config/config.cjs can require() it directly for sequelize-cli.
// createRequire lets this ESM module load that same file instead of
// duplicating the logic.
const require = createRequire(import.meta.url);
const { encodePasswordInUrl } = require('./encodePasswordUrl.cjs') as {
  encodePasswordInUrl: (url: string) => string;
};

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required');
}

const encodedDatabaseUrl = encodePasswordInUrl(databaseUrl);

// Update process.env.DATABASE_URL so that child processes (like migrations) inherit the encoded URL
process.env.DATABASE_URL = encodedDatabaseUrl;

const sequelize = new Sequelize(encodedDatabaseUrl, {
  dialect: 'postgres',
  logging: false,
});

const runMigrations = async (): Promise<void> => {
  try {
    const { stdout } = await execPromise('npm run migrate');
    console.log(`Migration output: ${stdout}`);
  } catch (error) {
    console.error(`Error running migrations: ${(error as Error).message}`);
    throw error;
  }
};

export const initializeDB = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    await runMigrations();
    console.log('Migrations completed successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    throw error;
  }
};

export default sequelize;
