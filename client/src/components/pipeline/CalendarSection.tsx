// /components/pipeline/CalendarSection.tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { ChevronRight, CalendarClock, Users, Eye } from "lucide-react";
import {
  format,
  addWeeks,
  startOfWeek,
  endOfWeek,
  getWeek,
  isWithinInterval,
} from "date-fns";
import { cn } from "@/lib/utils";
import type { Offer, Client } from "db/schema";

interface CalendarSectionProps {
  offers?: Offer[];
  clients?: Client[];
  isMobile: boolean;
  isExpanded: boolean;
  selectedDate?: Date;
  onExpandToggle: () => void;
  onDateSelect: (date: Date | undefined) => void;
  onOfferSelect: (offer: Offer) => void;
}

export function CalendarSection({
  offers,
  clients,
  isMobile,
  isExpanded,
  selectedDate,
  onExpandToggle,
  onDateSelect,
  onOfferSelect,
}: CalendarSectionProps) {
  return (
    <Card className={cn("relative", isMobile && "mx-4")}>
      <CardHeader
        className="flex flex-row items-center justify-between cursor-pointer"
        onClick={onExpandToggle}
      >
        <CardTitle>Contact Schedule</CardTitle>
        <Button variant="ghost" size="sm">
          <ChevronRight
            className={cn(
              "h-4 w-4 transition-transform",
              isExpanded && "rotate-90",
            )}
          />
        </Button>
      </CardHeader>
      <CardContent
        className={cn(
          "transition-all overflow-hidden",
          isExpanded ? "max-h-[800px]" : "max-h-0 py-0",
        )}
      >
        <div className="space-y-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={onDateSelect}
            modifiers={{
              booked: offers
                ?.filter((o) => o.nextContact)
                .map((o) => new Date(o.nextContact)),
            }}
            modifiersStyles={{
              booked: {
                backgroundColor: "hsl(var(--success-light, 142 76% 94%))",
                color: "hsl(var(--success, 142 76% 36%))",
                fontWeight: "bold",
              },
            }}
            className={cn(
              "w-full border rounded-lg p-3",
              isMobile ? "max-w-full" : "max-w-[280px]",
            )}
            classNames={{
              day_range_middle: "text-center px-1",
              day: cn(
                "font-normal aria-selected:opacity-100",
                isMobile ? "h-10 w-10" : "h-9 w-9",
                "p-0",
              ),
              day_selected:
                "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
              day_today: "bg-accent text-accent-foreground",
              day_outside: "text-muted-foreground opacity-50",
            }}
          />

          <div className="space-y-4">
            <h3 className="font-medium">Upcoming Contacts</h3>
            <div
              className={cn(
                "space-y-4",
                !isMobile && "grid grid-cols-2 gap-4 space-y-0",
              )}
            >
              {[...Array(2)].map((_, weekIndex) => {
                const weekStart = addWeeks(startOfWeek(new Date()), weekIndex);
                const weekEnd = endOfWeek(weekStart);

                const weekEvents = offers
                  ?.filter((o) => {
                    if (!o.nextContact) return false;
                    const contactDate = new Date(o.nextContact);
                    return isWithinInterval(contactDate, {
                      start: weekStart,
                      end: weekEnd,
                    });
                  })
                  .sort(
                    (a, b) =>
                      new Date(a.nextContact!).getTime() -
                      new Date(b.nextContact!).getTime(),
                  );

                return (
                  <div key={weekIndex} className="space-y-2">
                    <h4 className="text-sm font-medium">
                      Week {getWeek(weekStart)} ({format(weekStart, "MMM d")} -{" "}
                      {format(weekEnd, "MMM d")})
                    </h4>
                    {weekEvents?.length ? (
                      <div className="space-y-2">
                        {weekEvents.map((offer) => (
                          <Card key={offer.id} className="p-3">
                            <div className="space-y-2">
                              <div className="text-sm font-medium truncate">
                                {offer.title}
                              </div>
                              <div className="text-xs text-muted-foreground flex items-center gap-2">
                                <CalendarClock className="h-3 w-3" />
                                {format(
                                  new Date(offer.nextContact!),
                                  "MMM d, EEE",
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground flex items-center gap-2">
                                <Users className="h-3 w-3" />
                                {
                                  clients?.find((c) => c.id === offer.clientId)
                                    ?.name
                                }
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full mt-1"
                                onClick={() => onOfferSelect(offer)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground p-4 text-center bg-muted rounded-lg">
                        No events this week
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
