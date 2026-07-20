import dotenv from 'dotenv';
import { createRequire } from 'module';

dotenv.config();

// Uses the exact same encoder that config/database.ts uses in production,
// so this script actually verifies what will happen at runtime.
const require = createRequire(import.meta.url);
const { encodePasswordInUrl } = require('./config/encodePasswordUrl.cjs') as {
  encodePasswordInUrl: (url: string) => string;
};

const str = process.env.DATABASE_URL || '';

const encodedUrl = encodePasswordInUrl(str);
console.log('Original url length:', str.length);
console.log('Encoded url length:', encodedUrl.length);
try {
  const parsed = new URL(encodedUrl);
  console.log('Parsed successfully! Protocol:', parsed.protocol, 'Host:', parsed.host, 'Path:', parsed.pathname);
} catch (e: any) {
  console.error('Failed to parse encoded URL:', e.message);
}
