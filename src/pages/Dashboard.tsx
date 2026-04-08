import { useMemo } from "react";
import { Link, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/auth/SessionProvider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, LogOut } from "lucide-react";

type Candidate = {
  id: string;
  full_name: string;
  email: string;
  status: string;
  skills: unknown;
  created_at: string;
};

export default function Dashboard() {
  const { session, isLoading } = useSession();

  const email = session?.user.email ?? "";

  const { data, isFetching, error } = useQuery({
    queryKey: ["hr_candidates"],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_candidates")
        .select("id, full_name, email, status, skills, created_at")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data ?? []) as Candidate[];
    },
  });

  const rows = useMemo(() => data ?? [], [data]);

  if (!isLoading && !session) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-[hsl(var(--app-bg))] px-4 py-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-2xl bg-white/70 px-3 py-1.5 text-xs font-semibold tracking-wide text-slate-700 shadow-sm ring-1 ring-black/5">
              <Users className="h-4 w-4 text-indigo-600" />
              Recrutamento
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Dashboard
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Logado como <span className="font-medium">{email}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              className="rounded-2xl bg-white/70 ring-1 ring-black/5 hover:bg-white"
              asChild
            >
              <Link to="/">Início</Link>
            </Button>
            <Button
              className="rounded-2xl bg-indigo-600 text-white hover:bg-indigo-700"
              onClick={() => supabase.auth.signOut()}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>

        <Card className="rounded-3xl border-black/5 bg-white/80 p-5 shadow-xl shadow-slate-900/5 backdrop-blur">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Candidatos
              </h2>
              <p className="text-sm text-slate-600">
                Lista dos últimos 50 candidatos do seu tenant.
              </p>
            </div>

            <div className="text-sm text-slate-600">
              {isFetching ? "Carregando…" : `${rows.length} registro(s)`}
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl ring-1 ring-black/5">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80">
                  <TableHead className="text-slate-700">Nome</TableHead>
                  <TableHead className="text-slate-700">E-mail</TableHead>
                  <TableHead className="text-slate-700">Status</TableHead>
                  <TableHead className="text-right text-slate-700">
                    Criado
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {error ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8">
                      <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200">
                        Falha ao carregar candidates (verifique login/RLS):{" "}
                        {(error as any)?.message ?? String(error)}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10">
                      <div className="text-center">
                        <div className="mx-auto mb-2 inline-flex items-center justify-center rounded-2xl bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200">
                          Comece por aqui
                        </div>
                        <p className="text-sm text-slate-600">
                          Nenhum candidato encontrado ainda.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((c) => (
                    <TableRow key={c.id} className="hover:bg-slate-50/70">
                      <TableCell className="font-medium text-slate-900">
                        {c.full_name}
                      </TableCell>
                      <TableCell className="text-slate-700">{c.email}</TableCell>
                      <TableCell>
                        <Badge
                          className="rounded-full bg-indigo-600 text-white"
                          variant="default"
                        >
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-slate-600">
                        {new Date(c.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
}
