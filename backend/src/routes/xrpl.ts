import { Router, Request, Response } from 'express';
import { paymentProvider } from '../services/payment-provider';
import { XrplPaymentProvider } from '../services/payment-provider';

const router = Router();

// GET /api/xrpl/status — check XRPL connection and wallet balances
router.get('/xrpl/status', async (_req: Request, res: Response) => {
  const provider = paymentProvider as XrplPaymentProvider;
  const status = await provider.getStatus();
  res.json(status);
});

export default router;
