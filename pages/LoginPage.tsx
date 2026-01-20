
import React, { useState } from 'react';
import { useAuth } from '../App';
import { UserRole } from '../types';
import { APP_NAME } from '../constants';
import { forceSystemReset } from '../services/storageService';

type ViewMode = 'PORTAL_SELECTION' | 'AUTH_FORM';

const LoginPage: React.FC = () => {
  const { login, setView } = useAuth();

  const [view, setViewMode] = useState<ViewMode>('PORTAL_SELECTION');
  const [activeRole, setActiveRole] = useState<UserRole>(UserRole.READER);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const selectPortal = (role: UserRole) => {
    setActiveRole(role);
    setViewMode('AUTH_FORM');
    setError(null);
  };

  const handleReset = async () => {
    if (confirm("This will clear your local identity archive and re-seed the system with demo accounts. Continue?")) {
      setIsResetting(true);
      await forceSystemReset();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Identity credentials required.');
      return;
    }

    setIsSubmitting(true);
    // Mimic network handshake
    await new Promise(resolve => setTimeout(resolve, 800));

    try {
      const loggedInUser = await login(email, password);
      if (loggedInUser) {
        setView('home');
      } else {
        setError('Authorization failed. Incorrect identifier or passkey.');
        setIsSubmitting(false);
      }
    } catch (err) {
      setError('System failure during verification.');
      setIsSubmitting(false);
    }
  };

  const branding = {
    [UserRole.READER]: {
      title: 'User Portal',
      desc: 'Connect as a reader to browse the narrative library.',
      accent: 'text-indigo-600',
      btn: 'bg-indigo-600 hover:bg-indigo-700',
      bg: 'from-indigo-50 to-white',
      icon: '📖'
    },
    [UserRole.AUTHOR]: {
      title: 'Author Hub',
      desc: 'Access your writing desk and coordinate narrations.',
      accent: 'text-emerald-600',
      btn: 'bg-emerald-600 hover:bg-emerald-700',
      bg: 'from-emerald-50 to-white',
      icon: '✍️'
    },
    [UserRole.ADMIN]: {
      title: 'Command Center',
      desc: 'Authorized override for governance and moderation.',
      accent: 'text-slate-900',
      btn: 'bg-slate-900 hover:bg-slate-800',
      bg: 'from-slate-100 to-white',
      icon: '⚙️'
    }
  };

  if (view === 'PORTAL_SELECTION') {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-6 animate-in fade-in duration-700">
        <div className="max-w-5xl w-full">
          <div className="text-center mb-16">
            <button onClick={() => setView('home')} className="text-5xl font-black bg-gradient-to-tr from-slate-900 via-indigo-950 to-indigo-600 bg-clip-text text-transparent tracking-tighter mb-4 block mx-auto">
              {APP_NAME}.
            </button>
            <h1 className="text-3xl font-black text-slate-900 font-serif mb-2 tracking-tight">System Gateway</h1>
            <p className="text-slate-500 font-medium">Identify your role to access the Lumina platform.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[UserRole.READER, UserRole.AUTHOR, UserRole.ADMIN].map((role) => (
              <button
                key={role}
                onClick={() => selectPortal(role)}
                className="group relative bg-white border border-slate-100 p-10 rounded-[3rem] text-center shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:scale-[1.02] transition-all duration-500"
              >
                <div className="text-5xl mb-6 grayscale group-hover:grayscale-0 transition-all duration-500 transform group-hover:scale-110">
                  {branding[role].icon}
                </div>
                <h3 className={`text-xl font-black mb-3 ${branding[role].accent} uppercase tracking-tight`}>
                  {branding[role].title}
                </h3>
                <p className="text-slate-500 text-sm font-medium mb-8 leading-relaxed">
                  {branding[role].desc}
                </p>
                <div className={`py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all ${branding[role].btn}`}>
                  Establish Connection
                </div>
              </button>
            ))}
          </div>

          <div className="mt-16 text-center space-y-4">
             <div>
                <button onClick={() => setView('signup')} className="text-sm font-bold text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-widest">
                  First time? Establish Identity
                </button>
             </div>
             <div>
                <button 
                  onClick={handleReset} 
                  className="text-[9px] font-black text-slate-300 hover:text-rose-500 uppercase tracking-widest transition-colors"
                  disabled={isResetting}
                >
                  {isResetting ? 'Purging Stale Records...' : 'Sync Authorized Identity Archive'}
                </button>
             </div>
          </div>
        </div>
      </div>
    );
  }

  const b = branding[activeRole];

  return (
    <div className={`min-h-screen bg-gradient-to-b ${b.bg} flex flex-col justify-center py-12 px-6 lg:px-8 font-sans animate-in fade-in slide-in-from-bottom-6 duration-700`}>
      <div className="sm:mx-auto sm:w-full sm:max-w-[480px]">
        <div className="bg-white/70 backdrop-blur-2xl py-12 px-10 sm:px-14 rounded-[3.5rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] border border-white">
          <button 
            onClick={() => setViewMode('PORTAL_SELECTION')}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors mb-10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            Change Portal
          </button>

          <div className="text-center mb-10">
            <div className="text-4xl mb-4">{b.icon}</div>
            <h2 className="text-3xl font-black text-slate-900 font-serif tracking-tight mb-2">
              {b.title} Login
            </h2>
            <p className="text-slate-500 font-medium text-sm">Please identify your narrative connection.</p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-widest px-5 py-3 rounded-2xl border border-red-100 animate-in shake duration-300">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Identity Connection (Email)</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-slate-900 focus:ring-4 focus:ring-indigo-500/5 focus:bg-white outline-none transition-all font-semibold"
                  placeholder="admin@lumina.io"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Secure Passkey (Password)</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-slate-900 focus:ring-4 focus:ring-indigo-500/5 focus:bg-white outline-none transition-all font-semibold"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 px-5 flex items-center text-slate-300 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? '🙉' : '🙈'}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full flex justify-center py-5 px-4 rounded-[1.5rem] shadow-2xl text-[11px] font-black uppercase tracking-[0.3em] text-white transition-all transform active:scale-[0.98] ${b.btn} ${isSubmitting ? 'opacity-70 cursor-wait' : ''}`}
            >
              {isSubmitting ? 'Authenticating...' : `Enter ${b.title}`}
            </button>
          </form>

          <div className="mt-10 text-center pt-8 border-t border-slate-100 space-y-4">
              <p className="text-sm font-medium text-slate-400">
                Need a connection?{' '}
                <button onClick={() => setView('signup')} className={`font-black ${b.accent}`}>
                  Establish Identity
                </button>
              </p>
              <button 
                onClick={handleReset} 
                className="text-[9px] font-black text-slate-300 hover:text-indigo-600 uppercase tracking-[0.2em] transition-colors"
              >
                Reset Authorized Records
              </button>
          </div>
        </div>
      </div>
      <div className="mt-12 text-center text-[10px] font-black uppercase tracking-[0.4em] text-slate-300">
        Encrypted Endpoint • Narrative-V2.1
      </div>
    </div>
  );
};

export default LoginPage;
