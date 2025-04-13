
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
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
      fetchEventDetails();
    }
  }, [eventId]);

  useEffect(() => {
    // Debug output for troubleshooting
    console.log('Current userId:', userId);
    console.log('Current eventId:', eventId);
    console.log('Current profiles count:', profiles.length);
    console.log('All profiles:', profiles);
  }, [userId, eventId, profiles]);

  const fetchEventDetails = async () => {
    setIsLoading(true);
    try {
      console.log('Fetching event details for eventId:', eventId);
      
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (eventError) throw eventError;
      
      console.log('Event data fetched:', eventData);
      setEvent(eventData);
      
      setIsCreator(eventData.created_by === userId);

      // First, ensure the user is enrolled in this event
      if (userId) {
        const { data: participantData, error: participantError } = await supabase
          .from('participants')
          .select('*')
          .eq('event_id', eventId)
          .eq('user_id', userId)
          .maybeSingle();
          
        if (participantError) {
          console.error('Error checking participant status:', participantError);
        } else if (!participantData) {
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
          }
        }
      }

      // Fetch all profiles for this event
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, email, image_url, skills, interests, linkedin_url, about_you, looking_for, resume_url')
        .eq('event_id', eventId);
        
      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }
      
      console.log('Profiles data fetched:', profilesData?.length, profilesData);
      
      if (profilesData && profilesData.length > 0) {
        await fetchExistingSimilarityScores(profilesData);
      } else {
        console.log('No profiles found for this event. Checking if we need to create one for current user.');
        
        if (userId) {
          // Check if user already has a profile
          const { data: existingProfile, error: profileCheckError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .eq('event_id', eventId)
            .maybeSingle();
          
          if (profileCheckError) {
            console.error('Error checking for existing profile:', profileCheckError);
          }
          
          if (!existingProfile) {
            console.log('No profile exists for current user. Creating one now.');
            await createUserProfile(userId, eventId);
          }
        }
        
        // Set profiles to empty array
        setProfiles([]);
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

  const createUserProfile = async (userId: string, eventId: string) => {
    try {
      console.log('Creating profile for user:', userId, 'in event:', eventId);
      
      // Get user data
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Error fetching user data:', userError);
        return;
      }
      
      // Try to find a profile from another event
      const { data: otherProfile, error: otherProfileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .limit(1)
        .maybeSingle();
      
      if (otherProfileError) {
        console.error('Error fetching profile from other events:', otherProfileError);
      }
      
      // Create a profile using existing data or minimal data if nothing exists
      const newProfile = {
        id: userId,
        event_id: eventId,
        email: userData?.user?.email || '',
        name: otherProfile?.name || userData?.user?.email?.split('@')[0] || 'User',
        // Copy other fields from the existing profile if available
        age: otherProfile?.age || null,
        gender: otherProfile?.gender || null,
        hobbies: otherProfile?.hobbies || null,
        skills: otherProfile?.skills || [],
        interests: otherProfile?.interests || [],
        about_you: otherProfile?.about_you || null,
        linkedin_url: otherProfile?.linkedin_url || null
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
      const { success, error } = await generateProfileEmbedding(userId, eventId);
      
      if (!success) {
        console.error('Error generating profile embedding:', error);
      } else {
        console.log('Profile embedding generated successfully');
      }
      
      // Refresh profiles
      fetchEventDetails();
      
    } catch (error) {
      console.error('Error creating user profile:', error);
    }
  };

  const generateProfileEmbedding = async (userId: string, eventId: string) => {
    try {
      console.log('Generating embedding for user:', userId, 'in event:', eventId);
      
      // Get profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .eq('event_id', eventId)
        .single();
      
      if (profileError) {
        console.error('Error fetching profile for embedding:', profileError);
        return { success: false, error: profileError };
      }
      
      // Get event data to determine the Pinecone index name
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('name')
        .eq('id', eventId)
        .single();
        
      if (eventError) {
        console.error('Error fetching event for embedding:', eventError);
        return { success: false, error: eventError };
      }
      
      // Generate the pinecone index name
      const indexName = `evt-${eventData.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').substring(0, 20)}`;
      
      console.log(`Using Pinecone index name for event ${eventId}: ${indexName}`);
      
      // Call the generate-embedding function
      const { data, error } = await supabase.functions.invoke('generate-embedding', {
        body: { 
          userId, 
          eventId, 
          profileData,
          pineconeIndex: indexName
        }
      });
      
      if (error) {
        console.error('Error invoking generate-embedding function:', error);
        return { success: false, error };
      }
      
      console.log('Embedding generation response:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Error generating profile embedding:', error);
      return { success: false, error };
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
      
      setProfiles(profilesWithSimilarity);
    } catch (error) {
      console.error('Error fetching similarity scores:', error);
      // If we can't get similarity scores, still show the profiles
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
      
      <ParticipantsList profiles={profiles} eventId={eventId as string} />
    </div>
  );
};

export default EventDetails;
