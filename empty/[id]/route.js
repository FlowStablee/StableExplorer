import dbConnect from '@/lib/db';
import Tx from '@/models/Tx';
import { NextResponse } from 'next/server';

export async function GET(req, { params }) {
    await dbConnect();
    const { id } = params;
    const addr = id.toLowerCase();

    try {
        // Find transactions where address is Sender OR Receiver
        const txs = await Tx.find({
            $or: [{ from: addr }, { to: addr }]
        })
        .sort({ block: -1 }) // Latest first
        .limit(100);         // Show top 100

        return NextResponse.json({ success: true, data: txs });
    } catch (e) {
        return NextResponse.json({ success: false, error: e.message });
    }
}