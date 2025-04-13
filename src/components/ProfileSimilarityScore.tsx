
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, RefreshCw, AlertTriangle, Percent } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

type Profile = {
  id: string;
  name: string;
  image_url: string | null;
  skills: string[] | null;
  interests: string[] | null;
  similarity_score?: number;
};

interface ProfileSimilarityScoreProps {
  userId: string;
  eventId: string;
}

const ProfileSimilarityScore: React.FC<ProfileSimilarityScoreProps> = ({ userId, eventId }) => {
  const [similarProfiles, setSimilarProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCalculation, setLastCalculation] = useState<Date | null>(null);
  const { toast } = useToast();

  const fetchSimilarProfiles = async (skipCalculation = false) => {
    if (!userId || !eventId) {
      setIsLoading(false);
      return;
    }

    try {
      // Check if the user has a profile with embedding
      const { data: userProfile, error: userProfileError } = await supabase
        .from('profiles')
        .select('id, embedding')
        .eq('id', userId)
        .eq('event_id', eventId)
        .single();

      if (userProfileError) {
        throw userProfileError;
      }

      if (!userProfile || !userProfile.embedding) {
        setError("Your profile does not have embedding data yet. Please complete your profile.");
        setIsLoading(false);
        return;
      }

      // Directly fetch similar profiles without triggering calculation
      await fetchSimilarityScores();
      
    } catch (error: any) {
      console.error("Error fetching similar profiles:", error);
      setError("Failed to load similarity scores. Try again later.");
      toast({
        title: "Error",
        description: "Failed to load profile similarity data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Function to fetch similarity scores without calculation
  const fetchSimilarityScores = async () => {
    try {
      // Get similar profiles using the precomputed similarity scores
      const { data: similarityData, error: similarityError } = await supabase
        .from('profile_similarities')
        .select(`
          similarity_score,
          profiles!profile_similarities_profile_id_2_fkey (
            id, name, image_url, skills, interests
          )
        `)
        .eq('event_id', eventId)
        .eq('profile_id_1', userId)
        .order('similarity_score', { ascending: false });

      // If no results with userId as profile_id_1, try with userId as profile_id_2
      if ((!similarityData || similarityData.length === 0) && !similarityError) {
        const { data: reversedData, error: reversedError } = await supabase
          .from('profile_similarities')
          .select(`
            similarity_score,
            profiles!profile_similarities_profile_id_1_fkey (
              id, name, image_url, skills, interests
            )
          `)
          .eq('event_id', eventId)
          .eq('profile_id_2', userId)
          .order('similarity_score', { ascending: false });
          
        if (reversedError) {
          throw reversedError;
        }
        
        if (reversedData && reversedData.length > 0) {
          // Transform the data to match our expected format
          const profiles = reversedData.map(item => ({
            ...item.profiles,
            similarity_score: item.similarity_score
          }));
          
          setSimilarProfiles(profiles);
          return;
        }
      }

      if (similarityError) {
        throw similarityError;
      }

      if (similarityData && similarityData.length > 0) {
        // Transform the data to match our expected format
        const profiles = similarityData.map(item => ({
          ...item.profiles,
          similarity_score: item.similarity_score
        }));
        
        setSimilarProfiles(profiles);
      }
    } catch (error) {
      console.error("Error fetching similarity scores:", error);
      throw error;
    }
  };

  // Function to calculate similarity scores via edge function
  const calculateSimilarityScores = async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      // Adding error handling for edge function call
      console.log("Calling calculate-similarity function for event:", eventId, "and profile:", userId);
      
      const { data, error } = await supabase.functions.invoke('calculate-similarity', {
        body: { eventId, profileId: userId }
      });

      if (error) {
        console.error("Error calculating similarity scores:", error);
        throw error;
      }

      console.log("Similarity calculation response:", data);
      setLastCalculation(new Date());
      
      toast({
        title: "Success",
        description: "Similarity scores updated successfully.",
      });

      // After calculation, fetch the profiles again without triggering another calculation
      await fetchSimilarityScores();
    } catch (error: any) {
      console.error("Error calculating similarity scores:", error);
      setError("Failed to calculate similarity scores. The service might be temporarily unavailable. Please try again later.");
      toast({
        title: "Error",
        description: "Failed to calculate similarity scores.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    // Initial fetch without triggering calculation
    fetchSimilarProfiles(true);
  }, [userId, eventId]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Format the similarity score as a percentage
  const formatSimilarityPercentage = (score: number) => {
    return `${Math.round(score * 100)}%`;
  };

  // Get styling for score badge based on percentage
  const getSimilarityBadgeStyle = (score: number) => {
    if (score > 0.8) return "bg-green-500 text-white";
    if (score > 0.6) return "bg-green-400 text-white";
    if (score > 0.4) return "bg-yellow-400 text-white";
    if (score > 0.2) return "bg-orange-400 text-white";
    return "bg-red-400 text-white";
  };

  const lastCalculationText = lastCalculation ? 
    `Last updated: ${lastCalculation.toLocaleTimeString()}` : '';

  if (error) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Similar Participants</CardTitle>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => calculateSimilarityScores()}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Retry
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">People You Might Connect With</CardTitle>
          {lastCalculationText && (
            <p className="text-xs text-muted-foreground mt-1">{lastCalculationText}</p>
          )}
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => calculateSimilarityScores()}
          disabled={isRefreshing || isLoading}
        >
          {isRefreshing ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-4 p-2 rounded-lg border">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <div className="flex gap-1">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <Skeleton className="h-6 w-24" />
              </div>
            ))}
          </div>
        ) : similarProfiles.length > 0 ? (
          <div className="space-y-4">
            {similarProfiles.map((profile) => {              
              return (
                <div key={profile.id} className="flex items-center space-x-4 p-2 rounded-lg border">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={profile.image_url || undefined} alt={profile.name} />
                    <AvatarFallback>{getInitials(profile.name || 'User')}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{profile.name}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {profile.skills?.slice(0, 3).map((skill, i) => (
                        <Badge key={`skill-${i}`} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Badge className={getSimilarityBadgeStyle(profile.similarity_score || 0)}>
                    <Percent className="h-3 w-3 mr-1" />
                    {formatSimilarityPercentage(profile.similarity_score || 0)}
                  </Badge>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No similar profiles found. More participants may appear as they join.
            {isRefreshing ? " Refreshing similarity scores..." : ""}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default ProfileSimilarityScore;
