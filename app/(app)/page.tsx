import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { DashboardGestorClient } from '@/components/canteiro/dashboard-gestor';
import { DashboardInvestidorClient } from '@/components/canteiro/dashboard-investidor';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const role = (session.user as any)?.role;
  if (role === 'INVESTIDOR') return <DashboardInvestidorClient />;
  return <DashboardGestorClient />;
}
