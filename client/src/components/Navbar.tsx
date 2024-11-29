import * as React from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import useSWR from "swr";
import type { Settings } from "db/schema";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  LayoutDashboard,
  Package,
  Users,
  FileText,
  KanbanSquare,
  BarChart3,
  Settings as SettingsIcon,
  Mail
} from "lucide-react";

import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile.tsx";

export default function Navbar() {
  const [location] = useLocation();
  const isMobile = useIsMobile();
  const { data: settings } = useSWR<Settings>("/api/settings");

  const links = React.useMemo(() => [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
    { href: "/offers", label: "Offers", icon: FileText },
    { href: "/emails", label: "Emails", icon: Mail },
    { href: "/clients", label: "Clients", icon: Users },
    { href: "/products", label: "Products", icon: Package },
    { href: "/products-sold", label: "Products Sold", icon: BarChart3 },
    { href: "/settings", label: "Settings", icon: SettingsIcon },
  ], []);

  const NavLinks = React.memo(({ items = links, showLabels = true }: { items?: typeof links, showLabels?: boolean }) => (
    <>
      {items.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} className="w-full">
          <Button
            variant={location === href ? "default" : "ghost"}
            className={cn(
              "w-full",
              showLabels ? "justify-start" : "justify-center",
              location === href && "bg-primary text-primary-foreground",
              !showLabels && "h-14 px-0"
            )}
          >
            <Icon className={cn("h-5 w-5", showLabels && "mr-2")} />
            {showLabels && <span>{label}</span>}
          </Button>
        </Link>
      ))}
    </>
  ));

  if (isMobile) {
    return (
      <>
        {/* Top Logo Bar */}
        <div className="fixed top-0 left-0 right-0 h-14 border-b bg-background z-40 flex items-center px-4">
          {settings?.companyLogo ? (
            <div className="relative w-auto">
              <img
                src={settings.companyLogo}
                alt={settings.companyName || "Company Logo"}
                className="h-10 md:h-12 w-auto object-contain object-center transition-opacity duration-200"
                style={{ aspectRatio: 'auto' }}
                onError={(e) => {
                  e.currentTarget.style.opacity = '0';
                  e.currentTarget.parentElement?.classList.add('placeholder-logo');
                }}
                onLoad={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-md opacity-0 transition-opacity duration-200 placeholder-logo:opacity-100">
                <span className="text-muted-foreground font-medium">
                  {settings.companyName || "LOGO"}
                </span>
              </div>
            </div>
          ) : (
            <div className="h-12 md:h-14 w-40 md:w-48 bg-muted rounded-md flex items-center justify-center text-muted-foreground font-medium">
              {settings?.companyName || "LOGO"}
            </div>
          )}
        </div>

        {/* Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 border-t bg-background z-40">
          <div className="grid grid-cols-7 gap-0.5 p-0.5">
            <NavLinks items={links} showLabels={false} />
            <div className="flex items-center justify-center">
              <ThemeToggle />
            </div>
          </div>
        </nav>
      </>
    );
  }

  return (
    <nav className="fixed left-0 top-0 h-full w-64 border-r bg-background">
      <div className="flex h-full flex-col p-4">
        {/* Logo section */}
        <div className="h-16 mb-6 flex items-center">
          {settings?.companyLogo ? (
            <img
              src={settings.companyLogo}
              alt={settings.companyName || "Company Logo"}
              className="h-12 md:h-14 w-auto object-contain"
            />
          ) : (
            <div className="w-full h-10 bg-muted rounded-md flex items-center justify-center text-muted-foreground font-medium">
              LOGO
            </div>
          )}
        </div>
        
        {/* Navigation links */}
        <div className="flex-1 space-y-2">
          <NavLinks />
        </div>
        <div className="p-4">
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
