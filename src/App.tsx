/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  auth, 
  onAuthStateChanged, 
  User, 
  db, 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot 
} from './firebase/config';
import { Vessel, Voyage, Cargo, Maintenance, OperationalLog, ToastMessage } from './types/shipping';
import { AuthView } from './components/AuthView';
import { Navbar, ActiveTab } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { VesselsView } from './components/VesselsView';
import { VoyagesView } from './components/VoyagesView';
import { CargoView } from './components/CargoView';
import { MaintenanceView } from './components/MaintenanceView';
import { ToastContainer } from './components/Toast';

export default function App() {
  // Authentication state - Strictly via Firebase Auth (NO localStorage)
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // Real-time Firestore State - Single Source of Truth
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [voyages, setVoyages] = useState<Voyage[]>([]);
  const [cargoes, setCargoes] = useState<Cargo[]>([]);
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [logs, setLogs] = useState<OperationalLog[]>([]);

  // Loading states
  const [isDataLoading, setIsDataLoading] = useState(true);

  // Toast feedback notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);

    // Auto dismiss after 4.5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // 1. Listen to Firebase Authentication
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsAuthChecking(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Real-time Firebase Firestore synchronization
  useEffect(() => {
    // Set up real-time listeners for all primary shipping collections
    const vesselsQuery = query(collection(db, 'vessels'), orderBy('createdAt', 'desc'));
    const unsubsVessels = onSnapshot(
      vesselsQuery,
      (snapshot) => {
        const data: Vessel[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data()
        })) as Vessel[];
        setVessels(data);
        setIsDataLoading(false);
      },
      (error) => {
        console.error('Firestore Vessels Sync Error:', error);
        addToast('error', 'Koneksi Firestore', 'Gagal memuat armada: ' + error.message);
        setIsDataLoading(false);
      }
    );

    const voyagesQuery = query(collection(db, 'voyages'), orderBy('createdAt', 'desc'));
    const unsubsVoyages = onSnapshot(
      voyagesQuery,
      (snapshot) => {
        const data: Voyage[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data()
        })) as Voyage[];
        setVoyages(data);
      },
      (error) => {
        console.error('Firestore Voyages Sync Error:', error);
      }
    );

    const cargoesQuery = query(collection(db, 'cargoes'), orderBy('createdAt', 'desc'));
    const unsubsCargoes = onSnapshot(
      cargoesQuery,
      (snapshot) => {
        const data: Cargo[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data()
        })) as Cargo[];
        setCargoes(data);
      },
      (error) => {
        console.error('Firestore Cargoes Sync Error:', error);
      }
    );

    const maintQuery = query(collection(db, 'maintenances'), orderBy('createdAt', 'desc'));
    const unsubsMaint = onSnapshot(
      maintQuery,
      (snapshot) => {
        const data: Maintenance[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data()
        })) as Maintenance[];
        setMaintenances(data);
      },
      (error) => {
        console.error('Firestore Maintenances Sync Error:', error);
      }
    );

    const logsQuery = query(collection(db, 'operational_logs'), orderBy('timestamp', 'desc'), limit(20));
    const unsubsLogs = onSnapshot(
      logsQuery,
      (snapshot) => {
        const data: OperationalLog[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data()
        })) as OperationalLog[];
        setLogs(data);
      },
      (error) => {
        console.error('Firestore Logs Sync Error:', error);
      }
    );

    return () => {
      unsubsVessels();
      unsubsVoyages();
      unsubsCargoes();
      unsubsMaint();
      unsubsLogs();
    };
  }, []);

  // Initial Auth Loading Screen
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-3 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-700">
          Menghubungkan ke Portal Operasional Pelayaran...
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Memverifikasi sesi autentikasi Firebase
        </p>
      </div>
    );
  }

  // Requirement 3: Harus ada form login sebagai tampilan default
  if (!currentUser) {
    return (
      <>
        <AuthView 
          onSuccessNotice={(msg) => addToast('success', 'Autentikasi Berhasil', msg)}
        />
        <ToastContainer toasts={toasts} onDismiss={removeToast} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Top Sticky Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        counts={{
          vessels: vessels.length,
          voyages: voyages.length,
          cargoes: cargoes.length,
          maintenances: maintenances.length
        }}
        onNotify={addToast}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'dashboard' && (
          <DashboardView
            vessels={vessels}
            voyages={voyages}
            cargoes={cargoes}
            maintenances={maintenances}
            logs={logs}
            setActiveTab={setActiveTab}
            onNotify={addToast}
          />
        )}

        {activeTab === 'vessels' && (
          <VesselsView
            vessels={vessels}
            isLoading={isDataLoading}
            onNotify={addToast}
          />
        )}

        {activeTab === 'voyages' && (
          <VoyagesView
            voyages={voyages}
            vessels={vessels}
            isLoading={isDataLoading}
            onNotify={addToast}
          />
        )}

        {activeTab === 'cargoes' && (
          <CargoView
            cargoes={cargoes}
            voyages={voyages}
            isLoading={isDataLoading}
            onNotify={addToast}
          />
        )}

        {activeTab === 'maintenances' && (
          <MaintenanceView
            maintenances={maintenances}
            vessels={vessels}
            isLoading={isDataLoading}
            onNotify={addToast}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-4 px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            PT Samudera Bahari Logistik &copy; 2025 • Sistem Informasi Pelayaran Nasional
          </span>
          <span className="font-mono text-[11px] text-slate-400">
            Realtime Firestore Single Source of Truth • Zero localStorage
          </span>
        </div>
      </footer>

      {/* Global Toast Feedback Container */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
