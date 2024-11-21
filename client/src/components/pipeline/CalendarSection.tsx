// /components/pipeline/CalendarSection.tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  ChevronDown,
  CalendarClock,
  Users,
  Eye,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
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

  const renderCollapsedEvent = ({ offer, client }: UpcomingEvent) => (
    <Card key={offer.id} className="bg-card border">
      <div className="px-3 py-2 flex items-center gap-2 justify-between">
        <div className="min-w-0 flex-1">
          <div className="font-medium text-sm truncate">{offer.title}</div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4 shrink-0" />
              <span className="truncate">{client?.name}</span>
            </div>
            <div className="flex items-center gap-1">
              <CalendarClock className="h-4 w-4 shrink-0" />
              <span>{format(new Date(offer.nextContact!), "MMM d")}</span>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onOfferSelect(offer)}
        >
          <Eye className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );

  const renderExpandedEvent = ({ offer, client }: UpcomingEvent) => (
    <Card key={offer.id} className="bg-card border">
      <div className="flex items-center px-3 py-2">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{offer.title}</div>
          <div className="text-sm text-muted-foreground truncate flex items-center gap-2">
            <Users className="h-4 w-4 shrink-0" />
            {client?.name}
          </div>
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <CalendarClock className="h-4 w-4 shrink-0" />
            {format(new Date(offer.nextContact!), "MMM d")}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 shrink-0"
          onClick={() => onOfferSelect(offer)}
        >
          <Eye className="h-4 w-4" />
        </Button>
      </div>
    </Card>
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
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
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
          isExpanded ? "max-h-[800px]" : "max-h-[400px]",
          "overflow-hidden",
        )}
      >
        {isExpanded ? (
          <div className="space-y-6">
            <div className={cn("flex", isMobile ? "flex-col gap-4" : "gap-6")}>
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
                  className="border rounded-lg p-3"
                  classNames={{
                    months: "flex space-x-4",
                    month: "space-y-4",
                    caption: "flex justify-center relative items-center",
                    caption_label: "text-sm font-medium",
                    nav: "flex items-center space-x-1 absolute right-1",
                    nav_button: cn(
                      "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                      "hover:bg-muted rounded-md transition-colors",
                      "disabled:opacity-25 disabled:hover:bg-transparent",
                    ),
                    nav_button_previous: "absolute left-1",
                    nav_button_next: "absolute right-1",
                    table: "w-full border-collapse space-y-1",
                    head_row: "flex",
                    head_cell:
                      "text-muted-foreground rounded-md w-8 font-medium text-xs",
                    row: "flex w-full mt-2",
                    cell: cn(
                      "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent",
                      "[&:has([aria-selected].day-outside)]:bg-accent/50",
                      "[&:has([aria-selected].day-range-end)]:rounded-r-md",
                      "[&:has([aria-selected])]:rounded-md",
                    ),
                    day: cn(
                      "h-8 w-8 p-0 font-normal text-sm",
                      "aria-selected:opacity-100",
                      "hover:bg-muted rounded-md transition-colors",
                      "disabled:opacity-50",
                      "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                    ),
                    day_selected:
                      "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                    day_today: "bg-accent text-accent-foreground",
                    day_outside: "text-muted-foreground opacity-50",
                    day_disabled: "text-muted-foreground opacity-50",
                    day_hidden: "invisible",
                  }}
                  components={{
                    IconLeft: () => <ChevronLeft className="h-4 w-4" />,
                    IconRight: () => <ChevronRight className="h-4 w-4" />,
                  }}
                />
              </div>

              {/* Upcoming events section */}
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-medium mb-4">Upcoming Contacts</h3>
                <div
                  className={cn(
                    "grid gap-4",
                    isMobile ? "grid-cols-1" : "grid-cols-4",
                  )}
                >
                  {weeks.slice(0, isMobile ? 1 : 4).map((weekNum) => {
                    const weekEvents = upcomingEvents.filter(
                      (e) => e.week === weekNum,
                    );
                    if (!weekEvents.length) return null;

                    return (
                      <div key={weekNum} className="space-y-2">
                        <h4 className="text-xs font-medium flex items-center justify-between">
                          <span>Week {weekNum}</span>
                          <span className="text-muted-foreground">
                            {format(weekEvents[0].weekStart, "MMM d")} -{" "}
                            {format(weekEvents[0].weekEnd, "MMM d")}
                          </span>
                        </h4>
                        <div className="space-y-2">
                          {weekEvents
                            .slice(0, isMobile ? 4 : undefined)
                            .map((event) => renderExpandedEvent(event))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Collapsed view
          <div className="space-y-2">
            {upcomingEvents
              .slice(0, isMobile ? 3 : 5)
              .map((event) => renderCollapsedEvent(event))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
