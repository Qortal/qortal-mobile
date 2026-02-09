import { registerPlugin } from '@capacitor/core';

export interface NetworkInfoPlugin {
  getLocalIpAddress(): Promise<{ success: boolean; ipAddress?: string; error?: string }>;
}

const NetworkInfo = registerPlugin<NetworkInfoPlugin>('NetworkInfo');

export { NetworkInfo };

