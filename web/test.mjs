import { PrivateKey, Signature, Field, Address } from '@provablehq/sdk';

async function main() {
    try {
        console.log("SDK loaded!");
        const pk = new PrivateKey();
        const address = pk.to_address();
        console.log("Address:", address.to_string());

        const paymentIdStr = "12345field";
        const paymentIdField = Field.fromString(paymentIdStr);
        const fieldBytes = paymentIdField.toBytesLe();
        const sigFieldBytes = pk.sign(fieldBytes);
        console.log("Field toBytesLe length:", fieldBytes.length);
        console.log("Signature verifies Field Bytes directly:", sigFieldBytes.verify(address, fieldBytes));

        // Let's verify what happens when we use TextEncoder!
        const utf8Bytes = new TextEncoder().encode(paymentIdStr);
        const sigUTF8 = pk.sign(utf8Bytes);
        console.log("Signature verifies UTF8 bytes directly:", sigUTF8.verify(address, utf8Bytes));

        const addressUtf8Bytes = new TextEncoder().encode(address.to_string());
        console.log("Address text UTF8 length:", addressUtf8Bytes.length);
        
        const sigAddress = pk.sign(addressUtf8Bytes);
        console.log("Signature verifies Address UTF8 bytes:", sigAddress.verify(address, addressUtf8Bytes));

        const addressNativeBytes = address.toBytesLe();
        console.log("Address toBytesLe length:", addressNativeBytes.length);
        const sigNative = pk.sign(addressNativeBytes);
        console.log("Signature verifies Native bytes:", sigNative.verify(address, addressNativeBytes));
    } catch (e) {
        console.error("Error executing:", e);
    }
}
main();
