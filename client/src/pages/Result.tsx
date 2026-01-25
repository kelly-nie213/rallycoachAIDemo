import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Zap, 
  Wrench, 
  Footprints,
  Target,
  Loader2, 
  CheckCircle2, 
  Activity,
  ArrowLeft,
  User,
  FileText,
  Dna,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  Trophy,
  BarChart3
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import type { Video } from "@shared/schema";

interface DrillPlan {
  title: string;
  description: string;
}

interface DNAData {
  technical: number;
  tactical: number;
  summary: string;
}

interface AnalysisData {
  dna: DNAData;
  strengths: string[];
  fixes: string[];
  plan: DrillPlan[];
}

export default function ResultPage() {
  const { id } = useParams();
  
  const { data: video, isLoading: isQueryLoading } = useQuery<Video>({
    queryKey: [`/api/videos/${id}`],
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "completed" || status === "failed" ? false : 2000;
    }
  });

  if (isQueryLoading || !video) {
    return (
      <div className="min-h-screen bg-[#0a0c10] text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#d4ff00]" />
      </div>
    );
  }

  const isProcessing = video.status === "pending" || video.status === "processing";
  const analysis: AnalysisData | null = video.analysisData ? JSON.parse(video.analysisData) : null;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="flex items-center gap-4 mb-2">
            <Link href="/upload">
              <button className="p-2.5 bg-[#141820] hover:bg-[#1e2430] border border-[#1e2430] rounded-xl transition-all duration-300 hover:border-[#d4ff00]/30" data-testid="button-back">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight">Match Analysis</h1>
                <span className="px-3 py-1 bg-[#d4ff00]/10 border border-[#d4ff00]/30 rounded-full text-[#d4ff00] text-xs font-bold tracking-wider">
                  #{video.id}
                </span>
              </div>
              <p className="text-gray-500 text-sm mt-1">AI-powered biomechanical performance report</p>
            </div>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {isProcessing ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-[60vh]"
            >
              <div className="w-full max-w-2xl bg-[#141820] border border-[#1e2430] rounded-3xl p-12 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#d4ff00]/5 to-transparent pointer-events-none" />
                
                {/* Animated scanning line effect */}
                <motion.div 
                  className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#d4ff00] to-transparent opacity-60"
                  animate={{ y: [0, 200, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                />
                
                <div className="flex items-center justify-between mb-12 relative">
                  {/* Background track - thicker */}
                  <div className="absolute top-1/2 left-0 w-full h-2 bg-[#1e2430] -translate-y-1/2 rounded-full" />
                  
                  {/* FLASHING progress bar - only during processing */}
                  {video.status === "processing" && (
                    <>
                      {/* Main animated bar - thick and bright */}
                      <motion.div 
                        className="absolute top-1/2 left-[8%] h-3 bg-[#d4ff00] -translate-y-1/2 rounded-full z-[5]"
                        style={{ boxShadow: "0 0 20px #d4ff00, 0 0 40px #d4ff00" }}
                        animate={{ 
                          width: ["10%", "35%", "20%", "40%", "25%"],
                          opacity: [1, 0.5, 1, 0.6, 1]
                        }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                      />
                      
                      {/* Fast moving dot */}
                      <motion.div 
                        className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white z-[6]"
                        style={{ boxShadow: "0 0 15px #d4ff00, 0 0 30px #84cea6" }}
                        animate={{ 
                          left: ["8%", "48%"],
                          scale: [1, 1.3, 1]
                        }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                      
                      {/* Second trailing dot */}
                      <motion.div 
                        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#84cea6] z-[6]"
                        style={{ boxShadow: "0 0 10px #84cea6" }}
                        animate={{ 
                          left: ["5%", "42%"],
                        }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear", delay: 0.2 }}
                      />
                      
                      {/* Pulsing glow effect on track */}
                      <motion.div 
                        className="absolute top-1/2 left-[8%] w-[40%] h-4 -translate-y-1/2 rounded-full bg-[#d4ff00]/30 blur-sm z-[4]"
                        animate={{ opacity: [0.3, 0.8, 0.3] }}
                        transition={{ duration: 0.5, repeat: Infinity }}
                      />
                    </>
                  )}
                  
                  <div className="relative z-10 flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-2xl bg-[#d4ff00] flex items-center justify-center text-black shadow-lg shadow-[#d4ff00]/20">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-bold tracking-widest text-[#d4ff00]">UPLOAD</span>
                  </div>

                  <div className="relative z-10 flex flex-col items-center gap-2">
                    <motion.div 
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center ${video.status === "processing" ? "bg-[#d4ff00] text-black shadow-lg shadow-[#d4ff00]/20" : "bg-[#1e2430] text-gray-500"}`}
                      animate={video.status === "processing" ? { 
                        scale: [1, 1.1, 1],
                        boxShadow: ["0 0 0 0 rgba(212, 255, 0, 0.4)", "0 0 0 10px rgba(212, 255, 0, 0)", "0 0 0 0 rgba(212, 255, 0, 0)"]
                      } : {}}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <Activity className={`w-6 h-6 ${video.status === "processing" ? "animate-pulse" : ""}`} />
                    </motion.div>
                    <span className={`text-[10px] font-bold tracking-widest ${video.status === "processing" ? "text-[#d4ff00]" : "text-gray-500"}`}>INFERENCE</span>
                  </div>

                  <div className="relative z-10 flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-2xl bg-[#1e2430] flex items-center justify-center text-gray-500">
                      <Dna className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-bold tracking-widest text-gray-500">ANALYSIS</span>
                  </div>
                </div>

                <div className="text-center relative z-10">
                  <h3 className="text-xl font-bold mb-3">
                    {video.status === "pending" ? "Queuing process..." : (
                      <motion.span
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        GPU Inference: Detecting player skeletal markers...
                      </motion.span>
                    )}
                  </h3>
                  
                  {/* Animated loading dots */}
                  <div className="flex items-center justify-center gap-2 mb-4">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <motion.div
                        key={i}
                        className="w-2 h-2 rounded-full bg-[#d4ff00]"
                        animate={{ 
                          scale: [1, 1.5, 1],
                          opacity: [0.3, 1, 0.3]
                        }}
                        transition={{ 
                          duration: 1, 
                          repeat: Infinity, 
                          delay: i * 0.15 
                        }}
                      />
                    ))}
                  </div>
                  
                  <div className="flex items-center justify-center gap-4 text-[10px] font-bold tracking-widest text-gray-500">
                    <span className="flex items-center gap-1.5">
                      <motion.span 
                        className="w-2 h-2 rounded-full bg-[#d4ff00]"
                        animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                      />
                      ACTIVE
                    </span>
                    <span className="w-1 h-1 rounded-full bg-gray-600" />
                    <span>WORKERS: ACTIVE</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : video.status === "failed" ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-[60vh]"
            >
              <div className="bg-[#141820] border border-red-500/30 rounded-3xl p-12 text-center max-w-md">
                <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-6">
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold text-red-400 mb-2">Analysis Failed</h2>
                <p className="text-gray-400 mb-6">Something went wrong during video processing. Please try uploading the video again.</p>
                <Link href="/upload">
                  <button className="px-6 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 font-medium transition-colors">
                    Try Again
                  </button>
                </Link>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="results"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-8"
            >
              {/* Performance DNA Section */}
              <motion.section variants={itemVariants}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#d4ff00] to-[#84cea6] flex items-center justify-center">
                    <Dna className="w-5 h-5 text-black" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Performance DNA</h2>
                    <p className="text-xs text-gray-500 tracking-wide">BIOMECHANICAL ANALYSIS</p>
                  </div>
                </div>
                <div className="bg-[#141820] border border-[#1e2430] rounded-2xl p-6 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#d4ff00] via-[#84cea6] to-[#3b82f6]" />
                  
                  {/* Score Bars */}
                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-gray-400">Technical Score</span>
                        <span className="text-sm font-bold text-[#d4ff00]">{analysis?.dna?.technical || 0}%</span>
                      </div>
                      <div className="h-2 bg-[#1e2430] rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-[#d4ff00] to-[#84cea6] rounded-full transition-all duration-1000"
                          style={{ width: `${analysis?.dna?.technical || 0}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-gray-400">Tactical Score</span>
                        <span className="text-sm font-bold text-[#84cea6]">{analysis?.dna?.tactical || 0}%</span>
                      </div>
                      <div className="h-2 bg-[#1e2430] rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-[#84cea6] to-[#3b82f6] rounded-full transition-all duration-1000"
                          style={{ width: `${analysis?.dna?.tactical || 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-gray-300 leading-relaxed text-[15px]" data-testid="text-match-summary">
                    {analysis?.dna?.summary || "No summary available"}
                  </p>
                </div>
              </motion.section>

              {/* Divider */}
              <div className="flex items-center gap-4 py-2">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#1e2430] to-transparent" />
                <span className="text-[10px] font-bold tracking-widest text-gray-600">DETAILED ANALYSIS</span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#1e2430] to-transparent" />
              </div>

              {/* Strengths and Fixes Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Strengths */}
                <motion.section variants={itemVariants} className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/10">
                      <Zap className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Key Strengths</h2>
                      <p className="text-xs text-gray-500 tracking-wide">WHAT YOU'RE DOING WELL</p>
                    </div>
                  </div>

                  <div className="bg-[#141820] border border-[#1e2430] rounded-2xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-[#1e2430] flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-emerald-400">Positive Performance Areas</h3>
                        <p className="text-[10px] text-gray-500 tracking-wide">BUILD ON THESE</p>
                      </div>
                    </div>
                    <div className="p-5">
                      <ul className="space-y-3">
                        {analysis?.strengths?.map((strength, i) => (
                          <li key={i} className="flex gap-3 text-sm group" data-testid={`text-strength-${i}`}>
                            <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/20 transition-colors">
                              <Sparkles className="w-3 h-3 text-emerald-400" />
                            </div>
                            <span className="text-gray-300 leading-relaxed">{strength}</span>
                          </li>
                        )) || <li className="text-gray-500 italic">No data available</li>}
                      </ul>
                    </div>
                  </div>
                </motion.section>

                {/* Areas to Improve */}
                <motion.section variants={itemVariants} className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/10">
                      <Wrench className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Areas to Improve</h2>
                      <p className="text-xs text-gray-500 tracking-wide">FOCUS ON THESE</p>
                    </div>
                  </div>

                  <div className="bg-[#141820] border border-[#1e2430] rounded-2xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-[#1e2430] flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                        <Target className="w-4 h-4 text-orange-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-orange-400">Development Focus</h3>
                        <p className="text-[10px] text-gray-500 tracking-wide">PRIORITY FIXES</p>
                      </div>
                    </div>
                    <div className="p-5">
                      <ul className="space-y-3">
                        {analysis?.fixes?.map((fix, i) => (
                          <li key={i} className="flex gap-3 text-sm group" data-testid={`text-fix-${i}`}>
                            <div className="w-6 h-6 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0 group-hover:bg-orange-500/20 transition-colors">
                              <AlertTriangle className="w-3 h-3 text-orange-400" />
                            </div>
                            <span className="text-gray-300 leading-relaxed">{fix}</span>
                          </li>
                        )) || <li className="text-gray-500 italic">No data available</li>}
                      </ul>
                    </div>
                  </div>
                </motion.section>
              </div>

              {/* Training Plan Section */}
              <motion.section variants={itemVariants}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] flex items-center justify-center">
                    <Activity className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Training Plan</h2>
                    <p className="text-xs text-gray-500 tracking-wide">RECOMMENDED DRILLS</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analysis?.plan?.map((drill, i) => (
                    <div key={i} className="bg-[#141820] border border-[#1e2430] rounded-2xl p-5 relative overflow-hidden" data-testid={`card-drill-${i}`}>
                      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#3b82f6] to-[#8b5cf6]" />
                      <h4 className="font-bold text-[#3b82f6] mb-2">{drill.title}</h4>
                      <p className="text-gray-400 text-sm leading-relaxed">{drill.description}</p>
                    </div>
                  )) || (
                    <div className="bg-[#141820] border border-[#1e2430] rounded-2xl p-5">
                      <p className="text-gray-500 italic">No training plan available</p>
                    </div>
                  )}
                </div>
              </motion.section>

              {/* Footer CTA */}
              <motion.div variants={itemVariants} className="pt-8">
                <div className="bg-gradient-to-r from-[#141820] to-[#1a1f2e] border border-[#1e2430] rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#d4ff00]/10 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-[#d4ff00]" />
                    </div>
                    <div>
                      <h3 className="font-bold">Ready for another analysis?</h3>
                      <p className="text-sm text-gray-500">Upload a new video to get detailed coaching insights</p>
                    </div>
                  </div>
                  <Link href="/upload">
                    <button className="px-6 py-3 bg-[#d4ff00] hover:bg-[#c4ef00] text-black font-bold rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-[#d4ff00]/20" data-testid="button-new-analysis">
                      New Analysis
                    </button>
                  </Link>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="py-8 border-t border-[#1e2430] text-gray-600">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-bold tracking-widest">
          <div>© 2025 RALLYCOACH AI / BIOMETRICS DIVISION</div>
          <div className="flex gap-8">
            <span>PRIVACY</span>
            <span>TELEMETRY</span>
            <span>DOCS</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
