import { db, collection, writeBatch, doc, serverTimestamp, getDocs, limit, query } from './config';
import { Vessel, Voyage, Cargo, Maintenance } from '../types/shipping';

export const INITIAL_VESSELS: Omit<Vessel, 'id'>[] = [
  {
    name: 'KM Samudera Nusantara 01',
    type: 'Kapal Kontainer',
    callSign: 'PK-SMD1',
    imoNumber: 'IMO 9842150',
    dwt: 24500,
    teuCapacity: 1850,
    builtYear: 2019,
    flag: 'Indonesia',
    status: 'Berlayar',
    currentLocation: 'Laut Jawa (Menuju Tj. Perak)',
    captain: 'Capt. Hendra Wijaya, M.Mar',
    crewCount: 22,
    fuelLevelPercent: 78,
    operationalNotes: 'Rute reguler Jakarta - Surabaya - Makassar. Kondisi mesin prima.'
  },
  {
    name: 'MV Bahari Perkasa',
    type: 'Bulk Carrier (Curah Kering)',
    callSign: 'PK-BHP8',
    imoNumber: 'IMO 9673421',
    dwt: 52000,
    teuCapacity: 0,
    builtYear: 2017,
    flag: 'Indonesia',
    status: 'Bersandar di Pelabuhan',
    currentLocation: 'Pelabuhan Tanjung Priok, Dermaga 104',
    captain: 'Capt. Bambang Suryono',
    crewCount: 26,
    fuelLevelPercent: 92,
    operationalNotes: 'Sedang menyelesaikan proses bongkar semen curah.'
  },
  {
    name: 'MT Tirta Kencana IV',
    type: 'Tanker Minyak & Kimia',
    callSign: 'PK-TKC4',
    imoNumber: 'IMO 9789214',
    dwt: 32000,
    teuCapacity: 0,
    builtYear: 2021,
    flag: 'Indonesia',
    status: 'Siap Muat',
    currentLocation: 'Pelabuhan Dumai, Riau',
    captain: 'Capt. Rahmat Hidayat, M.Mar',
    crewCount: 24,
    fuelLevelPercent: 85,
    operationalNotes: 'Siap pemuatan Crude Palm Oil (CPO) untuk distribusi Jawa-Bali.'
  },
  {
    name: 'KMP Lautan Sejahtera',
    type: 'Ro-Ro Penumpang & Kendaraan',
    callSign: 'PK-LTS2',
    imoNumber: 'IMO 9540012',
    dwt: 8500,
    teuCapacity: 120,
    builtYear: 2016,
    flag: 'Indonesia',
    status: 'Berlayar',
    currentLocation: 'Selat Sunda (Merak - Bakauheni)',
    captain: 'Capt. Agus Supriyanto',
    crewCount: 30,
    fuelLevelPercent: 64,
    operationalNotes: 'Operasional ferry lintasan utama, muatan kendaraan truk logistik penuh.'
  },
  {
    name: 'TB Jayakarta IX & BG Samudera 300',
    type: 'Tugboat & Tongkang',
    callSign: 'PK-JYK9',
    imoNumber: 'IMO 9321550',
    dwt: 12000,
    teuCapacity: 0,
    builtYear: 2020,
    flag: 'Indonesia',
    status: 'Dalam Pemeliharaan / Dok',
    currentLocation: 'Galangan Dok PT PAL, Surabaya',
    captain: 'Capt. Dedi Mulyadi',
    crewCount: 12,
    fuelLevelPercent: 40,
    operationalNotes: 'Jadwal pergantian propeller shaft dan perawatan berkala Biro Klasifikasi Indonesia.'
  }
];

