import { useDraggable } from "@dnd-kit/core";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Clock, CalendarClock, Eye } from "lucide-react";
import { format } from "date-fns";
import type { Offer, Client } from "db/schema";

interface DraggableCardProps {
  offer: Offer;
  clients?: Client[];
  onClick?: () => void;
  activeId: string | null;
}

export function DraggableCard({ 
  offer, 
  clients, 
  onClick,
  activeId 
}: DraggableCardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: offer.id,
  });
  
  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition: transform ? 'none' : undefined,
    touchAction: 'none',
    position: 'relative' as const,
    zIndex: transform ? '50' : undefined,
    opacity: activeId === offer.id ? 0 : 1,
  };

  const client = clients?.find(c => c.id === offer.clientId);
  
  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="cursor-move hover:shadow-md transition-shadow"
      {...attributes}
      {...listeners}
    >
      <CardContent className="p-4 space-y-3">
        <div className="font-medium">{offer.title}</div>
        
        {client && (
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Users className="h-4 w-4" />
            {client.name}
          </div>
        )}
        
        <div className="flex flex-col gap-1 text-xs">
          {offer.lastContact && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Last: {format(new Date(offer.lastContact), "MMM d, yyyy")}
            </div>
          )}
          {offer.nextContact && (
            <div className="flex items-center gap-1">
              <CalendarClock className="h-3 w-3" />
              Next: {format(new Date(offer.nextContact), "MMM d, yyyy")}
            </div>
          )}
        </div>
        
        {offer.notes && (
          <div className="text-xs text-muted-foreground line-clamp-2">
            {offer.notes}
          </div>
        )}

        <div className="flex justify-between items-center pt-2 border-t">
          <div className="px-2 py-1 text-xs font-medium rounded-full bg-secondary">
            €{(Number(offer.totalAmount) || 0).toFixed(2)}
          </div>
          <Button
            variant="ghost"
            size="sm"
            data-no-drag
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.currentTarget.style.pointerEvents = 'none';
              setTimeout(() => {
                e.currentTarget.style.pointerEvents = 'auto';
              }, 100);
              onClick?.();
            }}
          >
            <Eye className="h-4 w-4 mr-2" />
            View
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
