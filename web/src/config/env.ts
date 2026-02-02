/**
 * Environment Configuration (Web Application)
 * This is now a wrapper that re-exports from the shared configuration
 * 
 * @deprecated Use the unified config from '../../../sdk/shared/config' directly
 */

// Re-export everything from the shared configuration
export * from '../../../sdk/shared/config';

// For backward compatibility, also export with the old function name
import { envConfig as sharedEnvConfig } from '../../../sdk/shared/config';
export const envConfig = sharedEnvConfig;