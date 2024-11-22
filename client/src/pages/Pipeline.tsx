// /pages/Pipeline.tsx
import { useState } from "react";
import useSWR, { mutate } from "swr";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import type { Offer, Client } from "db/schema";
import { usePipelineStats } from "@/hooks/use-pipeline-stats";
import { DraggableCard } from "@/components/pipeline/DraggableCard";
import { StatsCard } from "@/components/pipeline/StatsCard";
import { CalendarSection } from "@/components/pipeline/CalendarSection";
import { PipelineContent } from "@/components/pipeline/PipelineContent";
import OfferForm from "@/components/OfferForm";
import ViewOfferDialog from "@/components/ViewOfferDialog";

const OFFER_STATUS = [
  "draft",
  "sent",
  "accepted",
  "rejected",
  "Close & Paid",
  "Paid & Delivered",
] as const;
type OfferStatus = (typeof OFFER_STATUS)[number];

export default function Pipeline() {
  const { toast } = useToast();
  const [activeId, setActiveId] = useState<string | null>(null);
  const isMobile = useMobile();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(false);
  const [activeStatus, setActiveStatus] = useState<OfferStatus>("draft");

  const { data: offers, error: offersError } = useSWR<Offer[]>("/api/offers");
  const { data: clients } = useSWR<Client[]>("/api/clients");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: isMobile ? 10 : 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const { totalValue, conversionRates, avgTime } = usePipelineStats(offers);

  if (offersError) {
    return (
      <div className="text-center text-destructive p-4">
        Error loading data. Please try again later.
      </div>
    );
  }

  const handleDragStart = (event: DragStartEvent) => {
    if (!isMobile) {
      setActiveId(event.active.id as string);
    }
  };

  const handleDragEnd = async (offerId: string, newStatus: OfferStatus) => {
    if (!offers) return;

    const offer = offers.find((o) => o.id === offerId);
    if (!offer || newStatus === offer.status) return;

    // Prevent multiple simultaneous updates
    if (isUpdating) return;

    setIsUpdating(true);
    const originalStatus = offer.status;

    try {
      // Send update to server first
      const response = await fetch(`/api/offers/${offerId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
          lastContact: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || "Failed to update offer status");
      }

      // Get the updated offer from server response
      const updatedOffer = await response.json();

      // Update local state with server response
      const updatedOffers = offers.map((o) =>
        o.id === offerId ? updatedOffer : o
      );

      // Update cache with server response
      await mutate("/api/offers", updatedOffers, false);
      
      // Show success message
      toast({
        title: "Status updated",
        description: `Offer moved to ${newStatus}`,
      });

      // Invalidate and refetch all related data
      await Promise.all([
        mutate("/api/offers", undefined, true),
        mutate("/api/stats", undefined, true)
      ]);

    } catch (error) {
      console.error("Status update error:", error);

      // Show error message
      toast({
        title: "Error updating status",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });

      // Revert to original state and refetch to ensure consistency
      const revertedOffers = offers.map((o) =>
        o.id === offerId ? { ...offer, status: originalStatus } : o
      );
      await mutate("/api/offers", revertedOffers, false);
      await mutate("/api/offers", undefined, true);

    } finally {
      setIsUpdating(false);
      setActiveId(null);
    }
  };

  const handleDesktopDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || !offers) return;

    const offerId = active.id as string;
    const newStatus = over.id as OfferStatus;

    await handleDragEnd(offerId, newStatus);
  };

  const activeOffer = activeId ? offers?.find((o) => o.id === activeId) : null;

  return (
    <div className="space-y-4 md:space-y-6 pb-20 md:pb-6">
      <h1 className="text-2xl md:text-3xl font-bold px-4 md:px-0">Pipeline</h1>

      <div
        className={cn(
          "grid gap-3 px-4 md:gap-4 md:px-0",
          isMobile ? "grid-cols-2" : "grid-cols-4",
        )}
      >
        <StatsCard
          title="Total Pipeline Value"
          value={`€${totalValue.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`}
        />
        <StatsCard
          title={isMobile ? "Draft → Sent" : "Draft → Sent Rate"}
          value={`${conversionRates.sent}%`}
        />
        <StatsCard
          title={isMobile ? "Sent → Accept" : "Sent → Accepted Rate"}
          value={`${conversionRates.accepted}%`}
        />
        <StatsCard
          title={isMobile ? "Avg. Time" : "Avg. Time in Pipeline"}
          value={`${avgTime} days`}
        />
      </div>

      <div className="px-4 md:px-0">
        <CalendarSection
          offers={offers}
          clients={clients}
          isMobile={isMobile}
          isExpanded={isCalendarExpanded}
          selectedDate={selectedDate}
          onExpandToggle={() => setIsCalendarExpanded(!isCalendarExpanded)}
          onDateSelect={setSelectedDate}
          onOfferSelect={(offer) => {
            setSelectedOffer(offer);
            setIsViewOpen(true);
          }}
        />
      </div>

      <div className={cn("md:px-4")}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDesktopDragEnd}
        >
          <PipelineContent
            offers={offers}
            clients={clients}
            isMobile={isMobile}
            activeStatus={activeStatus}
            onStatusChange={(status) => setActiveStatus(status as OfferStatus)}
            onOfferSelect={(offer) => {
              setSelectedOffer(offer);
              setIsViewOpen(true);
            }}
            onDragEnd={handleDragEnd}
          />

          <DragOverlay>
            {activeId && activeOffer && !isMobile && (
              <DraggableCard
                offer={activeOffer}
                clients={clients}
                isMobile={false}
              />
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {selectedOffer && (
        <>
          <ViewOfferDialog
            offer={selectedOffer}
            open={isViewOpen}
            onOpenChange={(open) => {
              setIsViewOpen(open);
              if (!open) setSelectedOffer(null);
            }}
          />

          <Dialog
            open={isEditOpen}
            onOpenChange={(open) => {
              setIsEditOpen(open);
              if (!open) setSelectedOffer(null);
            }}
          >
            <DialogContent className="max-w-3xl">
              <OfferForm
                initialData={selectedOffer}
                onSuccess={() => {
                  mutate("/api/offers");
                  mutate("/api/stats");
                  setIsEditOpen(false);
                  setSelectedOffer(null);
                }}
                onClose={() => {
                  setIsEditOpen(false);
                  setSelectedOffer(null);
                }}
              />
            </DialogContent>
          </Dialog>
        </>
      )}

      {isUpdating && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}
    </div>
  );
}