export const INITIAL_VOYAGES: Omit<Voyage, 'id'>[] = [
  {
    voyageNumber: 'VYG-2025-0104',
    vesselId: '', // will be mapped
    vesselName: 'KM Samudera Nusantara 01',
    originPort: 'Pelabuhan Tanjung Priok (Jakarta)',
    destinationPort: 'Pelabuhan Tanjung Perak (Surabaya)',
    departureDate: '2025-03-20T08:00',
    arrivalDate: '2025-03-21T18:00',
    status: 'Dalam Pelayaran',
    cargoTotalTons: 14200,
    fuelConsumptionEst: 38,
    weatherConditions: 'Ombak 1.2m, angin timur 10 knot, cuaca cerah',
    routeNotes: 'Estimasi tiba tepat waktu sebelum jadwal pasang air laut di muara Surabaya.'
  },
  {
    voyageNumber: 'VYG-2025-0105',
    vesselId: '',
    vesselName: 'MV Bahari Perkasa',
    originPort: 'Pelabuhan Tarahan (Lampung)',
    destinationPort: 'Pelabuhan Tanjung Priok (Jakarta)',
    departureDate: '2025-03-18T14:00',
    arrivalDate: '2025-03-19T22:00',
    status: 'Selesai',
    cargoTotalTons: 48000,
    fuelConsumptionEst: 54,
    weatherConditions: 'Laut tenang, navigasi lancar',
    routeNotes: 'Muatan batubara kalori tinggi untuk pasokan PLTU telah dibongkar sempurna.'
  },
  {
    voyageNumber: 'VYG-2025-0106',
    vesselId: '',
    vesselName: 'MT Tirta Kencana IV',
    originPort: 'Pelabuhan Dumai (Riau)',
    destinationPort: 'Pelabuhan Tanjung Wangi (Banyuwangi)',
    departureDate: '2025-03-24T06:00',
    arrivalDate: '2025-03-28T16:00',
    status: 'Dijadwalkan',
    cargoTotalTons: 28000,
    fuelConsumptionEst: 72,
    weatherConditions: 'Prakiraan BMKG gelombang normal 1-1.5m',
    routeNotes: 'Pengangkutan CPO ekspor-antar pulau via Selat Malaka dan Laut Jawa.'
  }
];

export const INITIAL_CARGOES: Omit<Cargo, 'id'>[] = [
  {
    blNumber: 'BL-JKT-SUB-2501',
    voyageId: '',
    voyageNumber: 'VYG-2025-0104',
    vesselName: 'KM Samudera Nusantara 01',
    shipper: 'PT Indofood Sukses Makmur Tbk',
    consignee: 'PT Sumber Distribusi Jawa Timur',
    cargoType: 'FCL Container',
    weightKg: 320000,
    volumeCbm: 450,
    tariffIdr: 185000000,
    paymentStatus: 'Lunas',
    status: 'Dalam Pengiriman Laut',
    handlingNotes: 'Kargo pangan kering dalam 16 kontainer 40ft pendingin standar.'
  },
  {
    blNumber: 'BL-JKT-SUB-2502',
    voyageId: '',
    voyageNumber: 'VYG-2025-0104',
    vesselName: 'KM Samudera Nusantara 01',
    shipper: 'PT Astra Otoparts Tbk',
    consignee: 'CV Bengkel Perkasa Motor Surabaya',
    cargoType: 'Break Bulk / Pallet',
    weightKg: 85000,
    volumeCbm: 120,
    tariffIdr: 64000000,
    paymentStatus: 'DP / Bertahap',
    status: 'Dalam Pengiriman Laut',
    handlingNotes: 'Komponen otomotif palet kayu dengan lashing ganda dan segel pelindung.'
  },
  {
    blNumber: 'BL-DUM-BYW-2503',
    voyageId: '',
    voyageNumber: 'VYG-2025-0106',
    vesselName: 'MT Tirta Kencana IV',
    shipper: 'PT Sinar Mas Agro Resources',
    consignee: 'PT Mega Oleo Industri Jawa',
    cargoType: 'Curah Cair (CPO / BBM)',
    weightKg: 15000000,
    volumeCbm: 16500,
    tariffIdr: 1250000000,
    paymentStatus: 'Lunas',
    status: 'Booking Terdaftar',
    handlingNotes: 'Inspeksi tanki wajib lolos uji kontaminasi sebelum loading CPO.'
  }
];

