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
        "p-4 rounded-lg bg-muted/50 min-h-[200px]",
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
  const [isDragging, setIsDragging] = useState(false);

  if (!offers) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="pb-20">
        <Tabs
          value={activeStatus}
          onValueChange={(value) => onStatusChange(value as OfferStatus)}
          className="relative"
        >
          {/* Status Tabs */}
          <div className="sticky top-0 bg-background z-50 pb-2 border-b">
            <TabsList className="grid grid-cols-2 gap-1 p-1 mb-2 h-auto">
              {OFFER_STATUS.map((status) => (
                <TabsTrigger
                  key={status}
                  value={status}
                  className={cn(
                    "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
                    "relative px-3 py-2 h-auto",
                    targetStatus === status && "bg-accent",
                    isDragging && "touch-none",
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
                    if (draggedOfferId && targetStatus) {
                      onDragEnd(draggedOfferId, targetStatus);
                      setDraggedOfferId(null);
                      setTargetStatus(null);
                      setIsDragging(false);
                    }
                  }}
                  onTouchStart={() => {
                    if (draggedOfferId && targetStatus !== status) {
                      onDragEnd(draggedOfferId, status);
                      setDraggedOfferId(null);
                      setTargetStatus(null);
                      setIsDragging(false);
                    }
                  }}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs font-medium truncate">
                      {status}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted">
                      {offers.filter((o) => o.status === status).length}
                    </span>
                  </div>
                  {targetStatus === status && (
                    <div className="absolute inset-0 bg-accent/20 rounded-md pointer-events-none" />
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Content */}
          <div className="mt-2">
            {OFFER_STATUS.map((status) => (
              <TabsContent
                key={status}
                value={status}
                className="focus-visible:outline-none data-[state=inactive]:hidden"
              >
                <div className="space-y-2 px-2">
                  {offers
                    .filter((offer) => offer.status === status)
                    .map((offer) => (
                      <div
                        key={offer.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = "move";
                          setDraggedOfferId(offer.id);
                          setIsDragging(true);
                          // Add a small delay to show the drag image
                          setTimeout(() => {
                            const dragImage = document.createElement("div");
                            dragImage.className = "hidden";
                            document.body.appendChild(dragImage);
                            e.dataTransfer.setDragImage(dragImage, 0, 0);
                            document.body.removeChild(dragImage);
                          }, 0);
                        }}
                        onDragEnd={() => {
                          setDraggedOfferId(null);
                          setTargetStatus(null);
                          setIsDragging(false);
                        }}
                        onTouchStart={() => {
                          setDraggedOfferId(offer.id);
                          setIsDragging(true);
                        }}
                        onTouchEnd={() => {
                          setTimeout(() => {
                            setIsDragging(false);
                          }, 100);
                        }}
                        className={cn(
                          "touch-none active:opacity-50",
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
          </div>
        </Tabs>

        {draggedOfferId && (
          <div className="fixed bottom-20 left-4 right-4 z-50 pointer-events-none">
            <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 text-foreground rounded-lg p-3 shadow-lg border text-sm text-center">
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
