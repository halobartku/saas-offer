// /components/pipeline/StatsCard.tsx
import { Card, CardContent } from "@/components/ui/card";

interface StatsCardProps {
  title: string;
  value: string;
}

export function StatsCard({ title, value }: StatsCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-sm font-medium text-muted-foreground mb-1">
          {title}
        </div>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
