/**
 * Email Accounts — useSaveMsBookingConfig
 * Mutation hook for saving Microsoft Bookings configuration.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { saveMsBookingConfig, saveMsTenantDefaults, emailAccountKeys } from '../api';
import type { SaveBookingConfigRequest, SaveTenantDefaultsRequest } from '../types';

export function useSaveMsBookingConfig() {
  const queryClient = useQueryClient();

  const saveConfig = useMutation({
    mutationFn: (payload: SaveBookingConfigRequest) => saveMsBookingConfig(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailAccountKeys.microsoftStatus() });
    },
  });

  const saveTenantDefaults = useMutation({
    mutationFn: (payload: SaveTenantDefaultsRequest) => saveMsTenantDefaults(payload),
  });

  return {
    saveConfig,
    saveTenantDefaults,
    isSaving: saveConfig.isPending || saveTenantDefaults.isPending,
    isError:  saveConfig.isError   || saveTenantDefaults.isError,
  };
}
