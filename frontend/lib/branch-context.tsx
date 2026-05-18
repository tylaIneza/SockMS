'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import api from './api';

interface UserContextType {
  selectedUser: string;
  setSelectedUser: (id: string) => void;
  users: any[];
}

const UserContext = createContext<UserContextType>({
  selectedUser: 'all',
  setSelectedUser: () => {},
  users: [],
});

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const [selectedUser, setSelectedUserState] = useState('all');
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('admin_selected_user');
    if (saved) setSelectedUserState(saved);
    api.get('/users').then(r => setUsers(r.data.filter((u: any) => u.role === 'branch_user'))).catch(() => {});
  }, []);

  const setSelectedUser = (id: string) => {
    setSelectedUserState(id);
    localStorage.setItem('admin_selected_user', id);
  };

  return (
    <UserContext.Provider value={{ selectedUser, setSelectedUser, users }}>
      {children}
    </UserContext.Provider>
  );
}

export const useBranch = () => useContext(UserContext);