export const INITIAL_MAINTENANCES: Omit<Maintenance, 'id'>[] = [
  {
    vesselId: '',
    vesselName: 'TB Jayakarta IX & BG Samudera 300',
    serviceType: 'Docking Tahunan (Annual Survey)',
    dockLocation: 'Galangan Dok PT PAL Indonesia, Ujung Surabaya',
    startDate: '2025-03-10',
    estimatedCompletionDate: '2025-03-27',
    estimatedCostIdr: 450000000,
    actualCostIdr: 420000000,
    status: 'Sedang Berjalan',
    leadEngineer: 'Ir. Agus Santoso, ST',
    reportNotes: 'Pengerjaan meliputi sandblasting, zinc anode replacement, dan kalibrasi sonar navigasi.'
  },
  {
    vesselId: '',
    vesselName: 'MV Bahari Perkasa',
    serviceType: 'Sertifikasi SOLAS / Biro Klasifikasi Indonesia (BKI)',
    dockLocation: 'Dermaga Khusus Tanjung Priok',
    startDate: '2025-04-05',
    estimatedCompletionDate: '2025-04-08',
    estimatedCostIdr: 85000000,
    status: 'Terjadwal',
    leadEngineer: 'Capt. Bambang Suryono / Surveyor BKI',
    reportNotes: 'Inspeksi peralatan keselamatan darurat, sekoci penyelamat, dan pemadam CO2 terpusat.'
  }
];

export async function checkAndSeedDatabase(): Promise<{ seeded: boolean; message: string }> {
  try {
    const vesselsCol = collection(db, 'vessels');
    const existingSnap = await getDocs(query(vesselsCol, limit(1)));
    
    if (!existingSnap.empty) {
      return { seeded: false, message: 'Database telah memiliki data armada kapal aktif.' };
    }

    const batch = writeBatch(db);
    const vesselIds: { [name: string]: string } = {};

    // 1. Seed Vessels
    for (const v of INITIAL_VESSELS) {
      const vRef = doc(collection(db, 'vessels'));
      vesselIds[v.name] = vRef.id;
      batch.set(vRef, {
        ...v,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }

    // 2. Seed Voyages
    const voyageIds: { [num: string]: string } = {};
    for (const voy of INITIAL_VOYAGES) {
      const voyRef = doc(collection(db, 'voyages'));
      voyageIds[voy.voyageNumber] = voyRef.id;
      const matchedVesselId = vesselIds[voy.vesselName] || '';
      batch.set(voyRef, {
        ...voy,
        vesselId: matchedVesselId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }

    // 3. Seed Cargoes
    for (const c of INITIAL_CARGOES) {
      const cRef = doc(collection(db, 'cargoes'));
      const matchedVoyageId = voyageIds[c.voyageNumber] || '';
      batch.set(cRef, {
        ...c,
        voyageId: matchedVoyageId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }

    // 4. Seed Maintenances
    for (const m of INITIAL_MAINTENANCES) {
      const mRef = doc(collection(db, 'maintenances'));
      const matchedVesselId = vesselIds[m.vesselName] || '';
      batch.set(mRef, {
        ...m,
        vesselId: matchedVesselId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }

    // 5. Seed Log
    const logRef = doc(collection(db, 'operational_logs'));
    batch.set(logRef, {
      title: 'Inisialisasi Sistem Pelayaran Selesai',
      description: 'Master data armada kapal, jadwal rute pelayaran, dan manifes kargo berhasil didaftarkan ke Firestore.',
      category: 'SISTEM',
      performedBy: 'Sistem Pusat Pelayaran',
      timestamp: serverTimestamp()
    });

    await batch.commit();
    return { seeded: true, message: 'Berhasil menginisialisasi master data pelayaran ke Firebase Firestore!' };
  } catch (error: any) {
    console.error('Error seeding database:', error);
    return { seeded: false, message: 'Gagal inisialisasi: ' + (error?.message || 'Unknown error') };
  }
}
