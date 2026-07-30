'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  GraduationCap,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Video,
  BookOpen,
  Award,
  HelpCircle,
  Users,
  Palette,
  Layers,
  ChevronRight,
  Play,
  Lock,
  Globe,
  Zap,
  Clock,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { getUser, getToken, getRoleDashboard } from '@/lib/auth';

const DotGrid = dynamic(() => import('@/components/DotGrid'), { ssr: false });
const SplitText = dynamic(() => import('@/components/SplitText'), { ssr: false });
const MagicBento = dynamic(() => import('@/components/MagicBento'), { ssr: false });
const GradientText = dynamic(() => import('@/components/GradientText'), { ssr: false });

export default function LandingPage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userDashboardPath, setUserDashboardPath] = useState('/login');

  useEffect(() => {
    const token = getToken();
    const user = getUser();
    if (token && user) {
      setIsLoggedIn(true);
      setUserDashboardPath(getRoleDashboard(user.role));
    }
  }, []);

  return (
    <div
      className="min-h-screen w-full bg-slate-950 text-slate-100 font-sans antialiased relative overflow-hidden selection:bg-blue-500 selection:text-white"
      suppressHydrationWarning
    >
      {/* Interactive Dot Grid Background from React Bits */}
      <div className="absolute inset-0 pointer-events-none z-0 opacity-50">
        <DotGrid
          dotSize={12}
          gap={28}
          baseColor="#334155"
          activeColor="#38bdf8"
          proximity={140}
          shockRadius={240}
          shockStrength={6}
          resistance={750}
          returnDuration={1.5}
        />
      </div>

      {/* Dynamic Background Glow Orbs */}
      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] bg-emerald-500/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 left-1/3 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Navigation Header */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between z-20 relative border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-emerald-400 p-0.5 shadow-lg shadow-blue-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              EduStack
            </span>
            <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              SaaS Platform
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {isLoggedIn ? (
            <Link
              href={userDashboardPath}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-500 hover:to-emerald-400 text-white text-xs font-bold transition shadow-lg shadow-blue-600/25 active:scale-95"
            >
              <span>Go to Your Portal</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-500 hover:to-emerald-400 text-white text-xs font-bold transition shadow-lg shadow-blue-600/25 active:scale-95"
            >
              <span>Sign In to Portal</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 text-center z-10 relative space-y-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/90 border border-slate-800 text-blue-400 text-xs font-semibold shadow-inner">
          <Sparkles className="w-4 h-4 text-blue-400 animate-spin" style={{ animationDuration: '6s' }} />
          <span>Next-Gen Academy Infrastructure for Coaching Institutes</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold tracking-tight text-white max-w-6xl mx-auto leading-[1.15] space-y-2">
          <span className="block">
            <SplitText
              tag="span"
              text="Launch your own ONLINE"
              className="inline-block"
              delay={40}
              duration={1}
              ease="power3.out"
              splitType="words"
              from={{ opacity: 0, y: 40 }}
              to={{ opacity: 1, y: 0 }}
              textAlign="center"
            />
          </span>
          <span className="block pt-1 flex flex-nowrap items-center justify-center gap-x-3 whitespace-nowrap">
            <SplitText
              tag="span"
              text="coaching platform in"
              className="inline-block"
              delay={40}
              duration={1}
              ease="power3.out"
              splitType="words"
              from={{ opacity: 0, y: 40 }}
              to={{ opacity: 1, y: 0 }}
              textAlign="center"
            />
            <GradientText
              colors={['#60a5fa', '#34d399', '#a78bfa', '#38bdf8', '#60a5fa']}
              animationSpeed={4}
              showBorder={false}
              className="inline-flex"
            >
              30 minutes
            </GradientText>
          </span>
        </h1>

        <p className="text-slate-400 text-base sm:text-xl max-w-3xl mx-auto leading-relaxed">
          EduStack provides complete digital infrastructure—video lecture streaming with 90% progress tracking, PDF notes, scheduled live classes, auto-graded MCQ tests, and multi-tenant security—with zero custom dev cost.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-blue-600 via-teal-500 to-emerald-500 hover:from-blue-500 hover:to-emerald-400 text-white text-sm font-bold shadow-xl shadow-blue-600/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
          >
            <span>Launch Your Academy Now</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="#features"
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 text-sm font-semibold transition-all flex items-center justify-center gap-2"
          >
            <span>Explore Platform Features</span>
            <ChevronRight className="w-4 h-4" />
          </a>
        </div>

        {/* Highlight Metrics Cards with Hover Animations */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto pt-10">
          <div className="group relative p-6 rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-slate-800/90 hover:border-blue-500/50 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-blue-500/15 cursor-pointer overflow-hidden text-left space-y-2">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-blue-400 to-sky-300 bg-clip-text text-transparent">
                24 Hours
              </span>
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-sm font-bold text-white tracking-wide">Turnkey Setup</h3>
            <p className="text-xs text-slate-400 leading-relaxed">Launch your complete institute academy infrastructure in under 24 hours.</p>
          </div>

          <div className="group relative p-6 rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-slate-800/90 hover:border-emerald-500/50 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-emerald-500/15 cursor-pointer overflow-hidden text-left space-y-2">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                100%
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-sm font-bold text-white tracking-wide">Tenant Data Isolation</h3>
            <p className="text-xs text-slate-400 leading-relaxed">Strict multi-tenant security architecture with database row constraints.</p>
          </div>

          <div className="group relative p-6 rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-slate-800/90 hover:border-teal-500/50 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-teal-500/15 cursor-pointer overflow-hidden text-left space-y-2">
            <div className="absolute inset-0 bg-gradient-to-br from-teal-600/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-teal-400 to-emerald-300 bg-clip-text text-transparent">
                ₹0
              </span>
              <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Zap className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-sm font-bold text-white tracking-wide">Custom Dev Expense</h3>
            <p className="text-xs text-slate-400 leading-relaxed">Zero initial software engineering or custom development fees required.</p>
          </div>

          <div className="group relative p-6 rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-slate-800/90 hover:border-purple-500/50 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-purple-500/15 cursor-pointer overflow-hidden text-left space-y-2">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-purple-400 to-pink-300 bg-clip-text text-transparent">
                4 Portals
              </span>
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Globe className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-sm font-bold text-white tracking-wide">Integrated Workspaces</h3>
            <p className="text-xs text-slate-400 leading-relaxed">Dedicated portals for Super Admin, Institute Admin, Teacher, and Student.</p>
          </div>
        </div>
      </section>

      {/* Interactive Platform Mockup Preview */}
      <section className="w-full max-w-6xl mx-auto px-4 pb-24 z-10 relative">
        <div className="bg-slate-900/90 backdrop-blur-2xl border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl shadow-black/80 relative overflow-hidden group">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500/80" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="ml-3 text-xs font-mono text-slate-500">https://academy.edustack.com</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400 bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Multi-Tenant Secured</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between text-blue-400">
                <span className="text-xs font-bold">STUDENT PORTAL</span>
                <Play className="w-4 h-4 fill-blue-400" />
              </div>
              <h4 className="text-sm font-bold text-white">Video Streaming & 90% Progress</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Adaptive video player with automated progress completion tracking and PDF study notes.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between text-teal-400">
                <span className="text-xs font-bold">TEACHER WORKSPACE</span>
                <Video className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-white">Live Classes & MCQ Builder</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                One-click Google Meet/Zoom scheduling, attendance marking, and auto-graded test engine.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between text-emerald-400">
                <span className="text-xs font-bold">INSTITUTE ADMIN</span>
                <Palette className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-white">Logo & Color Branding</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                White-label your academy with custom logo branding and primary/secondary color schemes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features MagicBento Section */}
      <section id="features" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 z-10 relative space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Everything Your Coaching Institute Needs
          </h2>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
            Engineered specifically for Indian coaching academies to deliver a world-class digital learning experience.
          </p>
        </div>

        <MagicBento
          textAutoHide={true}
          enableStars={true}
          enableSpotlight={true}
          enableBorderGlow={true}
          enableTilt={true}
          enableMagnetism={true}
          clickEffect={true}
          spotlightRadius={300}
          particleCount={12}
          glowColor="59, 130, 246"
        />
      </section>

      {/* CTA Section */}
      <section className="w-full max-w-5xl mx-auto px-4 pb-24 z-10 relative">
        <div className="bg-gradient-to-r from-blue-900/60 via-slate-900 to-emerald-900/60 border border-slate-800 rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-2xl">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Ready to Take Your Coaching Institute Digital?
          </h2>
          <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Join coaching institutes across India powering their digital academies with EduStack. Access your workspace in seconds.
          </p>
          <div className="pt-2">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-blue-600 via-teal-500 to-emerald-500 hover:from-blue-500 hover:to-emerald-400 text-white text-sm font-bold shadow-xl shadow-blue-600/30 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
            >
              <span>Sign In to Your Academy Portal</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full border-t border-slate-800/80 py-8 text-center text-xs text-slate-500 z-10 relative">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-blue-400" />
            <span className="font-bold text-slate-300">EduStack SaaS Platform</span>
          </div>
          <p>© 2026 EduStack. Built for Indian Coaching Institutes.</p>
          <div className="flex items-center gap-2 text-slate-400">
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            <span>Tenant Isolated Network</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
