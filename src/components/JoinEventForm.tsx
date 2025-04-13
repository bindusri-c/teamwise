
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
      // First, get the event by code
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('code', eventCode)
        .single();

      if (eventError) {
        if (eventError.code === 'PGRST116') {
          throw new Error('Event not found. Please check the code and try again.');
        }
        throw eventError;
      }

      const currentUser = (await supabase.auth.getUser()).data.user;
      
      // Now join the event
      const { data, error } = await supabase
        .from('participants')
        .insert({
          event_id: eventData.id,
          user_id: currentUser?.id
        })
        .select();

      if (error) {
        // Check if the error is due to user already being a participant
        if (error.code === '23505') { // Unique violation
          toast({
            title: "Info",
            description: `You have already joined the event "${eventData.name}"`,
          });
          // Still navigate to the event form page
          navigate(`/event/${eventData.id}`);
          return;
        }
        throw error;
      }

      toast({
        title: "Success",
        description: `You have successfully joined the event "${eventData.name}"`,
      });

      // Reset form and navigate to the event form page
      setEventCode('');
      navigate(`/event/${eventData.id}`);
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
