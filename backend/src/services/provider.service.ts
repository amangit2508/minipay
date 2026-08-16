export interface ProviderPaymentResult {
  providerTxId: string;
  status: 'SUCCEEDED' | 'FAILED';
  errorMessage?: string;
}

export class MockPaymentProvider {
  // Simulates external provider API call (e.g. Stripe, Adyen)
  static async processPayment(
    amount: number,
    currency: string
  ): Promise<ProviderPaymentResult> {
    await new Promise((resolve) => setTimeout(resolve, 300)); // Network latency simulation

    // Simulate 95% success rate
    const isSuccess = Math.random() < 0.95;

    if (isSuccess) {
      return {
        providerTxId: `ch_mock_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        status: 'SUCCEEDED',
      };
    } else {
      return {
        providerTxId: `ch_mock_err_${Date.now()}`,
        status: 'FAILED',
        errorMessage: 'Insufficient funds or card declined',
      };
    }
  }
}