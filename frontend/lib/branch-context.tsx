'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import api from './api';

interface BranchContextType {
  selectedBranch: string;
  setSelectedBranch: (id: string) => void;
  branches: any[];
}

const BranchContext = createContext<BranchContextType>({
  selectedBranch: 'all',
  setSelectedBranch: () => {},
  branches: [],
});

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const [selectedBranch, setSelectedBranchState] = useState('all');
  const [branches, setBranches] = useState<any[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('admin_selected_branch');
    if (saved) setSelectedBranchState(saved);
    api.get('/branches').then(r => setBranches(r.data)).catch(() => {});
  }, []);

  const setSelectedBranch = (id: string) => {
    setSelectedBranchState(id);
    localStorage.setItem('admin_selected_branch', id);
  };

  return (
    <BranchContext.Provider value={{ selectedBranch, setSelectedBranch, branches }}>
      {children}
    </BranchContext.Provider>
  );
}

export const useBranch = () => useContext(BranchContext);
