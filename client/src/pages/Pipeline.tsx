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
        delay: isMobile ? 150 : 100,
        tolerance: isMobile ? 8 : 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const { totalValue, conversionRates, avgTime } = usePipelineStats(offers);

  if (offersError) {
    return (
      <div className="text-center text-destructive">
        Error loading data. Please try again later.
      </div>
    );
  }

  const handleDragStart = (event: any) => {
    const target =
      event.active.data.current?.sortable?.node || event.active.node;
    if (target?.closest("[data-no-drag]")) return;
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;

    if (!over || !offers) return;

    const offerId = active.id as string;
    const newStatus = over.id as OfferStatus;

    const offer = offers.find((o) => o.id === offerId);
    if (!offer || newStatus === offer.status) return;

    setIsUpdating(true);
    try {
      const updateData = {
        id: offer.id,
        title: offer.title,
        clientId: offer.clientId,
        status: newStatus,
        totalAmount: offer.totalAmount,
        notes: offer.notes || null,
        validUntil: offer.validUntil
          ? new Date(offer.validUntil).toISOString()
          : null,
        lastContact: offer.lastContact
          ? new Date(offer.lastContact).toISOString()
          : null,
        nextContact: offer.nextContact
          ? new Date(offer.nextContact).toISOString()
          : null,
      };

      const response = await fetch(`/api/offers/${offerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error("Failed to update offer status");
      }

      toast({
        title: "Success",
        description: "Offer status updated successfully",
      });

      mutate("/api/offers");
      mutate("/api/stats");
    } catch (error) {
      console.error("Drag and drop error:", error);
      toast({
        title: "Error",
        description: "Failed to update offer status",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
      setActiveId(null);
    }
  };

  const activeOffer = activeId ? offers?.find((o) => o.id === activeId) : null;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold px-4 md:px-0">Pipeline</h1>

      <div
        className={cn(
          "grid gap-4",
          isMobile ? "grid-cols-2 px-4" : "grid-cols-4",
        )}
      >
        <StatsCard
          title="Total Pipeline Value"
          value={`€${totalValue.toFixed(2)}`}
        />
        <StatsCard
          title="Draft → Sent Rate"
          value={`${conversionRates.sent.toFixed(1)}%`}
        />
        <StatsCard
          title="Sent → Accepted Rate"
          value={`${conversionRates.accepted.toFixed(1)}%`}
        />
        <StatsCard
          title="Avg. Time in Pipeline"
          value={`${Object.values(avgTime)
            .reduce((a, b) => a + b, 0)
            .toFixed(1)} days`}
        />
      </div>

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

      <div className={cn(!isMobile && "px-4")}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
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
            {activeId && activeOffer && (
              <DraggableCard
                offer={activeOffer}
                clients={clients}
                isMobile={isMobile}
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
                initialData={{
                  ...selectedOffer,
                  validUntil: selectedOffer.validUntil
                    ? new Date(selectedOffer.validUntil).toISOString()
                    : null,
                  lastContact: selectedOffer.lastContact
                    ? new Date(selectedOffer.lastContact).toISOString()
                    : null,
                  nextContact: selectedOffer.nextContact
                    ? new Date(selectedOffer.nextContact).toISOString()
                    : null,
                }}
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
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}
    </div>
  );
}
