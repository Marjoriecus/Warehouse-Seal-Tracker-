"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Home() {
  // --- AUTH & ROLE STATE ---
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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

  // --- 1. AUTHENTICATION LOGIC ---
  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        fetchUserRole(session.user.id);
      }
    };
    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setUser(session.user);
        fetchUserRole(session.user.id);
      } else {
        setUser(null);
        setUserRole(null);
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    if (!error && data) setUserRole(data.role);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // --- 2. DATA FETCHING ---
  const fetchSeals = async () => {
    const { data, error } = await supabase
      .from('seals')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setSealsList(data);
  };

  useEffect(() => {
    if (user) fetchSeals();
  }, [user]);

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

  // --- SEARCH & TOGGLE FILTER LOGIC ---
  const filteredSeals = sealsList.filter(seal => {
    const matchesSearch = seal.seal_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = viewFilter === 'All' || seal.department === viewFilter;
    return matchesSearch && matchesDept;
  });

  // --- SPLIT LOGIC ---
  const inStockSeals = filteredSeals.filter(seal => seal.status !== 'Applied');
  const usedSeals = filteredSeals.filter(seal => seal.status === 'Applied');

  // --- ACTIONS ---
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

  const deleteSeal = async (id) => {
    if (confirm("Delete this record permanently?")) {
      const { error } = await supabase.from('seals').delete().eq('id', id);
      if (!error) fetchSeals();
    }
  };

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

  const handleFinalSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.target);
    const details = Object.fromEntries(formData);

    let finalPhotoUrl = null;

    if (photoFile) {
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
      alert("Success! Record Saved.");
      setCurrentView('LIST');
      setActiveSeal(null);
      setPhotoFile(null);
      fetchSeals();
    }
  };

  const handleAddCorrection = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    const { error } = await supabase
      .from('seal_notes')
      .insert([{ seal_id: viewingSeal.id, note_text: newNote }]);
    if (!error) {
      setNewNote('');
      fetchNotes(viewingSeal.id);
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
      s.applied_by_title || "N/A",
      s.applied_at ? new Date(s.applied_at).toLocaleString() : "N/A",
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

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white shadow-2xl rounded-[40px] p-12 space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Seal Tracker</h1>
            <p className="text-xs font-bold text-slate-400 uppercase mt-2">Authorized Access Only</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="email" placeholder="Email" required
              className="w-full p-5 bg-slate-50 border border-slate-100 rounded-3xl font-bold outline-none"
              value={email} onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="password" placeholder="Password" required
              className="w-full p-5 bg-slate-50 border border-slate-100 rounded-3xl font-bold outline-none"
              value={password} onChange={(e) => setPassword(e.target.value)}
            />
            <button disabled={loading} className="w-full bg-slate-900 text-white p-5 rounded-3xl font-black uppercase tracking-widest hover:bg-slate-800 transition">
              {loading ? 'Verifying...' : 'Login'}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 font-sans text-slate-900">
      {/* Container is now wide: max-w-[95%] and lg:max-w-6xl */}
      <div className="max-w-[95%] lg:max-w-6xl mx-auto shadow-2xl rounded-[40px] overflow-hidden bg-white relative border border-white">

        <div className="bg-slate-900 p-10 text-center text-white relative">
          <button onClick={handleLogout} className="absolute top-6 right-6 text-[10px] font-black uppercase bg-slate-800 px-4 py-2 rounded-full hover:bg-red-500 transition">Logout</button>
          <h1 className="text-4xl font-black uppercase tracking-tighter">Seal Tracker</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-60 mt-2">
            Role: <span className="text-blue-400">{userRole || 'Loading...'}</span>
          </p>
        </div>

        {currentView === 'LIST' && (
          <div className="p-8 space-y-10">
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
                <div className="space-y-2 relative">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Assign to Dept</label>
                  <div className="relative">
                    <select
                      className="w-full p-5 bg-slate-50 border border-slate-100 rounded-3xl font-bold text-slate-700 outline-none appearance-none cursor-pointer"
                      value={dept}
                      onChange={(e) => setDept(e.target.value)}
                    >
                      {departments.map(d => <option key={d}>{d}</option>)}
                    </select>
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
              <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white p-5 rounded-3xl font-black uppercase tracking-widest transition active:scale-[0.98] disabled:opacity-50">
                {loading ? 'Adding...' : 'Add New Seal'}
              </button>
            </form>

            <div className="border-t border-slate-100 pt-10 space-y-6">
              <div className="flex flex-wrap gap-2 p-1 bg-slate-100 rounded-2xl">
                {['All', ...departments].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setViewFilter(filter)}
                    className={`flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${viewFilter === filter
                        ? 'bg-white text-blue-600 shadow-sm scale-100'
                        : 'text-slate-400 hover:text-slate-600'
                      }`}
                  >
                    {filter === 'All' ? 'View All' : filter.split(' ')[0]}
                  </button>
                ))}
              </div>

              <div className="flex gap-4">
                <input
                  className="flex-1 p-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-slate-100"
                  placeholder={`Search ${viewFilter}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {userRole === 'admin' && (
                  <button onClick={exportToCSV} className="bg-white border-2 border-slate-100 text-slate-900 px-6 rounded-2xl text-[10px] font-black uppercase hover:bg-slate-50">CSV</button>
                )}
              </div>

              {/* List space-y reduced for overall tightness */}
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                
                {filteredSeals.length === 0 ? (
                  <div className="text-center py-20 bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-200">
                    <p className="text-xs font-black uppercase text-slate-400 tracking-[0.2em]">No seals found in {viewFilter}</p>
                  </div>
                ) : (
                  <>
                    {/* IN-STOCK SECTION */}
                    {inStockSeals.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-2">
                          In-Stock ({inStockSeals.length})
                        </h3>
                        {inStockSeals.map((seal) => (
                          <div key={seal.id} className="group relative flex justify-between items-center py-3 pr-6 pl-10 bg-white rounded-[32px] border border-slate-100 shadow-sm hover:shadow-md transition overflow-hidden">
                            <div className="absolute left-0 top-0 bottom-0 w-3 bg-green-500"></div>
                            
                            <div>
                              <button
                                onClick={() => setViewingSeal(seal)}
                                className="font-mono font-black text-xl text-blue-600 tracking-tighter hover:text-blue-800 hover:underline text-left block"
                              >
                                {seal.seal_id}
                              </button>
                              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">
                                {seal.department} • <span className="text-green-500">{seal.status}</span>
                              </p>
                            </div>
                            <div className="flex items-center gap-4">
                              <button onClick={() => startApplyProcess(seal)} className="bg-orange-50 text-orange-600 px-6 py-2 rounded-2xl text-[10px] font-black uppercase hover:bg-orange-500 hover:text-white transition shadow-sm">
                                Apply
                              </button>
                              {userRole === 'admin' && (
                                <button onClick={() => deleteSeal(seal.id)} className="text-slate-200 hover:text-red-500 transition-colors p-2 text-xl">🗑️</button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* USED INVENTORY SECTION */}
                    {usedSeals.length > 0 && (
                      <div className="space-y-3 pt-4">
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-2">
                          Used Inventory ({usedSeals.length})
                        </h3>
                        {usedSeals.map((seal) => (
                          <div key={seal.id} className="group relative flex justify-between items-center py-3 pr-6 pl-10 bg-white rounded-[32px] border border-slate-100 shadow-sm hover:shadow-md transition overflow-hidden opacity-90">
                            <div className="absolute left-0 top-0 bottom-0 w-3 bg-red-500"></div>

                            <div>
                              <button
                                onClick={() => setViewingSeal(seal)}
                                className="font-mono font-black text-xl text-blue-600 tracking-tighter hover:text-blue-800 hover:underline text-left block"
                              >
                                {seal.seal_id}
                              </button>
                              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">
                                {seal.department} • <span className="text-orange-500">{seal.status}</span>
                              </p>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="bg-slate-50 text-slate-400 px-4 py-2 rounded-xl text-[9px] font-black uppercase">Complete</span>
                              {userRole === 'admin' && (
                                <button onClick={() => deleteSeal(seal.id)} className="text-slate-200 hover:text-red-500 transition-colors p-2 text-xl">🗑️</button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ... ALL OTHER VIEWS (ISSUER, DETAILS, MODAL) REMAIN FULLY FUNCTIONAL ... */}
        {currentView === 'ISSUER' && (
          <div className="p-12 space-y-10">
            <h2 className="text-3xl font-black uppercase text-slate-900">Seal Issued By</h2>
            <form onSubmit={handleIssuerSubmit} className="space-y-8">
              <input name="issuerName" required className="w-full p-6 bg-slate-50 border border-slate-100 rounded-3xl font-bold" placeholder="Full Name" />
              <input name="issuerTitle" required className="w-full p-6 bg-slate-50 border border-slate-100 rounded-3xl font-bold" placeholder="Job Title" />
              <div className="flex gap-4">
                <button type="button" onClick={() => setCurrentView('LIST')} className="flex-1 py-6 font-black uppercase text-xs text-slate-400">Cancel</button>
                <button type="submit" className="flex-1 bg-slate-900 text-white py-6 rounded-3xl font-black uppercase text-xs tracking-widest">Next Step →</button>
              </div>
            </form>
          </div>
        )}

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
                <input
                  type="file" accept="image/*"
                  onChange={(e) => setPhotoFile(e.target.files[0])}
                  className="block w-full text-xs text-slate-500 file:mr-6 file:py-3 file:px-8 file:rounded-full file:border-0 file:text-[10px] file:font-black file:bg-blue-600 file:text-white file:uppercase hover:file:bg-blue-700 cursor-pointer"
                />
              </div>

              <div className="flex gap-4 pt-6">
                <button type="button" onClick={() => setCurrentView('LIST')} className="flex-1 py-6 font-black uppercase text-xs text-slate-400">Back</button>
                <button disabled={loading} type="submit" className="flex-1 bg-green-500 text-white py-6 rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl shadow-green-100 disabled:opacity-50">
                  {loading ? 'Processing...' : 'Complete Application'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* --- MODAL REMAINS FULLY FUNCTIONAL --- */}
      {viewingSeal && (
        <div className="fixed inset-0 bg-slate-900/70 z-50 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[95vh] border-4 border-white/20">
            <div className="bg-[#0f172a] p-8 flex justify-between items-center text-white sticky top-0 z-10">
              <div>
                <p className="text-orange-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Audit Review</p>
                <h3 className="text-xl font-black uppercase tracking-tighter">Seal Audit Details</h3>
              </div>
              <button onClick={() => setViewingSeal(null)} className="bg-white/10 hover:bg-white/20 p-3 rounded-full transition-all text-2xl font-light">&times;</button>
            </div>

            <div className="p-10 space-y-10 overflow-y-auto custom-scrollbar">
              <div className="flex justify-between items-start border-b-2 border-slate-50 pb-8">
                <h1 className="text-5xl font-mono font-black text-slate-900 tracking-tighter">{viewingSeal.seal_id}</h1>
                <span className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${viewingSeal.status === 'Applied' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                  {viewingSeal.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-y-10 gap-x-12">
                <div>
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Container #</p>
                  <p className="text-2xl font-bold text-slate-800">{viewingSeal.container_num || '---'}</p>
                </div>
                <div>
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Dock Door #</p>
                  <p className="text-2xl font-bold text-slate-800">{viewingSeal.dock_door || '---'}</p>
                </div>
                <div>
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Company Name</p>
                  <p className="text-2xl font-bold text-slate-800">{viewingSeal.company_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Department</p>
                  <p className="text-2xl font-bold text-slate-800">{viewingSeal.department}</p>
                </div>
              </div>

              <hr className="border-slate-100" />

              <div className="grid grid-cols-2 gap-8 bg-slate-50/50 p-6 rounded-[32px] border border-slate-100">
                <div>
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Applied By</p>
                  <p className="text-lg font-bold text-slate-700">{viewingSeal.applied_by_name || 'Pending'}</p>
                </div>
                <div>
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Operator Title</p>
                  <p className="text-lg font-bold text-slate-700">{viewingSeal.applied_by_title || 'Operator'}</p>
                </div>
              </div>

              {viewingSeal.photo_url && (
                <div className="space-y-4">
                  <p className="text-[11px] font-black text-orange-500 uppercase tracking-widest">Inspection Evidence</p>
                  <div className="rounded-[40px] overflow-hidden border-8 border-slate-50 shadow-lg bg-slate-50">
                    <img src={viewingSeal.photo_url} alt="Proof" className="w-full h-auto max-h-[400px] object-cover" />
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <p className="text-[11px] font-black text-orange-500 uppercase tracking-widest">Original Comments</p>
                <div className="bg-orange-50/50 p-6 rounded-[32px] border border-orange-100">
                  <p className="text-slate-700 font-medium italic leading-relaxed">
                    "{viewingSeal.comments || 'No initial comments provided for this audit.'}"
                  </p>
                </div>
              </div>

              <div className="pt-10 border-t border-slate-100 space-y-6">
                <p className="text-[11px] font-black text-blue-600 uppercase tracking-widest">Admin Updates & Corrections</p>
                <div className="space-y-4">
                  {correctionNotes.map((note) => (
                    <div key={note.id} className="p-5 bg-blue-50/30 border border-blue-100 rounded-[24px]">
                      <p className="text-sm font-bold text-slate-800 leading-relaxed">{note.note_text}</p>
                      <p className="text-[9px] font-black text-blue-300 uppercase mt-2">{new Date(note.created_at).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
                
                <form onSubmit={handleAddCorrection} className="space-y-4 pt-4">
                  <textarea
                    value={newNote} 
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Add a correction or update note..."
                    className="w-full p-5 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-medium focus:ring-4 focus:ring-blue-100 outline-none transition"
                    rows="3"
                  />
                  <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-800 transition shadow-xl shadow-slate-200">
                    Post New Update
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}