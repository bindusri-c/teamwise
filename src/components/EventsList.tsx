
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Tables } from '@/integrations/supabase/types';

type Event = Tables<'events'> & {
  is_creator: boolean;
};

const EventsList = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      
      if (!user) {
        setIsLoading(false);
        return;
      }

      // Get events the user created
      const { data: createdEvents, error: createdError } = await supabase
        .from('events')
        .select('*')
        .eq('created_by', user.id);

      if (createdError) throw createdError;

      // Get events the user joined
      const { data: participantEvents, error: participantError } = await supabase
        .from('participants')
        .select('event_id')
        .eq('user_id', user.id);

      if (participantError) throw participantError;

      const eventIds = participantEvents.map(p => p.event_id);
      
      if (eventIds.length > 0) {
        const { data: joinedEvents, error: joinedError } = await supabase
          .from('events')
          .select('*')
          .in('id', eventIds);

        if (joinedError) throw joinedError;

        // Mark events as created by user or joined
        const createdWithFlag = createdEvents.map(event => ({
          ...event,
          is_creator: true
        }));

        const joinedWithFlag = joinedEvents.map(event => ({
          ...event,
          is_creator: false
        }));

        // Combine events
        setEvents([...createdWithFlag, ...joinedWithFlag]);
      } else {
        // Just set created events
        const createdWithFlag = createdEvents.map(event => ({
          ...event,
          is_creator: true
        }));
        setEvents(createdWithFlag);
      }
    } catch (error: any) {
      console.error('Error fetching events:', error);
      toast({
        title: "Error",
        description: "Failed to load events. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-4">Loading events...</div>;
  }

  if (events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Events Yet</CardTitle>
          <CardDescription>
            You haven't created or joined any events yet. Get started by creating an event or joining one with a code.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Your Events</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {events.map((event) => (
          <Card key={event.id}>
            <CardHeader>
              <CardTitle>{event.name}</CardTitle>
              <CardDescription>
                {event.is_creator ? 'You created this event' : 'You joined this event'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm">
                <p><strong>Event Code:</strong> {event.code}</p>
                <p><strong>Created:</strong> {new Date(event.created_at).toLocaleDateString()}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default EventsList;
