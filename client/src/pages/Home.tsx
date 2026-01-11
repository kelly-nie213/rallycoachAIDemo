import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Video, LineChart, Trophy } from "lucide-react";
import { Navbar } from "@/components/Navbar";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-24 pb-32">
          {/* Abstract Tennis Ball Background Pattern */}
          <div className="absolute top-0 right-0 -mr-32 -mt-32 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 -ml-32 -mb-32 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />

          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="inline-block px-4 py-1.5 rounded-full bg-secondary/10 text-secondary font-semibold text-sm mb-6 border border-secondary/20">
                  New: AI-Powered Stroke Analysis v2.0
                </div>
                <h1 className="text-6xl md:text-7xl font-extrabold tracking-tight text-primary leading-[1.1]">
                  Master Your Game with <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-secondary to-accent">
                    Professional AI Coaching
                  </span>
                </h1>
              </motion.div>
              
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
              >
                Upload your match footage and get instant, pro-level technical analysis. 
                Identify weaknesses, track improvement, and visualize your perfect swing path.
              </motion.p>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
              >
                <Link href="/upload">
                  <button className="group relative px-8 py-4 bg-primary text-primary-foreground text-lg font-bold rounded-xl shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30 hover:-translate-y-1 transition-all duration-300 w-full sm:w-auto overflow-hidden">
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      Analyze My Swing
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-primary to-slate-800" />
                  </button>
                </Link>
                <button className="px-8 py-4 bg-white text-primary border-2 border-border font-bold rounded-xl hover:bg-slate-50 hover:border-primary/20 transition-all duration-300 w-full sm:w-auto">
                  View Demo
                </button>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-24 bg-white border-t border-border/40">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {[
                {
                  icon: Video,
                  title: "Video Analysis",
                  desc: "Upload local files or Drive links. We process footage instantly."
                },
                {
                  icon: LineChart,
                  title: "Technical Insights",
                  desc: "Get annotated overlays showing ideal swing paths and contact points."
                },
                {
                  icon: Trophy,
                  title: "Pro Recommendations",
                  desc: "Receive personalized drills and tips tailored to your playstyle."
                }
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-muted/30 p-8 rounded-3xl border border-border/50 hover:border-secondary/20 hover:bg-secondary/5 transition-all duration-300 group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-white shadow-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <feature.icon className="w-7 h-7 text-secondary" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-primary">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
