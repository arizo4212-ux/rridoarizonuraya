import React, { useState } from 'react';
import { Vessel, Voyage, Cargo, Maintenance, OperationalLog } from '../types/shipping';
import { checkAndSeedDatabase } from '../firebase/seedData';
import { 
  Ship, 
  Compass, 
  Package, 
  Wrench, 
  TrendingUp, 
  DollarSign, 
  Anchor, 
  MapPin, 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  Database,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { ActiveTab } from './Navbar';

interface DashboardViewProps {
  vessels: Vessel[];
  voyages: Voyage[];
  cargoes: Cargo[];
  maintenances: Maintenance[];
  logs: OperationalLog[];
  setActiveTab: (tab: ActiveTab) => void;
  onNotify: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  vessels,
  voyages,
  cargoes,
  maintenances,
  logs,
  setActiveTab,
  onNotify
}) => {
  const [isSeeding, setIsSeeding] = useState(false);

  // Calculations
  const sailingVessels = vessels.filter((v) => v.status === 'Berlayar').length;
  const readyVessels = vessels.filter((v) => v.status === 'Siap Muat').length;
  const dockedVessels = vessels.filter((v) => v.status === 'Bersandar di Pelabuhan').length;
  const maintenanceVessels = vessels.filter((v) => v.status === 'Dalam Pemeliharaan / Dok').length;

  const totalDwt = vessels.reduce((acc, v) => acc + (v.dwt || 0), 0);
  const totalTeu = vessels.reduce((acc, v) => acc + (v.teuCapacity || 0), 0);

  const activeVoyages = voyages.filter((vy) => vy.status === 'Dalam Pelayaran').length;
  const scheduledVoyages = voyages.filter((vy) => vy.status === 'Dijadwalkan').length;

  const totalFreightRevenue = cargoes.reduce((acc, c) => acc + (c.tariffIdr || 0), 0);
  const totalCargoWeightKg = cargoes.reduce((acc, c) => acc + (c.weightKg || 0), 0);

  const handleSeedData = async () => {
    setIsSeeding(true);
    try {
      const result = await checkAndSeedDatabase();
      if (result.seeded) {
        onNotify('success', 'Master Data Terisi', result.message);
      } else {
        onNotify('info', 'Status Data', result.message);
      }
    } catch (err: any) {
      onNotify('error', 'Gagal Inisialisasi', err?.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSeeding(false);
    }
  };

  const isDatabaseEmpty = vessels.length === 0 && voyages.length === 0 && cargoes.length === 0;

  return (
    <div className="space-y-6">
      {/* Top Banner & Welcome */}
      <div className="bg-gradient-to-r from-blue-700 via-sky-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-blue-900/10 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white/90 text-xs font-semibold backdrop-blur-md mb-3 border border-white/20">
            <Anchor className="w-3.5 h-3.5" />
            <span>Pusat Kendali Operasi Maritim Nasional</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            PT Samudera Bahari Logistik
          </h1>
          <p className="text-sm text-sky-100/90 mt-2 leading-relaxed">
            Sistem manajemen pelayaran terintegrasi dengan Firebase Cloud Firestore sebagai Sumber Tunggal Kebenaran real-time. Memantau posisi armada, efisiensi rute, dan tonase kargo komersial.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-5">
            <button
              id="dashboard-seed-btn"
              type="button"
              onClick={handleSeedData}
              disabled={isSeeding}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-blue-900 font-bold text-xs shadow-md transition disabled:opacity-75 cursor-pointer"
            >
              {isSeeding ? (
                <div className="w-4 h-4 border-2 border-blue-900/30 border-t-blue-900 rounded-full animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 text-blue-600" />
              )}
              <span>{isDatabaseEmpty ? 'Isi Data Master Pelayaran (Firestore)' : 'Sinkronisasi Data Starter'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('vessels')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs border border-white/20 backdrop-blur-md transition cursor-pointer"
            >
              <Ship className="w-4 h-4" />
              <span>Kelola Armada Kapal</span>
            </button>
          </div>
        </div>

        {/* Real-time Status Card Right */}
        <div className="relative z-10 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 sm:p-5 text-xs shrink-0 md:w-72">
          <div className="flex items-center justify-between pb-3 border-b border-white/15">
            <span className="text-white/80 font-medium">Status Database:</span>
            <span className="inline-flex items-center gap-1.5 font-bold text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live Connected
            </span>
          </div>
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-white/70">Penyimpanan:</span>
              <span className="font-semibold text-white">Google Cloud Firestore</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/70">Client Storage:</span>
              <span className="font-semibold text-emerald-200">Bebas localStorage</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/70">Total Dokumen:</span>
              <span className="font-mono font-bold text-white">
                {vessels.length + voyages.length + cargoes.length + maintenances.length} Dokumen
              </span>
            </div>
          </div>
        </div>

        {/* Ambient background decoration */}
        <div className="absolute -right-16 -bottom-16 w-80 h-80 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
      </div>

      {/* 4 Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* KPI 1: Armada */}
        <div 
          onClick={() => setActiveTab('vessels')}
          className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Ship className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
          </div>
          <div className="mt-4">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Total Armada Aktif
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl sm:text-3xl font-black text-slate-900">
                {vessels.length}
              </span>
              <span className="text-xs text-slate-500 font-medium">Kapal Terdaftar</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span className="text-sky-700 font-semibold">{sailingVessels} Berlayar</span>
            <span className="text-slate-400">•</span>
            <span className="text-emerald-700 font-semibold">{readyVessels} Siap Muat</span>
            <span className="text-slate-400">•</span>
            <span className="text-amber-700 font-semibold">{dockedVessels} Sandar</span>
          </div>
        </div>

        {/* KPI 2: DWT & Kapasitas */}
        <div 
          onClick={() => setActiveTab('vessels')}
          className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Layers className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 transition-colors" />
          </div>
          <div className="mt-4">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Kapasitas Angkut Armada
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl sm:text-3xl font-black text-slate-900">
                {(totalDwt / 1000).toFixed(1)}k
              </span>
              <span className="text-xs text-slate-500 font-medium">DWT Tonase</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>{totalTeu > 0 ? `${totalTeu.toLocaleString('id-ID')} TEU Box` : 'Multi-Kargo'}</span>
            <span className="text-teal-700 font-semibold">{vessels.length} Kapal Beroperasi</span>
          </div>
        </div>

        {/* KPI 3: Jadwal Pelayaran */}
        <div 
          onClick={() => setActiveTab('voyages')}
          className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Compass className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-sky-600 transition-colors" />
          </div>
          <div className="mt-4">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Jadwal & Rute Pelayaran
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl sm:text-3xl font-black text-slate-900">
                {voyages.length}
              </span>
              <span className="text-xs text-slate-500 font-medium">Rute Aktif</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span className="text-sky-700 font-semibold">{activeVoyages} Di Laut</span>
            <span className="text-slate-400">•</span>
            <span className="text-amber-700 font-semibold">{scheduledVoyages} Terjadwal</span>
          </div>
        </div>

        {/* KPI 4: Freight Revenue */}
        <div 
          onClick={() => setActiveTab('cargoes')}
          className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <DollarSign className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
          </div>
          <div className="mt-4">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Total Freight Terdaftar
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl sm:text-2xl font-black text-slate-900">
                Rp {(totalFreightRevenue / 1000000).toFixed(0)} Jt
              </span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>{cargoes.length} Manifes B/L</span>
            <span className="text-emerald-700 font-semibold">
              {(totalCargoWeightKg / 1000).toFixed(0)} Ton Kargo
            </span>
          </div>
        </div>
      </div>

      {/* Main 2-Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 Cols: Ongoing Voyages & Fleet Status */}
        <div className="lg:col-span-8 space-y-6">
          {/* Active Voyages Section */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <Compass className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  Trayek Pelayaran Sedang Berjalan
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('voyages')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition"
              >
                Lihat Semua Jadwal &rarr;
              </button>
            </div>

            <div className="divide-y divide-slate-100 mt-2">
              {voyages.slice(0, 3).map((voy) => (
                <div key={voy.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                        {voy.voyageNumber}
                      </span>
                      <span className="text-xs font-semibold text-slate-800">
                        {voy.vesselName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600 mt-1">
                      <span className="font-medium text-slate-700">{voy.originPort}</span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span className="font-medium text-slate-700">{voy.destinationPort}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right text-[11px] text-slate-500">
                      <div>ETA: {voy.arrivalDate.replace('T', ' ')}</div>
                      <div className="font-medium text-slate-700">{voy.cargoTotalTons.toLocaleString()} Ton Kargo</div>
                    </div>

                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
                      voy.status === 'Dalam Pelayaran'
                        ? 'bg-sky-50 text-sky-700 border-sky-200'
                        : voy.status === 'Selesai'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {voy.status}
                    </span>
                  </div>
                </div>
              ))}

              {voyages.length === 0 && (
                <div className="py-8 text-center text-xs text-slate-400">
                  Belum ada trayek pelayaran aktif. Klik tombol "Isi Data Master" atau jadwalkan pelayaran baru.
                </div>
              )}
            </div>
          </div>

          {/* Fleet Overview List */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <Ship className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  Daftar Posisi Armada Kapal
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('vessels')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition"
              >
                Kelola Seluruh Armada &rarr;
              </button>
            </div>

            <div className="divide-y divide-slate-100 mt-2">
              {vessels.slice(0, 4).map((v) => (
                <div key={v.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                        {v.name}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {v.callSign}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{v.currentLocation}</span>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-3">
                    <span className="hidden sm:inline-block text-xs font-semibold text-slate-700">
                      {v.dwt.toLocaleString('id-ID')} DWT
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      v.status === 'Berlayar'
                        ? 'bg-sky-50 text-sky-700 border-sky-200'
                        : v.status === 'Siap Muat'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : v.status === 'Bersandar di Pelabuhan'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {v.status}
                    </span>
                  </div>
                </div>
              ))}

              {vessels.length === 0 && (
                <div className="py-8 text-center text-xs text-slate-400">
                  Belum ada armada kapal. Klik tombol "Isi Data Master Pelayaran" untuk memuat data awal.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right 4 Cols: Recent B/L & Operational Activity Stream */}
        <div className="lg:col-span-4 space-y-6">
          {/* Recent Cargo Bookings */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Manifes Kargo Terbaru (B/L)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('cargoes')}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-700"
              >
                Lihat
              </button>
            </div>

            <div className="mt-3 space-y-3">
              {cargoes.slice(0, 3).map((c) => (
                <div key={c.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-blue-700">{c.blNumber}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                      {c.cargoType}
                    </span>
                  </div>
                  <div className="mt-1 text-slate-700 font-medium truncate">
                    {c.shipper} &rarr; {c.consignee}
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{c.weightKg.toLocaleString()} Kg</span>
                    <span className="font-semibold text-emerald-700">Rp {c.tariffIdr.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              ))}

              {cargoes.length === 0 && (
                <div className="py-6 text-center text-xs text-slate-400">
                  Belum ada manifes kargo.
                </div>
              )}
            </div>
          </div>

          {/* Real-time Operational Logs from Firestore */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Log Aktivitas Real-time
                </h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-600 font-semibold">
                ● Live Firestore
              </span>
            </div>

            <div className="mt-3 space-y-3 max-h-72 overflow-y-auto pr-1">
              {logs.slice(0, 6).map((log) => (
                <div key={log.id} className="text-xs border-l-2 border-blue-500 pl-3 py-0.5">
                  <div className="font-semibold text-slate-900 leading-tight">
                    {log.title}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    {log.description}
                  </p>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Oleh: {log.performedBy || 'Admin Operasional'}
                  </span>
                </div>
              ))}

              {logs.length === 0 && (
                <div className="py-6 text-center text-xs text-slate-400">
                  Log operasional akan muncul secara real-time saat Anda melakukan aksi CRUD kapal, pelayaran, atau kargo.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
