import { Request, Response } from 'express';
import { ask, loadAllData } from '../services/ragService';
import { MAX_QUESTION_LENGTH } from '../services/rag/ragConfig';

export const loadData = async (_: Request, res: Response): Promise<void> => {
  try {
    const stats = await loadAllData();
    // ingestAllData never throws on partial/total loader failure (each
    // source is isolated so one bad source doesn't sink the others) — so a
    // total failure has to be detected from the stats instead of a caught
    // exception. docCount === 0 with errors means every loader failed.
    const failed = stats.docCount === 0 && stats.errorCount > 0;
    res.status(failed ? 500 : 200).json({ ok: !failed, ...stats });
  } catch (error) {
    res.status(500).json({
      answer: '',
      error: 'Failed to load data',
    });
  }
};

export const askQuestion = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userQuestion } = req.body || {};

    if (typeof userQuestion !== 'string') {
      res.status(400).json({
        answer: '',
        error: 'userQuestion must be a string',
      });
      return;
    }

    const trimmedQuestion = userQuestion.trim();
    if (trimmedQuestion.length === 0) {
      res.status(400).json({
        answer: '',
        error: 'You must provide the userQuestion',
      });
      return;
    }
    if (trimmedQuestion.length > MAX_QUESTION_LENGTH) {
      res.status(400).json({
        answer: '',
        error: `userQuestion must be ${MAX_QUESTION_LENGTH} characters or fewer`,
      });
      return;
    }

    const answer = await ask(trimmedQuestion);
    res.status(200).json({ answer });
  } catch (error) {
    console.error('Error in askQuestion:', error);
    res.status(500).json({
      answer: '',
      error: 'Failed to get answer for question',
    });
  }
};
