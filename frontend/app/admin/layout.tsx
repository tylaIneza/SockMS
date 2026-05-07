'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { getToken, getUser } from '@/lib/auth';
import { BranchProvider } from '@/lib/branch-context';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const token = getToken(); const user = getUser();
    if (!token || !user || user.role !== 'super_admin') { router.push('/login'); return; }
    setOk(true);
  }, []);
  if (!ok) return <div className="min-h-screen bg-gray-50" />;
  return (
    <BranchProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </BranchProvider>
  );
}
