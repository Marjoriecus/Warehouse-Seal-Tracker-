"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Home() {
  const [sealId, setSealId] = useState('');
  const [dept, setDept] = useState('Inbound Department');
  const [sealsList, setSealsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewFilter, setViewFilter] = useState('All');

  const departments = ['Inbound Department', 'Shipping Department', 'Bella Canva'];

  const fetchSeals = async () => {
    const { data, error } = await supabase
      .from('seals')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setSealsList(data);
  };

  useEffect(() => { fetchSeals(); }, []);

  const filteredSeals = sealsList.filter(seal => {
    const matchesSearch = seal.seal_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = viewFilter === 'All' || seal.department === viewFilter;
    return matchesSearch && matchesDept;
  });

  const handleIntake = async (e) => {
    e.preventDefault();
    if (!sealId) return;
    setLoading(true);
    const { error } = await supabase
      .from('seals')
      .insert([{ seal_id: sealId.toUpperCase(), department: dept, status: 'In Stock' }]);
    setLoading(false);
    if (!error) {
      setSealId('');
      fetchSeals();
    }
  };

  const markAsUsed = async (id) => {
    const { error } = await supabase.from('seals').update({ status: 'Applied' }).eq('id', id);
    if (!error) fetchSeals();
  };

  const deleteSeal = async (id) => {
    if (confirm("Delete this record?")) {
      const { error } = await supabase.from('seals').delete().eq('id', id);
      if (!error) fetchSeals();
    }
  };

  const exportToCSV = () => {
    const headers = ["Seal ID", "Dept", "Status", "Date"];
    const rows = sealsList.map(s => [s.seal_id, s.department, s.status, new Date(s.created_at).toLocaleDateString()]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Warehouse_Report.csv`;
    link.click();
  };

  return (
    <main className="min-h-screen bg-gray-100 p-4 font-sans text-gray-900">
      <div className="max-w-2xl mx-auto shadow-2xl rounded-[30px] overflow-hidden bg-white">
        
        {/* HEADER (Matches image_fe350b.png) */}
        <div className="bg-blue-600 p-10 text-center text-white">
          <h1 className="text-3xl font-black uppercase tracking-tighter">Warehouse Seal Tracker</h1>
          <p className="text-sm font-medium opacity-90 mt-1">Full-Stack Inventory System</p>
        </div>

        <div className="p-8 space-y-8">
          
          {/* ACTION BUTTON (Replaces Scanner) */}
          <button 
            onClick={() => document.getElementById('sealInput').focus()}
            className="w-full border-2 border-dashed border-blue-300 text-blue-600 py-6 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-50 transition active:scale-95"
          >
            📷 Tap to Scan or Type Seal #
          </button>

          {/* INTAKE FORM (Matches image_7b27a9.png) */}
          <form onSubmit={handleIntake} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Seal Serial</label>
                <input 
                  id="sealInput"
                  required 
                  className="w-full p-5 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-xl text-blue-600 uppercase focus:ring-4 focus:ring-blue-100 outline-none transition" 
                  placeholder="ID" 
                  value={sealId} 
                  onChange={(e) => setSealId(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Intake To</label>
                <select 
                  className="w-full p-5 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-gray-700 focus:ring-4 focus:ring-blue-100 outline-none transition appearance-none" 
                  value={dept} 
                  onChange={(e) => setDept(e.target.value)}
                >
                  {departments.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <button className="w-full bg-green-500 hover:bg-green-600 text-white p-5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-green-200 transition active:scale-95 flex items-center justify-center gap-2">
              ✅ Add to Inventory
            </button>
          </form>

          <div className="border-t border-gray-100 pt-8 space-y-6">
            
            {/* FILTER TABS */}
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {['All', ...departments].map((d) => (
                <button 
                  key={d}
                  onClick={() => setViewFilter(d)}
                  className={`px-5 py-2.5 rounded-full text-[11px] font-black transition whitespace-nowrap uppercase tracking-tighter ${viewFilter === d ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                >
                  {d}
                </button>
              ))}
            </div>

            {/* SEARCH & EXPORT */}
            <div className="flex gap-3">
              <div className="relative flex-1">
                <input 
                  className="w-full p-4 pl-12 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition"
                  placeholder="Search Seal ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <span className="absolute left-4 top-4.5 text-blue-400">🔍</span>
              </div>
              <button 
                onClick={exportToCSV}
                className="bg-slate-900 text-white px-6 rounded-2xl text-[11px] font-black hover:bg-slate-800 transition uppercase tracking-widest"
              >
                CSV Export
              </button>
            </div>

            {/* INVENTORY LIST */}
            <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
              {filteredSeals.map((seal) => (
                <div key={seal.id} className="flex justify-between items-center p-5 bg-white rounded-[24px] border border-gray-100 shadow-sm hover:shadow-md transition">
                  <div>
                    <p className="font-mono font-black text-lg text-blue-600 tracking-tight">{seal.seal_id}</p>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">
                      {seal.department} • <span className={seal.status === 'Applied' ? 'text-orange-500' : 'text-green-500'}>{seal.status}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => markAsUsed(seal.id)} 
                      className="bg-orange-50 text-orange-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-orange-500 hover:text-white transition shadow-sm"
                    >
                      Apply
                    </button>
                    <button onClick={() => deleteSeal(seal.id)} className="text-gray-200 hover:text-red-500 transition text-xl">🗑️</button>
                  </div>
                </div>
              ))}
              {filteredSeals.length === 0 && (
                <div className="text-center py-12 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100">
                  <p className="text-gray-400 font-bold text-sm uppercase tracking-widest italic">No records found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}