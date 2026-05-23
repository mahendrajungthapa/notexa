'use client';
import { useState, useEffect, useRef } from 'react';
import { filesApi } from '@/services/api';
import { useAuthStore } from '@/contexts/authStore';
import toast from 'react-hot-toast';
import { Upload, Download, Trash2, FolderOpen, File, Image, FileText } from 'lucide-react';

function fmtSize(b: number) { if(b>=1073741824)return(b/1073741824).toFixed(2)+' GB'; if(b>=1048576)return(b/1048576).toFixed(1)+' MB'; if(b>=1024)return(b/1024).toFixed(1)+' KB'; return b+' B'; }
function getIcon(m: string) { if(m.startsWith('image/'))return<Image size={18} className="text-pink-500"/>; if(m.includes('pdf'))return<FileText size={18} className="text-red-500"/>; return<File size={18} className="text-gray-400"/>; }

export default function FilesPage() {
  const user = useAuthStore(s=>s.user);
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  const fetch = async()=>{ try{ const r=await filesApi.list(); setFiles(r.data.data?.data||[]); }catch{} finally{setLoading(false);} };
  useEffect(()=>{fetch();},[]);

  const handleUpload = async(e:React.ChangeEvent<HTMLInputElement>)=>{
    const f=e.target.files?.[0]; if(!f)return; setUploading(true);
    try{ await filesApi.upload(f); toast.success('Uploaded!'); fetch(); }
    catch(e:any){ toast.error(e.response?.data?.message||'Failed'); }
    finally{ setUploading(false); if(ref.current)ref.current.value=''; }
  };

  const pct = user ? Math.min((user.storage_used/user.storage_limit)*100, 100) : 0;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold">My Files</h1><p className="text-sm text-gray-400 mt-0.5">{(user?.storage_used/1048576||0).toFixed(1)} MB / {(user?.storage_limit/1048576||50).toFixed(0)} MB</p></div>
        <div><input ref={ref} type="file" className="hidden" onChange={handleUpload}/>
          <button onClick={()=>ref.current?.click()} disabled={uploading} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50">
            {uploading?<div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>:<Upload size={16}/>} Upload
          </button>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6">
        <div className="flex justify-between text-sm mb-2"><span className="text-gray-500">Storage</span><span className="font-medium">{pct.toFixed(1)}%</span></div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all ${pct>90?'bg-red-500':pct>70?'bg-amber-500':'bg-indigo-500'}`} style={{width:`${pct}%`}}/></div>
        {!user?.is_premium&&<p className="text-xs text-gray-400 mt-2">Upgrade to Premium for 5GB</p>}
      </div>
      {loading?<div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"/></div>
      :files.length===0?<div className="text-center py-16"><FolderOpen size={48} className="mx-auto text-gray-300 mb-4"/><p className="text-gray-500">No files yet</p></div>
      :<div className="space-y-2">{files.map((f:any)=>(
        <div key={f.id} className="flex items-center justify-between bg-white rounded-2xl border border-gray-200 p-4">
          <div className="flex items-center gap-3 min-w-0">{getIcon(f.mime_type)}<div className="min-w-0"><p className="font-medium text-sm truncate">{f.original_name}</p><p className="text-xs text-gray-400">{fmtSize(f.size)} · {new Date(f.created_at).toLocaleDateString()}</p></div></div>
          <div className="flex gap-2 shrink-0">
            <button onClick={async()=>{ try{const r=await filesApi.download(f.id);window.open(r.data.download_url,'_blank');}catch{toast.error('Failed');} }} className="p-2 text-gray-400 hover:text-indigo-600"><Download size={16}/></button>
            <button onClick={async()=>{ if(!confirm('Delete?'))return; try{await filesApi.delete(f.id);toast.success('Deleted');fetch();}catch{} }} className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={16}/></button>
          </div>
        </div>
      ))}</div>}
    </div>
  );
}
