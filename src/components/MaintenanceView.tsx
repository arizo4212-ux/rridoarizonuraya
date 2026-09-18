import React, { useState } from 'react';
import { Maintenance, MaintenanceType, MaintenanceStatus, Vessel } from '../types/shipping';
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
  Wrench, 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  Ship, 
  Calendar, 
  DollarSign, 
  UserCheck, 
  CheckCircle2, 
  AlertCircle, 
  X,
  HardHat,
  Clock
} from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

interface MaintenanceViewProps {
  maintenances: Maintenance[];
  vessels: Vessel[];
  isLoading: boolean;
  onNotify: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
}

const MAINTENANCE_TYPES: MaintenanceType[] = [
  'Docking Tahunan (Annual Survey)',
  'Overhaul Mesin Utama',
  'Sertifikasi SOLAS / Biro Klasifikasi Indonesia (BKI)',
  'Perbaikan Sistem Propulsi',
  'Pembersihan & Pengecatan Lambung'
];

const MAINTENANCE_STATUSES: MaintenanceStatus[] = [
  'Terjadwal',
  'Sedang Berjalan',
  'Selesai',
  'Ditunda'
];

export const MaintenanceView: React.FC<MaintenanceViewProps> = ({
  maintenances,
  vessels,
  isLoading,
  onNotify
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaintenance, setEditingMaintenance] = useState<Maintenance | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<Maintenance | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    vesselId: '',
    vesselName: '',
    serviceType: 'Docking Tahunan (Annual Survey)' as MaintenanceType,
    dockLocation: 'Galangan Kapal PT PAL Indonesia, Surabaya',
    startDate: '',
    estimatedCompletionDate: '',
    estimatedCostIdr: 350000000,
    actualCostIdr: 0,
    status: 'Terjadwal' as MaintenanceStatus,
    leadEngineer: 'Ir. Agus Santoso, ST',
    reportNotes: ''
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.vesselId) {
      errors.vesselId = 'Silakan pilih kapal yang masuk jadwal perawatan.';
    }
    if (!formData.dockLocation.trim() || formData.dockLocation.trim().length < 3) {
      errors.dockLocation = 'Lokasi dok / galangan kapal wajib diisi.';
    }
    if (!formData.startDate) {
      errors.startDate = 'Tanggal mulai perawatan wajib diisi.';
    }
    if (!formData.estimatedCompletionDate) {
      errors.estimatedCompletionDate = 'Estimasi tanggal selesai dok wajib diisi.';
    }
    if (formData.startDate && formData.estimatedCompletionDate) {
      if (new Date(formData.estimatedCompletionDate) < new Date(formData.startDate)) {
        errors.estimatedCompletionDate = 'Tanggal selesai harus sama atau setelah tanggal mulai.';
      }
    }
    if (isNaN(formData.estimatedCostIdr) || formData.estimatedCostIdr <= 0) {
      errors.estimatedCostIdr = 'Estimasi biaya dok harus berupa angka lebih dari 0.';
    }
    if (!formData.leadEngineer.trim()) {
      errors.leadEngineer = 'Nama penanggung jawab teknis / surveyor wajib diisi.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const openCreateModal = () => {
    setEditingMaintenance(null);
    const defaultVessel = vessels[0];
    const today = new Date().toISOString().slice(0, 10);
    const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    setFormData({
      vesselId: defaultVessel ? defaultVessel.id : '',
      vesselName: defaultVessel ? defaultVessel.name : '',
      serviceType: 'Docking Tahunan (Annual Survey)',
      dockLocation: 'Galangan Dok PT PAL Indonesia, Ujung Surabaya',
      startDate: today,
      estimatedCompletionDate: nextMonth,
      estimatedCostIdr: 450000000,
      actualCostIdr: 0,
      status: 'Terjadwal',
      leadEngineer: 'Ir. Agus Santoso, ST',
      reportNotes: 'Inspeksi berkala katup hisap laut, propeller, dan sertifikasi lambung kapal oleh BKI.'
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (item: Maintenance) => {
    setEditingMaintenance(item);
    setFormData({
      vesselId: item.vesselId,
      vesselName: item.vesselName,
      serviceType: item.serviceType,
      dockLocation: item.dockLocation,
      startDate: item.startDate,
      estimatedCompletionDate: item.estimatedCompletionDate,
      estimatedCostIdr: item.estimatedCostIdr,
      actualCostIdr: item.actualCostIdr || 0,
      status: item.status,
      leadEngineer: item.leadEngineer,
      reportNotes: item.reportNotes || ''
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
      onNotify('error', 'Validasi Gagal', 'Harap lengkapi formulir perawatan dengan benar.');
      return;
    }

    setIsSaving(true);
    try {
      if (editingMaintenance) {
        await updateDoc(doc(db, 'maintenances', editingMaintenance.id), {
          ...formData,
          updatedAt: serverTimestamp()
        });

        await addDoc(collection(db, 'operational_logs'), {
          title: `Perawatan Dok Diperbarui: ${formData.vesselName}`,
          description: `${formData.serviceType} di ${formData.dockLocation}, status: ${formData.status}`,
          category: 'DOK',
          performedBy: 'Admin Teknis',
          timestamp: serverTimestamp()
        });

        onNotify('success', 'Jadwal Dok Disimpan', `Perawatan untuk ${formData.vesselName} berhasil diperbarui.`);
      } else {
        await addDoc(collection(db, 'maintenances'), {
          ...formData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        await addDoc(collection(db, 'operational_logs'), {
          title: `Jadwal Dok Didaftarkan: ${formData.vesselName}`,
          description: `${formData.serviceType} dijadwalkan pada ${formData.startDate}`,
          category: 'DOK',
          performedBy: 'Admin Teknis',
          timestamp: serverTimestamp()
        });

        onNotify('success', 'Dok Terdaftar', `Jadwal perawatan ${formData.vesselName} telah disimpan ke Firestore.`);
      }

      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Save Maintenance Error:', err);
      onNotify('error', 'Gagal Menyimpan', err?.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'maintenances', deleteTarget.id));

      await addDoc(collection(db, 'operational_logs'), {
        title: `Jadwal Dok Dihapus: ${deleteTarget.vesselName}`,
        description: `Servis ${deleteTarget.serviceType} dihapus dari Firestore.`,
        category: 'DOK',
        performedBy: 'Admin Teknis',
        timestamp: serverTimestamp()
      });

      onNotify('success', 'Data Dihapus', 'Jadwal pemeliharaan berhasil dihapus.');
      setDeleteTarget(null);
    } catch (err: any) {
      console.error('Delete Maintenance Error:', err);
      onNotify('error', 'Gagal Menghapus', err?.message || 'Kendala koneksi Firestore.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleQuickStatusChange = async (item: Maintenance, newStatus: MaintenanceStatus) => {
    try {
      await updateDoc(doc(db, 'maintenances', item.id), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      onNotify('info', 'Status Dok Berubah', `${item.vesselName} kini: ${newStatus}`);
    } catch (err: any) {
      onNotify('error', 'Gagal Ubah Status', err?.message || 'Terjadi kesalahan.');
    }
  };

  const filteredMaintenances = maintenances.filter((m) => {
    const matchesSearch = 
      m.vesselName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.serviceType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.dockLocation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.leadEngineer.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || m.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Wrench className="w-6 h-6 text-blue-600" />
            Dok, Inspeksi & Pemeliharaan Armada
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Pencatatan jadwal survey tahunan, overhaul mesin, sertifikasi Biro Klasifikasi Indonesia (BKI), dan anggaran galangan kapal.
          </p>
        </div>

        <button
          id="btn-tambah-dok"
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium text-sm shadow-sm shadow-blue-600/25 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Jadwalkan Servis Dok</span>
        </button>
      </div>

      {/* Control Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative w-full md:flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            id="search-maintenance-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nama kapal, jenis servis, galangan dok, atau insinyur..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-sm text-slate-800 placeholder-slate-400 bg-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            id="filter-maintenance-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full md:w-56 py-2 px-3 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-700 bg-white focus:outline-hidden focus:border-blue-500"
          >
            <option value="ALL">Semua Status Pemeliharaan</option>
            {MAINTENANCE_STATUSES.map((st) => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Maintenance Grid */}
      {isLoading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-3 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Memuat data pemeliharaan dok dari Firestore...</p>
        </div>
      ) : filteredMaintenances.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <Wrench className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900">Tidak ada jadwal pemeliharaan kapal</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            {searchTerm || statusFilter !== 'ALL'
              ? 'Silakan sesuaikan kriteria filter pencarian Anda.'
              : 'Semua armada kapal dalam kondisi prima atau belum ada jadwal docking yang dicatat.'}
          </p>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white shadow-sm"
          >
            Jadwalkan Servis Dok
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMaintenances.map((item) => {
            const isCompleted = item.status === 'Selesai';
            const isInProgress = item.status === 'Sedang Berjalan';
            const isScheduled = item.status === 'Terjadwal';

            return (
              <div
                key={item.id}
                id={`maintenance-card-${item.id}`}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                    <div>
                      <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wide">
                        {item.vesselName}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                        {item.serviceType}
                      </h3>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                        isCompleted
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : isInProgress
                          ? 'bg-sky-50 text-sky-700 border-sky-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isCompleted ? 'bg-emerald-500' : isInProgress ? 'bg-sky-500 animate-pulse' : 'bg-amber-500'
                        }`}
                      />
                      {item.status}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="mt-3.5 space-y-2 text-xs text-slate-600">
                    <div className="bg-slate-50 p-2.5 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">Galangan Dok:</span>
                        <span className="font-semibold text-slate-800 text-right truncate max-w-[170px]">
                          {item.dockLocation}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                        <span className="text-slate-400 text-[11px]">Insinyur/Surveyor:</span>
                        <span className="font-semibold text-slate-800">
                          {item.leadEngineer}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="p-2 rounded-xl bg-slate-50">
                        <span className="text-[10px] text-slate-400 block">Mulai Dok</span>
                        <span className="font-bold text-slate-800 text-xs">
                          {item.startDate}
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-50">
                        <span className="text-[10px] text-slate-400 block">Est. Selesai</span>
                        <span className="font-bold text-slate-800 text-xs">
                          {item.estimatedCompletionDate}
                        </span>
                      </div>
                    </div>

                    {/* Cost */}
                    <div className="p-2.5 rounded-xl bg-blue-50/50 border border-blue-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Estimasi Anggaran</span>
                        <span className="font-bold text-blue-900 text-xs">
                          Rp {item.estimatedCostIdr.toLocaleString('id-ID')}
                        </span>
                      </div>
                      {item.actualCostIdr && item.actualCostIdr > 0 ? (
                        <div className="text-right">
                          <span className="text-[10px] text-emerald-700 block font-semibold">Realisasi</span>
                          <span className="font-bold text-emerald-800 text-xs">
                            Rp {item.actualCostIdr.toLocaleString('id-ID')}
                          </span>
                        </div>
                      ) : null}
                    </div>

                    {item.reportNotes && (
                      <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-lg">
                        "{item.reportNotes}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <select
                    value={item.status}
                    onChange={(e) => handleQuickStatusChange(item, e.target.value as MaintenanceStatus)}
                    className="text-[11px] font-medium py-1 px-2 rounded-lg border border-slate-200 text-slate-700 bg-white"
                  >
                    {MAINTENANCE_STATUSES.map((st) => (
                      <option key={st} value={st}>Status: {st}</option>
                    ))}
                  </select>

                  <div className="flex items-center gap-1">
                    <button
                      id={`edit-maintenance-${item.id}`}
                      type="button"
                      onClick={() => openEditModal(item)}
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Ubah Servis"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      id={`delete-maintenance-${item.id}`}
                      type="button"
                      onClick={() => setDeleteTarget(item)}
                      className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Hapus Servis"
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
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {editingMaintenance ? `Ubah Jadwal Dok: ${editingMaintenance.vesselName}` : 'Jadwalkan Perawatan Dok Kapal'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Tersimpan langsung di Firebase Cloud Firestore
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
                {/* Pilih Kapal */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kapal Armada <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="maint-vessel-select"
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

                {/* Jenis Servis */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kategori Perawatan & Servis
                  </label>
                  <select
                    id="maint-type-select"
                    value={formData.serviceType}
                    onChange={(e) => setFormData({ ...formData, serviceType: e.target.value as MaintenanceType })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-800 bg-white"
                  >
                    {MAINTENANCE_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Lokasi Galangan */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Lokasi Galangan Dok (Shipyard) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="maint-dock-input"
                    type="text"
                    value={formData.dockLocation}
                    onChange={(e) => setFormData({ ...formData, dockLocation: e.target.value })}
                    placeholder="Galangan Dok PT PAL Indonesia Surabaya / PT Batam Shipyard"
                    className={`w-full px-3.5 py-2 rounded-xl border text-sm text-slate-800 ${
                      formErrors.dockLocation ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200'
                    }`}
                  />
                  {formErrors.dockLocation && (
                    <p className="text-xs text-rose-600 mt-1">{formErrors.dockLocation}</p>
                  )}
                </div>

                {/* Tanggal Mulai */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal Mulai Masuk Dok <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="maint-start-input"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border text-sm text-slate-800 ${
                      formErrors.startDate ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200'
                    }`}
                  />
                  {formErrors.startDate && (
                    <p className="text-xs text-rose-600 mt-1">{formErrors.startDate}</p>
                  )}
                </div>

                {/* Estimasi Selesai */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Estimasi Selesai Uji Coba Laut <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="maint-end-input"
                    type="date"
                    value={formData.estimatedCompletionDate}
                    onChange={(e) => setFormData({ ...formData, estimatedCompletionDate: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border text-sm text-slate-800 ${
                      formErrors.estimatedCompletionDate ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200'
                    }`}
                  />
                  {formErrors.estimatedCompletionDate && (
                    <p className="text-xs text-rose-600 mt-1">{formErrors.estimatedCompletionDate}</p>
                  )}
                </div>

                {/* Estimasi Biaya */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Estimasi Anggaran (IDR) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="maint-cost-input"
                    type="number"
                    min="1"
                    value={formData.estimatedCostIdr}
                    onChange={(e) => setFormData({ ...formData, estimatedCostIdr: parseInt(e.target.value) || 0 })}
                    className={`w-full px-3 py-2 rounded-xl border text-sm text-slate-800 ${
                      formErrors.estimatedCostIdr ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200'
                    }`}
                  />
                  {formErrors.estimatedCostIdr && (
                    <p className="text-xs text-rose-600 mt-1">{formErrors.estimatedCostIdr}</p>
                  )}
                </div>

                {/* Realisasi Biaya (Optional) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Biaya Realisasi (IDR)
                  </label>
                  <input
                    id="maint-actual-cost-input"
                    type="number"
                    min="0"
                    value={formData.actualCostIdr}
                    onChange={(e) => setFormData({ ...formData, actualCostIdr: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-800"
                  />
                  <span className="text-[10px] text-slate-400">Isi jika servis telah rampung</span>
                </div>

                {/* Penanggung Jawab */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Insinyur Teknisi / Surveyor BKI <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="maint-engineer-input"
                    type="text"
                    value={formData.leadEngineer}
                    onChange={(e) => setFormData({ ...formData, leadEngineer: e.target.value })}
                    placeholder="Ir. Agus Santoso, ST"
                    className={`w-full px-3 py-2 rounded-xl border text-sm text-slate-800 ${
                      formErrors.leadEngineer ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200'
                    }`}
                  />
                  {formErrors.leadEngineer && (
                    <p className="text-xs text-rose-600 mt-1">{formErrors.leadEngineer}</p>
                  )}
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status Pengerjaan
                  </label>
                  <select
                    id="maint-status-select"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as MaintenanceStatus })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-800 bg-white"
                  >
                    {MAINTENANCE_STATUSES.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                {/* Catatan Servis */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Laporan Teknis & Catatan Dok
                  </label>
                  <textarea
                    id="maint-notes-input"
                    rows={2}
                    value={formData.reportNotes}
                    onChange={(e) => setFormData({ ...formData, reportNotes: e.target.value })}
                    placeholder="Rincian suku cadang diganti, hasil uji sea trial, dan rekomendasi survey..."
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
                  id="submit-maintenance-form"
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition flex items-center gap-2 cursor-pointer"
                >
                  {isSaving && (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                  {editingMaintenance ? 'Simpan Servis' : 'Daftarkan Servis'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      <ConfirmModal
        isOpen={deleteTarget !== null}
        title="Hapus Jadwal Perawatan Dok"
        message={`Apakah Anda yakin ingin menghapus catatan servis "${deleteTarget?.serviceType}" untuk kapal "${deleteTarget?.vesselName}"?`}
        confirmLabel="Hapus Data"
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
