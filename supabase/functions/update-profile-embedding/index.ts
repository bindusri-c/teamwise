
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

// Safely log potentially large objects by truncating them
const safeLog = (message: string, obj?: any) => {
  try {
    if (obj) {
      const stringified = typeof obj === 'string' ? obj : JSON.stringify(obj);
      const truncated = stringified.length > 1000 ? `${stringified.substring(0, 1000)}... (truncated)` : stringified;
      console.log(`${message}: ${truncated}`);
    } else {
      console.log(message);
    }
  } catch (error) {
    console.log(`${message}: [Error logging object: ${error.message}]`);
  }
};

// Helper function to check environment variables
const checkRequiredEnvVars = () => {
  const requiredVars = [
    'GEMINI_API_KEY',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  const missingVars = requiredVars.filter(varName => !Deno.env.get(varName));
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
  
  safeLog(`All required environment variables are set`);
};

// Helper function to generate embedding vector using Gemini API with retries
async function generateEmbedding(text: string, maxRetries = 3): Promise<number[]> {
  safeLog(`Generating embedding using gemini-1.0-pro-001 model for text of length: ${text.length}`);
  
  const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
  const geminiApiEndpoint = Deno.env.get("GEMINI_API_ENDPOINT") || 
                           'https://generativelanguage.googleapis.com/v1/models/gemini-1.0-pro-001:embedContent';
  
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
      safeLog(`Attempt ${attempt}: Calling Gemini API for embedding generation`);
      
      // Use Gemini API for embedding generation
      const response = await fetch(
        `${geminiApiEndpoint}?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gemini-1.0-pro-001',
            content: { parts: [{ text: truncatedText }] },
          }),
        }
      );

      safeLog(`Gemini API response status: ${response.status}`);

      if (response.status === 429 && attempt < maxRetries) {
        // Rate limit hit, implement exponential backoff
        const backoffTime = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s backoff
        safeLog(`Rate limited. Retrying in ${backoffTime}ms (attempt ${attempt}/${maxRetries})`);
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
        const embeddingValues = data.embedding.values;
        safeLog(`Successfully generated embedding with dimension: ${embeddingValues.length}`);
        
        // Check if embedding dimension is 768 (correct for gemini-1.0-pro-001)
        if (embeddingValues.length !== 768) {
          console.warn(`WARNING: Embedding dimension (${embeddingValues.length}) does not match expected dimension (768) for gemini-1.0-pro-001`);
        }
        
        return embeddingValues;
      } else {
        console.error('Unexpected response format from Gemini API:', JSON.stringify(data).substring(0, 500));
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

// Store embedding in Pinecone (optional)
async function storeEmbeddingInPinecone(userId: string, profileData: any, embedding: number[], eventId?: string): Promise<void> {
  try {
    const pineconeApiKey = Deno.env.get("PINECONE_API_KEY");
    const pineconeProjectId = Deno.env.get("PINECONE_PROJECT_ID");
    const pineconeEnvironment = Deno.env.get("PINECONE_ENVIRONMENT");
    
    if (!pineconeApiKey || !pineconeProjectId || !pineconeEnvironment) {
      safeLog('Pinecone configuration incomplete, skipping Pinecone storage');
      return;
    }
    
    // Determine the index name
    let pineconeIndexName;
    
    if (eventId) {
      try {
        // Create Supabase client
        const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // Try to get the index name from the event
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('name, pinecone_index')
          .eq('id', eventId)
          .maybeSingle();
          
        if (!eventError && eventData) {
          pineconeIndexName = eventData.pinecone_index || 
            `evt-${eventData.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').substring(0, 20)}`;
        }
      } catch (error) {
        console.error('Error determining index name from event:', error);
      }
    }
    
    // Fallback to default index name if we couldn't determine it from the event
    if (!pineconeIndexName) {
      pineconeIndexName = Deno.env.get("PINECONE_INDEX_NAME") || 'profiles';
    }
    
    safeLog(`Using Pinecone index: ${pineconeIndexName}`);

    // Create metadata for the vector
    const metadata = {
      user_id: userId,
      event_id: eventId || null,
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
    
    safeLog(`Storing embedding in Pinecone at URL: ${pineconeUrl}`);
    
    // Check embedding dimension
    if (embedding.length !== 768) {
      console.warn(`WARNING: Embedding dimension (${embedding.length}) does not match expected dimension (768) for Pinecone`);
    }
    
    const body = {
      vectors: [
        {
          id: eventId ? `${userId}_${eventId}` : userId,
          values: embedding,
          metadata
        }
      ]
    };

    // Log payload without the full embedding values for debugging
    const debugPayload = {
      ...body,
      vectors: [{
        ...body.vectors[0],
        values: `[Array of ${embedding.length} values]`
      }]
    };
    safeLog(`Pinecone payload:`, debugPayload);

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

    safeLog(`Successfully stored embedding in Pinecone for user: ${userId}`);
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
    safeLog("update-profile-embedding function started");
    
    try {
      // Check required environment variables
      checkRequiredEnvVars();
    } catch (envError) {
      console.error("Environment error:", envError.message);
      return new Response(
        JSON.stringify({ error: envError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
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
    
    const { profileData, userId, eventId } = reqBody;

    safeLog(`Processing request for user ID: ${userId}${eventId ? `, event ID: ${eventId}` : ''}`);
    safeLog("Profile data received:", profileData);

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
    
    safeLog("Creating Supabase client");
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

    safeLog(`Profile text for embedding: ${profileText.substring(0, 100)}...`);
    
    if (!profileText.trim()) {
      safeLog("Profile text is empty, using placeholder text");
      // Use name as fallback if nothing else is available
      profileText = profileData.name || "User profile";
    }

    // Generate embedding from the profile text using Gemini API
    safeLog("Generating embedding...");
    let embedding;
    try {
      embedding = await generateEmbedding(profileText);
      safeLog(`Successfully generated embedding with dimension: ${embedding.length}`);
    } catch (embeddingError) {
      console.error("Error generating embedding:", embeddingError);
      // Return error since the embedding generation failed
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Failed to generate embedding", 
          error: embeddingError.message 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Store the embedding in the database
    safeLog("Updating profile with embedding in database");
    try {
      const updateQuery = supabase
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
      
      // If eventId is provided, add it to the query
      if (eventId) {
        updateQuery.eq('event_id', eventId);
      }
      
      const { error } = await updateQuery;

      if (error) {
        console.error("Error updating profile in database:", error);
        throw error;
      }
    } catch (dbError) {
      console.error("Database error:", dbError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Failed to update profile in database", 
          error: dbError.message 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    safeLog("Profile updated successfully in database");

    // Also store the embedding in Pinecone for later retrieval (optional)
    try {
      await storeEmbeddingInPinecone(userId, profileData, embedding, eventId);
    } catch (pineconeError) {
      console.error("Error storing embedding in Pinecone:", pineconeError);
      // Continue execution - Pinecone storage is optional
    }

    safeLog("Successfully completed update-profile-embedding function for user:", userId);

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
