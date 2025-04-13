
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
  skills: string[] | null;
  interests: string[] | null;
  linkedin_url: string | null;
  event_id: string;
  resume_text?: string; // Optional field for extracted resume text
}

interface RequestBody {
  userId: string;
  eventId: string;
  profileData: Profile;
  pineconeIndex?: string;
}

// Supabase client setup with explicit types
const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string

// Webhook URL
const webhookUrl = "https://datathon.app.n8n.cloud/webhook-test/c0272a0f-0003-46a8-b535-9dac9d8558ae"

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

// Function to get event name and calculate index name
async function getEventIndexName(eventId: string): Promise<string> {
  try {
    console.log(`Getting event name for event ID: ${eventId}`)
    
    // Get event from database
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('name')
      .eq('id', eventId)
      .single()
      
    if (eventError) {
      console.error(`Error fetching event: ${eventError.message}`)
      throw eventError
    }
    
    if (!eventData || !eventData.name) {
      console.error(`No event found with ID: ${eventId}`)
      throw new Error(`Event not found: ${eventId}`)
    }
    
    // Create index name using format evt-{name}
    const indexName = `evt-${eventData.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').substring(0, 20)}`
    console.log(`Generated index name: ${indexName} for event: ${eventData.name}`)
    
    return indexName
  } catch (error) {
    console.error('Error getting event index name:', error)
    return "evt-default" // Fallback index name
  }
}

// Function to extract text from PDF
async function extractTextFromPdf(pdfUrl: string): Promise<string> {
  try {
    console.log(`Extracting text from PDF: ${pdfUrl}`)
    
    // Download the PDF
    const response = await fetch(pdfUrl)
    if (!response.ok) {
      throw new Error(`Failed to download PDF: ${response.status} ${response.statusText}`)
    }
    
    // For simplicity, we'll extract basic text content
    // In a production environment, you might want to use a more sophisticated PDF parsing library
    const pdfBuffer = await response.arrayBuffer()
    
    // This is a simplified text extraction approach
    // It's not a full PDF parser but will extract some readable text
    const text = extractTextFromArrayBuffer(pdfBuffer)
    
    console.log(`Successfully extracted ${text.length} characters from PDF`)
    return text
  } catch (error) {
    console.error('Error extracting text from PDF:', error)
    return "Error extracting text from resume"
  }
}

// Simple function to extract text from ArrayBuffer
function extractTextFromArrayBuffer(buffer: ArrayBuffer): string {
  // Convert ArrayBuffer to string (only extracts ASCII text)
  const bytes = new Uint8Array(buffer)
  let result = ""
  
  // Simple text extraction - this is not a full PDF parser
  // but will extract some readable text from PDFs
  for (let i = 0; i < bytes.length; i++) {
    const char = bytes[i]
    // Only include printable ASCII characters
    if (char >= 32 && char <= 126) {
      result += String.fromCharCode(char)
    } else if (char === 10 || char === 13) {
      // Add newlines
      result += "\n"
    }
  }
  
  // Clean up the extracted text
  return result
    .replace(/[^\x20-\x7E\n]/g, "") // Remove non-printable chars
    .replace(/\s+/g, " ")           // Normalize whitespace
    .trim()
}

// Function to send user data to webhook
async function sendUserDataToWebhook(userId: string, eventId: string, profileData: Profile, pineconeIndex: string): Promise<boolean> {
  try {
    console.log(`Sending user data to webhook for user ${userId} in event ${eventId}`)
    
    // Create a modified profile data object with resume text
    const enhancedProfileData = { ...profileData }
    
    // Extract text from resume if URL is available
    if (profileData.resume_url) {
      console.log(`Extracting text from resume: ${profileData.resume_url}`)
      const resumeText = await extractTextFromPdf(profileData.resume_url)
      // Add the extracted text directly to the profile data object
      enhancedProfileData.resume_text = resumeText
    }
    
    // Prepare the payload with the new structure
    const payload = {
      userId,
      eventId,
      profileData: enhancedProfileData,
      pineconeIndex,
      sessionId: "233076", // Adding the test ID as requested
      metadata: {
        userId: userId, // Add userId to metadata as requested
        eventId: eventId,
        timestamp: new Date().toISOString()
      }
    }
    
    // Send POST request to webhook
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Error from webhook: ${response.status} ${errorText}`)
      throw new Error(`Webhook error: ${response.status}`)
    }
    
    const responseData = await response.json().catch(() => ({}))
    console.log(`Successfully sent data to webhook. Response:`, responseData)
    
    return true
  } catch (error) {
    console.error('Error sending data to webhook:', error)
    return false
  }
}

// Main handler function with improved error handling
Deno.serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return corsResponse()
  }

  try {
    // Parse the request body
    const { userId, eventId, profileData } = await req.json() as RequestBody;

    if (!userId || !eventId || !profileData) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log(`Processing profile data for user: ${userId}, event: ${eventId}`)
    
    // Get Pinecone index name based on event name
    const indexName = await getEventIndexName(eventId)
    console.log(`Using Pinecone index: ${indexName}`)
    
    // Send user data to webhook
    const success = await sendUserDataToWebhook(userId, eventId, profileData, indexName)
    
    if (!success) {
      throw new Error('Failed to send data to webhook')
    }
    
    // Update the profile in the database to indicate processing
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .eq('event_id', eventId)

    if (updateError) {
      console.error('Error updating profile in Supabase:', updateError)
      throw updateError
    }

    console.log(`Successfully processed data for user: ${userId}, event: ${eventId}`)

    // Return success response
    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error in generate-embedding function:', error.message || error)
    
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
