import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Payload = {
  to: string;
  tenantName: string;
  role: string;
  inviteToken: string;
  appUrl: string;
};

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : null;

    if (!token) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    const payload = (await req.json()) as Payload;

    const resendKey = Deno.env.get("RESEND_API_KEY")!;
    const from = Deno.env.get("RESEND_FROM") ?? "HR System <no-reply@example.com>";
    const replyTo = Deno.env.get("RESEND_REPLY_TO") ?? undefined;

    const to = payload.to.trim().toLowerCase();
    const tenantName = escapeHtml(payload.tenantName.trim());
    const role = escapeHtml(payload.role.trim());
    const inviteToken = payload.inviteToken.trim();
    const appUrl = payload.appUrl.trim().replace(/\/+$/, "");

    const inviteUrl = `${appUrl}/signup?invite=${encodeURIComponent(inviteToken)}`;

    const subject = `Convite para o time — ${tenantName}`;

    const html = `
      <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; background:#0b1220; padding:32px;">
        <div style="max-width:560px; margin:0 auto; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.10); border-radius:18px; padding:24px; color:#e2e8f0;">
          <div style="font-size:14px; color:rgba(226,232,240,0.85);">HR System</div>
          <h1 style="margin:12px 0 0; font-size:22px; line-height:1.25;">Você foi convidado para o time</h1>
          <p style="margin:12px 0 0; font-size:14px; line-height:1.6; color:rgba(226,232,240,0.85);">
            Você recebeu um convite para entrar no tenant <b>${tenantName}</b> como <b>${role}</b>.
          </p>

          <div style="margin-top:18px;">
            <a href="${inviteUrl}" style="display:inline-block; background:#6d28d9; color:#ffffff; text-decoration:none; padding:12px 16px; border-radius:12px; font-weight:700;">Aceitar convite</a>
          </div>

          <p style="margin:16px 0 0; font-size:12px; line-height:1.6; color:rgba(226,232,240,0.75);">
            Se o botão não abrir, copie e cole este link no navegador:<br />
            <span style="word-break:break-all;">${inviteUrl}</span>
          </p>

          <hr style="border:none; border-top:1px solid rgba(255,255,255,0.10); margin:18px 0;" />
          <p style="margin:0; font-size:12px; color:rgba(226,232,240,0.70);">
            Se você não esperava este convite, pode ignorar esta mensagem.
          </p>
        </div>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[hr-send-team-invite] Resend error", {
        status: res.status,
        text,
      });
      return new Response("Failed to send", { status: 500, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[hr-send-team-invite] Unexpected error", { error: String(e) });
    return new Response("Internal error", { status: 500, headers: corsHeaders });
  }
});
