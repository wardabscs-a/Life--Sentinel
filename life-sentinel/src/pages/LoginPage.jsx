import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth, mapFirebaseError } from '../contexts/AuthContext';
import { Shield, LogIn, UserPlus, Mail, Lock, User, Eye, EyeOff, Loader2, ArrowLeft, KeyRound } from 'lucide-react';

export default function LoginPage() {
  const { t } = useLanguage();
  const { login, signup, resetPassword, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already logged in
  const from = location.state?.from?.pathname || '/dashboard';
  if (user) {
    navigate(from, { replace: true });
    return null;
  }

  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError(t('auth.fillAllFields'));
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(t(mapFirebaseError(err.code)));
    }
    setLoading(false);
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
      setError(t('auth.fillAllFields'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('auth.passwordMismatch'));
      return;
    }
    if (password.length < 6) {
      setError(t('auth.weakPassword'));
      return;
    }
    setLoading(true);
    try {
      await signup(email.trim(), password, fullName.trim());
      navigate(from, { replace: true });
    } catch (err) {
      setError(t(mapFirebaseError(err.code)));
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!email.trim()) {
      setError(t('auth.enterEmail'));
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email.trim());
      setSuccess(t('auth.resetSent'));
    } catch (err) {
      setError(t(mapFirebaseError(err.code)));
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--color-bg)' }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-sentinel-500 to-sentinel-700 flex items-center justify-center mb-4">
            <Shield className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Life Sentinel</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>{t('sidebar.tagline')}</p>
        </div>

        {/* Card */}
        <div className="card p-6 sm:p-8">
          {/* Mode tabs */}
          {mode !== 'forgot' && (
            <div className="flex gap-1 p-1 rounded-xl mb-6" style={{ background: 'var(--color-bg-secondary)' }}>
              <button
                onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  mode === 'login' ? 'bg-sentinel-500 text-white shadow-sm' : ''
                }`}
                style={mode !== 'login' ? { color: 'var(--color-text-secondary)' } : {}}
              >
                <LogIn className="w-4 h-4" />
                {t('auth.login')}
              </button>
              <button
                onClick={() => { setMode('signup'); setError(''); setSuccess(''); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  mode === 'signup' ? 'bg-sentinel-500 text-white shadow-sm' : ''
                }`}
                style={mode !== 'signup' ? { color: 'var(--color-text-secondary)' } : {}}
              >
                <UserPlus className="w-4 h-4" />
                {t('auth.signUp')}
              </button>
            </div>
          )}

          {/* Back button for forgot password mode */}
          {mode === 'forgot' && (
            <button
              onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
              className="flex items-center gap-2 text-sm font-medium mb-4"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <ArrowLeft className="w-4 h-4" />
              {t('common.back')}
            </button>
          )}

          {/* Error message */}
          {error && (
            <div className="p-3 rounded-lg mb-4 text-sm font-medium bg-emergency-50 dark:bg-emergency-900/10 text-emergency-700 dark:text-emergency-400 border border-emergency-200 dark:border-emergency-800">
              {error}
            </div>
          )}

          {/* Success message */}
          {success && (
            <div className="p-3 rounded-lg mb-4 text-sm font-medium bg-safe-50 dark:bg-safe-900/10 text-safe-700 dark:text-safe-400 border border-safe-200 dark:border-safe-800">
              {success}
            </div>
          )}

          {/* ===== LOGIN FORM ===== */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <h2 className="font-bold text-lg mb-2" style={{ color: 'var(--color-text)' }}>{t('auth.login')}</h2>

              <div>
                <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>{t('auth.email')}</label>
                <div className="relative">
                  <Mail className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
                  <input
                    className="input-field ps-10"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>{t('auth.password')}</label>
                <div className="relative">
                  <Lock className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
                  <input
                    className="input-field ps-10 pe-10"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute end-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => { setMode('forgot'); setError(''); setSuccess(''); }}
                  className="text-xs font-medium text-sentinel-600 hover:underline"
                >
                  {t('auth.forgotPassword')}
                </button>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                {loading ? t('common.loading') : t('auth.login')}
              </button>
            </form>
          )}

          {/* ===== SIGNUP FORM ===== */}
          {mode === 'signup' && (
            <form onSubmit={handleSignup} className="space-y-4">
              <h2 className="font-bold text-lg mb-2" style={{ color: 'var(--color-text)' }}>{t('auth.signUp')}</h2>

              <div>
                <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>{t('auth.fullName')}</label>
                <div className="relative">
                  <User className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
                  <input
                    className="input-field ps-10"
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder={t('auth.fullNamePlaceholder')}
                    autoComplete="name"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>{t('auth.email')}</label>
                <div className="relative">
                  <Mail className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
                  <input
                    className="input-field ps-10"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>{t('auth.password')}</label>
                <div className="relative">
                  <Lock className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
                  <input
                    className="input-field ps-10 pe-10"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute end-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>{t('auth.confirmPassword')}</label>
                <div className="relative">
                  <Lock className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
                  <input
                    className="input-field ps-10"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                {loading ? t('common.loading') : t('auth.signUp')}
              </button>
            </form>
          )}

          {/* ===== FORGOT PASSWORD FORM ===== */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <KeyRound className="w-6 h-6 text-sentinel-500" />
                <h2 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>{t('auth.forgotPassword')}</h2>
              </div>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{t('auth.forgotDesc')}</p>

              <div>
                <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>{t('auth.email')}</label>
                <div className="relative">
                  <Mail className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
                  <input
                    className="input-field ps-10"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    autoComplete="email"
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                {loading ? t('common.loading') : t('auth.sendReset')}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-xs text-center mt-6" style={{ color: 'var(--color-text-secondary)' }}>
          {t('common.disclaimer')}
        </p>
      </div>
    </div>
  );
}
