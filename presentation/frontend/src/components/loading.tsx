import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingProps {
  className?: string;
  text?: string;
  fullScreen?: boolean;
}

export function Loading({ className, text, fullScreen = false }: LoadingProps) {
  const content = (
    <div className={cn("flex flex-col items-center justify-center gap-2", className)}>
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        {content}
      </div>
    );
  }

  return content;
}