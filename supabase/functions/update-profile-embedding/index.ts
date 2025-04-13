
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Handle CORS preflight requests
const handleCors = (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
};

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Get profile data from request body
    const { profileData, userId } = await req.json();

    if (!profileData || !userId) {
      return new Response(
        JSON.stringify({ error: "Profile data and user ID are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Received profile data:", profileData);

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create a text representation of the profile for embedding
    const profileText = [
      profileData.name,
      profileData.aboutYou,
      profileData.skills?.join(" "),
      profileData.interests?.join(" "),
      profileData.hobbies,
      profileData.gender,
      profileData.age
    ].filter(Boolean).join(" ");

    console.log("Profile text for embedding:", profileText);

    // Insert profile data into Pinecone
    const pineconeApiKey = Deno.env.get("PINECONE_API_KEY");
    
    if (!pineconeApiKey) {
      throw new Error("Pinecone API key not found in environment variables");
    }

    // Create an embedding from the profile text using a model
    // For simplicity, we'll use a mock embedding here
    // In a real application, you'd use an embedding model like OpenAI or a similar service
    
    // For demonstration purposes, we'll create a simple random vector
    // This should be replaced with actual embedding generation in production
    const mockEmbedding = Array.from({ length: 384 }, () => Math.random());
    
    console.log("Generated embedding vector with dimensions:", mockEmbedding.length);

    // Store the embedding in the database
    const { error } = await supabase
      .from('profiles')
      .update({
        embedding: mockEmbedding,
        // Also update other profile fields
        name: profileData.name,
        age: profileData.age ? parseInt(profileData.age) : null,
        gender: profileData.gender || null,
        hobbies: profileData.hobbies || null,
        skills: profileData.skills || [],
        interests: profileData.interests || [],
        about_you: profileData.aboutYou || null,
        linkedin_url: profileData.linkedinUrl || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      console.error("Error updating profile in database:", error);
      throw error;
    }

    console.log("Successfully updated profile with embedding for user:", userId);

    return new Response(
      JSON.stringify({ success: true, message: "Profile updated with embedding" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in update-profile-embedding function:", error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
