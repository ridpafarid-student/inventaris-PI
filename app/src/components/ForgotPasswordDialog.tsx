// ============================================
// COMPONENT - Forgot Password Dialog
// ============================================

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, Loader2, CheckCircle2 } from 'lucide-react';
import { getFirebaseAuthErrorMessage } from '@/lib/firebase-auth-errors';

interface ForgotPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ForgotPasswordDialog({
  open,
  onOpenChange,
}: ForgotPasswordDialogProps) {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setSuccess(false);

    try {
      console.log('🔄 Attempting to send password reset email to:', email);
      await resetPassword(email);
      console.log('✅ Password reset email sent successfully');
      setSuccess(true);
      setEmail('');
      
      // Auto close dialog after 3 seconds
      setTimeout(() => {
        onOpenChange(false);
        // Reset success state after dialog closes
        setTimeout(() => setSuccess(false), 300);
      }, 3000);
    } catch (err: any) {
      console.error('❌ Password reset error:', err);
      console.error('Error code:', err.code);
      console.error('Error message:', err.message);
      setError(getFirebaseAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!loading) {
      onOpenChange(newOpen);
      // Reset form when dialog closes
      if (!newOpen) {
        setTimeout(() => {
          setEmail('');
          setError('');
          setSuccess(false);
        }, 300);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[440px] bg-black/95 border-[#1f1f1f] text-text-primary backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-text-primary">
            Reset Password
          </DialogTitle>
          <DialogDescription className="text-text-secondary/80 text-sm">
            Masukkan email Anda dan kami akan mengirimkan link untuk reset password.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          {/* Error Alert */}
          {error && (
            <Alert
              variant="destructive"
              className="mb-4 rounded-md bg-red-950/20 border-red-900/50 text-red-400 animate-in fade-in slide-in-from-top-2 duration-300"
            >
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Alert */}
          {success && (
            <Alert className="mb-4 rounded-md bg-green-950/20 border-green-900/50 text-green-400 animate-in fade-in slide-in-from-top-2 duration-300">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Email reset password telah dikirim! Silakan cek inbox Anda.
              </AlertDescription>
            </Alert>
          )}

          {/* Email Input */}
          <div className="mb-6">
            <label
              htmlFor="reset-email"
              className="block text-xs font-medium text-text-primary mb-2"
            >
              Email
            </label>
            <div className="relative group">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary/50 pointer-events-none transition-colors duration-200 group-focus-within:text-[#c8352a]">
                <Mail size={16} />
              </div>
              <input
                id="reset-email"
                type="email"
                placeholder="contoh@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading || success}
                className="w-full h-11 pl-10 pr-4 border border-[#1f1f1f] rounded-md text-sm text-text-primary bg-black transition-all duration-200 focus-visible:outline-none focus-visible:border-[#c8352a] focus-visible:ring-2 focus-visible:ring-[#c8352a]/30 focus-visible:shadow-[0_0_15px_rgba(200,53,42,0.15)] disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Email untuk reset password"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <button
              type="button"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
              className="flex-1 sm:flex-none h-10 px-4 bg-transparent border border-[#1f1f1f] text-text-secondary rounded-md text-sm font-medium cursor-pointer transition-all duration-200 hover:bg-[#0a0a0a] hover:text-text-primary hover:border-[#2a2a2a] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8352a]/30"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || success}
              className="flex-1 sm:flex-none h-10 px-4 bg-[#c8352a] text-white border-none rounded-md text-sm font-semibold cursor-pointer flex items-center justify-center gap-2 transition-all duration-200 hover:bg-[#b02e24] hover:shadow-[0_0_20px_rgba(200,53,42,0.4)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8352a]/50"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Mengirim...
                </>
              ) : success ? (
                <>
                  <CheckCircle2 size={16} />
                  Terkirim
                </>
              ) : (
                'Kirim Link Reset'
              )}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
