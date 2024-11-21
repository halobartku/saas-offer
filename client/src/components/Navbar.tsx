import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Package,
  Users,
  FileText,
  KanbanSquare,
  BarChart3,
  Copy
} from "lucide-react";

import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useMobile } from "@/hooks/use-mobile";

export default function Navbar() {
  const [location] = useLocation();
  const isMobile = useMobile();

  const links = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
    { href: "/offers", label: "Offers", icon: FileText },
    { href: "/clients", label: "Clients", icon: Users },
    { href: "/products", label: "Products", icon: Package },
    { href: "/products-sold", label: "Products Sold", icon: BarChart3 },
  ];

  const NavLinks = ({ items = links, showLabels = true }: { items?: typeof links, showLabels?: boolean }) => (
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
  );

  if (isMobile) {
    return (
      <>
        {/* Top Logo Bar */}
        <div className="fixed top-0 left-0 right-0 h-14 border-b bg-background z-40 flex items-center px-4">
          <div className="h-8 w-24 bg-muted rounded-md flex items-center justify-center text-muted-foreground font-medium">
            LOGO
          </div>
        </div>

        {/* Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 border-t bg-background z-40">
          <div className="grid grid-cols-6 gap-0.5 p-0.5">
            <NavLinks items={links} showLabels={false} />
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
          <div className="w-full h-10 bg-muted rounded-md flex items-center justify-center text-muted-foreground font-medium">
            LOGO
          </div>
        </div>
        
        {/* Navigation links */}
        <div className="space-y-2">
          <NavLinks />
        </div>
      </div>
    </nav>
  );
}
