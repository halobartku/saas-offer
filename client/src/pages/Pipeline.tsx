import { useState } from "react";
import useSWR, { mutate } from "swr";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Offer, Client } from "db/schema";
import { format } from "date-fns";
import OfferForm from "@/components/OfferForm";
import { DroppableColumn } from "@/components/DroppableColumn";

const OFFER_STATUS = ["draft", "sent", "accepted", "rejected"] as const;
type OfferStatus = typeof OFFER_STATUS[number];

export default function Pipeline() {
  const { toast } = useToast();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [draggedOffer, setDraggedOffer] = useState<Offer | null>(null);
  
  const { data: offers, error: offersError } = useSWR<Offer[]>("/api/offers");
  const { data: clients } = useSWR<Client[]>("/api/clients");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  if (offersError) {
    return (
      <div className="text-center text-destructive">
        Error loading data. Please try again later.
      </div>
    );
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    const draggedOffer = offers?.find(o => o.id === active.id);
    if (draggedOffer) {
      setDraggedOffer(draggedOffer);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || !offers) {
      setActiveId(null);
      setDraggedOffer(null);
      return;
    }

    const offerId = active.id as string;
    const newStatus = over.id as OfferStatus;

    const offer = offers.find(o => o.id === offerId);
    if (!offer || offer.status === newStatus) {
      setActiveId(null);
      setDraggedOffer(null);
      return;
    }

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/offers/${offerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...offer,
          status: newStatus,
          validUntil: offer.validUntil ? new Date(offer.validUntil) : null,
          lastContact: offer.lastContact ? new Date(offer.lastContact) : null,
          nextContact: offer.nextContact ? new Date(offer.nextContact) : null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update offer status");
      }

      toast({
        title: "Success",
        description: "Offer status updated successfully",
      });

      mutate("/api/offers");
      mutate("/api/stats");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update offer status",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
      setActiveId(null);
      setDraggedOffer(null);
    }
  };

  const calculateStats = () => {
    if (!offers) return { totalValue: 0, conversionRates: { sent: 0, accepted: 0 }, avgTime: {} };

    const totalValue = offers.reduce((sum, offer) => sum + Number(offer.totalAmount || 0), 0);
    
    const statusCounts = offers.reduce((acc, offer) => {
      acc[offer.status] = (acc[offer.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const conversionRates = {
      sent: ((statusCounts.sent || 0) / (statusCounts.draft || 1)) * 100,
      accepted: ((statusCounts.accepted || 0) / (statusCounts.sent || 1)) * 100,
    };

    const avgTime = offers.reduce((acc, offer) => {
      if (!offer.createdAt || !offer.updatedAt) return acc;

      const createdAt = new Date(offer.createdAt).getTime();
      const updatedAt = new Date(offer.updatedAt).getTime();
      const timeInStage = updatedAt - createdAt;
      acc[offer.status] = (acc[offer.status] || 0) + timeInStage;
      return acc;
    }, {} as Record<string, number>);

    Object.keys(avgTime).forEach(status => {
      avgTime[status] = avgTime[status] / (statusCounts[status] || 1) / (1000 * 60 * 60 * 24);
    });

    return { totalValue, conversionRates, avgTime };
  };

  const { totalValue, conversionRates, avgTime } = calculateStats();

  const renderCard = (offer: Offer) => (
    <Card
      key={offer.id}
      className={`cursor-move hover:shadow-md transition-shadow ${
        activeId === offer.id ? 'opacity-50' : ''
      }`}
      onClick={() => {
        setSelectedOffer(offer);
        setIsEditOpen(true);
      }}
    >
      <CardContent className="p-4 space-y-2">
        <div className="font-medium">{offer.title}</div>
        <div className="text-sm text-muted-foreground">
          {clients?.find((c) => c.id === offer.clientId)?.name}
        </div>
        <div className="flex justify-between items-center">
          <Badge variant="secondary">
            €{Number(offer.totalAmount).toFixed(2)}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {offer.updatedAt && format(new Date(offer.updatedAt), "MMM d")}
          </span>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Pipeline</h1>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-muted-foreground mb-1">
              Total Pipeline Value
            </div>
            <div className="text-2xl font-bold">
              €{Number(totalValue).toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-muted-foreground mb-1">
              Draft → Sent Rate
            </div>
            <div className="text-2xl font-bold">
              {conversionRates.sent.toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-muted-foreground mb-1">
              Sent → Accepted Rate
            </div>
            <div className="text-2xl font-bold">
              {conversionRates.accepted.toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-muted-foreground mb-1">
              Avg. Time in Pipeline
            </div>
            <div className="text-2xl font-bold">
              {Object.values(avgTime).reduce((a, b) => a + b, 0).toFixed(1)} days
            </div>
          </CardContent>
        </Card>
      </div>

      {!offers ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-4 gap-4">
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
                    .map((offer) => renderCard(offer))}
                </div>
              </DroppableColumn>
            ))}
          </div>

          <DragOverlay>
            {draggedOffer && activeId && (
              <div className="transform-gpu">
                {renderCard(draggedOffer)}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {selectedOffer && (
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
      )}

      {isUpdating && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}
    </div>
  );
}
