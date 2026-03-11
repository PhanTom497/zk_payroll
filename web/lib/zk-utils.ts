import { Network, TransactionOptions } from '@provablehq/aleo-types';

export const NETWORK_URL = 'https://api.explorer.provable.com/v1';
export const PROGRAM_ID = 'baba_zk_payroll_v19.aleo'; // Replace with deployed ID

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

export async function fetchBlockHeight(): Promise<number> {
    try {
        const response = await fetch(`${NETWORK_URL}/testnet/latest/height`, { cache: 'no-store' }); // Disable cache
        if (!response.ok) return 0;
        const height = await response.json();
        return height;
    } catch (e) {
        console.error("Error fetching height:", e);
        return 0;
    }
}

export async function requestTransaction(
    walletAdapter: any,
    publicKey: string,
    programId: string,
    functionName: string,
    inputs: any[],
    fee: number
) {
    if (!walletAdapter) throw new Error("Wallet adapter not found");

    const transaction: TransactionOptions = {
        program: programId,
        function: functionName,
        inputs: inputs,
        fee: fee,
        privateFee: false
    };

    console.log("Requesting transaction:", JSON.stringify(transaction, null, 2));

    // @provablehq adapter uses executeTransaction instead of requestTransaction
    if (walletAdapter.executeTransaction) {
        const result = await walletAdapter.executeTransaction(transaction);
        return result.transactionId;
    } else if (walletAdapter.requestTransaction) {
        // Fallback for older adapters or if naming differs, though executeTransaction is standard in provablehq
        return await walletAdapter.requestTransaction(transaction);
    } else {
        throw new Error("Wallet adapter does not support executeTransaction");
    }
}

export type BatchTransactionItem = {
    id: string;
    description: string;
    functionName: string;
    inputs: any[];
    fee: number;
}

export async function batchProcessTransactions(
    walletAdapter: any,
    publicKey: string,
    programId: string,
    items: BatchTransactionItem[],
    onProgress: (currentIndex: number, total: number, status: string) => void
): Promise<{ success: string[], failed: { id: string, error: string }[] }> {
    const success: string[] = [];
    const failed: { id: string, error: string }[] = [];

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        try {
            onProgress(i + 1, items.length, `Processing ${item.description}...`);

            const txId = await requestTransaction(
                walletAdapter,
                publicKey,
                programId,
                item.functionName,
                item.inputs,
                item.fee
            );

            success.push(txId);
            console.log(`Batch Item ${item.id} Success: ${txId}`);

            // Optional: Add a small delay between transactions to allow wallet UI to reset/breathe
            await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (e: any) {
            console.error(`Batch Item ${item.id} Failed:`, e);
            failed.push({ id: item.id, error: e.message || 'Unknown Error' });

            // If user rejected, we might want to stop? For now, we continue as per plan, 
            // but usually rejection means "stop all". 
            // We'll throw if it looks like a rejection to prevent spamming popups.
            if (e.message?.toLowerCase().includes("reject")) {
                throw new Error("Batch execution stopped by user rejection.");
            }
        }
    }

    return { success, failed };
}

/**
 * Safely extracts a field from a record, handling both 'data' objects and 'plaintext' strings.
 */
export function getRecordField(record: any, fieldName: string): string | undefined {
    // 1. Try accessing via .data (Demox/Leo Wallet style)
    if (record.data && record.data[fieldName] !== undefined) {
        return record.data[fieldName];
    }

    // 2. Try parsing plaintext (Shield/Provable style)
    // Shield Wallet uses 'recordPlaintext', others might use 'plaintext'
    const plaintext = record.plaintext || record.recordPlaintext;

    if (plaintext) {
        // Regex to match "fieldName: value" 
        // Handles cases including:
        // amount: 100u64.private
        // "amount": 100u64
        // amount: 100u64
        const regex = new RegExp(`['"]?${fieldName}['"]?\\s*:\\s*([\\w\\d\\.]+)`);
        const match = plaintext.match(regex);
        if (match && match[1]) {
            return match[1];
        }
    }

    return undefined;
}
