// components/SealDetailsForm.js
export default function SealDetailsForm({ issuerInfo, onSave, onCancel }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    onSave(data);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden max-w-2xl mx-auto">
      <div className="bg-slate-800 p-4 text-white">
        <p className="text-[10px] font-bold opacity-70">CURRENT ISSUER: {issuerInfo.name} ({issuerInfo.title})</p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase">Container Number</label>
            <input name="container_num" required className="w-full p-3 border rounded-lg mt-1" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase">Dock Door Number</label>
            <input name="dock_door" required className="w-full p-3 border rounded-lg mt-1" />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase">Container Company Name</label>
          <input name="company_name" required className="w-full p-3 border rounded-lg mt-1" />
        </div>

        <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 space-y-4">
          <p className="text-[10px] font-black text-blue-600 uppercase">Seal Applied By *</p>
          <div className="grid grid-cols-2 gap-4">
            <input name="applied_by_name" placeholder="Name" required className="w-full p-3 border rounded-lg" />
            <input name="applied_by_title" placeholder="Title" required className="w-full p-3 border rounded-lg" />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase">Photo</label>
          <input type="file" className="mt-2 text-xs" />
        </div>

        <div className="flex gap-4 pt-4">
          <button type="button" onClick={onCancel} className="flex-1 py-3 font-bold text-slate-400">Cancel</button>
          <button type="submit" className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold shadow-lg">Save Record</button>
        </div>
      </form>
    </div>
  );
}