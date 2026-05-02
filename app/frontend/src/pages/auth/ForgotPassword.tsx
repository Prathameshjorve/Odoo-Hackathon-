import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Calendar, ArrowRight, KeyRound, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { authAPI } from '@/lib/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email');
      return;
    }
    setLoading(true);
    try {
      await authAPI.forgotPassword({ email });
      setSent(true);
      toast.success('Reset link sent to your email!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-50 via-white to-violet-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 relative overflow-hidden">
      <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-300 dark:bg-indigo-600 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-30 animate-pulse" />
      <div className="absolute bottom-20 right-10 w-72 h-72 bg-violet-300 dark:bg-violet-600 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '2s' }} />

      <div className="w-full max-w-md relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-xl">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-2xl bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
            Booksy
          </span>
        </Link>

        <div className="backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 rounded-2xl shadow-2xl border border-white/50 dark:border-slate-800 p-8">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
              <KeyRound className="w-7 h-7 text-white" />
            </div>
          </div>

          {!sent ? (
            <>
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Forgot password?</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Enter your email and we'll send a reset link</p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-11"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-medium shadow-lg"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Send reset link <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </Button>
              </form>
            </>
          ) : (
            <div className="text-center space-y-4">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Check your inbox</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                We've sent a password reset link to <span className="font-medium">{email}</span>
              </p>
              <div className="rounded-xl bg-indigo-50 dark:bg-indigo-500/10 p-4 text-sm text-slate-600 dark:text-slate-300">
                Didn't receive the email? Check your spam folder or try again in a minute.
              </div>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link to="/login" className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
              <ArrowLeft className="w-4 h-4" /> Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}