
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import ParticipantCard from './ParticipantCard';
import { useCurrentUser } from '@/hooks/useCurrentUser';

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
}

const ParticipantsList: React.FC<ParticipantsListProps> = ({ profiles }) => {
  const { userId } = useCurrentUser();
  
  // Filter out the current user from the participants list
  const filteredProfiles = profiles.filter(profile => profile.id !== userId);
  
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
