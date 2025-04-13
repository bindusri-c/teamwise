
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Tables } from '@/integrations/supabase/types';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Linkedin, User } from 'lucide-react';

type Event = Tables<'events'> & {
  is_creator: boolean;
};

type Profile = {
  id: string;
  name: string;
  email: string;
  image_url: string | null;
  skills: string[] | null;
  interests: string[] | null;
  linkedin_url: string | null;
  event_id: string;
};

const EventsList = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile[]>>({});
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

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
      let allEvents: Event[] = [];
      
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
        allEvents = [...createdWithFlag, ...joinedWithFlag];
      } else {
        // Just set created events
        const createdWithFlag = createdEvents.map(event => ({
          ...event,
          is_creator: true
        }));
        allEvents = createdWithFlag;
      }
      
      setEvents(allEvents);
      
      // Fetch profiles for each event
      const profileData: Record<string, Profile[]> = {};
      
      for (const event of allEvents) {
        const { data: eventProfiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name, email, image_url, skills, interests, linkedin_url, event_id')
          .eq('event_id', event.id);
          
        if (profilesError) {
          console.error(`Error fetching profiles for event ${event.id}:`, profilesError);
          continue;
        }
        
        profileData[event.id] = eventProfiles as Profile[];
      }
      
      setProfiles(profileData);
      
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

  const viewEventForm = (eventId: string) => {
    navigate(`/event/${eventId}`);
  };
  
  const toggleEventMembers = (eventId: string) => {
    setSelectedEvent(selectedEvent === eventId ? null : eventId);
  };
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
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
      <div className="grid grid-cols-1 gap-4">
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
            <CardFooter className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => viewEventForm(event.id)}
              >
                {profiles[event.id]?.some(p => p.id === (supabase.auth.getUser().data?.user?.id ?? '')) 
                  ? "Update Profile" 
                  : "Complete Registration"}
              </Button>
              <Button 
                variant="secondary"
                onClick={() => toggleEventMembers(event.id)}
              >
                {selectedEvent === event.id ? "Hide Members" : "View Members"}
              </Button>
            </CardFooter>
            
            {selectedEvent === event.id && (
              <div className="px-6 pb-6">
                <h3 className="text-lg font-medium mb-4">Event Members</h3>
                {profiles[event.id]?.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {profiles[event.id].map((profile) => (
                      <Card key={profile.id} className="overflow-hidden">
                        <div className="p-4 flex items-center gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={profile.image_url || undefined} alt={profile.name} />
                            <AvatarFallback>{getInitials(profile.name || 'User')}</AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-medium">{profile.name || 'Anonymous User'}</h4>
                            <p className="text-sm text-muted-foreground">{profile.email}</p>
                          </div>
                        </div>
                        
                        {(profile.skills?.length > 0 || profile.interests?.length > 0) && (
                          <div className="px-4 pb-2">
                            {profile.skills?.length > 0 && (
                              <div className="mb-2">
                                <p className="text-xs text-muted-foreground mb-1">Skills</p>
                                <div className="flex flex-wrap gap-1">
                                  {profile.skills.slice(0, 3).map((skill, i) => (
                                    <span key={i} className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded-full">
                                      {skill}
                                    </span>
                                  ))}
                                  {profile.skills.length > 3 && (
                                    <span className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded-full">
                                      +{profile.skills.length - 3}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {profile.interests?.length > 0 && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Interests</p>
                                <div className="flex flex-wrap gap-1">
                                  {profile.interests.slice(0, 3).map((interest, i) => (
                                    <span key={i} className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded-full">
                                      {interest}
                                    </span>
                                  ))}
                                  {profile.interests.length > 3 && (
                                    <span className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded-full">
                                      +{profile.interests.length - 3}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        
                        <div className="px-4 py-3 bg-muted/50 flex justify-end">
                          {profile.linkedin_url ? (
                            <a 
                              href={profile.linkedin_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center"
                            >
                              <Button size="sm" variant="ghost" className="gap-1">
                                <Linkedin className="h-4 w-4" />
                                Connect
                              </Button>
                            </a>
                          ) : (
                            <Button size="sm" variant="ghost" className="gap-1" disabled>
                              <User className="h-4 w-4" />
                              No LinkedIn
                            </Button>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    No members have completed their profiles yet.
                  </div>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};

export default EventsList;
