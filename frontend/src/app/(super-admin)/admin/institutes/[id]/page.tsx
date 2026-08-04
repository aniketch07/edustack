'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Building, Trash2, Mail, Phone, Palette, Users, ShieldAlert, CheckCircle2, AlertTriangle, Crown } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { getUser, removeToken, isTokenExpired } from '@/lib/auth';

function SeatUsageBar({ used, limit }: { used: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const full = used >= limit;
  const barColor = full ? 'bg-red-500' : pct >= 90 ? 'bg-orange-500' : pct >= 80 ? 'bg-amber-400' : 'bg-emerald-500';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400 font-medium">Seat Usage</span>
        <span className={`font-bold ${full ? 'text-red-400' : pct >= 90 ? 'text-orange-400' : pct >= 80 ? 'text-amber-300' : 'text-emerald-400'}`}>
          {used} / {limit} ({pct}%)
        </span>
      </div>
      <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
        <div className={`${barColor} h-full rounded-full transition-all`} style={{ width: `${Math.max(pct, 2)}%` }} />
      </div>
      {full && (
        <p className="text-[11px] text-red-400 font-bold">● All student seats are used — new student creation is blocked.</p>
      )}
    </div>
  );
}

export default function InstituteDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const instituteId = params?.id as string;

  const [institute, setInstitute] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Delete Confirmation Modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Edit Plan Modal state
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planName, setPlanName] = useState('Starter');
  const [planLimit, setPlanLimit] = useState<number>(20);
  const [planStatus, setPlanStatus] = useState('ACTIVE');
  const [savingPlan, setSavingPlan] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  const openPlanModal = () => {
    setPlanName(institute?.planName || 'Starter');
    setPlanLimit(institute?.studentLimit ?? 20);
    setPlanStatus(institute?.subscriptionStatus || 'ACTIVE');
    setPlanError(null);
    setShowPlanModal(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPlan(true);
    setPlanError(null);
    try {
      await apiFetch(`/institutes/${instituteId}/plan`, {
        method: 'PATCH',
        body: JSON.stringify({
          planName,
          studentLimit: planName === 'Enterprise' ? undefined : planLimit,
          subscriptionStatus: planStatus,
        }),
      });
      setShowPlanModal(false);
      await fetchInstituteDetails();
    } catch (err: any) {
      setPlanError(err.message || 'Failed to update plan');
    } finally {
      setSavingPlan(false);
    }
  };

  useEffect(() => {
    const user = getUser();
    if (!user || isTokenExpired()) {
      removeToken();
      router.push('/login');
    } else if (instituteId) {
      fetchInstituteDetails();
    }
  }, [router, instituteId]);

  const fetchInstituteDetails = async () => {
    try {
      const data = await apiFetch<any>(`/institutes/${instituteId}`);
      setInstitute(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch institute details');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiFetch(`/institutes/${instituteId}`, {
        method: 'DELETE',
      });
      router.push('/admin');
    } catch (err: any) {
      alert(err.message || 'Failed to delete institute.');
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center text-xs">
        Loading institute details...
      </div>
    );
  }

  if (error || !institute) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
        <p className="text-red-400 text-sm font-semibold mb-4">{error || 'Institute not found'}</p>
        <Link href="/admin" className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold">
          Back to Admin Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="h-16 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="font-bold text-lg text-white">{institute.name}</span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
            ACTIVE WORKSPACE
          </span>
        </div>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold border border-red-500/20 transition"
        >
          <Trash2 className="w-4 h-4" />
          Delete Institute
        </button>
      </header>

      <main className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto space-y-8">
        {/* Info Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Building className="w-5 h-5 text-blue-400" />
              Institute Profile & Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block font-medium">Display Name</span>
                <span className="text-sm font-semibold text-white mt-1 block">{institute.name}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block font-medium">URL Slug</span>
                <span className="text-sm font-semibold text-slate-300 mt-1 block">{institute.slug}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block font-medium">Contact Email</span>
                <span className="text-sm font-semibold text-slate-300 mt-1 block">{institute.contactEmail}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block font-medium">Contact Phone</span>
                <span className="text-sm font-semibold text-slate-300 mt-1 block">{institute.contactPhone || 'Not provided'}</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Palette className="w-5 h-5 text-emerald-400" />
              Branding Palette
            </h2>
            <div className="space-y-3 text-xs pt-2">
              <div className="flex justify-between items-center p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-300 font-medium">Primary Accent Color</span>
                <span className="flex items-center gap-2 text-white font-mono">
                  <span className="w-4 h-4 rounded-full border border-slate-700" style={{ backgroundColor: institute.primaryColor || '#3B82F6' }} />
                  {institute.primaryColor || '#3B82F6'}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-300 font-medium">Secondary Accent Color</span>
                <span className="flex items-center gap-2 text-white font-mono">
                  <span className="w-4 h-4 rounded-full border border-slate-700" style={{ backgroundColor: institute.secondaryColor || '#10B981' }} />
                  {institute.secondaryColor || '#10B981'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Plan & Student Seats */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-400" />
              Plan & Student Seats
            </h2>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs font-bold">
                {institute.planName || 'Starter'}
              </span>
              {institute.subscriptionStatus && institute.subscriptionStatus !== 'ACTIVE' && (
                <span className="px-2 py-1 rounded-md bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-bold">
                  {institute.subscriptionStatus}
                </span>
              )}
              <button
                type="button"
                onClick={openPlanModal}
                className="px-3 py-1.5 rounded-lg bg-blue-600/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/20 text-xs font-semibold transition cursor-pointer"
              >
                Edit Plan
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400 block text-[11px] font-medium">Seat Limit</span>
              <span className="text-xl font-black text-white mt-1 block">
                {institute.studentLimit === null || institute.studentLimit === undefined ? (
                  <span className="text-emerald-400">Unlimited</span>
                ) : (
                  institute.studentLimit
                )}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400 block text-[11px] font-medium">Active Students</span>
              <span className="text-xl font-black text-white mt-1 block">
                {institute.users?.filter((u: any) => u.role === 'STUDENT' && u.isActive !== false).length || 0}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400 block text-[11px] font-medium">Seats Remaining</span>
              {institute.studentLimit === null || institute.studentLimit === undefined ? (
                <span className="text-xl font-black text-emerald-400 mt-1 block">∞</span>
              ) : (
                <span className="text-xl font-black text-emerald-400 mt-1 block">
                  {Math.max(0, institute.studentLimit - (institute.users?.filter((u: any) => u.role === 'STUDENT' && u.isActive !== false).length || 0))}
                </span>
              )}
            </div>
          </div>

          {institute.studentLimit !== null && institute.studentLimit !== undefined && (
            <SeatUsageBar
              used={institute.users?.filter((u: any) => u.role === 'STUDENT' && u.isActive !== false).length || 0}
              limit={institute.studentLimit}
            />
          )}
        </div>

        {/* Users Table for this institute */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-400" />
              Associated Institute Accounts
            </h2>
            <span className="text-xs text-slate-400">
              {institute.users?.length || 0} Total Account(s)
            </span>
          </div>

          <div className="overflow-x-auto">
            {!institute.users || institute.users.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">No users found for this institute.</div>
            ) : (
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">User Name</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {institute.users.map((u: any) => (
                    <tr key={u.id} className="hover:bg-slate-950/50">
                      <td className="py-3 px-4 font-semibold text-white">{u.firstName} {u.lastName}</td>
                      <td className="py-3 px-4 text-slate-300">{u.email}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            u.role === 'INSTITUTE_ADMIN'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : u.role === 'TEACHER'
                              ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                              : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {/* Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Remove Institute</h3>
                <p className="text-xs text-slate-400">Confirm permanent deletion</p>
              </div>
            </div>

            <p className="text-sm text-slate-200 font-semibold bg-slate-950 p-4 rounded-xl border border-slate-800">
              Are you sure you want to remove this institute?
            </p>

            <p className="text-xs text-slate-400 leading-relaxed">
              This action will permanently delete <span className="font-semibold text-white">{institute.name}</span> and all associated teacher, student, course, and content records.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition disabled:opacity-50"
              >
                {deleting ? 'Removing...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Plan Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400">
                <Crown className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">Edit Plan</h3>
              </div>
              <button onClick={() => setShowPlanModal(false)} className="text-slate-400 hover:text-white text-xs">
                ✕
              </button>
            </div>

            {planError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
                {planError}
              </div>
            )}

            <form onSubmit={handleSavePlan} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">Plan Name *</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Starter', 'Growth', 'Enterprise', 'Custom'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPlanName(p)}
                      className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                        planName === p
                          ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {planName !== 'Enterprise' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Student Seat Limit *
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={planLimit}
                    onChange={(e) => setPlanLimit(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    Current active students: {institute.users?.filter((u: any) => u.role === 'STUDENT' && u.isActive !== false).length || 0}
                    {planName !== 'Custom' && ` · ${planName} preset is ${planName === 'Starter' ? 20 : 40}`}
                  </p>
                </div>
              )}
              {planName === 'Enterprise' && (
                <p className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                  Unlimited student seats.
                </p>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Subscription Status</label>
                <select
                  value={planStatus}
                  onChange={(e) => setPlanStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="TRIAL">Trial</option>
                  <option value="EXPIRED">Expired</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  {planStatus !== 'ACTIVE' && planStatus !== 'TRIAL'
                    ? '⚠ Non-active status blocks new student account creation.'
                    : 'Active/Trial allows new student account creation.'}
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPlanModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPlan}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition flex items-center gap-2 disabled:opacity-50"
                >
                  {savingPlan ? 'Saving...' : 'Save Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
