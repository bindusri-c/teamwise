
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, generateProfileEmbedding } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';
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

  useEffect(() => {
    if (eventId) {
      console.log('Initial mount - fetching event details for eventId:', eventId);
      fetchEventDetails();
    }
  }, [eventId]);

  useEffect(() => {
    // This is a safeguard to ensure we try again when userId becomes available
    if (userId && eventId) {
      console.log('userId available/changed, fetching event details for:', userId, eventId);
      fetchEventDetails();
    }
  }, [userId, eventId]);

  useEffect(() => {
    // Debug output for troubleshooting
    console.log('Current userId:', userId);
    console.log('Current eventId:', eventId);
    console.log('Current profiles count:', profiles.length);
    console.log('All profiles:', profiles);
  }, [userId, eventId, profiles]);

  const fetchEventDetails = async () => {
    if (!eventId) {
      console.log('No eventId provided, cannot fetch event details');
      return;
    }
    
    setIsLoading(true);
    try {
      console.log('Fetching event details for eventId:', eventId);
      
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (eventError) {
        console.error('Error fetching event data:', eventError);
        throw eventError;
      }
      
      console.log('Event data fetched:', eventData);
      setEvent(eventData);
      
      // Check if current user is the creator
      if (userId) {
        setIsCreator(eventData.created_by === userId);
        console.log('Is current user the creator?', eventData.created_by === userId);

        // First, ensure the user is enrolled in this event
        console.log('Checking if user is a participant');
        const { data: participantData, error: participantError } = await supabase
          .from('participants')
          .select('*')
          .eq('event_id', eventId)
          .eq('user_id', userId)
          .maybeSingle();
          
        if (participantError) {
          console.error('Error checking participant status:', participantError);
        } else {
          console.log('Participant status:', participantData ? 'Already a participant' : 'Not a participant');
          
          if (!participantData) {
            console.log('User is not a participant, adding them now');
            // Add user as participant if not already
            const { error: addParticipantError } = await supabase
              .from('participants')
              .insert({
                event_id: eventId,
                user_id: userId
              });
              
            if (addParticipantError) {
              console.error('Error adding user as participant:', addParticipantError);
            } else {
              console.log('Successfully added user as participant');
            }
          }
        }

        // Check if the user has a profile for this event
        // We're specifically NOT doing event_id filtering here to find ANY profile for the user
        console.log('Checking if user has a profile');
        const { data: existingProfile, error: profileCheckError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        
        if (profileCheckError) {
          console.error('Error checking for existing profile:', profileCheckError);
        } else {
          console.log('Profile check result:', existingProfile ? 'Has profile' : 'No profile');
        }
        
        // If no profile exists yet, create one
        if (!existingProfile) {
          console.log('No profile exists for current user. Creating one now.');
          await createUserProfile(userId, eventId);
        } else {
          console.log('User already has a profile. Ensuring embedding is generated.');
          // Even if the profile exists, make sure embedding is generated
          await generateProfileEmbedding(userId, eventId);
        }
      } else {
        console.log('No userId available, skipping creator check and profile creation');
      }

      // Then fetch profiles and similarity scores
      await fetchProfiles();
      
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

  const fetchProfiles = async () => {
    if (!eventId) return;
    
    try {
      console.log('Starting fetchProfiles() for event:', eventId);
      
      // First get all participants for this event
      console.log('Querying participants table for event_id:', eventId);
      const { data: participantsData, error: participantsError } = await supabase
        .from('participants')
        .select('user_id')
        .eq('event_id', eventId);
        
      if (participantsError) {
        console.error('Error fetching participants:', participantsError);
        throw participantsError;
      }
      
      console.log('Found participants:', participantsData?.length, participantsData);
      
      if (!participantsData || participantsData.length === 0) {
        console.log('No participants found for event');
        setProfiles([]);
        return;
      }
      
      // Get the user IDs from participants
      const userIds = participantsData.map(p => p.user_id);
      console.log('Participant user IDs:', userIds);
      
      // Fetch profiles for those users
      console.log('Querying profiles table for user IDs:', userIds);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, email, image_url, skills, interests, linkedin_url, about_you, looking_for, resume_url')
        .in('id', userIds);
        
      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }
      
      console.log('Profiles data fetched:', profilesData?.length, profilesData);
      
      if (profilesData && profilesData.length > 0) {
        await fetchExistingSimilarityScores(profilesData);
      } else {
        // Set profiles to empty array
        console.log('No profile data returned, setting profiles to empty array');
        setProfiles([]);
      }
    } catch (error) {
      console.error('Error fetching profiles:', error);
      setProfiles([]);
    }
  };

  const createUserProfile = async (userId: string, eventId: string) => {
    try {
      console.log('Creating profile for user:', userId, 'in event:', eventId);
      
      // Get user data
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Error fetching user data:', userError);
        return;
      }
      
      // Try to find a profile from another event - we're not filtering by event_id here
      const { data: otherProfile, error: otherProfileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .limit(1)
        .maybeSingle();
      
      if (otherProfileError) {
        console.error('Error fetching profile:', otherProfileError);
      }
      
      // If profile already exists, don't try to create a new one
      if (otherProfile) {
        console.log('Profile already exists for user:', otherProfile);
        // Generate embedding for the existing profile
        console.log('Generating embedding for existing profile');
        const embedResult = await generateProfileEmbedding(userId, eventId);
        console.log('Profile embedding generation result:', embedResult);
        return;
      }
      
      // Create a profile using minimal data
      const newProfile = {
        id: userId,
        email: userData?.user?.email || '',
        name: userData?.user?.email?.split('@')[0] || 'User',
        skills: [] as string[],
        interests: [] as string[]
      };
      
      console.log('Creating new profile:', newProfile);
      
      const { data: createdProfile, error: createProfileError } = await supabase
        .from('profiles')
        .insert(newProfile)
        .select()
        .single();
      
      if (createProfileError) {
        console.error('Error creating profile:', createProfileError);
        return;
      }
      
      console.log('Profile created successfully:', createdProfile);
      
      // Generate embedding for the new profile
      console.log('Generating embedding for new profile');
      const embedResult = await generateProfileEmbedding(userId, eventId);
      console.log('Profile embedding generation result:', embedResult);
      
      // Refresh profiles
      fetchProfiles();
      
    } catch (error) {
      console.error('Error creating user profile:', error);
    }
  };

  const fetchExistingSimilarityScores = async (profilesData: Profile[]) => {
    if (!userId || !eventId) return;
    
    try {      
      console.log('Fetching similarity scores for user:', userId, 'in event:', eventId);
      
      const { data: similarityData, error: similarityError } = await supabase
        .from('profile_similarities')
        .select('profile_id_1, profile_id_2, similarity_score')
        .eq('event_id', eventId)
        .or(`profile_id_1.eq.${userId},profile_id_2.eq.${userId}`);
      
      if (similarityError) {
        console.error('Error fetching similarity scores:', similarityError);
        throw similarityError;
      }
      
      console.log('Similarity data fetched:', similarityData);
      
      const profilesWithSimilarity = profilesData.map(profile => {
        if (profile.id === userId) {
          return { ...profile, similarity_score: 1.0 };
        }
        
        const similarityEntry = similarityData?.find(
          entry => 
            (entry.profile_id_1 === userId && entry.profile_id_2 === profile.id) ||
            (entry.profile_id_1 === profile.id && entry.profile_id_2 === userId)
        );
        
        const similarityScore = similarityEntry?.similarity_score !== undefined 
          ? similarityEntry.similarity_score 
          : 0;
          
        return {
          ...profile,
          similarity_score: similarityScore
        };
      });
      
      console.log('Setting profiles with similarity scores:', profilesWithSimilarity);
      setProfiles(profilesWithSimilarity);
    } catch (error) {
      console.error('Error fetching similarity scores:', error);
      // If we can't get similarity scores, still show the profiles
      console.log('Setting profiles without similarity scores');
      setProfiles(profilesData);
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
        userHasProfile={true}
      />
      
      {/* Pass eventId explicitly to ensure ParticipantsList has it */}
      <ParticipantsList profiles={profiles} eventId={eventId as string} />
    </div>
  );
};

export default EventDetails;
