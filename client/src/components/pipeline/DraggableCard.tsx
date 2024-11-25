// /components/pipeline/DraggableCard.tsx
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, Edit, CalendarClock, StickyNote, User } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Offer, Client } from "db/schema";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";

interface DraggableCardProps {
  offer: Offer;
  clients?: Client[];
  onClick?: () => void;
}

export function DraggableCard({ offer, clients, onClick }: DraggableCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: offer.id,
      data: {
        type: "offer",
        offer,
      },
    });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    transition: 'none',
    zIndex: 1000,
    touchAction: 'none',
    willChange: 'transform',
    opacity: isDragging ? 0.6 : 1,
  } : {
    transition: 'transform 0.2s cubic-bezier(0.2, 0, 0, 1), opacity 0.2s ease',
    touchAction: 'none',
    opacity: 1,
  };

  const client = clients?.find((c) => c.id === offer.clientId);

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <Card
          ref={setNodeRef}
          style={style}
          className={cn(
            "hover:shadow-md transition-shadow cursor-move",
            isDragging && "opacity-50",
          )}
          {...attributes}
          {...listeners}
        >
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="font-medium text-sm truncate flex-1">
            {offer.title}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                onClick?.();
              }}
              data-no-drag
            >
              <Eye className="h-4 w-4" />
            </Button>
            
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground mt-2">
          <div className="flex flex-col gap-0.5 min-w-0">
              <span className="truncate">{client?.name}</span>
              <span className="text-xs text-muted-foreground truncate flex items-center gap-1">
                <User className="h-3 w-3" />
                {client?.contactPerson || "-"}
              </span>
            </div>
          <div className="text-xs font-medium">
            €{Number(offer.totalAmount).toFixed(2)}
          </div>
        </div>
      </CardContent>
    </Card>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="space-y-2">
          {offer.nextContact && (
            <div className="flex items-start gap-2">
              <CalendarClock className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <div className="font-medium mb-0.5">Next Contact</div>
                <div className="text-sm text-muted-foreground">
                  {format(new Date(offer.nextContact), "PPP")}
                </div>
              </div>
            </div>
          )}
          {offer.lastContact && (
            <div className="flex items-start gap-2">
              <CalendarClock className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <div className="font-medium mb-0.5">Last Contact</div>
                <div className="text-sm text-muted-foreground">
                  {format(new Date(offer.lastContact), "PPP")}
                </div>
              </div>
            </div>
          )}
          {offer.notes && (
            <div className="flex items-start gap-2">
              <StickyNote className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <div className="font-medium mb-0.5">Notes</div>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {offer.notes}
                </div>
              </div>
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
