
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';
import ProfileSimilarityScore from '@/components/ProfileSimilarityScore';
import EventHeader from '@/components/event/EventHeader';
import ParticipantsList from '@/components/event/ParticipantsList';

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
};

type ProfileWithSimilarity = Profile & {
  similarity_score?: number;
};

const EventDetails = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userId } = useCurrentUser();
  const [event, setEvent] = useState<Tables<'events'> | null>(null);
  const [profiles, setProfiles] = useState<ProfileWithSimilarity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreator, setIsCreator] = useState(false);
  const [loadingSimilarities, setLoadingSimilarities] = useState(false);

  useEffect(() => {
    if (eventId) {
      fetchEventDetails();
    }
  }, [eventId]);

  const fetchEventDetails = async () => {
    setIsLoading(true);
    try {
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (eventError) throw eventError;
      
      setEvent(eventData);
      
      setIsCreator(eventData.created_by === userId);

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, email, image_url, skills, interests, linkedin_url, about_you, looking_for')
        .eq('event_id', eventId);
        
      if (profilesError) throw profilesError;
      
      if (userId && profilesData.length > 0) {
        await fetchSimilarityScores(profilesData);
      } else {
        // Filter out current user and set profiles
        const filteredProfiles = profilesData.filter(profile => profile.id !== userId) as ProfileWithSimilarity[];
        setProfiles(filteredProfiles);
      }
    } catch (error: any) {
      console.error('Error fetching event details:', error);
      toast({
        title: "Error",
        description: "Failed to load event details. Please try again.",
        variant: "destructive",
      });
      navigate('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSimilarityScores = async (profilesData: Profile[]) => {
    if (!userId || !eventId) return;
    
    setLoadingSimilarities(true);
    try {
      const { data: similarityData, error: similarityError } = await supabase
        .from('profile_similarities')
        .select('profile_id_1, profile_id_2, similarity_score')
        .eq('event_id', eventId)
        .or(`profile_id_1.eq.${userId},profile_id_2.eq.${userId}`);
      
      if (similarityError) throw similarityError;
      
      const profilesWithSimilarity = profilesData.map(profile => {
        if (profile.id === userId) {
          return { ...profile, similarity_score: 1.0 };
        }
        
        const similarityEntry = similarityData?.find(
          entry => 
            (entry.profile_id_1 === userId && entry.profile_id_2 === profile.id) ||
            (entry.profile_id_1 === profile.id && entry.profile_id_2 === userId)
        );
        
        return {
          ...profile,
          similarity_score: similarityEntry?.similarity_score || 0
        };
      });
      
      // Filter out the current user from the list of participants
      const filteredProfiles = profilesWithSimilarity.filter(profile => profile.id !== userId);
      setProfiles(filteredProfiles);
    } catch (error) {
      console.error('Error fetching similarity scores:', error);
    } finally {
      setLoadingSimilarities(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container py-8 mx-auto">
        <div className="flex justify-center items-center min-h-[300px]">
          <p>Loading event details...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container py-8 mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Event Not Found</CardTitle>
            <CardDescription>
              The event you're looking for doesn't exist or you don't have access to it.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const userHasProfile = profiles.some(profile => profile.id === userId);

  return (
    <div className="container py-8 mx-auto">
      <Button 
        variant="outline" 
        onClick={() => navigate('/dashboard')} 
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Dashboard
      </Button>
      
      <EventHeader 
        event={event} 
        isCreator={isCreator} 
        userHasProfile={userHasProfile} 
      />
      
      {userHasProfile && userId && eventId && (
        <div className="mb-8">
          <ProfileSimilarityScore userId={userId} eventId={eventId} />
        </div>
      )}
      
      <ParticipantsList profiles={profiles} />
    </div>
  );
};

export default EventDetails;
