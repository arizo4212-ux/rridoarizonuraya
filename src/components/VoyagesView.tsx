import React, { useState } from 'react';
import { Voyage, VoyageStatus, Vessel } from '../types/shipping';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  db, 
  serverTimestamp 
} from '../firebase/config';
import { 
  Compass, 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  Calendar, 
  Ship, 
  ArrowRight, 
  CloudSun, 
  Fuel, 
  CheckCircle2, 
  AlertCircle, 
  X,
  Clock,
  MapPin
} from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

interface VoyagesViewProps {
  voyages: Voyage[];
  vessels: Vessel[];
  isLoading: boolean;
  onNotify: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
}

const VOYAGE_STATUSES: VoyageStatus[] = [
  'Dijadwalkan',
  'Dalam Pelayaran',
  'Selesai',
  'Tertunda Cuaca',
  'Dibatalkan'
];

const INDONESIAN_PORTS = [
  'Pelabuhan Tanjung Priok (Jakarta)',
  'Pelabuhan Tanjung Perak (Surabaya)',
  'Pelabuhan Belawan (Medan)',
  'Pelabuhan Soekarno-Hatta (Makassar)',
  'Pelabuhan Batu Ampar (Batam)',
  'Pelabuhan Semayang (Balikpapan)',
  'Pelabuhan Trisakti (Banjarmasin)',
  'Pelabuhan Dumai (Riau)',
  'Pelabuhan Teluk Bayur (Padang)',
  'Pelabuhan Sorong (Papua Barat)',
  'Pelabuhan Tanjung Emas (Semarang)',
  'Pelabuhan Bitung (Sulawesi Utara)'
];

