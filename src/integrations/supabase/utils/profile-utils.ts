
import { supabase } from '../client';

// Helper function to generate embedding for a user profile
export const generateProfileEmbedding = async (userId: string, eventId: string) => {
  try {
    console.log("[profile-utils] Starting profile embedding generation for user:", userId, "in event:", eventId);
    
    // Check if the profile exists and create it if it doesn't
    let { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .eq('event_id', eventId)
      .maybeSingle();
    
    if (profileError) {
      console.error("[profile-utils] Error fetching profile data for embedding:", profileError);
      throw profileError;
    }
    
    if (!profileData) {
      console.log("[profile-utils] Profile not found, attempting to create a minimal profile");
      
      // Get user data
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error("[profile-utils] Error fetching user data:", userError);
        throw new Error("Unable to fetch user data for profile creation");
      }
      
      // Try to get profile from another event first
      const { data: otherProfile, error: otherProfileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .limit(1)
        .maybeSingle();
      
      // Create a minimal profile
      const minimalProfile = {
        id: userId,
        event_id: eventId,
        email: userData?.user?.email || '',
        name: otherProfile?.name || userData?.user?.email?.split('@')[0] || 'User',
        // Copy other fields from the existing profile if available
        age: otherProfile?.age || null,
        gender: otherProfile?.gender || null,
        hobbies: otherProfile?.hobbies || null,
        skills: otherProfile?.skills || [],
        interests: otherProfile?.interests || [],
        about_you: otherProfile?.about_you || null,
        linkedin_url: otherProfile?.linkedin_url || null
      };
      
      console.log("[profile-utils] Creating minimal profile:", minimalProfile);
      
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .upsert(minimalProfile)
        .select()
        .single();
      
      if (createError) {
        console.error("[profile-utils] Error creating minimal profile:", createError);
        throw createError;
      }
      
      console.log("[profile-utils] Successfully created minimal profile:", newProfile);
      
      // Use the newly created profile
      profileData = newProfile;
    }
    
    console.log("[profile-utils] Profile data fetched for embedding generation:", profileData);
    
    // Get event data to determine the Pinecone index name
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('name')
      .eq('id', eventId)
      .single();
      
    if (eventError) {
      console.error("[profile-utils] Error fetching event data for embedding generation:", eventError);
      throw eventError;
    }
    
    // Generate the pinecone index name based on event name
    // Using the same format as in create-pinecone-index function: evt-{sanitized-event-name}
    const indexName = `evt-${eventData.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').substring(0, 20)}`;
    
    console.log(`[profile-utils] Using Pinecone index name for event ${eventId}: ${indexName}`);
    
    // Call the generate-embedding function
    console.log("[profile-utils] Calling generate-embedding edge function with this data:", {
      userId, 
      eventId, 
      profileData,
      pineconeIndex: indexName
    });
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-embedding', {
        body: { 
          userId, 
          eventId, 
          profileData,
          pineconeIndex: indexName // Explicitly pass the index name
        }
      });
      
      if (error) {
        console.error("[profile-utils] Error invoking generate-embedding function:", error);
        return { success: false, error: error };
      }
      
      console.log("[profile-utils] Embedding generation successful:", data);
      return { success: true, data };
    } catch (invocationError) {
      console.error("[profile-utils] Exception during embedding function invocation:", invocationError);
      return { success: false, error: invocationError };
    }
  } catch (error) {
    console.error("[profile-utils] Error generating profile embedding:", error);
    return { success: false, error };
  }
};

// Helper function to get or create a profile for a user in an event
export const getOrCreateProfile = async (userId: string, eventId: string) => {
  try {
    // Check if the profile exists
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .eq('event_id', eventId)
      .maybeSingle();
      
    if (profileError) {
      console.error("[profile-utils] Error fetching profile:", profileError);
      throw profileError;
    }
    
    // If profile exists, return it
    if (profileData) {
      return { success: true, profile: profileData, isNew: false };
    }
    
    // No profile exists, create a new one
    // Get user data
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error("[profile-utils] Error fetching user data:", userError);
      throw userError;
    }
    
    // Try to get profile from another event first
    const { data: otherProfile, error: otherProfileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .limit(1)
      .maybeSingle();
    
    // Create a new profile
    const newProfile = {
      id: userId,
      event_id: eventId,
      email: userData?.user?.email || '',
      name: otherProfile?.name || userData?.user?.email?.split('@')[0] || 'User',
      // Copy other fields from the existing profile if available
      age: otherProfile?.age || null,
      gender: otherProfile?.gender || null,
      hobbies: otherProfile?.hobbies || null,
      skills: otherProfile?.skills || [],
      interests: otherProfile?.interests || [],
      about_you: otherProfile?.about_you || null,
      linkedin_url: otherProfile?.linkedin_url || null
    };
    
    const { data: createdProfile, error: createError } = await supabase
      .from('profiles')
      .insert(newProfile)
      .select()
      .single();
      
    if (createError) {
      console.error("[profile-utils] Error creating profile:", createError);
      throw createError;
    }
    
    return { success: true, profile: createdProfile, isNew: true };
  } catch (error) {
    console.error("[profile-utils] Error getting or creating profile:", error);
    return { success: false, error };
  }
};

// Helper function to get similarity scores for a user in an event
export const getProfileSimilarities = async (userId: string, eventId: string) => {
  try {
    const { data: similarityData, error: similarityError } = await supabase
      .from('profile_similarities')
      .select('profile_id_1, profile_id_2, similarity_score')
      .eq('event_id', eventId)
      .or(`profile_id_1.eq.${userId},profile_id_2.eq.${userId}`);
    
    if (similarityError) {
      console.error('[profile-utils] Error fetching similarity scores:', similarityError);
      throw similarityError;
    }
    
    return { success: true, similarities: similarityData };
  } catch (error) {
    console.error('[profile-utils] Error getting profile similarities:', error);
    return { success: false, error };
  }
};
