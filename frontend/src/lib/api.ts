const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export const fetchDashboardMetrics = async (token: string) => {
  const res = await fetch(`${BASE_URL}/v1/merchant/analytics`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
};

export const createSimulatedPayment = async (apiKey: string, payload: any) => {
  const res = await fetch(`${BASE_URL}/v1/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey,
      'Idempotency-Key': `idemp_${Date.now()}`,
    },
    body: JSON.stringify(payload),
  });
  return res.json();
};