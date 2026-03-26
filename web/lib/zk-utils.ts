import { Network, TransactionOptions } from '@provablehq/aleo-types';

export const NETWORK_URL = 'https://api.explorer.provable.com/v1';
export const PROGRAM_ID = 'baba_zk_payroll_v24.aleo'; // Replace with deployed ID

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

function walletErrorMessage(err: any): string {
    return String(err?.message || err || '')
}

export function isRetryableWalletError(err: any): boolean {
    const msg = walletErrorMessage(err).toLowerCase()
    if (!msg) return false
    return (
        msg.includes('no response') ||
        msg.includes('disconnected port') ||
        msg.includes('not connected') ||
        msg.includes('network changed') ||
        msg.includes('failed to fetch') ||
        msg.includes('internal json-rpc error') ||
        msg.includes('timeout')
    )
}

async function wait(ms: number) {
    await new Promise((resolve) => setTimeout(resolve, ms))
}

async function nextFrame() {
    await new Promise((resolve) => setTimeout(resolve, 0))
}

export async function requestWalletRecords(
    requestRecordsFn: ((program: string, decrypted: boolean) => Promise<any[]>) | undefined,
    programId: string,
    decrypted: boolean,
    walletAdapter?: any
): Promise<any[]> {
    const executeOnce = async (): Promise<any[]> => {
        await nextFrame()

        if (requestRecordsFn) {
            const result = await requestRecordsFn(programId, decrypted)
            if (!result) throw new Error('No response')
            return result
        }

        if (walletAdapter?.requestRecords) {
            const result = await walletAdapter.requestRecords(programId, decrypted)
            if (!result) throw new Error('No response')
            return result
        }

        throw new Error('Wallet does not support record requests')
    }

    let lastError: any = null
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            return await executeOnce()
        } catch (err: any) {
            lastError = err
            if (!isRetryableWalletError(err) || attempt === 3) {
                throw err
            }
            console.warn(`Transient wallet record-read error, retrying (${attempt}/3):`, err)
            await wait(250 * attempt)
        }
    }

    throw lastError || new Error('No response')
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

    const extractTxId = (result: any): string | null => {
        if (!result) return null;
        if (typeof result === 'string') return result;
        if (typeof result.transactionId === 'string') return result.transactionId;
        if (typeof result.transaction_id === 'string') return result.transaction_id;
        if (typeof result.id === 'string') return result.id;
        return null;
    };

    const executeOnce = async (): Promise<string> => {
        await nextFrame()

        const methods = [
            walletAdapter.executeTransaction
                ? async () => walletAdapter.executeTransaction(transaction)
                : null,
            walletAdapter.requestTransaction
                ? async () => walletAdapter.requestTransaction(transaction)
                : null,
        ].filter(Boolean) as Array<() => Promise<any>>

        if (!methods.length) {
            throw new Error("Wallet adapter does not support executeTransaction");
        }

        let lastError: any = null
        for (const method of methods) {
            try {
                const result = await method()
                const txId = extractTxId(result)
                if (!txId) throw new Error("No response")
                return txId
            } catch (err: any) {
                lastError = err
                if (!isRetryableWalletError(err)) {
                    throw err
                }
            }
        }

        throw lastError || new Error("No response");
    };

    let lastError: any = null
    for (let attempt = 1; attempt <= 4; attempt++) {
        try {
            return await executeOnce();
        } catch (err: any) {
            lastError = err
            if (!isRetryableWalletError(err) || attempt === 4) throw err;
            console.warn(`Transient wallet transaction error, retrying (${attempt}/4):`, err);
            await wait(350 * attempt);
        }
    }

    throw lastError || new Error("No response")
}

export async function waitForTransaction(txId: string): Promise<boolean> {
    // Aleo Testnet can sometimes take 2-5 minutes to finalize a block depending on network congestion
    const maxAttempts = 120; // Wait up to ~6 minutes (120 * 3 seconds)
    for (let i = 0; i < maxAttempts; i++) {
        try {
            const res = await fetch(`${NETWORK_URL}/testnet/transaction/${txId}`);
            if (res.ok) {
                const data = await res.json();
                if (data && data.type) {
                    console.log(`Transaction ${txId} confirmed in block ${data.transaction?.block_height || 'unknown'}!`);
                    return true;
                }
            }
        } catch (e) {
            // Silently swallow fetch errors during polling as the node might just be dropping connections
        }
        await new Promise(resolve => setTimeout(resolve, 3000));
    }
    return false;
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
