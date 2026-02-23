"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function Home() {
  // --- STATE (Memory) ---
  const [sealId, setSealId] = useState('');
  const [dept, setDept] = useState('Dept A');
  const [sealsList, setSealsList] = useState([]);
  const [loading, setLoading] = useState(false);

  // --- DATABASE ACTIONS ---
  
  // 1. Get all seals from Supabase
  const fetchSeals = async () => {
    const { data, error } = await supabase
      .from('seals')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) console.error("Error fetching:", error);
    else setSealsList(data);
  };

  // Run fetch on page load
  useEffect(() => {
    fetchSeals();
  }, []);

  // 2. Add a new seal
  const handleIntake = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase
      .from('seals')
      .insert([{ seal_id: sealId, department: dept, status: 'In Stock' }]);

    setLoading(false);
    if (error) {
      alert("Error: " + error.message);
    } else {
      setSealId('');
      fetchSeals(); // Refresh list
    }
  };

  // 3. Update seal to "Applied"
  const markAsUsed = async (id) => {
    const { error } = await supabase
      .from('seals')
      .update({ status: 'Applied' })
      .eq('id', id);
    
    if (error) alert(error.message);
    else fetchSeals();
  };

  // 4. Delete a seal
  const deleteSeal = async (id) => {
    if (confirm("Permanently delete this seal record?")) {
      const { error } = await supabase.from('seals').delete().eq('id', id);
      if (!error) fetchSeals();
    }
  };

  // --- SCANNER LOGIC ---
  const startScanner = () => {
    const scanner = new Html5QrcodeScanner("reader", { 
      fps: 10, 
      qrbox: { width: 250, height: 250 } 
    });

    scanner.render((decodedText) => {
      setSealId(decodedText);
      scanner.clear(); // Stop camera after successful scan
    }, (error) => { /* ignore scan flickering errors */ });
  };

  // --- EXPORT TO CSV ---
  const exportToCSV = () => {
    if (sealsList.length === 0) {
      alert("No data to export!");
      return;
    }
    const headers = ["Seal ID", "Department", "Status", "Date Created"];
    const rows = sealsList.map(seal => [
      seal.seal_id,
      seal.department,
      seal.status,
      new Date(seal.created_at).toLocaleDateString()
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Warehouse_Report_${new Date().toLocaleDateString()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <main className="min-h-screen bg-gray-100 p-4 md:p-10 font-sans text-gray-900">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* HEADER & SCANNER SECTION */}
        <div className="bg-white shadow-2xl rounded-3xl overflow-hidden border border-gray-200">
          <div className="bg-blue-700 p-6 text-center text-white">
            <h1 className="text-2xl font-black tracking-tight uppercase">Warehouse Seal Tracker</h1>
            <p className="text-blue-100 text-xs mt-1">Full-Stack Inventory System</p>
          </div>

          <div className="p-6">
            <div id="reader" className="mb-4 overflow-hidden rounded-2xl bg-gray-50"></div>
            
            <button 
              onClick={startScanner}
              className="w-full mb-6 bg-blue-50 hover:bg-blue-100 text-blue-700 py-4 rounded-2xl font-bold border-2 border-dashed border-blue-300 transition-all flex items-center justify-center gap-2"
            >
              📷 Open Camera Scanner
            </button>

            <form onSubmit={handleIntake} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-gray-400 ml-2">Seal Serial</label>
                  <input 
                    required
                    className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-blue-500 outline-none font-mono"
                    placeholder="Enter or Scan ID"
                    value={sealId}
                    onChange={(e) => setSealId(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-gray-400 ml-2">Department</label>
                  <select 
                    className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none appearance-none"
                    value={dept} 
                    onChange={(e) => setDept(e.target.value)}
                  >
                    <option>Dept A</option>
                    <option>Dept B</option>
                    <option>Dept C</option>
                  </select>
                </div>
              </div>
              <button 
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-2xl shadow-lg transition active:scale-95 disabled:opacity-50"
              >
                {loading ? "SAVING..." : "✅ ADD TO INVENTORY"}
              </button>
            </form>
          </div>
        </div>

        {/* LIST SECTION */}
        <div className="bg-white shadow-2xl rounded-3xl overflow-hidden border border-gray-200">
          <div className="bg-gray-900 p-4 flex justify-between items-center text-white px-6">
            <span className="text-sm font-bold tracking-widest uppercase">Current Stock List</span>
            <button 
              onClick={exportToCSV}
              className="bg-gray-700 hover:bg-gray-600 text-xs py-2 px-4 rounded-lg font-bold transition flex items-center gap-2 border border-gray-600"
            >
              📥 Export CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-500 border-b">
                <tr>
                  <th className="p-4">Seal Information</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sealsList.map((seal) => (
                  <tr key={seal.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="p-4">
                      <p className="font-mono font-bold text-blue-700">{seal.seal_id}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">{seal.department}</p>
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-tighter ${seal.status === 'Applied' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                        {seal.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-center gap-2">
                        <button 
                          onClick={() => markAsUsed(seal.id)}
                          className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold transition shadow-sm"
                        >
                          APPLY
                        </button>
                        <button 
                          onClick={() => deleteSeal(seal.id)}
                          className="bg-red-50 hover:bg-red-100 text-red-500 px-3 py-1.5 rounded-lg transition"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </main>
  );
}