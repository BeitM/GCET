'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useTranslation } from '@/hooks/useTranslation';

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();

  const role = searchParams.get('role');
  const roleLabel = role === 'student' ? t('student') : role === 'coach' ? t('coach') : undefined;

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!role || !roleLabel) {
    return (
      <div className="app-shell flex flex-col items-center justify-center px-4 py-8 text-center">
        <div className="absolute right-4 top-4"><LanguageSwitcher /></div>
        <p className="mb-6 text-gray-300">{t('chooseRole')}</p>
        <button
          onClick={() => router.push('/')}
          className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-all hover:bg-blue-500"
        >
          ← {t('backToHome')}
        </button>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError(t('fillAllFields'));
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(t('validEmail'));
      return;
    }

    if (password.length < 6) {
      setError(t('passwordLength'));
      return;
    }

    if (mode === 'signup' && password !== confirmPassword) {
      setError(t('passwordsMismatch'));
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.push(`/${role}`);
    }, 800);
  };

  const inputClassName = loading
    ? 'w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white placeholder-gray-500 opacity-50 cursor-not-allowed focus:outline-none focus:ring-1 transition-all'
    : 'w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all';

  const buttonClassName = loading
    ? 'w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600/50 px-6 py-3 font-semibold text-white transition-all duration-300 cursor-not-allowed'
    : 'w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-3 font-semibold text-white transition-all duration-300 hover:from-blue-500 hover:to-blue-400';

  return (
    <div className="app-shell flex flex-col items-center justify-center px-4 py-8">
      <div className="absolute right-4 top-4"><LanguageSwitcher /></div>
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-4xl font-bold text-white sm:text-5xl">{t('aiRoboticsTrainer')}</h1>
          <p className="text-gray-400">
            {mode === 'signin' ? t('signInAs', { role: roleLabel }) : t('signUpAs', { role: roleLabel })}
          </p>
        </div>

        <div className="group relative">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-600/10 to-purple-600/10 opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100"></div>

          <div className="glass-card relative p-8">
            <div className="mb-6 grid grid-cols-2 gap-2 rounded-lg border border-gray-700 bg-gray-900 p-1">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setError('');
                }}
                className={`rounded-md py-2 text-sm font-semibold transition-all ${
                  mode === 'signin' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                {t('signIn')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setError('');
                }}
                className={`rounded-md py-2 text-sm font-semibold transition-all ${
                  mode === 'signup' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                {t('signUp')}
              </button>
            </div>

            {error && (
              <div className="mb-6 rounded-lg border border-red-500/50 bg-red-500/10 p-4">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="mb-2 block font-medium text-white">{t('emailAddress')}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={loading}
                  className={inputClassName}
                />
              </div>

              <div>
                <label className="mb-2 block font-medium text-white">{t('password')}</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  className={inputClassName}
                />
              </div>

              {mode === 'signup' && (
                <div>
                  <label className="mb-2 block font-medium text-white">{t('confirmPassword')}</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={loading}
                    className={inputClassName}
                  />
                </div>
              )}

              <button type="submit" disabled={loading} className={buttonClassName}>
                {loading ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                    {mode === 'signin' ? t('signingIn') : t('signingUp')}
                  </>
                ) : mode === 'signin' ? (
                  t('signIn')
                ) : (
                  t('signUp')
                )}
              </button>
            </form>

            {mode === 'signin' && (
              <div className="mt-6 border-t border-gray-700 pt-6">
                <p className="mb-3 text-xs text-gray-400">{t('demoCredentials')}</p>
                <p className="mb-1 text-xs text-gray-500"><span className="text-gray-400">{t('email')}</span> demo@robotics.com</p>
                <p className="text-xs text-gray-500"><span className="text-gray-400">{t('password')}:</span> password123</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={() => router.push('/')}
            className="text-sm font-medium text-gray-400 transition-colors hover:text-gray-300"
          >
            ← {t('backToRoleSelection')}
          </button>
        </div>
      </div>
    </div>
  );
}
