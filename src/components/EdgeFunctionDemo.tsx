
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

const EdgeFunctionDemo = () => {
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const callEdgeFunction = async () => {
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('hello-world', {
        body: { name: name || undefined },
      });

      if (error) throw error;

      setMessage(data.message);
      toast({
        title: 'Success',
        description: 'Edge function called successfully!',
      });
    } catch (error) {
      console.error('Error calling edge function:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to call edge function',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Edge Function Demo</CardTitle>
        <CardDescription>
          Test the Supabase Edge Function by entering your name and clicking the button
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isLoading}
          />
          <Button 
            onClick={callEdgeFunction} 
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Call Function'}
          </Button>
        </div>
        {message && (
          <div className="p-4 bg-rag-secondary/10 rounded-md">
            <p className="text-sm">{message}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EdgeFunctionDemo;
