// @ts-nocheck
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Verifies Telegram Login Widget data.
 * Telegram Login Widget uses SHA256(bot_token) as the HMAC-SHA256 secret key.
 * https://core.telegram.org/widgets/login#checking-authorization
 */
async function verifyTelegramLoginWidget(data, botToken) {
    const encoder = new TextEncoder();

    // secret_key = SHA256(bot_token) — NOT HMAC, just plain SHA256
    const secretKeyBuffer = await crypto.subtle.digest(
        "SHA-256",
        encoder.encode(botToken)
    );

    // data_check_string: all fields except hash, sorted alphabetically, joined with \n
    const dataCheckString = Object.keys(data)
        .filter((k) => k !== "hash")
        .sort()
        .map((k) => `${k}=${data[k]}`)
        .join("\n");

    const hmacKey = await crypto.subtle.importKey(
        "raw",
        secretKeyBuffer,
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

    return computedHash === data.hash;
}

serve(async (req) => {
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

        // Expect the raw user object from the Telegram Login Widget callback
        const telegramUser = await req.json();
        if (!telegramUser || !telegramUser.id || !telegramUser.hash) {
            return new Response(
                JSON.stringify({ error: "Invalid Telegram user data" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const isValid = await verifyTelegramLoginWidget(telegramUser, botToken);
        if (!isValid) {
            return new Response(
                JSON.stringify({ error: "Invalid Telegram data signature" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Extract user fields directly (Login Widget sends them as top-level fields)
        const telegramId = String(telegramUser.id);
        const displayName = [telegramUser.first_name, telegramUser.last_name]
            .filter(Boolean).join(" ") || "F1 Fan";
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
