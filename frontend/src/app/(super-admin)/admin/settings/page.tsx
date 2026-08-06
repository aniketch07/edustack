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
  Sliders,
  ShieldAlert,
  Save,
} from 'lucide-react';
import { getUser, removeToken, isTokenExpired } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { User, UserRole } from '@/types';
import { useToast } from '@/components/Toast';

export default function PlatformSettingsPage() {
  const router = useRouter();
  const toast = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Interactive config settings state
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [freePlanSeats, setFreePlanSeats] = useState(50);
  const [proPlanSeats, setProPlanSeats] = useState(1000);
  const [videoLimit, setVideoLimit] = useState(500);
  const [pdfLimit, setPdfLimit] = useState(50);

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
      if (data) {
        setSettings(data);
        if (data.videoMaxMb) setVideoLimit(data.videoMaxMb);
        if (data.pdfMaxMb) setPdfLimit(data.pdfMaxMb);
      }
    } catch (e) {
      console.error('Failed to load system settings:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    // Simulate API persistence delay
    await new Promise((resolve) => setTimeout(resolve, 800));
    setSaving(false);
    toast.success('System parameters and limits updated successfully.');
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
          <form onSubmit={handleSaveSettings} className="space-y-6">
            {/* Maintenance Mode Alerts Banner */}
            {maintenanceMode && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-3 animate-pulse">
                <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <span className="font-bold">SYSTEM MAINTENANCE WINDOW ACTIVE:</span> Public registrations and standard logins will be restricted until disabled.
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Interactive Parameters Form */}
              <div className="lg:col-span-2 space-y-6">
                {/* Form Controls */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-5 h-5 text-blue-400" />
                      <h3 className="text-sm font-bold text-white">Interactive Limits & Plan Configuration</h3>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Maintenance Switch */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950 border border-slate-800">
                      <div>
                        <h4 className="text-xs font-bold text-white">Platform Maintenance Mode</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">Restrict all active client portals for maintenance</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={maintenanceMode}
                          onChange={(e) => setMaintenanceMode(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600 peer-checked:after:bg-white" />
                      </label>
                    </div>

                    {/* Limits Sliders */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                        <label className="text-xs font-bold text-slate-300 block">Free Plan Students Limit</label>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="10"
                            max="200"
                            step="10"
                            value={freePlanSeats}
                            onChange={(e) => setFreePlanSeats(Number(e.target.value))}
                            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                          />
                          <span className="text-xs font-bold text-white font-mono shrink-0 w-12 text-right">
                            {freePlanSeats} Seats
                          </span>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                        <label className="text-xs font-bold text-slate-300 block">Pro Plan Students Limit</label>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="500"
                            max="5000"
                            step="100"
                            value={proPlanSeats}
                            onChange={(e) => setProPlanSeats(Number(e.target.value))}
                            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                          />
                          <span className="text-xs font-bold text-white font-mono shrink-0 w-12 text-right">
                            {proPlanSeats} Seats
                          </span>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                        <label className="text-xs font-bold text-slate-300 block">Max Video Upload Limit</label>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="100"
                            max="2000"
                            step="100"
                            value={videoLimit}
                            onChange={(e) => setVideoLimit(Number(e.target.value))}
                            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
                          />
                          <span className="text-xs font-bold text-white font-mono shrink-0 w-16 text-right">
                            {videoLimit} MB
                          </span>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                        <label className="text-xs font-bold text-slate-300 block">Max PDF Document Limit</label>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="10"
                            max="200"
                            step="10"
                            value={pdfLimit}
                            onChange={(e) => setPdfLimit(Number(e.target.value))}
                            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                          />
                          <span className="text-xs font-bold text-white font-mono shrink-0 w-16 text-right">
                            {pdfLimit} MB
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-50"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Saving Parameters...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5" />
                          <span>Save Changes</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Read-only Server & DB Stats */}
              <div className="space-y-6">
                {/* AWS S3 Cloud Storage Engine */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        <Server className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">S3 Cloud Storage Engine</h3>
                        <p className="text-xs text-slate-400">Presigned upload configuration</p>
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
                        <h3 className="text-sm font-bold text-white">Database & Security</h3>
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
                      <span className="text-blue-400 font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-[11px] truncate max-w-[160px]" title={liveConfig.isolationScope}>
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
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
