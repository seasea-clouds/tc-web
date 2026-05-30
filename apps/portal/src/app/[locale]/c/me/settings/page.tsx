'use client';

import { useAuth } from '@/components/AuthProvider';
import Link from 'next/link';

export default function SettingsPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <Loading />;
  if (!user) return <NotLoggedIn />;

  return (
    <main className="min-h-screen bg-bg-ice py-12">
      <div className="max-w-3xl mx-auto px-4">
        <Link href="./" className="text-sm text-gray-500 hover:text-primary-navy transition-colors">&larr; Back to Account</Link>
        <h1 className="text-2xl font-bold text-primary-navy mt-4 mb-6">Settings</h1>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
          <div>
            <h2 className="font-semibold text-primary-navy mb-2">Profile</h2>
            <p className="text-sm text-gray-500">Name: {user.name}</p>
            <p className="text-sm text-gray-500">Email: {user.email}</p>
          </div>
          <div className="border-t pt-4">
            <p className="text-xs text-gray-400">More settings coming soon.</p>
          </div>
        </div>
      </div>
    </main>
  );
}

function Loading() {
  return <main className="min-h-screen bg-bg-ice py-16"><div className="text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold mx-auto" /></div></main>;
}

function NotLoggedIn() {
  return <main className="min-h-screen bg-bg-ice py-16"><div className="max-w-md mx-auto px-4 text-center"><h1 className="text-xl font-bold text-primary-navy mb-4">Please Log In</h1><Link href="../login" className="inline-block bg-gold hover:bg-gold/90 text-primary-navy font-semibold px-6 py-2.5 rounded-md transition-all">Log In</Link></div></main>;
}
