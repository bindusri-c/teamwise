
import { supabase } from '../client';

/**
 * Generates an embedding for a user's profile for a specific event
 * @param userId The user ID
 * @param eventId The event ID
 * @returns A promise with the result of the embedding generation
 */
export const generateProfileEmbedding = async (userId: string, eventId: string) => {
  try {
    console.log(`Generating embedding for user ${userId} in event ${eventId}`);
    
    // Get the profile data for the user and event
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .eq('event_id', eventId)
      .maybeSingle();
    
    if (profileError) {
      console.error('Error fetching profile data:', profileError);
      return { success: false, error: profileError };
    }
    
    if (!profileData) {
      console.error('No profile found for user in this event');
      return { success: false, error: { message: 'No profile found for user in this event' } };
    }
    
    // Call the Supabase Edge Function to generate the embedding
    const { data, error } = await supabase.functions.invoke('generate-embedding', {
      body: { 
        userId, 
        eventId, 
        profileData
      }
    });
    
    if (error) {
      console.error('Error calling generate-embedding function:', error);
      return { success: false, error };
    }
    
    console.log('Embedding generated successfully');
    return { success: true, data };
  } catch (error) {
    console.error('Error generating profile embedding:', error);
    return { success: false, error };
  }
};
