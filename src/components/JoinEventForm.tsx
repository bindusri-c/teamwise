
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { joinEvent, generateProfileEmbedding } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { LoaderCircle } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useCurrentUser } from '@/hooks/useCurrentUser';

const JoinEventForm = () => {
  const [eventCode, setEventCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { userId } = useCurrentUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!eventCode.trim()) {
      setError("Please enter an event code");
      toast({
        title: "Error",
        description: "Please enter an event code",
        variant: "destructive",
      });
      return;
    }

    if (!userId) {
      setError("You must be logged in to join an event");
      toast({
        title: "Error",
        description: "You must be logged in to join an event",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log("Attempting to join event with code:", eventCode);
      
      // Use the enhanced joinEvent function that handles all steps
      const { success, event, error: joinError } = await joinEvent(eventCode, userId);

      if (!success || joinError) {
        throw new Error(joinError?.message || "Failed to join event");
      }

      console.log("Successfully joined event:", event);
      
      // Explicitly generate the embedding after joining the event
      if (event?.id) {
        console.log("Generating embedding for user after joining event");
        try {
          const { success: embedSuccess, error: embedError } = await generateProfileEmbedding(userId, event.id);
          
          if (embedSuccess) {
            console.log("Successfully generated embedding after joining event");
          } else {
            console.error("Error generating embedding after joining event:", embedError);
            // Continue anyway since we want the user to join the event even if embedding fails
          }
        } catch (embedError) {
          console.error("Exception generating embedding after joining event:", embedError);
          // Continue anyway since we want the user to join the event even if embedding fails
        }
      }
      
      toast({
        title: "Success",
        description: `You have successfully joined the event "${event?.name}"`,
      });

      // Reset form and navigate to the event details page directly
      setEventCode('');
      navigate(`/event-details/${event?.id}`);
    } catch (error: any) {
      console.error('Error joining event:', error);
      setError(error.message || "Failed to join event. Please try again.");
      toast({
        title: "Error",
        description: error.message || "Failed to join event. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="space-y-2">
        <Label htmlFor="eventCode">Event Code</Label>
        <Input
          id="eventCode"
          placeholder="Enter 6-digit event code"
          value={eventCode}
          onChange={(e) => setEventCode(e.target.value)}
          disabled={isLoading}
          maxLength={6}
          minLength={6}
          pattern="[0-9]{6}"
          title="Please enter a 6-digit code"
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? "event-code-error" : undefined}
          required
        />
        {error && <p id="event-code-error" className="text-sm text-destructive mt-1">{error}</p>}
      </div>
      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? (
          <>
            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
            Joining...
          </>
        ) : (
          "Join Event"
        )}
      </Button>
    </form>
  );
};

export default JoinEventForm;
