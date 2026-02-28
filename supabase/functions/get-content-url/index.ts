import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // User client to check auth
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { contentId } = await req.json();
    if (!contentId) {
      return new Response(JSON.stringify({ error: "contentId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use user's client so RLS applies - this checks enrollment/access
    const { data: content, error: contentError } = await supabaseUser
      .from("content")
      .select("file_url, access_type, course_id")
      .eq("id", contentId)
      .single();

    if (contentError || !content) {
      return new Response(JSON.stringify({ error: "Content not found or access denied" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract storage path from the file_url
    const url = new URL(content.file_url);
    const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/content\/(.+)/);
    if (!pathMatch) {
      return new Response(JSON.stringify({ error: "Invalid file path" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const filePath = decodeURIComponent(pathMatch[1]);

    // Use service role to create signed URL
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: signedData, error: signedError } = await supabaseAdmin.storage
      .from("content")
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (signedError || !signedData) {
      return new Response(JSON.stringify({ error: "Failed to generate URL" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ url: signedData.signedUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
