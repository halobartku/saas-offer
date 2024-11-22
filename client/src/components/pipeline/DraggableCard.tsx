// /components/pipeline/DraggableCard.tsx
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, CalendarClock, Eye } from "lucide-react";
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
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: offer.id,
      data: {
        type: "offer",
        offer,
      },
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : undefined,
      }
    : undefined;

  const client = clients?.find((c) => c.id === offer.clientId);

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "hover:shadow-md transition-shadow touch-none",
        !isMobile && "cursor-move",
        isDragging && "opacity-50",
      )}
      {...attributes}
      {...listeners}
    >
      <CardContent className={cn("p-3", isMobile && "p-2.5")}>
        <div className="flex items-center justify-between gap-2">
          <div className="font-medium text-sm truncate flex-1">
            {offer.title}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-8 w-8 p-0 shrink-0", isMobile && "h-7 w-7")}
            onClick={(e) => {
              e.stopPropagation();
              onClick?.();
            }}
            data-no-drag
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>

        <div
          className={cn(
            "flex items-center justify-between text-sm text-muted-foreground",
            isMobile ? "mt-1.5" : "mt-2",
          )}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <Users className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{client?.name}</span>
          </div>
        </div>

        <div
          className={cn(
            "flex items-center justify-between mt-1.5",
            isMobile && "mt-1",
          )}
        >
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarClock className="h-3.5 w-3.5 shrink-0" />
            {offer.nextContact && format(new Date(offer.nextContact), "MMM d")}
          </div>
          <div className="text-xs font-medium">
            €{(Number(offer.totalAmount) || 0).toFixed(2)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
