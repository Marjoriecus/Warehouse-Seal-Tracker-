// components/IssuerModal.js
export default function IssuerModal({ onStart, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">APPLY: SEAL ISSUED BY</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Name</label>
            <input id="issuerName" type="text" className="w-full p-3 bg-slate-50 border rounded-lg font-medium" placeholder="Enter your name" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Title</label>
            <input id="issuerTitle" type="text" className="w-full p-3 bg-slate-50 border rounded-lg font-medium" placeholder="e.g., Lead / Supervisor" />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onCancel} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-lg transition-colors">Cancel</button>
          <button 
            onClick={() => {
              const name = document.getElementById('issuerName').value;
              const title = document.getElementById('issuerTitle').value;
              if (name && title) onStart({ name, title });
            }} 
            className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-bold shadow-md active:scale-95 transition-all"
          >
            Start
          </button>
        </div>
      </div>
    </div>
  );
}