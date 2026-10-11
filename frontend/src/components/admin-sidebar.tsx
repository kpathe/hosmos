"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Building, LayoutDashboard, Settings, LogOut, Users, Bed, CreditCard, ChevronLeft, Receipt, IndianRupee, Zap, BookOpen } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AdminSidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();
  
  const pathSegments = pathname.split("/").filter(Boolean);
  const firstSegment = pathSegments[0] || "";
  
  // Exclude known global paths from being treated as hostel IDs
  const isGlobalRoute = ["admin", "hostels", "settings", "dashboard"].includes(firstSegment) || firstSegment === "";
  const isHostelContext = !isGlobalRoute && pathSegments.length >= 1;
  const hostelSlug = isHostelContext ? firstSegment : null;

  const globalLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/hostels", label: "My Hostels", icon: Building },
    { href: "/settings", label: "Global Settings", icon: Settings },
  ];

  const hostelLinks = [
    { href: `/${hostelSlug}/dashboard`, label: "Dashboard", icon: LayoutDashboard },
    { href: `/${hostelSlug}/rooms`, label: "Rooms", icon: Bed },
    { href: `/${hostelSlug}/pricing`, label: "Pricing Models", icon: CreditCard },
    { href: `/${hostelSlug}/managers`, label: "Managers", icon: Users },
    { href: `/${hostelSlug}/hostellers`, label: "Hostellers", icon: Users },
    { href: `/${hostelSlug}/billing`, label: "Billing", icon: Receipt },
    { href: `/${hostelSlug}/payments`, label: "Payments", icon: IndianRupee },
    { href: `/${hostelSlug}/meters`, label: "Meter Readings", icon: Zap },
    { href: `/${hostelSlug}/ledger`, label: "Ledger", icon: BookOpen },
  ];

  const links = hostelSlug ? hostelLinks : globalLinks;

  return (
    <aside className="w-64 shrink-0 border-r bg-card flex flex-col min-h-screen relative z-10 transition-transform">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="text-xl font-bold tracking-tight text-primary flex items-center gap-2">
          <Building className="h-6 w-6" />
          Hosmos
        </Link>
      </div>

      <nav className="flex-1 space-y-2 p-4">
        {hostelSlug && (
          <div className="mb-6">
            <Link href="/hostels" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "w-full justify-start text-muted-foreground mb-2")}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Hostels
            </Link>
            <div className="px-2 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Hostel Management
            </div>
          </div>
        )}

        {links.map((link) => {
          const isActive = pathname.startsWith(link.href);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-4 mt-auto">
        <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground" onClick={() => logout()}>
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </Button>
      </div>
    </aside>
  );
}
