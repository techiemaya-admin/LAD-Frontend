"use client";

import { useEffect } from 'react';
import { loadingBus } from '@/lib/loading-bus';

/**
 * PageLoadingSentry
 * 
 * A headless component that triggers the global PageLoader when mounted.
 * Used inside next/dynamic loading fallbacks to ensure the premium loader
 * stays visible until the component is fully compiled and ready.
 */
export function PageLoadingSentry() {
    useEffect(() => {
        // Request the global loader to start
        // We use a 500ms minimum to ensure a smooth transition even on fast connections
        const hideAt = loadingBus.requestStart(500);

        return () => {
            // Once the component associated with this sentry unmounts 
            // (meaning the real component has loaded), signal end.
            loadingBus.requestEnd(hideAt);
        };
    }, []);

    return null;
}

export default PageLoadingSentry;
