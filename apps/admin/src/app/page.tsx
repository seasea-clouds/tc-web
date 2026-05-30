import Link from "next/link";

export default function AdminPage() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-6 max-w-md mx-auto px-4">
        <div className="w-20 h-20 bg-primary-navy/10 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-10 h-10 text-primary-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-primary-navy">Admin Panel</h1>
        <p className="text-gray-500">Management dashboard — coming soon.</p>
        <div className="flex justify-center gap-3">
          <Link href="https://sinotradecompliance.com/en/" className="text-sm text-gray-400 hover:text-primary-navy transition-colors">
            &larr; Back to Site
          </Link>
        </div>
      </div>
    </main>
  );
}
