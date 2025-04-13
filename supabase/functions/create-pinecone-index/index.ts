
// create-pinecone-index/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

// Define interfaces
interface RequestBody {
  eventId: string;
  eventName: string;
  eventCode: string;
}

// Supabase client setup
const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string

// Pinecone configuration
const pineconeApiKey = Deno.env.get('PINECONE_API_KEY') as string
const pineconeEnvironment = Deno.env.get('PINECONE_ENVIRONMENT') as string

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Main handler function with error handling
Deno.serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Parse the request body
    const { eventId, eventName, eventCode } = await req.json() as RequestBody

    if (!eventId || !eventName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log(`Creating Pinecone index for event: ${eventName} (${eventId})`)

    // Generate a valid index name (lowercase alphanumeric and hyphens only)
    // Using the event code as a basis since it's short and unique
    const indexName = `event-${eventCode.toLowerCase()}`

    try {
      // Create Pinecone index using the API
      const createResponse = await fetch(`https://api.pinecone.io/indexes`, {
        method: 'POST',
        headers: {
          'Api-Key': pineconeApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: indexName,
          dimension: 1536, // Standard dimension for most embedding models
          metric: 'cosine',
          spec: {
            serverless: {
              cloud: 'aws',
              region: 'us-west-2' // You can change this to a preferred region
            }
          }
        }),
      })

      if (!createResponse.ok) {
        const errorData = await createResponse.json()
        console.error('Pinecone index creation error:', errorData)
        
        // Handle case where index might already exist
        if (errorData.error && errorData.error.includes('already exists')) {
          console.log(`Index ${indexName} already exists, continuing...`)
        } else {
          throw new Error(`Pinecone API error: ${errorData.error || createResponse.statusText}`)
        }
      } else {
        console.log(`Successfully created Pinecone index: ${indexName}`)
      }

      // Store the index name in the events table for future reference
      const { error: updateError } = await supabase
        .from('events')
        .update({ 
          pinecone_index: indexName,
          updated_at: new Date().toISOString()
        })
        .eq('id', eventId)

      if (updateError) {
        console.error('Error updating event with pinecone index name:', updateError)
        throw updateError
      }

      // Return success response
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Pinecone index created successfully',
          indexName: indexName
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    } catch (error) {
      console.error('Error creating Pinecone index:', error)
      throw error
    }
  } catch (error) {
    console.error('Error in create-pinecone-index function:', error.message || error)
    
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
