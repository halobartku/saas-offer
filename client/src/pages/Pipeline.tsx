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
  DragEndEvent,
  DragStartEvent
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Loader2, Users, Clock, CalendarClock, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Offer, Client } from "db/schema";
import { format, addWeeks, startOfWeek, endOfWeek, getWeek, isWithinInterval } from "date-fns";
import { cn } from "@/lib/utils";
import OfferForm from "@/components/OfferForm";
import ViewOfferDialog from "@/components/ViewOfferDialog";
import { DroppableColumn } from "@/components/DroppableColumn";
import { DraggableCard } from "@/components/pipeline/DraggableCard";

const OFFER_STATUS = ["draft", "sent", "accepted", "rejected", "Close & Paid", "Paid & Delivered"] as const;
type OfferStatus = typeof OFFER_STATUS[number];

export default function Pipeline() {
  const { toast } = useToast();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(true);
  
  const { data: offers, error: offersError } = useSWR<Offer[]>("/api/offers");
  const { data: clients } = useSWR<Client[]>("/api/clients");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
        delay: 50,
        tolerance: 5,
      },
      canStartDragging: (event) => {
        const target = event.target as HTMLElement;
        return !target.closest('button') && !target.closest('[data-no-drag]');
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
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || !offers) return;

    const offerId = active.id as string;
    const newStatus = over.id as OfferStatus;

    const offer = offers.find(o => o.id === offerId);
    if (!offer || newStatus === offer.status) return;

    setIsUpdating(true);
    try {
      const updateData = {
        ...offer,
        status: newStatus,
        validUntil: offer.validUntil ? new Date(offer.validUntil).toISOString() : null,
        lastContact: offer.lastContact ? new Date(offer.lastContact).toISOString() : null,
        nextContact: offer.nextContact ? new Date(offer.nextContact).toISOString() : null
      };

      const response = await fetch(`/api/offers/${offerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update offer status");
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

  const calculateStats = () => {
    if (!offers) return { totalValue: 0, conversionRates: { sent: 0, accepted: 0 }, avgTime: {} };

    const totalValue = offers.reduce((sum, offer) => sum + (Number(offer.totalAmount) || 0), 0);
    
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
  const activeOffer = activeId ? offers?.find(o => o.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Pipeline</h1>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm font-medium text-muted-foreground mb-1">
                Total Pipeline Value
              </div>
              <div className="text-2xl font-bold">
                €{totalValue.toFixed(2)}
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

        {/* Contact Schedule */}
        <Card>
          <CardHeader 
            className="flex flex-row items-center justify-between cursor-pointer" 
            onClick={() => setIsCalendarExpanded(!isCalendarExpanded)}
          >
            <CardTitle>Contact Schedule</CardTitle>
            <Button variant="ghost" size="sm">
              {isCalendarExpanded ? "Collapse" : "Expand"}
            </Button>
          </CardHeader>
          <CardContent className={cn(
            "transition-all overflow-hidden",
            isCalendarExpanded ? "max-h-[800px]" : "max-h-[300px] py-4"
          )}>
            {isCalendarExpanded ? (
              <div className="grid grid-cols-[280px_1fr] gap-6">
                <div>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    modifiers={{
                      booked: offers?.filter(o => o.nextContact).map(o => new Date(o.nextContact))
                    }}
                    modifiersStyles={{
                      booked: { 
                        backgroundColor: 'hsl(var(--success-light, 142 76% 94%))',
                        color: 'hsl(var(--success, 142 76% 36%))',
                        fontWeight: 'bold'
                      }
                    }}
                    className="w-full max-w-[280px] border rounded-lg p-3"
                    classNames={{
                      day_range_middle: "text-center px-1",
                      day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
                      day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                      day_today: "bg-accent text-accent-foreground",
                      day_outside: "text-muted-foreground opacity-50",
                    }}
                  />
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-medium">Upcoming Contacts</h3>
                  <div className="grid grid-cols-4 gap-4">
                    {[...Array(4)].map((_, weekIndex) => {
                      const weekStart = addWeeks(startOfWeek(new Date()), weekIndex);
                      const weekEnd = endOfWeek(weekStart);
                      
                      const weekEvents = offers
                        ?.filter(o => {
                          if (!o.nextContact) return false;
                          const contactDate = new Date(o.nextContact);
                          return isWithinInterval(contactDate, { start: weekStart, end: weekEnd });
                        })
                        .sort((a, b) => new Date(a.nextContact!).getTime() - new Date(b.nextContact!).getTime())
                        .slice(0, 5);

                      return (
                        <div key={weekIndex} className="space-y-2">
                          <h4 className="text-sm font-medium">
                            Week {getWeek(weekStart)} ({format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d')})
                          </h4>
                          {weekEvents?.map(offer => (
                            <Card key={offer.id} className="p-2">
                              <div className="text-sm font-medium truncate">{offer.title}</div>
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(offer.nextContact!), "MMM d, EEE")}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {clients?.find(c => c.id === offer.clientId)?.name}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="mt-1"
                                onClick={() => {
                                  setSelectedOffer(offer);
                                  setIsViewOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Card>
                          ))}
                          {!weekEvents?.length && (
                            <div className="text-sm text-muted-foreground">
                              No events this week
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <h3 className="font-medium">Upcoming Contacts</h3>
                {offers
                  ?.filter(o => o.nextContact)
                  .sort((a, b) => new Date(a.nextContact!).getTime() - new Date(b.nextContact!).getTime())
                  .slice(0, 3)
                  .map(offer => (
                    <Card key={offer.id} className="p-2">
                      <div className="text-sm font-medium truncate">{offer.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(offer.nextContact!), "MMM d, EEE")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {clients?.find(c => c.id === offer.clientId)?.name}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-1"
                        onClick={() => {
                          setSelectedOffer(offer);
                          setIsViewOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Card>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pipeline Grid */}
        <div className="grid grid-cols-6 gap-4">
          {OFFER_STATUS.map((status) => (
            <DroppableColumn key={status} id={status} status={status}>
              {offers?.filter(offer => offer.status === status).map((offer) => (
                <DraggableCard
                  key={offer.id}
                  offer={offer}
                  clients={clients}
                  activeId={activeId}
                  onClick={() => {
                    setSelectedOffer(offer);
                    setIsViewOpen(true);
                  }}
                />
              ))}
            </DroppableColumn>
          ))}
        </div>

        {/* View Offer Dialog */}
        {selectedOffer && (
          <ViewOfferDialog
            key={selectedOffer.id}
            offer={selectedOffer}
            open={isViewOpen}
            onOpenChange={(open) => {
              setIsViewOpen(open);
              if (!open) {
                setTimeout(() => setSelectedOffer(null), 100);
              }
            }}
          />
        )}

        {/* Drag Overlay */}
        <DragOverlay>
          {activeId && activeOffer && (
            <DraggableCard
              offer={activeOffer}
              clients={clients}
              activeId={activeId}
            />
          )}
        </DragOverlay>
      </div>
    </DndContext>
  );
}