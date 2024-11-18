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
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Offer, Client } from "db/schema";
import { format } from "date-fns";

const OFFER_STATUS = ["draft", "sent", "accepted", "rejected"] as const;

export default function Pipeline() {
  const { toast } = useToast();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const { data: offers, error: offersError } = useSWR<Offer[]>("/api/offers");
  const { data: clients } = useSWR<Client[]>("/api/clients");
  const { data: stats } = useSWR("/api/stats");

  const sensors = useSensors(
    useSensor(PointerSensor),
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

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    
    if (!over) return;

    const offerId = active.id;
    const newStatus = over.id;

    if (newStatus === activeId) return;

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/offers/${offerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error("Failed to update offer status");

      toast({
        title: "Success",
        description: "Offer status updated successfully",
      });

      mutate("/api/offers");
      mutate("/api/stats");
    } catch (error) {
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

  const calculateStats = () => {
    if (!offers) return { totalValue: 0, conversionRates: {}, avgTime: {} };

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
      const createdAt = new Date(offer.createdAt);
      const updatedAt = new Date(offer.updatedAt);
      const timeInStage = updatedAt.getTime() - createdAt.getTime();
      acc[offer.status] = (acc[offer.status] || 0) + timeInStage;
      return acc;
    }, {} as Record<string, number>);

    Object.keys(avgTime).forEach(status => {
      avgTime[status] = avgTime[status] / (statusCounts[status] || 1) / (1000 * 60 * 60 * 24); // Convert to days
    });

    return { totalValue, conversionRates, avgTime };
  };

  const { totalValue, conversionRates, avgTime } = calculateStats();

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
              <div
                key={status}
                id={status}
                className="bg-muted p-4 rounded-lg space-y-4"
              >
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
                      <Card
                        key={offer.id}
                        className="cursor-move"
                        data-id={offer.id}
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
                              {format(new Date(offer.updatedAt), "MMM d")}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </div>
            ))}
          </div>

          <DragOverlay>
            {activeId && (
              <Card className="w-[calc(25%-20px)] opacity-80">
                <CardContent className="p-4">
                  <div className="animate-pulse bg-muted h-4 w-3/4 rounded mb-2" />
                  <div className="animate-pulse bg-muted h-3 w-1/2 rounded" />
                </CardContent>
              </Card>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {isUpdating && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}
    </div>
  );
}
