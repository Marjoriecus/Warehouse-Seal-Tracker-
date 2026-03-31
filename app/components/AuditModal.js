export default function AuditModal({ 
  viewingSeal, 
  onClose, 
  correctionNotes, 
  newNote, 
  setNewNote, 
  handleAddCorrection 
}) {
  if (!viewingSeal) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/70 z-50 flex items-center justify-center p-4 backdrop-blur-md">
      <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[95vh] border-4 border-white/20">
        
        {/* Header */}
        <div className="bg-[#0f172a] p-8 flex justify-between items-center text-white sticky top-0 z-10">
          <div>
            <p className="text-orange-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Audit Review</p>
            <h3 className="text-xl font-black uppercase tracking-tighter">Seal Audit Details</h3>
          </div>
          <button 
            onClick={onClose} 
            className="bg-white/10 hover:bg-white/20 p-3 rounded-full transition-all text-2xl font-light"
          >
            &times;
          </button>
        </div>

        {/* Content */}
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

          {/* Corrections Section */}
          <div className="pt-10 border-t border-slate-100 space-y-6">
            <p className="text-[11px] font-black text-blue-600 uppercase tracking-widest">Admin Updates & Corrections</p>
            <div className="space-y-4">
              {correctionNotes.map((note) => (
                <div key={note.id} className="p-5 bg-blue-50/30 border border-blue-100 rounded-[24px]">
                  <p className="text-sm font-bold text-slate-800 leading-relaxed">{note.note_text}</p>
                  <p className="text-[9px] font-black text-blue-300 uppercase mt-2">
                    {new Date(note.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
            
            <form onSubmit={handleAddCorrection} className="space-y-4 pt-4">
              <textarea 
                value={newNote} 
                onChange={(e) => setNewNote(e.target.value)} 
                placeholder="Add a correction or update note..." 
                className="w-full p-5 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-medium focus:ring-4 focus:ring-blue-100 outline-none" 
                rows="3" 
              />
              <button 
                type="submit" 
                className="w-full bg-slate-900 text-white py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-800 transition shadow-xl shadow-slate-200"
              >
                Post New Update
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}