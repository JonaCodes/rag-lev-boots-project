import express from 'express';
import { loadData, askQuestion } from '../controllers/ragController';
import { createRateLimiter } from '../middleware/rateLimiter';
import { ASK_RATE_LIMIT, LOAD_DATA_RATE_LIMIT } from '../services/rag/ragConfig';

const router = express.Router();

const askLimiter = createRateLimiter(ASK_RATE_LIMIT);
// /load_data re-ingests everything and is unauthenticated, so it gets a
// much stricter allowance than /ask.
const loadDataLimiter = createRateLimiter(LOAD_DATA_RATE_LIMIT);

router.post('/load_data', loadDataLimiter, loadData);
router.post('/ask', askLimiter, askQuestion);

export default router;
