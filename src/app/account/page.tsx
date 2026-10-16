import type { Metadata } from 'next';
import { AccountView } from '@/views/account/AccountView';

export const metadata: Metadata = { title: 'Account · Wildwatch NTU' };

export default function Page() {
  return <AccountView />;
}
