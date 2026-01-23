import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Navbar } from '@/components/ui/navbar';
import { AnalyticsDashboard } from '@/components/admin/analytics-dashboard';

export default async function AdminAnalyticsPage() {
  const session = await auth();

  if (!session || session.user.role !== 'admin') {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Analytics</h1>
        <AnalyticsDashboard />
      </main>
    </div>
  );
}
