import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  auth,
  db,
  doc,
  setDoc,
  serverTimestamp
} from '../firebase/config';
import { 
  Anchor, 
  Ship, 
  ShieldCheck, 
  Lock, 
  Mail, 
  User as UserIcon, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Database,
  Sparkles
} from 'lucide-react';

interface AuthViewProps {
  onSuccessNotice?: (message: string) => void;
}

const DEMO_ACCOUNTS = [
  {
    role: 'Admin Utama (Direktur Operasional)',
    name: 'Capt. Hendra Wijaya',
    email: 'admin@samuderabahari.co.id',
    password: 'AdminMaritim2025!',
    badge: 'Hak Akses Penuh',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    desc: 'Kelola seluruh armada, rute pelayaran, tarif kargo, dan perbaikan dok'
  },
  {
    role: 'Manajer Armada Kapal (Fleet Manager)',
    name: 'Ir. Bambang Suryono',
    email: 'armada@samuderabahari.co.id',
    password: 'FleetMaritim2025!',
    badge: 'Operasional Kapal',
    badgeColor: 'bg-teal-100 text-teal-800 border-teal-200',
    desc: 'Monitoring posisi kapal, kapasitas DWT, bahan bakar & nakhoda'
  },
  {
    role: 'Supervisor Kargo & Logistik',
    name: 'Dewi Rahmawati, SE',
    email: 'kargo@samuderabahari.co.id',
    password: 'CargoMaritim2025!',
    badge: 'Logistik & B/L',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    desc: 'Registrasi Bill of Lading, berat muatan, kontainer & pelunasan'
  }
];

