import React, { useState } from 'react';
import { Cargo, CargoType, CargoStatus, PaymentStatus, Voyage } from '../types/shipping';
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
  Package, 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  FileText, 
  Weight, 
  DollarSign, 
  CheckCircle2, 
  AlertCircle, 
  X,
  CreditCard,
  Truck,
  Building2,
  Printer
} from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

interface CargoViewProps {
  cargoes: Cargo[];
  voyages: Voyage[];
  isLoading: boolean;
  onNotify: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
}

const CARGO_TYPES: CargoType[] = [
  'FCL Container',
  'LCL Container',
  'Curah Kering (Batu Bara / Semen)',
  'Curah Cair (CPO / BBM)',
  'Alat Berat & Mesin',
  'Break Bulk / Pallet'
];

const CARGO_STATUSES: CargoStatus[] = [
  'Booking Terdaftar',
  'Proses Pemuatan (Loading)',
  'Dalam Pengiriman Laut',
  'Bongkar di Pelabuhan Tujuan',
  'Telah Diterima (Delivered)'
];

const PAYMENT_STATUSES: PaymentStatus[] = [
  'Lunas',
  'Belum Lunas',
  'DP / Bertahap'
];

export const CargoView: React.FC<CargoViewProps> = ({
  cargoes,
  voyages,
  isLoading,
  onNotify
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCargo, setEditingCargo] = useState<Cargo | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Manifest print/preview modal
  const [previewCargo, setPreviewCargo] = useState<Cargo | null>(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<Cargo | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    blNumber: '',
    voyageId: '',
    voyageNumber: '',
    vesselName: '',
    shipper: '',
    consignee: '',
    cargoType: 'FCL Container' as CargoType,
    weightKg: 25000,
    volumeCbm: 40,
    tariffIdr: 45000000,
    paymentStatus: 'Belum Lunas' as PaymentStatus,
    status: 'Booking Terdaftar' as CargoStatus,
    handlingNotes: ''
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.blNumber.trim() || formData.blNumber.trim().length < 5) {
      errors.blNumber = 'Nomor Bill of Lading (B/L) wajib diisi (minimal 5 karakter).';
    }
    if (!formData.shipper.trim() || formData.shipper.trim().length < 3) {
      errors.shipper = 'Nama Pengirim (Shipper) wajib diisi lengkap.';
    }
    if (!formData.consignee.trim() || formData.consignee.trim().length < 3) {
      errors.consignee = 'Nama Penerima Kargo (Consignee) wajib diisi lengkap.';
    }
    if (isNaN(formData.weightKg) || formData.weightKg <= 0) {
      errors.weightKg = 'Berat kargo harus berupa angka lebih dari 0 kg.';
    }
    if (isNaN(formData.volumeCbm) || formData.volumeCbm < 0) {
      errors.volumeCbm = 'Volume kargo minimal 0 CBM.';
    }
    if (isNaN(formData.tariffIdr) || formData.tariffIdr < 0) {
      errors.tariffIdr = 'Tarif freight kargo tidak boleh bernilai negatif.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const openCreateModal = () => {
    setEditingCargo(null);
    const defaultVoyage = voyages[0];

    setFormData({
      blNumber: `BL-JKT-SUB-${Math.floor(1000 + Math.random() * 9000)}`,
      voyageId: defaultVoyage ? defaultVoyage.id : '',
      voyageNumber: defaultVoyage ? defaultVoyage.voyageNumber : '',
      vesselName: defaultVoyage ? defaultVoyage.vesselName : '',
      shipper: 'PT Indofood CBP Sukses Makmur',
      consignee: 'PT Sumber Alfaria Distribusi',
      cargoType: 'FCL Container',
      weightKg: 28500,
      volumeCbm: 65,
      tariffIdr: 52000000,
      paymentStatus: 'Lunas',
      status: 'Booking Terdaftar',
      handlingNotes: 'Simpan pada dek berpendingin temperatur 4-8°C.'
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (cargo: Cargo) => {
    setEditingCargo(cargo);
    setFormData({
      blNumber: cargo.blNumber,
      voyageId: cargo.voyageId,
      voyageNumber: cargo.voyageNumber,
      vesselName: cargo.vesselName,
      shipper: cargo.shipper,
      consignee: cargo.consignee,
      cargoType: cargo.cargoType,
      weightKg: cargo.weightKg,
      volumeCbm: cargo.volumeCbm,
      tariffIdr: cargo.tariffIdr,
      paymentStatus: cargo.paymentStatus,
      status: cargo.status,
      handlingNotes: cargo.handlingNotes || ''
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleVoyageSelect = (voyageId: string) => {
    const selected = voyages.find((v) => v.id === voyageId);
    setFormData({
      ...formData,
      voyageId,
      voyageNumber: selected ? selected.voyageNumber : '',
      vesselName: selected ? selected.vesselName : ''
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      onNotify('error', 'Validasi Gagal', 'Harap periksa kelengkapan formulir kargo.');
      return;
    }

    setIsSaving(true);
    try {
      if (editingCargo) {
        await updateDoc(doc(db, 'cargoes', editingCargo.id), {
          ...formData,
          updatedAt: serverTimestamp()
        });

        await addDoc(collection(db, 'operational_logs'), {
          title: `Manifes Kargo Diperbarui: ${formData.blNumber}`,
          description: `Kargo ${formData.cargoType} (${formData.weightKg.toLocaleString()} kg) status: ${formData.status}`,
          category: 'KARGO',
          performedBy: 'Admin Kargo',
          timestamp: serverTimestamp()
        });

        onNotify('success', 'Kargo Diperbarui', `Manifes B/L ${formData.blNumber} berhasil disimpan.`);
      } else {
        await addDoc(collection(db, 'cargoes'), {
          ...formData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        await addDoc(collection(db, 'operational_logs'), {
          title: `Kargo Baru Didaftarkan: ${formData.blNumber}`,
          description: `Pengirim: ${formData.shipper}, Penerima: ${formData.consignee}, Tarif: Rp ${formData.tariffIdr.toLocaleString('id-ID')}`,
          category: 'KARGO',
          performedBy: 'Admin Kargo',
          timestamp: serverTimestamp()
        });

        onNotify('success', 'Kargo Terdaftar', `Bill of Lading ${formData.blNumber} telah disimpan ke database Firestore.`);
      }

      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Save Cargo Error:', err);
      onNotify('error', 'Gagal Menyimpan', err?.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'cargoes', deleteTarget.id));

      await addDoc(collection(db, 'operational_logs'), {
        title: `Kargo Dihapus dari Manifes: ${deleteTarget.blNumber}`,
        description: `B/L ${deleteTarget.blNumber} pengirim ${deleteTarget.shipper} dihapus dari Firestore.`,
        category: 'KARGO',
        performedBy: 'Admin Kargo',
        timestamp: serverTimestamp()
      });

      onNotify('success', 'Kargo Dihapus', `Data B/L ${deleteTarget.blNumber} telah dihapus.`);
      setDeleteTarget(null);
    } catch (err: any) {
      console.error('Delete Cargo Error:', err);
      onNotify('error', 'Gagal Menghapus', err?.message || 'Kendala koneksi Firestore.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleQuickStatusChange = async (cargo: Cargo, newStatus: CargoStatus) => {
    try {
      await updateDoc(doc(db, 'cargoes', cargo.id), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      onNotify('info', 'Status Kargo Berubah', `B/L ${cargo.blNumber} kini: ${newStatus}`);
    } catch (err: any) {
      onNotify('error', 'Gagal Ubah Status', err?.message || 'Terjadi kendala.');
    }
  };

  const filteredCargoes = cargoes.filter((c) => {
    const matchesSearch = 
      c.blNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.shipper.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.consignee.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.voyageNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.vesselName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || c.cargoType === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Package className="w-6 h-6 text-blue-600" />
            Manifes Kargo & Bill of Lading (B/L)
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Kelola pengiriman muatan kontainer, curah, tonase kargo, dokumen resi pelayaran, dan status pembayaran freight.
          </p>
        </div>

        <button
          id="btn-tambah-kargo"
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium text-sm shadow-sm shadow-blue-600/25 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Daftarkan Kargo Baru</span>
        </button>
      </div>

      {/* Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative w-full md:flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            id="search-cargoes-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nomor B/L, nama pengirim, penerima, atau nomor pelayaran..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-sm text-slate-800 placeholder-slate-400 bg-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            id="filter-cargo-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full md:w-48 py-2 px-3 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-700 bg-white focus:outline-hidden focus:border-blue-500"
          >
            <option value="ALL">Semua Status Kargo</option>
            {CARGO_STATUSES.map((st) => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>

          <select
            id="filter-cargo-type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full md:w-48 py-2 px-3 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-700 bg-white focus:outline-hidden focus:border-blue-500"
          >
            <option value="ALL">Semua Jenis Kargo</option>
            {CARGO_TYPES.map((tp) => (
              <option key={tp} value={tp}>{tp}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Cargo List / Cards */}
      {isLoading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-3 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Memuat data manifes kargo dari Firestore...</p>
        </div>
      ) : filteredCargoes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900">Tidak ada kargo ditemukan</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            {searchTerm || statusFilter !== 'ALL' || typeFilter !== 'ALL'
              ? 'Silakan ubah filter pencarian B/L kargo Anda.'
              : 'Belum ada manifes kargo terdaftar. Buat dokumen B/L baru untuk pelayaran aktif.'}
          </p>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white shadow-sm"
          >
            Daftarkan Kargo Baru
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCargoes.map((cargo) => {
            const isDelivered = cargo.status === 'Telah Diterima (Delivered)';
            const isTransit = cargo.status === 'Dalam Pengiriman Laut';
            const isPaid = cargo.paymentStatus === 'Lunas';

            return (
              <div
                key={cargo.id}
                id={`cargo-card-${cargo.id}`}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                    <div>
                      <span className="text-[10px] font-mono font-bold tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md inline-block">
                        {cargo.blNumber}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 mt-1">
                        {cargo.cargoType}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {cargo.vesselName} • {cargo.voyageNumber}
                      </p>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                        isDelivered
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : isTransit
                          ? 'bg-sky-50 text-sky-700 border-sky-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isDelivered ? 'bg-emerald-500' : isTransit ? 'bg-sky-500 animate-pulse' : 'bg-amber-500'
                        }`}
                      />
                      {cargo.status}
                    </span>
                  </div>

                  {/* Shipper & Consignee */}
                  <div className="mt-3.5 space-y-2 text-xs">
                    <div className="bg-slate-50 p-2.5 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">Pengirim (Shipper):</span>
                        <span className="font-semibold text-slate-800 text-right truncate max-w-[170px]">
                          {cargo.shipper}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                        <span className="text-slate-400 text-[11px]">Penerima (Consignee):</span>
                        <span className="font-semibold text-slate-800 text-right truncate max-w-[170px]">
                          {cargo.consignee}
                        </span>
                      </div>
                    </div>

                    {/* Weight, Volume, Tariff */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="p-2 rounded-xl bg-slate-50">
                        <span className="text-[10px] text-slate-400 block">Bobot Muatan</span>
                        <span className="font-bold text-slate-800 text-xs">
                          {cargo.weightKg.toLocaleString('id-ID')} Kg
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-50">
                        <span className="text-[10px] text-slate-400 block">Volume Kargo</span>
                        <span className="font-bold text-slate-800 text-xs">
                          {cargo.volumeCbm} CBM
                        </span>
                      </div>
                    </div>

                    {/* Freight Tariff & Payment */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-blue-50/50 border border-blue-100">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Tarif Freight</span>
                        <span className="font-bold text-blue-900 text-xs">
                          Rp {cargo.tariffIdr.toLocaleString('id-ID')}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isPaid
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-amber-100 text-amber-800 border-amber-300'
                        }`}
                      >
                        {cargo.paymentStatus}
                      </span>
                    </div>

                    {cargo.handlingNotes && (
                      <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-lg">
                        "{cargo.handlingNotes}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <select
                    value={cargo.status}
                    onChange={(e) => handleQuickStatusChange(cargo, e.target.value as CargoStatus)}
                    className="text-[11px] font-medium py-1 px-2 rounded-lg border border-slate-200 text-slate-700 bg-white"
                  >
                    {CARGO_STATUSES.map((st) => (
                      <option key={st} value={st}>Status: {st}</option>
                    ))}
                  </select>

                  <div className="flex items-center gap-1">
                    <button
                      id={`preview-cargo-${cargo.id}`}
                      type="button"
                      onClick={() => setPreviewCargo(cargo)}
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Lihat Lembar B/L Resmi"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    <button
                      id={`edit-cargo-${cargo.id}`}
                      type="button"
                      onClick={() => openEditModal(cargo)}
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Ubah Kargo"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      id={`delete-cargo-${cargo.id}`}
                      type="button"
                      onClick={() => setDeleteTarget(cargo)}
                      className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Hapus Kargo"
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
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {editingCargo ? `Ubah Manifes B/L: ${editingCargo.blNumber}` : 'Daftarkan Dokumen Bill of Lading (B/L)'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pencatatan langsung ke Cloud Firestore
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
                {/* No B/L */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nomor Bill of Lading (B/L) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="cargo-bl-input"
                    type="text"
                    value={formData.blNumber}
                    onChange={(e) => setFormData({ ...formData, blNumber: e.target.value.toUpperCase() })}
                    placeholder="BL-JKT-SUB-2508"
                    className={`w-full px-3.5 py-2 rounded-xl border text-sm text-slate-800 ${
                      formErrors.blNumber ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200'
                    }`}
                  />
                  {formErrors.blNumber && (
                    <p className="text-xs text-rose-600 mt-1">{formErrors.blNumber}</p>
                  )}
                </div>

                {/* Pilih Pelayaran Terkait */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jadwal Pelayaran Terkait
                  </label>
                  <select
                    id="cargo-voyage-select"
                    value={formData.voyageId}
                    onChange={(e) => handleVoyageSelect(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-800 bg-white"
                  >
                    <option value="">-- Pilih Trayek Pelayaran --</option>
                    {voyages.map((vy) => (
                      <option key={vy.id} value={vy.id}>
                        {vy.voyageNumber} - {vy.vesselName} ({vy.originPort} → {vy.destinationPort})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Pengirim (Shipper) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pengirim Kargo (Shipper) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="cargo-shipper-input"
                    type="text"
                    value={formData.shipper}
                    onChange={(e) => setFormData({ ...formData, shipper: e.target.value })}
                    placeholder="Contoh: PT Indofood Sukses Makmur"
                    className={`w-full px-3.5 py-2 rounded-xl border text-sm text-slate-800 ${
                      formErrors.shipper ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200'
                    }`}
                  />
                  {formErrors.shipper && (
                    <p className="text-xs text-rose-600 mt-1">{formErrors.shipper}</p>
                  )}
                </div>

                {/* Penerima (Consignee) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Penerima Kargo (Consignee) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="cargo-consignee-input"
                    type="text"
                    value={formData.consignee}
                    onChange={(e) => setFormData({ ...formData, consignee: e.target.value })}
                    placeholder="Contoh: PT Sumber Distribusi Jawa Timur"
                    className={`w-full px-3.5 py-2 rounded-xl border text-sm text-slate-800 ${
                      formErrors.consignee ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200'
                    }`}
                  />
                  {formErrors.consignee && (
                    <p className="text-xs text-rose-600 mt-1">{formErrors.consignee}</p>
                  )}
                </div>

                {/* Jenis Kargo */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jenis Kargo
                  </label>
                  <select
                    id="cargo-type-select"
                    value={formData.cargoType}
                    onChange={(e) => setFormData({ ...formData, cargoType: e.target.value as CargoType })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-800 bg-white"
                  >
                    {CARGO_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Status Kargo */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status Pengiriman
                  </label>
                  <select
                    id="cargo-status-select"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as CargoStatus })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-800 bg-white"
                  >
                    {CARGO_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Berat (Kg) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Berat Bersih (Kg) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="cargo-weight-input"
                    type="number"
                    min="1"
                    value={formData.weightKg}
                    onChange={(e) => setFormData({ ...formData, weightKg: parseFloat(e.target.value) || 0 })}
                    className={`w-full px-3.5 py-2 rounded-xl border text-sm text-slate-800 ${
                      formErrors.weightKg ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200'
                    }`}
                  />
                  {formErrors.weightKg && (
                    <p className="text-xs text-rose-600 mt-1">{formErrors.weightKg}</p>
                  )}
                </div>

                {/* Volume (CBM) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Volume Muatan (CBM)
                  </label>
                  <input
                    id="cargo-volume-input"
                    type="number"
                    min="0"
                    value={formData.volumeCbm}
                    onChange={(e) => setFormData({ ...formData, volumeCbm: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm text-slate-800"
                  />
                </div>

                {/* Tarif Freight (IDR) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tarif Freight (Rupiah IDR) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="cargo-tariff-input"
                    type="number"
                    min="0"
                    value={formData.tariffIdr}
                    onChange={(e) => setFormData({ ...formData, tariffIdr: parseInt(e.target.value) || 0 })}
                    className={`w-full px-3.5 py-2 rounded-xl border text-sm text-slate-800 ${
                      formErrors.tariffIdr ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200'
                    }`}
                  />
                  {formErrors.tariffIdr && (
                    <p className="text-xs text-rose-600 mt-1">{formErrors.tariffIdr}</p>
                  )}
                </div>

                {/* Status Pembayaran */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status Pembayaran
                  </label>
                  <select
                    id="cargo-payment-select"
                    value={formData.paymentStatus}
                    onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value as PaymentStatus })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-800 bg-white"
                  >
                    {PAYMENT_STATUSES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                {/* Catatan Handling */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Instruksi Penanganan Khusus & Suhu
                  </label>
                  <textarea
                    id="cargo-handling-input"
                    rows={2}
                    value={formData.handlingNotes}
                    onChange={(e) => setFormData({ ...formData, handlingNotes: e.target.value })}
                    placeholder="Instruksi stowage, penataan beban kontainer, atau penanganan material..."
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
                  id="submit-cargo-form"
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition flex items-center gap-2 cursor-pointer"
                >
                  {isSaving && (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                  {editingCargo ? 'Simpan Dokumen B/L' : 'Terbitkan Dokumen B/L'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PREVIEW BILL OF LADING MODAL */}
      {previewCargo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold tracking-wider text-blue-700 uppercase">
                  Salinan Resmi Dokumen Laut
                </span>
                <h3 className="text-base font-extrabold text-slate-900">
                  BILL OF LADING (B/L)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewCargo(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="flex items-center justify-between border-b pb-3">
                <span className="text-slate-400">Nomor B/L:</span>
                <span className="font-mono font-bold text-slate-900 text-sm">{previewCargo.blNumber}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block text-[11px]">Pengirim (Shipper):</span>
                  <span className="font-bold text-slate-800 text-xs block mt-1">{previewCargo.shipper}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block text-[11px]">Penerima (Consignee):</span>
                  <span className="font-bold text-slate-800 text-xs block mt-1">{previewCargo.consignee}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block text-[10px]">Kapal Pengangkut</span>
                  <span className="font-semibold text-slate-800">{previewCargo.vesselName || 'Armada Samudera'}</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block text-[10px]">Total Berat</span>
                  <span className="font-semibold text-slate-800">{previewCargo.weightKg.toLocaleString()} Kg</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block text-[10px]">Tarif Freight</span>
                  <span className="font-bold text-blue-700">Rp {previewCargo.tariffIdr.toLocaleString('id-ID')}</span>
                </div>
              </div>

              <div className="p-3 border border-slate-200 rounded-xl">
                <span className="text-slate-400 block text-[10px]">Catatan Penanganan:</span>
                <p className="text-slate-700 italic mt-0.5">{previewCargo.handlingNotes || 'Standar perkapalan maritim Indonesia.'}</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewCargo(null)}
                className="px-4 py-2 text-xs font-semibold bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl"
              >
                Tutup Pratinjau
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      <ConfirmModal
        isOpen={deleteTarget !== null}
        title="Hapus Manifes Kargo"
        message={`Apakah Anda yakin ingin menghapus dokumen Bill of Lading "${deleteTarget?.blNumber}" atas nama pengirim "${deleteTarget?.shipper}"?`}
        confirmLabel="Hapus Kargo"
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
