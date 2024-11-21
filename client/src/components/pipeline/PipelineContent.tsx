// /components/pipeline/PipelineContent.tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DroppableColumn } from "@/components/DroppableColumn";
import { Loader2 } from "lucide-react";
import type { Offer, Client } from "db/schema";
import { DraggableCard } from "./DraggableCard";

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
}

export function PipelineContent({
  offers,
  clients,
  isMobile,
  activeStatus,
  onStatusChange,
  onOfferSelect,
}: PipelineContentProps) {
  if (!offers) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isMobile) {
    return (
      <Tabs
        value={activeStatus}
        onValueChange={(value) => onStatusChange(value as OfferStatus)}
      >
        <TabsList className="grid grid-cols-3 mb-4">
          {OFFER_STATUS.map((status) => (
            <TabsTrigger
              key={status}
              value={status}
              className="text-xs sm:text-sm whitespace-nowrap"
            >
              {status} ({offers.filter((o) => o.status === status).length})
            </TabsTrigger>
          ))}
        </TabsList>

        {OFFER_STATUS.map((status) => (
          <TabsContent key={status} value={status}>
            <DroppableColumn
              id={status}
              status={status}
              className="min-h-[70vh]"
            >
              <div className="space-y-4 pb-20">
                {offers
                  .filter((offer) => offer.status === status)
                  .map((offer) => (
                    <DraggableCard
                      key={offer.id}
                      offer={offer}
                      clients={clients}
                      onClick={() => onOfferSelect(offer)}
                      isMobile={true}
                    />
                  ))}
              </div>
            </DroppableColumn>
          </TabsContent>
        ))}
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
