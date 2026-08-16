import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { AnalyticsService } from '../services/analytics.service';

const prisma = new PrismaClient();

export class MerchantController {
  static async getAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const metrics = await AnalyticsService.getMerchantMetrics(req.merchant!.id);
      res.json(metrics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getTransactions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { limit = '20', page = '1', status } = req.query;
      const take = parseInt(limit as string, 10);
      const skip = (parseInt(page as string, 10) - 1) * take;

      const whereClause: any = { merchantId: req.merchant!.id };
      if (status) {
        whereClause.status = status;
      }

      const [total, payments] = await Promise.all([
        prisma.payment.count({ where: whereClause }),
        prisma.payment.findMany({
          where: whereClause,
          orderBy: { createdAt: 'desc' },
          take,
          skip,
        }),
      ]);

      res.json({
        total,
        page: parseInt(page as string, 10),
        totalPages: Math.ceil(total / take),
        data: payments,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async updateSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { webhookUrl } = req.body;
      const updated = await prisma.merchant.update({
        where: { id: req.merchant!.id },
        data: { webhookUrl },
        select: { id: true, webhookUrl: true, webhookSecret: true, apiKey: true },
      });
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}