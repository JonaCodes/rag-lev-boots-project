require('dotenv').config();

const { encodePasswordInUrl } = require('./encodePasswordUrl.cjs');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

const encodedUrl = encodePasswordInUrl(process.env.DATABASE_URL);

module.exports = {
  development: {
    url: encodedUrl,
    dialect: 'postgres'
  },
  test: {
    url: encodedUrl,
    dialect: 'postgres'
  },
  production: {
    url: encodedUrl,
    dialect: 'postgres'
  }
};
