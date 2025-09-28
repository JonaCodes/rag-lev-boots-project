import express from 'express';
import { loadData, askQuestion } from '../controllers/ragController';

const router = express.Router();

router.get('/load_data', loadData); // this is just to trigger the flow, technically it should be a POST but GET is easier to run
router.post('/ask', askQuestion);

export default router;
