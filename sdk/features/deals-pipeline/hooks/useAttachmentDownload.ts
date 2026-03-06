/**
 * Deals Pipeline Feature - useAttachmentDownload Hook
 *
 * React hooks for attachment download operations using TanStack Query.
 * Framework-independent (no Next.js imports).
 */
import { useMutation } from "@tanstack/react-query";
import * as api from "../api";

/**
 * Hook to get signed URL for downloading an attachment
 */
export function useGetAttachmentSignedUrl() {
  return useMutation({
    mutationFn: ({ leadId, fileUrl }: { leadId: string | number; fileUrl: string }) =>
      api.getAttachmentSignedUrl(leadId, fileUrl),
  });
}

/**
 * Hook to download an attachment directly
 */
export function useDownloadAttachment() {
  const getSignedUrl = useGetAttachmentSignedUrl();

  return useMutation({
    mutationFn: async ({ leadId, fileUrl, filename }: { 
      leadId: string | number; 
      fileUrl: string; 
      filename?: string;
    }) => {
      // Get signed URL (API returns snake_case)
      const { signed_url } = await getSignedUrl.mutateAsync({ leadId, fileUrl });
      
      // Fetch the file using the signed URL
      const response = await fetch(signed_url);
      if (!response.ok) {
        throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
      }
      
      // Create blob and download
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename || 'attachment';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      window.URL.revokeObjectURL(objectUrl);
      
      return { signed_url };
    },
  });
}
