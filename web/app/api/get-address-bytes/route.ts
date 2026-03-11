import { NextResponse } from 'next/server';
import { Address } from '@provablehq/sdk';

export async function POST(req: Request) {
    try {
        const { address } = await req.json();

        if (!address || typeof address !== 'string') {
            return NextResponse.json(
                { error: 'Valid Aleo Address string is required' },
                { status: 400 }
            );
        }

        const addrObj = Address.from_string(address);
        const bytesLe = addrObj.toBytesLe();

        return NextResponse.json({
            bytes: Array.from(bytesLe),
        });

    } catch (error: any) {
        console.error('Error generating address bytes:', error);
        return NextResponse.json(
            { error: 'Failed to generate bytes', details: error.message },
            { status: 500 }
        );
    }
}
