export function getFirebaseAuthErrorMessage(error: unknown) {
  const code =
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
      ? error.code
      : '';

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return 'Email atau password salah, atau akun tersebut belum terdaftar di Firebase Auth.';
    case 'auth/user-not-found':
      return 'Akun tidak ditemukan.';
    case 'auth/wrong-password':
      return 'Password yang Anda masukkan salah.';
    case 'auth/invalid-email':
      return 'Format email tidak valid.';
    case 'auth/email-already-in-use':
      return 'Email ini sudah digunakan.';
    case 'auth/weak-password':
      return 'Password terlalu lemah. Gunakan minimal 6 karakter.';
    case 'auth/network-request-failed':
      return 'Koneksi ke Firebase gagal. Periksa internet Anda dan coba lagi.';
    case 'auth/too-many-requests':
      return 'Terlalu banyak percobaan. Coba lagi beberapa saat lagi.';
    case 'auth/configuration-not-found':
    case 'auth/operation-not-allowed':
      return 'Metode login Email/Password belum aktif di Firebase Authentication.';
    default:
      return 'Autentikasi gagal. Periksa konfigurasi Firebase Auth dan data akun Anda.';
  }
}
