import type { Metadata } from 'next';
import { Fraunces, Outfit } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';

const sans = Outfit({
  subsets: ['latin'],
  variable: '--font-sans',
});

const serif = Fraunces({
  subsets: ['latin'],
  variable: '--font-serif',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://payflow.in'),
  title: {
    default: 'PayFlow — Get paid. Without chasing clients.',
    template: '%s · PayFlow',
  },
  description:
    'Create professional invoices, send payment links, track outstanding payments, and get paid faster.',
  keywords: [
    'invoice software India',
    'UPI payment link for freelancers',
    'GST invoice generator',
    'outstanding tracking',
    'PayFlow',
  ],
  openGraph: {
    type: 'website',
    siteName: 'PayFlow',
    title: 'PayFlow — Get paid. Without chasing clients.',
    description:
      'Create professional invoices, send payment links, track outstanding payments, and get paid faster. Made for Indian freelancers and agencies.',
  },
  twitter: {
    card: 'summary',
    title: 'PayFlow — Get paid. Without chasing clients.',
    description:
      'Create professional invoices, send payment links, track outstanding payments, and get paid faster.',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${serif.variable}`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

