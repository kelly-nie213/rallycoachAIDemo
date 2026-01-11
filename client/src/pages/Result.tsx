import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Dna, 
  Zap, 
  Wrench, 
  ClipboardList, 
  Loader2, 
  CheckCircle2, 
  Activity,
  ArrowLeft
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface AnalysisData {
  dna: {
    technical: number;
    tactical: number;
    summary: string;
  };
  strengths: string[];
  fixes: string[];
  plan: { title: string; description: string }[];
}

export default function ResultPage() {
  const { id } = useParams();
  
  const { data: video, isLoading: isQueryLoading } = useQuery({
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

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8 flex items-center gap-4">
          <Link href="/upload">
            <button className="p-2 hover:bg-[#141820] rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <h1 className="text-2xl font-bold">Session Analysis #{video.id}</h1>
        </div>

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
                <div className="flex items-center justify-between mb-12 relative">
                  <div className="absolute top-1/2 left-0 w-full h-0.5 bg-[#1e2430] -translate-y-1/2" />
                  <div className="absolute top-1/2 left-0 h-0.5 bg-[#d4ff00] -translate-y-1/2 transition-all duration-1000" 
                       style={{ width: video.status === "processing" ? "50%" : "10%" }} />
                  
                  <div className="relative z-10 flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-[#d4ff00] flex items-center justify-center text-black">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-bold tracking-widest text-[#d4ff00]">UPLOAD</span>
                  </div>

                  <div className="relative z-10 flex flex-col items-center gap-2">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${video.status === "processing" ? "bg-[#d4ff00] text-black" : "bg-[#1e2430] text-gray-500"}`}>
                      <Activity className={`w-6 h-6 ${video.status === "processing" ? "animate-pulse" : ""}`} />
                    </div>
                    <span className={`text-[10px] font-bold tracking-widest ${video.status === "processing" ? "text-[#d4ff00]" : "text-gray-500"}`}>INFERENCE</span>
                  </div>

                  <div className="relative z-10 flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-[#1e2430] flex items-center justify-center text-gray-500">
                      <Dna className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-bold tracking-widest text-gray-500">ANALYSIS</span>
                  </div>
                </div>

                <div className="text-center">
                  <h3 className="text-xl font-bold mb-2">
                    {video.status === "pending" ? "Queuing process..." : "GPU Inference: Detecting player skeletal markers..."}
                  </h3>
                  <div className="flex items-center justify-center gap-4 text-[10px] font-bold tracking-widest text-gray-500">
                    <span>LATENCY: 240MS</span>
                    <span className="w-1 h-1 rounded-full bg-gray-500" />
                    <span>WORKERS: ACTIVE</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : video.status === "failed" ? (
            <div className="text-center py-20">
              <h2 className="text-2xl font-bold text-red-500">Analysis Failed</h2>
              <p className="text-gray-400">Please try uploading the video again.</p>
            </div>
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              <Card className="bg-[#141820] border-[#1e2430] rounded-3xl overflow-hidden">
                <CardHeader className="border-b border-[#1e2430] pb-4">
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    Performance DNA
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-8">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-bold tracking-widest">
                        <span>TECHNICAL PROWESS</span>
                        <span className="text-[#d4ff00]">{analysis?.dna.technical}%</span>
                      </div>
                      <Progress value={analysis?.dna.technical} className="h-1.5 bg-[#1e2430]" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-bold tracking-widest">
                        <span>TACTICAL IQ</span>
                        <span className="text-[#3b82f6]">{analysis?.dna.tactical}%</span>
                      </div>
                      <Progress value={analysis?.dna.tactical} className="h-1.5 bg-[#1e2430]" />
                    </div>
                  </div>

                  <div className="bg-[#0a0c10] border border-[#1e2430] rounded-2xl p-6 italic text-gray-300 text-sm leading-relaxed">
                    "{analysis?.dna.summary}"
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#141820] border-[#1e2430] rounded-3xl">
                <CardHeader className="border-b border-[#1e2430] pb-4">
                  <CardTitle className="text-xl font-bold flex items-center gap-2 text-[#d4ff00]">
                    <Zap className="w-5 h-5" /> Elite Strengths
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <ul className="space-y-6">
                    {analysis?.strengths.map((strength, i) => (
                      <li key={i} className="flex gap-3 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#d4ff00] mt-1.5 shrink-0" />
                        <span className="text-gray-300">{strength}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-[#141820] border-[#1e2430] rounded-3xl md:col-span-1">
                <CardHeader className="border-b border-[#1e2430] pb-4">
                  <CardTitle className="text-xl font-bold flex items-center gap-2 text-[#f97316]">
                    <Wrench className="w-5 h-5" /> Biomechanical Fixes
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  {analysis?.fixes.map((fix, i) => (
                    <div key={i} className="bg-[#0a0c10] border border-[#1e2430] rounded-2xl p-4 text-sm text-gray-400">
                      {fix}
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="bg-[#141820] border-[#1e2430] rounded-3xl md:col-span-1">
                <CardHeader className="border-b border-[#1e2430] pb-4">
                  <CardTitle className="text-xl font-bold flex items-center gap-2 text-[#3b82f6]">
                    <ClipboardList className="w-5 h-5" /> Pro Practice Plan
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  {analysis?.plan.map((drill, i) => (
                    <div key={i} className="bg-[#0a0c10] border border-[#1e2430] rounded-2xl p-5 space-y-2">
                      <div className="text-[10px] font-bold tracking-widest text-[#3b82f6]">{drill.title}</div>
                      <div className="text-sm text-gray-300 leading-relaxed">{drill.description}</div>
                    </div>
                  ))}
                </CardContent>
              </Card>
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
