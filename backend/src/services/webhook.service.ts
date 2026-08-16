import crypto from 'crypto';
import { Queue } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { redis } from '../config/redis';

const prisma = new PrismaClient();
export const webhookQueue = new Queue('webhook-delivery-queue', { connection: redis });

export class WebhookService {
  static generateSignature(payload: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  static async dispatchWebhookEvent(
    merchantId: string,
    eventType: string,
    payload: any
  ): Promise<void> {
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { webhookUrl: true, webhookSecret: true },
    });

    if (!merchant || !merchant.webhookUrl) return;

    // Save event in DB
    const event = await prisma.webhookEvent.create({
      data: {
        merchantId,
        eventType,
        payload,
      },
    });

    // Create delivery audit record
    const delivery = await prisma.webhookDelivery.create({
      data: {
        webhookEventId: event.id,
        status: 'PENDING',
      },
    });

    // Queue worker with exponential backoff
    await webhookQueue.add(
      'send-webhook',
      {
        deliveryId: delivery.id,
        webhookUrl: merchant.webhookUrl,
        secret: merchant.webhookSecret,
        event: {
          id: event.id,
          type: eventType,
          data: payload,
          createdAt: event.createdAt,
        },
      },
      {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 5000, // 5s, 10s, 20s, 40s, 80s
        },
        removeOnComplete: true,
      }
    );
  }
}