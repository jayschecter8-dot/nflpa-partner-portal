'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password');
      } else {
        router.push('/');
        router.refresh();
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-900 to-slate-800 flex items-center justify-center p-5">
      <div className="bg-white rounded-2xl p-10 w-full max-w-md shadow-2xl">
        <div className="text-center mb-8">
          {/* Logo */}
          <svg viewBox="0 0 32 32" className="w-12 h-12 mx-auto mb-4">
            <ellipse cx="16" cy="16" rx="14" ry="9" fill="none" stroke="#C9243F" strokeWidth="2.5" />
            <path d="M16 7 L16 25" stroke="#C9243F" strokeWidth="1.5" />
          </svg>
          <h1 className="text-2xl font-bold text-navy-900">NFLPA Partner Portal</h1>
          <p className="text-slate-500 text-sm mt-2">Sign in to access your dashboard</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="you@company.com"
              disabled={isLoading}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
              disabled={isLoading}
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn btn-primary py-3 mt-2"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="spinner w-4 h-4" />
                Signing in...
              </span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="mt-6 p-4 bg-slate-50 rounded-lg text-center">
          <p className="text-xs text-slate-500">Demo Credentials:</p>
          <p className="text-sm font-medium text-slate-700 mt-1">admin@nflpa.com / admin123</p>
        </div>
      </div>
    </div>
  );
}
