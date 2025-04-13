
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

// Define interfaces
interface Profile {
  id: string;
  embedding: string | null;
}

interface RequestBody {
  eventId: string;
  profileId?: string; // Optional: if provided, only calculate for this profile
}

// Supabase client setup
const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export const corsResponse = () => {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  })
}

// Calculate cosine similarity between two embedding vectors
function calculateCosineSimilarity(vectorA: number[], vectorB: number[]): number {
  if (!vectorA || !vectorB || vectorA.length !== vectorB.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i];
    normA += vectorA[i] * vectorA[i];
    normB += vectorB[i] * vectorB[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Main handler function
Deno.serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return corsResponse()
  }

  try {
    // Parse the request body
    const { eventId, profileId } = await req.json() as RequestBody

    if (!eventId) {
      return new Response(
        JSON.stringify({ error: 'Event ID is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log(`Calculating similarity scores for event ${eventId}${profileId ? ` and profile ${profileId}` : ''}`)

    // Get all profiles with embeddings for this event
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, embedding')
      .eq('event_id', eventId)
      .not('embedding', 'is', null)
      .order('id')

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      throw profilesError
    }

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No profiles with embeddings found for this event' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log(`Found ${profiles.length} profiles with embeddings`)

    // Track how many scores were calculated/updated
    let scoresCalculated = 0
    
    // Array to hold all similarity scores to be upserted
    const similarityScores = []

    // If profileId is provided, only calculate similarities for that profile
    if (profileId) {
      const targetProfile = profiles.find(p => p.id === profileId)
      if (!targetProfile || !targetProfile.embedding) {
        return new Response(
          JSON.stringify({ error: 'Target profile not found or has no embedding' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }

      const targetEmbedding = JSON.parse(targetProfile.embedding as string)
      
      // Calculate similarity with all other profiles
      for (const otherProfile of profiles) {
        // Skip self-comparison
        if (otherProfile.id === targetProfile.id) continue
        
        if (!otherProfile.embedding) continue
        
        const otherEmbedding = JSON.parse(otherProfile.embedding as string)
        const similarity = calculateCosineSimilarity(targetEmbedding, otherEmbedding)

        // Create pairs ensuring profile_id_1 is always lexicographically smaller than profile_id_2
        // This maintains consistency in how we store pairs
        const [profileId1, profileId2] = targetProfile.id < otherProfile.id 
          ? [targetProfile.id, otherProfile.id] 
          : [otherProfile.id, targetProfile.id]

        similarityScores.push({
          profile_id_1: profileId1,
          profile_id_2: profileId2,
          event_id: eventId,
          similarity_score: similarity
        })
        
        scoresCalculated++
      }
    } else {
      // Calculate similarities between all profile pairs
      for (let i = 0; i < profiles.length; i++) {
        if (!profiles[i].embedding) continue
        const embeddingA = JSON.parse(profiles[i].embedding as string)
        
        for (let j = i + 1; j < profiles.length; j++) {
          if (!profiles[j].embedding) continue
          const embeddingB = JSON.parse(profiles[j].embedding as string)
          
          const similarity = calculateCosineSimilarity(embeddingA, embeddingB)
          
          similarityScores.push({
            profile_id_1: profiles[i].id,
            profile_id_2: profiles[j].id,
            event_id: eventId,
            similarity_score: similarity
          })
          
          scoresCalculated++
        }
      }
    }

    console.log(`Calculated ${scoresCalculated} similarity scores`)

    // Batch insert/update the similarity scores
    // Use upsert to handle cases where scores might already exist
    if (similarityScores.length > 0) {
      const { error: upsertError } = await supabase
        .from('profile_similarities')
        .upsert(similarityScores, { 
          onConflict: 'profile_id_1,profile_id_2,event_id',
          ignoreDuplicates: false // Update existing records
        })

      if (upsertError) {
        console.error('Error upserting similarity scores:', upsertError)
        throw upsertError
      }
    }

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        scoresCalculated,
        message: `Successfully calculated and stored ${scoresCalculated} similarity scores` 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error in calculate-similarity function:', error.message || error)
    
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
