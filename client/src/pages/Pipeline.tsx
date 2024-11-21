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
  useDraggable,
  DragEndEvent,
  DragStartEvent
} from "@dnd-kit/core";
import { useMobile } from "@/hooks/use-mobile";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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

const OFFER_STATUS = ["draft", "sent", "accepted", "rejected", "Close & Paid", "Paid & Delivered"] as const;
type OfferStatus = typeof OFFER_STATUS[number];

function DraggableCard({ offer, clients, onClick }: { 
  offer: Offer;
  clients?: Client[];
  onClick?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: offer.id,
  });
  const isMobile = useMobile();
  
  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition: transform ? 'none' : undefined,
    touchAction: 'none',
    position: 'relative',
    zIndex: transform ? '50' : undefined
  };

  const client = clients?.find(c => c.id === offer.clientId);
  
  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "cursor-move transition-all active:scale-[0.98]",
        "hover:shadow-md",
        "touch-manipulation",
        isMobile ? "w-full" : "",
        transform ? "shadow-lg" : ""
      )}
      {...attributes}
      {...listeners}
    >
      <CardContent className={cn(
        "space-y-4",
        isMobile ? "p-5" : "p-4"
      )}>
        <div className={cn(
          "font-medium",
          isMobile ? "text-lg" : "text-base"
        )}>{offer.title}</div>
        
        {client && (
          <div className={cn(
            "flex items-center gap-2 text-muted-foreground",
            isMobile ? "text-base" : "text-sm"
          )}>
            <Users className={cn(
              isMobile ? "h-5 w-5" : "h-4 w-4"
            )} />
            {client.name}
          </div>
        )}
        
        <div className={cn(
          "flex flex-col gap-2",
          isMobile ? "text-sm" : "text-xs"
        )}>
          {offer.lastContact && (
            <div className="flex items-center gap-2">
              <Clock className={cn(
                isMobile ? "h-4 w-4" : "h-3 w-3"
              )} />
              <span>Last: {format(new Date(offer.lastContact), "MMM d, yyyy")}</span>
            </div>
          )}
          {offer.nextContact && (
            <div className="flex items-center gap-2">
              <CalendarClock className={cn(
                isMobile ? "h-4 w-4" : "h-3 w-3"
              )} />
              <span>Next: {format(new Date(offer.nextContact), "MMM d, yyyy")}</span>
            </div>
          )}
        </div>
        
        {offer.notes && (
          <div className={cn(
            "text-muted-foreground line-clamp-2",
            isMobile ? "text-sm" : "text-xs"
          )}>
            {offer.notes}
          </div>
        )}

        <div className={cn(
          "flex justify-between items-center pt-3 border-t",
          isMobile ? "gap-4" : "gap-2"
        )}>
          <div className={cn(
            "px-3 py-1.5 font-medium rounded-full bg-secondary",
            isMobile ? "text-sm" : "text-xs"
          )}>
            €{(Number(offer.totalAmount) || 0).toFixed(2)}
          </div>
          <Button
            variant="ghost"
            size={isMobile ? "default" : "sm"}
            className={cn(
              "min-h-[44px]",
              isMobile && "px-6"
            )}
            data-no-drag
            onClick={(e) => {
              e.stopPropagation();
              onClick?.();
            }}
          >
            <Eye className={cn(
              "mr-2",
              isMobile ? "h-5 w-5" : "h-4 w-4"
            )} />
            View
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Pipeline() {
  const { toast } = useToast();
  const [activeId, setActiveId] = useState<string | null>(null);
  const isMobile = useMobile();
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
        distance: 8,
        delay: 100,
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
    if (!offer) return;

    if (newStatus === offer.status) return;

    setIsUpdating(true);
    try {
      const updateData = {
        id: offer.id,
        title: offer.title,
        clientId: offer.clientId,
        status: newStatus,
        totalAmount: offer.totalAmount,
        notes: offer.notes || null,
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-500';
      case 'sent': return 'bg-blue-500';
      case 'accepted': return 'bg-green-500';
      case 'rejected': return 'bg-red-500';
      case 'Close & Paid': return 'bg-slate-500';
      case 'Paid & Delivered': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const { totalValue, conversionRates, avgTime } = calculateStats();
  const activeOffer = activeId ? offers?.find(o => o.id === activeId) : null;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Pipeline</h1>

      <div className={cn(
        "grid gap-4",
        isMobile ? "grid-cols-1" : "md:grid-cols-4"
      )}>
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

      {/* Calendar Section */}
      <Card className="relative">
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
          isCalendarExpanded 
            ? "max-h-[800px] sm:max-h-[1200px]" 
            : "max-h-[300px] py-4"
        )}>
          {isCalendarExpanded ? (
            <div className={cn(
              "grid gap-6",
              isMobile ? "grid-cols-1" : "grid-cols-[280px_1fr]"
            )}>
              <div className={cn("mx-auto w-full", isMobile && "max-w-full")}>
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
                  className={cn(
                    "w-full border rounded-lg p-3",
                    isMobile ? "max-w-full" : "max-w-[280px]"
                  )}
                  classNames={{
                    day_range_middle: "text-center px-1",
                    day: cn(
                      "font-normal aria-selected:opacity-100",
                      isMobile ? "h-12 w-12" : "h-9 w-9",
                      "p-0"
                    ),
                    day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                    day_today: "bg-accent text-accent-foreground",
                    day_outside: "text-muted-foreground opacity-50",
                  }}
                />
              </div>
              
              <div className="space-y-4">
                <h3 className="font-medium">Upcoming Contacts</h3>
                <div className={cn(
                  "grid gap-4",
                  isMobile ? "grid-cols-1" : "grid-cols-4"
                )}>
                  {[...Array(4)].map((_, weekIndex) => {
                    const weekStart = addWeeks(startOfWeek(new Date()), weekIndex);
                    const weekEnd = endOfWeek(weekStart);
                    
                    const weekEvents = offers
                      ?.filter(o => {
                        if (!o.nextContact) return false;
                        const contactDate = new Date(o.nextContact);
                        return isWithinInterval(contactDate, { start: weekStart, end: weekEnd });
                      })
                      .sort((a, b) => new Date(a.nextContact!).getTime() - new Date(b.nextContact!).getTime());

                    return (
                      <div key={weekIndex} className="space-y-2">
                        <h4 className="text-sm font-medium">
                          Week {getWeek(weekStart)} ({format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d')})
                        </h4>
                        {weekEvents?.length ? (
                          weekEvents.map(offer => (
                            <Card key={offer.id} className={cn("p-4", isMobile && "p-5")}>
                              <div className="space-y-2">
                                <div className="text-sm font-medium truncate">{offer.title}</div>
                                <div className="text-xs text-muted-foreground">
                                  {format(new Date(offer.nextContact!), "MMM d, EEE")}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {clients?.find(c => c.id === offer.clientId)?.name}
                                </div>
                                <Button
                                  variant="ghost"
                                  size={isMobile ? "default" : "sm"}
                                  className={cn("mt-1", isMobile && "w-full")}
                                  onClick={() => {
                                    setSelectedOffer(offer);
                                    setIsViewOpen(true);
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View
                                </Button>
                              </div>
                              {selectedOffer?.id === offer.id && (
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
                            </Card>
                          ))
                        ) : (
                          <div className="text-sm text-muted-foreground">No events this week</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            // New collapsed view
            <div className="space-y-4">
              <div className="grid grid-cols-5 gap-2">
                {offers
                  ?.filter(o => o.nextContact)
                  .sort((a, b) => new Date(a.nextContact!).getTime() - new Date(b.nextContact!).getTime())
                  .slice(0, 5) // Show only next 5 events
                  .map(offer => (
                    <Card key={offer.id} className="p-2">
                      <div className="space-y-1">
                        <div className="text-sm font-medium truncate">{offer.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(offer.nextContact!), "MMM d, EEE")}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {clients?.find(c => c.id === offer.clientId)?.name}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full mt-1"
                          onClick={() => {
                            setSelectedOffer(offer);
                            setIsViewOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {selectedOffer?.id === offer.id && (
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
                      </div>
                    </Card>
                  ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
          <div className="grid grid-cols-5 gap-4">
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
                        onClick={() => {
                          setSelectedOffer(offer);
                          setIsViewOpen(true);
                        }}
                      />
                    ))}
                </div>
              </DroppableColumn>
            ))}
          </div>

          <DragOverlay>
            {activeId && activeOffer && (
              <DraggableCard
                offer={activeOffer}
                clients={clients}
              />
            )}
          </DragOverlay>
        </DndContext>
      )}

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
                  validUntil: selectedOffer.validUntil ? new Date(selectedOffer.validUntil).toISOString() : null,
                  lastContact: selectedOffer.lastContact ? new Date(selectedOffer.lastContact).toISOString() : null,
                  nextContact: selectedOffer.nextContact ? new Date(selectedOffer.nextContact).toISOString() : null
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