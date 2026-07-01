'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@trade/ui';
import { useTranslations, useLocale } from 'next-intl';
import TurnstileWidget from '@/components/TurnstileWidget';

export default function RegisterPage() {
  const { register } = useAuth();
  const t = useTranslations('Auth');
  const locale = useLocale();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
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
      await register(email, password, name || undefined, turnstileToken);
      window.location.href = `/${locale}/c/me`;
    } catch (err: any) {
      setError(err.message || t('errorExists'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-ice flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <h1 className="text-2xl font-bold text-primary-navy text-center mb-6">{t('register')}</h1>

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
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
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
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
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
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
              placeholder={t('passwordMinHint')}
            />
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
              {locale.startsWith('zh') ? '请先同意隐私政策' : 'Please agree to the Privacy Policy'}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !turnstileToken}
            className="w-full bg-primary-navy hover:bg-primary-navy/90 text-white font-semibold py-2.5 rounded-md transition-all disabled:opacity-50"
          >
            {loading ? t('creatingAccount') : t('registerBtn')}
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
          {t('hasAccount')}{' '}
          <a href={`/${locale}/c/login`} className="text-gold hover:underline font-medium">
            {t('signIn')}
          </a>
        </p>


      </div>
    </div>
  );
}
