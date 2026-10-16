import type { Metadata } from 'next';
import { NewsView } from '@/views/NewsView';

export const metadata: Metadata = { title: 'News · Wildwatch NTU' };

export default function Page() {
  return <NewsView />;
}
