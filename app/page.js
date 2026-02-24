"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function Home() {
  const [sealId, setSealId] = useState('');
  const [dept, setDept] = useState('Dept A');
  const [sealsList, setSealsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchSeals = async () => {
    const { data, error } = await supabase
      .from('seals')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setSealsList(data);
  };

  useEffect(() => { fetchSeals(); }, []);

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
    if (confirm("Delete this record?")) {
      const { error } = await supabase.from('seals').delete().eq('id', id);
      if (!error) fetchSeals();
    }
  };

  const startScanner = () => {
    const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 });
    scanner.render((text) => { setSealId(text); scanner.clear(); });
  };

  return (
    <main className="min-h-screen bg-gray-100 p-4 font-sans text-gray-900">
      <div className="max-w-2xl mx-auto shadow-2xl rounded-[30px] overflow-hidden bg-white">
        
        {/* ORIGINAL BLUE HEADER */}
        <div className="bg-blue-600 p-8 text-center text-white">
          <h1 className="text-2xl font-black uppercase tracking-tight">Warehouse Seal Tracker</h1>
          <p className="text-xs opacity-80 mt-1">Full-Stack Inventory System</p>
        </div>

        <div className="p-6 space-y-6">
          {/* SCANNER AREA */}
          <div id="reader" className="overflow-hidden rounded-xl bg-gray-50"></div>
          
          <button onClick={startScanner} className="w-full border-2 border-dashed border-blue-400 text-blue-600 py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-50 transition">
            📷 Open Camera Scanner
          </button>

          {/* INPUT FIELDS */}
          <form onSubmit={handleIntake} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Seal Serial</label>
                <input required className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl font-medium" placeholder="Enter or Scan ID" value={sealId} onChange={(e) => setSealId(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Department</label>
                <select className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl font-medium" value={dept} onChange={(e) => setDept(e.target.value)}>
                  <option>Dept A</option>
                  <option>Dept B</option>
                  <option>Dept C</option>
                </select>
              </div>
            </div>
            <button className="w-full bg-green-600 text-white p-4 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-green-100 active:scale-95 transition">
              ✅ Add to Inventory
            </button>
          </form>

          <hr className="border-gray-100" />

          {/* SEARCH BAR (CLEAN STYLE) */}
          <div className="relative">
            <input 
              className="w-full p-3 pl-10 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 transition"
              placeholder="Search by Seal ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span className="absolute left-3 top-3 text-gray-300">🔍</span>
          </div>

          {/* LIVE LIST */}
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