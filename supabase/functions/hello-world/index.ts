
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the request body
    const { name } = await req.json();
    
    // Create a response
    const message = `Hello ${name || 'World'}! This message comes from a Supabase Edge Function.`;
    
    // Log for debugging
    console.log(`Request processed successfully: ${message}`);
    
    // Return the response
    return new Response(
      JSON.stringify({ message }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 200,
      }
    );
  } catch (error) {
    // Log the error
    console.error('Error in hello-world function:', error);
    
    // Return an error response
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 500,
      }
    );
  }
});
