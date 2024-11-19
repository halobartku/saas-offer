import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Package,
  Users,
  FileText,
  KanbanSquare,
  BarChart3
} from "lucide-react";

export default function Navbar() {
  const [location] = useLocation();

  const links = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
    { href: "/offers", label: "Offers", icon: FileText },
    { href: "/clients", label: "Clients", icon: Users },
    { href: "/products", label: "Products", icon: Package },
    { href: "/products-sold", label: "Products Sold", icon: BarChart3 },
  ];

  return (
    <nav className="fixed left-0 top-0 h-full w-64 border-r bg-background">
      <div className="flex h-full flex-col p-4">
        <div className="space-y-2">
          {links.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="w-full">
              <Button
                variant={location === href ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start",
                  location === href && "bg-primary text-primary-foreground"
                )}
              >
                <Icon className="mr-2 h-4 w-4" />
                <span>{label}</span>
              </Button>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
