# MiniPay

MiniPay is a full-stack simulated payment gateway built with a merchant dashboard, REST APIs, payment processing, idempotency protection, webhook delivery, HMAC-SHA256 signatures, and background job processing.

## Features

* Merchant registration and authentication
* Merchant dashboard with payment analytics
* Live API key generation
* Simulated payment processing
* Payment status tracking
* Idempotency protection to prevent duplicate payments
* Webhook configuration
* `payment.succeeded` webhook events
* HMAC-SHA256 webhook signatures
* BullMQ background webhook processing
* Redis-backed job queue
* PostgreSQL database
* Prisma ORM
* Docker support
* REST API for payment operations

## Tech Stack

### Frontend

* Next.js
* React
* TypeScript

### Backend

* Node.js
* Express
* TypeScript
* Prisma
* PostgreSQL
* Redis
* BullMQ

### Infrastructure

* Docker
* Docker Compose

## Project Structure

```text
minipay/
├── backend/
│   ├── src/
│   ├── prisma/
│   ├── package.json
│   └── ...
├── frontend/
│   ├── app/
│   ├── components/
│   ├── package.json
│   └── ...
├── docker-compose.yml
├── .gitignore
└── README.md
```

## Requirements

Make sure you have installed:

* Node.js 18+
* npm or Yarn
* Docker Desktop
* PostgreSQL
* Redis

Docker can be used to run the required database and Redis services.

## Installation

Clone the repository:

```bash
git clone https://github.com/amangit2508/minipay.git
cd minipay
```

Install backend dependencies:

```bash
cd backend
npm install
```

Install frontend dependencies:

```bash
cd ../frontend
npm install
```

## Environment Variables

Create environment files locally.

### Backend

Create:

```text
backend/.env
```

Example:

```env
DATABASE_URL="your_database_url"
REDIS_URL="your_redis_url"
JWT_SECRET="your_jwt_secret"
PORT=4000
```

### Frontend

Create:

```text
frontend/.env.local
```

Example:

```env
NEXT_PUBLIC_API_URL="http://localhost:4000"
```

Never commit real API keys, database passwords, webhook secrets, JWT secrets, or other credentials to GitHub.

## Start Infrastructure

From the project root:

```bash
docker-compose up -d
```

Check running containers:

```bash
docker ps
```

## Database Setup

From the backend directory:

```bash
npx prisma generate
npx prisma migrate dev
```

If your project uses a different Prisma setup, use the migration command configured in the backend package scripts.

## Start Backend

Open a terminal:

```bash
cd backend
npm run dev
```

The backend runs on:

```text
http://localhost:4000
```

## Start Frontend

Open another terminal:

```bash
cd frontend
npm run dev
```

The frontend runs on:

```text
http://localhost:3000
```

Open the merchant dashboard at:

```text
http://localhost:3000
```

## API

### Create Payment

```http
POST /api/v1/payments
```

Headers:

```text
Content-Type: application/json
X-API-KEY: YOUR_MERCHANT_API_KEY
Idempotency-Key: UNIQUE_REQUEST_KEY
```

Example:

```bash
curl -X POST http://localhost:4000/api/v1/payments -H "Content-Type: application/json" -H "X-API-KEY: YOUR_MERCHANT_API_KEY" -H "Idempotency-Key: order_checkout_1001" -d "{\"amount\":99.50,\"currency\":\"USD\",\"customerEmail\":\"buyer@test.com\"}"
```

Example response:

```json
{
  "success": true,
  "payment": {
    "id": "payment-id",
    "amount": "99.5",
    "currency": "USD",
    "status": "SUCCEEDED",
    "customerEmail": "buyer@test.com"
  }
}
```

## Idempotency

MiniPay prevents duplicate payment creation when the same request is retried with the same `Idempotency-Key`.

For example:

```text
order_checkout_1001 → Payment A
order_checkout_1001 → Payment A
```

The second request returns the existing payment instead of creating another transaction.

A different key creates a new payment:

```text
order_checkout_1001 → Payment A
order_checkout_1002 → Payment B
```

## Webhooks

MiniPay supports webhook notifications for successful payments.

Configure a webhook URL:

```http
PUT /api/v1/merchant/settings
```

Example:

```bash
curl -X PUT http://localhost:4000/api/v1/merchant/settings -H "Content-Type: application/json" -H "X-API-KEY: YOUR_MERCHANT_API_KEY" -d "{\"webhookUrl\":\"YOUR_WEBHOOK_URL\"}"
```

When a payment succeeds, MiniPay sends a webhook event:

```json
{
  "id": "event-id",
  "type": "payment.succeeded",
  "data": {
    "id": "payment-id",
    "amount": "150",
    "currency": "USD",
    "status": "SUCCEEDED",
    "providerTxId": "provider-transaction-id",
    "customerEmail": "customer@example.com"
  },
  "createdAt": "timestamp"
}
```

## Webhook Security

MiniPay generates an HMAC-SHA256 signature for every webhook.

The signature is sent using:

```text
X-MiniPay-Signature
```

The signature is generated from the raw webhook payload and the merchant webhook secret.

Conceptually:

```text
HMAC-SHA256(
    raw webhook payload,
    webhook secret
)
```

This allows webhook consumers to verify that requests originated from MiniPay and that the payload was not modified.

## Background Webhook Processing

Webhook delivery is handled asynchronously using BullMQ and Redis.

```text
Payment
   ↓
Webhook Job
   ↓
BullMQ Queue
   ↓
Webhook Worker
   ↓
HMAC-SHA256 Signature
   ↓
Merchant Webhook URL
```

Failed webhook deliveries can be retried using BullMQ's retry and backoff mechanism.

## Testing

### Payment Test

Create a payment through the Merchant Dashboard or API.

Verify:

* Payment is created
* Status is `SUCCEEDED`
* Payment ID is returned
* Provider transaction ID is generated

### Idempotency Test

Send the same request twice using the same idempotency key.

Expected result:

```text
First request  → New payment
Second request → Same payment
```

### Webhook Test

1. Create a webhook endpoint using a service such as webhook.site.
2. Configure the URL in MiniPay.
3. Create a new payment.
4. Open the webhook endpoint.
5. Verify that `payment.succeeded` is received.
6. Verify the `X-MiniPay-Signature` header.

## Security

The following files and credentials must never be committed:

```text
.env
.env.local
node_modules/
```

The repository uses `.gitignore` to prevent these files from being tracked.

Use `.env.example` for documenting required environment variables without exposing real credentials.

If a secret is accidentally pushed to a public repository:

1. Immediately rotate or revoke the secret.
2. Remove the secret from Git history.
3. Update the local environment with the new credential.
4. Force-push the cleaned history when appropriate.
5. Verify GitHub secret scanning again.

## Development

Backend:

```bash
cd backend
npm run dev
```

Frontend:

```bash
cd frontend
npm run dev
```

Infrastructure:

```bash
docker-compose up -d
```

## Project Highlights

MiniPay demonstrates several important payment gateway concepts:

* RESTful payment APIs
* API-key authentication
* Payment transaction processing
* Idempotent API design
* Webhook architecture
* HMAC-based webhook security
* Asynchronous job processing
* Redis queues
* Database persistence
* Merchant analytics
* Dockerized development infrastructure

## License

This project is intended for educational and demonstration purposes.
