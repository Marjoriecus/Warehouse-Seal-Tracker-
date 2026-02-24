"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function Home() {
  const [sealId, setSealId] = useState('');
  const [dept, setDept] = useState('Inbound Department'); // Default updated
  const [sealsList, setSealsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewFilter, setViewFilter] = useState('All');

  // Updated Department List
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
    setLoading(true);
    const { error } = await supabase
      .from('seals')
      .insert([{ seal_id: sealId, department: dept, status: 'In Stock' }]);
    setLoading(false);
    if (!error) { setSealId(''); fetchSeals(); }
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

  const startScanner = () => {
    const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 });
    scanner.render((text) => { setSealId(text); scanner.clear(); });
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
        
        {/* CLEAN BLUE HEADER */}
        <div className="bg-blue-600 p-8 text-center text-white">
          <h1 className="text-2xl font-black uppercase tracking-tight">Warehouse Seal Tracker</h1>
          <p className="text-xs opacity-80 mt-1">Full-Stack Inventory System</p>
        </div>

        <div className="p-6 space-y-6">
          <div id="reader" className="overflow-hidden rounded-xl bg-gray-50"></div>
          <button onClick={startScanner} className="w-full border-2 border-dashed border-blue-400 text-blue-600 py-4 rounded-xl font-bold hover:bg-blue-50 transition">
            📷 Open Camera Scanner
          </button>

          <form onSubmit={handleIntake} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Seal Serial</label>
                <input required className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl font-medium" placeholder="ID" value={sealId} onChange={(e) => setSealId(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Intake To</label>
                <select className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl font-medium" value={dept} onChange={(e) => setDept(e.target.value)}>
                  {departments.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <button className="w-full bg-green-600 text-white p-4 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-green-100 active:scale-95 transition">
              ✅ Add to Inventory
            </button>
          </form>

          <hr className="border-gray-100" />

          {/* MANAGEMENT CONTROLS */}
          <div className="space-y-3">
             <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {['All', ...departments].map((d) => (
                <button 
                  key={d}
                  onClick={() => setViewFilter(d)}
                  className={`px-4 py-2 rounded-full text-[10px] font-bold transition whitespace-nowrap ${viewFilter === d ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}
                >
                  {d}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <input 
                  className="w-full p-3 pl-10 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100"
                  placeholder="Search Seal ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <span className="absolute left-3 top-3 text-gray-300">🔍</span>
              </div>
              
              <button 
                onClick={exportToCSV}
                className="bg-gray-900 text-white px-4 rounded-xl text-[10px] font-bold hover:bg-gray-800 transition uppercase"
              >
                CSV Export
              </button>
            </div>
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
            {filteredSeals.map((seal) => (
              <div key={seal.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div>
                  <p className="font-mono font-bold text-blue-700">{seal.seal_id}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">{seal.department} • {seal.status}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => markAsUsed(seal.id)} className="bg-orange-100 text-orange-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase hover:bg-orange-200 transition">Apply</button>
                  <button onClick={() => deleteSeal(seal.id)} className="text-gray-300 hover:text-red-500 transition">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}