export default function SealCard({ seal, onSelect, onApply, onDelete, isAdmin }) {
  const isApplied = seal.status === 'Applied';
  return (
    <div className={`group relative flex justify-between items-center py-3 pr-6 pl-10 bg-white rounded-[32px] border border-slate-100 shadow-sm hover:shadow-md transition overflow-hidden ${isApplied ? 'opacity-90' : ''}`}>
      <div className={`absolute left-0 top-0 bottom-0 w-3 ${isApplied ? 'bg-red-500' : 'bg-green-500'}`}></div>
      <div>
        <button onClick={() => onSelect(seal)} className="font-mono font-black text-xl text-blue-600 hover:text-blue-800 hover:underline text-left block">{seal.seal_id}</button>
        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">{seal.department} • <span className={isApplied ? 'text-orange-500' : 'text-green-500'}>{seal.status}</span></p>
      </div>
      <div className="flex items-center gap-4">
        {!isApplied ? (
          <button onClick={() => onApply(seal)} className="bg-orange-50 text-orange-600 px-6 py-2 rounded-2xl text-[10px] font-black uppercase hover:bg-orange-500 hover:text-white transition">Apply</button>
        ) : (
          <span className="bg-slate-50 text-slate-400 px-4 py-2 rounded-xl text-[9px] font-black uppercase">Complete</span>
        )}
        {isAdmin && <button onClick={() => onDelete(seal.id)} className="text-slate-200 hover:text-red-500 transition-colors p-2 text-xl">🗑️</button>}
      </div>
    </div>
  );
}