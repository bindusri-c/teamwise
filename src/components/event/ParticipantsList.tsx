
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
    console.log('ParticipantsList mounted with eventId:', eventId);
    console.log('Initial profiles passed to ParticipantsList:', initialProfiles);
    
    // Always fetch profiles when component mounts to ensure we have the latest data
    if (eventId) {
      fetchProfiles();
    }
  }, [eventId]);
  
  const fetchProfiles = async () => {
    if (!eventId) {
      console.log('No eventId provided to ParticipantsList, cannot fetch profiles');
      return;
    }
    
    setIsLoading(true);
    try {
      console.log('ParticipantsList: Fetching profiles for event:', eventId);
      
      // First get all participants for this event
      console.log('ParticipantsList: Querying participants table for event_id:', eventId);
      const { data: participantsData, error: participantsError } = await supabase
        .from('participants')
        .select('user_id')
        .eq('event_id', eventId);
        
      if (participantsError) {
        console.error('ParticipantsList: Error fetching participants:', participantsError);
        return;
      }
      
      console.log('ParticipantsList: Found participants:', participantsData?.length, participantsData);
      
      if (!participantsData || participantsData.length === 0) {
        console.log('ParticipantsList: No participants found for event');
        setProfiles([]);
        setIsLoading(false);
        return;
      }
      
      // Get the user IDs from participants
      const userIds = participantsData.map(p => p.user_id);
      console.log('ParticipantsList: Extracted user IDs:', userIds);
      
      // Then fetch profiles for those users
      console.log('ParticipantsList: Querying profiles table for users:', userIds);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, email, image_url, skills, interests, linkedin_url, about_you, looking_for')
        .in('id', userIds);
        
      if (profilesError) {
        console.error('ParticipantsList: Error fetching profiles:', profilesError);
        return;
      }
      
      console.log('ParticipantsList: Profiles fetched:', profilesData?.length, profilesData);
      
      if (profilesData) {
        // Additional logging for each profile
        profilesData.forEach(profile => {
          console.log(`ParticipantsList: Profile ${profile.id} details:`, {
            name: profile.name,
            email: profile.email,
            hasSkills: profile.skills?.length > 0
          });
        });
        
        setProfiles(profilesData);
      } else {
        console.log('ParticipantsList: No profiles data returned from query');
      }
    } catch (error) {
      console.error('ParticipantsList: Error in fetching profiles:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Don't filter out the current user - show all participants including the current user
  // This change ensures that if the current user is a participant, they will be shown in the list
  
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
      <h2 className="text-xl font-semibold">Event Participants ({profiles.length})</h2>
      
      {profiles.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No participants have registered for this event yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {profiles.map((profile) => (
            <ParticipantCard key={profile.id} profile={profile} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ParticipantsList;
