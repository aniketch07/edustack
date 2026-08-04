'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Building, User, Mail, Lock, Phone, Palette, CheckCircle2, ShieldCheck, Users, Crown, Infinity as InfinityIcon, Sparkles } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { getUser, removeToken, isTokenExpired } from '@/lib/auth';
import { UserRole } from '@/types';

export default function CreateInstitutePage() {
  const router = useRouter();

  useEffect(() => {
    const user = getUser();
    if (!user || isTokenExpired()) {
      removeToken();
      router.push('/login');
    } else if (user.role !== UserRole.SUPER_ADMIN) {
      if (user.role === UserRole.INSTITUTE_ADMIN) {
        router.push('/dashboard');
      } else if (user.role === UserRole.TEACHER) {
        router.push('/teacher/dashboard');
      } else {
        router.push('/student/dashboard');
      }
    }
  }, [router]);

  // Form State
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#3B82F6');
  const [secondaryColor, setSecondaryColor] = useState('#10B981');

  // Admin Account Details
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminFirstName, setAdminFirstName] = useState('');
  const [adminLastName, setAdminLastName] = useState('');

  // Plan & seat selection
  const [selectedPlan, setSelectedPlan] = useState('Starter');
  const [customLimit, setCustomLimit] = useState<number>(50);

  const PLAN_OPTIONS = [
    { name: 'Starter', seats: 20, price: '₹5,000/mo', desc: 'For small coaching institutes just starting out.' },
    { name: 'Growth', seats: 40, price: '₹10,000/mo', desc: 'For growing institutes with a larger student body.' },
    { name: 'Enterprise', seats: null, price: '₹15,000/mo', desc: 'Unlimited students. For established academies.' },
    { name: 'Custom', seats: 'custom', price: 'Custom pricing', desc: 'Set a custom student seat limit.' },
  ];

  const getStudentLimit = () => {
    if (selectedPlan === 'Enterprise') return undefined; // null = unlimited
    if (selectedPlan === 'Custom') return customLimit;
    return PLAN_OPTIONS.find((p) => p.name === selectedPlan)?.seats ?? 20;
  };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Auto-generate slug from name
  const handleNameChange = (val: string) => {
    setName(val);
    const generatedSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
    setSlug(generatedSlug);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name || !slug || !contactEmail || !adminEmail || !adminPassword || !adminFirstName || !adminLastName) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);

    try {
      await apiFetch('/institutes', {
        method: 'POST',
        body: JSON.stringify({
          name,
          slug,
          contactEmail,
          contactPhone,
          primaryColor,
          secondaryColor,
          planName: selectedPlan,
          studentLimit: getStudentLimit(),
          adminEmail,
          adminPassword,
          adminFirstName,
          adminLastName,
        }),
      });

      setSuccess(`Institute "${name}" and Admin account "${adminEmail}" created successfully!`);
      setTimeout(() => {
        router.push('/admin');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to onboard institute.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="h-16 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="font-bold text-lg text-white">Onboard New Institute</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Super Admin Access Only</span>
        </div>
      </header>

      <main className="flex-1 p-6 sm:p-8 max-w-4xl w-full mx-auto">
        <form onSubmit={handleSubmit} className="space-y-8">
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold">
              {error}
            </div>
          )}

          {success && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {success}
            </div>
          )}

          {/* Section 1: Institute Information */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <Building className="w-5 h-5 text-blue-400" />
              <div>
                <h2 className="text-lg font-bold text-white">1. Institute Details</h2>
                <p className="text-xs text-slate-400">Basic workspace information & custom branding colors</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Institute Display Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g., Apex Coaching Academy"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Institute URL Slug *</label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="apex-coaching"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Contact Email *</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="contact@apexcoaching.com"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+91 9876543210"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Primary Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-9 h-9 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Secondary Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="w-9 h-9 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white uppercase"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Initial Institute Admin Account */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <User className="w-5 h-5 text-emerald-400" />
              <div>
                <h2 className="text-lg font-bold text-white">2. Initial Institute Admin Account</h2>
                <p className="text-xs text-slate-400">Login credentials created for the institute administrator</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Admin First Name *</label>
                <input
                  type="text"
                  value={adminFirstName}
                  onChange={(e) => setAdminFirstName(e.target.value)}
                  placeholder="Rahul"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Admin Last Name *</label>
                <input
                  type="text"
                  value={adminLastName}
                  onChange={(e) => setAdminLastName(e.target.value)}
                  placeholder="Sharma"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Admin Login Email *</label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@apexcoaching.com"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Admin Password *</label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Plan & Student Seats */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <Crown className="w-5 h-5 text-amber-400" />
              <div>
                <h2 className="text-lg font-bold text-white">3. Select Plan & Student Seats</h2>
                <p className="text-xs text-slate-400">Choose the subscription plan this institute pays for. The seat limit controls how many student accounts can be created.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {PLAN_OPTIONS.map((plan) => {
                const isSelected = selectedPlan === plan.name;
                return (
                  <button
                    key={plan.name}
                    type="button"
                    onClick={() => setSelectedPlan(plan.name)}
                    className={`relative p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/10'
                        : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                    )}
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-bold ${isSelected ? 'text-amber-300' : 'text-white'}`}>
                        {plan.name}
                      </span>
                      <span className="text-[11px] font-semibold text-emerald-400">{plan.price}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-300">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      {plan.seats === null ? (
                        <span className="flex items-center gap-1 font-bold text-white">
                          <InfinityIcon className="w-3.5 h-3.5 text-emerald-400" /> Unlimited Students
                        </span>
                      ) : plan.seats === 'custom' ? (
                        <span className="font-bold text-white">Custom Student Limit</span>
                      ) : (
                        <span className="font-bold text-white">{plan.seats} Student Seats</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1.5">{plan.desc}</p>
                  </button>
                );
              })}
            </div>

            {/* Custom limit input — only when Custom plan selected */}
            {selectedPlan === 'Custom' && (
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-4">
                <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Custom Student Seat Limit *</label>
                  <input
                    type="number"
                    min={1}
                    value={customLimit}
                    onChange={(e) => setCustomLimit(Number(e.target.value))}
                    required
                    className="w-full sm:w-48 bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            )}

            {/* Summary */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <p className="text-xs text-slate-300">
                <span className="font-bold text-white">{selectedPlan}</span> plan —{' '}
                {selectedPlan === 'Enterprise' ? (
                  <span className="font-bold text-emerald-400">Unlimited student seats</span>
                ) : (
                  <>
                    <span className="font-bold text-white">{getStudentLimit()}</span> student seats
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Link
              href="/admin"
              className="px-5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-500 hover:to-emerald-400 text-white text-xs font-bold shadow-lg shadow-blue-600/20 transition disabled:opacity-50"
            >
              {loading ? 'Creating Institute...' : 'Create Institute & Admin Account'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
