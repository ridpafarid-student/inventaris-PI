// ============================================
// PAGE - Login
// ============================================

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Loader2, Package2 } from 'lucide-react';
import { getFirebaseAuthErrorMessage } from '@/lib/firebase-auth-errors';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(getFirebaseAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f5f5f0' }}>
      {/* Left Panel - Branding */}
      <div
        style={{
          width: '45%',
          backgroundColor: '#1a1a2e',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '48px',
          position: 'relative',
          overflow: 'hidden',
        }}
        className="login-left-panel"
      >
        {/* Subtle background pattern */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(99,102,241,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(168,85,247,0.1) 0%, transparent 50%)',
          pointerEvents: 'none',
        }} />

        {/* Logo */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              backgroundColor: '#6366f1',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Package2 size={20} color="white" />
            </div>
            <span style={{ color: 'white', fontWeight: '600', fontSize: '16px', letterSpacing: '0.01em' }}>
              Mthree Computer
            </span>
          </div>
        </div>

        {/* Center content */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2 style={{
            color: 'white',
            fontSize: '28px',
            fontWeight: '700',
            lineHeight: '1.3',
            marginBottom: '16px',
          }}>
            Sistem Manajemen<br />Inventaris & Servis
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', lineHeight: '1.7', maxWidth: '280px' }}>
            Kelola stok barang, data servis, dan laporan operasional toko dalam satu platform terpusat.
          </p>

          {/* Feature pills */}
          <div style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {['Manajemen Inventaris Barang', 'Pencatatan Data Servis', 'Laporan & Statistik'].map((item) => (
              <div key={item} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}>
                <div style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#6366f1',
                  flexShrink: 0,
                }} />
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom tagline */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '12px' }}>
            © 2025 Mthree Computer · Sistem Internal
          </p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 32px',
      }}>
        <div style={{ width: '100%', maxWidth: '380px' }}>

          <div style={{ marginBottom: '36px' }}>
            <h1 style={{
              fontSize: '22px',
              fontWeight: '700',
              color: '#111',
              marginBottom: '6px',
            }}>
              Masuk ke Akun Anda
            </h1>
            <p style={{ color: '#888', fontSize: '14px' }}>
              Gunakan email dan password yang terdaftar
            </p>
          </div>

          {error && (
            <Alert variant="destructive" style={{ marginBottom: '20px', borderRadius: '8px' }}>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div style={{ marginBottom: '18px' }}>
              <label
                htmlFor="email"
                style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#333', marginBottom: '6px' }}
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="contoh@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  height: '44px',
                  padding: '0 14px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: '#111',
                  backgroundColor: 'white',
                  outline: 'none',
                  transition: 'border-color 0.15s',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => { e.target.style.borderColor = '#6366f1'; }}
                onBlur={(e) => { e.target.style.borderColor = '#ddd'; }}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: '24px' }}>
              <label
                htmlFor="password"
                style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#333', marginBottom: '6px' }}
              >
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    height: '44px',
                    padding: '0 42px 0 14px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '14px',
                    color: '#111',
                    backgroundColor: 'white',
                    outline: 'none',
                    transition: 'border-color 0.15s',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = '#6366f1'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#ddd'; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#aaa',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 0,
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                height: '44px',
                backgroundColor: loading ? '#a5b4fc' : '#4f46e5',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'background-color 0.15s',
              }}
              onMouseEnter={(e) => { if (!loading) (e.target as HTMLButtonElement).style.backgroundColor = '#4338ca'; }}
              onMouseLeave={(e) => { if (!loading) (e.target as HTMLButtonElement).style.backgroundColor = '#4f46e5'; }}
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

      {/* Responsive style */}
      <style>{`
        @media (max-width: 768px) {
          .login-left-panel {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
