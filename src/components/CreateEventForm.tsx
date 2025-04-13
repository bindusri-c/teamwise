
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { LoaderCircle } from 'lucide-react';

const CreateEventForm = () => {
  const [eventName, setEventName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

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

    setIsLoading(true);

    try {
      // Generate a random code for the event using our SQL function
      const { data: codeData, error: codeError } = await supabase
        .rpc('generate_event_code');

      if (codeError) throw codeError;
      
      const eventCode = codeData;

      // Create the event
      const { data, error } = await supabase
        .from('events')
        .insert({
          name: eventName,
          code: eventCode,
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Event created successfully! Your event code is: " + eventCode,
      });

      // Reset form and navigate back to dashboard
      setEventName('');
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Error creating event:', error);
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
