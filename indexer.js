const { ethers } = require("ethers");
const mongoose = require("mongoose");

// CONFIG
const RPC_URL = "https://api-stable-mainnet.n.dwellir.com/500b86ab-9b75-4df0-ba58-b8f60e8ad4f9/";
const MONGO_URI = "mongodb+srv://<USER>:<PASS>@cluster0.mongodb.net/flowstable?retryWrites=true&w=majority";

// SCHEMA
const txSchema = new mongoose.Schema({
    hash: { type: String, unique: true },
    block: Number,
    from: { type: String, index: true },
    to: { type: String, index: true },
    value: String,
    timestamp: Number,
    method: String,
    isNative: Boolean
});
const Tx = mongoose.model('Tx', txSchema);
const State = mongoose.model('State', new mongoose.Schema({ key: String, val: Number }));

const provider = new ethers.JsonRpcProvider(RPC_URL);

async function start() {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Indexer Started. Reverse Scanning...");

    let latest = await provider.getBlockNumber();
    let state = await State.findOne({ key: 'lastScanned' });
    let currentBlock = state ? state.val : latest;

    while (currentBlock >= 0) {
        try {
            // console.log(`Scanning Block ${currentBlock}...`);
            const block = await provider.getBlock(currentBlock, true);
            
            if (block && block.transactions.length > 0) {
                const bulkOps = [];
                for (const tx of block.transactions) {
                    let t = typeof tx === 'string' ? null : tx;
                    if(!t) continue;

                    bulkOps.push({
                        updateOne: {
                            filter: { hash: t.hash },
                            update: { $set: {
                                hash: t.hash, block: block.number, from: t.from.toLowerCase(), to: t.to ? t.to.toLowerCase() : null, value: ethers.formatEther(t.value), timestamp: block.timestamp, isNative: true
                            }},
                            upsert: true
                        }
                    });
                }
                if (bulkOps.length > 0) {
                    await Tx.bulkWrite(bulkOps);
                    console.log(`💾 Saved ${bulkOps.length} Txs from Block ${currentBlock}`);
                }
            }
            
            await State.findOneAndUpdate({ key: 'lastScanned' }, { val: currentBlock - 1 }, { upsert: true });
            currentBlock--;
        } catch (e) { console.error("Error:", e.message); }
    }
}
start();