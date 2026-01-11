import { Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type Status = "pending" | "processing" | "completed" | "failed";

export function StatusBadge({ status }: { status: Status }) {
  const config = {
    pending: {
      icon: Clock,
      text: "Waiting in Queue",
      className: "bg-yellow-100 text-yellow-700 border-yellow-200",
      animate: false
    },
    processing: {
      icon: Loader2,
      text: "Analyzing Swing...",
      className: "bg-blue-100 text-blue-700 border-blue-200",
      animate: true
    },
    completed: {
      icon: CheckCircle2,
      text: "Analysis Complete",
      className: "bg-green-100 text-green-700 border-green-200",
      animate: false
    },
    failed: {
      icon: XCircle,
      text: "Analysis Failed",
      className: "bg-red-100 text-red-700 border-red-200",
      animate: false
    }
  };

  const current = config[status] || config.pending;
  const Icon = current.icon;

  return (
    <div className={cn(
      "inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium shadow-sm transition-all duration-300",
      current.className
    )}>
      <Icon className={cn("w-4 h-4", current.animate && "animate-spin")} />
      {current.text}
    </div>
  );
}
