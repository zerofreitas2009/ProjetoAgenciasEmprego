import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_PROMPT =
  "Aja como um Recrutador Especialista. Analise o currículo em relação à vaga e retorne um JSON com: match_percent (0-100), resumo_fit (max 250 carac.), pontos_fortes (lista de 3) e gap_tecnico (1 item).";

function extractJsonObject(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  const slice = text.slice(start, end + 1);
  try {
    return JSON.parse(slice);
  } catch {
    return null;
  }
}

function clampInt(n: unknown, min: number, max: number) {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, Math.round(v)));
}

function toStringSafe(v: unknown) {
  if (typeof v === "string") return v;
  return v == null ? "" : String(v);
}

function toStringArray3(v: unknown) {
  const arr = Array.isArray(v) ? v : [];
  return arr
    .map((x) => toStringSafe(x).trim())
    .filter(Boolean)
    .slice(0, 3);
}

function trimLen(s: string, max: number) {
  const t = s.trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1).trimEnd() + "…";
}

function decodePdfTextHeuristic(bytes: Uint8Array) {
  // Heuristic extraction: works for many text-based PDFs; won't cover all cases.
  const latin = new TextDecoder("latin1").decode(bytes);

  const out: string[] = [];

  // (text) Tj
  const tj = /\(([^()\\]*(?:\\.[^()\\]*)*)\)\s*Tj/g;
  let m: RegExpExecArray | null;
  while ((m = tj.exec(latin))) {
    const raw = m[1]
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\r")
      .replace(/\\t/g, "\t")
      .replace(/\\\(/g, "(")
      .replace(/\\\)/g, ")")
      .replace(/\\\\/g, "\\");
    out.push(raw);
    if (out.length > 1600) break;
  }

  const text = out
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return text;
}

async function fetchResumeText(
  supabaseAdmin: ReturnType<typeof createClient>,
  resumePath: string,
) {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from("hr_resumes")
      .download(resumePath);
    if (error || !data) return null;

    const bytes = new Uint8Array(await data.arrayBuffer());
    const extracted = decodePdfTextHeuristic(bytes);
    if (!extracted) return null;
    return extracted.slice(0, 12000);
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) {
      console.error("[groq-match] missing GROQ_API_KEY");
      return new Response(JSON.stringify({ error: "missing_groq_key" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[groq-match] missing supabase env");
      return new Response(JSON.stringify({ error: "missing_supabase_env" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const application_id = String(body?.application_id ?? "").trim();
    if (!application_id) {
      return new Response(JSON.stringify({ error: "missing_application_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: settingsRow } = await supabaseAdmin
      .from("hr_settings")
      .select("ai_system_prompt")
      .limit(1)
      .maybeSingle();

    const systemPrompt =
      (settingsRow as any)?.ai_system_prompt?.trim() || DEFAULT_PROMPT;

    const { data: app, error: appErr } = await supabaseAdmin
      .from("hr_applications")
      .select(
        "id, tenant_id, job_id, candidate_id, cover_letter, current_stage, created_at, candidate:hr_candidates!hr_applications_candidate_id_fkey(full_name, email, skills, bio, resume_url), job:hr_jobs!hr_applications_job_id_fkey(title, description, requirements, dna_skills, work_model, seniority_level)"
      )
      .eq("id", application_id)
      .maybeSingle();

    if (appErr) {
      console.error("[groq-match] load application failed", { appErr });
      return new Response(JSON.stringify({ error: "load_application_failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!app?.id || !app?.candidate || !app?.job) {
      return new Response(JSON.stringify({ error: "application_not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resumePath = String((app as any)?.candidate?.resume_url ?? "").trim();
    const resumeText = resumePath
      ? await fetchResumeText(supabaseAdmin, resumePath)
      : null;

    const job = (app as any).job;
    const candidate = (app as any).candidate;

    const userPayload = {
      vaga: {
        titulo: job.title,
        modelo_trabalho: job.work_model,
        senioridade: job.seniority_level,
        descricao: job.description ?? "",
        requirements: job.requirements ?? [],
        dna_skills: job.dna_skills ?? [],
      },
      candidato: {
        nome: candidate.full_name,
        email: candidate.email,
        skills: candidate.skills ?? [],
        bio: candidate.bio ?? "",
        cover_letter: (app as any).cover_letter ?? "",
        resume_text: resumeText ?? "",
      },
      instrucao: "Retorne APENAS JSON válido. Não inclua markdown.",
    };

    const groqResp = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama3-70b-8192",
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: JSON.stringify(userPayload),
            },
          ],
        }),
      }
    );

    if (!groqResp.ok) {
      const errText = await groqResp.text().catch(() => "");
      console.error("[groq-match] groq error", {
        status: groqResp.status,
        errText,
      });
      return new Response(JSON.stringify({ error: "groq_failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const groqJson = await groqResp.json();
    const content =
      groqJson?.choices?.[0]?.message?.content ?? JSON.stringify(groqJson);

    const parsed =
      typeof content === "object" ? content : extractJsonObject(String(content));

    const match_percent = clampInt((parsed as any)?.match_percent, 0, 100);
    const resumo_fit = trimLen(toStringSafe((parsed as any)?.resumo_fit), 250);
    const pontos_fortes = toStringArray3((parsed as any)?.pontos_fortes);
    const gap_tecnico = trimLen(toStringSafe((parsed as any)?.gap_tecnico), 140);

    const insightRow = {
      tenant_id: (app as any).tenant_id,
      application_id: (app as any).id,
      candidate_id: (app as any).candidate_id,
      job_id: (app as any).job_id,
      model: "llama3-70b-8192",
      match_percent,
      resumo_fit: resumo_fit || "—",
      pontos_fortes,
      gap_tecnico: gap_tecnico || null,
      raw: parsed ?? { content },
    };

    const { error: upsertErr } = await supabaseAdmin
      .from("hr_ai_insights")
      .upsert(insightRow, { onConflict: "application_id" });

    if (upsertErr) {
      console.error("[groq-match] upsert failed", { upsertErr });
      return new Response(JSON.stringify({ error: "save_failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[groq-match] ok", {
      application_id,
      match_percent,
      has_resume_text: !!resumeText,
    });

    return new Response(
      JSON.stringify({ ok: true, application_id, match_percent }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("[groq-match] unexpected", { e });
    return new Response(JSON.stringify({ error: "unexpected" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
