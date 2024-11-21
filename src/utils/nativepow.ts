import { registerPlugin } from '@capacitor/core';

export interface NativePOWPlugin {
    computeProofOfWork(options: { chatBytes: string; difficulty: number }): Promise<{ nonce: string }>;
}

const NativePOW = registerPlugin<NativePOWPlugin>('NativePOW');

export default NativePOW