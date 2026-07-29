'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getUser, getToken, getRoleDashboard } from '@/lib/auth';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    const user = getUser();

    if (token && user) {
      const dashboard = getRoleDashboard(user.role);
      router.replace(dashboard);
    } else {
      router.replace('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
      Loading EduStack Platform...
    </div>
  );
}
