// /components/pipeline/PipelineContent.tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Loader2, MoveRight, Eye, Edit } from "lucide-react";
import type { Offer, Client } from "db/schema";
import { DraggableCard } from "./DraggableCard";
import { cn } from "@/lib/utils";
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
  onDragEnd: (offerId: string, newStatus: OfferStatus) => Promise<void>;
  onEdit: (offer: Offer) => void;
}

export function PipelineContent({
  offers,
  clients,
  isMobile,
  activeStatus,
  onStatusChange,
  onOfferSelect,
  onDragEnd,
  onEdit,
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
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground relative px-3 py-2 h-auto"
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
                <div className="space-y-3 px-2">
                  {offers
                    .filter((offer) => offer.status === status)
                    .map((offer) => (
                      <div
                        key={offer.id}
                        className="relative bg-card rounded-lg border shadow-sm"
                      >
                        <div className="absolute right-2 top-2 z-10 flex items-center gap-1">
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOfferSelect(offer);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEdit(offer);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <MoveRight className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              {OFFER_STATUS.filter((s) => s !== status).map(
                                (newStatus) => (
                                  <DropdownMenuItem
                                    key={newStatus}
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      onDragEnd(offer.id, newStatus);
                                    }}
                                    className="cursor-pointer"
                                  >
                                    Move to {newStatus}
                                  </DropdownMenuItem>
                                ),
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <div
                          className="p-3 pt-12"
                          onClick={() => onOfferSelect(offer)}
                        >
                          <div className="font-medium mb-2">{offer.title}</div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              👤{" "}
                              {
                                clients?.find((c) => c.id === offer.clientId)
                                  ?.name
                              }
                            </div>
                            <div>€{Number(offer.totalAmount).toFixed(2)}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </div>
    );
  }

  // Desktop view
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
                  onEdit={(o) => onEdit(o)}
                />
              ))}
          </div>
        </DroppableColumn>
      ))}
    </div>
  );
}
