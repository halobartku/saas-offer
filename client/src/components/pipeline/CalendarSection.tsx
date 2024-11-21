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

  const renderCollapsedEvent = ({ offer, client }: UpcomingEvent) => (
    <Card key={offer.id} className="bg-card border">
      <div className="px-2 py-1.5 flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-medium text-xs truncate">{offer.title}</div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3 shrink-0" />
              <span className="truncate">{client?.name}</span>
            </div>
            <div className="flex items-center gap-1">
              <CalendarClock className="h-3 w-3 shrink-0" />
              <span>{format(new Date(offer.nextContact!), "MMM d")}</span>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 shrink-0"
          onClick={() => onOfferSelect(offer)}
        >
          <Eye className="h-3 w-3" />
        </Button>
      </div>
    </Card>
  );

  const renderExpandedEvent = ({ offer, client }: UpcomingEvent) => (
    <Card key={offer.id} className="bg-card border">
      <div className="p-2 space-y-1">
        <div className="font-medium text-xs truncate">{offer.title}</div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Users className="h-3 w-3 shrink-0" />
          <span className="truncate">{client?.name}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-muted-foreground">
            <CalendarClock className="h-3 w-3 shrink-0" />
            {format(new Date(offer.nextContact!), "MMM d")}
            {offer.lastContact && (
              <span className="ml-2">
                <Clock className="h-3 w-3 inline-block mr-1" />
                {format(new Date(offer.lastContact), "MMM d")}
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 py-1"
            onClick={() => onOfferSelect(offer)}
          >
            <Eye className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </Card>
  );

  const renderWeekSection = (weekNum: number, weekEvents: UpcomingEvent[]) => (
    <div key={weekNum} className="space-y-2">
      <h4 className="text-xs font-medium">
        <span>Week {weekNum}</span>
        <span className="text-muted-foreground block">
          {format(weekEvents[0].weekStart, "MMM d")} -{" "}
          {format(weekEvents[0].weekEnd, "MMM d")}
        </span>
      </h4>
      <div className="space-y-1">
        {weekEvents.length > 0 ? (
          weekEvents.map((event) => renderExpandedEvent(event))
        ) : (
          <div className="text-xs text-muted-foreground p-2 text-center bg-muted rounded-lg">
            No events
          </div>
        )}
      </div>
    </div>
  );

  const upcomingEvents = getUpcomingEvents();
  const weeks = Array.from(new Set(upcomingEvents.map((e) => e.week)));

  return (
    <Card className={cn("relative", isMobile && "mx-4")}>
      <CardHeader
        className="flex flex-row items-center justify-between cursor-pointer py-3"
        onClick={onExpandToggle}
      >
        <CardTitle className="text-base">Contact Schedule</CardTitle>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
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
          "transition-all duration-200 px-3 pb-3",
          isExpanded ? "max-h-[800px]" : "max-h-[200px]",
          "overflow-hidden",
        )}
      >
        {isExpanded ? (
          <div className="space-y-4">
            <div
              className={cn(
                "flex",
                isMobile ? "flex-col gap-4" : "flex-row gap-6",
              )}
            >
              {/* Calendar section */}
              <div
                className={cn("shrink-0", isMobile ? "w-full" : "w-[300px]")}
              >
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
                  className="border rounded-lg p-2"
                  classNames={{
                    day_range_middle: "text-center px-1",
                    day: cn(
                      "p-0 font-normal aria-selected:opacity-100 text-sm",
                      isMobile ? "h-9 w-9" : "h-8 w-8",
                    ),
                    day_selected:
                      "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                    day_today: "bg-accent text-accent-foreground",
                    day_outside: "text-muted-foreground opacity-50",
                    head_cell: "text-xs font-medium",
                    caption: "text-sm",
                    nav_button: "h-6 w-6",
                    table: "w-full",
                  }}
                />
              </div>

              {/* Upcoming events section */}
              <div className="flex-1 min-w-0 space-y-3">
                <h3 className="text-sm font-medium">Upcoming Contacts</h3>
                <div
                  className={cn(
                    "grid gap-4",
                    isMobile ? "grid-cols-1" : "grid-cols-4",
                  )}
                >
                  {weeks.map((weekNum) => {
                    const weekEvents = upcomingEvents.filter(
                      (e) => e.week === weekNum,
                    );
                    return renderWeekSection(weekNum, weekEvents);
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Collapsed view
          <div
            className={cn(
              "grid gap-2",
              isMobile ? "grid-cols-1" : "md:grid-cols-3",
            )}
          >
            {upcomingEvents
              .slice(0, isMobile ? 3 : 5)
              .map((event) => renderCollapsedEvent(event))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
