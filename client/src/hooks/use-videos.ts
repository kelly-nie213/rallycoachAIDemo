import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import type { Video } from "@shared/schema";

export function useVideo(id: number | null) {
  return useQuery({
    queryKey: [api.videos.get.path, id],
    queryFn: async () => {
      if (!id) throw new Error("Video ID required");
      const url = buildUrl(api.videos.get.path, { id });
      const res = await fetch(url);
      
      if (!res.ok) {
        if (res.status === 404) throw new Error("Video not found");
        throw new Error("Failed to fetch video");
      }
      
      return api.videos.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
    // Poll every 2 seconds if status is pending or processing
    refetchInterval: (data) => {
      const video = data?.state?.data as Video | undefined;
      if (video?.status === 'pending' || video?.status === 'processing') {
        return 2000;
      }
      return false;
    }
  });
}

export function useUploadVideo() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch(api.videos.upload.path, {
        method: api.videos.upload.method,
        body: formData,
        // Don't set Content-Type header manually for FormData, let browser handle boundary
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || "Failed to upload video");
      }

      return api.videos.upload.responses[201].parse(await res.json());
    },
    onError: (error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
