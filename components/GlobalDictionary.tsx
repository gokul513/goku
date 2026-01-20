
import React, { useState, useEffect, useRef } from 'react';
import { Icons } from '../constants';
import { getInstantDefinition } from '../services/geminiService';

interface GlobalDictionaryProps {
  isOpen: boolean;
  onClose: () => void;
}

const GlobalDictionary: React.FC<GlobalDictionaryProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [definition, setDefinition] = useState<{ definition: string; partOfSpeech: string; usage: string; synonyms?: string[] } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
      setDefinition(null);
      setError(null);
    }
  }, [isOpen]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);
    setDefinition(null);

    try {
      const res = await getInstantDefinition(query, "General linguistic lookup.");
      setDefinition(res);
    } catch (err) {
      setError("Failed to fetch definition. Try another word.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-end p-4 md:p-8 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md h-full bg-white rounded-[3rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] border border-slate-100 flex flex-col overflow-hidden animate-in slide-in-from-right-12 duration-500">
        <header className="p-8 border-b border-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200">
              <Icons.Book />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Lexicon</h2>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">AI-Powered Dictionary</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-50 rounded-full text-slate-400 transition-colors">
            <Icons.X />
          </button>
        </header>

        <div className="p-8 flex-1 overflow-y-auto">
          <form onSubmit={handleSearch} className="mb-10 relative">
            <input 
              ref={inputRef}
              type="text" 
              placeholder="Search any word..." 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-6 pr-14 py-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] focus:ring-4 focus:ring-indigo-500/5 focus:bg-white outline-none transition-all font-bold text-lg placeholder:text-slate-300"
            />
            <button 
              type="submit"
              disabled={isLoading}
              className="absolute right-3 top-3 bottom-3 px-4 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] hover:bg-slate-800 transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              ) : 'Look Up'}
            </button>
          </form>

          {error && (
            <div className="p-6 bg-red-50 border border-red-100 rounded-3xl text-center">
              <p className="text-sm font-bold text-red-600">{error}</p>
            </div>
          )}

          {definition && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-6">
                <h3 className="text-3xl font-black text-slate-900 leading-none mb-2">{query}</h3>
                <span className="text-xs font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">{definition.partOfSpeech}</span>
              </div>
              
              <p className="text-lg text-slate-700 leading-relaxed font-medium mb-8">
                {definition.definition}
              </p>

              {definition.synonyms && definition.synonyms.length > 0 && (
                <div className="mb-8">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Synonyms</p>
                  <div className="flex flex-wrap gap-2">
                    {definition.synonyms.map(s => (
                      <button 
                        key={s} 
                        onClick={() => { setQuery(s); }}
                        className="px-3 py-1.5 bg-white border border-slate-100 rounded-xl text-[10px] font-bold text-slate-500 uppercase tracking-wider hover:border-indigo-600 hover:text-indigo-600 transition-all"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-8 border-t border-slate-50">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Usage Example</p>
                <p className="text-sm italic text-slate-500 leading-relaxed font-serif">
                  "{definition.usage}"
                </p>
              </div>
            </div>
          )}

          {!definition && !isLoading && !error && (
            <div className="h-full flex flex-col items-center justify-center py-20 text-center opacity-30">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                <Icons.Book />
              </div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">Discover meanings instantly</p>
            </div>
          )}
        </div>

        <footer className="p-8 bg-slate-50/50 border-t border-slate-100 text-center">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Lumina Linguistic Protocol v1.0</p>
        </footer>
      </div>
    </div>
  );
};

export default GlobalDictionary;
