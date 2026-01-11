import { Link, useLocation } from "wouter";
import { Trophy, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

export function Navbar() {
  const [location] = useLocation();

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group cursor-pointer">
          <div className="relative">
            <Trophy className="w-8 h-8 text-secondary transition-transform group-hover:scale-110" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full border-2 border-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-primary">
            RallyCoach<span className="text-secondary">AI</span>
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <Link href="/upload">
            <button className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm transition-all duration-200",
              location === "/upload" 
                ? "bg-secondary text-secondary-foreground shadow-lg shadow-secondary/20" 
                : "bg-primary text-primary-foreground hover:bg-primary/90"
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
