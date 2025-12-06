"use client";
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { provider, formatGas, decodeInputData, parseEventLog } from '@/lib/utils';
import { ethers } from 'ethers';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { 
    CheckCircle, XCircle, ArrowRight, Database, Terminal, 
    Layers, Code, RefreshCw, AlertTriangle, Clock, Box, Cpu 
} from 'lucide-react';

export default function TxPage() {
  const { hash } = useParams();
  
  // STATE
  const [data, setData] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState('_INITIALIZING_UPLINK...');
  const [activeTab, setActiveTab] = useState('Overview');
  const [error, setError] = useState(false);

  useEffect(() => {
    if(!hash) return;

    const fetchTxData = async () => {
      try {
        setError(false);
        setLoadingStatus('_QUERYING_MEMPOOL_&_CHAIN...');

        // --- STEP 1: FETCH TRANSACTION (FAST) ---
        // Retry logic wrapper
        const getTxWithRetry = async () => {
            let tries = 0;
            while(tries < 5) {
                try {
                    const t = await provider.getTransaction(hash);
                    if(t) return t;
                } catch(e){}
                await new Promise(r => setTimeout(r, 800)); // 800ms delay
                tries++;
            }
            return null;
        };

        const tx = await getTxWithRetry();

        if (!tx) {
            setLoadingStatus('_ERROR: TX_HASH_NOT_FOUND');
            setError(true);
            return;
        }

        // --- STEP 2: SMART RECEIPT FETCH ---
        let receipt = null;
        
        // Agar Tx ka Block Number null hai, matlab wo Pending hai.
        // Receipt dhoondne ka koi fayda nahi, time waste mat karo.
        if (tx.blockNumber === null) {
            console.log("Tx is Pending, skipping receipt fetch");
            receipt = null; 
        } else {
            // Agar Mined hai, to Receipt honi chahiye. Retry karke lao.
            let tries = 0;
            while(!receipt && tries < 5) {
                try { receipt = await provider.getTransactionReceipt(hash); } catch(e){}
                if(!receipt) await new Promise(r => setTimeout(r, 800));
                tries++;
            }
        }

        setData({ tx, receipt });

      } catch (e) {
        console.error("Critical Failure:", e);
        setLoadingStatus('_SYSTEM_CRITICAL_FAILURE');
        setError(true);
      }
    };

    fetchTxData();
  }, [hash]);

  // --- LOADING SCREEN ---
  if(!data) return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-neon font-mono gap-6">
      {error ? (
          <>
            <AlertTriangle size={48} className="text-red-500 animate-pulse"/>
            <div className="text-red-500 text-lg tracking-widest">{loadingStatus}</div>
            <div className="text-gray-500 text-xs font-mono">
                Verify the transaction hash on the FlowStable network.
            </div>
            <Link href="/" className="px-6 py-2 border border-[#333] hover:border-neon hover:text-white hover:bg-[#111] transition text-sm">
                RETURN_ROOT
            </Link>
          </>
      ) : (
          <>
            <div className="relative">
                <div className="absolute inset-0 bg-neon blur-xl opacity-20 animate-pulse"></div>
                <RefreshCw size={48} className="animate-spin relative z-10"/>
            </div>
            <div className="animate-pulse tracking-widest">{loadingStatus}</div>
          </>
      )}
    </div>
  );

  const { tx, receipt } = data;
  
  // --- DATA PROCESSING ---
  const method = decodeInputData ? decodeInputData(tx.data) : { method: 'Unknown', raw: tx.data };
  const gasUsed = receipt ? receipt.gasUsed : 0n;
  const effectiveGasPrice = receipt ? receipt.gasPrice : tx.gasPrice;
  const fee = ethers.formatEther(gasUsed * (effectiveGasPrice || 0n));
  
  // Logic: Agar receipt nahi hai -> Pending. Agar receipt status 1 -> Success. 0 -> Fail.
  const isPending = !receipt;
  const success = receipt?.status === 1;

  return (
    <div className="min-h-screen bg-[#050505] pb-20">
      <Navbar />
      <main className="max-w-[1600px] mx-auto px-6 pt-10">
        
        {/* TOP HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 border-b border-[#222] pb-8 gap-6">
            <div>
                <h2 className="text-3xl font-bold text-white font-mono mb-3 flex items-center gap-3">
                    <Terminal className="text-neon" size={28}/> TRANSACTION DETAILS
                </h2>
                <div className="flex flex-wrap items-center gap-4">
                    {isPending ? (
                        <span className="px-4 py-1 text-xs font-mono font-bold border border-yellow-600 text-yellow-500 bg-yellow-900/10 animate-pulse flex items-center gap-2">
                            <Clock size={12}/> PENDING_CONFIRMATION
                        </span>
                    ) : (
                        <span className={`px-4 py-1 text-xs font-mono font-bold border flex items-center gap-2 ${success ? 'border-green-500 text-green-400 bg-green-900/10' : 'border-red-500 text-red-400 bg-red-900/10'}`}>
                            {success ? <CheckCircle size={12}/> : <XCircle size={12}/>}
                            {success ? 'EXECUTION_SUCCESS' : 'EXECUTION_REVERTED'}
                        </span>
                    )}
                    <span className="text-gray-500 text-xs font-mono break-all bg-[#0a0a0a] px-3 py-1 border border-[#222]">
                        {hash}
                    </span>
                </div>
            </div>
        </div>

        <div className="terminal-card min-h-[600px]">
            {/* TABS HEADER */}
            <div className="flex bg-[#0f0f0f] border-b border-[#222] overflow-x-auto">
                {['Overview', 'Logs', 'Hex_Data'].map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)} 
                        className={`px-8 py-4 text-xs font-mono font-bold uppercase tracking-widest hover:bg-[#1a1a1a] transition whitespace-nowrap border-b-2 ${activeTab === tab ? 'text-neon border-neon bg-[#00ff9d]/5' : 'text-gray-500 border-transparent'}`}>
                        {tab.replace('_', ' ')}
                    </button>
                ))}
            </div>

            <div className="p-6 md:p-10">
                
                {/* --- TAB: OVERVIEW --- */}
                {activeTab === 'Overview' && (
                    <div className="space-y-1">
                        <Row label="BLOCK HEIGHT" value={
                            receipt ? <Link href={`/block/${receipt.blockNumber}`} className="text-neon hover:underline flex items-center gap-2"><Box size={14}/> #{receipt.blockNumber}</Link> 
                            : <span className="text-yellow-500 animate-pulse">WAITING_FOR_MINER...</span>
                        } />
                        
                        <Row label="TIMESTAMP" value={receipt ? "Confirmed" : "Pending Pool"} />
                        
                        <Row label="METHOD ID" value={
                            <span className="bg-[#222] text-gray-300 px-3 py-1 text-[10px] border border-[#444] rounded uppercase tracking-wider font-bold">
                                {method.method}
                            </span>
                        } />
                        
                        <div className="border-b border-[#222] my-6"></div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 py-6 px-2 hover:bg-[#0f0f0f] transition rounded">
                            <span className="text-gray-500 text-xs font-mono font-bold uppercase flex items-center gap-2">
                                <Layers size={14}/> INTERACTION
                            </span>
                            <div className="md:col-span-3 flex flex-col md:flex-row md:items-center gap-6">
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-gray-600 mb-1">FROM</span>
                                    <Link href={`/address/${tx.from}`} className="text-neon font-mono text-sm hover:underline break-all">{tx.from}</Link>
                                </div>
                                <div className="hidden md:flex text-gray-600"><ArrowRight size={20}/></div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-gray-600 mb-1">TO</span>
                                    <Link href={`/address/${tx.to}`} className="text-neon font-mono text-sm hover:underline break-all">{tx.to || '[CONTRACT_CREATION_EVENT]'}</Link>
                                </div>
                            </div>
                        </div>

                        <div className="border-b border-[#222] my-6"></div>

                        <Row label="VALUE" value={<span className="text-white font-bold">{ethers.formatEther(tx.value)} GUSDT</span>} />
                        <Row label="TX FEE" value={<span className="text-gray-400">{isPending ? "Calculating..." : `${fee} GUSDT`}</span>} />
                        <Row label="GAS PRICE" value={`${formatGas(tx.gasPrice)} Gwei`} />
                        <Row label="GAS USED" value={receipt ? `${receipt.gasUsed.toString()} Units` : "Pending"} />
                        <Row label="NONCE" value={tx.nonce} />
                    </div>
                )}

                {/* --- TAB: LOGS --- */}
                {activeTab === 'Logs' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-white font-mono text-sm font-bold">EVENT LOGS ({receipt?.logs.length || 0})</h3>
                        </div>
                        
                        {receipt?.logs.map((log, i) => {
                            let parsed = { name: 'Unknown Event', isStandard: false };
                            try { parsed = parseEventLog ? parseEventLog(log) : parsed; } catch(e){}

                            return (
                                <div key={i} className="bg-[#080808] border border-[#222] p-6 relative overflow-hidden group hover:border-neon transition">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#222] group-hover:bg-neon transition"></div>
                                    
                                    <div className="flex justify-between mb-4 pl-4 flex-wrap gap-2 items-center">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs bg-neon text-black px-2 py-1 font-bold font-mono rounded-sm">#{log.index}</span>
                                            <span className="text-sm text-white font-mono uppercase tracking-wider">{parsed.name}</span>
                                        </div>
                                        <div className="text-[10px] text-gray-500 font-mono">
                                            CONTRACT: <Link href={`/address/${log.address}`} className="text-blue-400 hover:underline">{log.address}</Link>
                                        </div>
                                    </div>

                                    <div className="pl-4 space-y-3">
                                        {log.topics.map((t, idx) => (
                                            <div key={idx} className="flex gap-4 text-[10px] font-mono break-all items-center">
                                                <span className="text-gray-600 min-w-[60px]">[TOPIC {idx}]</span>
                                                <span className="text-gray-400 bg-[#111] px-2 py-1 rounded border border-[#333] w-full">{t}</span>
                                            </div>
                                        ))}
                                        <div className="mt-2 pt-2 border-t border-[#222]">
                                            <div className="text-[10px] text-gray-600 mb-1">DATA</div>
                                            <div className="text-[10px] font-mono text-gray-500 break-all bg-[#0a0a0a] p-3 border border-[#222] max-h-32 overflow-auto custom-scrollbar">
                                                {log.data}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                        {(!receipt || receipt.logs.length === 0) && (
                            <div className="text-gray-500 font-mono text-center py-24 border border-[#222] border-dashed rounded">
                                [ NO_EVENTS_EMITTED_IN_EXECUTION ]
                            </div>
                        )}
                    </div>
                )}

                {/* --- TAB: HEX DATA --- */}
                {activeTab === 'Hex_Data' && (
                    <div className="space-y-6 h-full">
                         <div className="flex justify-between items-center border-b border-[#222] pb-4">
                            <span className="text-gray-500 text-xs font-mono font-bold uppercase flex items-center gap-2">
                                <Database size={14} className="text-neon"/> RAW_INPUT_STREAM
                            </span>
                            <span className="text-xs text-gray-600 font-mono bg-[#111] px-2 py-1 rounded">SIZE: {tx.data.length} BYTES</span>
                         </div>
                         <textarea readOnly className="w-full h-96 bg-[#080808] border border-[#333] text-gray-400 p-6 text-xs font-mono focus:outline-none focus:border-neon resize-none selection:bg-neon selection:text-black leading-relaxed" value={tx.data}></textarea>
                    </div>
                )}
            </div>
        </div>
      </main>
    </div>
  );
}

const Row = ({label, value}) => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 py-4 border-b border-[#1a1a1a] last:border-0 hover:bg-[#0f0f0f] px-2 -mx-2 transition rounded-sm">
        <span className="text-gray-500 text-xs font-mono font-bold uppercase flex items-center tracking-wider">{label}</span>
        <div className="md:col-span-3 text-sm text-gray-300 font-mono break-all flex items-center gap-2">{value}</div>
    </div>
);