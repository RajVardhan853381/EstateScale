'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { registerAndAcceptInviteAction } from '@/lib/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, Loader2, Sparkles, CheckCircle2, ShieldCheck, User, Lock, Mail } from 'lucide-react';
import Link from 'next/link';

interface InviteRegistrationFormProps {
  token: string;
  email: string;
  orgName: string;
  role: string;
}

export function InviteRegistrationForm({
  token,
  email,
  orgName,
  role,
}: InviteRegistrationFormProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide your full name.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError(null);

    const res = await registerAndAcceptInviteAction(token, {
      name: name.trim(),
      password,
      confirmPassword,
    });

    setLoading(false);

    if (res.success) {
      setRegistered(true);
      setTimeout(() => {
        router.push(`/login?registered=true&email=${encodeURIComponent(email)}`);
      }, 1500);
    } else {
      setError(res.error || 'Failed to complete registration.');
    }
  };

  if (registered) {
    return (
      <div className="text-center py-6 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">Account Created Successfully!</h3>
        <p className="text-xs text-slate-500 max-w-xs mx-auto">
          Your credentials are saved. Redirecting to workspace sign in...
        </p>
        <Link
          href={`/login?registered=true&email=${encodeURIComponent(email)}`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors"
        >
          Sign In Now &rarr;
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left">
      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
          {error}
        </div>
      )}

      {/* Target Org & Role Badge */}
      <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
        <span className="text-slate-500 font-medium">Workspace: <strong className="text-slate-800">{orgName}</strong></span>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wider">
          {role}
        </span>
      </div>

      {/* Email (Readonly) */}
      <div>
        <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
          <Mail className="w-3.5 h-3.5 text-slate-400" />
          Invited Email Address
        </label>
        <Input
          type="email"
          value={email}
          disabled
          className="bg-slate-50 text-slate-500 border-slate-200 text-xs rounded-xl cursor-not-allowed h-10"
        />
      </div>

      {/* Full Name */}
      <div>
        <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-slate-400" />
          Full Name
        </label>
        <Input
          type="text"
          required
          placeholder="e.g. Eleanor Vance"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border-slate-200 focus:border-indigo-500 text-xs rounded-xl h-10"
        />
      </div>

      {/* Password */}
      <div>
        <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-slate-400" />
          Set Secure Password
        </label>
        <div className="relative">
          <Input
            type={showPassword ? 'text' : 'password'}
            required
            placeholder="Minimum 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border-slate-200 focus:border-indigo-500 text-xs rounded-xl pr-10 h-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Confirm Password */}
      <div>
        <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
          Confirm Password
        </label>
        <Input
          type={showPassword ? 'text' : 'password'}
          required
          placeholder="Re-enter password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="border-slate-200 focus:border-indigo-500 text-xs rounded-xl h-10"
        />
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-10 rounded-xl shadow-xs shadow-indigo-500/20 gap-2 cursor-pointer mt-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Setting up account...</span>
          </>
        ) : (
          <>
            <Sparkles className="w-3.5 h-3.5" />
            <span>Activate Account &amp; Join {orgName}</span>
          </>
        )}
      </Button>
    </form>
  );
}
