import { useMemo, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Layout } from "@/components/Layout";
import { useSession } from "@/auth/SessionProvider";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Building2,
  Link2,
  Mail,
  Pencil,
  Plus,
  Search,
  Trash2,
  Phone,
  Upload,
  X,
} from "lucide-react";

type ClientRow = {
  id: string;
  name: string;
  logo_url: string | null;
  cpf_cnpj: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  created_at: string;
};

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

function normalizeUrl(input: string) {
  const v = input.trim();
  if (!v) return "";
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  if (v.startsWith("data:")) return v;
  return `https://${v}`;
}

function onlyDigits(v: string) {
  return v.replace(/\D/g, "");
}

function formatPhoneBR(raw: string) {
  const digits = onlyDigits(raw).slice(0, 11);
  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);

  if (!digits) return "";
  if (digits.length <= 2) return `(${ddd}`;

  // 10 digits: (11) 1234-5678
  if (digits.length <= 10) {
    const p1 = rest.slice(0, 4);
    const p2 = rest.slice(4, 8);
    if (rest.length <= 4) return `(${ddd}) ${p1}`;
    return `(${ddd}) ${p1}-${p2}`;
  }

  // 11 digits: (11) 91234-5678
  const p1 = rest.slice(0, 5);
  const p2 = rest.slice(5, 9);
  if (rest.length <= 5) return `(${ddd}) ${p1}`;
  return `(${ddd}) ${p1}-${p2}`;
}

function formatCpfCnpj(raw: string) {
  const digits = onlyDigits(raw).slice(0, 14);
  if (!digits) return "";

  // CPF: 000.000.000-00
  if (digits.length <= 11) {
    const p1 = digits.slice(0, 3);
    const p2 = digits.slice(3, 6);
    const p3 = digits.slice(6, 9);
    const p4 = digits.slice(9, 11);

    if (digits.length <= 3) return p1;
    if (digits.length <= 6) return `${p1}.${p2}`;
    if (digits.length <= 9) return `${p1}.${p2}.${p3}`;
    return `${p1}.${p2}.${p3}-${p4}`;
  }

  // CNPJ: 00.000.000/0000-00
  const p1 = digits.slice(0, 2);
  const p2 = digits.slice(2, 5);
  const p3 = digits.slice(5, 8);
  const p4 = digits.slice(8, 12);
  const p5 = digits.slice(12, 14);

  if (digits.length <= 2) return p1;
  if (digits.length <= 5) return `${p1}.${p2}`;
  if (digits.length <= 8) return `${p1}.${p2}.${p3}`;
  if (digits.length <= 12) return `${p1}.${p2}.${p3}/${p4}`;
  return `${p1}.${p2}.${p3}/${p4}-${p5}`;
}

