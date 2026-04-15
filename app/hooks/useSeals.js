import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'sonner'; 

export function useSeals(user, userRole, userDept) {
  const [sealsList, setSealsList] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewFilter, setViewFilter] = useState('All');

  const fetchSeals = async () => {
    if (!user || !userRole) return;
    
    try {
      let query = supabase.from('seals').select('*');
      if (userRole !== 'admin' && userDept) {
        query = query.eq('department', userDept);
      }
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      setSealsList(data || []);
    } catch (err) {
      console.error("Fetch seals error:", err);
      toast.error("Failed to sync inventory. Please check connection.");
    }
  };

  useEffect(() => {
    fetchSeals();
  }, [user, userRole, userDept]);

  const deleteSeal = async (id) => {
    if (confirm("Delete this record permanently?")) {
      setIsProcessing(true); // Lock the UI while deleting
      
      try {
        const { error } = await supabase.from('seals').delete().eq('id', id);
        if (error) throw error;
        
        await fetchSeals(); // Wait for the fresh list to load
        toast.success("Record permanently removed from inventory"); 
      } catch (err) {
        toast.error("Delete failed: " + err.message); 
      } finally {
        setIsProcessing(false); // Unlock the UI
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