// @ts-nocheck
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Verifies Telegram's HMAC-SHA256 signature on the initData string.
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-web-app
 */
async function verifyTelegramData(initData, botToken) {
    const pairs = initData.split("&");
    const hashEntry = pairs.find((p) => p.startsWith("hash="));
    if (!hashEntry) return null;

    const receivedHash = hashEntry.split("=")[1];
    const dataCheckString = pairs
        .filter((p) => !p.startsWith("hash="))
        .sort()
        .join("\n");

    const encoder = new TextEncoder();

    const secretKey = await crypto.subtle.importKey(
        "raw",
        encoder.encode("WebAppData"),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );
    const secretHash = await crypto.subtle.sign(
        "HMAC",
        secretKey,
        encoder.encode(botToken)
    );

    const hmacKey = await crypto.subtle.importKey(
        "raw",
        secretHash,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );
    const computedHashBuffer = await crypto.subtle.sign(
        "HMAC",
        hmacKey,
        encoder.encode(dataCheckString)
    );

    const computedHash = Array.from(new Uint8Array(computedHashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

    if (computedHash !== receivedHash) return null;

    const result = {};
    for (const pair of pairs) {
        const eqIdx = pair.indexOf("=");
        const key = pair.slice(0, eqIdx);
        const value = decodeURIComponent(pair.slice(eqIdx + 1));
        result[key] = value;
    }
    return result;
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
        if (!botToken) {
            return new Response(
                JSON.stringify({ error: "TELEGRAM_BOT_TOKEN not configured" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const { initData } = await req.json();
        if (!initData) {
            return new Response(
                JSON.stringify({ error: "initData is required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const verified = await verifyTelegramData(initData, botToken);
        if (!verified) {
            return new Response(
                JSON.stringify({ error: "Invalid Telegram data signature" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const telegramUser = JSON.parse(verified.user || "{}");
        const telegramId = String(telegramUser.id);
        const firstName = telegramUser.first_name || "";
        const lastName = telegramUser.last_name || "";
        const displayName = [firstName, lastName].filter(Boolean).join(" ") || "F1 Fan";
        const photoUrl = telegramUser.photo_url || "";
        const syntheticEmail = `${telegramId}@telegram.auth`;
        const password = `tg_${botToken.slice(0, 6)}_${telegramId}`;

        const supabaseAdmin = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // Try sign-in first (returning user)
        const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
            email: syntheticEmail,
            password,
        });

        let session = signInData?.session;

        // If new user, create then sign in
        if (signInError || !session) {
            const { error: createError } = await supabaseAdmin.auth.admin.createUser({
                email: syntheticEmail,
                password,
                email_confirm: true,
                user_metadata: {
                    full_name: displayName,
                    avatar_url: photoUrl,
                    telegram_id: telegramId,
                    provider: "telegram",
                },
            });

            if (createError) {
                return new Response(
                    JSON.stringify({ error: createError.message }),
                    { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            const { data: signInAfterCreate, error: signInAfterError } =
                await supabaseAdmin.auth.signInWithPassword({ email: syntheticEmail, password });

            if (signInAfterError || !signInAfterCreate?.session) {
                return new Response(
                    JSON.stringify({ error: "Failed to sign in after user creation" }),
                    { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            session = signInAfterCreate.session;
        }

        return new Response(
            JSON.stringify({
                access_token: session.access_token,
                refresh_token: session.refresh_token,
                expires_at: session.expires_at,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (err) {
        return new Response(
            JSON.stringify({ error: err.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
