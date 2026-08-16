import { Response, NextFunction } from 'express';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { redis } from '../config/redis';
import { AuthenticatedRequest } from './auth.middleware';

const prisma = new PrismaClient();

export const idempotencyMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const idempotencyKey = req.headers['idempotency-key'] as string;

  if (!idempotencyKey) {
    return next();
  }

  const merchantId = req.merchant!.id;
  const compositeKey = `idemp:${merchantId}:${idempotencyKey}`;
  const requestHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(req.body || {}))
    .digest('hex');

  // 1. Check Redis fast cache
  const cachedResponse = await redis.get(compositeKey);
  if (cachedResponse) {
    const parsed = JSON.parse(cachedResponse);
    res.status(parsed.statusCode).json(parsed.body);
    return;
  }

  // 2. Check Database record
  const existingRecord = await prisma.idempotencyRecord.findUnique({
    where: { key: compositeKey },
  });

  if (existingRecord) {
    if (existingRecord.requestHash !== requestHash) {
      res.status(409).json({
        error: 'Idempotency conflict: Key was already used with different payload',
      });
      return;
    }
    res.status(existingRecord.responseCode).json(existingRecord.responseBody);
    return;
  }

  // Intercept res.json to capture response
  const originalJson = res.json.bind(res);
  res.json = function (body: any) {
    const statusCode = res.statusCode;

    if (statusCode >= 200 && statusCode < 300) {
      const expirationSeconds = 86400; // 24 hours
      
      // Save to Redis
      redis.setex(compositeKey, expirationSeconds, JSON.stringify({ statusCode, body }));

      // Save to DB
      prisma.idempotencyRecord
        .create({
          data: {
            key: compositeKey,
            merchantId,
            requestHash,
            responseCode: statusCode,
            responseBody: body,
            expiresAt: new Date(Date.now() + expirationSeconds * 1000),
          },
        })
        .catch((err) => console.error('Error persisting idempotency record:', err));
    }

    return originalJson(body);
  };

  next();
};