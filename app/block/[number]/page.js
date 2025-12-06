"use client";
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { provider, formatGas, shortAddress } from '@/lib/utils';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { Box, ArrowLeft, ArrowRight, Layers, Cpu, Hash, Database } from 'lucide-react';

export default function BlockPage() {
  const params = useParams();
  const router = useRouter();
  const [block, setBlock] = useState(null);
  const [loading, setLoading] = useState(true);

  // Logic to handle Hash vs Number
  const blockParam = params.number;
  const isHash = blockParam.startsWith('0x');

  useEffect(() => {
    if(!blockParam) return;
    
    const fetchBlockData = async () => {
        try {
            setLoading(true);
            const query = isHash ? blockParam : Number(blockParam);
            const data = await provider.getBlock(query, true); // True = prefetch txs
            setBlock(data);
        } catch(e) { console.error(e); } finally { setLoading(false); }
    };
    
    fetchBlockData();
  }, [blockParam]);

  if (loading) return (
    <div className="min-h-screen bg-[#050505] flex flex-col">
        <Navbar/>
        <div className="flex-1 flex flex-col items-center justify-center text-neon font-mono gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-neon"></div>
            <div className="animate-pulse">_ACCESSING_BLOCK...</div>
        </div>
    </div>
  );

  if (!block) return (
    <div className="min-h-screen bg-[#050505] flex flex-col">
        <Navbar/>
        <div className="flex-1 flex flex-col items-center justify-center text-red-500 font-mono">
            [ ERROR: BLOCK_NOT_FOUND ]
            <button onClick={() => router.push('/')} className="mt-4 px-4 py-2 border border-[#333] hover:border-white text-xs text-white">RETURN HOME</button>
        </div>
    </div>
  );

  // Helper to Decode Extra Data safely
  const getExtraDataDisplay = () => {
      const raw = block.extraData;
      if (!raw || raw === '0x') return "None";
      try {
          // Try converting hex to string
          const text = Buffer.from(raw.replace('0x', ''), 'hex').toString('utf8');
          // If text looks like garbage (mostly non-printable), return Hex
          if (/^[\x20-\x7E]*$/.test(text) && text.length > 0) return `"${text}" (ASCII)`;
          return raw; // Return Hex if not readable
      } catch (e) {
          return raw;
      }
  };

  const gasPercent = block.gasLimit > 0n ? Number((block.gasUsed * 100n) / block.gasLimit) : 0;

  return (
    <div className="min-h-screen bg-[#050505] pb-20">
      <Navbar />
      <main className="max-w-[1600px] mx-auto px-4 md:px-6 pt-10">
        
        {/* NAV */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-[#111] border border-[#333] text-neon rounded-sm">
                    <Box size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white font-mono">BLOCK #{block.number}</h1>
                    <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">
                        {new Date(block.timestamp * 1000).toUTCString()}
                    </span>
                </div>
            </div>
            
            <div className="flex gap-2">
                <button onClick={() => router.push(`/block/${block.number - 1}`)} disabled={block.number<=0} className="px-4 py-2 border border-[#333] bg-[#0a0a0a] text-gray-400 hover:text-neon text-xs font-mono disabled:opacity-50">
                    {'<'} PREV
                </button>
                <button onClick={() => router.push(`/block/${block.number + 1}`)} className="px-4 py-2 border border-[#333] bg-[#0a0a0a] text-gray-400 hover:text-neon text-xs font-mono">
                    NEXT {'>'}
                </button>
            </div>
        </div>

        {/* DETAILS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 terminal-card p-6 space-y-2">
                <Row label="Hash" value={block.hash} />
                <Row label="Parent Hash" value={<Link href={`/block/${block.parentHash}`} className="text-neon hover:underline">{block.parentHash}</Link>} />
                <Row label="Miner" value={block.miner} />
                <Row label="Difficulty" value={block.difficulty.toString()} />
                <Row label="Base Fee" value={`${formatGas(block.baseFeePerGas)} Gwei`} />
                
                <div className="border-t border-[#222] my-4 pt-4">
                    <p className="text-gray-500 text-[10px] font-mono uppercase mb-2">Extra Data</p>
                    <div className="bg-[#050505] border border-[#222] p-3 text-xs font-mono text-gray-400 break-all">
                        {getExtraDataDisplay()}
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <div className="terminal-card p-6">
                    <h3 className="text-gray-400 text-xs font-bold font-mono uppercase mb-4">Gas Usage</h3>
                    <div className="w-full bg-[#111] h-2 mb-2 rounded-full overflow-hidden">
                        <div className="h-full bg-neon" style={{width: `${gasPercent}%`}}></div>
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                        <span>{block.gasUsed.toString()}</span>
                        <span>{block.gasLimit.toString()}</span>
                    </div>
                </div>

                <div className="terminal-card p-6 text-center py-10">
                    <p className="text-gray-500 text-[10px] font-mono uppercase tracking-widest">Transactions</p>
                    <p className="text-5xl font-bold text-white font-mono mt-2">{block.transactions.length}</p>
                </div>
            </div>
        </div>

        {/* TRANSACTIONS LIST */}
        <div className="mt-8 terminal-card">
            <div className="bg-[#111] p-3 border-b border-[#222]">
                <span className="text-white text-xs font-bold font-mono uppercase">Block Transactions</span>
            </div>
            <div className="max-h-[500px] overflow-auto">
                <table className="w-full text-left font-mono text-sm">
                    <tbody className="divide-y divide-[#1a1a1a]">
                        {block.transactions.map((tx, i) => {
                            const hash = typeof tx === 'string' ? tx : tx.hash;
                            return (
                                <tr key={i} className="hover:bg-[#111]">
                                    <td className="p-4 text-gray-600 text-xs w-12">{i}</td>
                                    <td className="p-4"><Link href={`/tx/${hash}`} className="text-neon hover:underline">{hash}</Link></td>
                                </tr>
                            )
                        })}
                        {block.transactions.length === 0 && <tr><td className="p-10 text-center text-gray-600 italic">No transactions</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>

      </main>
    </div>
  );
}

const Row = ({label, value}) => (
    <div className="grid grid-cols-1 md:grid-cols-4 py-2 border-b border-[#1a1a1a] last:border-0">
        <span className="text-gray-500 text-xs font-mono font-bold uppercase flex items-center">{label}</span>
        <div className="md:col-span-3 text-sm text-gray-300 font-mono break-all">{value}</div>
    </div>
);