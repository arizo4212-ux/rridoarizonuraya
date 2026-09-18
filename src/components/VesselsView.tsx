import React, { useState } from 'react';
import { Vessel, VesselType, VesselStatus } from '../types/shipping';
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
  Ship, 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  Anchor, 
  Gauge, 
  Users, 
  Calendar, 
  Navigation, 
  AlertCircle, 
  CheckCircle2, 
  X,
  Compass
} from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

interface VesselsViewProps {
  vessels: Vessel[];
  isLoading: boolean;
  onNotify: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
}

const VESSEL_TYPES: VesselType[] = [
  'Kapal Kontainer',
  'Bulk Carrier (Curah Kering)',
  'Tanker Minyak & Kimia',
  'Ro-Ro Penumpang & Kendaraan',
  'Tugboat & Tongkang',
  'General Cargo'
];

const VESSEL_STATUSES: VesselStatus[] = [
  'Berlayar',
  'Bersandar di Pelabuhan',
  'Siap Muat',
  'Dalam Pemeliharaan / Dok'
];

export const VesselsView: React.FC<VesselsViewProps> = ({
  vessels,
  isLoading,
  onNotify
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVessel, setEditingVessel] = useState<Vessel | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<Vessel | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    type: 'Kapal Kontainer' as VesselType,
    callSign: '',
    imoNumber: '',
    dwt: 15000,
    teuCapacity: 1200,
    builtYear: 2020,
    flag: 'Indonesia',
    status: 'Bersandar di Pelabuhan' as VesselStatus,
    currentLocation: 'Pelabuhan Tanjung Priok, Jakarta',
    captain: '',
    crewCount: 20,
    fuelLevelPercent: 85,
    operationalNotes: ''
  });

  // Strict Validation Errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim() || formData.name.trim().length < 3) {
      errors.name = 'Nama kapal wajib diisi (minimal 3 karakter).';
    }
    if (!formData.callSign.trim() || formData.callSign.trim().length < 3) {
      errors.callSign = 'Call Sign wajib diisi (contoh: PK-ABCD).';
    }
    if (!formData.imoNumber.trim() || !formData.imoNumber.toUpperCase().startsWith('IMO')) {
      errors.imoNumber = 'Nomor IMO harus diawali dengan "IMO" (contoh: IMO 9876543).';
    }
    if (isNaN(formData.dwt) || formData.dwt <= 0) {
      errors.dwt = 'Bobot DWT harus berupa angka positif lebih dari 0.';
    }
    if (isNaN(formData.teuCapacity) || formData.teuCapacity < 0) {
      errors.teuCapacity = 'Kapasitas TEU minimal 0 (isi 0 jika bukan kapal kontainer).';
    }
    const currentYear = new Date().getFullYear();
    if (isNaN(formData.builtYear) || formData.builtYear < 1960 || formData.builtYear > currentYear) {
      errors.builtYear = `Tahun pembuatan harus antara 1960 dan ${currentYear}.`;
    }
    if (!formData.currentLocation.trim()) {
      errors.currentLocation = 'Lokasi atau pelabuhan saat ini wajib diisi.';
    }
    if (!formData.captain.trim() || formData.captain.trim().length < 3) {
      errors.captain = 'Nama Nakhoda / Kapten wajib diisi lengkap.';
    }
    if (isNaN(formData.crewCount) || formData.crewCount < 1) {
      errors.crewCount = 'Jumlah awak kapal minimal 1 orang.';
    }
    if (isNaN(formData.fuelLevelPercent) || formData.fuelLevelPercent < 0 || formData.fuelLevelPercent > 100) {
      errors.fuelLevelPercent = 'Level bahan bakar harus antara 0% hingga 100%.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const openCreateModal = () => {
    setEditingVessel(null);
    setFormData({
      name: '',
      type: 'Kapal Kontainer',
      callSign: 'PK-',
      imoNumber: 'IMO ',
      dwt: 20000,
      teuCapacity: 1500,
      builtYear: 2019,
      flag: 'Indonesia',
      status: 'Siap Muat',
      currentLocation: 'Pelabuhan Tanjung Priok, Jakarta',
      captain: '',
      crewCount: 22,
      fuelLevelPercent: 90,
      operationalNotes: ''
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (vessel: Vessel) => {
    setEditingVessel(vessel);
    setFormData({
      name: vessel.name,
      type: vessel.type,
      callSign: vessel.callSign,
      imoNumber: vessel.imoNumber,
      dwt: vessel.dwt,
      teuCapacity: vessel.teuCapacity,
      builtYear: vessel.builtYear,
      flag: vessel.flag,
      status: vessel.status,
      currentLocation: vessel.currentLocation,
      captain: vessel.captain,
      crewCount: vessel.crewCount,
      fuelLevelPercent: vessel.fuelLevelPercent,
      operationalNotes: vessel.operationalNotes || ''
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      onNotify('error', 'Validasi Gagal', 'Harap lengkapi semua data formulir kapal sesuai ketentuan.');
      return;
    }

    setIsSaving(true);
    try {
      if (editingVessel) {
        // Update in Firestore
        const docRef = doc(db, 'vessels', editingVessel.id);
        await updateDoc(docRef, {
          ...formData,
          updatedAt: serverTimestamp()
        });

        // Add log
        await addDoc(collection(db, 'operational_logs'), {
          title: `Data Kapal Diperbarui: ${formData.name}`,
          description: `Status: ${formData.status}, Lokasi: ${formData.currentLocation}, Kapten: ${formData.captain}`,
          category: 'ARMADA',
          performedBy: 'Admin Operasional',
          timestamp: serverTimestamp()
        });

        onNotify('success', 'Pembaruan Berhasil', `Data armada "${formData.name}" berhasil diperbarui.`);
      } else {
        // Create in Firestore
        const docRef = await addDoc(collection(db, 'vessels'), {
          ...formData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        // Add log
        await addDoc(collection(db, 'operational_logs'), {
          title: `Kapal Baru Terdaftar: ${formData.name}`,
          description: `Pendaftaran kapal baru dengan Call Sign ${formData.callSign} dan kapasitas ${formData.dwt} DWT`,
          category: 'ARMADA',
          performedBy: 'Admin Operasional',
          timestamp: serverTimestamp()
        });

        onNotify('success', 'Pendaftaran Berhasil', `Kapal "${formData.name}" telah terdaftar ke database Firestore.`);
      }

      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Save Vessel Error:', err);
      onNotify('error', 'Gagal Menyimpan', err?.message || 'Terjadi kesalahan saat menyimpan data kapal.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'vessels', deleteTarget.id));

      await addDoc(collection(db, 'operational_logs'), {
        title: `Kapal Dihapus dari Armada: ${deleteTarget.name}`,
        description: `Kapal IMO ${deleteTarget.imoNumber} telah dihapus dari sistem oleh administrator.`,
        category: 'ARMADA',
        performedBy: 'Admin Operasional',
        timestamp: serverTimestamp()
      });

      onNotify('success', 'Data Dihapus', `Kapal "${deleteTarget.name}" berhasil dihapus dari database.`);
      setDeleteTarget(null);
    } catch (err: any) {
      console.error('Delete Vessel Error:', err);
      onNotify('error', 'Gagal Menghapus', err?.message || 'Terjadi kendala saat menghapus kapal.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleQuickStatusChange = async (vessel: Vessel, newStatus: VesselStatus) => {
    try {
      await updateDoc(doc(db, 'vessels', vessel.id), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      onNotify('info', 'Status Kapal Berubah', `${vessel.name} kini berstatus: ${newStatus}`);
    } catch (err: any) {
      onNotify('error', 'Gagal Ubah Status', err?.message || 'Koneksi database bermasalah.');
    }
  };

  // Filter and search
  const filteredVessels = vessels.filter((v) => {
    const matchesSearch = 
      v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.callSign.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.imoNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.captain.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.currentLocation.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || v.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || v.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Ship className="w-6 h-6 text-blue-600" />
            Manajemen Armada Kapal
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Kelola data kapal komersial, bobot DWT, kapasitas TEU, posisi real-time, dan status operasional.
          </p>
        </div>

        <button
          id="btn-tambah-kapal"
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium text-sm shadow-sm shadow-blue-600/25 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Kapal Baru</span>
        </button>
      </div>

      {/* Control Bar: Search & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative w-full md:flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            id="search-vessels-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nama kapal, Call Sign, IMO, Nakhoda, atau pelabuhan..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-sm text-slate-800 placeholder-slate-400 bg-white"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            id="filter-vessel-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full md:w-48 py-2 px-3 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-700 bg-white focus:outline-hidden focus:border-blue-500"
          >
            <option value="ALL">Semua Status Operasional</option>
            {VESSEL_STATUSES.map((st) => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>

          <select
            id="filter-vessel-type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full md:w-48 py-2 px-3 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-700 bg-white focus:outline-hidden focus:border-blue-500"
          >
            <option value="ALL">Semua Tipe Kapal</option>
            {VESSEL_TYPES.map((tp) => (
              <option key={tp} value={tp}>{tp}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid List of Vessels */}
      {isLoading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-3 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Memuat data armada dari Firebase Firestore...</p>
        </div>
      ) : filteredVessels.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <Ship className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900">Tidak ada data armada kapal ditemukan</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            {searchTerm || statusFilter !== 'ALL' || typeFilter !== 'ALL'
              ? 'Silakan ubah filter pencarian untuk menemukan data yang diinginkan.'
              : 'Belum ada data kapal tersimpan. Mulai daftarkan armada pertama perusahaan Anda.'}
          </p>
          {(searchTerm || statusFilter !== 'ALL' || typeFilter !== 'ALL') ? (
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('ALL');
                setTypeFilter('ALL');
              }}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700"
            >
              Reset Filter
            </button>
          ) : (
            <button
              onClick={openCreateModal}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white shadow-sm"
            >
              Tambah Kapal Pertama
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredVessels.map((vessel) => {
            const isSailing = vessel.status === 'Berlayar';
            const isDocked = vessel.status === 'Bersandar di Pelabuhan';
            const isReady = vessel.status === 'Siap Muat';
            const isMaintenance = vessel.status === 'Dalam Pemeliharaan / Dok';

            return (
              <div
                key={vessel.id}
                id={`vessel-card-${vessel.id}`}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-200 p-5 flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar Card */}
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                    <div>
                      <span className="text-[11px] font-semibold text-blue-600 tracking-wide uppercase">
                        {vessel.type}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 leading-snug">
                        {vessel.name}
                      </h3>
                      <div className="flex items-center gap-2 text-xs font-mono text-slate-500 mt-0.5">
                        <span>{vessel.callSign}</span>
                        <span>•</span>
                        <span>{vessel.imoNumber}</span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                          isSailing
                            ? 'bg-sky-50 text-sky-700 border-sky-200'
                            : isReady
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : isDocked
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isSailing
                              ? 'bg-sky-500 animate-pulse'
                              : isReady
                              ? 'bg-emerald-500'
                              : isDocked
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                        />
                        {vessel.status}
                      </span>
                    </div>
                  </div>

                  {/* Ship Details */}
                  <div className="mt-3.5 space-y-2.5 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Navigation className="w-3.5 h-3.5 text-slate-400" />
                        Lokasi Terkini:
                      </span>
                      <span className="font-semibold text-slate-800 text-right max-w-[180px] truncate">
                        {vessel.currentLocation}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Anchor className="w-3.5 h-3.5 text-slate-400" />
                        Nakhoda (Kapten):
                      </span>
                      <span className="font-medium text-slate-800">
                        {vessel.captain}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                      <div className="bg-slate-50 p-2 rounded-xl">
                        <span className="text-[10px] text-slate-400 block">Kapasitas DWT</span>
                        <span className="font-bold text-slate-800 text-xs">
                          {vessel.dwt.toLocaleString('id-ID')} Ton
                        </span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-xl">
                        <span className="text-[10px] text-slate-400 block">Kapasitas TEU</span>
                        <span className="font-bold text-slate-800 text-xs">
                          {vessel.teuCapacity > 0 ? `${vessel.teuCapacity.toLocaleString('id-ID')} TEU` : 'Non-Kontainer'}
                        </span>
                      </div>
                    </div>

                    {/* Fuel & Crew */}
                    <div className="pt-2">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-slate-500 flex items-center gap-1">
                          <Gauge className="w-3.5 h-3.5" />
                          Bahan Bakar MFO/HSD
                        </span>
                        <span className="font-bold text-slate-800">{vessel.fuelLevelPercent}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            vessel.fuelLevelPercent > 50
                              ? 'bg-blue-600'
                              : vessel.fuelLevelPercent > 20
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                          style={{ width: `${vessel.fuelLevelPercent}%` }}
                        />
                      </div>
                    </div>

                    {vessel.operationalNotes && (
                      <p className="text-[11px] text-slate-500 bg-slate-50/80 p-2 rounded-lg italic">
                        "{vessel.operationalNotes}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Card Actions & Quick Status */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <select
                      value={vessel.status}
                      onChange={(e) => handleQuickStatusChange(vessel, e.target.value as VesselStatus)}
                      className="text-[11px] font-medium py-1 px-2 rounded-lg border border-slate-200 text-slate-700 bg-white hover:border-slate-300"
                    >
                      {VESSEL_STATUSES.map((st) => (
                        <option key={st} value={st}>Ubah: {st}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      id={`edit-vessel-${vessel.id}`}
                      type="button"
                      onClick={() => openEditModal(vessel)}
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Ubah Data Kapal"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      id={`delete-vessel-${vessel.id}`}
                      type="button"
                      onClick={() => setDeleteTarget(vessel)}
                      className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Hapus Kapal"
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
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                  <Ship className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {editingVessel ? `Ubah Data Kapal: ${editingVessel.name}` : 'Daftarkan Kapal Baru ke Armada'}
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

            {/* Modal Form */}
            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[78vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nama Kapal */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Kapal <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="vessel-name-input"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contoh: KM Samudera Raya 05"
                    className={`w-full px-3.5 py-2 rounded-xl border text-sm text-slate-800 ${
                      formErrors.name ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200 focus:border-blue-500'
                    }`}
                  />
                  {formErrors.name && (
                    <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> {formErrors.name}
                    </p>
                  )}
                </div>

                {/* Tipe Kapal */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tipe Kapal <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="vessel-type-select"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as VesselType })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-800 bg-white"
                  >
                    {VESSEL_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Status Operasional */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status Operasional <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="vessel-status-select"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as VesselStatus })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-800 bg-white"
                  >
                    {VESSEL_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Call Sign */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Call Sign Radio <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="vessel-callsign-input"
                    type="text"
                    value={formData.callSign}
                    onChange={(e) => setFormData({ ...formData, callSign: e.target.value.toUpperCase() })}
                    placeholder="PK-XXXX"
                    className={`w-full px-3 py-2 rounded-xl border text-sm text-slate-800 uppercase ${
                      formErrors.callSign ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200'
                    }`}
                  />
                  {formErrors.callSign && (
                    <p className="text-xs text-rose-600 mt-1">{formErrors.callSign}</p>
                  )}
                </div>

                {/* IMO Number */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nomor IMO <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="vessel-imo-input"
                    type="text"
                    value={formData.imoNumber}
                    onChange={(e) => setFormData({ ...formData, imoNumber: e.target.value })}
                    placeholder="IMO 9876543"
                    className={`w-full px-3 py-2 rounded-xl border text-sm text-slate-800 ${
                      formErrors.imoNumber ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200'
                    }`}
                  />
                  {formErrors.imoNumber && (
                    <p className="text-xs text-rose-600 mt-1">{formErrors.imoNumber}</p>
                  )}
                </div>

                {/* Bobot DWT */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bobot Mati (DWT Ton) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="vessel-dwt-input"
                    type="number"
                    min="1"
                    value={formData.dwt}
                    onChange={(e) => setFormData({ ...formData, dwt: parseInt(e.target.value) || 0 })}
                    className={`w-full px-3 py-2 rounded-xl border text-sm text-slate-800 ${
                      formErrors.dwt ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200'
                    }`}
                  />
                  {formErrors.dwt && (
                    <p className="text-xs text-rose-600 mt-1">{formErrors.dwt}</p>
                  )}
                </div>

                {/* Kapasitas TEU */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kapasitas Kontainer (TEU)
                  </label>
                  <input
                    id="vessel-teu-input"
                    type="number"
                    min="0"
                    value={formData.teuCapacity}
                    onChange={(e) => setFormData({ ...formData, teuCapacity: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-800"
                  />
                  <span className="text-[10px] text-slate-400">0 jika bukan kapal peti kemas</span>
                </div>

                {/* Tahun Pembuatan */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tahun Pembuatan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="vessel-year-input"
                    type="number"
                    value={formData.builtYear}
                    onChange={(e) => setFormData({ ...formData, builtYear: parseInt(e.target.value) || 2020 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-800"
                  />
                  {formErrors.builtYear && (
                    <p className="text-xs text-rose-600 mt-1">{formErrors.builtYear}</p>
                  )}
                </div>

                {/* Nakhoda / Kapten */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nakhoda / Kapten Kapal <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="vessel-captain-input"
                    type="text"
                    value={formData.captain}
                    onChange={(e) => setFormData({ ...formData, captain: e.target.value })}
                    placeholder="Capt. Hendra Wijaya, M.Mar"
                    className={`w-full px-3 py-2 rounded-xl border text-sm text-slate-800 ${
                      formErrors.captain ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200'
                    }`}
                  />
                  {formErrors.captain && (
                    <p className="text-xs text-rose-600 mt-1">{formErrors.captain}</p>
                  )}
                </div>

                {/* Lokasi Terkini */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Lokasi Terkini / Pelabuhan Sandar <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="vessel-location-input"
                    type="text"
                    value={formData.currentLocation}
                    onChange={(e) => setFormData({ ...formData, currentLocation: e.target.value })}
                    placeholder="Contoh: Pelabuhan Tanjung Priok, Dermaga 104"
                    className={`w-full px-3 py-2 rounded-xl border text-sm text-slate-800 ${
                      formErrors.currentLocation ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200'
                    }`}
                  />
                  {formErrors.currentLocation && (
                    <p className="text-xs text-rose-600 mt-1">{formErrors.currentLocation}</p>
                  )}
                </div>

                {/* Jumlah Awak */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jumlah Awak (Crew)
                  </label>
                  <input
                    id="vessel-crew-input"
                    type="number"
                    min="1"
                    value={formData.crewCount}
                    onChange={(e) => setFormData({ ...formData, crewCount: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-800"
                  />
                </div>

                {/* Level Bahan Bakar */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Level Bahan Bakar (%) ({formData.fuelLevelPercent}%)
                  </label>
                  <input
                    id="vessel-fuel-input"
                    type="range"
                    min="0"
                    max="100"
                    value={formData.fuelLevelPercent}
                    onChange={(e) => setFormData({ ...formData, fuelLevelPercent: parseInt(e.target.value) || 0 })}
                    className="w-full mt-2 accent-blue-600"
                  />
                </div>

                {/* Catatan Operasional */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Catatan Operasional & Mesin
                  </label>
                  <textarea
                    id="vessel-notes-input"
                    rows={2}
                    value={formData.operationalNotes}
                    onChange={(e) => setFormData({ ...formData, operationalNotes: e.target.value })}
                    placeholder="Catatan kondisi mesin, rute reguler, atau instruksi khusus..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-800 resize-none"
                  />
                </div>
              </div>

              {/* Form Actions */}
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
                  id="submit-vessel-form"
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition flex items-center gap-2 cursor-pointer"
                >
                  {isSaving && (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                  {editingVessel ? 'Simpan Perubahan' : 'Daftarkan Kapal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={deleteTarget !== null}
        title="Konfirmasi Penghapusan Kapal"
        message={`Apakah Anda yakin ingin menghapus kapal "${deleteTarget?.name}" (Call Sign: ${deleteTarget?.callSign}) dari database Firestore? Aksi ini akan menghapus data secara permanen.`}
        confirmLabel="Hapus Permanen"
        cancelLabel="Batal"
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
