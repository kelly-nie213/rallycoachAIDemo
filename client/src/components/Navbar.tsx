import { Link, useLocation } from "wouter";
import { Trophy, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

export function Navbar() {
  const [location] = useLocation();

  return (
    <nav className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group cursor-pointer">
          <span className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span className="bg-white/10 px-2 py-0.5 rounded text-[10px] uppercase tracking-widest text-white/50 font-medium">Preview</span>
            RallyCoach <span className="text-accent">AI</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {["BIOMETRICS", "TACTICS", "DRILLS"].map((item) => (
            <a key={item} href="#" className="text-[11px] font-bold tracking-[0.2em] text-white/60 hover:text-white transition-colors">
              {item}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <Link href="/upload">
            <button className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm transition-all duration-200 bg-white/10 text-white hover:bg-white/20 border border-white/10"
            )}>
              <Upload className="w-4 h-4" />
              Analyze Swing
            </button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
