export type VesselType = 
  | 'Kapal Kontainer' 
  | 'Bulk Carrier (Curah Kering)' 
  | 'Tanker Minyak & Kimia' 
  | 'Ro-Ro Penumpang & Kendaraan' 
  | 'Tugboat & Tongkang' 
  | 'General Cargo';

export type VesselStatus = 
  | 'Berlayar' 
  | 'Bersandar di Pelabuhan' 
  | 'Siap Muat' 
  | 'Dalam Pemeliharaan / Dok';

export interface Vessel {
  id: string;
  name: string;
  type: VesselType;
  callSign: string;
  imoNumber: string;
  dwt: number; // Deadweight Tonnage
  teuCapacity: number; // Twenty-foot Equivalent Unit (kontainer)
  builtYear: number;
  flag: string;
  status: VesselStatus;
  currentLocation: string;
  captain: string;
  crewCount: number;
  fuelLevelPercent: number;
  operationalNotes?: string;
  createdAt?: any;
  updatedAt?: any;
}

export type VoyageStatus = 
  | 'Dijadwalkan' 
  | 'Dalam Pelayaran' 
  | 'Selesai' 
  | 'Tertunda Cuaca' 
  | 'Dibatalkan';

export interface Voyage {
  id: string;
  voyageNumber: string;
  vesselId: string;
  vesselName: string;
  originPort: string;
  destinationPort: string;
  departureDate: string; // YYYY-MM-DDTHH:mm
  arrivalDate: string; // YYYY-MM-DDTHH:mm
  status: VoyageStatus;
  cargoTotalTons: number;
  fuelConsumptionEst: number; // Ton/Liter
  weatherConditions: string;
  routeNotes?: string;
  createdAt?: any;
  updatedAt?: any;
}

export type CargoType = 
  | 'FCL Container' 
  | 'LCL Container' 
  | 'Curah Kering (Batu Bara / Semen)' 
  | 'Curah Cair (CPO / BBM)' 
  | 'Alat Berat & Mesin' 
  | 'Break Bulk / Pallet';

export type CargoStatus = 
  | 'Booking Terdaftar' 
  | 'Proses Pemuatan (Loading)' 
  | 'Dalam Pengiriman Laut' 
  | 'Bongkar di Pelabuhan Tujuan' 
  | 'Telah Diterima (Delivered)';

export type PaymentStatus = 'Lunas' | 'Belum Lunas' | 'DP / Bertahap';

export interface Cargo {
  id: string;
  blNumber: string; // Bill of Lading Number
  voyageId: string;
  voyageNumber: string;
  vesselName: string;
  shipper: string; // Pengirim
  consignee: string; // Penerima
  cargoType: CargoType;
  weightKg: number;
  volumeCbm: number;
  tariffIdr: number;
  paymentStatus: PaymentStatus;
  status: CargoStatus;
  handlingNotes?: string;
  createdAt?: any;
  updatedAt?: any;
}

export type MaintenanceType = 
  | 'Docking Tahunan (Annual Survey)' 
  | 'Overhaul Mesin Utama' 
  | 'Sertifikasi SOLAS / Biro Klasifikasi Indonesia (BKI)' 
  | 'Perbaikan Sistem Propulsi' 
  | 'Pembersihan & Pengecatan Lambung';

export type MaintenanceStatus = 'Terjadwal' | 'Sedang Berjalan' | 'Selesai' | 'Ditunda';

export interface Maintenance {
  id: string;
  vesselId: string;
  vesselName: string;
  serviceType: MaintenanceType;
  dockLocation: string;
  startDate: string;
  estimatedCompletionDate: string;
  estimatedCostIdr: number;
  actualCostIdr?: number;
  status: MaintenanceStatus;
  leadEngineer: string;
  reportNotes?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface OperationalLog {
  id: string;
  title: string;
  description: string;
  category: 'ARMADA' | 'PELAYARAN' | 'KARGO' | 'DOK' | 'SISTEM';
  performedBy: string;
  timestamp: any;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
}
