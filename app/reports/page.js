"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import Link from 'next/link';

export default function Reports() {
  const [reportData, setReportData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchReports = async () => {
    // We only want to see seals that have been "Applied"
    const { data, error } = await supabase
      .from('seals')
      .select('*')
      .eq('status', 'Applied')
      .order('applied_at', { ascending: false });
    
    if (!error) setReportData(data);
  };

  useEffect(() => { fetchReports(); }, []);

  const filtered = reportData.filter(s => 
    s.seal_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.container_num?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-10 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* TOP NAV */}
        <div className="flex justify-between items-center">
          <Link href="/" className="text-xs font-black uppercase text-blue-600 hover:underline">
            ← Back to Tracker
          </Link>
          <h1 className="text-2xl font-black uppercase tracking-tighter text-slate-800">
            Seal Audit Report
          </h1>
        </div>

        {/* SEARCH & STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <input 
              className="w-full p-4 rounded-2xl border-none shadow-sm font-bold text-sm outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Search by Seal ID or Container..."
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="bg-blue-600 rounded-2xl p-4 text-white flex justify-between items-center">
            <span className="text-[10px] font-black uppercase opacity-80">Total Applied</span>
            <span className="text-2xl font-black">{filtered.length}</span>
          </div>
        </div>

        {/* DATA TABLE */}
        <div className="bg-white rounded-[30px] shadow-xl overflow-hidden border border-slate-100">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white text-[10px] uppercase font-black tracking-widest">
                  <th className="p-5">Seal ID</th>
                  <th className="p-5">Date/Time</th>
                  <th className="p-5">Container / Door</th>
                  <th className="p-5">Issuer</th>
                  <th className="p-5">Applied By</th>
                  <th className="p-5">Notes/Comments</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-blue-50/50 transition">
                    <td className="p-5 font-mono font-black text-blue-600">{row.seal_id}</td>
                    <td className="p-5 text-xs font-bold text-slate-500">
                      {new Date(row.applied_at).toLocaleDateString()}<br/>
                      <span className="opacity-50">{new Date(row.applied_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </td>
                    <td className="p-5">
                      <p className="text-xs font-black text-slate-800">{row.container_num}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Door: {row.dock_door}</p>
                    </td>
                    <td className="p-5 text-xs font-bold text-slate-600">{row.issuer_name}</td>
                    <td className="p-5 text-xs font-bold text-slate-600">{row.applied_by_name}</td>
                    <td className="p-5">
                      <div className="max-w-[200px] text-[11px] leading-relaxed text-slate-500 italic bg-slate-50 p-3 rounded-xl border border-slate-100">
                        {row.comments || "No notes provided."}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="p-20 text-center text-slate-300 font-black uppercase tracking-widest">
              No Applied Seals Found
            </div>
          )}
        </div>
      </div>
    </main>
  );
}