import { PrivateKey, Address, Field } from '@provablehq/sdk';

async function main() {
    try {
        const pk = new PrivateKey();
        const address = pk.to_address();
        
        // Let's explore exactly what happens to an Address
        const addrBits = address.toBitsLe();
        console.log("Address toBitsLe length:", addrBits.length);
        
        // What about a Field?
        const field = Field.fromString("12345field");
        console.log("Field toBitsLe length:", field.toBitsLe().length);
        
        // If we sign bytes, SnarkVM might be expecting bits.
        // What if we sign the message using the actual snarkVM-like method?
        // Wait, does the Provable SDK have a built-in function to sign an Address or Field natively?
        if (typeof pk.signValue === 'function') {
            const sig = pk.signValue(address.to_string());
            console.log("leo run run_test " + address.to_string() + " " + address.to_string() + " " + sig.to_string());
        }
    } catch (e) {
        console.error(e);
    }
}
main();
