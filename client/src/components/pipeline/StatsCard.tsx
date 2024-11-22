// /components/pipeline/StatsCard.tsx
import { Card, CardContent } from "@/components/ui/card";
import { useMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string;
}

export function StatsCard({ title, value }: StatsCardProps) {
  const isMobile = useMobile();

  return (
    <Card className="overflow-hidden">
      <CardContent className={cn("pt-4 pb-3", !isMobile && "pt-6 pb-4")}>
        <div
          className={cn(
            "text-sm font-medium text-muted-foreground mb-1",
            isMobile && "text-xs",
          )}
        >
          {title}
        </div>
        <div
          className={cn(
            "font-bold tracking-tight",
            isMobile ? "text-lg" : "text-2xl",
            "truncate",
          )}
        >
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
