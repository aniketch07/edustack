'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Settings,
  Server,
  ShieldCheck,
  ChevronRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  HardDrive,
  Globe,
  Key,
  Database,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { getUser, removeToken, isTokenExpired } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { User, UserRole } from '@/types';

export default function PlatformSettingsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const user = getUser();
    if (!user || isTokenExpired()) {
      removeToken();
      router.push('/login');
    } else if (user.role !== UserRole.SUPER_ADMIN) {
      router.push('/login');
    } else {
      setCurrentUser(user);
      fetchSystemSettings();
    }
  }, [router]);

  const fetchSystemSettings = async () => {
    try {
      setRefreshing(true);
      const data = await apiFetch<any>('/institutes/system/settings');
      if (data) setSettings(data);
    } catch (e) {
      console.error('Failed to load system settings:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (!currentUser || currentUser.role !== UserRole.SUPER_ADMIN) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-400 flex flex-col items-center justify-center text-xs gap-3">
        <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
        <span>Verifying super admin session...</span>
      </div>
    );
  }

  const configUnavailable = settings === null;
  const liveConfig = settings || {
    awsRegion: '—',
    bucketName: '—',
    videoMaxMb: null,
    pdfMaxMb: null,
    imageMaxMb: null,
    dbConnected: null,
    dbLatencyMs: null,
    isolationScope: '—',
    jwtAuthGuard: '—',
    nodeEnv: '—',
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-500 selection:text-white">
      {/* Header & Breadcrumb */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 py-4 sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-0.5">
              <Link href="/admin" className="hover:text-white transition">
                Dashboard
              </Link>
              <ChevronRight className="w-3 h-3 text-slate-600" />
              <span className="text-blue-400 font-semibold">Settings</span>
            </div>
            <h1 className="text-lg font-bold text-white tracking-tight">Dynamic Platform Configuration & Health</h1>
          </div>
        </div>

        <button
          onClick={fetchSystemSettings}
          disabled={refreshing}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-semibold transition active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-400' : ''}`} />
          <span>Refresh Live Status</span>
        </button>
      </header>

      {/* Main Content Body */}
      <main className="p-6 max-w-7xl w-full mx-auto space-y-6 flex-1">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2 bg-slate-900/80 border border-slate-800 rounded-2xl">
            <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
            <span>Querying server configuration & DB latency...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* AWS S3 Cloud Storage Engine */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <Server className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">AWS S3 Cloud Storage Engine</h3>
                    <p className="text-xs text-slate-400">Direct-to-cloud pre-signed URL upload status</p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                  CONNECTED
                </span>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 text-xs">
                <div className="flex justify-between items-center text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-slate-500" />
                    AWS Region
                  </span>
                  <span className="text-white font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    {liveConfig.awsRegion}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-slate-500" />
                    S3 Bucket Name
                  </span>
                  <span className="text-blue-300 font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    {liveConfig.bucketName}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-slate-500" />
                    Video Upload Limit
                  </span>
                  <span className="text-emerald-400 font-bold">{liveConfig.videoMaxMb != null ? `${liveConfig.videoMaxMb} MB (MP4 / WebM)` : 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-slate-500" />
                    PDF Notes Limit
                  </span>
                  <span className="text-emerald-400 font-bold">{liveConfig.pdfMaxMb != null ? `${liveConfig.pdfMaxMb} MB` : 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* PostgreSQL Database & Multi-Tenant Security */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Database & Multi-Tenant Security</h3>
                    <p className="text-xs text-slate-400">PostgreSQL latency & isolation guards</p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-bold">
                  {liveConfig.dbLatencyMs != null ? `${liveConfig.dbLatencyMs}ms Latency` : 'Latency N/A'}
                </span>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 text-xs">
                <div className="flex justify-between items-center text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-slate-500" />
                    PostgreSQL Connection
                  </span>
                  {liveConfig.dbConnected ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      HEALTHY
                    </span>
                  ) : (
                    <span className="text-amber-400 font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {configUnavailable ? 'UNAVAILABLE' : 'OFFLINE'}
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-slate-500" />
                    Prisma Isolation Scope
                  </span>
                  <span className="text-blue-400 font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    {liveConfig.isolationScope}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-slate-500" />
                    JWT Auth Guards
                  </span>
                  <span className="text-emerald-400 font-bold">{liveConfig.jwtAuthGuard}</span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Settings className="w-3.5 h-3.5 text-slate-500" />
                    Node Environment
                  </span>
                  <span className="text-purple-300 font-mono uppercase font-bold">{liveConfig.nodeEnv}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
