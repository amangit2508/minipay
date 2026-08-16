import { Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { redis } from '../config/redis';
import { WebhookService } from '../services/webhook.service';

const prisma = new PrismaClient();

export const webhookWorker = new Worker(
  'webhook-delivery-queue',
  async (job: Job) => {
    const { deliveryId, webhookUrl, secret, event } = job.data;
    const rawPayload = JSON.stringify(event);
    const signature = WebhookService.generateSignature(rawPayload, secret);

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-MiniPay-Signature': signature,
          'X-MiniPay-Event-Id': event.id,
        },
        body: rawPayload,
      });

      const responseBody = await response.text();

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}: ${responseBody.slice(0, 200)}`);
      }

      await prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: 'SUCCESS',
          responseStatus: response.status,
          responseBody: responseBody.slice(0, 500),
          attempts: job.attemptsMade + 1,
        },
      });
    } catch (error: any) {
      await prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: job.attemptsMade + 1 >= (job.opts.attempts || 5) ? 'FAILED' : 'RETRYING',
          responseBody: error.message,
          attempts: job.attemptsMade + 1,
        },
      });
      throw error; // Re-throw to trigger BullMQ exponential backoff retry
    }
  },
  { connection: redis }
);