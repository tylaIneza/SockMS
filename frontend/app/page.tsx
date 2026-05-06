'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, getUser } from '@/lib/auth';

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    const token = getToken();
    const user  = getUser();
    if (!token || !user) { router.push('/login'); return; }
    router.push(user.role === 'super_admin' ? '/admin' : '/branch');
  }, []);
  return null;
}
