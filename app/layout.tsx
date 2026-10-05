import type { Metadata } from 'next';
import { Hind_Siliguri, Instrument_Serif, JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const sans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});
const serif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-serif',
});
const bangla = Hind_Siliguri({
  subsets: ['bengali', 'latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-bangla',
});
const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-mono',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ecomate.app'),
  title: 'EcoMate — Your Entire E-commerce Operation, Managed From One Place',
  description:
    'EcoMate is the complete operating platform for scaling e-commerce businesses. Unify online stores, showrooms, inventory, smart packing, couriers, finance, and marketing.',
  // Ported from the Vite index.html head so the App Router shell carries the
  // same share-card meta the prototype shipped.
  openGraph: {
    title: 'EcoMate — Your Entire E-commerce Operation, Managed From One Place',
    description:
      'Manage orders, multi-warehouse inventory, smart barcode packing, couriers, POS showrooms, double-entry finance and marketing from one central control center.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
  },
  other: {
    'theme-color': '#F2F3F9',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`scroll-smooth ${sans.variable} ${serif.variable} ${bangla.variable} ${mono.variable}`}
    >
      <body className="bg-[#F2F3F9] text-slate-900 antialiased selection:bg-indigo-600 selection:text-white dark:bg-[#07080E] dark:text-slate-100">
        {children}
      </body>
    </html>
  );
}
