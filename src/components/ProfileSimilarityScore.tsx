
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2 } from 'lucide-react';

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
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchSimilarProfiles = async () => {
      if (!userId || !eventId) {
        setIsLoading(false);
        return;
      }

      try {
        // Get current user's profile
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

        // Get all other profiles for this event
        const { data: otherProfiles, error: otherProfilesError } = await supabase
          .from('profiles')
          .select('id, name, image_url, skills, interests, embedding')
          .eq('event_id', eventId)
          .neq('id', userId);

        if (otherProfilesError) {
          throw otherProfilesError;
        }

        // Calculate cosine similarity for each profile
        const profilesWithScores = otherProfiles
          .filter(profile => profile.embedding) // Only include profiles with embeddings
          .map(profile => {
            // Calculate cosine similarity
            const similarity = calculateCosineSimilarity(
              JSON.parse(userProfile.embedding),
              JSON.parse(profile.embedding)
            );

            return {
              ...profile,
              similarity_score: similarity
            };
          })
          .sort((a, b) => (b.similarity_score || 0) - (a.similarity_score || 0))
          .slice(0, 5); // Get top 5 most similar profiles

        setSimilarProfiles(profilesWithScores);
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

    fetchSimilarProfiles();
  }, [userId, eventId, toast]);

  // Calculate cosine similarity between two embedding vectors
  const calculateCosineSimilarity = (vectorA: number[], vectorB: number[]): number => {
    if (!vectorA || !vectorB || vectorA.length !== vectorB.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      normA += vectorA[i] * vectorA[i];
      normB += vectorB[i] * vectorB[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getSimilarityLabel = (score: number) => {
    if (score > 0.8) return { label: "Very High", color: "bg-green-500" };
    if (score > 0.6) return { label: "High", color: "bg-green-400" };
    if (score > 0.4) return { label: "Medium", color: "bg-yellow-400" };
    if (score > 0.2) return { label: "Low", color: "bg-orange-400" };
    return { label: "Very Low", color: "bg-red-400" };
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Similar Participants</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">People You Might Connect With</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : similarProfiles.length > 0 ? (
          <div className="space-y-4">
            {similarProfiles.map((profile) => {
              const similarity = getSimilarityLabel(profile.similarity_score || 0);
              
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
                  <Badge className={`${similarity.color} text-white`}>
                    {similarity.label} Match
                  </Badge>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No similar profiles found. More participants may appear as they join.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default ProfileSimilarityScore;
