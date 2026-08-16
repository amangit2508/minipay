import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { PaymentService } from '../services/payment.service';

const CreatePaymentSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().length(3).default('INR'),
  paymentMethod: z.enum(['UPI', 'BANK_TRANSFER']).default('UPI'),
  customerPhone: z.string().min(10).max(13).optional(),
  vpa: z.string().optional(),
  bankAccount: z.string().optional(),
  ifscCode: z.string().optional(),
  customerEmail: z.string().email().optional(),
  description: z.string().max(255).optional(),
  metadata: z.record(z.any()).optional(),
});

export class PaymentController {
  static async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const validatedData = CreatePaymentSchema.parse(req.body);
      const idempotencyKey = req.headers['idempotency-key'] as string;

      const payment = await PaymentService.createPayment({
        ...validatedData,
        merchantId: req.merchant!.id,
        idempotencyKey,
      });

      res.status(201).json({ success: true, payment });
    } catch (error: any) {
      res.status(400).json({ error: error.message || error.errors });
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const payment = await PaymentService.getPaymentById(
        req.merchant!.id,
        req.params.id
      );

      if (!payment) {
        res.status(404).json({ error: 'Payment not found' });
        return;
      }

      res.status(200).json({ payment });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}