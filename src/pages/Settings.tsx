import { useMemo, useRef, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { usePremium } from "@/components/premium/PremiumContext";
import {
  Building2,
  KeyRound,
  MailPlus,
  Settings as SettingsIcon,
  ShieldAlert,
  Trash2,
  Upload,
  UserRound,
  Users,
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

function SectionTitle({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] ring-1 ring-[hsl(var(--primary))]/20">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">
          {title}
        </div>
        <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          {subtitle}
        </div>
      </div>
    </div>
  );
}

function AccessDeniedCard({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <Card className="rounded-[28px] p-6 hr-glass">
      <SectionTitle icon={ShieldAlert} title={title} subtitle={subtitle} />
    </Card>
  );
}

function SettingsContent() {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const { openPremium } = usePremium();
  const [params, setParams] = useSearchParams();

  const tab = (params.get("tab") ?? "profile") as "profile" | "team" | "brand";

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

  const invitesQuery = useQuery({
    queryKey: ["hr_team_invites"],
    enabled: !!session && isAdmin,
    queryFn: async () => {
      const { data: tenantId, error: tenantErr } = await supabase.rpc(
        "get_hr_tenant"
      );
      if (tenantErr) throw tenantErr;

      const { data, error } = await supabase
        .from("hr_team_invites")
        .select("id, email, role, created_at, accepted_at")
        .eq("tenant_id", tenantId as string)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as TeamInvite[];
    },
  });

  const [profileFullName, setProfileFullName] = useState("");
  const [profileJobTitle, setProfileJobTitle] = useState("");
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const [newPassword, setNewPassword] = useState("");

  const [tenantName, setTenantName] = useState("");
  const [tenantSlogan, setTenantSlogan] = useState("");
  const [tenantLogo, setTenantLogo] = useState<string | null>(null);
  const tenantLogoInputRef = useRef<HTMLInputElement | null>(null);

  const [inviteFullName, setInviteFullName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"RECRUITER" | "ADMIN">("RECRUITER");

  // hydrate local state
  useMemo(() => {
    const p = profileQuery.data;
    if (!p) return;
    setProfileFullName((v) => (v ? v : p.full_name ?? ""));
    setProfileJobTitle((v) => (v ? v : p.job_title ?? ""));
    setProfileAvatar((v) => (v ? v : p.avatar_data_url ?? null));
  }, [profileQuery.data]);

  useMemo(() => {
    const t = tenantQuery.data;
    if (!t) return;
    setTenantName((v) => (v ? v : t.name ?? ""));
    setTenantSlogan((v) => (v ? v : t.slogan ?? ""));
    setTenantLogo((v) => (v ? v : t.logo_data_url ?? null));
  }, [tenantQuery.data]);

  async function onPickAvatar(file: File | null) {
    if (!file) return;
    const url = await fileToDataUrl(file);
    setProfileAvatar(url);
  }

  async function onPickTenantLogo(file: File | null) {
    if (!file) return;
    const url = await fileToDataUrl(file);
    setTenantLogo(url);
  }

  async function saveProfile() {
    if (!session) return;

    const { error } = await supabase
      .from("hr_profiles")
      .update({
        full_name: profileFullName.trim() || null,
        job_title: profileJobTitle.trim() || null,
        avatar_data_url: profileAvatar,
      })
      .eq("id", session.user.id);

    if (error) {
      toast({
        title: "Não foi possível salvar",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    await queryClient.invalidateQueries({ queryKey: ["hr_profile_me"] });
    toast({ title: "Perfil atualizado", description: "Alterações salvas com sucesso." });
  }

  async function savePassword() {
    if (!newPassword.trim()) return;

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      toast({
        title: "Não foi possível atualizar a senha",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setNewPassword("");
    toast({ title: "Senha atualizada", description: "Sua nova senha já está ativa." });
  }

  async function saveTenant() {
    const tenantId = tenantQuery.data?.id;
    if (!tenantId) return;

    const { error } = await supabase
      .from("hr_tenants")
      .update({
        name: tenantName.trim() || "Agência",
        slogan: tenantSlogan.trim() || null,
        logo_data_url: tenantLogo,
      })
      .eq("id", tenantId);

    if (error) {
      toast({
        title: "Não foi possível salvar a marca",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    await queryClient.invalidateQueries({ queryKey: ["hr_tenant_brand"] });
    await queryClient.invalidateQueries({ queryKey: ["hr_tenant_branding"] });
    await queryClient.invalidateQueries({ queryKey: ["hr_agency_name_for_premium"] });

    toast({ title: "Marca atualizada", description: "Sua identidade foi salva." });
  }

  async function createInvite() {
    const tenantId = tenantQuery.data?.id;
    const tenantName = tenantQuery.data?.name;
    if (!tenantId || !tenantName) return;

    const fullName = inviteFullName.trim();
    const email = inviteEmail.trim().toLowerCase();

    if (fullName.length < 3) {
      toast({
        title: "Nome obrigatório",
        description: "Informe o nome completo do recrutador para o convite.",
        variant: "destructive",
      });
      return;
    }

    if (!email.includes("@")) {
      toast({
        title: "E-mail inválido",
        description: "Informe um e-mail válido para enviar o convite.",
        variant: "destructive",
      });
      return;
    }

    const { data: created, error } = await supabase
      .from("hr_team_invites")
      .insert({
        tenant_id: tenantId,
        full_name: fullName,
        email,
        role: inviteRole,
        invited_by: session?.user.id ?? null,
      })
      .select("token")
      .single();

    if (error) {
      if (isTrialLimitError(error)) {
        openPremium("limit");
        toast({
          title: "Limite do Trial",
          description:
            "Seu plano atual limita o tamanho da equipe. Faça upgrade para convidar mais pessoas.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Não foi possível enviar",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    // Envio de e-mail (convite) via Edge Function
    const appUrl = window.location.origin;
    const { error: mailErr } = await supabase.functions.invoke(
      "hr-send-team-invite",
      {
        body: {
          to: email,
          tenantName,
          role: inviteRole,
          inviteToken: (created as any)?.token,
          appUrl,
        },
      }
    );

    if (mailErr) {
      toast({
        title: "Convite registrado, mas o e-mail falhou",
        description:
          "O convite foi salvo, porém não conseguimos enviar o e-mail agora. Tente novamente em instantes.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Convite enviado",
        description: "O recrutador receberá um e-mail com o link para aceitar o convite.",
      });
    }

    setInviteFullName("");
    setInviteEmail("");
    await queryClient.invalidateQueries({ queryKey: ["hr_team_invites"] });
  }

  async function deleteInvite(inviteId: string) {
    const { error } = await supabase.from("hr_team_invites").delete().eq("id", inviteId);
    if (error) {
      toast({
        title: "Não foi possível remover",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    await queryClient.invalidateQueries({ queryKey: ["hr_team_invites"] });
    toast({ title: "Convite removido", description: "O convite foi excluído." });
  }

  const pageHeader = (
    <div className="mb-6">
      <div className="flex items-center gap-2">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[hsl(var(--electric-indigo))]/10 text-[hsl(var(--electric-indigo))] ring-1 ring-[hsl(var(--electric-indigo))]/20">
          <SettingsIcon className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Ajuste seu perfil, time e a marca do seu tenant.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={fadeUp}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
    >
      {pageHeader}

      <Tabs
        value={tab}
        onValueChange={(v) => setParams({ tab: v })}
        className="w-full"
      >
        <TabsList className="h-11 w-full justify-start gap-1 rounded-2xl bg-white/70 p-1 ring-1 ring-slate-200 dark:bg-white/5 dark:ring-white/10">
          <TabsTrigger
            value="profile"
            className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-white/10"
          >
            <UserRound className="mr-2 h-4 w-4" />
            Perfil
          </TabsTrigger>
          <TabsTrigger
            value="team"
            className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-white/10"
          >
            <Users className="mr-2 h-4 w-4" />
            Time
          </TabsTrigger>
          <TabsTrigger
            value="brand"
            className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-white/10"
          >
            <Building2 className="mr-2 h-4 w-4" />
            Marca
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-5">
          <div className="grid gap-5 lg:grid-cols-2">
            <Card className="rounded-[28px] p-6 hr-glass">
              <SectionTitle
                icon={UserRound}
                title="Seu perfil"
                subtitle="Essas informações aparecem para sua equipe dentro do tenant."
              />

              <div className="mt-5 flex items-center gap-4">
                <Avatar className="h-14 w-14 rounded-2xl">
                  <AvatarImage src={profileAvatar ?? ""} />
                  <AvatarFallback className="rounded-2xl bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200">
                    {(profileQuery.data?.full_name ?? session?.user.email ?? "U")
                      .slice(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    {profileQuery.data?.email ?? session?.user.email}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge className="rounded-full bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] ring-1 ring-[hsl(var(--primary))]/15">
                      {String(profileQuery.data?.role ?? "MEMBER")}
                    </Badge>
                    {profileQuery.isLoading ? (
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Carregando…
                      </span>
                    ) : null}
                  </div>
                </div>

                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => void onPickAvatar(e.target.files?.[0] ?? null)}
                />

                <Button
                  type="button"
                  variant="secondary"
                  className="h-10 rounded-xl hr-btn-secondary"
                  onClick={() => avatarInputRef.current?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Foto
                </Button>
              </div>

              <div className="mt-6 grid gap-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    value={profileFullName}
                    onChange={(e) => setProfileFullName(e.target.value)}
                    placeholder="Ex.: Maria Souza"
                    className="h-11 rounded-2xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cargo</Label>
                  <Input
                    value={profileJobTitle}
                    onChange={(e) => setProfileJobTitle(e.target.value)}
                    placeholder="Ex.: Tech Recruiter"
                    className="h-11 rounded-2xl"
                  />
                </div>

                <div className="pt-1">
                  <Button
                    type="button"
                    className="h-11 w-full rounded-2xl hr-btn-primary"
                    onClick={() => void saveProfile()}
                    disabled={profileQuery.isLoading}
                  >
                    Salvar perfil
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="rounded-[28px] p-6 hr-glass">
              <SectionTitle
                icon={KeyRound}
                title="Segurança"
                subtitle="Atualize sua senha sempre que precisar."
              />

              <div className="mt-6 grid gap-4">
                <div className="space-y-2">
                  <Label>Nova senha</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="h-11 rounded-2xl"
                    autoComplete="new-password"
                  />
                </div>

                <Button
                  type="button"
                  className="h-11 rounded-2xl hr-btn-primary"
                  onClick={() => void savePassword()}
                  disabled={newPassword.trim().length < 8}
                >
                  Atualizar senha
                </Button>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Dica: se você estiver com a conta pendente de confirmação, finalize
                  pelo e-mail antes de trocar informações.
                </p>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="team" className="mt-5">
          {!isAdmin ? (
            <AccessDeniedCard
              title="Apenas administradores"
              subtitle="Somente Admins podem convidar membros para o time."
            />
          ) : (
            <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
              <Card className="rounded-[28px] p-6 hr-glass">
                <SectionTitle
                  icon={MailPlus}
                  title="Convidar para o time"
                  subtitle="Envie um e-mail com link para o recrutador criar a conta e entrar no seu tenant."
                />

                <div className="mt-6 grid gap-4">
                  <div className="space-y-2">
                    <Label>Nome completo</Label>
                    <Input
                      value={inviteFullName}
                      onChange={(e) => setInviteFullName(e.target.value)}
                      placeholder="Ex.: Marina Carvalho"
                      className="h-11 rounded-2xl"
                      autoComplete="name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>E-mail</Label>
                    <Input
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="pessoa@empresa.com"
                      className="h-11 rounded-2xl"
                      autoComplete="email"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Perfil</Label>
                    <Select
                      value={inviteRole}
                      onValueChange={(v) => setInviteRole(v as any)}
                    >
                      <SelectTrigger className="h-11 rounded-2xl">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="RECRUITER">Recruiter</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    type="button"
                    className="h-11 rounded-2xl hr-btn-primary"
                    onClick={() => void createInvite()}
                    disabled={
                      inviteEmail.trim().length === 0 ||
                      inviteFullName.trim().length < 3 ||
                      invitesQuery.isLoading
                    }
                  >
                    Enviar convite
                  </Button>

                  <div className="rounded-2xl bg-white/60 p-3 text-xs text-slate-600 ring-1 ring-slate-200 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10">
                    Importante: em ambientes novos, o provedor de e-mail (Resend)
                    precisa estar configurado nos Secrets.
                  </div>
                </div>
              </Card>

              <Card className="rounded-[28px] p-6 hr-glass">
                <SectionTitle
                  icon={Users}
                  title="Convites registrados"
                  subtitle="Lista dos convites vinculados ao seu tenant."
                />

                <div className="mt-5 overflow-hidden rounded-2xl ring-1 ring-slate-200 dark:ring-white/10">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/80 dark:bg-white/5">
                        <TableHead>E-mail</TableHead>
                        <TableHead>Perfil</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(invitesQuery.data ?? []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4}>
                            <div className="py-6 text-center text-sm text-slate-600 dark:text-slate-300">
                              Nenhum convite ainda.
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        (invitesQuery.data ?? []).map((inv) => {
                          const accepted = !!inv.accepted_at;
                          return (
                            <TableRow key={inv.id}>
                              <TableCell className="font-medium">
                                {inv.email}
                              </TableCell>
                              <TableCell>{inv.role}</TableCell>
                              <TableCell>
                                {accepted ? (
                                  <Badge className="rounded-full bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-200">
                                    Aceito
                                  </Badge>
                                ) : (
                                  <Badge className="rounded-full bg-amber-500/15 text-amber-700 ring-1 ring-amber-500/20 dark:text-amber-200">
                                    Pendente
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  className={cn(
                                    "h-9 rounded-xl hr-btn-secondary",
                                    accepted && "opacity-50"
                                  )}
                                  disabled={accepted}
                                  onClick={() => void deleteInvite(inv.id)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Remover
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="brand" className="mt-5">
          {!isAdmin ? (
            <AccessDeniedCard
              title="Marca protegida"
              subtitle="Somente Admins podem alterar a identidade do tenant."
            />
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              <Card className="rounded-[28px] p-6 hr-glass">
                <SectionTitle
                  icon={Building2}
                  title="Identidade do tenant"
                  subtitle="Defina o nome e slogan que aparecem no painel e nas vagas públicas."
                />

                <div className="mt-6 grid gap-4">
                  <div className="space-y-2">
                    <Label>Nome</Label>
                    <Input
                      value={tenantName}
                      onChange={(e) => setTenantName(e.target.value)}
                      className="h-11 rounded-2xl"
                      placeholder="Ex.: Virtus RH"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Slogan</Label>
                    <Input
                      value={tenantSlogan}
                      onChange={(e) => setTenantSlogan(e.target.value)}
                      className="h-11 rounded-2xl"
                      placeholder="Ex.: Recrutamento de precisão"
                    />
                  </div>

                  <Button
                    type="button"
                    className="h-11 rounded-2xl hr-btn-primary"
                    onClick={() => void saveTenant()}
                    disabled={tenantQuery.isLoading}
                  >
                    Salvar marca
                  </Button>
                </div>
              </Card>

              <Card className="rounded-[28px] p-6 hr-glass">
                <SectionTitle
                  icon={Upload}
                  title="Logo"
                  subtitle="Suba uma imagem para aparecer no topo do painel."
                />

                <div className="mt-6 flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200 dark:bg-white/5 dark:ring-white/10">
                    {tenantLogo ? (
                      <img
                        src={tenantLogo}
                        alt="Logo"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Building2 className="h-6 w-6 text-slate-400" />
                    )}
                  </div>

                  <input
                    ref={tenantLogoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => void onPickTenantLogo(e.target.files?.[0] ?? null)}
                  />

                  <div className="flex-1">
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-11 w-full rounded-2xl hr-btn-secondary"
                      onClick={() => tenantLogoInputRef.current?.click()}
                    >
                      Selecionar imagem
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="mt-2 h-10 w-full rounded-2xl hr-btn-secondary"
                      onClick={() => setTenantLogo(null)}
                    >
                      Remover
                    </Button>
                  </div>
                </div>

                <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                  Recomendações: PNG quadrado, fundo transparente, até 200KB.
                </p>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

export default function Settings() {
  const { session, isLoading } = useSession();

  if (isLoading) return null;
  if (!session) return <Navigate to="/login" replace />;

  return (
    <Layout>
      <SettingsContent />
    </Layout>
  );
}