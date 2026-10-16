import type { Metadata } from 'next';
import { ReportView } from '@/views/ReportView';

export const metadata: Metadata = { title: 'Report · Wildwatch NTU' };

export default function Page() {
  return <ReportView />;
}
