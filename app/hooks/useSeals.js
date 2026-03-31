import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'sonner'; // 1. Add the import

export function useSeals(user, userRole, userDept) {
  const [sealsList, setSealsList] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewFilter, setViewFilter] = useState('All');

  const fetchSeals = async () => {
    if (!user || !userRole) return;
    let query = supabase.from('seals').select('*');
    if (userRole !== 'admin' && userDept) {
      query = query.eq('department', userDept);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (!error) setSealsList(data);
  };

  useEffect(() => {
    fetchSeals();
  }, [user, userRole, userDept]);

  // 2. Add the toasts inside this function
  const deleteSeal = async (id) => {
    if (confirm("Delete this record permanently?")) {
      const { error } = await supabase.from('seals').delete().eq('id', id);
      
      if (!error) {
        fetchSeals();
        toast.success("Record permanently removed from inventory"); // Success feedback
      } else {
        toast.error("Delete failed: " + error.message); // Error feedback
      }
    }
  };

  const filteredSeals = sealsList.filter(seal => {
    const matchesSearch = seal.seal_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = viewFilter === 'All' || seal.department === viewFilter;
    return matchesSearch && matchesDept;
  });

  const inStockSeals = filteredSeals.filter(seal => seal.status !== 'Applied');
  const usedSeals = filteredSeals.filter(seal => seal.status === 'Applied');

  return {
    sealsList,
    inStockSeals,
    usedSeals,
    searchTerm,
    setSearchTerm,
    viewFilter,
    setViewFilter,
    isProcessing,
    setIsProcessing,
    fetchSeals,
    deleteSeal
  };
}