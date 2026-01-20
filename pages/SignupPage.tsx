
import React, { useState, useMemo } from 'react';
import { useAuth } from '../App';
import { addUser } from '../services/storageService';
import { UserRole, User } from '../types';
import { APP_NAME } from '../constants';

const SignupPage: React.FC = () => {
  const { setView, login } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: UserRole.READER
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Entropy Analysis Logic
  const passkeyRequirements = useMemo(() => ({
    minLen: formData.password.length >= 6, // Reduced from 8 for testing
    hasUpper: /[A-Z]/.test(formData.password),
    hasLower: /[a-z]/.test(formData.password),
    hasNumber: /[0-9]/.test(formData.password),
    hasSpecial: /[^A-Za-z0-9]/.test(formData.password),
  }), [formData.password]);

  const entropyScore = useMemo(() => {
    const met = Object.values(passkeyRequirements).filter(Boolean).length;
    if (formData.password.length === 0) return 0;
    if (formData.password.length > 10) return met + 1;
    return met;
  }, [passkeyRequirements, formData.password]);

  const strengthLabel = useMemo(() => {
    if (entropyScore <= 1) return { text: 'Vulnerable', color: 'bg-rose-500' };
    if (entropyScore <= 3) return { text: 'Moderate', color: 'bg-amber-500' };
    if (entropyScore <= 5) return { text: 'Resilient', color: 'bg-indigo-500' };
    return { text: 'Impregnable', color: 'bg-emerald-500' };
  }, [entropyScore]);

  // RELAXED FOR TESTING: Threshold lowered to 1
  const isPasskeyValid = entropyScore >= 1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!formData.name || !formData.email || !formData.password) {
      setError('Essential fields missing.');
      return;
    }

    if (!isPasskeyValid) {
      setError('Cipher integrity insufficient. Please add at least 6 characters.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passkeys do not match.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Simulate credential encryption and archival
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newUser: User = {
        id: Math.random().toString(36).substr(2, 9),
        name: formData.name,
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role: formData.role,
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${formData.name}`,
        bio: `New ${formData.role} identity established.`,
        bookmarks: [],
        likedPosts: [],
        status: 'ACTIVE',
        joinedAt: new Date().toISOString()
      };

      await addUser(newUser);
      
      // AUTO-LOGIN HANDSHAKE
      const success = await login(newUser.email, newUser.password);
      if (success) {
        setIsSuccess(true);
        setTimeout(() => setView('home'), 1500);
      } else {
        setError('System established identity but auto-login handshake failed.');
        setIsSubmitting(false);
      }
    } catch (err: any) {
      setError('Internal authorization failure during record creation.');
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#fcfcfd] flex flex-col justify-center items-center py-12 px-6 lg:px-8 font-sans">
        <div className="max-w-[480px] w-full bg-white py-16 px-12 rounded-[4rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.06)] border border-slate-100 text-center animate-in zoom-in duration-700">
           <div className="w-20 h-20 bg-emerald-500 rounded-[2rem] flex items-center justify-center mx-auto mb-10 shadow-2xl">
             <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>
           </div>
           <h2 className="text-4xl font-black text-slate-900 font-serif mb-4 tracking-tight">Access Granted</h2>
           <p className="text-slate-500 text-lg font-medium mb-12">Handshake successful. Redirecting to platform discovery...</p>
           <div className="flex justify-center">
             <svg className="animate-spin h-8 w-8 text-indigo-600" viewBox="0 0 24 24">
               <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
               <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
             </svg>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfcfd] flex flex-col justify-center py-12 px-6 lg:px-8 font-sans relative">
      <div className="sm:mx-auto sm:w-full sm:max-w-[540px] relative z-10">
        <button onClick={() => setView('home')} className="flex justify-center mb-10 mx-auto group">
          <span className="text-4xl font-black bg-gradient-to-tr from-slate-950 to-indigo-700 bg-clip-text text-transparent tracking-tighter group-hover:scale-105 transition-transform">
            {APP_NAME}.
          </span>
        </button>
        <div className="bg-white/95 backdrop-blur-3xl py-12 px-10 sm:px-14 rounded-[3.5rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.08)] border border-white">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black text-slate-900 font-serif tracking-tight mb-3">Establish Identity</h2>
            <p className="text-slate-500 font-medium text-sm">Synchronize your profile with the Lumina registry.</p>
          </div>
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-rose-50 text-rose-600 p-5 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-rose-100 animate-in shake duration-300">
                {error}
              </div>
            )}
            
            <div className="flex p-1.5 bg-slate-50 rounded-2xl mb-8 border border-slate-100">
              {[UserRole.READER, UserRole.AUTHOR].map(role => (
                <button key={role} type="button" onClick={() => setFormData({...formData, role})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.role === role ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>
                  {role} Account
                </button>
              ))}
            </div>

            {formData.role === UserRole.AUTHOR && (
              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl mb-6">
                <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Onboarding Protocol</p>
                <p className="text-[11px] text-indigo-800/70 font-medium mt-1">Creator accounts require Council verification before publishing privileges are unlocked.</p>
              </div>
            )}

            <div className="space-y-4">
              <div className="relative">
                <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-semibold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:bg-white transition-all" placeholder="Full Identity Display Name" />
              </div>
              <div className="relative">
                <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-semibold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:bg-white transition-all" placeholder="Email Identifier" />
              </div>
              
              <div className="relative group">
                <input 
                  type={showPassword ? "text" : "password"} 
                  required 
                  value={formData.password} 
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-semibold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:bg-white transition-all" 
                  placeholder="Create Secure Passkey" 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 px-6 flex items-center text-slate-300 hover:text-indigo-600 transition-colors"
                >
                  {showPassword ? '🙉' : '🙈'}
                </button>
              </div>

              {formData.password.length > 0 && (
                <div className="px-2 py-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Entropy Index</p>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded text-white ${strengthLabel.color} shadow-sm`}>
                      {strengthLabel.text}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mb-6">
                    <div 
                      className={`h-full transition-all duration-500 ${strengthLabel.color}`}
                      style={{ width: `${Math.min(100, (entropyScore / 6) * 100)}%` }}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                    <PasskeyRequirement label="6+ Characters" met={passkeyRequirements.minLen} />
                    <PasskeyRequirement label="Case Mixture" met={passkeyRequirements.hasUpper && passkeyRequirements.hasLower} />
                    <PasskeyRequirement label="Numerical Anchor" met={passkeyRequirements.hasNumber} />
                    <PasskeyRequirement label="Cipher Symbol" met={passkeyRequirements.hasSpecial} />
                  </div>
                </div>
              )}

              <input 
                type="password" 
                required 
                value={formData.confirmPassword} 
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} 
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-semibold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:bg-white transition-all" 
                placeholder="Verify Secure Passkey" 
              />
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting || !isPasskeyValid} 
              className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.3em] shadow-2xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-30 disabled:grayscale"
            >
              {isSubmitting ? 'Archiving Credentials...' : 'Establish Profile'}
            </button>
          </form>
          <div className="mt-10 text-center pt-8 border-t border-slate-100">
            <button onClick={() => setView('login')} className="text-xs font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-500 transition-colors">Sign In to Existing Portal</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const PasskeyRequirement = ({ label, met }: { label: string; met: boolean }) => (
  <div className="flex items-center gap-2">
    <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-all ${met ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-300'}`}>
      {met ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="6"><polyline points="20 6 9 17 4 12"/></svg>
      ) : (
        <div className="w-1 h-1 bg-current rounded-full" />
      )}
    </div>
    <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${met ? 'text-slate-900' : 'text-slate-400'}`}>{label}</span>
  </div>
);

export default SignupPage;