export const VoyagesView: React.FC<VoyagesViewProps> = ({
  voyages,
  vessels,
  isLoading,
  onNotify
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVoyage, setEditingVoyage] = useState<Voyage | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<Voyage | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    voyageNumber: '',
    vesselId: '',
    vesselName: '',
    originPort: INDONESIAN_PORTS[0],
    destinationPort: INDONESIAN_PORTS[1],
    departureDate: '',
    arrivalDate: '',
    status: 'Dijadwalkan' as VoyageStatus,
    cargoTotalTons: 5000,
    fuelConsumptionEst: 35,
    weatherConditions: 'Ombak 1-1.5m, angin timur 10 knot, cuaca cerah',
    routeNotes: ''
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.voyageNumber.trim() || formData.voyageNumber.trim().length < 4) {
      errors.voyageNumber = 'Nomor pelayaran wajib diisi (minimal 4 karakter, misal: VYG-2025-0108).';
    }
    if (!formData.vesselId) {
      errors.vesselId = 'Silakan pilih kapal yang ditugaskan untuk pelayaran ini.';
    }
    if (formData.originPort === formData.destinationPort) {
      errors.destinationPort = 'Pelabuhan tujuan tidak boleh sama dengan pelabuhan asal!';
    }
    if (!formData.departureDate) {
      errors.departureDate = 'Waktu keberangkatan (ETD) wajib diisi.';
    }
    if (!formData.arrivalDate) {
      errors.arrivalDate = 'Waktu kedatangan estimasi (ETA) wajib diisi.';
    }
    if (formData.departureDate && formData.arrivalDate) {
      const dep = new Date(formData.departureDate).getTime();
      const arr = new Date(formData.arrivalDate).getTime();
      if (arr <= dep) {
        errors.arrivalDate = 'Waktu kedatangan (ETA) harus lebih lambat dari waktu keberangkatan (ETD).';
      }
    }
    if (isNaN(formData.cargoTotalTons) || formData.cargoTotalTons < 0) {
      errors.cargoTotalTons = 'Tonase kargo tidak boleh bernilai negatif.';
    }
    if (isNaN(formData.fuelConsumptionEst) || formData.fuelConsumptionEst < 0) {
      errors.fuelConsumptionEst = 'Estimasi bahan bakar tidak boleh bernilai negatif.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const openCreateModal = () => {
    setEditingVoyage(null);
    const now = new Date();
    const depTime = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
    const arrTime = new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString().slice(0, 16);

    const defaultVessel = vessels[0];

    setFormData({
      voyageNumber: `VYG-2025-${Math.floor(1000 + Math.random() * 9000)}`,
      vesselId: defaultVessel ? defaultVessel.id : '',
      vesselName: defaultVessel ? defaultVessel.name : '',
      originPort: INDONESIAN_PORTS[0],
      destinationPort: INDONESIAN_PORTS[1],
      departureDate: depTime,
      arrivalDate: arrTime,
      status: 'Dijadwalkan',
      cargoTotalTons: 12000,
      fuelConsumptionEst: 42,
      weatherConditions: 'Ombak 1.2m, jarak pandang jernih, arah angin timur laut',
      routeNotes: 'Jalur pelayaran Alur Laut Kepulauan Indonesia (ALKI) I.'
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (voyage: Voyage) => {
    setEditingVoyage(voyage);
    setFormData({
      voyageNumber: voyage.voyageNumber,
      vesselId: voyage.vesselId,
      vesselName: voyage.vesselName,
      originPort: voyage.originPort,
      destinationPort: voyage.destinationPort,
      departureDate: voyage.departureDate,
      arrivalDate: voyage.arrivalDate,
      status: voyage.status,
      cargoTotalTons: voyage.cargoTotalTons,
      fuelConsumptionEst: voyage.fuelConsumptionEst,
      weatherConditions: voyage.weatherConditions,
      routeNotes: voyage.routeNotes || ''
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleVesselSelect = (vesselId: string) => {
    const selected = vessels.find((v) => v.id === vesselId);
    setFormData({
      ...formData,
      vesselId,
      vesselName: selected ? selected.name : ''
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      onNotify('error', 'Validasi Gagal', 'Harap periksa isian tanggal dan rute pelayaran.');
      return;
    }

    setIsSaving(true);
    try {
      if (editingVoyage) {
        await updateDoc(doc(db, 'voyages', editingVoyage.id), {
          ...formData,
          updatedAt: serverTimestamp()
        });

        await addDoc(collection(db, 'operational_logs'), {
          title: `Rute Pelayaran Diperbarui: ${formData.voyageNumber}`,
          description: `${formData.vesselName} (${formData.originPort} → ${formData.destinationPort}) status: ${formData.status}`,
          category: 'PELAYARAN',
          performedBy: 'Admin Operasional',
          timestamp: serverTimestamp()
        });

        onNotify('success', 'Rute Diperbarui', `Jadwal pelayaran ${formData.voyageNumber} berhasil disimpan.`);
      } else {
        await addDoc(collection(db, 'voyages'), {
          ...formData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        await addDoc(collection(db, 'operational_logs'), {
          title: `Jadwal Pelayaran Dibuat: ${formData.voyageNumber}`,
          description: `Rute ${formData.originPort} menuju ${formData.destinationPort} dengan kapal ${formData.vesselName}`,
          category: 'PELAYARAN',
          performedBy: 'Admin Operasional',
          timestamp: serverTimestamp()
        });

        onNotify('success', 'Jadwal Ditambahkan', `Pelayaran ${formData.voyageNumber} terdaftar di Firebase Firestore.`);
      }

      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Save Voyage Error:', err);
      onNotify('error', 'Gagal Menyimpan', err?.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'voyages', deleteTarget.id));

      await addDoc(collection(db, 'operational_logs'), {
        title: `Jadwal Pelayaran Dibatalkan/Dihapus: ${deleteTarget.voyageNumber}`,
        description: `Pelayaran ${deleteTarget.vesselName} telah dihapus dari sistem.`,
        category: 'PELAYARAN',
        performedBy: 'Admin Operasional',
        timestamp: serverTimestamp()
      });

      onNotify('success', 'Pelayaran Dihapus', `Rute ${deleteTarget.voyageNumber} telah dihapus dari database.`);
      setDeleteTarget(null);
    } catch (err: any) {
      console.error('Delete Voyage Error:', err);
      onNotify('error', 'Gagal Menghapus', err?.message || 'Kendala koneksi database.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleQuickStatusChange = async (voyage: Voyage, newStatus: VoyageStatus) => {
    try {
      await updateDoc(doc(db, 'voyages', voyage.id), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      onNotify('info', 'Status Pelayaran Berubah', `${voyage.voyageNumber} kini: ${newStatus}`);
    } catch (err: any) {
      onNotify('error', 'Gagal Ubah Status', err?.message || 'Terjadi kendala.');
    }
  };

  const filteredVoyages = voyages.filter((v) => {
    const matchesSearch = 
      v.voyageNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.vesselName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.originPort.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.destinationPort.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Compass className="w-6 h-6 text-blue-600" />
            Jadwal & Rute Pelayaran (Voyages)
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Pengelolaan trayek antar pelabuhan, waktu keberangkatan (ETD), kedatangan (ETA), dan muatan kargo.
          </p>
        </div>

        <button
          id="btn-tambah-pelayaran"
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium text-sm shadow-sm shadow-blue-600/25 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Jadwalkan Pelayaran Baru</span>
        </button>
      </div>

      {/* Control Bar: Search & Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative w-full md:flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            id="search-voyages-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari kode pelayaran, nama kapal, atau pelabuhan asal/tujuan..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-sm text-slate-800 placeholder-slate-400 bg-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            id="filter-voyage-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full md:w-56 py-2 px-3 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-700 bg-white focus:outline-hidden focus:border-blue-500"
          >
            <option value="ALL">Semua Status Rute</option>
            {VOYAGE_STATUSES.map((st) => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Voyages Cards List */}
      {isLoading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-3 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Memuat rute pelayaran dari Firestore...</p>
        </div>
      ) : filteredVoyages.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <Compass className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900">Belum ada jadwal pelayaran</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            {searchTerm || statusFilter !== 'ALL'
              ? 'Tidak ditemukan rute pelayaran yang sesuai kriteria pencarian.'
              : 'Belum ada trayek aktif. Buat jadwal pelayaran baru untuk armada kapal Anda.'}
          </p>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white shadow-sm"
          >
            Buat Jadwal Pelayaran
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredVoyages.map((voyage) => {
            const isSailing = voyage.status === 'Dalam Pelayaran';
            const isDone = voyage.status === 'Selesai';
            const isScheduled = voyage.status === 'Dijadwalkan';
            const isDelayed = voyage.status === 'Tertunda Cuaca';

            return (
              <div
                key={voyage.id}
                id={`voyage-card-${voyage.id}`}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs">
                        <Ship className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-mono font-bold text-blue-600 block">
                          {voyage.voyageNumber}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900">
                          {voyage.vesselName}
                        </h3>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                        isSailing
                          ? 'bg-sky-50 text-sky-700 border-sky-200'
                          : isDone
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : isDelayed
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isSailing ? 'bg-sky-500 animate-pulse' : isDone ? 'bg-emerald-500' : isDelayed ? 'bg-rose-500' : 'bg-amber-500'
                        }`}
                      />
                      {voyage.status}
                    </span>
                  </div>

                  {/* Route Diagram */}
                  <div className="my-4 p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Pelabuhan Asal (ETD)
                      </span>
                      <p className="text-xs font-bold text-slate-800 truncate">
                        {voyage.originPort}
                      </p>
                      <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {voyage.departureDate.replace('T', ' ')}
                      </span>
                    </div>

                    <div className="shrink-0 flex flex-col items-center px-2">
                      <div className="text-[10px] font-mono font-semibold text-blue-600 mb-0.5">
                        {isSailing ? 'Transit' : isDone ? 'Tiba' : 'Rute'}
                      </div>
                      <div className="w-12 sm:w-20 h-0.5 bg-blue-300 relative flex items-center justify-center">
                        <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                    </div>

                    <div className="min-w-0 text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Pelabuhan Tujuan (ETA)
                      </span>
                      <p className="text-xs font-bold text-slate-800 truncate">
                        {voyage.destinationPort}
                      </p>
                      <span className="text-[11px] text-slate-500 flex items-center justify-end gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {voyage.arrivalDate.replace('T', ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Metrics & Weather */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <div className="p-2.5 rounded-xl bg-white border border-slate-100 flex items-center gap-2">
                      <Fuel className="w-4 h-4 text-amber-500 shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-400 block">Est. Bahan Bakar</span>
                        <span className="font-bold text-slate-800 text-xs">
                          {voyage.fuelConsumptionEst} Ton MFO
                        </span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white border border-slate-100 flex items-center gap-2">
                      <CloudSun className="w-4 h-4 text-sky-500 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-[10px] text-slate-400 block">Cuaca & Gelombang</span>
                        <span className="font-bold text-slate-800 text-xs truncate block">
                          {voyage.weatherConditions}
                        </span>
                      </div>
                    </div>
                  </div>

                  {voyage.routeNotes && (
                    <p className="mt-2.5 text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg italic">
                      "{voyage.routeNotes}"
                    </p>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <select
                      value={voyage.status}
                      onChange={(e) => handleQuickStatusChange(voyage, e.target.value as VoyageStatus)}
                      className="text-[11px] font-medium py-1 px-2 rounded-lg border border-slate-200 text-slate-700 bg-white"
                    >
                      {VOYAGE_STATUSES.map((st) => (
                        <option key={st} value={st}>Ubah: {st}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      id={`edit-voyage-${voyage.id}`}
                      type="button"
                      onClick={() => openEditModal(voyage)}
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Ubah Jadwal"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      id={`delete-voyage-${voyage.id}`}
                      type="button"
                      onClick={() => setDeleteTarget(voyage)}
                      className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Hapus Rute"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {editingVoyage ? `Ubah Jadwal: ${editingVoyage.voyageNumber}` : 'Jadwalkan Rute Pelayaran Baru'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Sinkronisasi langsung dengan Firebase Cloud Firestore
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[78vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Kode Pelayaran */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kode Pelayaran (Voyage No) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="voyage-number-input"
                    type="text"
                    value={formData.voyageNumber}
                    onChange={(e) => setFormData({ ...formData, voyageNumber: e.target.value.toUpperCase() })}
                    placeholder="VYG-2025-0109"
                    className={`w-full px-3.5 py-2 rounded-xl border text-sm text-slate-800 ${
                      formErrors.voyageNumber ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200'
                    }`}
                  />
                  {formErrors.voyageNumber && (
                    <p className="text-xs text-rose-600 mt-1">{formErrors.voyageNumber}</p>
                  )}
                </div>

                {/* Pilih Kapal */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pilih Kapal Armada <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="voyage-vessel-select"
                    value={formData.vesselId}
                    onChange={(e) => handleVesselSelect(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border text-sm text-slate-800 bg-white ${
                      formErrors.vesselId ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200'
                    }`}
                  >
                    <option value="">-- Pilih Kapal --</option>
                    {vessels.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.type})
                      </option>
                    ))}
                  </select>
                  {formErrors.vesselId && (
                    <p className="text-xs text-rose-600 mt-1">{formErrors.vesselId}</p>
                  )}
                </div>

                {/* Pelabuhan Asal */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pelabuhan Asal (Origin) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="voyage-origin-select"
                    value={formData.originPort}
                    onChange={(e) => setFormData({ ...formData, originPort: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-800 bg-white"
                  >
                    {INDONESIAN_PORTS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                {/* Pelabuhan Tujuan */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pelabuhan Tujuan (Destination) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="voyage-destination-select"
                    value={formData.destinationPort}
                    onChange={(e) => setFormData({ ...formData, destinationPort: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border text-sm text-slate-800 bg-white ${
                      formErrors.destinationPort ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200'
                    }`}
                  >
                    {INDONESIAN_PORTS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  {formErrors.destinationPort && (
                    <p className="text-xs text-rose-600 mt-1">{formErrors.destinationPort}</p>
                  )}
                </div>

                {/* Waktu Berangkat */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jadwal Berangkat (ETD) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="voyage-dep-input"
                    type="datetime-local"
                    value={formData.departureDate}
                    onChange={(e) => setFormData({ ...formData, departureDate: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border text-sm text-slate-800 ${
                      formErrors.departureDate ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200'
                    }`}
                  />
                  {formErrors.departureDate && (
                    <p className="text-xs text-rose-600 mt-1">{formErrors.departureDate}</p>
                  )}
                </div>

                {/* Waktu Tiba */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Estimasi Kedatangan (ETA) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="voyage-arr-input"
                    type="datetime-local"
                    value={formData.arrivalDate}
                    onChange={(e) => setFormData({ ...formData, arrivalDate: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border text-sm text-slate-800 ${
                      formErrors.arrivalDate ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200'
                    }`}
                  />
                  {formErrors.arrivalDate && (
                    <p className="text-xs text-rose-600 mt-1">{formErrors.arrivalDate}</p>
                  )}
                </div>

                {/* Status Pelayaran */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status Pelayaran
                  </label>
                  <select
                    id="voyage-status-select"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as VoyageStatus })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-800 bg-white"
                  >
                    {VOYAGE_STATUSES.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                {/* Est Bahan Bakar */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Estimasi Bahan Bakar (Ton MFO)
                  </label>
                  <input
                    id="voyage-fuel-input"
                    type="number"
                    min="0"
                    value={formData.fuelConsumptionEst}
                    onChange={(e) => setFormData({ ...formData, fuelConsumptionEst: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-800"
                  />
                </div>

                {/* Kondisi Cuaca */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Prakiraan Cuaca BMKG & Gelombang
                  </label>
                  <input
                    id="voyage-weather-input"
                    type="text"
                    value={formData.weatherConditions}
                    onChange={(e) => setFormData({ ...formData, weatherConditions: e.target.value })}
                    placeholder="Gelombang 1-1.5m, angin timur 10 knot, aman untuk navigasi"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-800"
                  />
                </div>

                {/* Catatan Rute */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Instruksi Rute & Navigasi
                  </label>
                  <textarea
                    id="voyage-notes-input"
                    rows={2}
                    value={formData.routeNotes}
                    onChange={(e) => setFormData({ ...formData, routeNotes: e.target.value })}
                    placeholder="Instruksi pandu pelabuhan, titik koordinat labuh jangkar..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-800 resize-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  id="submit-voyage-form"
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition flex items-center gap-2 cursor-pointer"
                >
                  {isSaving && (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                  {editingVoyage ? 'Simpan Jadwal' : 'Daftarkan Pelayaran'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      <ConfirmModal
        isOpen={deleteTarget !== null}
        title="Batalkan & Hapus Jadwal Pelayaran"
        message={`Apakah Anda yakin ingin menghapus pelayaran "${deleteTarget?.voyageNumber}" (${deleteTarget?.vesselName}) dari database Firestore?`}
        confirmLabel="Hapus Rute"
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
