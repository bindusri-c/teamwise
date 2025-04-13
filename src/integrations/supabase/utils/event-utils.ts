
import { supabase } from '../client';
import { generateProfileEmbedding } from './profile-utils';
import { ensureUserParticipant } from './participant-utils';

// Helper function to create a new event
export const createEvent = async (eventName: string, userId: string) => {
  try {
    console.log("[event-utils] Starting event creation process for:", eventName, "by user:", userId);
    
    // Generate event code using the edge function
    const { data: eventCode, error: codeError } = await supabase.functions.invoke('generate-event-code');
    
    if (codeError) {
      console.error("[event-utils] Error generating event code:", codeError);
      throw codeError;
    }
    
    console.log("[event-utils] Generated event code:", eventCode.code);
    
    // Create event in the database
    const { data: event, error: eventError } = await supabase.from('events').insert({
      name: eventName,
      code: eventCode.code,
      created_by: userId
    }).select().single();
    
    if (eventError) {
      console.error("[event-utils] Error creating event in database:", eventError);
      throw eventError;
    }
    
    console.log("[event-utils] Created event in database:", event);
    
    // Create Pinecone index for the event
    console.log("[event-utils] Attempting to create Pinecone index for event:", event.id);
    const { data: indexData, error: indexError } = await supabase.functions.invoke('create-pinecone-index', {
      body: {
        eventId: event.id,
        eventName: event.name,
        eventCode: event.code
      }
    });
    
    if (indexError) {
      console.error("[event-utils] Error creating Pinecone index:", indexError);
      // Continue anyway, as the event was created successfully
    } else {
      console.log("[event-utils] Pinecone index created:", indexData);
    }

    // Add the user as a participant and ensure they have a profile
    await ensureUserParticipant(userId, event.id);
    
    // Get user profile from another event or create a new one
    await ensureUserProfile(userId, event.id);
    
    return { success: true, event };
  } catch (error) {
    console.error("[event-utils] Error creating event:", error);
    return { success: false, error };
  }
};

// Helper function to join an event
export const joinEvent = async (eventCode: string, userId: string) => {
  try {
    console.log("[event-utils] Starting process to join event with code:", eventCode, "for user:", userId);
    
    // Find event by code
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('code', eventCode)
      .single();
    
    if (eventError) {
      console.error("[event-utils] Error finding event with code:", eventCode, eventError);
      throw eventError;
    }
    
    console.log("[event-utils] Found event:", eventData);
    
    // Add the user as a participant and ensure they have a profile
    await ensureUserParticipant(userId, eventData.id);
    
    // Get user profile from another event or create a new one
    await ensureUserProfile(userId, eventData.id);
    
    return { success: true, event: eventData };
  } catch (error) {
    console.error("[event-utils] Error joining event:", error);
    return { success: false, error };
  }
};

// Helper function to ensure a user has a profile for an event
const ensureUserProfile = async (userId: string, eventId: string) => {
  try {
    console.log("[event-utils] Checking if user already has a profile for this event");
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .eq('event_id', eventId)
      .maybeSingle();
    
    if (profileCheckError) {
      console.error("[event-utils] Error checking existing profile:", profileCheckError);
    }

    // If no profile exists yet, try to find profile from another event or create a minimal one
    if (!existingProfile) {
      console.log("[event-utils] No existing profile found, checking for profiles in other events");
      // First try to get a profile from any other event
      const { data: otherProfile, error: otherProfileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .limit(1)
        .maybeSingle();
      
      if (otherProfileError) {
        console.error("[event-utils] Error fetching profile from other events:", otherProfileError);
      }

      // Get user data
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error("[event-utils] Error fetching user data:", userError);
      }

      // Create a profile using existing data or minimal data if nothing exists
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

      console.log("[event-utils] Creating new profile for user:", newProfile);
      
      try {
        // Try to insert the profile, but handle the case where it might already exist
        const { data: createdProfile, error: createProfileError } = await supabase
          .from('profiles')
          .upsert(newProfile)
          .select()
          .single();
        
        if (createProfileError) {
          console.error("[event-utils] Error creating/updating profile:", createProfileError);
        } else {
          console.log("[event-utils] Profile created/updated successfully:", createdProfile);
          // Generate embedding for the new profile
          const embedResult = await generateProfileEmbedding(userId, eventId);
          console.log("[event-utils] Profile embedding generation result:", embedResult);
        }
      } catch (upsertError) {
        console.error("[event-utils] Exception during profile upsert:", upsertError);
      }
    } else {
      console.log("[event-utils] User already has a profile for this event:", existingProfile);
    }
  } catch (error) {
    console.error("[event-utils] Error ensuring user profile:", error);
  }
};
