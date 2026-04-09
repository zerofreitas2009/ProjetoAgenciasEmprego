import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/auth/SessionProvider";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { usePremium } from "@/components/premium/PremiumContext";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Settings as SettingsIcon,
  UserRound,
  Users,
  Building2,
  ShieldAlert,
  Upload,
  KeyRound,
  MailPlus,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

type HrProfile = {
  id: string;
  tenant_id: string;
  full_name: string | null;
  role: string | null;
  job_title: string | null;
  avatar_data_url: string | null;
  email: string | null;
};

type HrTenant = {
  id: string;
  name: string;
  slogan: string | null;
  logo_data_url: string | null;
};

type TeamInvite = {
  id: string;
  email: string;
  role: string;
  created_at: string;
  accepted_at: string | null;
};

function AccessDeniedCard({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <Card className="rounded-[28px] p-6 hr-glass">
      <div className="flex items-start gap-3">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[hsl(var(--electric-indigo))]/10 text-[hsl(var(--electric-indigo))] ring-1 ring-[hsl(var(--electric-indigo))]/20">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <div>
          <div className="text-base font-semibold tracking-tight">{title}</div>
          <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {subtitle}
          </div>
        </div>
      </div>
    </Card>
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Falha ao ler arquivo"));
    reader.readAsDataURL(file);
  });
}

function isTrialLimitError(err: any) {
  const msg = String(err?.message ?? "");
  const code = String(err?.code ?? "");
  return (
    code === "42501" ||
    /row-level security/i.test(msg) ||
    /permission denied/i.test(msg)
  );
}

