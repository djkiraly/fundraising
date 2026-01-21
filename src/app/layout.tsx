import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { getBrandingConfig } from '@/lib/config';

const inter = Inter({ subsets: ['latin'] });

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBrandingConfig();

  return {
    title: branding.siteTitle,
    description: branding.siteDescription,
    keywords: ['fundraising', 'volleyball', 'donation', 'charity'],
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
