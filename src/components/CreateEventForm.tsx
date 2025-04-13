
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createEvent, generateProfileEmbedding } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { LoaderCircle } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';

const CreateEventForm = () => {
  const [eventName, setEventName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { userId } = useCurrentUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!eventName.trim()) {
      toast({
        title: "Error",
        description: "Please enter an event name",
        variant: "destructive",
      });
      return;
    }

    if (!userId) {
      toast({
        title: "Error",
        description: "You must be logged in to create an event",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log("[CreateEvent] Starting event creation process for event:", eventName);
      
      // Use the enhanced createEvent function that handles all four steps
      const { success, event, error } = await createEvent(eventName, userId);

      if (!success || error) {
        throw new Error(error?.message || "Failed to create event");
      }
      
      console.log("[CreateEvent] Event created successfully:", event);
      
      // Explicitly verify embedding generation
      if (event?.id) {
        console.log("[CreateEvent] Explicitly checking embedding generation for the new event");
        
        try {
          console.log("[CreateEvent] Calling generateProfileEmbedding with userId:", userId, "and eventId:", event.id);
          // Add a slight delay to ensure the profile has been created first
          setTimeout(async () => {
            try {
              const { success: embedSuccess, error: embedError } = await generateProfileEmbedding(userId, event.id);
              
              if (embedSuccess) {
                console.log("[CreateEvent] Successfully verified embedding generation for the new event");
              } else {
                console.error("[CreateEvent] Error explicitly generating embedding for new event:", embedError);
                // Continue anyway since we want the event creation to succeed even if embedding fails
              }
            } catch (delayedEmbedError) {
              console.error("[CreateEvent] Exception in delayed embedding generation:", delayedEmbedError);
            }
          }, 500); // Small delay to ensure profile creation completes first
          
        } catch (embedError) {
          console.error("[CreateEvent] Exception explicitly generating embedding for new event:", embedError);
          // Continue anyway
        }
      }

      toast({
        title: "Success",
        description: `Event "${eventName}" created successfully! Your event code is: ${event?.code}`,
      });

      // Reset form and navigate back to dashboard
      setEventName('');
      navigate('/dashboard');
    } catch (error: any) {
      console.error('[CreateEvent] Error creating event:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create event. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="eventName">Event Name</Label>
        <Input
          id="eventName"
          placeholder="Enter your event name"
          value={eventName}
          onChange={(e) => setEventName(e.target.value)}
          disabled={isLoading}
          required
        />
      </div>
      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? (
          <>
            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
            Creating...
          </>
        ) : (
          "Create Event"
        )}
      </Button>
    </form>
  );
};

export default CreateEventForm;
