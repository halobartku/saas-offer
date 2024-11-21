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
  const dragProps = !isMobile
    ? useDraggable({
        id: offer.id,
      })
    : {
        attributes: {},
        listeners: {},
        setNodeRef: () => {},
        transform: null,
      };

  const style = !isMobile
    ? {
        transform: dragProps.transform
          ? `translate3d(${dragProps.transform.x}px, ${dragProps.transform.y}px, 0)`
          : undefined,
        transition: dragProps.transform ? "none" : undefined,
        touchAction: "none",
        position: "relative" as const,
        zIndex: dragProps.transform ? "50" : undefined,
      }
    : {};

  const client = clients?.find((c) => c.id === offer.clientId);

  return (
    <Card
      ref={!isMobile ? dragProps.setNodeRef : undefined}
      style={style}
      className={cn(
        "hover:shadow-md transition-shadow",
        isMobile ? "touch-none" : "cursor-move",
      )}
      {...(!isMobile && dragProps.attributes)}
      {...(!isMobile && dragProps.listeners)}
    >
      <CardContent className="p-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="font-medium text-sm truncate">{offer.title}</div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onClick?.();
              }}
              data-no-drag
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 shrink-0" />
              <span className="truncate">{client?.name}</span>
            </div>
            {offer.nextContact && (
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 shrink-0" />
                Next: {format(new Date(offer.nextContact), "MMM d, yyyy")}
              </div>
            )}
            {offer.lastContact && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0" />
                Last: {format(new Date(offer.lastContact), "MMM d, yyyy")}
              </div>
            )}
          </div>

          <div className="text-sm font-medium">
            €{(Number(offer.totalAmount) || 0).toFixed(2)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
