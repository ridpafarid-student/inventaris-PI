// ============================================
// PAGE - Login
// ============================================

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Loader2, Mail, Lock } from 'lucide-react';
import { getFirebaseAuthErrorMessage } from '@/lib/firebase-auth-errors';
import { Logo } from '@/components/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import ForgotPasswordDialog from '@/components/ForgotPasswordDialog';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [shake, setShake] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const emailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    emailInputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

        try {
      await login(email, password);
    } catch (err: any) {
      setError(getFirebaseAuthErrorMessage(err));
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setLoading(false);
    }
  };

      return (
        <div className={`flex min-h-screen bg-surface-base transition-opacity duration-700 ${
      mounted ? 'opacity-100' : 'opacity-0'
    }`}>
      {/* Left Panel - Branding */}
      <div 
        className="login-left-panel w-[45%] bg-surface-base flex flex-col justify-between p-12 border-r border-border-default relative overflow-hidden"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(128,128,128,0.15) 1.5px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
      >
                {/* Subtle background glow */}
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-[#c8352a]/10 rounded-full blur-[100px] pointer-events-none animate-pulse" />

                {/* Logo */}
        <div className="relative z-10">
          <Logo width={216} height={54} className="transition-all duration-700 hover:scale-105" />
        </div>

                {/* Center content */}
        <div className="relative z-10 my-auto py-12">
          <h2 className={`text-text-primary text-[32px] font-bold tracking-tight leading-tight mb-2 transition-all duration-700 ${
            mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
          }`}>
            Sistem Manajemen<br />Inventaris & Servis
          </h2>
          <div className={`w-12 h-1 bg-[#c8352a] rounded-full mb-6 transition-all duration-700 delay-100 ${
            mounted ? 'opacity-100 w-12' : 'opacity-0 w-0'
          }`} />
          <p className={`text-text-secondary text-sm leading-relaxed max-w-[320px] mb-10 transition-all duration-700 delay-200 ${
            mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
          }`}>
            Kelola stok barang, data servis, dan laporan operasional toko dalam satu platform terpusat.
          </p>

                    {/* Clean feature list with big numbers */}
          <div className="flex flex-col gap-6">
            {[
                            { no: '01', title: 'Manajemen Inventaris Barang', delay: 'delay-200' },
                              { no: '02', title: 'Monitoring Status Jasa Servis', delay: 'delay-300' },
                              { no: '03', title: 'Rekomendasi Restock Berdasarkan Ambang Batas Minimum Stok', delay: 'delay-500' },
            ].map((item) => (
              <div 
                key={item.no} 
                className={`flex items-baseline gap-4 transition-all duration-500 ${
                  mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
                } ${item.delay}`}
              >
                <span className="font-mono text-md font-bold text-[#c8352a] select-none">{item.no}</span>
                <span className="text-text-primary text-sm font-medium tracking-wide">{item.title}</span>
              </div>
            ))}
          </div>
        </div>

                {/* Bottom tagline */}
        <div className="relative z-10">
          <p className={`text-text-secondary/40 text-xs transition-all duration-700 delay-&lsqb;800ms&rsqb; ${
            mounted ? 'opacity-100' : 'opacity-0'
          }`}>
            © 2026 Mthree Computer · Sistem Internal
          </p>
        </div>
      </div>

            {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-surface-muted relative">
        <div className="absolute top-4 right-4 z-20">
          <ThemeToggle />
        </div>
                {/* Subtle background glow */}
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-[#c8352a]/5 rounded-full blur-[120px] pointer-events-none animate-pulse" />

                <div className={`w-full max-w-[420px] bg-surface-base border border-border-default backdrop-blur-xl rounded-xl p-8 md:p-10 shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.8)] hover:border-border-muted hover:shadow-[0_8px_40px_rgb(200,53,42,0.15)] relative z-10 transition-all duration-500 ${
                  mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                } ${
                  shake ? 'animate-shake' : ''
                }`}>

                    <div className="mb-8">
            <h1 className={`text-[24px] font-bold text-text-primary mb-2 tracking-tight transition-all duration-500 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            }`}>
              Masuk ke Akun Anda
            </h1>
            <p className={`text-text-secondary/80 text-sm transition-all duration-500 delay-100 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            }`}>
              Gunakan email dan password yang terdaftar
            </p>
          </div>

                    {error && (
            <Alert 
              variant="destructive" 
              className="mb-5 rounded-md bg-red-950/20 border-red-900/50 text-red-400 animate-in fade-in slide-in-from-top-2 duration-300"
            >
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} aria-label="Form login">
            {/* Email */}
            <div className="mb-5">
              <label
                htmlFor="email"
                className="block text-xs font-medium text-text-primary mb-2"
              >
                Email
              </label>
                            <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary/50 pointer-events-none transition-colors duration-200 group-focus-within:text-[#c8352a]">
                  <Mail size={16} />
                </div>
                                <input
                                  ref={emailInputRef}
                                  id="email"
                                  type="email"
                                  placeholder="contoh@email.com"
                                  value={email}
                                  onChange={(e) => setEmail(e.target.value)}
                                  required
                                  aria-label="Email"
                                  aria-required="true"
                  className="w-full h-11 pl-10 pr-4 border border-border-default rounded-md text-sm text-text-primary bg-surface-base transition-all duration-200 focus-visible:outline-none focus-visible:border-[#c8352a] focus-visible:ring-2 focus-visible:ring-[#c8352a]/30 focus-visible:shadow-[0_0_15px_rgba(200,53,42,0.15)]"
                />
              </div>
            </div>

                        {/* Password */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="password"
                  className="block text-xs font-medium text-text-primary"
                >
                  Password
                </label>
                                <button
                  type="button"
                  className="text-xs text-[#c8352a] hover:text-[#b02e24] transition-colors duration-200 focus-visible:outline-none focus-visible:underline"
                  onClick={() => setShowForgotPassword(true)}
                >
                  Lupa Password?
                </button>
              </div>
                            <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary/50 pointer-events-none transition-colors duration-200 group-focus-within:text-[#c8352a]">
                  <Lock size={16} />
                </div>
                                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  aria-label="Password"
                  aria-required="true"
                  className="w-full h-11 pl-10 pr-11 border border-border-default rounded-md text-sm text-text-primary bg-surface-base transition-all duration-200 focus-visible:outline-none focus-visible:border-[#c8352a] focus-visible:ring-2 focus-visible:ring-[#c8352a]/30 focus-visible:shadow-[0_0_15px_rgba(200,53,42,0.15)]"
                />
                                <button
                                  type="button"
                                  onClick={() => setShowPassword(!showPassword)}
                                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-text-secondary/50 flex items-center p-0 transition-all duration-200 hover:text-[#c8352a] hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:text-[#c8352a]"
                                >
                  <div className="transition-transform duration-200">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </div>
                </button>
                            </div>
            </div>

            {/* Remember Me */}
            <div className="mb-6 flex items-center gap-2">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-border-default bg-surface-base text-[#c8352a] focus:ring-2 focus:ring-[#c8352a]/30 focus:ring-offset-0 cursor-pointer transition-all duration-200"
              />
              <label
                htmlFor="rememberMe"
                className="text-xs text-text-secondary cursor-pointer select-none hover:text-text-primary transition-colors duration-200"
              >
                Ingat saya selama 30 hari
              </label>
            </div>

            {/* Submit Button */}
                        <button
              type="submit"
              disabled={loading}
              aria-label={loading ? 'Sedang memuat' : 'Masuk ke akun'}
              className="w-full h-11 bg-[#c8352a] text-white border-none rounded-md text-sm font-semibold cursor-pointer flex items-center justify-center gap-2 transition-all duration-200 hover:bg-[#b02e24] hover:shadow-[0_0_20px_rgba(200,53,42,0.4)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8352a]/50"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Memuat...
                </>
              ) : (
                'Masuk'
              )}
            </button>
          </form>
        </div>
      </div>

            {/* Forgot Password Dialog */}
            <ForgotPasswordDialog
              open={showForgotPassword}
              onOpenChange={setShowForgotPassword}
            />

            {/* Responsive style */}
            <style>{`
              @media (max-width: 768px) {
                .login-left-panel {
                  display: none !important;
                }
              }
              @keyframes shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-8px); }
                75% { transform: translateX(8px); }
              }
              .animate-shake {
                animation: shake 0.4s ease-in-out;
              }
            `}</style>
    </div>
  );
}
