
import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import ParticipantCard from './ParticipantCard';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { supabase } from '@/integrations/supabase/client';

type Profile = {
  id: string;
  name: string;
  email: string;
  image_url: string | null;
  skills: string[] | null;
  interests: string[] | null;
  linkedin_url: string | null;
  about_you: string | null;
  looking_for: string | null;
  similarity_score?: number;
};

interface ParticipantsListProps {
  profiles: Profile[];
  eventId: string;
}

const ParticipantsList: React.FC<ParticipantsListProps> = ({ profiles: initialProfiles, eventId }) => {
  const { userId } = useCurrentUser();
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    // Always fetch profiles when component mounts to ensure we have the latest data
    if (eventId) {
      fetchProfiles();
    }
  }, [eventId]);
  
  const fetchProfiles = async () => {
    if (!eventId) return;
    
    setIsLoading(true);
    try {
      console.log('Fetching profiles for event:', eventId);
      
      // First get all participants for this event
      const { data: participantsData, error: participantsError } = await supabase
        .from('participants')
        .select('user_id')
        .eq('event_id', eventId);
        
      if (participantsError) {
        console.error('Error fetching participants:', participantsError);
        return;
      }
      
      console.log('Found participants:', participantsData?.length, participantsData);
      
      if (!participantsData || participantsData.length === 0) {
        console.log('No participants found for event');
        setProfiles([]);
        setIsLoading(false);
        return;
      }
      
      // Get the user IDs from participants
      const userIds = participantsData.map(p => p.user_id);
      
      // Then fetch profiles for those users in this event
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, email, image_url, skills, interests, linkedin_url, about_you, looking_for')
        .eq('event_id', eventId)
        .in('id', userIds);
        
      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        return;
      }
      
      console.log('Profiles fetched:', profilesData?.length, profilesData);
      
      if (profilesData) {
        setProfiles(profilesData);
      }
    } catch (error) {
      console.error('Error in fetching profiles:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Filter out the current user from the participants list only if we want to hide current user
  const filteredProfiles = profiles.filter(profile => profile.id !== userId);
  
  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Event Participants</h2>
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Loading participants...</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Event Participants ({filteredProfiles.length})</h2>
      
      {filteredProfiles.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No other participants have registered for this event yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProfiles.map((profile) => (
            <ParticipantCard key={profile.id} profile={profile} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ParticipantsList;
