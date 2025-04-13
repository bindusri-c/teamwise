
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  try {
    // Create a Supabase client with the Auth context of the logged in user
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Get the current user's auth info
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not set");
    }

    // Get form data from request
    const { formData, eventId } = await req.json();
    
    // Prepare text for embedding
    const textToEmbed = [
      formData.name,
      formData.email,
      formData.age?.toString() || "",
      formData.gender || "",
      formData.hobbies || "",
      formData.aboutYou || "",
      formData.lookingFor || "",
      ...(formData.skills || []),
      ...(formData.interests || [])
    ].filter(Boolean).join(" ");
    
    if (!textToEmbed) {
      throw new Error("No text to embed");
    }
    
    // Call Gemini API to get embeddings
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent?key=" + GEMINI_API_KEY,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          content: {
            parts: [{ text: textToEmbed }]
          }
        })
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }
    
    const embedData = await response.json();
    const embedding = embedData.embedding?.values;
    
    if (!embedding) {
      throw new Error("No embedding returned from Gemini API");
    }
    
    console.log("Successfully generated embedding");
    
    // Store profile data with embedding
    const { data: profileData, error: profileError } = await supabaseClient
      .from("profiles")
      .upsert({
        id: user.id,
        name: formData.name,
        email: formData.email,
        age: formData.age,
        gender: formData.gender,
        hobbies: formData.hobbies,
        about_you: formData.aboutYou,
        looking_for: formData.lookingFor,
        skills: formData.skills,
        interests: formData.interests,
        embedding,
        event_id: eventId,
        linkedin_url: formData.linkedinUrl,
        resume_url: formData.resumeUrl,
        image_url: formData.imageUrl,
        additional_files: formData.additionalFiles
      })
      .select();
    
    if (profileError) {
      throw profileError;
    }

    return new Response(
      JSON.stringify({ success: true, profile: profileData }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in generate-embedding function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
