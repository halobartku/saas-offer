// /components/pipeline/CalendarSection.tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { ChevronDown, CalendarClock, Users, Eye, Clock } from "lucide-react";
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

interface UpcomingEvent {
  offer: Offer;
  client?: Client;
  week: number;
  weekStart: Date;
  weekEnd: Date;
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
  const getUpcomingEvents = (): UpcomingEvent[] => {
    if (!offers) return [];

    const events: UpcomingEvent[] = [];
    const now = new Date();

    // Look ahead 4 weeks
    for (let i = 0; i < 4; i++) {
      const weekStart = startOfWeek(addWeeks(now, i));
      const weekEnd = endOfWeek(weekStart);
      const weekNumber = getWeek(weekStart);

      const weekEvents = offers
        .filter((o) => {
          if (!o.nextContact) return false;
          const contactDate = new Date(o.nextContact);
          return isWithinInterval(contactDate, {
            start: weekStart,
            end: weekEnd,
          });
        })
        .map((offer) => ({
          offer,
          client: clients?.find((c) => c.id === offer.clientId),
          week: weekNumber,
          weekStart,
          weekEnd,
        }))
        .sort(
          (a, b) =>
            new Date(a.offer.nextContact!).getTime() -
            new Date(b.offer.nextContact!).getTime(),
        );

      events.push(...weekEvents);
    }

    return events;
  };

  const upcomingEvents = getUpcomingEvents();

  const renderWeekEvents = (weekEvents: UpcomingEvent[], index: number) => {
    if (!weekEvents.length) {
      return (
        <div className="text-sm text-muted-foreground p-4 text-center bg-muted rounded-lg">
          No events this week
        </div>
      );
    }

    return weekEvents.map(({ offer, client }) => (
      <Card key={offer.id} className="p-3">
        <div className="space-y-2">
          <div className="font-medium">{offer.title}</div>
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Users className="h-4 w-4" />
            {client?.name}
          </div>
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <CalendarClock className="h-4 w-4" />
            {format(new Date(offer.nextContact!), "MMM d, EEE")}
          </div>
          {offer.lastContact && (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Last: {format(new Date(offer.lastContact), "MMM d")}
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2"
            onClick={() => onOfferSelect(offer)}
          >
            <Eye className="h-4 w-4 mr-2" />
            View Details
          </Button>
        </div>
      </Card>
    ));
  };

  return (
    <Card className={cn("relative", isMobile && "mx-4")}>
      <CardHeader
        className="flex flex-row items-center justify-between cursor-pointer"
        onClick={onExpandToggle}
      >
        <CardTitle>Contact Schedule</CardTitle>
        <Button variant="ghost" size="sm">
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              isExpanded && "rotate-180",
            )}
          />
        </Button>
      </CardHeader>
      <CardContent
        className={cn(
          "transition-all duration-200",
          isExpanded ? "max-h-[800px]" : "max-h-[400px]",
          "overflow-hidden",
        )}
      >
        {isExpanded ? (
          <div
            className={cn(
              "grid gap-6",
              isMobile ? "grid-cols-1" : "grid-cols-[320px_1fr]",
            )}
          >
            <div>
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
                className="border rounded-lg p-3"
                classNames={{
                  day_range_middle: "text-center px-1",
                  day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
                  day_selected:
                    "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                  day_today: "bg-accent text-accent-foreground",
                  day_outside: "text-muted-foreground opacity-50",
                }}
              />
            </div>

            <div className="space-y-4">
              <h3 className="font-medium">Upcoming Contacts</h3>
              <div
                className={cn(
                  "grid gap-4",
                  isMobile ? "grid-cols-1" : "grid-cols-2",
                )}
              >
                {Array.from(new Set(upcomingEvents.map((e) => e.week))).map(
                  (weekNum, index) => {
                    const weekEvents = upcomingEvents.filter(
                      (e) => e.week === weekNum,
                    );
                    if (!weekEvents.length) return null;

                    // Show only 2 weeks on mobile
                    if (isMobile && index >= 2) return null;

                    return (
                      <div key={weekNum} className="space-y-3">
                        <h4 className="text-sm font-medium">
                          Week {weekNum} (
                          {format(weekEvents[0].weekStart, "MMM d")} -{" "}
                          {format(weekEvents[0].weekEnd, "MMM d")})
                        </h4>
                        <div className="space-y-2">
                          {renderWeekEvents(weekEvents, index)}
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-2">
            {upcomingEvents.slice(0, 5).map(({ offer, client }) => (
              <Card key={offer.id} className="p-3">
                <div className="space-y-2">
                  <div className="font-medium line-clamp-1">{offer.title}</div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span className="line-clamp-1">{client?.name}</span>
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <CalendarClock className="h-4 w-4" />
                    {format(new Date(offer.nextContact!), "MMM d, EEE")}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => onOfferSelect(offer)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