export default function Settings() {
  const { session, isLoading } = useSession();
  const { openPremium } = usePremium();
  const [params, setParams] = useSearchParams();

  const tab = (params.get("tab") ?? "profile") as
    | "profile"
    | "team"
    | "brand";

  const roleQuery = useQuery({
    queryKey: ["hr_role"],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_hr_role");
      if (error) throw error;
      return (data as string) ?? null;
    },
  });

  const isAdmin = (roleQuery.data ?? "").toUpperCase() === "ADMIN";

  const profileQuery = useQuery({
    queryKey: ["hr_profile_me"],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_profiles")
        .select("id, tenant_id, full_name, role, job_title, avatar_data_url, email")
        .eq("id", session!.user.id)
        .single();
      if (error) throw error;
      return data as HrProfile;
    },
  });

  const tenantQuery = useQuery({
    queryKey: ["hr_tenant_brand"],
    enabled: !!session,
    queryFn: async () => {
      const { data: tenantId, error: tenantErr } = await supabase.rpc(
        "get_hr_tenant"
      );
      if (tenantErr) throw tenantErr;

      const { data, error } = await supabase
        .from("hr_tenants")
        .select("id, name, slogan, logo_data_url")
        .eq("id", tenantId as string)
        .single();
      if (error) throw error;
      return data as HrTenant;
    },
  });

  const teamQuery = useQuery({
    queryKey: ["hr_team_members"],
    enabled: !!session && isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_profiles")
        .select("id, full_name, role, job_title, email")
        .order("full_name", { ascending: true })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as Pick<
        HrProfile,
        "id" | "full_name" | "role" | "job_title" | "email"
      >[];
    },
  });

  const invitesQuery = useQuery({
    queryKey: ["hr_team_invites"],
    enabled: !!session && isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_team_invites")
        .select("id, email, role, created_at, accepted_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as TeamInvite[];
    },
  });

  // Profile form state
  const [fullName, setFullName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [email, setEmail] = useState("");
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);

  // Brand form state
  const [agencyName, setAgencyName] = useState("");
  const [slogan, setSlogan] = useState("");
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);

  // Password dialog
  const [pwOpen, setPwOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  // Invite dialog
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "RECRUITER">(
    "RECRUITER"
  );
  const [inviteSaving, setInviteSaving] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const p = profileQuery.data;
    if (!p) return;
    setFullName(p.full_name ?? "");
    setJobTitle(p.job_title ?? "");
    setAvatarDataUrl(p.avatar_data_url ?? null);
    setEmail(session?.user.email ?? p.email ?? "");
  }, [profileQuery.data, session?.user.email]);

  useEffect(() => {
    const t = tenantQuery.data;
    if (!t) return;
    setAgencyName(t.name ?? "");
    setSlogan(t.slogan ?? "");
    setLogoDataUrl(t.logo_data_url ?? null);
  }, [tenantQuery.data]);

  const allowedTabs = useMemo(() => {
    return isAdmin ? ["profile", "team", "brand"] : ["profile"];
  }, [isAdmin]);

  useEffect(() => {
    if (!allowedTabs.includes(tab)) {
      setParams((prev) => {
        const p = new URLSearchParams(prev);
        p.set("tab", "profile");
        return p;
      });
    }
  }, [allowedTabs, setParams, tab]);

  async function saveProfile() {
    if (!session) return;

    try {
      // Update auth email if changed (may require confirmation depending on project settings)
      const currentEmail = session.user.email ?? "";
      const nextEmail = email.trim();
      if (nextEmail && nextEmail !== currentEmail) {
        const { error } = await supabase.auth.updateUser({ email: nextEmail });
        if (error) throw error;
      }

      const { error } = await supabase
        .from("hr_profiles")
        .update({
          full_name: fullName.trim() ? fullName.trim() : null,
          job_title: jobTitle.trim() ? jobTitle.trim() : null,
          avatar_data_url: avatarDataUrl,
          email: nextEmail || null,
        })
        .eq("id", session.user.id);

      if (error) throw error;

      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram salvas com sucesso.",
      });
      profileQuery.refetch();
    } catch (e: any) {
      toast({
        title: "Não foi possível salvar",
        description: e?.message ?? String(e),
        variant: "destructive",
      });
    }
  }

  async function saveBrand() {
    if (!session) return;

    try {
      const { data: tenantId, error: tenantErr } = await supabase.rpc(
        "get_hr_tenant"
      );
      if (tenantErr) throw tenantErr;

      const { error } = await supabase
        .from("hr_tenants")
        .update({
          name: agencyName.trim() ? agencyName.trim() : "Agência",
          slogan: slogan.trim() ? slogan.trim() : null,
          logo_data_url: logoDataUrl,
        })
        .eq("id", tenantId as string);

      if (error) throw error;

      toast({
        title: "Identidade atualizada",
        description: "Sua marca foi salva e já aparece no header.",
      });
      tenantQuery.refetch();
    } catch (e: any) {
      toast({
        title: "Não foi possível salvar",
        description: e?.message ?? String(e),
        variant: "destructive",
      });
    }
  }

  async function changePassword() {
    try {
      if (!newPassword || newPassword.length < 8) {
        toast({
          title: "Senha fraca",
          description: "Use pelo menos 8 caracteres.",
          variant: "destructive",
        });
        return;
      }
      if (newPassword !== newPassword2) {
        toast({
          title: "Senhas não conferem",
          description: "Confirme a senha novamente.",
          variant: "destructive",
        });
        return;
      }

      setPwSaving(true);
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast({
        title: "Senha alterada",
        description: "Sua senha foi atualizada com sucesso.",
      });

      setPwOpen(false);
      setNewPassword("");
      setNewPassword2("");
    } catch (e: any) {
      toast({
        title: "Não foi possível alterar a senha",
        description: e?.message ?? String(e),
        variant: "destructive",
      });
    } finally {
      setPwSaving(false);
    }
  }

  async function createInvite() {
    try {
      const mail = inviteEmail.trim().toLowerCase();
      if (!mail || !mail.includes("@")) {
        toast({
          title: "E-mail inválido",
          description: "Informe um e-mail válido para enviar o convite.",
          variant: "destructive",
        });
        return;
      }

      setInviteSaving(true);
      const { data: tenantId, error: tenantErr } = await supabase.rpc(
        "get_hr_tenant"
      );
      if (tenantErr) throw tenantErr;

      const { error } = await supabase.from("hr_team_invites").insert({
        tenant_id: tenantId as string,
        email: mail,
        role: inviteRole,
        invited_by: session?.user.id,
      });

      if (error) throw error;

      toast({
        title: "Convite criado",
        description: "O convite foi registrado. (Envio por e-mail pode ser integrado depois.)",
      });

      setInviteOpen(false);
      setInviteEmail("");
      setInviteRole("RECRUITER");
      invitesQuery.refetch();
    } catch (e: any) {
      if (isTrialLimitError(e)) {
        openPremium("limit");
        toast({
          title: "Limite do trial atingido",
          description:
            "Para adicionar mais membros na equipe, ative o acesso vitalício.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Não foi possível convidar",
        description: e?.message ?? String(e),
        variant: "destructive",
      });
    } finally {
      setInviteSaving(false);
    }
  }

  async function deleteInvite(inviteId: string) {
    try {
      const { error } = await supabase
        .from("hr_team_invites")
        .delete()
        .eq("id", inviteId);
      if (error) throw error;
      invitesQuery.refetch();
      toast({
        title: "Convite removido",
        description: "O convite foi revogado com sucesso.",
      });
    } catch (e: any) {
      toast({
        title: "Não foi possível remover",
        description: e?.message ?? String(e),
        variant: "destructive",
      });
    }
  }

  if (!isLoading && !session) return <Navigate to="/login" replace />;

  return (
    <Layout>
      <motion.div
        initial="hidden"
        animate="show"
        variants={fadeUp}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
        className="space-y-4"
      >
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--primary))]/10 px-3 py-1 text-xs font-semibold text-[hsl(var(--primary))] ring-1 ring-[hsl(var(--primary))]/15 dark:bg-[hsl(var(--primary))]/15 dark:text-white">
            <SettingsIcon className="h-3.5 w-3.5" />
            Configurações & Equipe
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Perfil, membros da agência e identidade da marca — com controle de
            acesso por role.
          </p>
        </div>

        <Tabs
          value={tab}
          onValueChange={(v) => {
            setParams((prev) => {
              const p = new URLSearchParams(prev);
              p.set("tab", v);
              return p;
            });
          }}
          className="grid gap-4 lg:grid-cols-[280px_1fr]"
        >
          <TabsList className="h-fit w-full flex-col items-stretch gap-2 rounded-[28px] bg-[#F8FAFC]/80 p-2 ring-1 ring-slate-200 backdrop-blur-md dark:bg-white/5 dark:ring-white/10">
            <TabsTrigger
              value="profile"
              className={cn(
                "justify-start rounded-2xl px-4 py-3 text-left",
                "data-[state=active]:bg-[hsl(var(--electric-indigo))] data-[state=active]:text-white",
                "data-[state=active]:shadow-[0_18px_55px_-36px_rgba(111,0,255,0.95)]"
              )}
            >
              <UserRound className="mr-3 h-4 w-4" />
              Perfil pessoal
            </TabsTrigger>

            {isAdmin ? (
              <TabsTrigger
                value="team"
                className={cn(
                  "justify-start rounded-2xl px-4 py-3 text-left",
                  "data-[state=active]:bg-[hsl(var(--electric-indigo))] data-[state=active]:text-white",
                  "data-[state=active]:shadow-[0_18px_55px_-36px_rgba(111,0,255,0.95)]"
                )}
              >
                <Users className="mr-3 h-4 w-4" />
                Gestão de equipe
              </TabsTrigger>
            ) : null}

            {isAdmin ? (
              <TabsTrigger
                value="brand"
                className={cn(
                  "justify-start rounded-2xl px-4 py-3 text-left",
                  "data-[state=active]:bg-[hsl(var(--electric-indigo))] data-[state=active]:text-white",
                  "data-[state=active]:shadow-[0_18px_55px_-36px_rgba(111,0,255,0.95)]"
                )}
              >
                <Building2 className="mr-3 h-4 w-4" />
                Identidade da agência
              </TabsTrigger>
            ) : null}

            <div className="px-3 pt-2 text-xs text-slate-500 dark:text-slate-400">
              Role atual: <b className="text-slate-700 dark:text-slate-200">{roleQuery.data ?? "—"}</b>
            </div>
          </TabsList>

          {/* Perfil */}
          <TabsContent value="profile" className="m-0">
            <Card className="rounded-[28px] p-6 hr-glass">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16 rounded-3xl ring-1 ring-slate-200 dark:ring-white/10">
                    <AvatarImage src={avatarDataUrl ?? undefined} />
                    <AvatarFallback className="rounded-3xl bg-white/60 text-slate-700 dark:bg-white/10 dark:text-slate-200">
                      {(fullName || session?.user.email || "U")
                        .slice(0, 1)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div>
                    <div className="text-sm font-semibold">Foto</div>
                    <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      Upload rápido para personalizar seu perfil.
                    </div>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        try {
                          if (f.size > 1024 * 1024) {
                            throw new Error("Use uma imagem de até 1MB.");
                          }
                          const url = await fileToDataUrl(f);
                          setAvatarDataUrl(url);
                        } catch (err: any) {
                          toast({
                            title: "Upload falhou",
                            description: err?.message ?? String(err),
                            variant: "destructive",
                          });
                        }
                      }}
                    />
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-10 rounded-xl hr-btn-secondary"
                        onClick={() => avatarInputRef.current?.click()}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Enviar foto
                      </Button>
                      {avatarDataUrl ? (
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-10 rounded-xl hr-btn-secondary"
                          onClick={() => setAvatarDataUrl(null)}
                        >
                          Remover
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>

                <Dialog open={pwOpen} onOpenChange={setPwOpen}>
                  <DialogTrigger asChild>
                    <Button
                      type="button"
                      className="h-10 rounded-xl bg-[hsl(var(--electric-indigo))] text-white shadow-[0_16px_50px_-34px_rgba(111,0,255,0.9)]"
                    >
                      <KeyRound className="mr-2 h-4 w-4" />
                      Alterar senha
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md rounded-[28px] p-0 hr-glass">
                    <div className="p-6">
                      <DialogHeader>
                        <DialogTitle>Alterar senha</DialogTitle>
                      </DialogHeader>

                      <div className="mt-4 space-y-3">
                        <div>
                          <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                            Nova senha
                          </Label>
                          <Input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="mt-2 h-11 rounded-2xl bg-white/70 ring-1 ring-slate-200 backdrop-blur-md dark:bg-white/5 dark:ring-white/10"
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                            Confirmar senha
                          </Label>
                          <Input
                            type="password"
                            value={newPassword2}
                            onChange={(e) => setNewPassword2(e.target.value)}
                            className="mt-2 h-11 rounded-2xl bg-white/70 ring-1 ring-slate-200 backdrop-blur-md dark:bg-white/5 dark:ring-white/10"
                          />
                        </div>
                      </div>

                      <div className="mt-6 flex items-center justify-between gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-11 rounded-xl hr-btn-secondary"
                          onClick={() => setPwOpen(false)}
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="button"
                          className="h-11 rounded-xl bg-[hsl(var(--electric-indigo))] text-white"
                          onClick={changePassword}
                          disabled={pwSaving}
                        >
                          {pwSaving ? "Salvando…" : "Atualizar"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Nome
                  </Label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="mt-2 h-11 rounded-2xl bg-white/70 ring-1 ring-slate-200 backdrop-blur-md dark:bg-white/5 dark:ring-white/10"
                    placeholder="Seu nome"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Cargo
                  </Label>
                  <Input
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="mt-2 h-11 rounded-2xl bg-white/70 ring-1 ring-slate-200 backdrop-blur-md dark:bg-white/5 dark:ring-white/10"
                    placeholder="Ex.: Recrutador(a)"
                  />
                </div>

                <div className="sm:col-span-2">
                  <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    E-mail
                  </Label>
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-2 h-11 rounded-2xl bg-white/70 ring-1 ring-slate-200 backdrop-blur-md dark:bg-white/5 dark:ring-white/10"
                    placeholder="seu@email.com"
                    inputMode="email"
                  />
                  <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Trocar e-mail pode exigir confirmação (dependendo da política do
                    projeto).
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Role
                  </Label>
                  <div className="mt-2 inline-flex items-center gap-2">
                    <Badge className="rounded-full bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] ring-1 ring-[hsl(var(--primary))]/15 dark:bg-[hsl(var(--primary))]/15 dark:text-white">
                      {roleQuery.data ?? "—"}
                    </Badge>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Controlado pelo Admin da agência.
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between gap-3">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  As informações ficam vinculadas ao seu tenant via RLS.
                </div>
                <Button
                  type="button"
                  className="h-11 rounded-xl bg-[hsl(var(--electric-indigo))] text-white shadow-[0_18px_60px_-34px_rgba(111,0,255,0.95)]"
                  onClick={saveProfile}
                  disabled={profileQuery.isFetching}
                >
                  Salvar alterações
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* Equipe */}
          <TabsContent value="team" className="m-0">
            {!isAdmin ? (
              <AccessDeniedCard
                title="Acesso negado"
                subtitle="A área de equipe é restrita a usuários Admin."
              />
            ) : (
              <div className="space-y-4">
                <Card className="rounded-[28px] p-6 hr-glass">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-base font-semibold tracking-tight">
                        Membros da agência
                      </div>
                      <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                        Visualize quem tem acesso e convide novos membros.
                      </div>
                    </div>

                    <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                      <DialogTrigger asChild>
                        <Button
                          type="button"
                          className="h-10 rounded-xl bg-[hsl(var(--electric-indigo))] text-white shadow-[0_16px_50px_-34px_rgba(111,0,255,0.9)]"
                        >
                          <MailPlus className="mr-2 h-4 w-4" />
                          + Convidar membro
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md rounded-[28px] p-0 hr-glass">
                        <div className="p-6">
                          <DialogHeader>
                            <DialogTitle>Convidar membro</DialogTitle>
                          </DialogHeader>

                          <div className="mt-4 space-y-3">
                            <div>
                              <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                                E-mail
                              </Label>
                              <Input
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                className="mt-2 h-11 rounded-2xl bg-white/70 ring-1 ring-slate-200 backdrop-blur-md dark:bg-white/5 dark:ring-white/10"
                                placeholder="membro@agencia.com"
                                inputMode="email"
                              />
                            </div>

                            <div>
                              <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                                Role
                              </Label>
                              <div className="mt-2 grid grid-cols-2 gap-2">
                                {([
                                  { value: "RECRUITER", label: "Recrutador" },
                                  { value: "ADMIN", label: "Admin" },
                                ] as const).map((r) => (
                                  <button
                                    key={r.value}
                                    type="button"
                                    onClick={() => setInviteRole(r.value)}
                                    className={cn(
                                      "rounded-2xl px-3 py-3 text-sm font-semibold ring-1 transition",
                                      inviteRole === r.value
                                        ? "bg-[hsl(var(--electric-indigo))] text-white ring-[hsl(var(--electric-indigo))]/40"
                                        : "bg-white/60 text-slate-700 ring-slate-200 hover:bg-white dark:bg-white/5 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-white/10"
                                    )}
                                  >
                                    {r.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="mt-6 flex items-center justify-between gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              className="h-11 rounded-xl hr-btn-secondary"
                              onClick={() => setInviteOpen(false)}
                            >
                              Cancelar
                            </Button>
                            <Button
                              type="button"
                              className="h-11 rounded-xl bg-[hsl(var(--electric-indigo))] text-white"
                              onClick={createInvite}
                              disabled={inviteSaving}
                            >
                              {inviteSaving ? "Criando…" : "Criar convite"}
                            </Button>
                          </div>

                          <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                            Esse fluxo registra o convite no sistema. Integração de
                            envio por e-mail pode ser ativada depois.
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  <div className="mt-5 overflow-hidden rounded-2xl ring-1 ring-slate-200 dark:ring-white/10">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-[#F8FAFC]/80 dark:bg-white/5">
                          <TableHead className="text-slate-600 dark:text-slate-300">
                            Nome
                          </TableHead>
                          <TableHead className="text-slate-600 dark:text-slate-300">
                            Cargo
                          </TableHead>
                          <TableHead className="text-slate-600 dark:text-slate-300">
                            Role
                          </TableHead>
                          <TableHead className="text-slate-600 dark:text-slate-300">
                            E-mail
                          </TableHead>
                          <TableHead className="text-right text-slate-600 dark:text-slate-300">
                            ID
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(teamQuery.data ?? []).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="py-10 text-center">
                              <div className="text-sm text-slate-600 dark:text-slate-300">
                                Nenhum membro encontrado.
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          (teamQuery.data ?? []).map((m) => (
                            <TableRow
                              key={m.id}
                              className="transition hover:bg-[#F8FAFC]/80 dark:hover:bg-white/5"
                            >
                              <TableCell className="font-medium">
                                {m.full_name ?? "—"}
                              </TableCell>
                              <TableCell className="text-slate-600 dark:text-slate-300">
                                {m.job_title ?? "—"}
                              </TableCell>
                              <TableCell>
                                <Badge className="rounded-full bg-white/60 text-slate-700 ring-1 ring-slate-200 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10">
                                  {m.role ?? "—"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-slate-600 dark:text-slate-300">
                                {m.email ?? "—"}
                              </TableCell>
                              <TableCell className="text-right text-xs text-slate-500 dark:text-slate-400">
                                {m.id.slice(0, 8)}…
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </Card>

                <Card className="rounded-[28px] p-6 hr-glass">
                  <div className="text-base font-semibold tracking-tight">
                    Convites pendentes
                  </div>
                  <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    Convites registrados para este tenant.
                  </div>

                  <div className="mt-5 overflow-hidden rounded-2xl ring-1 ring-slate-200 dark:ring-white/10">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-[#F8FAFC]/80 dark:bg-white/5">
                          <TableHead className="text-slate-600 dark:text-slate-300">
                            E-mail
                          </TableHead>
                          <TableHead className="text-slate-600 dark:text-slate-300">
                            Role
                          </TableHead>
                          <TableHead className="text-slate-600 dark:text-slate-300">
                            Criado
                          </TableHead>
                          <TableHead className="text-right text-slate-600 dark:text-slate-300">
                            Ações
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(invitesQuery.data ?? []).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="py-10 text-center">
                              <div className="text-sm text-slate-600 dark:text-slate-300">
                                Sem convites pendentes.
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          (invitesQuery.data ?? []).map((i) => (
                            <TableRow
                              key={i.id}
                              className="transition hover:bg-[#F8FAFC]/80 dark:hover:bg-white/5"
                            >
                              <TableCell className="font-medium">
                                {i.email}
                              </TableCell>
                              <TableCell>
                                <Badge className="rounded-full bg-white/60 text-slate-700 ring-1 ring-slate-200 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10">
                                  {i.role}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-slate-600 dark:text-slate-300">
                                {new Date(i.created_at).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  className="h-10 rounded-xl hr-btn-secondary"
                                  onClick={() => deleteInvite(i.id)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Revogar
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Identidade */}
          <TabsContent value="brand" className="m-0">
            {!isAdmin ? (
              <AccessDeniedCard
                title="Acesso negado"
                subtitle="A identidade da agência é gerenciada apenas por Admin."
              />
            ) : (
              <Card className="rounded-[28px] p-6 hr-glass">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-base font-semibold tracking-tight">
                      Identidade da agência
                    </div>
                    <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      Atualize nome, slogan e logomarca (reflete no header).
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        try {
                          if (f.size > 1024 * 1024) {
                            throw new Error("Use uma imagem de até 1MB.");
                          }
                          const url = await fileToDataUrl(f);
                          setLogoDataUrl(url);
                        } catch (err: any) {
                          toast({
                            title: "Upload falhou",
                            description: err?.message ?? String(err),
                            variant: "destructive",
                          });
                        }
                      }}
                    />

                    <Button
                      type="button"
                      variant="secondary"
                      className="h-10 rounded-xl hr-btn-secondary"
                      onClick={() => logoInputRef.current?.click()}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Upload logo
                    </Button>
                    {logoDataUrl ? (
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-10 rounded-xl hr-btn-secondary"
                        onClick={() => setLogoDataUrl(null)}
                      >
                        Remover
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-3 rounded-3xl bg-white/60 p-4 ring-1 ring-slate-200 dark:bg-white/5 dark:ring-white/10">
                  <div className="h-12 w-12 overflow-hidden rounded-2xl bg-white/70 ring-1 ring-slate-200 dark:bg-white/10 dark:ring-white/10">
                    {logoDataUrl ? (
                      <img
                        src={logoDataUrl}
                        alt="Logo da agência"
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Logo
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                      Preview
                    </div>
                    <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      {agencyName || tenantQuery.data?.name || "Agência"}
                      {slogan ? (
                        <span className="text-slate-500 dark:text-slate-400">
                          {" "}• {slogan}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Nome da agência
                    </Label>
                    <Input
                      value={agencyName}
                      onChange={(e) => setAgencyName(e.target.value)}
                      className="mt-2 h-11 rounded-2xl bg-white/70 ring-1 ring-slate-200 backdrop-blur-md dark:bg-white/5 dark:ring-white/10"
                      placeholder="Ex.: Neon Talent Co."
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Slogan
                    </Label>
                    <Input
                      value={slogan}
                      onChange={(e) => setSlogan(e.target.value)}
                      className="mt-2 h-11 rounded-2xl bg-white/70 ring-1 ring-slate-200 backdrop-blur-md dark:bg-white/5 dark:ring-white/10"
                      placeholder="Ex.: Contratações com precisão."
                    />
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between gap-3">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Alterações são salvas no tenant atual (RLS).
                  </div>
                  <Button
                    type="button"
                    className="h-11 rounded-xl bg-[hsl(var(--electric-indigo))] text-white shadow-[0_18px_60px_-34px_rgba(111,0,255,0.95)]"
                    onClick={saveBrand}
                  >
                    Salvar identidade
                  </Button>
                </div>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>
    </Layout>
  );
}