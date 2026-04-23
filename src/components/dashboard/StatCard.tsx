import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  trend: "up" | "down" | "neutral";
  icon: LucideIcon;
  className?: string;
}

export function StatCard({ title, value, change, trend, icon: Icon, className }: StatCardProps) {
  return (
    <Card className={cn("overflow-hidden border-none shadow-sm animate-fade-in-up", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
            <h3 className="text-2xl font-bold tracking-tight text-foreground">{value}</h3>
            <div className="flex items-center gap-1">
              <span className={cn(
                "text-xs font-medium",
                trend === "up" ? "text-emerald-500" : trend === "down" ? "text-destructive" : "text-muted-foreground"
              )}>
                {change}
              </span>
              <span className="text-[10px] text-muted-foreground">vs last week</span>
            </div>
          </div>
          <div className="rounded-full bg-primary/10 p-3 text-primary">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
