import { PrivateKey, Signature, Field } from '@provablehq/sdk';

async function main() {
    try {
        const pk = new PrivateKey();
        const address = pk.to_address();
        
        // We want to sign a beautiful human-readable string:
        const readableStr = "Payment 12345                  "; // Exactly 31 chars
        console.log("String length:", readableStr.length);
        
        const utf8Bytes = new TextEncoder().encode(readableStr);
        console.log("UTF8 Byte Length:", utf8Bytes.length); // 32
        
        // Let's create a BigInt from these bytes (Little Endian!)
        let val = 0n;
        for (let i = 0; i < 32; i++) {
            const byte = utf8Bytes[i] ?? 0;
            val += BigInt(byte) << BigInt(8 * i);
        }
        
        console.log("BigInt value:", val.toString());
        // Can we make a field out of this?
        const myField = Field.fromString(val.toString() + "field");
        console.log("Field bytes Le length:", myField.toBytesLe().length);
        
        let match = true;
        const fieldBytes = myField.toBytesLe();
        const paddedBytes = new Uint8Array(32);
        for(let i=0; i<32; i++){
            paddedBytes[i] = utf8Bytes[i] ?? 0;
            if (fieldBytes[i] !== paddedBytes[i]) {
                match = false;
                console.log(`Mismatch at ${i}: expected ${paddedBytes[i]} but got ${fieldBytes[i]}`);
            }
        }
        console.log("Matches exactly?", match);
        
        const sig = pk.sign(paddedBytes);
        console.log("Signature verifies?", sig.verify(address, fieldBytes));
        
    } catch (e) {
        console.error(e);
    }
}
main();
