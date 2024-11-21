// /components/pipeline/DraggableCard.tsx
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Clock, CalendarClock, Eye } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Offer, Client } from "db/schema";

interface DraggableCardProps {
  offer: Offer;
  clients?: Client[];
  onClick?: () => void;
  isMobile?: boolean;
}

export function DraggableCard({
  offer,
  clients,
  onClick,
  isMobile,
}: DraggableCardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: offer.id,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        transition: undefined,
        touchAction: "none",
        position: "relative" as const,
        zIndex: "50",
      }
    : undefined;

  const client = clients?.find((c) => c.id === offer.clientId);

  return (
    <Card
      ref={isMobile ? undefined : setNodeRef}
      style={isMobile ? undefined : style}
      className={cn(
        "hover:shadow-md transition-shadow",
        !isMobile && "cursor-move",
      )}
      {...(!isMobile && attributes)}
      {...(!isMobile && listeners)}
    >
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="font-medium text-sm truncate">{offer.title}</div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 shrink-0"
            onClick={onClick}
            data-no-drag
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4 shrink-0" />
          <span className="truncate">{client?.name}</span>
        </div>

        <div className="mt-1 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CalendarClock className="h-4 w-4 shrink-0" />
            {format(new Date(offer.nextContact!), "MMM d")}
          </div>
          <div className="font-medium">
            €{(Number(offer.totalAmount) || 0).toFixed(2)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
