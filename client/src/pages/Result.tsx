import { useParams, Link } from "wouter";
import { useVideo } from "@/hooks/use-videos";
import { Navbar } from "@/components/Navbar";
import { VideoPlayer } from "@/components/VideoPlayer";
import { StatusBadge } from "@/components/StatusBadge";
import { Loader2, ArrowLeft, Download, Share2, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";

export default function ResultPage() {
  const { id } = useParams();
  const videoId = id ? parseInt(id) : null;
  const { data: video, isLoading, error } = useVideo(videoId);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
          <Loader2 className="w-12 h-12 animate-spin text-secondary mb-4" />
          <h2 className="text-2xl font-bold mb-2">Loading Session...</h2>
          <p className="text-muted-foreground">Retrieving analysis data</p>
        </div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
          <h2 className="text-2xl font-bold mb-2 text-destructive">Video Not Found</h2>
          <p className="text-muted-foreground mb-6">We couldn't locate that session ID.</p>
          <Link href="/upload">
            <button className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium">
              Start New Analysis
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const isReady = video.status === 'completed';
  const isProcessing = video.status === 'pending' || video.status === 'processing';
  const isFailed = video.status === 'failed';

  return (
    <div className="min-h-screen bg-background pb-12">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link href="/upload">
              <button className="p-2 hover:bg-muted rounded-full transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-3">
                Session Analysis #{video.id}
                <StatusBadge status={video.status as any} />
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                {new Date(video.createdAt!).toLocaleDateString(undefined, {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-white transition-colors flex items-center gap-2">
              <Share2 className="w-4 h-4" /> Share
            </button>
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2">
              <Download className="w-4 h-4" /> Export
            </button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Left Column: Video */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-3xl overflow-hidden shadow-lg border border-border/50"
            >
              <div className="p-1 bg-black/5">
                <VideoPlayer 
                  url={isReady && video.annotatedUrl ? video.annotatedUrl : video.originalUrl} 
                  isAnnotated={isReady && !!video.annotatedUrl}
                />
              </div>
              <div className="p-4 bg-white border-t border-border flex justify-between items-center">
                <span className="font-semibold text-sm text-muted-foreground">
                  {isReady ? "Annotated Playback" : "Original Footage"}
                </span>
                {isProcessing && (
                  <div className="flex items-center gap-2 text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Generating overlays...
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Right Column: AI Insights */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-3xl shadow-xl shadow-black/5 border border-border h-full flex flex-col"
            >
              <div className="p-6 border-b border-border bg-gradient-to-br from-white to-muted/20">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-accent" />
                  <h2 className="text-lg font-bold">Coach's Feedback</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  AI-generated analysis based on biomechanics and shot placement.
                </p>
              </div>

              <div className="p-6 flex-1 overflow-y-auto max-h-[600px] scrollbar-thin scrollbar-thumb-border">
                {isProcessing ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-12">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Analyzing Biomechanics</h3>
                      <p className="text-muted-foreground text-sm max-w-[200px] mx-auto mt-2">
                        Our models are processing your swing path, footwork, and racquet speed.
                      </p>
                    </div>
                  </div>
                ) : isFailed ? (
                  <div className="text-center py-12 text-destructive">
                    <p>Analysis failed. Please try re-uploading the video.</p>
                  </div>
                ) : (
                  <div className="prose prose-sm prose-p:text-muted-foreground prose-headings:text-primary prose-strong:text-primary prose-li:text-muted-foreground max-w-none">
                    <ReactMarkdown>{video.recommendation || "No recommendation generated yet."}</ReactMarkdown>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

        </div>
      </div>
    </div>
  );
}
