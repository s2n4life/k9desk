declare module 'next-pwa' {
    import { NextConfig } from 'next';

    interface PWAConfig {
        dest?: string;
        disable?: boolean;
        register?: boolean;
        scope?: string;
        sw?: string;
        skipWaiting?: boolean;
        runtimeCaching?: any[];
        publicExcludes?: string[];
        buildExcludes?: string[];
        cacheOnFrontEndNav?: boolean;
        reloadOnOnline?: boolean;
        customWorkerDir?: string;
        subdomainPrefix?: string;
    }

    function withPWA(config: PWAConfig): (nextConfig: NextConfig) => NextConfig;

    export default withPWA;
}
