import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class AnalyticsService {
  static async getMerchantMetrics(merchantId: string) {
    const totalPayments = await prisma.payment.count({ where: { merchantId } });
    const succeededPayments = await prisma.payment.count({
      where: { merchantId, status: 'SUCCEEDED' },
    });
    const failedPayments = await prisma.payment.count({
      where: { merchantId, status: 'FAILED' },
    });

    const aggregateVolume = await prisma.transaction.aggregate({
      where: { merchantId },
      _sum: { net: true, amount: true, fee: true },
    });

    const successRate = totalPayments > 0 ? (succeededPayments / totalPayments) * 100 : 0;

    // Last 7 days volume breakdown
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentTransactions = await prisma.transaction.findMany({
      where: {
        merchantId,
        createdAt: { gte: sevenDaysAgo },
      },
      select: {
        amount: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      grossVolume: aggregateVolume._sum.amount || 0,
      netVolume: aggregateVolume._sum.net || 0,
      totalFees: aggregateVolume._sum.fee || 0,
      totalPayments,
      succeededPayments,
      failedPayments,
      successRate: +successRate.toFixed(2),
      recentTransactions,
    };
  }
}