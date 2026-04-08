import { PropsWithChildren, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/auth/SessionProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
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
    to: "/dashboard",
    label: "Vagas",
    icon: BriefcaseBusiness,
  },
  {
    to: "/finance",
    label: "Finance",
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
              "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition",
              "hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white",
              active &&
                "bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-white",
              collapsed && "justify-center px-2"
            )}
            title={item.label}
          >
            <Icon className="h-4 w-4" />
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
      : location.pathname.startsWith("/finance")
        ? "Financeiro"
        : "Workspace";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0B1020] dark:text-slate-100">
      <div className="mx-auto flex w-full max-w-7xl gap-6 px-4 py-6">
        <aside
          className={cn(
            "sticky top-6 hidden h-[calc(100vh-3rem)] shrink-0 rounded-2xl border border-black/5 bg-white/70 p-3 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 md:block",
            collapsed ? "w-[72px]" : "w-[240px]"
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <Link
              to="/"
              className={cn(
                "flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-semibold tracking-tight text-slate-900 hover:bg-slate-100 dark:text-white dark:hover:bg-white/10",
                collapsed && "justify-center"
              )}
            >
              <span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--primary))]" />
              {collapsed ? null : <span>HR SaaS</span>}
            </Link>

            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
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
              <div className="mt-6 rounded-2xl border border-black/5 bg-white/70 p-3 text-xs text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <UserRound className="h-4 w-4" />
                  <span className="truncate">{email || "Sessão"}</span>
                </div>
              </div>
            </div>
          )}
        </aside>

        <div className="min-w-0 flex-1">
          <header className="mb-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="secondary"
                    className="h-10 rounded-xl bg-white/70 ring-1 ring-black/5 hover:bg-white dark:bg-white/5 dark:ring-white/10 dark:hover:bg-white/10 md:hidden"
                  >
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px]">
                  <SheetHeader>
                    <SheetTitle>HR SaaS</SheetTitle>
                  </SheetHeader>
                  <NavLinks
                    items={navItems}
                    onNavigate={() => setMobileOpen(false)}
                  />
                </SheetContent>
              </Sheet>

              <div className="rounded-xl border border-black/5 bg-white/70 px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-white">
                {pageLabel}
              </div>
              <div className="hidden text-sm text-slate-600 dark:text-slate-300 sm:block">
                Clean • Sharp • Fast
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button
                type="button"
                variant="ghost"
                className="h-9 w-9 rounded-xl text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white"
                onClick={() => supabase.auth.signOut()}
                aria-label="Sair"
                title="Sair"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </header>

          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}