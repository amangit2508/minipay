'use client';

import React, { useEffect, useState } from 'react';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [amount, setAmount] = useState('500');
  const [payMethod, setPayMethod] = useState<'UPI' | 'BANK_TRANSFER'>('UPI');
  
  // Mobile / Bank state
  const [phone, setPhone] = useState('');
  const [vpa, setVpa] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [ifsc, setIfsc] = useState('');

  // Persistent Auth State
  const [apiKey, setApiKey] = useState('');
  const [token, setToken] = useState('');
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const [paymentResult, setPaymentResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');

  // Load session from localStorage on page refresh
  useEffect(() => {
    const savedToken = localStorage.getItem('minipay_token');
    const savedApiKey = localStorage.getItem('minipay_api_key');

    if (savedToken && savedApiKey) {
      setToken(savedToken);
      setApiKey(savedApiKey);
      loadAnalytics(savedToken);
    }
    setIsCheckingAuth(false);
  }, []);

  const handleRegisterOrLogin = async (type: 'register' | 'login') => {
    if (!loginEmail || !loginPass) {
      alert('Please enter email and password.');
      return;
    }

    try {
      const res = await fetch(`${BASE_URL}/auth/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPass, name: 'Acme India Pvt Ltd' }),
      });
      const data = await res.json();
      if (data.token) {
        // Save session in localStorage
        localStorage.setItem('minipay_token', data.token);
        localStorage.setItem('minipay_api_key', data.merchant.apiKey);

        setToken(data.token);
        setApiKey(data.merchant.apiKey);
        loadAnalytics(data.token);
      } else {
        alert(data.error || JSON.stringify(data));
      }
    } catch (err: any) {
      alert('Failed to connect to backend: ' + err.message);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('minipay_token');
    localStorage.removeItem('minipay_api_key');
    setToken('');
    setApiKey('');
    setLoginEmail('');
    setLoginPass('');
    setPaymentResult(null);
  };

  const loadAnalytics = async (authToken: string) => {
    try {
      const res = await fetch(`${BASE_URL}/v1/merchant/analytics`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      setMetrics(data);
    } catch (e) {
      console.error('Failed to load metrics', e);
    }
  };

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setPaymentResult(null);

    const payload: any = {
      amount: parseFloat(amount),
      currency: 'INR',
      paymentMethod: payMethod,
      description: payMethod === 'UPI' ? 'UPI Mobile Checkout' : 'Direct Account IMPS Transfer',
    };

    if (payMethod === 'UPI') {
      payload.customerPhone = phone || '9876543210';
      payload.vpa = vpa || `${payload.customerPhone}@upi`;
    } else {
      payload.bankAccount = bankAccount || '912345678901';
      payload.ifscCode = ifsc || 'HDFC0000240';
      payload.customerPhone = phone || '9876543210';
    }

    try {
      const res = await fetch(`${BASE_URL}/v1/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': apiKey,
          'Idempotency-Key': `idemp_${Date.now()}`,
        },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      setPaymentResult(result);
      if (token) loadAnalytics(token);
    } catch (err: any) {
      setPaymentResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Prevent UI flickering while checking localStorage
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center">
        <p className="text-sm animate-pulse">Loading MiniPay Gateway Session...</p>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-xl shadow-xl space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight">MiniPay Gateway</h2>
            <p className="text-xs text-slate-400 mt-1">UPI & Bank Direct Settlement Portal</p>
          </div>

          <form onSubmit={(e) => e.preventDefault()} autoComplete="off" className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Merchant Email</label>
              <input
                type="email"
                name="merchant_sec_email"
                autoComplete="off"
                placeholder="merchant@example.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
              <input
                type="password"
                name="merchant_sec_password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleRegisterOrLogin('register')}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 py-2.5 rounded-lg text-sm font-medium transition"
              >
                Register
              </button>
              <button
                type="button"
                onClick={() => handleRegisterOrLogin('login')}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-lg text-sm font-medium transition"
              >
                Sign In
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">MiniPay Gateway Dashboard</h1>
            <p className="text-sm text-slate-400 mt-1">
              API Key:{' '}
              <code className="bg-slate-900 px-2 py-0.5 rounded text-amber-300 border border-slate-800 font-mono text-xs">
                {apiKey}
              </code>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-950 text-emerald-400 border border-emerald-800">
              ● UPI & Account Transfer Live (₹)
            </span>
            <button
              onClick={handleSignOut}
              className="text-xs text-slate-400 hover:text-white bg-slate-900 border border-slate-800 px-3 py-1 rounded-lg transition hover:border-red-500/50 hover:text-red-400"
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Gross Volume</p>
            <h2 className="text-2xl font-bold mt-2">
              ₹{Number(metrics?.grossVolume || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </h2>
            <p className="text-xs text-slate-500 mt-1">Processed Volume</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Net Settlement</p>
            <h2 className="text-2xl font-bold mt-2 text-emerald-400">
              ₹{Number(metrics?.netVolume || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </h2>
            <p className="text-xs text-slate-500 mt-1">Direct account settlement</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Success Rate</p>
            <h2 className="text-2xl font-bold mt-2">{metrics?.successRate ?? 0}%</h2>
            <p className="text-xs text-slate-500 mt-1">
              {metrics?.succeededPayments || 0} / {metrics?.totalPayments || 0} Successful
            </p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Gateway Fees</p>
            <h2 className="text-2xl font-bold mt-2 text-amber-400">
              ₹{Number(metrics?.totalFees || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </h2>
            <p className="text-xs text-slate-500 mt-1">Platform Revenue</p>
          </div>
        </div>

        {/* Live Simulator */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Pay Direct to Account / UPI</h3>
              <p className="text-xs text-slate-400 mt-1">
                Route funds directly by Mobile Number, UPI VPA, or Bank Account.
              </p>
            </div>

            {/* Payment Method Selector */}
            <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setPayMethod('UPI')}
                className={`flex-1 py-1.5 rounded text-xs font-semibold transition ${
                  payMethod === 'UPI' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                📱 Mobile / UPI ID
              </button>
              <button
                type="button"
                onClick={() => setPayMethod('BANK_TRANSFER')}
                className={`flex-1 py-1.5 rounded text-xs font-semibold transition ${
                  payMethod === 'BANK_TRANSFER' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                🏦 Bank A/C + IFSC
              </button>
            </div>

            <form onSubmit={handleCreatePayment} autoComplete="off" className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Amount (INR ₹)</label>
                <input
                  type="number"
                  placeholder="500"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              {payMethod === 'UPI' ? (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Customer Mobile Number</label>
                    <input
                      type="tel"
                      placeholder="9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">UPI VPA / ID (Optional)</label>
                    <input
                      type="text"
                      placeholder="9876543210@upi"
                      value={vpa}
                      onChange={(e) => setVpa(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Beneficiary Bank Account Number</label>
                    <input
                      type="text"
                      placeholder="912345678901"
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Bank IFSC Code</label>
                    <input
                      type="text"
                      placeholder="HDFC0000240"
                      value={ifsc}
                      onChange={(e) => setIfsc(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white placeholder:text-slate-600 uppercase focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-lg text-sm transition disabled:opacity-50"
              >
                {loading
                  ? 'Initiating Direct Transfer...'
                  : payMethod === 'UPI'
                  ? `Pay ₹${amount || 0} to Mobile / UPI`
                  : `Transfer ₹${amount || 0} to Bank A/C`}
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-xl flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-1">Direct Settlement Response</h3>
              <p className="text-xs text-slate-400 mb-4">
                Real-time output showing routed VPA, Bank Account, and Transaction Status.
              </p>
              <pre className="bg-slate-950 border border-slate-800 rounded-lg p-4 text-xs font-mono text-emerald-400 overflow-x-auto h-60">
                {paymentResult
                  ? JSON.stringify(paymentResult, null, 2)
                  : '// Select UPI or Bank Account and click transfer'}
              </pre>
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-slate-400 mt-4 border-t border-slate-800 pt-4">
              <span>● Rails: <strong>UPI 2.0 / IMPS</strong></span>
              <span>● Routing: <strong>Phone & Account Direct</strong></span>
              <span>● Idempotency Lock: <strong>Active</strong></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}