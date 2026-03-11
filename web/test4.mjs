import { PrivateKey, Address } from '@provablehq/sdk';

async function main() {
    try {
        const pk = new PrivateKey();
        const address = pk.to_address();
        
        // This simulates v17 where adminAddressToSign is a string "aleo1..."
        const adminAddressToSign = address.to_string();
        const addrObj = Address.from_string(adminAddressToSign);
        
        // Now get the bytes and sign
        const bytesToSign = addrObj.toBytesLe();
        const sig = pk.sign(bytesToSign);
        
        console.log(`leo run run_test ${address.to_string()} ${adminAddressToSign} ${sig.to_string()}`);
    } catch (e) {
        console.error(e);
    }
}
main();
