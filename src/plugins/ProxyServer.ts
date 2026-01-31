import { registerPlugin } from "@capacitor/core";

export interface ProxyServerPlugin {
  /**
   * Start the proxy server
   * @param options.port - Optional port number (0 or undefined for auto-assign)
   * @param options.targetHost - Target host to forward to (default: 'localhost')
   * @param options.targetPort - Target port to forward to (default: 12392)
   */
  startProxy(options?: {
    port?: number;
    targetHost?: string;
    targetPort?: number;
  }): Promise<{ success: boolean; port: number }>;

  /**
   * Stop the proxy server
   */
  stopProxy(): Promise<{ success: boolean }>;

  /**
   * Get current proxy server information
   */
  getProxyInfo(): Promise<{
    isRunning: boolean;
    port: number;
    targetHost: string;
    targetPort: number;
  }>;
}

const ProxyServer = registerPlugin<ProxyServerPlugin>("ProxyServer");

export { ProxyServer };
