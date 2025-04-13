
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

// Define interfaces
interface Profile {
  id: string;
  name: string;
  email: string;
  age: number | null;
  gender: string | null;
  hobbies: string | null;
  image_url: string;
  resume_url: string;
  additional_files: string[] | null;
  about_you: string | null;
  looking_for: string | null;
  skills: string[] | null;
  interests: string[] | null;
  linkedin_url: string | null;
  event_id: string;
}

interface RequestBody {
  userId: string;
  eventId: string;
  profileData: Profile;
}

// Supabase client setup with explicit types
const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
const geminiApiKey = Deno.env.get('GEMINI_API_KEY') as string
const geminiApiEndpoint = Deno.env.get('GEMINI_API_ENDPOINT') || 'https://generativelanguage.googleapis.com/v1/models/embedding-001:embedContent'

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

// Function to create a text representation of the profile
function createEmbeddingText(profile: Profile): string {
  const parts = [
    `Name: ${profile.name || ''}`,
    `Email: ${profile.email || ''}`,
    profile.age ? `Age: ${profile.age}` : '',
    profile.gender ? `Gender: ${profile.gender}` : '',
    profile.hobbies ? `Hobbies: ${profile.hobbies}` : '',
    profile.about_you ? `About: ${profile.about_you}` : '',
    profile.looking_for ? `Looking for: ${profile.looking_for}` : '',
    profile.skills?.length ? `Skills: ${profile.skills.join(', ')}` : '',
    profile.interests?.length ? `Interests: ${profile.interests.join(', ')}` : '',
    profile.linkedin_url ? `LinkedIn: ${profile.linkedin_url}` : '',
  ]

  return parts.filter(Boolean).join(' ').trim()
}

// Function to generate embedding vector using Gemini API
async function generateEmbedding(text: string): Promise<number[]> {
  console.log(`Generating embedding for text of length: ${text.length}`)
  
  try {
    // Truncate text if too long (Gemini has token limits)
    const truncatedText = text.length > 2048 ? text.substring(0, 2048) : text
    
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
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Error from Gemini API: ${response.status} ${errorText}`)
      throw new Error(`Gemini API error: ${response.status}`)
    }

    const data = await response.json()
    
    // Return the embedding values
    if (data && data.embedding && data.embedding.values) {
      console.log(`Successfully generated embedding with dimension: ${data.embedding.values.length}`)
      return data.embedding.values
    } else {
      console.error('Unexpected response format from Gemini API:', JSON.stringify(data))
      throw new Error('Invalid embedding response format from Gemini API')
    }
  } catch (error) {
    console.error('Error generating embedding:', error)
    throw error
  }
}

// Main handler function
Deno.serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return corsResponse()
  }

  try {
    // Parse the request body
    const { userId, eventId, profileData } = await req.json() as RequestBody

    if (!userId || !eventId || !profileData) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log(`Processing profile embedding for user: ${userId}, event: ${eventId}`)

    // Create text representation for embedding
    const textForEmbedding = createEmbeddingText(profileData)
    
    // Generate embedding using Gemini API
    const embedding = await generateEmbedding(textForEmbedding)
    
    // Store the embedding in the database
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ embedding: embedding })
      .eq('id', userId)
      .eq('event_id', eventId)

    if (updateError) {
      console.error('Error storing embedding:', updateError)
      throw updateError
    }

    console.log(`Successfully stored embedding for user: ${userId}, event: ${eventId}`)

    // Return success response
    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error in generate-embedding function:', error)
    
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
