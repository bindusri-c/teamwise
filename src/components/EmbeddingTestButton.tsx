
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { generateProfileEmbedding } from '@/integrations/supabase/utils/embedding-utils';
import { supabase } from '@/integrations/supabase/client';

const EmbeddingTestButton = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { userId } = useCurrentUser();
  
  const handleTestEmbedding = async () => {
    if (!userId) {
      toast({
        title: "Error",
        description: "You must be logged in to test embedding generation",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // First, check if the event exists
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('id')
        .eq('name', 'datathon')
        .maybeSingle();
      
      if (eventError) {
        throw new Error(`Error finding event: ${eventError.message}`);
      }
      
      let eventId = eventData?.id;
      
      // If event doesn't exist, create it
      if (!eventId) {
        const { data: newEvent, error: createError } = await supabase
          .from('events')
          .insert({
            name: 'datathon',
            created_by: userId,
            code: '123456' // Dummy code for test purposes
          })
          .select('id')
          .single();
        
        if (createError) {
          throw new Error(`Error creating event: ${createError.message}`);
        }
        
        eventId = newEvent.id;
        
        toast({
          title: "Event Created",
          description: "Created 'datathon' event for testing",
        });
      }
      
      // Check if user has a profile for this event
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .eq('event_id', eventId)
        .maybeSingle();
      
      // If profile doesn't exist, create it
      if (!profileData) {
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            event_id: eventId,
            name: 'Test User',
            email: 'test@example.com',
            skills: ['coding', 'testing'],
            interests: ['AI', 'data science'],
            about_you: 'This is a test profile for embedding generation'
          });
        
        if (insertError) {
          throw new Error(`Error creating profile: ${insertError.message}`);
        }
        
        toast({
          title: "Profile Created",
          description: "Created test profile for embedding generation",
        });
      }
      
      // Now generate the embedding
      console.log(`Generating embedding for user ${userId} in event ${eventId}`);
      const result = await generateProfileEmbedding(userId, eventId);
      
      if (!result.success) {
        throw new Error(`Error generating embedding: ${result.error?.message || 'Unknown error'}`);
      }
      
      toast({
        title: "Success",
        description: "Embedding generated successfully! Check console for details.",
      });
      
      console.log('Embedding generation result:', result);
    } catch (error) {
      console.error('Error testing embedding:', error);
      toast({
        title: "Error",
        description: error.message || "An error occurred while testing embedding generation",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Button 
      onClick={handleTestEmbedding} 
      disabled={isLoading || !userId}
      className="bg-rag-primary hover:bg-rag-secondary"
    >
      {isLoading ? 'Processing...' : 'Test Embedding Generation'}
    </Button>
  );
};

export default EmbeddingTestButton;
