
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useCurrentUser() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          console.error('Error fetching user:', error);
          setUserId(null);
        } else {
          setUserId(data.user?.id || null);
        }
      } catch (error) {
        console.error('Error in useCurrentUser hook:', error);
        setUserId(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCurrentUser();
  }, []);

  return { userId, isLoading };
}
