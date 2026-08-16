import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes';
import './queues/webhook.worker'; // Boot webhook worker

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`MiniPay Gateway Engine running on port ${PORT}`);
});