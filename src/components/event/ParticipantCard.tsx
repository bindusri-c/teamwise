import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Linkedin, User, Percent, BadgePercent } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type ParticipantCardProps = {
  profile: {
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
};

const ParticipantCard: React.FC<ParticipantCardProps> = ({ profile }) => {
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

  return (
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
          
          {profile.similarity_score !== undefined && (
            <Badge className={`${getSimilarityBadgeStyle(profile.similarity_score)} flex items-center`}>
              <BadgePercent className="h-3 w-3 mr-1" />
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
        {profile.similarity_score !== undefined && (
          <Badge variant="outline" className="flex items-center gap-1">
            <Percent className="h-3 w-3" />
            Match: {formatSimilarityPercentage(profile.similarity_score)}
          </Badge>
        )}
        
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
  );
};

export default ParticipantCard;
