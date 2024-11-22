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
                  data-droppable-id={status}
                  className={cn(
                    "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
                    "relative px-3 py-2 h-auto",
                    isDragging && status !== activeStatus && "bg-accent/50",
                  )}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs font-medium truncate">
                      {status}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted">
                      {offers.filter((o) => o.status === status).length}
                    </span>
                  </div>
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
                      <div key={offer.id} className="touch-none">
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

        {isDragging && (
          <div className="fixed bottom-20 left-4 right-4 z-50 pointer-events-none">
            <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 text-foreground rounded-lg p-3 shadow-lg border text-sm text-center">
              Drop on a status tab to move the offer
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
