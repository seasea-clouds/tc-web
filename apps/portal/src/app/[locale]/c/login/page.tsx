'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@trade/ui';
import { useTranslations, useLocale } from 'next-intl';
import TurnstileWidget from '@/components/TurnstileWidget';

export default function LoginPage() {
  const { login } = useAuth();
  const t = useTranslations('Auth');
  const locale = useLocale();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileKey = useRef(0);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [privacyError, setPrivacyError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setPrivacyError(false);

    if (!agreedToPrivacy) {
      setPrivacyError(true);
      return;
    }

    if (!turnstileToken) {
      setError(t('securityCheck'));
      return;
    }

    setLoading(true);
    try {
      await login(email, password, rememberMe, turnstileToken);
      window.location.href = `/${locale}/c/me`;
    } catch (err: any) {
      setError(err.message || t('errorInvalid'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-ice flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <h1 className="text-2xl font-bold text-primary-navy text-center mb-6">{t('signIn')}</h1>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md mb-4">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('email')}</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
              placeholder={t('emailPlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('password')}</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
              placeholder={t('passwordPlaceholder')}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="remember"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="rounded border-gray-300"
            />
            <label htmlFor="remember" className="text-sm text-gray-600">{t('rememberMe')}</label>
          </div>

          {/* Privacy agreement checkbox */}
          <div className={`flex items-start gap-2 p-3 rounded-md border ${privacyError ? 'border-red-300 bg-red-50' : 'border-gray-100'}`}>
            <input
              type="checkbox"
              id="agree-privacy"
              checked={agreedToPrivacy}
              onChange={(e) => { setAgreedToPrivacy(e.target.checked); setPrivacyError(false); }}
              className="mt-0.5 rounded border-gray-300"
            />
            <label htmlFor="agree-privacy" className="text-sm text-gray-600">
              {t('agreeToPrivacy')}{' '}
              <a href={`https://sinotradecompliance.com/${locale}/privacy`} target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">
                {t('privacyPolicy')}
              </a>
            </label>
          </div>
          {privacyError && (
            <p className="text-sm text-red-500">
              {t('agreeToPrivacyError')}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !turnstileToken}
            className="w-full bg-primary-navy hover:bg-primary-navy/90 text-white font-semibold py-2.5 rounded-md transition-all disabled:opacity-50"
          >
            {loading ? t('signingIn') : t('signInBtn')}
          </button>

          <div className="mt-3">
            <TurnstileWidget
              key={turnstileKey.current}
              onVerify={(token) => setTurnstileToken(token)}
              onError={() => {
                setTurnstileToken(null);
                setError(t('securityCheckFailed'));
              }}
              onExpire={() => {
                setTurnstileToken(null);
                turnstileKey.current++;
              }}
            />
          </div>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          {t('noAccount')}{' '}
          <a href={`/${locale}/c/register`} className="text-gold hover:underline font-medium">
            {t('register')}
          </a>
        </p>


      </div>
    </div>
  );
}
