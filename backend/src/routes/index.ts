import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middlewares/auth.middleware';
import { idempotencyMiddleware } from '../middlewares/idempotency.middleware';
import { PaymentController } from '../controllers/payment.controller';
import { MerchantController } from '../controllers/merchant.controller';

const router = Router();
const prisma = new PrismaClient();

// --- Auth Routes ---
router.post('/auth/register', async (req, res) => {
  const { email, password, name } = req.body;
  const passwordHash = await bcrypt.hash(password, 10);
  try {
    const merchant = await prisma.merchant.create({
      data: { email, passwordHash, name },
    });
    const token = jwt.sign({ id: merchant.id, email: merchant.email }, process.env.JWT_SECRET || 'super-secret', {
      expiresIn: '7d',
    });
    res.json({ token, merchant: { id: merchant.id, email: merchant.email, apiKey: merchant.apiKey } });
  } catch (err: any) {
    res.status(400).json({ error: 'Merchant already exists' });
  }
});

router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const merchant = await prisma.merchant.findUnique({ where: { email } });
  if (!merchant || !(await bcrypt.compare(password, merchant.passwordHash))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ id: merchant.id, email: merchant.email }, process.env.JWT_SECRET || 'super-secret', {
    expiresIn: '7d',
  });
  res.json({ token, merchant: { id: merchant.id, email: merchant.email, apiKey: merchant.apiKey } });
});

// --- Payment Gateway Routes (Protected) ---
router.post('/v1/payments', authenticate, idempotencyMiddleware, PaymentController.create);
router.get('/v1/payments/:id', authenticate, PaymentController.getById);

// --- Merchant Dashboard Routes (Protected) ---
router.get('/v1/merchant/analytics', authenticate, MerchantController.getAnalytics);
router.get('/v1/merchant/transactions', authenticate, MerchantController.getTransactions);
router.put('/v1/merchant/settings', authenticate, MerchantController.updateSettings);

export default router;