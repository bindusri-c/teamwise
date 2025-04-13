
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
  const [isGeneratingEmbedding, setIsGeneratingEmbedding] = useState(false);
  
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

  const generateEmbedding = async () => {
    if (!userId) return;
    
    setIsGeneratingEmbedding(true);
    
    try {
      // Create a profile data object for embedding generation
      const profileData = {
        name: formData.name,
        email: formData.email,
        age: formData.age ? parseInt(formData.age) : null,
        gender: formData.gender || null,
        hobbies: formData.hobbies || null,
        skills: formData.skills || [],
        interests: formData.interests || [],
        about_you: formData.aboutYou || null,
        linkedin_url: formData.linkedinUrl || null,
        updated_at: new Date().toISOString()
      };
      
      // Call the edge function to update profile and generate embedding
      const { error: embeddingError } = await supabase.functions.invoke('update-profile-embedding', {
        body: {
          profileData,
          userId
        }
      });
      
      if (embeddingError) {
        console.error("Error generating embedding:", embeddingError);
        toast({
          title: "Warning",
          description: "Profile saved, but there was an error updating embeddings for matching",
          variant: "destructive"
        });
      } else {
        console.log("Successfully generated and stored embedding");
      }
    } catch (error) {
      console.error("Error calling update-profile-embedding function:", error);
      toast({
        title: "Warning",
        description: "Profile saved, but there was an error updating embeddings for matching",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingEmbedding(false);
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
    isGeneratingEmbedding,
    generateEmbedding
  };
};
