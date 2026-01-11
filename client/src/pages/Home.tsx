import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Video, LineChart, Trophy, Upload, Check } from "lucide-react";
import { Navbar } from "@/components/Navbar";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0c10] text-white">
      <Navbar />

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-32 pb-20">
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <h1 className="text-7xl md:text-8xl font-bold tracking-tighter leading-[0.9] mb-4">
                  Turn Every Match <br />
                  Into <span className="italic text-accent">Insight.</span>
                </h1>
                <p className="text-lg text-white/50 max-w-xl mx-auto mt-8 font-medium">
                  Professional biomechanical tracking and Gemini 3 analysis. Upload your training footage to unlock pro-level performance.
                </p>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="pt-12"
              >
                <Link href="/upload">
                  <div className="max-w-xl mx-auto cursor-pointer group">
                    <div className="relative p-1 rounded-[2rem] border-2 border-dashed border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-500 overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.05] to-transparent pointer-events-none" />
                      <div className="relative py-16 flex flex-col items-center justify-center gap-6">
                        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 border border-white/10">
                          <Upload className="w-6 h-6 text-white/60 group-hover:text-white" />
                        </div>
                        <div className="text-center">
                          <h3 className="text-2xl font-bold tracking-tight mb-2">Drop Match Footage</h3>
                          <p className="text-sm text-white/40 uppercase tracking-widest font-bold">MP4, MOV, AVI (Max 100MB)</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 0.5 }}
                className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4 pt-16"
              >
                {[
                  "KINETIC CHAIN ANALYSIS",
                  "UNIT TURN DETECTION",
                  "TACTICAL HEATMAPS"
                ].map((tag) => (
                  <div key={tag} className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-accent" />
                    <span className="text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase">{tag}</span>
                  </div>
                ))}
              </motion.div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
