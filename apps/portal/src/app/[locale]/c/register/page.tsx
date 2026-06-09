'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@trade/ui';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import TurnstileWidget from '@/components/TurnstileWidget';

export default function RegisterPage() {
  const { register } = useAuth();
  const t = useTranslations('Auth');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileKey = useRef(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!turnstileToken) {
      setError('Please complete the security check.');
      return;
    }

    setLoading(true);
    try {
      await register(email, password, name || undefined);
      window.location.href = './dashboard';
    } catch (err: any) {
      setError(err.message || t('errorExists'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6F9] flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <h1 className="text-2xl font-bold text-[#1B365D] text-center mb-6">{t('register')}</h1>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md mb-4">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('name')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
              placeholder={t('namePlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('email')}</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
              placeholder={t('emailPlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('password')}</label>
            <input
              type="password"
              required
              minLength={5}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
              placeholder={t('passwordMinHint')}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !turnstileToken}
            className="w-full bg-[#1B365D] hover:bg-[#1B365D]/90 text-white font-semibold py-2.5 rounded-md transition-all disabled:opacity-50"
          >
            {loading ? t('creatingAccount') : t('registerBtn')}
          </button>

          <div className="mt-3">
            <TurnstileWidget
              key={turnstileKey.current}
              onVerify={(token) => setTurnstileToken(token)}
              onError={() => {
                setTurnstileToken(null);
                setError('Security check failed. Please try again.');
              }}
              onExpire={() => {
                setTurnstileToken(null);
                turnstileKey.current++;
              }}
            />
          </div>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          {t('hasAccount')}{' '}
          <Link href="./login" className="text-[#D4AF37] hover:underline font-medium">
            {t('signIn')}
          </Link>
        </p>
      </div>
    </div>
  );
}
