import React from 'react';
import { 
  Anchor, 
  Ship, 
  Compass, 
  Package, 
  Wrench, 
  BarChart3, 
  LogOut, 
  User as UserIcon,
  Database,
  Radio
} from 'lucide-react';
import { logoutUser, AppUser } from '../firebase/config';

export type ActiveTab = 'dashboard' | 'vessels' | 'voyages' | 'cargoes' | 'maintenances';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  currentUser: AppUser | null;
  counts: {
    vessels: number;
    voyages: number;
    cargoes: number;
    maintenances: number;
  };
  onNotify: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  counts,
  onNotify
}) => {
  const handleLogout = async () => {
    try {
      await logoutUser();
      onNotify('info', 'Sesi Berakhir', 'Anda telah berhasil keluar dari sistem operasional.');
    } catch (err: any) {
      onNotify('error', 'Gagal Keluar', err?.message || 'Terjadi kesalahan saat logout.');
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Ringkasan Eksekutif', icon: BarChart3 },
    { id: 'vessels', label: 'Armada Kapal', icon: Ship, count: counts.vessels },
    { id: 'voyages', label: 'Jadwal & Rute', icon: Compass, count: counts.voyages },
    { id: 'cargoes', label: 'Manifes Kargo', icon: Package, count: counts.cargoes },
    { id: 'maintenances', label: 'Dok & Servis', icon: Wrench, count: counts.maintenances },
  ] as const;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs">
      {/* Top Banner with Brand and Status */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Company Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-700 text-white flex items-center justify-center shadow-md shadow-blue-700/20">
              <Anchor className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 tracking-tight text-base sm:text-lg">
                  SAMUDERA BAHARI
                </span>
                <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  Fleet Ops 4.0
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Sistem Informasi Manajemen Pelayaran & Logistik Maritim
              </p>
            </div>
          </div>

          {/* Center/Right: Database Indicator & User Controls */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Live Firestore indicator */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-emerald-200/90 text-xs text-emerald-800 font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              <span>Realtime Cloud Database</span>
            </div>

            {/* Current User profile badge */}
            <div className="flex items-center gap-2.5 pl-2 sm:pl-3 border-l border-slate-200">
              {currentUser?.photoURL ? (
                <img 
                  src={currentUser.photoURL} 
                  alt="Avatar" 
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-full border border-slate-200 object-cover shadow-xs" 
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shadow-xs">
                  {currentUser?.displayName ? currentUser.displayName.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />}
                </div>
              )}
              <div className="hidden sm:block text-left">
                <div className="text-xs font-bold text-slate-900 truncate max-w-[140px]">
                  {currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Administrator'}
                </div>
                <div className="text-[10px] text-slate-500 font-mono truncate max-w-[140px]">
                  {currentUser?.email || (currentUser?.isAnonymous ? 'Tamu Maritim' : 'Akun Aktif')}
                </div>
              </div>

              {/* Logout / Switch Account Button */}
              <button
                id="logout-header-btn"
                type="button"
                onClick={handleLogout}
                title="Keluar / Ganti Akun"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-slate-200 hover:border-rose-200 cursor-pointer"
                aria-label="Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Ganti Akun</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 overflow-x-auto py-2 scrollbar-none border-t border-slate-100">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-tab-${item.id}`}
                type="button"
                onClick={() => setActiveTab(item.id as ActiveTab)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/25'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{item.label}</span>
                {'count' in item && typeof item.count === 'number' && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-200/80 text-slate-700'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
