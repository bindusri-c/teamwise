
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

// Helper function to generate embedding vector using Gemini API with retries
async function generateEmbedding(text: string, maxRetries = 3): Promise<number[]> {
  console.log(`Generating embedding for text of length: ${text.length}`);
  
  const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
  const geminiApiEndpoint = Deno.env.get("GEMINI_API_ENDPOINT") || 
                           'https://generativelanguage.googleapis.com/v1/models/embedding-001:embedContent';
  
  if (!geminiApiKey) {
    throw new Error("GEMINI_API_KEY not found in environment variables");
  }
  
  // Ensure text is not empty
  if (!text || text.trim().length === 0) {
    throw new Error("Cannot generate embedding for empty text");
  }
  
  // Truncate text if too long (Gemini has token limits)
  const truncatedText = text.length > 2048 ? text.substring(0, 2048) : text;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}: Calling Gemini API for embedding generation`);
      
      // Use Gemini API for embedding generation
      const response = await fetch(
        `${geminiApiEndpoint}?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'embedding-001',
            content: { parts: [{ text: truncatedText }] },
          }),
        }
      );

      console.log(`Gemini API response status: ${response.status}`);

      if (response.status === 429 && attempt < maxRetries) {
        // Rate limit hit, implement exponential backoff
        const backoffTime = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s backoff
        console.log(`Rate limited. Retrying in ${backoffTime}ms (attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error from Gemini API: ${response.status} ${errorText}`);
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      // Return the embedding values
      if (data && data.embedding && data.embedding.values) {
        console.log(`Successfully generated embedding with dimension: ${data.embedding.values.length}`);
        return data.embedding.values;
      } else {
        console.error('Unexpected response format from Gemini API:', JSON.stringify(data));
        throw new Error('Invalid embedding response format from Gemini API');
      }
    } catch (error) {
      console.error(`Embedding attempt ${attempt} failed:`, error);
      
      if (attempt === maxRetries) {
        console.error('All embedding generation attempts failed');
        throw error;
      }
      
      // Implement backoff for other errors too
      await new Promise(resolve => setTimeout(resolve, attempt * 1000));
    }
  }
  
  throw new Error('Failed to generate embedding after all retry attempts');
}

// Store embedding in Pinecone
async function storeEmbeddingInPinecone(userId: string, profileData: any, embedding: number[]): Promise<void> {
  try {
    const pineconeApiKey = Deno.env.get("PINECONE_API_KEY");
    const pineconeProjectId = Deno.env.get("PINECONE_PROJECT_ID");
    const pineconeEnvironment = Deno.env.get("PINECONE_ENVIRONMENT");
    const pineconeIndexName = Deno.env.get("PINECONE_INDEX_NAME") || 'profiles';
    
    if (!pineconeApiKey || !pineconeProjectId || !pineconeEnvironment) {
      console.log('Pinecone configuration incomplete, skipping Pinecone storage');
      return;
    }

    // Create metadata for the vector
    const metadata = {
      user_id: userId,
      name: profileData.name,
      email: profileData.email || null,
      age: profileData.age ? profileData.age.toString() : null,
      gender: profileData.gender || null,
      hobbies: profileData.hobbies || null,
      skills: profileData.skills?.join(", ") || null,
      interests: profileData.interests?.join(", ") || null,
      about_you: profileData.aboutYou ? profileData.aboutYou.substring(0, 1000) : null,
      linkedin_url: profileData.linkedinUrl || null
    };

    // Format: https://<index-name>-<project-id>.svc.<environment>.pinecone.io/vectors/upsert
    const pineconeUrl = `https://${pineconeIndexName}-${pineconeProjectId}.svc.${pineconeEnvironment}.pinecone.io/vectors/upsert`;
    
    console.log(`Storing embedding in Pinecone at URL: ${pineconeUrl}`);
    
    const body = {
      vectors: [
        {
          id: userId,
          values: embedding,
          metadata
        }
      ]
    };

    console.log(`Storing embedding in Pinecone for user ${userId}`);
    
    const response = await fetch(pineconeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': pineconeApiKey
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error from Pinecone: ${response.status} ${errorText}`);
      throw new Error(`Pinecone upsert failed: ${response.status}`);
    }

    console.log(`Successfully stored embedding in Pinecone for user: ${userId}`);
  } catch (error) {
    console.error('Error storing embedding in Pinecone:', error);
    // Don't throw the error - we want to continue even if Pinecone storage fails
  }
}

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    console.log("update-profile-embedding function started");
    
    // Get profile data from request body
    let reqBody;
    try {
      reqBody = await req.json();
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const { profileData, userId } = reqBody;

    console.log(`Processing request for user ID: ${userId}`);
    console.log("Profile data received:", JSON.stringify(profileData));

    if (!profileData || !userId) {
      console.error("Missing required data: userId or profileData");
      return new Response(
        JSON.stringify({ error: "Profile data and user ID are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase environment variables");
      throw new Error("Supabase configuration is incomplete");
    }
    
    console.log("Creating Supabase client");
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create a text representation of the profile for embedding
    let profileText = [
      profileData.name || "",
      profileData.aboutYou || "",
      profileData.skills?.join(" ") || "",
      profileData.interests?.join(" ") || "",
      profileData.hobbies || "",
      profileData.gender || "",
      profileData.age ? profileData.age.toString() : ""
    ].filter(Boolean).join(" ");

    console.log("Profile text for embedding:", profileText);
    
    if (!profileText.trim()) {
      console.warn("Profile text is empty, using placeholder text");
      // Use name as fallback if nothing else is available
      profileText = profileData.name || "User profile";
    }

    // Generate embedding from the profile text using Gemini API
    console.log("Generating embedding...");
    let embedding;
    try {
      embedding = await generateEmbedding(profileText);
      console.log("Successfully generated embedding");
    } catch (embeddingError) {
      console.error("Error generating embedding:", embeddingError);
      // Return partial success - we updated the profile but couldn't generate the embedding
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Profile updated but embedding generation failed", 
          error: embeddingError.message 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Store the embedding in the database
    console.log("Updating profile with embedding in database");
    const { error } = await supabase
      .from('profiles')
      .update({
        embedding: embedding,
        // Also update other profile fields
        name: profileData.name,
        age: typeof profileData.age === 'string' ? parseInt(profileData.age) : profileData.age,
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

    console.log("Profile updated successfully in database");

    // Also store the embedding in Pinecone for later retrieval
    try {
      await storeEmbeddingInPinecone(userId, profileData, embedding);
    } catch (pineconeError) {
      console.error("Error storing embedding in Pinecone:", pineconeError);
      // Continue execution - Pinecone storage is optional
    }

    console.log("Successfully completed update-profile-embedding function for user:", userId);

    return new Response(
      JSON.stringify({ success: true, message: "Profile updated with embedding" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in update-profile-embedding function:", error);
    
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
