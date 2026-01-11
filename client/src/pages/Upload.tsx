import { useState, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Upload as UploadIcon, 
  FileVideo, 
  Link as LinkIcon, 
  Loader2, 
  Cpu, 
  Activity, 
  CheckCircle2,
  Check
} from "lucide-react";
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
  const [currentStep, setCurrentStep] = useState<'idle' | 'upload' | 'inference' | 'analysis'>('idle');
  const [processingVideoId, setProcessingVideoId] = useState<number | null>(null);

  // Use the object storage upload hook
  const { uploadFile, isUploading, progress } = useUpload({
    onSuccess: () => {
      setCurrentStep('inference');
    },
    onError: (error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
      setCurrentStep('idle');
    }
  });

  const createVideoRecord = async (url: string) => {
    try {
      setIsProcessing(true);
      const res = await apiRequest("POST", "/api/videos/upload", { originalUrl: url });
      const video = await res.json();
      setProcessingVideoId(video.id);
      
      // Trigger processing
      await apiRequest("POST", `/api/videos/${video.id}/process`);
      setCurrentStep('inference');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create video record. Please try again.",
        variant: "destructive",
      });
      setIsProcessing(false);
      setCurrentStep('idle');
    }
  };

  // Poll for status when in inference/analysis steps
  useEffect(() => {
    if (!processingVideoId || currentStep === 'idle' || currentStep === 'upload') return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/videos/${processingVideoId}`);
        const video = await res.json();
        
        if (video.status === 'completed') {
          setCurrentStep('analysis');
          setTimeout(() => setLocation(`/results/${video.id}`), 1000);
          clearInterval(interval);
        } else if (video.status === 'failed') {
          toast({
            title: "Analysis Failed",
            description: "Please try uploading the video again.",
            variant: "destructive"
          });
          setCurrentStep('idle');
          setIsProcessing(false);
          clearInterval(interval);
        } else if (video.status === 'processing' && video.analysisData) {
          // If we have analysis data but not marked completed yet, it's in final stage
          setCurrentStep('analysis');
        }
      } catch (e) {
        console.error("Polling error:", e);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [processingVideoId, currentStep, setLocation, toast]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      try {
        setCurrentStep('upload');
        const result = await uploadFile(file);
        if (result) {
          await createVideoRecord(result.objectPath);
        }
      } catch (error) {
        console.error("Upload failed:", error);
        setCurrentStep('idle');
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
    setCurrentStep('upload');
    await createVideoRecord(driveLink);
  };

  const isLoading = isUploading || isProcessing;

  const steps = [
    { id: 'upload', label: 'UPLOAD', icon: UploadIcon },
    { id: 'inference', label: 'INFERENCE', icon: Cpu },
    { id: 'analysis', label: 'ANALYSIS', icon: Activity },
  ];

  const getStepStatus = (stepId: string) => {
    const stepOrder = ['idle', 'upload', 'inference', 'analysis'];
    const currentIdx = stepOrder.indexOf(currentStep);
    const stepIdx = stepOrder.indexOf(stepId);

    if (currentIdx > stepIdx) return 'completed';
    if (currentIdx === stepIdx) return 'active';
    return 'pending';
  };

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white flex flex-col">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-12 flex flex-col items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-3xl"
        >
          {isLoading ? (
            <div className="bg-[#11141d] rounded-[2rem] border border-white/5 p-12 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
              
              {/* High-Tech Progress Header */}
              <div className="flex items-center justify-between mb-20 relative">
                {steps.map((step, idx) => {
                  const status = getStepStatus(step.id);
                  const Icon = step.icon;
                  
                  return (
                    <div key={step.id} className="flex flex-col items-center gap-4 relative z-10">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 ${
                        status === 'active' 
                          ? 'bg-accent border-accent text-[#0a0c10] shadow-[0_0_20px_rgba(132,206,166,0.3)]' 
                          : status === 'completed'
                          ? 'bg-accent/20 border-accent/20 text-accent'
                          : 'bg-white/5 border-white/10 text-white/20'
                      }`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className={`text-[10px] font-bold tracking-[0.2em] transition-colors duration-500 ${
                        status === 'active' ? 'text-accent' : 'text-white/20'
                      }`}>
                        {step.label}
                      </span>
                      
                      {idx < steps.length - 1 && (
                        <div className="absolute left-[calc(100%+1rem)] top-7 w-[calc(100%-2rem)] md:w-40 h-[2px] bg-white/5">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: status === 'completed' ? '100%' : '0%' }}
                            className="h-full bg-accent shadow-[0_0_10px_rgba(132,206,166,0.5)]"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Status Message */}
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold tracking-tight">
                  {currentStep === 'upload' && `Uploading match footage... ${progress}%`}
                  {currentStep === 'inference' && "GPU Inference: Detecting player skeletal markers..."}
                  {currentStep === 'analysis' && "Analysis: Generating professional technical insights..."}
                </h3>
                <div className="flex items-center justify-center gap-4 text-[10px] font-bold tracking-[0.2em] text-white/30 uppercase">
                  <span>LATENCY: 240MS</span>
                  <span className="w-1 h-1 rounded-full bg-white/20" />
                  <span>WORKERS: ACTIVE</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-12">
              <div className="space-y-4">
                <h1 className="text-6xl font-bold tracking-tighter leading-tight">
                  Upload Match <br />
                  <span className="text-accent italic">Footage.</span>
                </h1>
                <p className="text-white/40 font-medium text-lg max-w-md mx-auto">
                  We accept MP4, MOV, and AVI files. Pro-level analysis in seconds.
                </p>
              </div>

              <div className="max-w-xl mx-auto">
                <div className="flex gap-4 mb-8">
                  <button
                    onClick={() => setActiveTab('file')}
                    className={`flex-1 py-3 px-6 rounded-2xl font-bold text-xs tracking-widest transition-all ${
                      activeTab === 'file' 
                        ? 'bg-white/10 text-white border border-white/20' 
                        : 'text-white/30 hover:text-white/50'
                    }`}
                  >
                    LOCAL FILE
                  </button>
                  <button
                    onClick={() => setActiveTab('link')}
                    className={`flex-1 py-3 px-6 rounded-2xl font-bold text-xs tracking-widest transition-all ${
                      activeTab === 'link' 
                        ? 'bg-white/10 text-white border border-white/20' 
                        : 'text-white/30 hover:text-white/50'
                    }`}
                  >
                    GOOGLE DRIVE
                  </button>
                </div>

                <AnimatePresence mode="wait">
                  {activeTab === 'file' ? (
                    <motion.div
                      key="file"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      {...getRootProps()}
                      className={`relative p-1 rounded-[2rem] border-2 border-dashed transition-all duration-500 overflow-hidden cursor-pointer ${
                        isDragActive 
                          ? 'border-accent bg-accent/5 shadow-[0_0_30px_rgba(132,206,166,0.1)]' 
                          : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04]'
                      }`}
                    >
                      <input {...getInputProps()} />
                      <div className="relative py-20 flex flex-col items-center justify-center gap-6">
                        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                          <UploadIcon className={`w-6 h-6 ${isDragActive ? 'text-accent' : 'text-white/40'}`} />
                        </div>
                        <div className="text-center">
                          <h3 className="text-2xl font-bold tracking-tight mb-2">
                            {isDragActive ? "Drop video here" : "Drop Match Footage"}
                          </h3>
                          <p className="text-sm text-white/40 uppercase tracking-widest font-bold">MP4, MOV, AVI (Max 100MB)</p>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="link"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      className="p-8 bg-white/[0.02] border border-white/10 rounded-[2rem]"
                    >
                      <form onSubmit={handleLinkSubmit} className="space-y-6">
                        <div className="relative">
                          <input
                            type="url"
                            placeholder="Paste Google Drive public link..."
                            value={driveLink}
                            onChange={(e) => setDriveLink(e.target.value)}
                            className="w-full px-6 py-5 rounded-2xl border border-white/10 bg-white/5 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all text-white placeholder:text-white/20"
                            required
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={!driveLink}
                          className="w-full py-5 bg-white text-[#0a0c10] font-bold rounded-2xl hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 tracking-widest text-xs"
                        >
                          START ANALYSIS
                          <FileVideo className="w-4 h-4" />
                        </button>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              <div className="flex items-center justify-center gap-12 pt-12">
                {[
                  "KINETIC CHAIN",
                  "UNIT TURN",
                  "TACTICAL HEATMAPS"
                ].map((tag) => (
                  <div key={tag} className="flex items-center gap-2">
                    <Check className="w-3 h-3 text-accent" />
                    <span className="text-[10px] font-bold tracking-[0.2em] text-white/30 uppercase">{tag}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </main>

      {/* Footer Branding */}
      <footer className="py-12 border-t border-white/5">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-[10px] font-bold tracking-[0.2em] text-white/30 uppercase">
            © 2026 RALLYCOACH AI / BIOMETRICS DIVISION
          </div>
          <div className="flex gap-12">
            {["PRIVACY", "TELEMETRY", "DOCS"].map(link => (
              <a key={link} href="#" className="text-[10px] font-bold tracking-[0.2em] text-white/30 hover:text-white transition-colors">
                {link}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
