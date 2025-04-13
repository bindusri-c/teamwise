
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
const geminiApiEndpoint = 'https://generativelanguage.googleapis.com/v1/models/embedding-001:embedContent'

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

// New function to extract text from PDF resume
async function extractTextFromPDF(resumeUrl: string): Promise<string> {
  try {
    console.log(`Downloading resume from: ${resumeUrl}`);
    
    // Download the PDF file
    const pdfResponse = await fetch(resumeUrl);
    if (!pdfResponse.ok) {
      console.error(`Failed to download PDF: ${pdfResponse.status} ${pdfResponse.statusText}`);
      return "";
    }
    
    // Get the PDF content as arrayBuffer
    const pdfBuffer = await pdfResponse.arrayBuffer();
    
    // Use a simple text extraction approach for PDFs
    // This is a basic extraction that works for text-based PDFs
    // For more complex PDFs with images or non-text content, we would need a more sophisticated parser
    const decoder = new TextDecoder("utf-8");
    let text = decoder.decode(pdfBuffer);
    
    // Basic cleaning: remove non-printable characters and normalize whitespace
    text = text.replace(/[^\x20-\x7E\n\r\t]/g, " ")  // Keep only printable ASCII and whitespace
               .replace(/\s+/g, " ")                 // Normalize whitespace
               .trim();
    
    // Extract a reasonable amount of text (first 5000 characters)
    const extractedText = text.substring(0, 5000);
    
    console.log(`Successfully extracted ${extractedText.length} characters from resume`);
    return extractedText;
  } catch (error) {
    console.error(`Error extracting text from PDF: ${error.message}`);
    return "";
  }
}

// Enhanced function to create a text representation of the profile
async function createEmbeddingText(profile: Profile): Promise<string> {
  // Build a structured profile summary with weighted importance
  // Start with most important identity information
  let profileText = '';
  
  // IDENTITY - Primary identifiers
  if (profile.name) profileText += `Name: ${profile.name}. `;
  if (profile.email) profileText += `Email: ${profile.email}. `;
  
  // PROFESSIONAL SUMMARY - Heavily weight the "about_you" section as it typically contains the most detailed self-description
  if (profile.about_you) {
    profileText += `About: ${profile.about_you.replace(/\n/g, ' ')}. `;
  }
  
  // GOALS - What they're looking for (heavily weighted)
  if (profile.looking_for) {
    profileText += `Looking for: ${profile.looking_for.replace(/\n/g, ' ')}. `;
  }
  
  // SKILLS - Professional capabilities (heavily weighted)
  if (profile.skills?.length) {
    // Give extra importance to skills by repeating them and structuring them clearly
    profileText += `Skills: ${profile.skills.join(', ')}. `;
    // Add each skill individually for more emphasis
    profile.skills.forEach(skill => {
      profileText += `Has skill in: ${skill}. `;
    });
  }
  
  // INTERESTS - Personal preferences (moderately weighted)
  if (profile.interests?.length) {
    profileText += `Interests: ${profile.interests.join(', ')}. `;
    // Add each interest individually for more emphasis
    profile.interests.forEach(interest => {
      profileText += `Interested in: ${interest}. `;
    });
  }
  
  // PERSONAL DETAILS - Less important but still relevant
  if (profile.hobbies) profileText += `Hobbies: ${profile.hobbies}. `;
  if (profile.age) profileText += `Age: ${profile.age}. `;
  if (profile.gender) profileText += `Gender: ${profile.gender}. `;
  
  // PROFESSIONAL LINKS - Less critical but indicates professional presence
  if (profile.linkedin_url) profileText += `LinkedIn: ${profile.linkedin_url}. `;
  
  // NEW: Try to extract and add resume content if available
  if (profile.resume_url) {
    console.log(`Extracting resume content from ${profile.resume_url}`);
    const resumeText = await extractTextFromPDF(profile.resume_url);
    if (resumeText) {
      profileText += `Resume content: ${resumeText}. `;
      console.log(`Added ${resumeText.length} characters of resume content to embedding text`);
    }
  }
  
  console.log(`Created profile text with length: ${profileText.length} characters`);
  return profileText.trim();
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

    // Create text representation for embedding (now with resume content)
    const textForEmbedding = await createEmbeddingText(profileData)
    
    // Generate embedding using Gemini API
    const embedding = await generateEmbedding(textForEmbedding)
    
    // Store the embedding as a JSON string in the database
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ embedding: JSON.stringify(embedding) })
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
