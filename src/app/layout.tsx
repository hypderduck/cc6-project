import type { Metadata, Viewport } from 'next';
import { Fraunces, Public_Sans } from 'next/font/google';
import { StoreProvider } from '@/store/StoreProvider';
import { UIProvider } from '@/components/UIProvider';
import { Shell } from '@/components/Shell';
import './globals.css';

const fraunces = Fraunces({ variable: '--font-fraunces', subsets: ['latin'] });
const publicSans = Public_Sans({ variable: '--font-public-sans', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Wildwatch NTU',
  description: "Report wildlife on campus roads in 30 seconds; see where it's dangerous; give NTU the evidence to fix it.",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#182b21',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${publicSans.variable}`}>
      <body>
        <StoreProvider>
          <UIProvider>
            <Shell>{children}</Shell>
          </UIProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
