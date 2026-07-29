'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Building, Trash2, Mail, Phone, Palette, Users, ShieldAlert, CheckCircle2, AlertTriangle } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { getUser, removeToken, isTokenExpired } from '@/lib/auth';

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
    </div>
  );
}
