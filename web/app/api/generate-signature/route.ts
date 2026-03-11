import { NextResponse } from 'next/server';
import { PrivateKey } from '@provablehq/sdk';

export async function POST(req: Request) {
    try {
        const { privateKeyStr, valueStr } = await req.json();

        if (!privateKeyStr || !valueStr) {
            return NextResponse.json(
                { error: 'Valid Aleo Private Key and Value strong are required' },
                { status: 400 }
            );
        }

        const pk = PrivateKey.from_string(privateKeyStr);
        let sigStr;
        if (typeof pk.signValue === 'function') {
            const sig = pk.signValue(valueStr);
            sigStr = sig.to_string();
        } else {
            return NextResponse.json(
                { error: 'SDK does not support signValue' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            signature: sigStr,
        });

    } catch (error: any) {
        console.error('Error generating signature:', error);
        return NextResponse.json(
            { error: 'Failed to generate signature', details: error.message },
            { status: 500 }
        );
    }
}
