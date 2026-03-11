import { PrivateKey } from '@provablehq/sdk';

async function main() {
    try {
        const pk = new PrivateKey();
        const address = pk.to_address();
        
        // u64 value
        const u64Val = 1000000n;
        
        // Try bytes as Little Endian 8 bytes
        const bytes = new Uint8Array(8);
        const view = new DataView(bytes.buffer);
        view.setBigUint64(0, u64Val, true);
        
        console.log("u64Bytes:", bytes);
        
        const sigBytes = pk.sign(bytes);
        
        console.log("leo run run_test " + address.to_string() + " " + u64Val.toString() + "u64 " + sigBytes.to_string());
        
        // Also try pk.signValue
        const sigValue = pk.signValue(u64Val.toString() + "u64");
         console.log("leo run run_test " + address.to_string() + " " + u64Val.toString() + "u64 " + sigValue.to_string());
        
    } catch (e) {
        console.error(e);
    }
}
main();
