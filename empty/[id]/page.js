"use client";
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ethers } from 'ethers';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { Wallet, Code, Coins, ArrowRight, Copy, Activity, Box, Banknote, RefreshCw, Database } from 'lucide-react';

const RPC_URL = "https://api-stable-mainnet.n.dwellir.com/500b86ab-9b75-4df0-ba58-b8f60e8ad4f9/";
const provider = new ethers.JsonRpcProvider(RPC_URL, undefined, { staticNetwork: true });

// Utils
const toEth = (val) => val ? parseFloat(ethers.formatEther(val)).toFixed(4) : "0.00";
const short = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "UNK";
const timeAgo = (ts) => {
    if(!ts) return 'Unknown';
    const diff = Math.floor(Date.now()/1000) - ts;
    if(diff < 60) return `${diff}s ago`;
    if(diff < 3600) return `${Math.floor(diff/60)}m ago`;
    return `${Math.floor(diff/3600)}h ago`;
};

export default function AddressPage() {
  const { id } = useParams();
  
  const [data, setData] = useState({ balance: '0', nonce: 0, isContract: false, code: '0x' });
  const [dbTxs, setDbTxs] = useState([]);
  const [tokenTxs, setTokenTxs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('transactions');

  useEffect(() => {
    if(!id) return;

    const loadHybridData = async () => {
        try {
            setLoading(true);

            // 1. LIVE DATA FROM RPC (Always Fresh)
            const [bal, code, count, latest] = await Promise.all([
                provider.getBalance(id),
                provider.getCode(id),
                provider.getTransactionCount(id),
                provider.getBlockNumber()
            ]);

            const isContract = code !== '0x';
            setData({ 
                balance: toEth(bal), 
                nonce: count, 
                isContract, 
                code 
            });

            // 2. HISTORY FROM MONGO DB (Super Fast)
            // Humne jo API banayi, usse call kar rahe hain
            fetch(`/api/address/${id}`)
                .then(res => res.json())
                .then(json => {
                    if(json.success) setDbTxs(json.data);
                });

            // 3. TOKEN TRANSFERS (RPC LOGS - Fast enough)
            const topic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
            const padded = ethers.zeroPadValue(id, 32).toLowerCase();
            const logs = await provider.getLogs({
                fromBlock: Math.max(0, latest - 5000),
                toBlock: 'latest',
                topics: [topic]
            });
            
            const filteredLogs = logs.filter(l => 
                l.address.toLowerCase() === id.toLowerCase() || 
                l.topics[1]?.toLowerCase() === padded || 
                l.topics[2]?.toLowerCase() === padded
            ).reverse().slice(0, 50);
            
            setTokenTxs(filteredLogs);

        } catch(e) { console.error(e); } 
        finally { setLoading(false); }
    };

    loadHybridData();
  }, [id]);

  if(loading) return (
      <div className="min-h-screen bg-[#050505] flex flex-col justify-center items-center font-mono text-neon">
          <RefreshCw className="animate-spin mb-4" size={40}/>
          <div className="tracking-widest animate-pulse">SYNCING HYBRID DATA...</div>
      </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] pb-20 font-mono text-gray-300">
      <Navbar />
      <main className="max-w-[1600px] mx-auto px-6 pt-8">
        
        {/* HEADER */}
        <div className="terminal-card p-6 mb-6 bg-[#0a0a0a] border-l-4 border-l-neon">
            <div className="flex gap-6 items-center">
                <div className="p-4 bg-[#111] border border-[#333] text-neon rounded-full">
                    {data.isContract ? <Code size={32}/> : <Wallet size={32}/>}
                </div>
                <div className="flex-1">
                    <h1 className="text-2xl text-white font-bold mb-2">
                        {data.isContract ? "SMART CONTRACT" : "WALLET ADDRESS"}
                    </h1>
                    <div className="bg-[#000] p-2 border border-[#222] inline-flex items-center gap-2 cursor-pointer hover:border-neon transition" onClick={() => navigator.clipboard.writeText(id)}>
                        <span className="text-gray-400 text-sm break-all group-hover:text-white">{id}</span>
                        <Copy size={12} className="text-gray-600 group-hover:text-neon"/>
                    </div>
                </div>
            </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatBox label="BALANCE" val={`${data.balance} GUSDT`} icon={<Banknote size={16}/>} />
            <StatBox label="TX NONCE" val={data.nonce} icon={<Activity size={16}/>} />
            <StatBox label="DB RECORDS" val={dbTxs.length} icon={<Database size={16}/>} color="text-neon" />
        </div>

        {/* DATA TABLE */}
        <div className="terminal-card min-h-[600px] bg-[#0a0a0a] flex flex-col">
            <div className="flex bg-[#111] border-b border-[#222]">
                <button onClick={() => setActiveTab('transactions')} className={`px-8 py-4 text-xs font-bold transition-all border-b-2 ${activeTab==='transactions' ? 'text-neon border-neon bg-neon/5' : 'text-gray-500 border-transparent hover:text-white'}`}>
                    TRANSACTIONS (DB)
                </button>
                <button onClick={() => setActiveTab('tokens')} className={`px-8 py-4 text-xs font-bold transition-all border-b-2 ${activeTab==='tokens' ? 'text-neon border-neon bg-neon/5' : 'text-gray-500 border-transparent hover:text-white'}`}>
                    TOKEN TRANSFERS (RPC)
                </button>
            </div>

            <div className="flex-1 p-0 relative">
                
                {/* DATABASE TRANSACTIONS */}
                {activeTab === 'transactions' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-[#0f0f0f] text-gray-500 border-b border-[#222]">
                                <tr>
                                    <th className="p-4 w-40">Tx Hash</th>
                                    <th className="p-4 w-20">Block</th>
                                    <th className="p-4 w-32">Age</th>
                                    <th className="p-4 w-40">From</th>
                                    <th className="p-4 w-10 text-center">Dir</th>
                                    <th className="p-4 w-40">To</th>
                                    <th className="p-4 text-right">Value</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#1a1a1a]">
                                {dbTxs.map((tx, i) => {
                                    const isIn = tx.to && tx.to.toLowerCase() === id.toLowerCase();
                                    return (
                                        <tr key={i} className="hover:bg-[#111] transition">
                                            <td className="p-4"><Link href={`/tx/${tx.hash}`} className="text-neon hover:underline decoration-dashed font-mono">{short(tx.hash)}</Link></td>
                                            <td className="p-4 text-blue-500 font-mono">{tx.block}</td>
                                            <td className="p-4 text-gray-500 text-xs font-mono">{timeAgo(tx.timestamp)}</td>
                                            <td className="p-4 text-gray-400 font-mono"><Link href={`/address/${tx.from}`} className="hover:text-white">{short(tx.from)}</Link></td>
                                            <td className="p-4 text-center">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${isIn ? 'border-green-800 text-green-500' : 'border-yellow-800 text-yellow-500'}`}>
                                                    {isIn ? 'IN' : 'OUT'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-gray-400 font-mono"><Link href={`/address/${tx.to}`} className="hover:text-white">{short(tx.to)}</Link></td>
                                            <td className="p-4 text-right text-white font-bold font-mono">{parseFloat(tx.value).toFixed(4)}</td>
                                        </tr>
                                    )
                                })}
                                {dbTxs.length === 0 && <tr><td colSpan="7" className="p-20 text-center text-gray-600 font-mono text-xs">NO INDEXED DATA YET. RUN INDEXER SCRIPT.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* TOKEN TRANSFERS (RPC LOGS) */}
                {activeTab === 'tokens' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-[#0f0f0f] text-gray-500 border-b border-[#222]">
                                <tr>
                                    <th className="p-4">Tx Hash</th>
                                    <th className="p-4">Block</th>
                                    <th className="p-4">From</th>
                                    <th className="p-4">To</th>
                                    <th className="p-4">Contract</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#1a1a1a]">
                                {tokenTxs.map((log, i) => {
                                    const from = ethers.stripZerosLeft(log.topics[1] || '0x0');
                                    const to = ethers.stripZerosLeft(log.topics[2] || '0x0');
                                    return (
                                        <tr key={i} className="hover:bg-[#111] transition">
                                            <td className="p-4"><Link href={`/tx/${log.transactionHash}`} className="text-neon hover:underline">{short(log.transactionHash)}</Link></td>
                                            <td className="p-4 text-blue-500">{parseInt(log.blockNumber, 16)}</td>
                                            <td className="p-4 text-gray-400"><Link href={`/address/${from}`} className="hover:text-white">{short(from)}</Link></td>
                                            <td className="p-4 text-gray-400"><Link href={`/address/${to}`} className="hover:text-white">{short(to)}</Link></td>
                                            <td className="p-4 text-gray-500 flex items-center gap-2"><Box size={12}/> {short(log.address)}</td>
                                        </tr>
                                    )
                                })}
                                {tokenTxs.length === 0 && <tr><td colSpan="5" className="p-20 text-center text-gray-600 font-mono text-xs">NO TOKEN EVENTS IN LAST 5000 BLOCKS</td></tr>}
                            </tbody>
                        </table>
                    </div>
                )}

            </div>
        </div>
      </main>
    </div>
  );
}

const StatBox = ({label, val, sub, icon, color}) => (
    <div className="terminal-card p-5 bg-[#0a0a0a] border border-[#222] hover:border-neon transition flex flex-col justify-between h-24">
        <div className="flex justify-between items-start">
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{label}</p>
            {icon && <div className="text-gray-700">{icon}</div>}
        </div>
        <p className={`text-xl font-bold font-mono ${color || 'text-white'} truncate`}>{val}</p>
    </div>
);