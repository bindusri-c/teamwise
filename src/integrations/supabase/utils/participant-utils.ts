
import { supabase } from '../client';

// Helper function to ensure a user is a participant in an event
export const ensureUserParticipant = async (userId: string, eventId: string) => {
  try {
    // Check if user is already a participant
    const { data: existingParticipant, error: participantError } = await supabase
      .from('participants')
      .select('*')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .maybeSingle();
    
    if (participantError) {
      console.error("[participant-utils] Error checking if user is already a participant:", participantError);
      throw participantError;
    }
    
    // If user is not already a participant, add them
    if (!existingParticipant) {
      console.log("[participant-utils] User is not already a participant, adding them now");
      const { error: joinError } = await supabase
        .from('participants')
        .insert({
          event_id: eventId,
          user_id: userId
        });
      
      if (joinError) {
        console.error("[participant-utils] Error adding user as participant:", joinError);
        throw joinError;
      }
      
      console.log("[participant-utils] Successfully added user as participant");
      return { success: true, isNewParticipant: true };
    } else {
      console.log("[participant-utils] User is already a participant in this event");
      return { success: true, isNewParticipant: false };
    }
  } catch (error) {
    console.error("[participant-utils] Error ensuring user participant:", error);
    return { success: false, error };
  }
};

// Helper function to get all participants for an event
export const getEventParticipants = async (eventId: string) => {
  try {
    const { data: participantsData, error: participantsError } = await supabase
      .from('participants')
      .select('user_id')
      .eq('event_id', eventId);
      
    if (participantsError) {
      console.error('[participant-utils] Error fetching participants:', participantsError);
      throw participantsError;
    }
    
    return { success: true, participants: participantsData };
  } catch (error) {
    console.error('[participant-utils] Error getting event participants:', error);
    return { success: false, error };
  }
};
