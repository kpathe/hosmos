"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Building, LayoutDashboard, Settings, Users, Bed, CreditCard, ChevronLeft, Receipt, IndianRupee, Zap, BookOpen, UserMinus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";

export function AdminSidebar() {
  const pathname = usePathname();
  
  const pathSegments = pathname.split("/").filter(Boolean);
  const firstSegment = pathSegments[0] || "";
  
  // Exclude known global paths from being treated as hostel IDs
  const isGlobalRoute = ["admin", "hostels", "settings", "dashboard"].includes(firstSegment) || firstSegment === "";
  const isHostelContext = !isGlobalRoute && pathSegments.length >= 1;
  const hostelSlug = isHostelContext ? firstSegment : null;

  const { user } = useAuth();
  const isManager = user?.role === "manager";

  // Managers do not manage global settings
  const globalLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/hostels", label: "My Hostels", icon: Building },
    ...(!isManager ? [{ href: "/settings", label: "Global Settings", icon: Settings }] : []),
  ];

  // Managers per PRD 6.2:
  // Cannot: manage other managers, manage pricing models, process exits
  const hostelLinks = [
    { href: `/${hostelSlug}/dashboard`, label: "Dashboard", icon: LayoutDashboard },
    { href: `/${hostelSlug}/rooms`, label: "Rooms", icon: Bed },
    ...(!isManager ? [{ href: `/${hostelSlug}/pricing`, label: "Pricing Models", icon: CreditCard }] : []),
    ...(!isManager ? [{ href: `/${hostelSlug}/managers`, label: "Managers", icon: Users }] : []),
    { href: `/${hostelSlug}/hostellers`, label: "Hostellers", icon: Users },
    { href: `/${hostelSlug}/billing`, label: "Billing", icon: Receipt },
    { href: `/${hostelSlug}/payments`, label: "Payments", icon: IndianRupee },
    { href: `/${hostelSlug}/meters`, label: "Meter Readings", icon: Zap },
    { href: `/${hostelSlug}/ledger`, label: "Ledger", icon: BookOpen },
    ...(!isManager ? [{ href: `/${hostelSlug}/exits`, label: "Exits", icon: UserMinus }] : []),
  ];

  const links = hostelSlug ? hostelLinks : globalLinks;

  return (
    <aside className="w-64 shrink-0 border-r bg-card flex flex-col h-screen max-h-screen sticky top-0 z-20">
      {/* Brand logo header with ample padding */}
      <div className="flex h-16 shrink-0 items-center border-b px-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 transition-opacity hover:opacity-90"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-foreground leading-tight">
              Hosmos
            </span>
            <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
              Hostel OS
            </span>
          </div>
        </Link>
      </div>

      {/* Scrollable navigation area — sidebar has its own scrollbar */}
      <nav className="flex-1 overflow-y-auto space-y-1.5 p-4 custom-scrollbar">
        {hostelSlug && (
          <div className="mb-4">
            <Link
              href="/hostels"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "w-full justify-start text-muted-foreground mb-2"
              )}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Hostels
            </Link>
            <div className="px-2 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
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
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
