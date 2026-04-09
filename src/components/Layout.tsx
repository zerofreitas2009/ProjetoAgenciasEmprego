import { PropsWithChildren, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/auth/SessionProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { hr_Logo as HrLogo } from "@/components/hr_Logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PremiumProvider, usePremium } from "@/components/premium/PremiumContext";
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
  Settings as SettingsIcon,
  Crown,
  Building2,
} from "lucide-react";

const MASTER_EMAIL = "zerofreitas2009@gmail.com";

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
    to: "/dashboard/clientes",
    label: "Clientes",
    icon: Building2,
  },
  {
    to: "/settings",
    label: "Configurações",
    icon: SettingsIcon,
  },
  {
    to: "/finance",
    label: "Financeiro",
    icon: Wallet,
    adminOnly: true,
  },
  {
    to: "/master",
    label: "Dashboard Master",
    icon: Crown,
    masterOnly: true,
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

function LayoutShell({ children }: PropsWithChildren) {
  const { session } = useSession();
  const location = useLocation();
  const { openPremium } = usePremium();

  const roleQuery = useQuery({
    queryKey: ["hr_role"],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_hr_role");
      if (error) throw error;
      return (data as string) ?? null;
    },
  });

  const meQuery = useQuery({
    queryKey: ["hr_me_identity"],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_profiles")
        .select("full_name, job_title, avatar_data_url")
        .eq("id", session!.user.id)
        .maybeSingle();

      if (error) throw error;

      return (
        (data as {
          full_name: string | null;
          job_title: string | null;
          avatar_data_url: string | null;
        } | null) ?? null
      );
    },
  });

  const tenantBrandQuery = useQuery({
    queryKey: ["hr_tenant_branding"],
    enabled: !!session,
    queryFn: async () => {
      const { data: tenantId, error: tenantErr } = await supabase.rpc(
        "get_hr_tenant"
      );
      if (tenantErr) throw tenantErr;

      const { data, error } = await supabase
        .from("hr_tenants")
        .select("id, name, logo_data_url, plan_status")
        .eq("id", tenantId as string)
        .single();
      if (error) throw error;
      return data as {
        id: string;
        name: string;
        logo_data_url: string | null;
        plan_status: string;
      };
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

  const email = session?.user.email ?? "";
  const isMaster = email.toLowerCase() === MASTER_EMAIL;

  const navItems = useMemo(() => {
    const role = roleQuery.data;
    return NAV.filter((x) => {
      if ((x as any).masterOnly) return isMaster;
      return !(x as any).adminOnly || role === "ADMIN";
    });
  }, [isMaster, roleQuery.data]);

  const pageLabel =
    location.pathname === "/dashboard"
      ? "Dashboard"
      : location.pathname.startsWith("/dashboard/vagas")
        ? "Vagas"
        : location.pathname.startsWith("/dashboard/clientes")
          ? "Clientes"
          : location.pathname.startsWith("/settings")
            ? "Configurações"
            : location.pathname.startsWith("/finance")
              ? "Financeiro"
              : location.pathname.startsWith("/master")
                ? "Dashboard Master"
                : "Painel";

  const brandName = tenantBrandQuery.data?.name ?? null;
  const logoSrc = tenantBrandQuery.data?.logo_data_url ?? null;
  const planStatus = (tenantBrandQuery.data?.plan_status ?? "trial").toLowerCase();
  const isTrial = planStatus === "trial";

  const displayName =
    meQuery.data?.full_name?.trim() ||
    session?.user.user_metadata?.full_name?.trim?.() ||
    email ||
    "Usuário";
  const jobTitle = meQuery.data?.job_title?.trim() || null;
  const avatarSrc = meQuery.data?.avatar_data_url ?? null;
  const initials = (displayName || "U").slice(0, 2).toUpperCase();

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
              <HrLogo
                size="sm"
                withText={!collapsed}
                brandName={brandName}
                logoSrc={logoSrc}
              />
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
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-2">
                    <Avatar className="mt-0.5 h-8 w-8 rounded-2xl">
                      <AvatarImage src={avatarSrc ?? ""} />
                      <AvatarFallback className="rounded-2xl bg-slate-100 text-[10px] font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-200">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="truncate text-[12px] font-semibold text-slate-900 dark:text-white">
                        {displayName}
                      </div>
                      <div className="mt-0.5 truncate text-[11px] text-slate-600 dark:text-slate-300">
                        {jobTitle ?? email}
                      </div>
                    </div>
                  </div>

                  {isTrial ? (
                    <Badge className="rounded-full bg-amber-500/15 text-amber-700 ring-1 ring-amber-500/20 dark:text-amber-200">
                      Trial
                    </Badge>
                  ) : (
                    <Badge className="rounded-full bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-200">
                      Active
                    </Badge>
                  )}
                </div>

                {isTrial ? (
                  <button
                    type="button"
                    onClick={() => openPremium("upgrade")}
                    className="mt-3 w-full rounded-xl bg-[hsl(var(--electric-indigo))] px-3 py-2 text-xs font-semibold text-white shadow-[0_16px_40px_-28px_rgba(111,0,255,0.9)] transition hover:brightness-110"
                  >
                    Upgrade Vitalício
                  </button>
                ) : null}
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
                        <HrLogo size="md" brandName={brandName} logoSrc={logoSrc} />
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
                  <HrLogo
                    size="sm"
                    withText={false}
                    brandName={brandName}
                    logoSrc={logoSrc}
                  />
                </Link>

                <div className="hidden rounded-2xl bg-white/60 px-3 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 dark:bg-white/5 dark:text-white dark:ring-white/10 sm:block">
                  {pageLabel}
                </div>

                {isTrial ? (
                  <Badge className="hidden rounded-full bg-amber-500/15 text-amber-700 ring-1 ring-amber-500/20 dark:text-amber-200 sm:inline-flex">
                    Trial
                  </Badge>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                <div className="hidden items-center gap-2 rounded-2xl bg-white/60 px-2.5 py-2 ring-1 ring-slate-200 dark:bg-white/5 dark:ring-white/10 sm:flex">
                  <Avatar className="h-7 w-7 rounded-2xl">
                    <AvatarImage src={avatarSrc ?? ""} />
                    <AvatarFallback className="rounded-2xl bg-slate-100 text-[10px] font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-200">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="leading-tight">
                    <div className="max-w-[160px] truncate text-xs font-semibold text-slate-900 dark:text-white">
                      {displayName}
                    </div>
                    <div className="max-w-[160px] truncate text-[11px] text-slate-600 dark:text-slate-300">
                      {jobTitle ?? ""}
                    </div>
                  </div>
                </div>

                {isTrial ? (
                  <Button
                    variant="secondary"
                    className="h-10 rounded-xl hr-btn-secondary"
                    onClick={() => openPremium("upgrade")}
                  >
                    Upgrade
                  </Button>
                ) : null}

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

export function Layout({ children }: PropsWithChildren) {
  // Layout uses tenant branding for the premium CTA text.
  const { session } = useSession();

  const agencyNameQuery = useQuery({
    queryKey: ["hr_agency_name_for_premium"],
    enabled: !!session,
    queryFn: async () => {
      const { data: tenantId, error: tenantErr } = await supabase.rpc(
        "get_hr_tenant"
      );
      if (tenantErr) throw tenantErr;

      const { data, error } = await supabase
        .from("hr_tenants")
        .select("name")
        .eq("id", tenantId as string)
        .single();
      if (error) throw error;
      return (data as any).name as string;
    },
  });

  return (
    <PremiumProvider agencyName={agencyNameQuery.data ?? null}>
      <LayoutShell>{children}</LayoutShell>
    </PremiumProvider>
  );
}