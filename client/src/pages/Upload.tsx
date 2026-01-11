import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { Upload as UploadIcon, FileVideo, Link as LinkIcon, Loader2 } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { useToast } from "@/hooks/use-toast";
import { useUpload } from "@/hooks/use-upload";
import { apiRequest } from "@/lib/queryClient";

export default function UploadPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'file' | 'link'>('file');
  const [driveLink, setDriveLink] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Use the object storage upload hook
  const { uploadFile, isUploading, progress } = useUpload({
    onError: (error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const createVideoRecord = async (url: string) => {
    try {
      setIsProcessing(true);
      const res = await apiRequest("POST", "/api/videos/upload", { originalUrl: url });
      const video = await res.json();
      
      // Trigger processing
      await apiRequest("POST", `/api/videos/${video.id}/process`);
      
      setLocation(`/results/${video.id}`);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create video record. Please try again.",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      try {
        const result = await uploadFile(file);
        if (result) {
          // result.objectPath is the path in object storage (e.g., /objects/uploads/uuid)
          // We can use this as the URL for the backend to reference
          await createVideoRecord(result.objectPath);
        }
      } catch (error) {
        console.error("Upload failed:", error);
      }
    }
  }, [uploadFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi', '.mkv']
    },
    maxFiles: 1,
    multiple: false,
    disabled: isUploading || isProcessing
  });

  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driveLink) return;
    await createVideoRecord(driveLink);
  };

  const isLoading = isUploading || isProcessing;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-12 flex flex-col items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl"
        >
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold mb-4">Upload Match Footage</h1>
            <p className="text-muted-foreground text-lg">
              We accept MP4, MOV, and AVI files up to 500MB.
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-xl shadow-black/5 border border-border/60 overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-border/60">
              <button
                onClick={() => setActiveTab('file')}
                disabled={isLoading}
                className={`flex-1 py-4 text-center font-semibold transition-colors ${
                  activeTab === 'file' 
                    ? 'bg-secondary/5 text-secondary border-b-2 border-secondary' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Upload File
              </button>
              <button
                onClick={() => setActiveTab('link')}
                disabled={isLoading}
                className={`flex-1 py-4 text-center font-semibold transition-colors ${
                  activeTab === 'link' 
                    ? 'bg-secondary/5 text-secondary border-b-2 border-secondary' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Google Drive Link
              </button>
            </div>

            <div className="p-8">
              <AnimatePresence mode="wait">
                {activeTab === 'file' ? (
                  <motion.div
                    key="file"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="h-80"
                  >
                    <div
                      {...getRootProps()}
                      className={`h-full border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group ${
                        isDragActive 
                          ? 'border-secondary bg-secondary/5' 
                          : 'border-border hover:border-secondary/50 hover:bg-muted/20'
                      }`}
                    >
                      <input {...getInputProps()} />
                      {isLoading ? (
                        <div className="flex flex-col items-center text-secondary">
                          <Loader2 className="w-12 h-12 animate-spin mb-4" />
                          <p className="font-medium">
                            {isUploading ? `Uploading... ${progress}%` : "Processing video..."}
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <UploadIcon className="w-8 h-8 text-secondary" />
                          </div>
                          <p className="text-lg font-semibold text-primary mb-2">
                            {isDragActive ? "Drop video here" : "Drag & drop video"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            or click to browse from computer
                          </p>
                        </>
                      )}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="link"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="h-80 flex flex-col justify-center"
                  >
                    <form onSubmit={handleLinkSubmit} className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground ml-1">
                          Google Drive Public Link
                        </label>
                        <div className="relative">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                            <LinkIcon className="w-5 h-5" />
                          </div>
                          <input
                            type="url"
                            placeholder="https://drive.google.com/file/..."
                            value={driveLink}
                            onChange={(e) => setDriveLink(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 rounded-xl border border-border bg-muted/20 focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all"
                            required
                            disabled={isLoading}
                          />
                        </div>
                      </div>
                      
                      <button
                        type="submit"
                        disabled={isLoading || !driveLink}
                        className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            Start Analysis
                            <FileVideo className="w-5 h-5" />
                          </>
                        )}
                      </button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          
          <p className="text-center text-sm text-muted-foreground mt-8 max-w-md mx-auto">
            By uploading, you agree to our Terms of Service. Analysis usually takes 1-2 minutes depending on video length.
          </p>
        </motion.div>
      </main>
    </div>
  );
}
