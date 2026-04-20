"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'sonner';

// --- MODULAR UI IMPORTS ---
import { DEPARTMENTS } from './constants/departments';
import AdminIntake from './components/AdminIntake';
import SealCard from './components/SealCard';
import AuditModal from './components/AuditModal';

// --- LOGIC ENGINE IMPORTS ---
import { useAuth } from './hooks/useAuth';
import { useSeals } from './hooks/useSeals';

export default function Home() {
  // --- AUTH STATE (Hook Driven) ---
  const { user, userRole, userDept, isAuthenticating } = useAuth();

  // --- INVENTORY STATE (Hook Driven) ---
  const {
    inStockSeals, usedSeals, searchTerm, setSearchTerm, viewFilter, setViewFilter,
    isProcessing, setIsProcessing, fetchSeals, deleteSeal
  } = useSeals(user, userRole, userDept);

  // --- LOGIN FORM STATE ---
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // --- WORKFLOW STATE ---
  const [sealId, setSealId] = useState('');
  const [dept, setDept] = useState('Inbound Department');
  const [currentView, setCurrentView] = useState('LIST');
  const [activeSeal, setActiveSeal] = useState(null);
  const [issuerInfo, setIssuerInfo] = useState({ name: '', title: '' });

  // FIXED: Set the initial tab state to 'IN_STOCK'
  const [activeTab, setActiveTab] = useState('IN_STOCK');

  // --- MODAL & UPLOAD STATE ---
  const [viewingSeal, setViewingSeal] = useState(null);

  // --- CORRECTION THREAD STATE ---
  const [correctionNotes, setCorrectionNotes] = useState([]);
  const [newNote, setNewNote] = useState('');

  // --- FAIL-SAFE STATE ---
  const [showRetry, setShowRetry] = useState(false);

  // --- 1. DATA FETCHING (Correction Notes) ---
  useEffect(() => {
    if (viewingSeal) fetchNotes(viewingSeal.id);
    else setCorrectionNotes([]);
  }, [viewingSeal]);

  const fetchNotes = async (id) => {
    const { data, error } = await supabase
      .from('seal_notes')
      .select('*')
      .eq('seal_id', id)
      .order('created_at', { ascending: true });
    if (!error) setCorrectionNotes(data);
  };

  // --- 2. AUTHENTICATION ACTIONS ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Access Granted. Welcome back!');
      }
    } catch (err) {
      toast.error("Connection failed. Please check your internet.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLogout = async () => {
    toast.loading('Logging out...');
    supabase.auth.signOut().catch(() => { });

    // Manually kill the local memory immediately
    window.localStorage.clear();
    window.sessionStorage.clear();
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });

    toast.success('Logged out safely.');

    // Force a hard refresh to the login screen
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  // --- 3. FAIL-SAFE TIMER & RESET ---
  useEffect(() => {
    if (isAuthenticating) {
      const timer = setTimeout(() => {
        setShowRetry(true);
        // FORCE the screen to go away if it hangs for 10 seconds
        setTimeout(() => {
          window.location.reload();
        }, 5000);
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      setShowRetry(false);
    }
  }, [isAuthenticating]);

  // NUCLEAR RESET FUNCTION: Wipes browser memory to fix "Ghost" connections
  const handleDeepReset = async () => {
    toast.loading("Performing Deep Reset...");
    try {
      // 1. Force logout from the server
      await supabase.auth.signOut();

      // 2. Clear all local browser storage
      window.localStorage.clear();
      window.sessionStorage.clear();

      // 3. Clear all Cookies (The most common fix for the white screen)
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });

      toast.success("Memory Cleared. Reloading...");

      // 4. Force a fresh redirect to the home page
      setTimeout(() => {
        window.location.href = window.location.origin;
      }, 1000);

    } catch (err) {
      // Emergency fallback
      window.location.reload();
    }
  };

  // --- 4. WORKFLOW ACTIONS ---
  const handleIntake = async (e) => {
    e.preventDefault();
    if (userRole !== 'admin') return toast.error("Unauthorized Action");
    if (!sealId) return;

    setIsProcessing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expired. Please reload page.");

      const { error } = await supabase
        .from('seals')
        .insert([{ seal_id: sealId.toUpperCase(), department: dept, status: 'In Stock' }]);

      if (error) throw error;

      toast.success(`Seal ${sealId.toUpperCase()} added to inventory.`);
      setSealId('');
      fetchSeals();
    } catch (error) {
      console.error("Intake Error:", error);
      toast.error("Database error: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleIssuerSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    setIssuerInfo({ name: formData.get('issuerName'), title: formData.get('issuerTitle') });
    setCurrentView('DETAILS');
  };

  const handleFinalSave = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    const formData = new FormData(e.target);
    const details = Object.fromEntries(formData);

    try {
      // 1. Verify the session hasn't died while the tab was idle
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expired due to inactivity.");

      // 2. Prepare the database update
      const updatePromise = supabase.from('seals').update({
        status: 'Applied',
        issuer_name: issuerInfo.name,
        issuer_title: issuerInfo.title,
        container_num: details.containerNum,
        dock_door: details.dockDoor,
        company_name: details.companyName,
        applied_by_name: details.appliedByName,
        applied_by_title: details.appliedByTitle,
        comments: details.comments,
        applied_at: new Date()
      }).eq('id', activeSeal.id);

      // 3. Create an 8-second kill switch
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Network sleep detected.")), 8000)
      );

      // 4. RACE! If the update takes longer than 8 seconds, the timeout wins and throws the error
      const { error } = await Promise.race([updatePromise, timeoutPromise]);

      if (error) throw error;

      toast.success("Record saved and archived.");
      setCurrentView('LIST');
      setActiveSeal(null);
      fetchSeals();
    } catch (err) {
      toast.error(err.message === "Network sleep detected."
        ? "Connection slept. Waking up..."
        : "Save failed: " + err.message
      );

      // If the tab fell asleep or session died, force a quick refresh to heal the connection
      if (err.message.includes("sleep") || err.message.includes("expired")) {
        setTimeout(() => window.location.reload(), 1500);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddCorrection = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    const { error } = await supabase.from('seal_notes').insert([{ seal_id: viewingSeal.id, note_text: newNote }]);
    if (!error) {
      toast.success("Audit note added.");
      setNewNote('');
      fetchNotes(viewingSeal.id);
    }
  };

  const exportToCSV = () => {
    const allFiltered = [...inStockSeals, ...usedSeals];
    const headers = ["Seal ID", "Dept", "Status", "Created Date", "Issued By", "Container #", "Dock Door", "Company", "Applied By", "Applied At"];
    const rows = allFiltered.map(s => [
      s.seal_id, s.department, s.status, new Date(s.created_at).toLocaleDateString(),
      s.issuer_name || "N/A", s.container_num || "N/A", s.dock_door || "N/A",
      s.company_name || "N/A", s.applied_by_name || "N/A", s.applied_at ? new Date(s.applied_at).toLocaleString() : "N/A"
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Seal_Audit_Export.csv`;
    link.click();
    toast.info("Generating CSV export...");
  };

  // --- 5. RENDER LOGIC ---
  if (isAuthenticating) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <div className="flex flex-col items-center gap-6 animate-in fade-in duration-700">
          {/* Spinner */}
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>

          <div className="text-center">
            <h2 className="font-black uppercase text-slate-900 tracking-widest text-sm">Securing Connection</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase mt-2">Verifying credentials and permissions...</p>
          </div>

          {showRetry && (
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={handleDeepReset}
                className="bg-white border-2 border-slate-200 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all shadow-sm animate-in slide-in-from-bottom-2 duration-500"
              >
                Connection Slow? Click to Deep Reset
              </button>
              <p className="text-[8px] font-bold text-slate-300 uppercase">Clears browser cache and forces fresh login</p>
            </div>
          )}
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white shadow-2xl rounded-[40px] p-12 space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Seal Tracker</h1>
            <p className="text-xs font-bold text-slate-400 uppercase mt-2">Authorized Access Only</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="email" placeholder="Email" required className="w-full p-5 bg-slate-50 border border-slate-100 rounded-3xl font-bold outline-none" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input type="password" placeholder="Password" required className="w-full p-5 bg-slate-50 border border-slate-100 rounded-3xl font-bold outline-none" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button disabled={isProcessing} className="w-full bg-slate-900 text-white p-5 rounded-3xl font-black uppercase tracking-widest hover:bg-slate-800 transition">{isProcessing ? 'Verifying...' : 'Login'}</button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 font-sans text-slate-900">
      <div className="max-w-[95%] lg:max-w-6xl mx-auto shadow-2xl rounded-[40px] overflow-hidden bg-white relative border border-white">
        <div className="bg-slate-900 p-10 text-center text-white relative">
          <button onClick={handleLogout} className="absolute top-6 right-6 text-[10px] font-black uppercase bg-slate-800 px-4 py-2 rounded-full hover:bg-red-500 transition">Logout</button>
          <h1 className="text-4xl font-black uppercase tracking-tighter">Seal Tracker</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-60 mt-2">
            Role: <span className="text-blue-400">{userRole}</span> | Dept: {userDept}
          </p>
        </div>

        {currentView === 'LIST' && (
          <div className="p-8 space-y-10">
            {userRole === 'admin' ? (
              <AdminIntake
                sealId={sealId} setSealId={setSealId}
                dept={dept} setDept={setDept}
                isProcessing={isProcessing}
                handleIntake={handleIntake}
              />
            ) : (
              <div className="bg-slate-900 p-8 rounded-[40px] text-white flex justify-between items-center">
                <div><h2 className="text-2xl font-black uppercase tracking-tighter">Inventory Overview</h2><p className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mt-1">Authorized for: {userDept}</p></div>
                <div className="text-right hidden sm:block"><p className="text-[10px] font-black uppercase text-slate-500">Status</p><p className="text-xs font-bold text-green-400">Secure Link Active</p></div>
              </div>
            )}

            <div className="border-t border-slate-100 pt-10 space-y-6">
              {userRole === 'admin' && (
                <div className="flex flex-wrap gap-2 p-1 bg-slate-100 rounded-2xl">
                  {['All', ...DEPARTMENTS].map((filter) => (
                    <button key={filter} onClick={() => setViewFilter(filter)} className={`flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${viewFilter === filter ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>{filter === 'All' ? 'View All' : filter.split(' ')[0]}</button>
                  ))}
                </div>
              )}

              <div className="flex gap-4">
                <input className="flex-1 p-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-slate-100" placeholder={`Search Inventory...`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                {userRole === 'admin' && <button onClick={exportToCSV} className="bg-white border-2 border-slate-100 text-slate-900 px-6 rounded-2xl text-[10px] font-black uppercase hover:bg-slate-50">CSV Export</button>}
              </div>

              {/* --- NEW TABBED VIEW UI --- */}
              <div className="flex bg-slate-200 p-1 rounded-2xl w-full max-w-sm mb-6">
                <button
                  onClick={() => setActiveTab('IN_STOCK')}
                  className={`flex-1 py-3 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'IN_STOCK' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  In-Stock ({inStockSeals.length})
                </button>
                <button
                  onClick={() => setActiveTab('USED')}
                  className={`flex-1 py-3 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'USED' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Used Inventory ({usedSeals.length})
                </button>
              </div>

              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {inStockSeals.length === 0 && usedSeals.length === 0 ? (
                  <div className="text-center py-20 bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-200"><p className="text-xs font-black uppercase text-slate-400 tracking-[0.2em]">No seals found</p></div>
                ) : (
                  <>
                    {/* IN-STOCK TAB VIEW */}
                    {activeTab === 'IN_STOCK' && (
                      <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {inStockSeals.length === 0 ? (
                          <p className="text-center text-xs font-bold text-slate-400 mt-10 uppercase">No active seals in stock</p>
                        ) : (
                          inStockSeals.map((seal) => (
                            <SealCard
                              key={seal.id} seal={seal}
                              onSelect={setViewingSeal}
                              onApply={() => { setActiveSeal(seal); setCurrentView('ISSUER'); }}
                              onDelete={deleteSeal}
                              isAdmin={userRole === 'admin'}
                            />
                          ))
                        )}
                      </div>
                    )}

                    {/* USED TAB VIEW */}
                    {activeTab === 'USED' && (
                      <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {usedSeals.length === 0 ? (
                          <p className="text-center text-xs font-bold text-slate-400 mt-10 uppercase">No used seals archived</p>
                        ) : (
                          usedSeals.map((seal) => (
                            <SealCard
                              key={seal.id} seal={seal}
                              onSelect={setViewingSeal}
                              onDelete={deleteSeal}
                              isAdmin={userRole === 'admin'}
                            />
                          ))
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

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
                <div className="space-y-2"><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Container #</label><input name="containerNum" required className="w-full p-5 bg-slate-50 border border-slate-100 rounded-3xl font-bold" /></div>
                <div className="space-y-2"><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Dock Door #</label><input name="dockDoor" required className="w-full p-5 bg-slate-50 border border-slate-100 rounded-3xl font-bold" /></div>
              </div>
              <div className="space-y-2"><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Container Company Name</label><input name="companyName" required className="w-full p-5 bg-slate-50 border border-slate-100 rounded-3xl font-bold" /></div>
              <div className="p-8 bg-blue-50/50 rounded-[40px] font-black uppercase tracking-widest text-[11px] text-blue-600">Seal Applied By</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input name="appliedByName" placeholder="Operator Name" required className="w-full p-5 bg-white border border-blue-100 rounded-2xl font-bold" />
                <input name="appliedByTitle" placeholder="Operator Title" required className="w-full p-5 bg-white border border-blue-100 rounded-2xl font-bold" />
              </div>
              <div className="space-y-2"><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Comments / Audit Notes</label><textarea name="comments" rows="2" placeholder="Write any exceptions here..." className="w-full p-5 bg-slate-50 border border-slate-100 rounded-3xl font-medium text-sm"></textarea></div>
              <div className="flex gap-4 pt-6">
                <button type="button" onClick={() => setCurrentView('LIST')} className="flex-1 py-6 font-black uppercase text-xs text-slate-400">Back</button>
                <button disabled={isProcessing} type="submit" className="flex-1 bg-green-500 text-white py-6 rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl shadow-green-100">
                  {isProcessing ? 'Processing...' : 'Complete Application'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      <AuditModal
        viewingSeal={viewingSeal} onClose={() => setViewingSeal(null)}
        correctionNotes={correctionNotes} newNote={newNote}
        setNewNote={setNewNote} handleAddCorrection={handleAddCorrection}
      />
    </main>
  );
}
