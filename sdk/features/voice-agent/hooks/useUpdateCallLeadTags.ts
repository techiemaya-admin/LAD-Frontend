import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UpdateCallLeadTagsRequest, UpdateCallLeadTagsResponse } from "../types";
import * as api from "../api";

export function useUpdateCallLeadTags() {
  const queryClient = useQueryClient();

  return useMutation<UpdateCallLeadTagsResponse, Error, UpdateCallLeadTagsRequest>({
    mutationFn: (payload) => api.updateCallLeadTags(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call-logs"] });
    },
  });
}
