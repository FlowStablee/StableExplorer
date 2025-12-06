"use client";
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { provider, shortAddress } from '@/lib/utils';
import { ethers } from 'ethers';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { Coins, FileText, Activity, Users, ArrowRight } from 'lucide-react';

export default function TokenPage() {
  const { id } = useParams();
  const [token, setToken] = useState(null);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if(!id) return;
    const init = async () => {
      try {
        // 1. Fetch Metadata
        const contract = new ethers.Contract(id, [
            "function name() view returns (string)",
            "function symbol() view returns (string)",
            "function decimals() view returns (uint8)",
            "function totalSupply() view returns (uint256)"
        ], provider);

        const [name, symbol, decimals, supply] = await Promise.all([
            contract.name(),
            contract.symbol(),
            contract.decimals(),
            contract.totalSupply()
        ]);

        setToken({ name, symbol, decimals, supply: ethers.formatUnits(supply, decimals) });

        // 2. Fetch Transfer Logs (Last 2000 blocks)
        const latest = await provider.getBlockNumber();
        const logs = await provider.getLogs({
            fromBlock: latest - 2000,
            toBlock: 'latest',
            address: id, // Only logs from THIS contract
            topics: ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"] // Transfer topic
        });

        // Parse Logs
        const parsed = logs.reverse().slice(0, 50).map(l => ({
            hash: l.transactionHash,
            block: parseInt(l.blockNumber, 16),
            from: ethers.stripZerosLeft(l.topics[1]),
            to: ethers.stripZerosLeft(l.topics[2]),
            val: ethers.formatUnits(l.data === '0x' ? '0' : l.data, decimals) // Handle 0 value transfers
        }));

        setTransfers(parsed);

      } catch(e) { console.error("Not a token or error", e); } finally { setLoading(false); }
    };
    init();
  }, [id]);

  if(loading) return <div className="min-h-screen bg-[#050505] terminal-bg flex items-center justify-center text-[#00ff9d] font-mono">_DECODING_TOKEN_CONTRACT...</div>;
  if(!token) return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-red-500 font-mono">INVALID_TOKEN_CONTRACT</div>;

  return (
    <div className="min-h-screen terminal-bg pb-10">
      <Navbar />
      <main className="max-w-[1400px] mx-auto px-6 pt-8">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row gap-6 mb-8 items-start">
            <div className="w-20 h-20 bg-[#0a0a0a] border border-[#333] flex items-center justify-center rounded-sm shadow-[0_0_15px_rgba(0,255,157,0.1)]">
                <Coins size={40} className="text-[#00ff9d]"/>
            </div>
            <div className="flex-1">
                <h1 className="text-3xl font-bold text-white tracking-tight mb-2">
                    {token.name} <span className="text-gray-500 text-xl font-light">({token.symbol})</span>
                </h1>
                <div className="flex flex-wrap gap-4 text-sm font-mono text-gray-400">
                    <span className="bg-[#111] px-2 py-1 border border-[#222] rounded">ERC-20</span>
                    <span className="flex items-center gap-2">Contract: <span className="text-[#00ff9d] break-all">{id}</span></span>
                </div>
            </div>
        </div>

        {/* METRICS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="card-terminal p-6 border-t-2 border-t-[#00ff9d]">
                <h3 className="text-gray-500 text-xs uppercase font-bold mb-2">Total Supply</h3>
                <div className="text-xl font-bold text-white font-mono">{parseFloat(token.supply).toLocaleString()}</div>
                <div className="text-[10px] text-gray-500 mt-1">{token.symbol}</div>
            </div>
            <div className="card-terminal p-6">
                 <h3 className="text-gray-500 text-xs uppercase font-bold mb-2">Holders</h3>
                 <div className="text-xl font-bold text-white font-mono flex items-center gap-2">
                    <Users size={16} className="text-gray-600"/> --
                 </div>
                 <div className="text-[10px] text-gray-500 mt-1">Requires Indexer</div>
            </div>
            <div className="card-terminal p-6">
                 <h3 className="text-gray-500 text-xs uppercase font-bold mb-2">Decimals</h3>
                 <div className="text-xl font-bold text-white font-mono">{token.decimals}</div>
            </div>
        </div>

        {/* TRANSFERS TABLE */}
        <div className="card-terminal overflow-hidden min-h-[400px]">
            <div className="bg-[#0f0f0f] border-b border-[#222] px-6 py-4 flex justify-between items-center">
                <h3 className="text-white text-sm font-bold flex items-center gap-2"><Activity size={16} className="text-[#00ff9d]"/> TOKEN TRANSFERS (Last 2000 Blocks)</h3>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-sm">
                    <thead className="text-gray-500 bg-[#0a0a0a] border-b border-[#222]">
                        <tr>
                            <th className="p-4 font-normal text-xs uppercase">Tx Hash</th>
                            <th className="p-4 font-normal text-xs uppercase">Block</th>
                            <th className="p-4 font-normal text-xs uppercase">From</th>
                            <th className="p-4 font-normal text-xs uppercase">To</th>
                            <th className="p-4 font-normal text-xs uppercase">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#222]">
                        {transfers.length === 0 ? (
                             <tr><td colSpan="5" className="p-10 text-center text-gray-600">No transfers found in recent history.</td></tr>
                        ) : transfers.map((t, i) => (
                            <tr key={i} className="hover:bg-[#111] transition">
                                <td className="p-4"><Link href={`/tx/${t.hash}`} className="text-[#00ff9d] hover:underline">{shortAddress(t.hash)}</Link></td>
                                <td className="p-4 text-blue-400">{t.block}</td>
                                <td className="p-4 text-gray-400">{shortAddress(t.from)}</td>
                                <td className="p-4 flex items-center gap-2">
                                    <ArrowRight size={12} className="text-gray-600"/>
                                    <span className="text-gray-400">{shortAddress(t.to)}</span>
                                </td>
                                <td className="p-4 text-white font-bold">{parseFloat(t.val).toFixed(4)} {token.symbol}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

      </main>
    </div>
  );
}