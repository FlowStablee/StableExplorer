"use client";
import { useEffect, useState, useRef } from 'react';
import { provider, formatGas, shortAddress } from '@/lib/utils';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { Box, Radio, Zap, Server, Globe, Cpu, Database, Loader2 } from 'lucide-react';

export default function Home() {
  const [stats, setStats] = useState({ gasPrice: '0', blockNumber: 0, chainId: 0 });
  const [blocks, setBlocks] = useState([]);
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Ye pointers yaad rakhenge ki humne kahan tak scan kar liya hai
  const processedHashes = useRef(new Set());
  const historyPointer = useRef(0); // Ye track karega hum history me kitna piche gaye

  const fetchData = async () => {
    try {
      const currentBlockNum = await provider.getBlockNumber();
      const feeData = await provider.getFeeData();
      const network = await provider.getNetwork();

      setStats({
        gasPrice: feeData.gasPrice,
        blockNumber: currentBlockNum,
        chainId: network.chainId.toString()
      });

      // Agar ye pehli baar chal raha hai, to pointer set karo
      if (historyPointer.current === 0) {
          historyPointer.current = currentBlockNum - 6; 
      }

      // -------------------------------
      // 1. UPDATE LATEST BLOCKS (UI Feed)
      // -------------------------------
      const displayRange = 6;
      const displayPromises = Array.from({length: displayRange}, (_, i) => provider.getBlock(currentBlockNum - i, false));
      const fetchedBlocks = (await Promise.all(displayPromises)).filter(b => b);
      setBlocks(fetchedBlocks);

      // -------------------------------
      // 2. FILL THE TRANSACTION LIST
      // -------------------------------
      
      let incomingHashes = [];

      // STEP A: Pehle Latest blocks check karo (New Data)
      for (const block of fetchedBlocks) {
          if (block.transactions?.length > 0) {
              const hashes = block.transactions.map(t => (typeof t === 'string' ? t : t.hash));
              incomingHashes = [...incomingHashes, ...hashes];
          }
      }

      // STEP B: Ab check karo ki kya humare paas enough Transactions hain?
      // Agar list choti hai (< 15 items), toh HISTORY se aur data nikalo
      
      // Hum current state check nahi kar sakte easily inside async without ref, 
      // so we assume we need more if incoming is low.
      
      let needMoreData = true; // Flag to decide if we dig history
      
      // Agar latest blocks mein hi bhar ke tx mil gaye, to history mat khodo
      if (incomingHashes.length > 5) {
          needMoreData = false; 
          // Reset pointer slightly to stay near head
          historyPointer.current = currentBlockNum - 10;
      }

      if (needMoreData) {
          console.log(`Need more data. Digging history from block ${historyPointer.current}...`);
          
          // Hum 10 blocks ka chunk uthayenge history se
          const chunkStats = 10;
          const historyPromises = [];
          
          for (let i = 0; i < chunkStats; i++) {
              // Ensure hum 0 se neeche na jaye
              const targetBlock = historyPointer.current - i;
              if (targetBlock > 0) {
                  historyPromises.push(provider.getBlock(targetBlock, false));
              }
          }

          // Blocks fetch karo
          const historyBlocks = (await Promise.all(historyPromises)).filter(b => b);
          
          // Pointer ko update karo taaki agli baar iske aur piche se shuru kare
          historyPointer.current = historyPointer.current - chunkStats;

          // History blocks se hashes nikalo
          for (const block of historyBlocks) {
              if (block.transactions?.length > 0) {
                  const hashes = block.transactions.map(t => (typeof t === 'string' ? t : t.hash));
                  incomingHashes = [...incomingHashes, ...hashes];
              }
          }
      }

      // -------------------------------
      // 3. FETCH DETAILS & UPDATE STATE
      // -------------------------------
      
      // Duplicates hatao before fetching
      const uniqueHashesToFetch = [...new Set(incomingHashes)].filter(h => !processedHashes.current.has(h));
      
      if (uniqueHashesToFetch.length > 0) {
          console.log(`Fetching details for ${uniqueHashesToFetch.length} new transactions...`);
          
          const txDetailsPromises = uniqueHashesToFetch.map(hash => provider.getTransaction(hash));
          const resolvedTxs = await Promise.all(txDetailsPromises);
          const validTxs = resolvedTxs.filter(t => t !== null);

          // State update
          setTxs(prev => {
              // Add new valid txs
              const combined = [...validTxs, ...prev];
              
              // Add to processed set
              validTxs.forEach(t => processedHashes.current.add(t.hash));

              // Sort by Block Number (Newest Top) & Keep max 30
              return combined.sort((a, b) => (b.blockNumber || 0) - (a.blockNumber || 0)).slice(0, 30);
          });
      } else {
          console.log("No new unique transactions found in this pass.");
      }

    } catch(e) { console.error("Sync Error", e); } 
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchData();
    // Fast refresh (5s) taaki jaldi bhar jaye list
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] pb-10">
      <Navbar />
      
      <main className="max-w-[1600px] mx-auto px-4 md:px-6 mt-8">
        
        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <StatCard icon={<Server size={20}/>} label="HEIGHT" value={`#${stats.blockNumber}`} />
            <StatCard icon={<Zap size={20}/>} label="GAS" value={`${formatGas(stats.gasPrice)} Gwei`} />
            <StatCard icon={<Globe size={20}/>} label="CHAIN ID" value={stats.chainId} />
            <StatCard icon={<Cpu size={20}/>} label="TPS" value={txs.length > 0 ? "LIVE" : "WAITING"} color={txs.length > 0 ? "text-neon" : "text-yellow-500"} />
        </div>

        {/* FEED */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* LATEST BLOCKS */}
            <div className="terminal-card">
                <div className="bg-[#111] p-3 border-b border-[#222] flex justify-between">
                    <h3 className="text-neon font-bold text-xs font-mono flex items-center gap-2">
                        <Box size={14}/> LATEST BLOCKS
                    </h3>
                </div>
                <div className="divide-y divide-[#1a1a1a]">
                    {loading && blocks.length === 0 ? <Loading/> : blocks.map(b => (
                        <div key={b.number} className="p-4 flex justify-between items-center hover:bg-[#0f0f0f] transition group">
                            <div className="flex items-center gap-4">
                                <div className="text-gray-500 font-mono text-[10px] group-hover:text-neon transition">
                                    [BK]
                                </div>
                                <div>
                                    <Link href={`/block/${b.number}`} className="text-white font-mono text-sm hover:text-neon hover:underline decoration-dashed">
                                        BLOCK #{b.number}
                                    </Link>
                                    <p className="text-[10px] text-gray-500 font-mono">{(Date.now()/1000 - b.timestamp).toFixed(0)}s ago</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className={`text-[10px] font-mono px-2 py-1 rounded border border-[#222] ${b.transactions.length > 0 ? 'text-neon bg-neon/5' : 'text-gray-600'}`}>
                                    {b.transactions.length} txns
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-2 text-center border-t border-[#222]">
                    <button className="text-[10px] text-gray-500 hover:text-neon font-mono uppercase">View All Blocks {'>'}</button>
                </div>
            </div>

            {/* TRANSACTIONS */}
            <div className="terminal-card">
                <div className="bg-[#111] p-3 border-b border-[#222] flex justify-between items-center">
                    <h3 className="text-neon font-bold text-xs font-mono flex items-center gap-2">
                        <Radio size={14}/> LIVE TRANSACTIONS
                    </h3>
                    {/* Status Indicator */}
                    <div className="flex items-center gap-2">
                         {txs.length < 15 && (
                             <span className="flex items-center gap-1 text-[9px] text-yellow-500 font-mono animate-pulse">
                                 <Loader2 size={10} className="animate-spin"/> FILLING DATA...
                             </span>
                         )}
                         <span className="text-[10px] text-gray-600 font-mono">
                            {txs.length} SHOWN
                        </span>
                    </div>
                </div>
                <div className="divide-y divide-[#1a1a1a]">
                    {loading && txs.length === 0 ? <Loading/> : txs.map(tx => (
                        <div key={tx.hash} className="p-4 flex flex-col gap-1 hover:bg-[#0f0f0f] transition">
                            <div className="flex items-center gap-2">
                                <span className="text-neon font-mono text-[10px]">{'>'}</span>
                                <Link href={`/tx/${tx.hash}`} className="text-neon font-mono text-xs truncate w-full hover:underline decoration-dashed">
                                    {tx.hash}
                                </Link>
                            </div>
                            <div className="flex justify-between pl-4 mt-1">
                                <span className="text-[10px] text-gray-500 font-mono">F: {shortAddress(tx.from)}</span>
                                <span className="text-[10px] text-gray-500 font-mono">T: {shortAddress(tx.to)}</span>
                            </div>
                        </div>
                    ))}
                    {!loading && txs.length === 0 && (
                        <div className="p-10 text-center text-gray-600 font-mono text-xs">
                            <Database size={24} className="mx-auto mb-2 opacity-20"/>
                            SEARCHING HISTORY...
                        </div>
                    )}
                </div>
            </div>

        </div>
      </main>
    </div>
  );
}

const StatCard = ({icon, label, value, color}) => (
    <div className="terminal-card p-5 flex items-center gap-4 hover:border-neon transition bg-[#0a0a0a]">
        <div className={`p-3 bg-[#111] border border-[#333] text-gray-400`}>{icon}</div>
        <div>
            <p className="text-[10px] text-gray-500 font-bold font-mono uppercase">{label}</p>
            <p className={`text-xl font-bold font-mono ${color || 'text-white'}`}>{value}</p>
        </div>
    </div>
);

const Loading = () => <div className="p-6 text-center text-neon font-mono text-xs animate-pulse">_SYNCING...</div>;