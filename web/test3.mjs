import { PrivateKey, Field } from '@provablehq/sdk';

async function main() {
    try {
        const pk = new PrivateKey();
        const address = pk.to_address();
        
        // Let's use 12345field
        const myStr = "12345field";
        const myField = Field.fromString(myStr);
        
        // Now get the bytes and sign
        const bytesToSign = myField.toBytesLe();
        const sig = pk.sign(bytesToSign);
        
        console.log(`leo execute run_test ${address.to_string()} ${myStr} ${sig.to_string()}`);
        console.log("Execute this from the test_sig directory.");
    } catch (e) {
        console.error(e);
    }
}
main();