export const AuthView: React.FC<AuthViewProps> = ({ onSuccessNotice }) => {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeDemo, setActiveDemo] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (e?: React.FormEvent, customEmail?: string, customPass?: string, customName?: string) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    const targetEmail = (customEmail ?? email).trim();
    const targetPass = customPass ?? password;
    const targetName = (customName ?? displayName).trim();

    if (!targetEmail) {
      setErrorMessage('Silakan masukkan alamat email / username admin.');
      return;
    }
    if (!targetPass || targetPass.length < 6) {
      setErrorMessage('Password minimal harus 6 karakter.');
      return;
    }

    setIsLoading(true);

    try {
      if (isRegisterMode && !customEmail) {
        // Register new account in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, targetEmail, targetPass);
        if (targetName) {
          await updateProfile(userCredential.user, { displayName: targetName });
        }
        // Save user record to Firestore (Source of Truth)
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          uid: userCredential.user.uid,
          email: targetEmail,
          displayName: targetName || targetEmail.split('@')[0],
          role: 'Administrator',
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp()
        }, { merge: true });

        if (onSuccessNotice) onSuccessNotice('Pendaftaran akun berhasil! Anda telah masuk.');
      } else {
        // Attempt Sign In
        try {
          const userCredential = await signInWithEmailAndPassword(auth, targetEmail, targetPass);
          // Update last login in Firestore
          await setDoc(doc(db, 'users', userCredential.user.uid), {
            lastLogin: serverTimestamp()
          }, { merge: true });

          if (onSuccessNotice) onSuccessNotice(`Selamat datang kembali, ${userCredential.user.displayName || targetEmail}!`);
        } catch (signInErr: any) {
          // If demo account and not found in Firebase Auth yet, auto-create it seamlessly
          if (
            customEmail && 
            (signInErr.code === 'auth/user-not-found' || 
             signInErr.code === 'auth/invalid-credential' ||
             signInErr.code === 'auth/invalid-login-credentials')
          ) {
            const userCredential = await createUserWithEmailAndPassword(auth, targetEmail, targetPass);
            await updateProfile(userCredential.user, { 
              displayName: targetName || 'Administrator Pelayaran' 
            });
            await setDoc(doc(db, 'users', userCredential.user.uid), {
              uid: userCredential.user.uid,
              email: targetEmail,
              displayName: targetName || 'Administrator Pelayaran',
              role: 'Administrator',
              createdAt: serverTimestamp(),
              lastLogin: serverTimestamp()
            }, { merge: true });
            
            if (onSuccessNotice) onSuccessNotice(`Akun demo ${targetName} berhasil disiapkan & masuk ke sistem!`);
          } else {
            throw signInErr;
          }
        }
      }
    } catch (err: any) {
      console.error('Firebase Auth Error:', err);
      let friendlyMsg = 'Gagal masuk. Silakan periksa kembali email dan kata sandi Anda.';
      if (err.code === 'auth/email-already-in-use') {
        friendlyMsg = 'Email ini sudah terdaftar. Silakan pilih mode Masuk.';
      } else if (err.code === 'auth/invalid-email') {
        friendlyMsg = 'Format email tidak valid.';
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        friendlyMsg = 'Email atau kata sandi tidak cocok. Gunakan tombol Quick Demo untuk login instan.';
      } else if (err.code === 'auth/too-many-requests') {
        friendlyMsg = 'Terlalu banyak percobaan gagal. Silakan tunggu beberapa saat.';
      } else if (err.message) {
        friendlyMsg = err.message;
      }
      setErrorMessage(friendlyMsg);
    } finally {
      setIsLoading(false);
      setActiveDemo(null);
    }
  };

  const handleQuickDemo = (account: typeof DEMO_ACCOUNTS[0]) => {
    setActiveDemo(account.email);
    setEmail(account.email);
    setPassword(account.password);
    setDisplayName(account.name);
    handleLogin(undefined, account.email, account.password, account.name);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50/70 via-slate-50 to-blue-50/50 flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8">
      {/* Top Bar Header */}
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
            <Anchor className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-slate-900 tracking-tight text-lg">
              SAMUDERA BAHARI
            </span>
            <span className="block text-xs text-slate-500">
              PT Samudera Bahari Logistik Indonesia
            </span>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-emerald-200 text-xs font-medium text-emerald-700 shadow-xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <Database className="w-3.5 h-3.5 text-emerald-600" />
          <span>Firebase Firestore Terhubung</span>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-4xl mx-auto w-full my-auto py-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Left Column: Login Form */}
          <div className="lg:col-span-6 bg-white rounded-2xl p-6 sm:p-8 shadow-xl shadow-slate-200/60 border border-slate-200/90 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 mb-2">
                <Ship className="w-4 h-4" />
                Portal Operasional Perusahaan
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {isRegisterMode ? 'Buat Akun Administrator' : 'Masuk ke Sistem'}
              </h1>
              <p className="text-sm text-slate-500 mt-2">
                {isRegisterMode 
                  ? 'Daftarkan kredensial admin baru untuk manajemen armada kapal.' 
                  : 'Silakan masukkan kredensial resmi Anda untuk mengakses dashboard operasional.'}
              </p>

              {/* Error Alert */}
              {errorMessage && (
                <div className="mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">{errorMessage}</div>
                </div>
              )}

              {/* Form Elements */}
              <form onSubmit={handleLogin} className="mt-6 space-y-4">
                {isRegisterMode && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Nama Lengkap Admin
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <input
                        id="register-name-input"
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Contoh: Capt. Hendra Wijaya"
                        required={isRegisterMode}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500 focus:ring-3 focus:ring-blue-500/15 text-sm text-slate-800 placeholder-slate-400 bg-white transition"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Email / Username Perusahaan
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="login-email-input"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@samuderabahari.co.id"
                      required
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500 focus:ring-3 focus:ring-blue-500/15 text-sm text-slate-800 placeholder-slate-400 bg-white transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Kata Sandi
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="login-password-input"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500 focus:ring-3 focus:ring-blue-500/15 text-sm text-slate-800 placeholder-slate-400 bg-white transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition"
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    id="submit-auth-btn"
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-600/25 transition disabled:opacity-60 cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Memverifikasi Database...</span>
                      </>
                    ) : (
                      <>
                        <span>{isRegisterMode ? 'Daftarkan Akun Baru' : 'Masuk ke Portal Operasional'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Mode Switcher */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                {isRegisterMode ? 'Sudah memiliki akun resmi?' : 'Belum memiliki akun admin?'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsRegisterMode(!isRegisterMode);
                  setErrorMessage(null);
                }}
                className="font-semibold text-blue-600 hover:text-blue-700 underline underline-offset-2 transition"
              >
                {isRegisterMode ? 'Beralih ke Masuk' : 'Daftar Akun Baru'}
              </button>
            </div>
          </div>

          {/* Right Column: Demo Accounts (Requirement: quick login klik) */}
          <div className="lg:col-span-6 bg-slate-50/80 rounded-2xl p-6 sm:p-7 border border-slate-200/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Quick Demo Login (Klik Instan)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Pilih role di bawah untuk langsung terhubung via Firebase Auth
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 mt-4">
                {DEMO_ACCOUNTS.map((acc, index) => {
                  const isThisActive = activeDemo === acc.email && isLoading;
                  return (
                    <button
                      key={index}
                      id={`demo-login-btn-${index}`}
                      type="button"
                      onClick={() => handleQuickDemo(acc)}
                      disabled={isLoading}
                      className="w-full text-left p-4 rounded-xl bg-white hover:bg-blue-50/40 border border-slate-200/80 hover:border-blue-300 shadow-xs hover:shadow-md transition-all duration-200 group relative overflow-hidden"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-slate-900 group-hover:text-blue-700 transition-colors">
                              {acc.role}
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${acc.badgeColor}`}>
                              {acc.badge}
                            </span>
                          </div>
                          <div className="text-xs font-mono text-slate-500 mt-1">
                            {acc.email}
                          </div>
                          <div className="text-xs text-slate-500 mt-1 leading-relaxed">
                            {acc.desc}
                          </div>
                        </div>

                        <div className="shrink-0 pt-1">
                          {isThisActive ? (
                            <div className="w-5 h-5 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                          ) : (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 text-slate-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                              <ArrowRight className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Architecture Compliance Note */}
            <div className="mt-6 pt-4 border-t border-slate-200 text-xs text-slate-500 space-y-2">
              <div className="flex items-center gap-2 text-slate-700 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Single Source of Truth: Firebase Cloud Firestore</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                Sistem tidak menggunakan localStorage. Seluruh sesi login, data armada kapal, jadwal pelayaran, dan status manifes kargo disinkronkan langsung dengan cloud database produksi secara real-time.
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* Footer */}
      <div className="max-w-7xl mx-auto w-full pt-6 text-center text-xs text-slate-400">
        &copy; 2025 PT Samudera Bahari Logistik. Sistem Manajemen Operasional Perusahaan Pelayaran Nasional.
      </div>
    </div>
  );
};
