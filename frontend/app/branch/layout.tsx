'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { getToken, getUser } from '@/lib/auth';

export default function BranchLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const token = getToken(); const user = getUser();
    if (!token || !user) { router.push('/login'); return; }
    if (user.role === 'super_admin') { router.push('/admin'); return; }
    setOk(true);
  }, []);
  if (!ok) return <div className="min-h-screen bg-gray-50" />;
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
