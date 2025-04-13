import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Linkedin, User, ArrowLeft, UserPlus, Copy, CheckCircle2, Percent } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';
import ProfileSimilarityScore from '@/components/ProfileSimilarityScore';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

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
  const [copied, setCopied] = useState(false);
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
        setProfiles(profilesData as ProfileWithSimilarity[]);
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
      
      const filteredProfiles = profilesWithSimilarity.filter(profile => profile.id !== userId);
      setProfiles(filteredProfiles);
    } catch (error) {
      console.error('Error fetching similarity scores:', error);
    } finally {
      setLoadingSimilarities(false);
    }
  };

  const copyEventCode = () => {
    if (event) {
      navigator.clipboard.writeText(event.code);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Event code copied to clipboard"
      });
      
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  const registerForEvent = () => {
    navigate(`/event/${eventId}`);
  };
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatSimilarityPercentage = (score: number) => {
    return `${Math.round(score * 100)}%`;
  };

  const getSimilarityBadgeStyle = (score: number) => {
    if (score > 0.8) return "bg-green-500 text-white";
    if (score > 0.6) return "bg-green-400 text-white";
    if (score > 0.4) return "bg-yellow-400 text-white";
    if (score > 0.2) return "bg-orange-400 text-white";
    return "bg-red-400 text-white";
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
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-2xl">{event.name}</CardTitle>
          <CardDescription>
            {isCreator ? 'You created this event' : 'You joined this event'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="bg-muted p-4 rounded-lg flex items-center gap-3">
                <span className="text-sm font-medium">Event Code:</span>
                <span className="font-mono bg-background px-2 py-1 rounded">{event.code}</span>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="ml-2" 
                  onClick={copyEventCode}
                >
                  {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              
              <div className="text-sm">
                <span className="font-medium">Created:</span> {new Date(event.created_at).toLocaleDateString()}
              </div>
            </div>
            
            {!userHasProfile && (
              <div className="bg-primary/10 p-4 rounded-lg">
                <h3 className="font-medium mb-2">Complete Your Registration</h3>
                <p className="text-sm mb-4">You haven't completed your profile for this event yet.</p>
                <Button onClick={registerForEvent}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Register Now
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {userHasProfile && userId && eventId && (
        <div className="mb-8">
          <ProfileSimilarityScore userId={userId} eventId={eventId} />
        </div>
      )}
      
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
              <Card key={profile.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={profile.image_url || undefined} alt={profile.name} />
                        <AvatarFallback>{getInitials(profile.name || 'User')}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">{profile.name || 'Anonymous User'}</CardTitle>
                        <CardDescription>{profile.email}</CardDescription>
                      </div>
                    </div>
                    
                    {profile.similarity_score !== undefined && userHasProfile && (
                      <Badge className={getSimilarityBadgeStyle(profile.similarity_score)}>
                        <Percent className="h-3 w-3 mr-1" />
                        {formatSimilarityPercentage(profile.similarity_score)}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {profile.about_you && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">About</h4>
                      <p className="text-sm line-clamp-3">{profile.about_you}</p>
                    </div>
                  )}
                  
                  {profile.looking_for && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">Looking For</h4>
                      <p className="text-sm line-clamp-2">{profile.looking_for}</p>
                    </div>
                  )}
                  
                  {(profile.skills?.length > 0 || profile.interests?.length > 0) && (
                    <div className="space-y-3">
                      {profile.skills?.length > 0 && (
                        <div>
                          <h4 className="text-xs text-muted-foreground mb-1">Skills</h4>
                          <div className="flex flex-wrap gap-1">
                            {profile.skills.slice(0, 5).map((skill, i) => (
                              <span key={`skill-${profile.id}-${i}`} className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded-full">
                                {skill}
                              </span>
                            ))}
                            {profile.skills.length > 5 && (
                              <span className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded-full">
                                +{profile.skills.length - 5}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {profile.interests?.length > 0 && (
                        <div>
                          <h4 className="text-xs text-muted-foreground mb-1">Interests</h4>
                          <div className="flex flex-wrap gap-1">
                            {profile.interests.slice(0, 5).map((interest, i) => (
                              <span key={`interest-${profile.id}-${i}`} className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded-full">
                                {interest}
                              </span>
                            ))}
                            {profile.interests.length > 5 && (
                              <span className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded-full">
                                +{profile.interests.length - 5}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
                
                <CardFooter className="bg-muted/30 justify-between">
                  <div className="flex items-center">
                    {profile.similarity_score !== undefined && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Percent className="h-3 w-3" />
                        Match: {formatSimilarityPercentage(profile.similarity_score)}
                      </Badge>
                    )}
                  </div>
                  {profile.linkedin_url ? (
                    <a 
                      href={profile.linkedin_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center"
                    >
                      <Button size="sm" variant="outline" className="gap-1">
                        <Linkedin className="h-4 w-4" />
                        Connect
                      </Button>
                    </a>
                  ) : (
                    <Button size="sm" variant="outline" className="gap-1" disabled>
                      <User className="h-4 w-4" />
                      No LinkedIn
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EventDetails;
