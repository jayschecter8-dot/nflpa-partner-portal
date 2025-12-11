import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import AdminDashboard from '@/components/dashboard/AdminDashboard';
import PartnerDashboard from '@/components/dashboard/PartnerDashboard';

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  if (session.user.isAdmin) {
    return <AdminDashboard user={session.user} />;
  }

  return <PartnerDashboard user={session.user} />;
}
