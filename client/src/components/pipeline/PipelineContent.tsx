// /components/pipeline/PipelineContent.tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import type { Offer, Client } from "db/schema";
import { DraggableCard } from "./DraggableCard";
import { cn } from "@/lib/utils";
import { useState } from "react";

// Create DroppableColumn component inline since it's only used in desktop view
function DroppableColumn({
  id,
  status,
  children,
}: {
  id: string;
  status: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "p-4 rounded-lg bg-muted/50 min-h-[200px]",
        "transition-colors duration-200",
      )}
      data-status={status}
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
    const handleDragStart = (offerId: string) => {
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
                "text-xs sm:text-sm whitespace-nowrap relative",
                targetStatus === status && "bg-accent",
              )}
              onDragOver={(e) => {
                e.preventDefault();
                setTargetStatus(status);
              }}
              onDragLeave={(e) => {
                // Only clear if we're not entering a child element
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
                <span className="truncate">{status}</span>
                <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                  {offers.filter((o) => o.status === status).length}
                </span>
              </div>
              {targetStatus === status && (
                <div className="absolute inset-0 bg-accent/20 rounded-md pointer-events-none" />
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {OFFER_STATUS.map((status) => (
          <TabsContent
            key={status}
            value={status}
            className="min-h-[70vh] focus-visible:outline-none"
          >
            <div className="space-y-3 pb-20">
              {offers
                .filter((offer) => offer.status === status)
                .map((offer) => (
                  <div
                    key={offer.id}
                    draggable
                    onDragStart={() => handleDragStart(offer.id)}
                    onDragEnd={handleDragEnd}
                    className={cn(draggedOfferId === offer.id && "opacity-50")}
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

        {draggedOfferId && (
          <div className="fixed bottom-20 left-0 right-0 px-4 z-50 pointer-events-none">
            <div className="bg-background text-foreground rounded-lg p-4 shadow-lg border text-sm text-center">
              Drag to a status tab to move the offer
            </div>
          </div>
        )}
      </Tabs>
    );
  }

  return (
    <div className="grid grid-cols-6 gap-4">
      {OFFER_STATUS.map((status) => (
        <DroppableColumn key={status} id={status} status={status}>
          <h3 className="font-semibold capitalize flex justify-between items-center">
            {status}
            <span className="text-sm text-muted-foreground">
              {offers.filter((o) => o.status === status).length}
            </span>
          </h3>
          <div className="space-y-4">
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
