
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { LoaderCircle } from 'lucide-react';

const JoinEventForm = () => {
  const [eventCode, setEventCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!eventCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter an event code",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log("Attempting to join event with code:", eventCode);
      
      // First, query the events table with the provided code
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('code', eventCode.trim());

      if (eventError) {
        console.error("Error fetching event:", eventError);
        throw eventError;
      }

      console.log("Event data response:", eventData);
      
      // Check if any events were found
      if (!eventData || eventData.length === 0) {
        throw new Error('Event not found. Please check the code and try again.');
      }

      // Use the first event that matches
      const event = eventData[0];
      console.log("Found event:", event);

      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError || !userData.user) {
        throw new Error('You must be logged in to join an event.');
      }
      
      const currentUser = userData.user;
      console.log("Current user:", currentUser.id);
      
      // Check if user is already a participant
      const { data: existingParticipant, error: checkError } = await supabase
        .from('participants')
        .select('*')
        .eq('event_id', event.id)
        .eq('user_id', currentUser.id);
        
      if (checkError) {
        console.error("Error checking existing participant:", checkError);
        throw checkError;
      }
      
      if (existingParticipant && existingParticipant.length > 0) {
        console.log("User already joined this event");
        toast({
          title: "Info",
          description: `You have already joined the event "${event.name}"`,
        });
        // Still navigate to the event form page
        navigate(`/event/${event.id}`);
        return;
      }
      
      // Now join the event
      const { error: participantError } = await supabase
        .from('participants')
        .insert({
          event_id: event.id,
          user_id: currentUser.id
        });

      if (participantError) {
        console.error("Error joining event:", participantError);
        throw participantError;
      }

      console.log("Successfully joined event");
      toast({
        title: "Success",
        description: `You have successfully joined the event "${event.name}"`,
      });

      // Reset form and navigate to the event form page
      setEventCode('');
      navigate(`/event/${event.id}`);
    } catch (error: any) {
      console.error('Error joining event:', error);
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
          required
        />
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
