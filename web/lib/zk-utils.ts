import { Transaction, WalletAdapterNetwork } from '@demox-labs/aleo-wallet-adapter-base';

export const NETWORK_URL = 'https://api.explorer.provable.com/v1';
export const PROGRAM_ID = 'baba_zk_payroll_v3.aleo'; // Replace with deployed ID

export async function fetchMappingValue(mappingName: string, key: string): Promise<string | null> {
    try {
        const url = `${NETWORK_URL}/testnet/program/${PROGRAM_ID}/mapping/${mappingName}/${key}`;
        const response = await fetch(url);
        if (!response.ok) return null;
        const data = await response.json();
        return data;
    } catch (e) {
        console.error(`Error fetching mapping ${mappingName}:`, e);
        return null;
    }
}

export async function requestTransaction(
    walletAdapter: any, // Typed correctly in real usage
    publicKey: string,
    programId: string,
    functionName: string,
    inputs: any[],
    fee: number
) {
    if (!walletAdapter.connected) throw new Error("Wallet not connected");

    // Create standard AleoTransaction object using the adapter's base library
    const transaction = Transaction.createTransaction(
        publicKey,
        WalletAdapterNetwork.Testnet, // This typically resolves to 'testnet3' or similar internally
        programId,
        functionName,
        inputs,
        fee,
        false // feePrivate
    );

    // Override chainId if needed, but createTransaction should handle structure
    // verifying that the object has 'transitions' array which adapter likely expects
    // instead of 'inputs' at top level.

    // Explicitly casting or modifying if necessary for specific network string
    if (transaction.chainId !== 'testnetbeta') {
        transaction.chainId = 'testnetbeta';
    }

    console.log("Requesting transaction:", JSON.stringify(transaction, null, 2));

    return await walletAdapter.requestTransaction(transaction);
}
