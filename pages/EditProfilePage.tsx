
import React, { useState } from 'react';
import { useAuth } from '../App';
import { updateUser } from '../services/storageService';

const EditProfilePage: React.FC = () => {
  const { user, refreshUser, setView } = useAuth();
  
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  if (!user) return null;

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const base64 = await fileToBase64(file);
      setAvatar(base64);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await updateUser({
        ...user,
        name,
        bio,
        avatar
      });
      await refreshUser();
      setView('profile');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-5 py-20 animate-in fade-in duration-700">
      <button onClick={() => setView('profile')} className="inline-flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors mb-12">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        <span className="text-[10px] font-black uppercase tracking-widest">Back to Profile</span>
      </button>

      <div className="bg-white border border-slate-100 rounded-[3.5rem] p-12 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.05)]">
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-black text-slate-900 font-serif tracking-tight mb-2">Edit Identity</h1>
          <p className="text-slate-500 font-medium">Customize your public presence on Lumina.</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-10">
          <div className="flex flex-col items-center gap-6">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-slate-50 shadow-2xl relative">
                {avatar ? (
                  <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-indigo-600 flex items-center justify-center text-white text-4xl font-black uppercase">
                    {name.charAt(0) || user.name.charAt(0)}
                  </div>
                )}
                {isUploading && (
                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                    <svg className="animate-spin h-6 w-6 text-indigo-600" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  </div>
                )}
              </div>
              <label className="absolute bottom-0 right-0 bg-slate-900 text-white p-2.5 rounded-full shadow-xl border-2 border-white cursor-pointer hover:bg-slate-800 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
                <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
              </label>
            </div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Public Avatar Image</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Full Identity</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4" placeholder="Theodore Narrative" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Narrative Bio</label>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 min-h-[160px] resize-none" placeholder="Share your story..." />
            </div>
          </div>

          <div className="pt-6 flex gap-4">
            <button onClick={() => setView('profile')} type="button" className="flex-1 py-4 border-2 border-slate-100 rounded-2xl text-[10px] font-black uppercase text-slate-400 text-center">Cancel</button>
            <button type="submit" disabled={isSubmitting || isUploading} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest">
              {isSubmitting ? 'Updating...' : 'Persist Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfilePage;
