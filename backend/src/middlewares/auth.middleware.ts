import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuthenticatedRequest extends Request {
  merchant?: {
    id: string;
    email: string;
    apiKey: string;
  };
}

// Authenticate via Bearer JWT (Merchant Dashboard) OR X-API-KEY header (API Access)
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    const authHeader = req.headers.authorization;

    if (apiKey) {
      const merchant = await prisma.merchant.findUnique({
        where: { apiKey },
        select: { id: true, email: true, apiKey: true },
      });

      if (!merchant) {
        res.status(401).json({ error: 'Invalid API Key' });
        return;
      }

      req.merchant = merchant;
      return next();
    }

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super-secret') as {
        id: string;
        email: string;
      };

      const merchant = await prisma.merchant.findUnique({
        where: { id: decoded.id },
        select: { id: true, email: true, apiKey: true },
      });

      if (!merchant) {
        res.status(401).json({ error: 'Merchant not found' });
        return;
      }

      req.merchant = merchant;
      return next();
    }

    res.status(401).json({ error: 'Authentication required (Bearer Token or X-API-KEY)' });
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired authentication credentials' });
  }
};