import type { Metadata } from 'next';
import { GuideView } from '@/views/GuideView';

export const metadata: Metadata = { title: 'Guide · Wildwatch NTU' };

export default function Page() {
  return <GuideView />;
}
