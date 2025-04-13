
import { supabase } from '../client';

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
    
    // Add the user as a participant
    const { error: participantError } = await supabase
      .from('participants')
      .insert({
        event_id: eventData.id,
        user_id: userId
      });
    
    if (participantError) {
      console.error("[event-utils] Error adding user as participant:", participantError);
      throw participantError;
    }
    
    console.log("[event-utils] Added user as participant");
    
    return { success: true, event: eventData };
  } catch (error) {
    console.error("[event-utils] Error joining event:", error);
    return { success: false, error };
  }
};
