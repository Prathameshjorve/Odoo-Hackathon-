import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { authAPI } from '@/lib/api';
import { useAuth } from '@/hooks/useAuthContext';

export default function OtpVerify() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(45);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const email = sessionStorage.getItem('signupEmail') || '';

  useEffect(() => {
    if (!email) {
      navigate('/signup');
      return;
    }
    if (timer <= 0) return;
    const t = setTimeout(() => setTimer(timer - 1), 1000);
    return () => clearTimeout(t);
  }, [timer, email, navigate]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) {
      toast.error('Please enter the 6-digit code');
      return;
    }
    setLoading(true);
    try {
      const response = await authAPI.verifyOTP({ email, otp: code });
      const { user } = response.data.data;
      toast.success('Email verified successfully!');
      sessionStorage.removeItem('signupEmail');
      navigate('/login');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    try {
      await authAPI.resendOTP({ email });
      setTimer(45);
      setOtp(['', '', '', '', '', '']);
      toast.success('New code sent to your email');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to resend OTP');
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
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg">
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>
          </div>
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Verify your email</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              We sent a 6-digit code to <span className="font-medium">{email || 'your email'}</span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex justify-between gap-2">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => (inputRefs.current[i] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className="w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 transition-all"
                />
              ))}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-medium shadow-lg"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verifying...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Verify <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>

            <div className="text-center text-sm">
              {timer > 0 ? (
                <span className="text-slate-500 dark:text-slate-400">
                  Resend code in <span className="font-medium">{timer}s</span>
                </span>
              ) : (
                <button type="button" onClick={resend} className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                  Resend code
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}