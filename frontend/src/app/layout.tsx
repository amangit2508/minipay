import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'MiniPay Gateway',
  description: 'Scalable Payment Gateway Merchant Dashboard',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body className="bg-slate-950 text-slate-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}