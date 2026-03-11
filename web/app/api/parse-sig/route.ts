import { NextRequest, NextResponse } from 'next/server';


export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { bytes } = body;
        
        // Convert array of numbers back to Uint8Array
        const uint8Array = new Uint8Array(bytes);
        
        // The Aleo Wallet adapter returns the signature as a Uint8Array of ASCII characters.
        // For example, [115, 105, 103, 110, 49, ...] = "sign1..."
        // We can simply decode this directly using TextDecoder instead of using the SDK to parse raw bytes.
        const decoder = new TextDecoder('utf-8');
        const signatureStr = decoder.decode(uint8Array);
        
        if (!signatureStr.startsWith('sign1')) {
             throw new Error("Decoded string does not start with 'sign1'. Raw bytes may not be ASCII.");
        }
        
        return NextResponse.json({ signature: signatureStr });
    } catch (e: any) {
        console.error("FATAL SIGNATURE PARSE ERROR:", e);
        return NextResponse.json({ error: e.message || "Unknown error" }, { status: 400 });
    }
}
