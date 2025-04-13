
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EventFormData } from '@/types/eventForm';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useToast } from '@/hooks/use-toast';

export const useProfileForm = (eventId?: string) => {
  const { toast } = useToast();
  const { userId } = useCurrentUser();
  const [event, setEvent] = useState<{id: string, name: string} | null>(null);
  const [formData, setFormData] = useState<EventFormData>({
    name: '',
    email: '',
    age: '',
    gender: '',
    hobbies: '',
    resume: null,
    additionalFiles: [],
    aboutYou: '',
    image: null,
    skills: [],
    interests: [],
    linkedinUrl: ''
  });
  
  const [formErrors, setFormErrors] = useState<{
    resume?: string;
    name?: string;
  }>({});
  
  const [resumeFileName, setResumeFileName] = useState<string>('');
  const [additionalFileNames, setAdditionalFileNames] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  useEffect(() => {
    if (eventId) {
      fetchEventInfo();
      fetchUserProfile();
    }
  }, [eventId]);

  const fetchEventInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, name')
        .eq('id', eventId)
        .single();
      
      if (error) throw error;
      setEvent(data);
    } catch (error) {
      console.error('Error fetching event info:', error);
      toast({
        title: "Error",
        description: "Could not fetch event information",
        variant: "destructive",
      });
    }
  };
  
  const fetchUserProfile = async () => {
    if (!userId) return;
    
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;
      
      if (userData.user) {
        setFormData(prev => ({
          ...prev,
          email: userData.user.email || '',
        }));
        
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .eq('event_id', eventId)
          .maybeSingle();
        
        if (profileError) {
          console.warn('Error fetching user profile:', profileError);
          return;
        }
        
        if (profileData) {
          let genderValue: '' | 'male' | 'female' = '';
          if (profileData.gender === 'male') genderValue = 'male';
          if (profileData.gender === 'female') genderValue = 'female';
          
          setFormData(prev => ({
            ...prev,
            name: profileData.name || prev.name,
            age: profileData.age ? profileData.age.toString() : prev.age,
            gender: genderValue,
            hobbies: profileData.hobbies || prev.hobbies,
            linkedinUrl: profileData.linkedin_url || prev.linkedinUrl,
            skills: profileData.skills || prev.skills,
            interests: profileData.interests || prev.interests,
            aboutYou: profileData.about_you || prev.aboutYou
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    if (formErrors[name as keyof typeof formErrors]) {
      setFormErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleRadioChange = (value: 'male' | 'female' | '') => {
    setFormData((prev) => ({ ...prev, gender: value }));
  };
  
  const validateForm = (): boolean => {
    const errors: {
      resume?: string;
      name?: string;
    } = {};
    
    if (!formData.name.trim()) {
      errors.name = "Please enter your name";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Function to generate embedding after profile update
  const generateEmbedding = async (userId: string, eventId: string, profileData: any) => {
    try {
      // Get the event name to calculate Pinecone index name
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('name')
        .eq('id', eventId)
        .single();
        
      if (eventError) {
        console.error('Error fetching event:', eventError);
        return { success: false, error: eventError };
      }
      
      // Generate Pinecone index name using the same format as in other places
      const indexName = `evt-${eventData.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').substring(0, 20)}`;
      
      console.log(`Generating embedding with Pinecone index: ${indexName}`);
      
      // Call the generate-embedding edge function
      const { data, error } = await supabase.functions.invoke('generate-embedding', {
        body: { 
          userId, 
          eventId, 
          profileData, 
          pineconeIndex: indexName
        }
      });
      
      if (error) {
        console.error('Error generating embedding:', error);
        return { success: false, error };
      }
      
      return { success: true, data };
    } catch (error) {
      console.error("Error calling generate embedding function:", error);
      return { success: false, error };
    }
  };
  
  // Function to ensure user is enrolled in the event
  const ensureUserEnrolled = async (userId: string, eventId: string) => {
    try {
      // Check if the user is already enrolled
      const { data: existingParticipant, error: checkError } = await supabase
        .from('participants')
        .select('*')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .maybeSingle();
        
      if (checkError) {
        console.error('Error checking participant:', checkError);
        return { success: false, error: checkError };
      }
      
      // If not already enrolled, add them as a participant
      if (!existingParticipant) {
        const { error: insertError } = await supabase
          .from('participants')
          .insert({
            event_id: eventId,
            user_id: userId
          });
          
        if (insertError) {
          console.error('Error adding participant:', insertError);
          return { success: false, error: insertError };
        }
      }
      
      return { success: true };
    } catch (error) {
      console.error("Error enrolling user in event:", error);
      return { success: false, error };
    }
  };

  return {
    event,
    formData,
    setFormData,
    formErrors,
    setFormErrors,
    resumeFileName,
    setResumeFileName,
    additionalFileNames,
    setAdditionalFileNames,
    handleChange,
    handleRadioChange,
    validateForm,
    isSubmitting,
    setIsSubmitting,
    generateEmbedding,
    ensureUserEnrolled
  };
};
