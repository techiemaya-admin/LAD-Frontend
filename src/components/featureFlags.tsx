interface FeatureFlag {
  enabled: boolean;
  description: string;
  environments: {
    development: boolean;
    staging: boolean;
    production: boolean;
  };
  user_groups: string[];
  rollout_percentage: number;
}
interface FeatureFlags {
  features: Record<string, FeatureFlag>;
  metadata: {
    last_updated: string;
    version: string;
  };
}
type Environment = 'development' | 'staging' | 'production';
type UserGroup = 'admin' | 'sales' | 'premium' | 'basic';
class FeatureFlagsService {
  private flags: Record<string, FeatureFlag> = {};
  private environment: Environment;
  constructor() {
    this.environment = this.getEnvironment();
    this.loadFlags();
  }
  private getEnvironment(): Environment {
    const env = process.env.NODE_ENV || 'development';
    return env as Environment;
  }
  private async loadFlags(): Promise<void> {
    try {
      // In a real app, this would fetch from your backend API
      const response = await fetch('/api/feature-flags');
      const config: FeatureFlags = await response.json();
      this.flags = config.features;
    } catch (error) {
      console.warn('Failed to load feature flags:', error);
      // Fallback to local config if available
      this.loadLocalFlags();
    }
  }
  private loadLocalFlags(): void {
    // Fallback local configuration
    this.flags = {
      apollo_leads: {
        enabled: true,
        description: "Apollo.io lead generation",
        environments: { development: true, staging: true, production: true },
        user_groups: ['admin', 'sales', 'premium'],
        rollout_percentage: 100
      },
      voice_agent: {
        enabled: true,
        description: "AI voice agent",
        environments: { development: true, staging: true, production: true },
        user_groups: ['admin', 'sales'],
        rollout_percentage: 80
      },
      linkedin_integration: {
        enabled: false,
        description: "LinkedIn integration",
        environments: { development: true, staging: true, production: false },
        user_groups: ['admin'],
        rollout_percentage: 30
      },
      stripe_payments: {
        enabled: true,
        description: "Stripe payments",
        environments: { development: true, staging: true, production: true },
        user_groups: ['admin', 'sales', 'premium', 'basic'],
        rollout_percentage: 100
      },
      dashboard_analytics: {
        enabled: true,
        description: "Analytics dashboard",
        environments: { development: true, staging: true, production: true },
        user_groups: ['admin', 'sales', 'premium'],
        rollout_percentage: 100
      }
    };
  }
  public isFeatureEnabled(
    featureName: string,
    userGroup?: UserGroup,
    userId?: string
  ): boolean {
    const feature = this.flags[featureName];
    if (!feature) {
      console.warn(`Feature flag '${featureName}' not found`);
      return false;
    }
    // Check if feature is globally enabled
    if (!feature.enabled) {
      return false;
    }
    // Check environment
    if (!feature.environments[this.environment]) {
      return false;
    }
    // Check user group access
    if (userGroup && feature.user_groups.length > 0) {
      if (!feature.user_groups.includes(userGroup)) {
        return false;
      }
    }
    // Check rollout percentage
    if (feature.rollout_percentage < 100 && userId) {
      const userHash = this.hashCode(userId) % 100;
      if (userHash >= feature.rollout_percentage) {
        return false;
      }
    }
    return true;
  }
  public getEnabledFeatures(userGroup?: UserGroup, userId?: string): string[] {
    return Object.keys(this.flags).filter(featureName =>
      this.isFeatureEnabled(featureName, userGroup, userId)
    );
  }
  public getFeatureConfig(featureName: string): FeatureFlag | null {
    return this.flags[featureName] || null;
  }
  public async reloadFlags(): Promise<void> {
    await this.loadFlags();
  }
  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}
// Global instance
export const featureFlags = new FeatureFlagsService();
// Convenience functions
export const isFeatureEnabled = (
  featureName: string,
  userGroup?: UserGroup,
  userId?: string
): boolean => {
  return featureFlags.isFeatureEnabled(featureName, userGroup, userId);
};
export const getEnabledFeatures = (
  userGroup?: UserGroup,
  userId?: string
): string[] => {
  return featureFlags.getEnabledFeatures(userGroup, userId);
};
// React hook for feature flags
import { useState, useEffect } from 'react';
export const useFeatureFlag = (featureName: string, userGroup?: UserGroup, userId?: string) => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const checkFeature = async () => {
      try {
        await featureFlags.reloadFlags();
        setIsEnabled(featureFlags.isFeatureEnabled(featureName, userGroup, userId));
      } catch (error) {
        console.error('Error checking feature flag:', error);
        setIsEnabled(false);
      } finally {
        setLoading(false);
      }
    };
    checkFeature();
  }, [featureName, userGroup, userId]);
  return { isEnabled, loading };
};
// React component wrapper for feature flags
interface FeatureGateProps {
  feature: string;
  userGroup?: UserGroup;
  userId?: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}
export const FeatureGate: React.FC<FeatureGateProps> = ({
  feature,
  userGroup,
  userId,
  fallback = null,
  children
}) => {
  const { isEnabled, loading } = useFeatureFlag(feature, userGroup, userId);
  if (loading) {
    return <div>Loading...</div>;
  }
  return isEnabled ? <>{children}</> : <>{fallback}</>;
};
export default featureFlags;