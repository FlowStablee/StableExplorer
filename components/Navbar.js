"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Terminal, Cpu, Activity } from 'lucide-react';
import { provider } from '@/lib/utils';
import Link from 'next/link';

export default function Navbar() {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const router = useRouter();

  const handleSearch = async (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    
    setSearching(true);
    try {
        if (!isNaN(q) && !q.startsWith('0x')) { router.push(`/block/${q}`); return; }
        if (q.length === 42 && q.startsWith('0x')) { router.push(`/address/${q}`); return; }
        if (q.length === 66 && q.startsWith('0x')) {
            const block = await provider.getBlock(q);
            if (block) router.push(`/block/${q}`);
            else router.push(`/tx/${q}`);
            return;
        }
        alert("INVALID_INPUT_FORMAT");
    } catch (e) { router.push(`/tx/${q}`); } 
    finally { setSearching(false); }
  };

  return (
    <nav className="sticky top-0 z-50 bg-[#050505]/95 border-b border-[#222] backdrop-blur-md">
      <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* LOGO & STATUS */}
        <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-3 group">
                <div className="bg-neon text-black p-1.5 font-bold rounded-sm shadow-[0_0_15px_rgba(0,255,157,0.4)]">
                    <Terminal size={22} />
                </div>
                <div className="flex flex-col">
                    <span className="text-lg font-bold tracking-widest text-white font-mono group-hover:text-neon transition">
                        FLOWSTABLE
                    </span>
                    <span className="text-[9px] uppercase tracking-[0.3em] text-gray-500">
                        EXPLORER
                    </span>
                </div>
            </Link>

            {/* INTEGRATED STATUS INDICATOR (Clean) */}
            <div className="hidden md:flex items-center gap-2 text-[10px] font-mono border-l border-[#222] pl-6 text-gray-500">
                <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-neon rounded-full animate-pulse"></span>
                    MAINNET_LIVE
                </span>
                <span className="text-[#333]">|</span>
                <span className="flex items-center gap-1">
                    <Activity size={10} className="text-neon"/> 12ms
                </span>
            </div>
        </div>

        {/* SEARCH BAR */}
        <form onSubmit={handleSearch} className="relative w-full md:w-[500px] group">
          <div className="absolute left-3 top-3 text-neon font-mono font-bold animate-pulse">
            {searching ? '...' : '>'}
          </div>
          <input
            type="text"
            placeholder="Search Block / Tx / Addr..."
            className="w-full h-11 bg-[#0a0a0a] border border-[#333] text-neon rounded-none pl-8 pr-12 focus:outline-none focus:border-neon focus:shadow-[0_0_15px_rgba(0,255,157,0.1)] text-sm font-mono placeholder-gray-700 transition-all"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={searching}
          />
          <button type="submit" className="absolute right-0 top-0 h-11 w-11 flex items-center justify-center text-[#333] hover:text-neon hover:bg-[#111] border-l border-[#333]">
            <Search size={16} />
          </button>
        </form>

      </div>
    </nav>
  );
}