function isValidEmail(v: string) {
  const email = v.trim();
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhoneBR(v: string) {
  const len = onlyDigits(v).length;
  return len === 10 || len === 11;
}

function isValidCpfCnpj(v: string) {
  const len = onlyDigits(v).length;
  return len === 11 || len === 14;
}

export default function ClientsAdmin() {
  const { session, isLoading } = useSession();
  const queryClient = useQueryClient();

  const [q, setQ] = useState("");

  const [upsertOpen, setUpsertOpen] = useState(false);
  const [editing, setEditing] = useState<ClientRow | null>(null);
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const logoInputRef = useRef<HTMLInputElement | null>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [generatedLinkById, setGeneratedLinkById] = useState<Record<string, string>>(
    {}
  );
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const clientsQuery = useQuery({
    queryKey: ["hr_clients"],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_companies")
        .select("id, name, logo_url, cpf_cnpj, contact_email, contact_phone, created_at")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      return (data ?? []) as ClientRow[];
    },
  });

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    const list = clientsQuery.data ?? [];
    if (!query) return list;
    return list.filter((c) => {
      const email = (c.contact_email ?? "").toLowerCase();
      const phone = (c.contact_phone ?? "").toLowerCase();
      const doc = (c.cpf_cnpj ?? "").toLowerCase();
      return (
        c.name.toLowerCase().includes(query) ||
        email.includes(query) ||
        phone.includes(query) ||
        doc.includes(query)
      );
    });
  }, [clientsQuery.data, q]);

  function openCreate() {
    setEditing(null);
    setName("");
    setLogoUrl("");
    setCpfCnpj("");
    setContactEmail("");
    setContactPhone("");
    setUpsertOpen(true);
  }

  function openEdit(c: ClientRow) {
    setEditing(c);
    setName(c.name ?? "");
    setLogoUrl(c.logo_url ?? "");
    setCpfCnpj(c.cpf_cnpj ?? "");
    setContactEmail(c.contact_email ?? "");
    setContactPhone(c.contact_phone ?? "");
    setUpsertOpen(true);
  }

  const emailOk = isValidEmail(contactEmail);
  const phoneOk = isValidPhoneBR(contactPhone);
  const docOk = isValidCpfCnpj(cpfCnpj);

  async function onPickLogo(file: File | null) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result ?? "");
      setLogoUrl(url);
    };
    reader.readAsDataURL(file);
  }

  async function saveClient() {
    const n = name.trim();
    const email = contactEmail.trim().toLowerCase();
    const phoneFormatted = formatPhoneBR(contactPhone.trim());
    const docFormatted = formatCpfCnpj(cpfCnpj.trim());

    if (!n) {
      toast({
        title: "Preencha os campos obrigatórios",
        description: "Informe o nome do cliente.",
        variant: "destructive",
      });
      return;
    }

    if (!isValidCpfCnpj(docFormatted)) {
      toast({
        title: "CPF/CNPJ inválido",
        description: "Informe um CPF (11 dígitos) ou CNPJ (14 dígitos).",
        variant: "destructive",
      });
      return;
    }

    if (!isValidEmail(email)) {
      toast({
        title: "E-mail inválido",
        description: "Informe um e-mail válido do contato.",
        variant: "destructive",
      });
      return;
    }

    if (!isValidPhoneBR(phoneFormatted)) {
      toast({
        title: "Telefone inválido",
        description: "Informe um telefone válido com DDD (10 ou 11 dígitos).",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: n,
        cpf_cnpj: docFormatted,
        logo_url: logoUrl.trim() ? normalizeUrl(logoUrl) : null,
        contact_email: email,
        contact_phone: phoneFormatted,
      } as const;

      if (editing) {
        const { error } = await supabase
          .from("hr_companies")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;

        toast({
          title: "Cliente atualizado",
          description: "As informações foram salvas com sucesso.",
        });
      } else {
        const { data: tenantId, error: tenantErr } = await supabase.rpc(
          "get_hr_tenant"
        );
        if (tenantErr) throw tenantErr;

        const { error } = await supabase.from("hr_companies").insert({
          tenant_id: tenantId as string,
          ...payload,
        });

        if (error) throw error;

        toast({
          title: "Cliente cadastrado",
          description: "Você já pode vincular este cliente em novas vagas.",
        });
      }

      setUpsertOpen(false);
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ["hr_clients"] });
      queryClient.invalidateQueries({ queryKey: ["hr_companies"] });
    } catch (e: any) {
      toast({
        title: "Não foi possível salvar",
        description: e?.message ?? String(e),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("hr_companies").delete().eq("id", deleteId);
      if (error) throw error;

      toast({
        title: "Cliente removido",
        description: "O cadastro foi excluído.",
      });

      queryClient.invalidateQueries({ queryKey: ["hr_clients"] });
      queryClient.invalidateQueries({ queryKey: ["hr_companies"] });
      setDeleteId(null);
      setDeleteName(null);
    } catch (e: any) {
      toast({
        title: "Não foi possível excluir",
        description: e?.message ?? String(e),
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  }

  async function generateLink(companyId: string) {
    setGeneratingId(companyId);
    try {
      const { data, error } = await supabase.rpc("hr_get_or_create_client_portal_link", {
        p_company_id: companyId,
      });
      if (error) throw error;
      const token = String(data ?? "");
      const url = `${window.location.origin}/client/${token}`;

      setGeneratedLinkById((prev) => ({ ...prev, [companyId]: url }));
      await navigator.clipboard.writeText(url);
      toast({
        title: "Link copiado",
        description: "Envie para o cliente acessar o portal com segurança.",
      });
    } catch (e: any) {
      toast({
        title: "Não foi possível gerar o link",
        description: e?.message ?? String(e),
        variant: "destructive",
      });
    } finally {
      setGeneratingId(null);
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--primary))]/10 px-3 py-1 text-xs font-semibold text-[hsl(var(--primary))] ring-1 ring-[hsl(var(--primary))]/15 dark:bg-[hsl(var(--primary))]/15 dark:text-white">
              <Building2 className="h-3.5 w-3.5" />
              Gestão de Clientes
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight">Clientes</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Cadastre empresas, vincule vagas e gere links para o portal.
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-[340px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por nome, e-mail, telefone ou CPF/CNPJ…"
                className="h-11 rounded-2xl bg-white/70 pl-10 ring-1 ring-slate-200 backdrop-blur-md dark:bg-white/5 dark:ring-white/10"
              />
            </div>

            <Button className="h-11 rounded-xl hr-btn-primary" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Cliente
            </Button>
          </div>
        </div>

        <Card className="rounded-[28px] p-0 hr-glass">
          <div className="flex items-center justify-between gap-3 p-5">
            <div className="text-sm text-slate-600 dark:text-slate-300">
              {clientsQuery.isFetching ? "Carregando…" : `${rows.length} cliente(s)`}
            </div>
            <Badge className="rounded-full bg-white/60 text-slate-700 ring-1 ring-slate-200 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10">
              Ações rápidas: Editar • Excluir • Gerar Link
            </Badge>
          </div>

          {clientsQuery.error ? (
            <div className="px-5 pb-5">
              <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200 dark:bg-rose-950/30 dark:text-rose-200 dark:ring-rose-900/50">
                {(clientsQuery.error as any)?.message ?? String(clientsQuery.error)}
              </div>
            </div>
          ) : null}

          <div className="overflow-hidden rounded-b-[28px] ring-1 ring-[hsl(var(--electric-indigo))]/18 dark:ring-[hsl(var(--electric-indigo))]/20">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#F8FAFC]/80 dark:bg-white/5">
                  <TableHead className="text-slate-600 dark:text-slate-300">
                    Cliente
                  </TableHead>
                  <TableHead className="text-slate-600 dark:text-slate-300">
                    Contato
                  </TableHead>
                  <TableHead className="text-right text-slate-600 dark:text-slate-300">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {(clientsQuery.isFetching ? [] : rows).map((c) => {
                  const link = generatedLinkById[c.id] ?? null;
                  return (
                    <TableRow key={c.id} className="hover:bg-white/40 dark:hover:bg-white/5">
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "h-11 w-11 overflow-hidden rounded-2xl ring-1",
                              "bg-white/70 ring-[hsl(var(--electric-indigo))]/20",
                              "dark:bg-white/10 dark:ring-[hsl(var(--electric-indigo))]/20"
                            )}
                          >
                            {c.logo_url ? (
                              <img
                                src={c.logo_url}
                                alt={`Logo de ${c.name}`}
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[hsl(var(--primary))]">
                                <Building2 className="h-5 w-5" />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                              {c.name}
                            </div>
                            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              Criado em {new Date(c.created_at).toLocaleDateString()}
                            </div>
                            {c.cpf_cnpj ? (
                              <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                                CPF/CNPJ: {c.cpf_cnpj}
                              </div>
                            ) : null}
                            {link ? (
                              <div className="mt-2 line-clamp-1 text-xs text-slate-600 dark:text-slate-300">
                                {link}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="py-4">
                        <div className="flex flex-col gap-2">
                          <div className="inline-flex items-center gap-2 rounded-full bg-white/60 px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10">
                            <Mail className="h-3.5 w-3.5" />
                            <span className="truncate">{c.contact_email ?? "—"}</span>
                          </div>
                          <div className="inline-flex items-center gap-2 rounded-full bg-white/60 px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10">
                            <Phone className="h-3.5 w-3.5" />
                            <span className="truncate">{c.contact_phone ?? "—"}</span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="py-4 text-right">
                        <div className="flex flex-col justify-end gap-2 sm:flex-row">
                          <Button
                            variant="secondary"
                            className="h-10 rounded-xl hr-btn-secondary"
                            onClick={() => openEdit(c)}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </Button>

                          <Button
                            variant="secondary"
                            className="h-10 rounded-xl hr-btn-secondary"
                            onClick={() => generateLink(c.id)}
                            disabled={generatingId === c.id}
                          >
                            <Link2 className="mr-2 h-4 w-4" />
                            {generatingId === c.id ? "Gerando…" : "Gerar Link"}
                          </Button>

                          <Button
                            variant="secondary"
                            className="h-10 rounded-xl hr-btn-secondary"
                            onClick={() => {
                              setDeleteId(c.id);
                              setDeleteName(c.name);
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {!clientsQuery.isFetching && rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-10">
                      <div className="mx-auto max-w-md rounded-3xl bg-white/60 p-6 text-center ring-1 ring-slate-200 dark:bg-white/5 dark:ring-white/10">
                        <div className="mx-auto mb-2 inline-flex items-center justify-center rounded-full bg-[hsl(var(--primary))]/10 px-3 py-1 text-xs font-semibold text-[hsl(var(--primary))] ring-1 ring-[hsl(var(--primary))]/15 dark:bg-[hsl(var(--primary))]/15 dark:text-white">
                          Cadastre seu primeiro cliente
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                          Depois, crie vagas vinculadas e envie o portal para o contato.
                        </p>
                        <Button
                          className="mt-4 h-11 rounded-xl hr-btn-primary"
                          onClick={openCreate}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Novo Cliente
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </Card>

        <Dialog
          open={upsertOpen}
          onOpenChange={(o) => {
            setUpsertOpen(o);
            if (!o) setEditing(null);
          }}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar cliente" : "Novo cliente"}</DialogTitle>
            </DialogHeader>

            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="client-name">Nome *</Label>
                <Input
                  id="client-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex.: Empresa ABC"
                  className="h-11 rounded-2xl"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="client-doc">CPF ou CNPJ *</Label>
                <Input
                  id="client-doc"
                  value={cpfCnpj}
                  onChange={(e) => setCpfCnpj(formatCpfCnpj(e.target.value))}
                  inputMode="numeric"
                  placeholder="000.000.000-00 ou 00.000.000/0000-00"
                  className={cn(
                    "h-11 rounded-2xl",
                    cpfCnpj.trim() && !docOk && "ring-2 ring-rose-500/35"
                  )}
                />
                {cpfCnpj.trim() && !docOk ? (
                  <div className="text-xs text-rose-600 dark:text-rose-300">
                    Informe um CPF (11 dígitos) ou CNPJ (14 dígitos).
                  </div>
                ) : null}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="client-email">E-mail do contato *</Label>
                <Input
                  id="client-email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="contato@empresa.com"
                  className={cn(
                    "h-11 rounded-2xl",
                    contactEmail.trim() && !emailOk && "ring-2 ring-rose-500/35"
                  )}
                />
                {contactEmail.trim() && !emailOk ? (
                  <div className="text-xs text-rose-600 dark:text-rose-300">
                    Informe um e-mail válido.
                  </div>
                ) : null}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="client-phone">Telefone do contato *</Label>
                <Input
                  id="client-phone"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(formatPhoneBR(e.target.value))}
                  inputMode="tel"
                  placeholder="(11) 91234-5678"
                  className={cn(
                    "h-11 rounded-2xl",
                    contactPhone.trim() && !phoneOk && "ring-2 ring-rose-500/35"
                  )}
                />
                {contactPhone.trim() && !phoneOk ? (
                  <div className="text-xs text-rose-600 dark:text-rose-300">
                    Informe um telefone válido com DDD.
                  </div>
                ) : null}
              </div>

              <div className="grid gap-2">
                <Label>Logomarca</Label>

                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => void onPickLogo(e.target.files?.[0] ?? null)}
                />

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-11 rounded-xl hr-btn-secondary"
                    onClick={() => logoInputRef.current?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload da logomarca
                  </Button>

                  {logoUrl.trim() ? (
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-11 rounded-xl hr-btn-secondary"
                      onClick={() => setLogoUrl("")}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Remover
                    </Button>
                  ) : null}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="client-logo-url" className="text-xs text-slate-600 dark:text-slate-300">
                    (Opcional) URL do logo
                  </Label>
                  <Input
                    id="client-logo-url"
                    value={logoUrl.trim().startsWith("data:") ? "" : logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://…"
                    className="h-11 rounded-2xl"
                  />
                </div>

                {logoUrl.trim() ? (
                  <div className="flex items-center gap-3 rounded-2xl bg-white/60 p-3 ring-1 ring-slate-200 dark:bg-white/5 dark:ring-white/10">
                    <div className="h-12 w-12 overflow-hidden rounded-2xl ring-1 ring-[hsl(var(--electric-indigo))]/20">
                      <img
                        src={normalizeUrl(logoUrl)}
                        alt="Prévia do logo"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-300">
                      Prévia do logo
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="secondary"
                className="h-11 rounded-xl hr-btn-secondary"
                onClick={() => setUpsertOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                className="h-11 rounded-xl hr-btn-primary"
                disabled={saving || !name.trim() || !docOk || !emailOk || !phoneOk}
                onClick={saveClient}
              >
                {saving ? "Salvando…" : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={!!deleteId}
          onOpenChange={(o) => {
            if (!o) {
              setDeleteId(null);
              setDeleteName(null);
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
              <AlertDialogDescription>
                Você está prestes a excluir <span className="font-semibold">{deleteName}</span>.
                Se houver vagas vinculadas, a exclusão pode falhar.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="rounded-xl bg-rose-600 text-white hover:bg-rose-700"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? "Excluindo…" : "Excluir"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </motion.div>
    </Layout>
  );
}