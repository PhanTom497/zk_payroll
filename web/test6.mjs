import { PrivateKey, Address } from '@provablehq/sdk';

async function main() {
    try {
        const pk = new PrivateKey();
        const address = pk.to_address();
        
        const addrStr = address.to_string();
        const sigValue = pk.signValue(addrStr);
        console.log("signValue signature:", sigValue.to_string());
        
        // Let's try to reproduce it with pk.sign()
        // Try exactly Address.toBytesLe()
        const bytes = address.toBytesLe();
        const sigBytes = pk.sign(bytes);
        console.log("signBytes signature:", sigBytes.to_string());
        console.log("Are they equal?", sigValue.to_string() === sigBytes.to_string());
        
        // Try converting bits to bytes
        const bits = address.toBitsLe();
        // Pack 253 bits into 32 bytes
        const packedBytes = new Uint8Array(32);
        for (let i = 0; i < bits.length; i++) {
            if (bits[i]) {
                packedBytes[Math.floor(i / 8)] |= (1 << (i % 8));
            }
        }
        const sigPacked = pk.sign(packedBytes);
        console.log("signPacked signature:", sigPacked.to_string());
        console.log("Are they equal?", sigValue.to_string() === sigPacked.to_string());

    } catch (e) {
        console.error(e);
    }
}
main();
