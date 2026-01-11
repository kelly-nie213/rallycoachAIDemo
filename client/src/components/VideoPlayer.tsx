import { Play, Pause, RotateCw } from "lucide-react";
import { useState, useRef } from "react";

interface VideoPlayerProps {
  url: string;
  isAnnotated?: boolean;
}

export function VideoPlayer({ url, isAnnotated = false }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-black aspect-video group">
      <video
        ref={videoRef}
        src={url}
        className="w-full h-full object-contain"
        onEnded={() => setIsPlaying(false)}
        controls={false}
      />
      
      {/* Overlay Badge */}
      {isAnnotated && (
        <div className="absolute top-4 right-4 bg-accent text-accent-foreground px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg z-10">
          AI Analysis Overlay
        </div>
      )}

      {/* Custom Controls Overlay */}
      <div 
        className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
        onClick={togglePlay}
      >
        <button className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-all transform hover:scale-110">
          {isPlaying ? (
            <Pause className="w-8 h-8 fill-current" />
          ) : (
            <Play className="w-8 h-8 fill-current ml-1" />
          )}
        </button>
      </div>

      {/* Bottom Bar */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="flex justify-end gap-2">
           <button 
             onClick={() => {
               if (videoRef.current) {
                 videoRef.current.currentTime = 0;
                 videoRef.current.play();
                 setIsPlaying(true);
               }
             }}
             className="text-white/80 hover:text-white"
           >
             <RotateCw className="w-5 h-5" />
           </button>
        </div>
      </div>
    </div>
  );
}
