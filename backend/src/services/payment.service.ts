import { PrismaClient, PaymentStatus } from '@prisma/client';
import { MockPaymentProvider } from './provider.service';
import { WebhookService } from './webhook.service';

const prisma = new PrismaClient();

export interface CreatePaymentDTO {
  merchantId: string;
  amount: number;
  currency: string;
  paymentMethod?: 'UPI' | 'BANK_TRANSFER';
  customerPhone?: string;
  vpa?: string;
  bankAccount?: string;
  ifscCode?: string;
  customerEmail?: string;
  description?: string;
  metadata?: any;
  idempotencyKey?: string;
}

export class PaymentService {
  static async createPayment(dto: CreatePaymentDTO) {
    const feePercent = 0.02; // 2.0% standard gateway fee
    const fee = +(dto.amount * feePercent).toFixed(2);
    const net = +(dto.amount - fee).toFixed(2);

    // Auto-generate VPA if only mobile number is provided
    let derivedVpa = dto.vpa;
    if (dto.customerPhone && !derivedVpa) {
      derivedVpa = `${dto.customerPhone}@upi`;
    }

    const payment = await prisma.payment.create({
      data: {
        merchantId: dto.merchantId,
        amount: dto.amount,
        currency: dto.currency.toUpperCase(),
        paymentMethod: dto.paymentMethod || 'UPI',
        customerPhone: dto.customerPhone,
        vpa: derivedVpa,
        bankAccount: dto.bankAccount,
        ifscCode: dto.ifscCode ? dto.ifscCode.toUpperCase() : undefined,
        customerEmail: dto.customerEmail,
        description: dto.description,
        metadata: dto.metadata || {},
        idempotencyKey: dto.idempotencyKey,
        status: PaymentStatus.PROCESSING,
      },
    });

    // Execute through Payment Provider Engine
    const result = await MockPaymentProvider.processPayment(dto.amount, dto.currency);

    const finalStatus: PaymentStatus =
      result.status === 'SUCCEEDED' ? PaymentStatus.SUCCEEDED : PaymentStatus.FAILED;

    const updatedPayment = await prisma.$transaction(async (tx) => {
      const p = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: finalStatus,
          providerTxId: result.providerTxId,
        },
      });

      if (finalStatus === PaymentStatus.SUCCEEDED) {
        await tx.transaction.create({
          data: {
            merchantId: dto.merchantId,
            paymentId: payment.id,
            amount: dto.amount,
            fee: fee,
            net: net,
            currency: dto.currency.toUpperCase(),
          },
        });
      }

      return p;
    });

    // Webhook dispatch
    WebhookService.dispatchWebhookEvent(
      dto.merchantId,
      finalStatus === PaymentStatus.SUCCEEDED ? 'payment.succeeded' : 'payment.failed',
      {
        id: updatedPayment.id,
        amount: updatedPayment.amount,
        currency: updatedPayment.currency,
        paymentMethod: updatedPayment.paymentMethod,
        customerPhone: updatedPayment.customerPhone,
        vpa: updatedPayment.vpa,
        bankAccount: updatedPayment.bankAccount ? `****${updatedPayment.bankAccount.slice(-4)}` : null,
        ifscCode: updatedPayment.ifscCode,
        status: updatedPayment.status,
        providerTxId: updatedPayment.providerTxId,
        createdAt: updatedPayment.createdAt,
      }
    );

    return updatedPayment;
  }

  static async getPaymentById(merchantId: string, paymentId: string) {
    return prisma.payment.findFirst({
      where: { id: paymentId, merchantId },
      include: { transactions: true },
    });
  }
}