
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, CheckCircle2, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tables } from '@/integrations/supabase/types';
import { useNavigate } from 'react-router-dom';

interface EventHeaderProps {
  event: Tables<'events'>;
  isCreator: boolean;
  userHasProfile: boolean;
}

const EventHeader: React.FC<EventHeaderProps> = ({ 
  event, 
  isCreator,
  userHasProfile
}) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const copyEventCode = () => {
    navigator.clipboard.writeText(event.code);
    setCopied(true);
    toast({
      title: "Copied!",
      description: "Event code copied to clipboard"
    });
    
    setTimeout(() => setCopied(false), 2000);
  };
  
  const registerForEvent = () => {
    navigate(`/event/${event.id}`);
  };

  return (
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
  );
};

export default EventHeader;
