"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function Home() {
  const [sealId, setSealId] = useState('');
  const [dept, setDept] = useState('Dept A');
  const [sealsList, setSealsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState(''); // State for search

  const fetchSeals = async () => {
    const { data, error } = await supabase
      .from('seals')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setSealsList(data);
  };

  useEffect(() => { fetchSeals(); }, []);

  // --- SEARCH FILTER LOGIC ---
  // This looks at your list and only shows what matches the search box
  const filteredSeals = sealsList.filter(seal => 
    seal.seal_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    if (confirm("Permanently delete this seal record?")) {
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
    <main className="min-h-screen bg-gray-100 p-4 md:p-10 font-sans text-gray-900">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* TOP SECTION: SCAN & ADD */}
        <div className="bg-white shadow-xl rounded-3xl p-6 border border-gray-200">
          <h1 className="text-xl font-black text-blue-700 mb-4 uppercase tracking-tight">Seal Intake</h1>
          <div id="reader" className="mb-4 rounded-2xl overflow-hidden bg-gray-50"></div>
          <button onClick={startScanner} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold mb-4 transition">
            📷 Open Scanner
          </button>
          
          <form onSubmit={handleIntake} className="space-y-3">
            <input required className="w-full p-4 border rounded-xl font-mono bg-gray-50" placeholder="Seal ID" value={sealId} onChange={(e) => setSealId(e.target.value)} />
            <select className="w-full p-4 border rounded-xl bg-gray-50" value={dept} onChange={(e) => setDept(e.target.value)}>
              <option>Dept A</option>
              <option>Dept B</option>
              <option>Dept C</option>
            </select>
            <button disabled={loading} className="w-full bg-green-600 text-white p-4 rounded-xl font-bold shadow-lg">
              {loading ? "SAVING..." : "ADD TO STOCK"}
            </button>
          </form>
        </div>

        {/* BOTTOM SECTION: INVENTORY & SEARCH */}
        <div className="bg-white shadow-xl rounded-3xl overflow-hidden border border-gray-200">
          <div className="p-6 bg-gray-900 space-y-4">
            <div className="flex justify-between items-center">
               <h2 className="text-white font-bold uppercase text-sm tracking-widest">Inventory List</h2>
               <button onClick={exportToCSV} className="text-xs bg-gray-700 text-gray-300 px-3 py-1 rounded-md hover:bg-gray-600">CSV Export</button>
            </div>
            
            {/* --- THE SEARCH BAR --- */}
            <div className="relative">
              <input 
                className="w-full p-3 pl-10 rounded-xl bg-gray-800 text-white border border-gray-700 outline-none focus:border-blue-500 transition"
                placeholder="Search Seal ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <span className="absolute left-3 top-3.5 opacity-40">🔍</span>
            </div>
          </div>

          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full text-left">
              <tbody className="divide-y divide-gray-100">
                {filteredSeals.map((seal) => (
                  <tr key={seal.id} className="hover:bg-blue-50 transition-colors">
                    <td className="p-4">
                      <p className="font-mono font-bold text-blue-600">{seal.seal_id}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">{seal.department}</p>
                    </td>
                    <td className="p-4">
                       <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${seal.status === 'Applied' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                        {seal.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end items-center gap-3">
                        <button onClick={() => markAsUsed(seal.id)} className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded-lg text-xs font-bold transition">Apply</button>
                        <button onClick={() => deleteSeal(seal.id)} className="text-red-300 hover:text-red-500 transition text-lg">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredSeals.length === 0 && (
                  <tr><td colSpan="3" className="p-10 text-center text-gray-400 text-sm italic">No seals found matching that ID</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}