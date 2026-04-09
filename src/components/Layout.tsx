import { PropsWithChildren, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/auth/SessionProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { hr_Logo as HrLogo } from "@/components/hr_Logo";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  BriefcaseBusiness,
  LayoutDashboard,
  LogOut,
  Menu,
  UserRound,
  Wallet,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

const NAV = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    to: "/dashboard/vagas",
    label: "Vagas",
    icon: BriefcaseBusiness,
  },
  {
    to: "/finance",
    label: "Financeiro",
    icon: Wallet,
    adminOnly: true,
  },
];

function NavLinks({
  items,
  collapsed,
  onNavigate,
}: {
  items: typeof NAV;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const location = useLocation();

  return (
    <nav className="mt-3 space-y-1">
      {items.map((item) => {
        const Icon = item.icon;
        const active = location.pathname.startsWith(item.to);
        return (
          <Link
            key={item.label}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
              "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
              "dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white",
              active &&
                "bg-[hsl(var(--primary))]/10 text-slate-900 ring-1 ring-[hsl(var(--primary))]/15 dark:bg-[hsl(var(--primary))]/15 dark:text-white",
              collapsed && "justify-center px-2"
            )}
            title={item.label}
          >
            <Icon
              className={cn(
                "h-4 w-4 text-slate-500 transition group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-white",
                active &&
                  "text-[hsl(var(--primary))] dark:text-[hsl(var(--primary))]"
              )}
            />
            {collapsed ? null : <span>{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

export function Layout({ children }: PropsWithChildren) {
  const { session } = useSession();
  const location = useLocation();

  const roleQuery = useQuery({
    queryKey: ["hr_role"],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_hr_role");
      if (error) throw error;
      return (data as string) ?? null;
    },
  });

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("hr_sidebar_collapsed");
    if (stored === "1") setCollapsed(true);
  }, []);

  useEffect(() => {
    localStorage.setItem("hr_sidebar_collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  const navItems = useMemo(() => {
    const role = roleQuery.data;
    return NAV.filter((x) => !x.adminOnly || role === "ADMIN");
  }, [roleQuery.data]);

  const email = session?.user.email ?? "";

  const pageLabel =
    location.pathname === "/dashboard"
      ? "Dashboard"
      : location.pathname.startsWith("/dashboard/vagas")
        ? "Vagas"
        : location.pathname.startsWith("/finance")
          ? "Financeiro"
          : "Painel";

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-[#020617] dark:text-slate-100">
      <div className="mx-auto flex w-full max-w-7xl gap-6 px-4 py-6">
        <aside
          className={cn(
            "sticky top-6 hidden h-[calc(100vh-3rem)] shrink-0 rounded-3xl p-3 md:block",
            "hr-glass",
            collapsed ? "w-[72px]" : "w-[248px]"
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <Link
              to="/"
              className={cn(
                "flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-semibold tracking-tight",
                "transition hover:bg-slate-100 dark:hover:bg-white/10",
                collapsed && "justify-center"
              )}
            >
              <HrLogo size="sm" withText={!collapsed} />
            </Link>

            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
              aria-label={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
              title={collapsed ? "Expandir" : "Recolher"}
            >
              {collapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>
          </div>

          <NavLinks items={navItems} collapsed={collapsed} />

          {collapsed ? null : (
            <div className="mt-auto">
              <div className="mt-6 rounded-2xl bg-white/60 p-3 text-xs text-slate-600 ring-1 ring-slate-200 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10">
                <div className="flex items-center gap-2">
                  <UserRound className="h-4 w-4" />
                  <span className="truncate">{email || "Sessão"}</span>
                </div>
              </div>
            </div>
          )}
        </aside>

        <div className="min-w-0 flex-1">
          <div className="sticky top-4 z-30">
            <header className="mb-6 flex items-center justify-between gap-3 rounded-3xl px-3 py-2 hr-glass backdrop-blur-md">
              <div className="flex items-center gap-2">
                <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                  <SheetTrigger asChild>
                    <Button
                      variant="secondary"
                      className="h-10 rounded-xl hr-btn-secondary md:hidden"
                    >
                      <Menu className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[300px]">
                    <SheetHeader>
                      <SheetTitle>
                        <HrLogo size="md" />
                      </SheetTitle>
                    </SheetHeader>
                    <NavLinks
                      items={navItems}
                      onNavigate={() => setMobileOpen(false)}
                    />
                  </SheetContent>
                </Sheet>

                <Link
                  to="/"
                  className="inline-flex items-center rounded-2xl px-2.5 py-2 transition hover:bg-white/60 dark:hover:bg-white/10"
                  title="Home"
                >
                  <HrLogo size="sm" withText={false} />
                </Link>

                <div className="hidden rounded-2xl bg-white/60 px-3 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 dark:bg-white/5 dark:text-white dark:ring-white/10 sm:block">
                  {pageLabel}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <ThemeToggle />
                <Button
                  variant="secondary"
                  className="h-10 rounded-xl hr-btn-secondary"
                  onClick={() => supabase.auth.signOut()}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </Button>
              </div>
            </header>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}