import { DEPARTMENTS } from '../constants/departments';

export default function AdminIntake({ sealId, setSealId, dept, setDept, isProcessing, handleIntake }) {
  return (
    <form onSubmit={handleIntake} className="space-y-6 bg-slate-50 p-8 rounded-[40px] border border-slate-100">
      <div className="flex items-center gap-3 mb-2">
        <span className="bg-blue-600 text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase">Admin Portal</span>
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-900">Add Seal to Inventory</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Seal Serial</label>
          <input required className="w-full p-5 bg-white border border-slate-200 rounded-3xl font-mono font-black text-xl text-blue-600 uppercase outline-none" placeholder="UL-XXXXX" value={sealId} onChange={(e) => setSealId(e.target.value)} />
        </div>
        <div className="space-y-2 relative">
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Assign to Dept</label>
          <select className="w-full p-5 bg-white border border-slate-200 rounded-3xl font-bold text-slate-700 outline-none appearance-none cursor-pointer" value={dept} onChange={(e) => setDept(e.target.value)}>
            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>
      <button disabled={isProcessing} className="w-full bg-blue-600 text-white p-5 rounded-3xl font-black uppercase tracking-widest transition disabled:opacity-50">
        {isProcessing ? 'Adding...' : 'Add New Seal'}
      </button>
    </form>
  );
}