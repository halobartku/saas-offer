// /components/pipeline/PipelineContent.tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import type { Offer, Client } from "db/schema";
import { DraggableCard } from "./DraggableCard";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";

function DroppableColumn({
  id,
  status,
  children,
}: {
  id: string;
  status: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "p-4 rounded-lg bg-muted/50 min-h-[200px] transition-colors duration-200",
        isOver && "ring-2 ring-primary/20",
      )}
    >
      {children}
    </div>
  );
}

const OFFER_STATUS = [
  "draft",
  "sent",
  "accepted",
  "rejected",
  "Close & Paid",
  "Paid & Delivered",
] as const;
type OfferStatus = (typeof OFFER_STATUS)[number];

interface PipelineContentProps {
  offers?: Offer[];
  clients?: Client[];
  isMobile: boolean;
  activeStatus: OfferStatus;
  onStatusChange: (status: OfferStatus) => void;
  onOfferSelect: (offer: Offer) => void;
  onDragEnd: (offerId: string, newStatus: OfferStatus) => void;
}

export function PipelineContent({
  offers,
  clients,
  isMobile,
  activeStatus,
  onStatusChange,
  onOfferSelect,
  onDragEnd,
}: PipelineContentProps) {
  const [draggedOfferId, setDraggedOfferId] = useState<string | null>(null);
  const [targetStatus, setTargetStatus] = useState<OfferStatus | null>(null);

  if (!offers) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isMobile) {
    const handleDragStart = (e: React.DragEvent, offerId: string) => {
      e.dataTransfer.effectAllowed = "move";
      setDraggedOfferId(offerId);
    };

    const handleDragEnd = () => {
      if (draggedOfferId && targetStatus) {
        onDragEnd(draggedOfferId, targetStatus);
      }
      setDraggedOfferId(null);
      setTargetStatus(null);
    };

    return (
      <div className="pb-20">
        <Tabs
          value={activeStatus}
          onValueChange={(value) => onStatusChange(value as OfferStatus)}
          className="relative"
        >
          <TabsList className="grid grid-cols-3 mb-4 sticky top-0 bg-background z-10">
            {OFFER_STATUS.map((status) => (
              <TabsTrigger
                key={status}
                value={status}
                className={cn(
                  "text-xs sm:text-sm whitespace-nowrap relative px-2 py-1.5",
                  targetStatus === status && "bg-accent",
                )}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  setTargetStatus(status);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setTargetStatus(null);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDragEnd();
                }}
              >
                <div className="flex flex-col items-center gap-1">
                  <span className="truncate font-medium">{status}</span>
                  <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                    {offers.filter((o) => o.status === status).length}
                  </span>
                </div>
              </TabsTrigger>
            ))}
          </TabsList>

          {OFFER_STATUS.map((status) => (
            <TabsContent
              key={status}
              value={status}
              className="focus-visible:outline-none min-h-[70vh]"
            >
              <div className="space-y-2">
                {offers
                  .filter((offer) => offer.status === status)
                  .map((offer) => (
                    <div
                      key={offer.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, offer.id)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        "touch-none",
                        draggedOfferId === offer.id && "opacity-50",
                      )}
                    >
                      <DraggableCard
                        offer={offer}
                        clients={clients}
                        onClick={() => onOfferSelect(offer)}
                        isMobile={true}
                      />
                    </div>
                  ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {draggedOfferId && (
          <div className="fixed bottom-24 left-4 right-4 z-50 pointer-events-none">
            <div className="bg-background text-foreground rounded-lg p-4 shadow-lg border text-sm text-center">
              Drag to a status tab to move the offer
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-6 gap-4">
      {OFFER_STATUS.map((status) => (
        <DroppableColumn key={status} id={status} status={status}>
          <h3 className="font-semibold capitalize flex justify-between items-center mb-4">
            {status}
            <span className="text-sm text-muted-foreground">
              {offers.filter((o) => o.status === status).length}
            </span>
          </h3>
          <div className="space-y-2">
            {offers
              .filter((offer) => offer.status === status)
              .map((offer) => (
                <DraggableCard
                  key={offer.id}
                  offer={offer}
                  clients={clients}
                  onClick={() => onOfferSelect(offer)}
                />
              ))}
          </div>
        </DroppableColumn>
      ))}
    </div>
  );
}
