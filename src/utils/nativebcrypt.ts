import { registerPlugin } from '@capacitor/core';

export interface NativeBcryptPlugin {
    hashPassword(options: { password: string; salt: string }): Promise<{ hash: string }>;
}

const NativeBcrypt = registerPlugin<NativeBcryptPlugin>('NativeBcrypt');

export default NativeBcrypt;