import { Request, Response } from 'express';
import { ask, loadAllData } from '../services/ragService';

export const loadData = async (_: Request, res: Response): Promise<void> => {
  try {
    console.log('XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');
    console.log('loadData controller called - starting loadAllData...');
    
    await loadAllData();
    console.log('loadAllData completed successfully');
    res.status(200).json({ 
      ok: true, 
      message: 'Data loaded successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in loadData controller:', error);
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
    if (!userQuestion) {
      res.status(400).json({
        answer: '',
        error: 'You must provide the userQuestion',
      });
      return;
    }

    const answer = await ask(userQuestion);
    res.status(200).json({ answer });
  } catch (error) {
    res.status(500).json({
      answer: '',
      error: 'Failed to get answer for question',
    });
  }
};
