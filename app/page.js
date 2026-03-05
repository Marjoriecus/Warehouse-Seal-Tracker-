"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Home() {
  // --- APP STATE ---
  const [sealId, setSealId] = useState('');
  const [dept, setDept] = useState('Inbound Department');
  const [sealsList, setSealsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewFilter, setViewFilter] = useState('All');

  // --- WORKFLOW STATE ---
  const [currentView, setCurrentView] = useState('LIST'); 
  const [activeSeal, setActiveSeal] = useState(null);
  const [issuerInfo, setIssuerInfo] = useState({ name: '', title: '' });
  
  // --- MODAL & UPLOAD STATE ---
  const [viewingSeal, setViewingSeal] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);

  // --- CORRECTION THREAD STATE ---
  const [correctionNotes, setCorrectionNotes] = useState([]);
  const [newNote, setNewNote] = useState('');

  const departments = ['Inbound Department', 'Shipping Department', 'Outbound Deparment'];

  // --- DATA FETCHING ---
  const fetchSeals = async () => {
    const { data, error } = await supabase
      .from('seals')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setSealsList(data);
  };

  // FETCH NOTES WHEN MODAL OPENS
  useEffect(() => {
    if (viewingSeal) {
      fetchNotes(viewingSeal.id);
    } else {
      setCorrectionNotes([]);
    }
  }, [viewingSeal]);

  const fetchNotes = async (id) => {
    const { data, error } = await supabase
      .from('seal_notes')
      .select('*')
      .eq('seal_id', id)
      .order('created_at', { ascending: true });
    if (!error) setCorrectionNotes(data);
  };

  useEffect(() => { fetchSeals(); }, []);

  // --- SEARCH & FILTER LOGIC ---
  const filteredSeals = sealsList.filter(seal => {
    const matchesSearch = seal.seal_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = viewFilter === 'All' || seal.department === viewFilter;
    return matchesSearch && matchesDept;
  });

  // --- STEP 1: ADD SEAL TO INVENTORY ---
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

  // --- STEP 2: START APPLICATION PROCESS ---
  const startApplyProcess = (seal) => {
    setActiveSeal(seal);
    setCurrentView('ISSUER');
  };

  const handleIssuerSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    setIssuerInfo({
      name: formData.get('issuerName'),
      title: formData.get('issuerTitle')
    });
    setCurrentView('DETAILS');
  };

  // --- STEP 3: FINAL SAVE WITH COMPRESSION ---
  const handleFinalSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.target);
    const details = Object.fromEntries(formData);
    const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB Limit

    let finalPhotoUrl = null;

    if (photoFile) {
      if (photoFile.size > MAX_FILE_SIZE) {
        alert("Original file too large! Please use a photo under 2MB.");
        setLoading(false);
        return;
      }

      try {
        const compressedBlob = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(photoFile);
          reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const MAX_WIDTH = 800; 
              const scaleSize = MAX_WIDTH / img.width;
              canvas.width = MAX_WIDTH;
              canvas.height = img.height * scaleSize;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              canvas.toBlob((blob) => {
                if (blob) resolve(blob);
                else reject(new Error("Compression failed"));
              }, 'image/jpeg', 0.4);
            };
          };
          reader.onerror = (err) => reject(err);
        });

        const fileName = `${activeSeal.seal_id}-${Date.now()}.jpg`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('seal-photos')
          .upload(fileName, compressedBlob);

        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('seal-photos').getPublicUrl(fileName);
        finalPhotoUrl = publicUrlData.publicUrl;
      } catch (err) {
        alert("Photo processing failed: " + err.message);
        setLoading(false);
        return;
      }
    }

    const { error } = await supabase
      .from('seals')
      .update({
        status: 'Applied',
        issuer_name: issuerInfo.name,
        issuer_title: issuerInfo.title,
        container_num: details.containerNum,
        dock_door: details.dockDoor,
        company_name: details.companyName,
        applied_by_name: details.appliedByName,
        applied_by_title: details.appliedByTitle,
        comments: details.comments, 
        photo_url: finalPhotoUrl,
        applied_at: new Date()
      })
      .eq('id', activeSeal.id);

    setLoading(false);
    if (!error) {
      alert("Success! Record Saved & Compressed.");
      setCurrentView('LIST');
      setActiveSeal(null);
      setPhotoFile(null);
      fetchSeals();
    } else {
      alert("Database error: " + error.message);
    }
  };

  // --- STEP 4: POST CORRECTION NOTE ---
  const handleAddCorrection = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    const { error } = await supabase
      .from('seal_notes')
      .insert([{ seal_id: viewingSeal.id, note_text: newNote }]);

    if (!error) {
      setNewNote('');
      fetchNotes(viewingSeal.id); // Refresh thread
    } else {
      alert("Error posting correction: " + error.message);
    }
  };

  const deleteSeal = async (id) => {
    if (confirm("Delete this record permanently?")) {
      const { error } = await supabase.from('seals').delete().eq('id', id);
      if (!error) fetchSeals();
    }
  };

  const exportToCSV = () => {
    const headers = ["Seal ID", "Dept", "Status", "Created Date", "Issued By", "Issuer Title", "Container #", "Dock Door", "Company", "Applied By", "Applied Title", "Applied At", "Original Comments"];
    const rows = sealsList.map(s => [
      s.seal_id, 
      s.department, 
      s.status, 
      new Date(s.created_at).toLocaleDateString(), 
      s.issuer_name || "N/A",
      s.issuer_title || "N/A",
      s.container_num || "N/A",
      s.dock_door || "N/A",
      s.company_name || "N/A",
      s.applied_by_name || "N/A",
      s.applied_by_name || "Pending",
      s.applied_by_title || "N/A",
      s.applied_at ? new Date(s.applied_at). toLocaleString() : "N/A",
      `"${(s.comments || "").replace(/"/g, '""')}"`
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Seal_Audit_Export.csv`;
    link.click();
  };

  return (
    <main className="min-h-screen bg-slate-100 p-4 font-sans text-slate-900">
      <div className="max-w-2xl mx-auto shadow-2xl rounded-[40px] overflow-hidden bg-white relative border border-white">

        {/* HEADER SECTION */}
        <div className="bg-slate-900 p-12 text-center text-white">
          <h1 className="text-4xl font-black uppercase tracking-tighter">Seal Tracker</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-60 mt-2">Warehouse Operations • 2026</p>
        </div>

        {/* --- MAIN LIST VIEW --- */}
        {currentView === 'LIST' && (
          <div className="p-8 space-y-10">
            {/* INTAKE FORM */}
            <form onSubmit={handleIntake} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Seal Serial</label>
                  <input
                    required
                    className="w-full p-5 bg-slate-50 border border-slate-100 rounded-3xl font-mono font-black text-xl text-blue-600 uppercase focus:ring-4 focus:ring-blue-100 outline-none transition"
                    placeholder="UL-XXXXX"
                    value={sealId}
                    onChange={(e) => setSealId(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Assign to Dept</label>
                  <select
                    className="w-full p-5 bg-slate-50 border border-slate-100 rounded-3xl font-bold text-slate-700 outline-none appearance-none cursor-pointer"
                    value={dept}
                    onChange={(e) => setDept(e.target.value)}
                  >
                    {departments.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white p-5 rounded-3xl font-black uppercase tracking-widest transition active:scale-[0.98] disabled:opacity-50">
                {loading ? 'Adding...' : 'Add New Seal'}
              </button>
            </form>

            {/* INVENTORY & FILTERS */}
            <div className="border-t border-slate-100 pt-10 space-y-6">
              <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
                {['All', ...departments].map((d) => (
                  <button key={d} onClick={() => setViewFilter(d)} className={`px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-tight transition whitespace-nowrap ${viewFilter === d ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>
                    {d}
                  </button>
                ))}
              </div>

              <div className="flex gap-4">
                <input
                  className="flex-1 p-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-slate-100"
                  placeholder="Quick Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button onClick={exportToCSV} className="bg-white border-2 border-slate-100 text-slate-900 px-6 rounded-2xl text-[10px] font-black uppercase hover:bg-slate-50">CSV</button>
              </div>

              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {filteredSeals.map((seal) => (
                  <div key={seal.id} className="group flex justify-between items-center p-6 bg-white rounded-[32px] border border-slate-100 shadow-sm hover:shadow-md transition">
                    <div>
                      <button 
                        onClick={() => setViewingSeal(seal)}
                        className="font-mono font-black text-xl text-blue-600 tracking-tighter hover:text-blue-800 hover:underline text-left block"
                      >
                        {seal.seal_id}
                      </button>
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">
                        {seal.department} • <span className={seal.status === 'Applied' ? 'text-orange-500' : 'text-green-500'}>{seal.status}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      {seal.status !== 'Applied' ? (
                        <button onClick={() => startApplyProcess(seal)} className="bg-orange-50 text-orange-600 px-6 py-3 rounded-2xl text-[10px] font-black uppercase hover:bg-orange-500 hover:text-white transition shadow-sm">
                          Apply
                        </button>
                      ) : (
                        <span className="bg-slate-50 text-slate-400 px-4 py-2 rounded-xl text-[9px] font-black uppercase">Complete</span>
                      )}
                      <button onClick={() => deleteSeal(seal.id)} className="text-slate-200 hover:text-red-500 transition-colors p-2 text-xl">🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- FORM VIEW: ISSUER --- */}
        {currentView === 'ISSUER' && (
          <div className="p-12 space-y-10 animate-in fade-in zoom-in duration-300">
            <div className="space-y-2">
              <h2 className="text-3xl font-black uppercase text-slate-900 leading-none">Seal Issued By</h2>
              <div className="h-2 w-20 bg-blue-600 rounded-full"></div>
            </div>
            <form onSubmit={handleIssuerSubmit} className="space-y-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Issuer Name</label>
                  <input name="issuerName" required className="w-full p-6 bg-slate-50 border border-slate-100 rounded-3xl font-bold text-lg" placeholder="Full Name" />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Title</label>
                  <input name="issuerTitle" required className="w-full p-6 bg-slate-50 border border-slate-100 rounded-3xl font-bold text-lg" placeholder="Job Title" />
                </div>
              </div>
              <div className="flex gap-4">
                <button type="button" onClick={() => setCurrentView('LIST')} className="flex-1 py-6 font-black uppercase text-xs text-slate-400">Cancel</button>
                <button type="submit" className="flex-1 bg-slate-900 text-white py-6 rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl shadow-slate-200">Next Step →</button>
              </div>
            </form>
          </div>
        )}

        {/* --- FORM VIEW: DETAILS --- */}
        {currentView === 'DETAILS' && (
          <div className="p-12 space-y-10 animate-in slide-in-from-right duration-400">
             <div className="flex justify-between items-end border-b-4 border-blue-600 pb-4">
              <h2 className="text-3xl font-black uppercase text-slate-900">Final Details</h2>
              <p className="text-[11px] font-black text-blue-600 uppercase tracking-tighter">Seal: {activeSeal?.seal_id}</p>
            </div>
            
            <form onSubmit={handleFinalSave} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Container #</label>
                  <input name="containerNum" required className="w-full p-5 bg-slate-50 border border-slate-100 rounded-3xl font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Dock Door #</label>
                  <input name="dockDoor" required className="w-full p-5 bg-slate-50 border border-slate-100 rounded-3xl font-bold" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Container Company Name</label>
                <input name="companyName" required className="w-full p-5 bg-slate-50 border border-slate-100 rounded-3xl font-bold" />
              </div>

              <div className="p-8 bg-blue-50/50 rounded-[40px] space-y-6 border border-blue-100/50">
                <p className="text-[11px] font-black text-blue-600 uppercase tracking-widest">Seal Applied By</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input name="appliedByName" placeholder="Operator Name" required className="w-full p-5 bg-white border border-blue-100 rounded-2xl font-bold" />
                  <input name="appliedByTitle" placeholder="Operator Title" required className="w-full p-5 bg-white border border-blue-100 rounded-2xl font-bold" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Comments / Audit Notes</label>
                <textarea name="comments" rows="2" placeholder="Write any exceptions here..." className="w-full p-5 bg-slate-50 border border-slate-100 rounded-3xl font-medium text-sm"></textarea>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Photo Proof (Max 2MB)</label>
                <div className="relative group">
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => setPhotoFile(e.target.files[0])}
                    className="block w-full text-xs text-slate-500 file:mr-6 file:py-3 file:px-8 file:rounded-full file:border-0 file:text-[10px] file:font-black file:bg-blue-600 file:text-white file:uppercase hover:file:bg-blue-700 cursor-pointer" 
                  />
                  {photoFile && <p className="mt-2 text-[10px] font-bold text-green-600 uppercase">Ready: {photoFile.name}</p>}
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <button type="button" onClick={() => setCurrentView('LIST')} className="flex-1 py-6 font-black uppercase text-xs text-slate-400">Back</button>
                <button disabled={loading} type="submit" className="flex-1 bg-green-500 text-white py-6 rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl shadow-green-100 disabled:opacity-50">
                  {loading ? 'Compressing & Saving...' : 'Complete Application'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* --- AUDIT DETAIL MODAL (WITH CORRECTION THREAD) --- */}
      {viewingSeal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in slide-in-from-bottom-10 duration-300 flex flex-col max-h-[90vh]">
            
            <div className="bg-slate-900 p-8 flex justify-between items-center text-white shrink-0">
              <h3 className="text-sm font-black uppercase tracking-[0.2em]">Seal Audit Details</h3>
              <button onClick={() => setViewingSeal(null)} className="bg-slate-800 hover:bg-red-500 w-10 h-10 rounded-full flex items-center justify-center transition-colors text-2xl leading-none">&times;</button>
            </div>

            <div className="p-10 space-y-8 overflow-y-auto custom-scrollbar">
              <div className="border-b-2 border-slate-50 pb-6">
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">Seal Number</p>
                <p className="text-4xl font-mono font-black text-slate-900 tracking-tighter">{viewingSeal.seal_id}</p>
              </div>

              {/* READ-ONLY INFO GRID */}
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Issued By</p>
                  <p className="text-sm font-bold text-slate-800 uppercase">{viewingSeal.issuer_name || '—'}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{viewingSeal.issuer_title}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Department</p>
                  <p className="text-sm font-bold text-slate-800 uppercase">{viewingSeal.department}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 py-6 border-t border-b border-slate-50">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Container #</p>
                  <p className="text-sm font-bold text-slate-800">{viewingSeal.container_num || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dock Door #</p>
                  <p className="text-sm font-bold text-slate-800">{viewingSeal.dock_door || 'N/A'}</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-6 bg-slate-50 rounded-[30px] border border-slate-100">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Applied By</p>
                  <p className="text-sm font-bold text-slate-800 uppercase">{viewingSeal.applied_by_name || 'Pending'}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{viewingSeal.applied_by_title}</p>
                </div>
                
                <div className="flex flex-col items-end">
                  {viewingSeal.photo_url ? (
                    <a href={viewingSeal.photo_url} target="_blank" rel="noreferrer" className="group relative">
                      <img 
                        src={viewingSeal.photo_url} 
                        alt="Seal" 
                        className="w-20 h-20 object-cover rounded-2xl shadow-lg border-4 border-white group-hover:scale-105 transition" 
                      />
                      <span className="absolute -bottom-2 -right-2 bg-blue-600 text-[8px] font-black text-white px-2 py-1 rounded-md uppercase">Proof</span>
                    </a>
                  ) : (
                    <div className="w-20 h-20 bg-slate-200 rounded-2xl flex items-center justify-center">
                      <p className="text-[8px] font-black text-slate-400 uppercase">No Photo</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Original Auditor Comments</p>
                <div className="p-6 bg-slate-900 text-slate-300 rounded-[30px] text-xs font-medium italic leading-relaxed">
                  "{viewingSeal.comments || "No notes provided."}"
                </div>
              </div>

              {/* CORRECTION THREAD SECTION */}
              <div className="pt-8 border-t border-slate-100 space-y-6">
                <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Correction Log / Updates</p>
                
                <div className="space-y-4">
                  {correctionNotes.length > 0 ? (
                    correctionNotes.map((note) => (
                      <div key={note.id} className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
                        <p className="text-xs font-bold text-slate-800">{note.note_text}</p>
                        <p className="text-[9px] font-black text-orange-400 uppercase mt-2">
                          {new Date(note.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-[10px] font-bold text-slate-300 uppercase italic text-center">No corrections recorded.</p>
                  )}
                </div>

                <form onSubmit={handleAddCorrection} className="space-y-3">
                  <textarea 
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Add a correction note (e.g., Driver is Juan)..."
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-orange-200 outline-none"
                    rows="2"
                  />
                  <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest">
                    Post Correction
                  </button>
                </form>
              </div>

              <div className="pt-4 text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  Originally Applied: {viewingSeal.applied_at ? new Date(viewingSeal.applied_at).toLocaleString() : 'PENDING'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}