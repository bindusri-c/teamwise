import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw } from 'lucide-react';
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
  resume_url: string | null;
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
  const [regeneratingEmbedding, setRegeneratingEmbedding] = useState(false);

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
        .select('id, name, email, image_url, skills, interests, linkedin_url, about_you, looking_for, resume_url')
        .eq('event_id', eventId);
        
      if (profilesError) throw profilesError;
      
      if (userId && profilesData.length > 0) {
        // Just fetch similarity scores if they exist, don't auto-calculate
        await fetchExistingSimilarityScores(profilesData);
      } else {
        // When no similarity scores are available, initialize profiles without scores
        console.log('No similarity scores available, setting profiles without scores');
        const initialProfiles = profilesData as ProfileWithSimilarity[];
        setProfiles(initialProfiles);
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

  const fetchExistingSimilarityScores = async (profilesData: Profile[]) => {
    if (!userId || !eventId) return;
    
    setLoadingSimilarities(true);
    try {      
      // Fetch all similarity scores where the current user is involved
      const { data: similarityData, error: similarityError } = await supabase
        .from('profile_similarities')
        .select('profile_id_1, profile_id_2, similarity_score')
        .eq('event_id', eventId)
        .or(`profile_id_1.eq.${userId},profile_id_2.eq.${userId}`);
      
      if (similarityError) throw similarityError;
      
      console.log('Similarity data from database:', similarityData);
      
      // Map the profiles with their similarity scores
      const profilesWithSimilarity = profilesData.map(profile => {
        // If this is the current user, set similarity to 1.0 (100% match with self)
        if (profile.id === userId) {
          return { ...profile, similarity_score: 1.0 };
        }
        
        // Find the similarity entry for this profile pair
        const similarityEntry = similarityData?.find(
          entry => 
            (entry.profile_id_1 === userId && entry.profile_id_2 === profile.id) ||
            (entry.profile_id_1 === profile.id && entry.profile_id_2 === userId)
        );
        
        // Add the similarity score to the profile
        // Default to 0 instead of undefined when no score is found
        const similarityScore = similarityEntry?.similarity_score !== undefined 
          ? similarityEntry.similarity_score 
          : 0;
          
        console.log(`Similarity score for ${profile.name}:`, similarityScore);
        
        return {
          ...profile,
          similarity_score: similarityScore
        };
      });
      
      console.log('Profiles with similarity scores:', profilesWithSimilarity);
      
      setProfiles(profilesWithSimilarity);
    } catch (error) {
      console.error('Error fetching similarity scores:', error);
    } finally {
      setLoadingSimilarities(false);
    }
  };

  const regenerateEmbedding = async () => {
    if (!userId || !eventId) return;
    
    setRegeneratingEmbedding(true);
    try {
      // Fetch the current user's profile for this event
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .eq('event_id', eventId)
        .single();
        
      if (profileError) throw profileError;
      
      if (!profileData) {
        toast({
          title: "Profile not found",
          description: "You need to register for this event first",
          variant: "destructive",
        });
        return;
      }
      
      // Call the edge function to regenerate embedding
      const { error: embeddingError } = await supabase.functions
        .invoke('generate-embedding', {
          body: { 
            userId,
            eventId,
            profileData
          }
        });
      
      if (embeddingError) throw embeddingError;
      
      toast({
        title: "Success",
        description: "Your profile embedding has been regenerated successfully. You can now recalculate similarities.",
        duration: 5000,
      });
      
      // Refresh the data
      await fetchEventDetails();
      
    } catch (error: any) {
      console.error('Error regenerating embedding:', error);
      toast({
        title: "Error",
        description: "Failed to regenerate embedding. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRegeneratingEmbedding(false);
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
          <div className="flex items-center justify-between mb-4">
            <ProfileSimilarityScore userId={userId} eventId={eventId} />
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={regenerateEmbedding}
              disabled={regeneratingEmbedding}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${regeneratingEmbedding ? 'animate-spin' : ''}`} />
              {regeneratingEmbedding ? 'Regenerating...' : 'Regenerate My Embedding'}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Note: Your embedding now includes text from your uploaded resume for better matching.
          </p>
        </div>
      )}
      
      <ParticipantsList profiles={profiles} />
    </div>
  );
};

export default EventDetails;
