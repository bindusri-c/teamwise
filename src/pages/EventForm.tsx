import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ArrowLeft, Check } from 'lucide-react';
import { useProfileForm } from '@/hooks/useProfileForm';
import { supabase, generateProfileEmbedding } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import ResumeUpload from '@/components/profile/ResumeUpload';
import AdditionalFilesUpload from '@/components/profile/AdditionalFilesUpload';
import ProfileBasicInfo from '@/components/profile/ProfileBasicInfo';
import ProfileAboutSection from '@/components/profile/ProfileAboutSection';
import TagInput from '@/components/profile/TagInput';

const EventForm = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userId } = useCurrentUser();
  const [isUpdating, setIsUpdating] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [isCheckingProfile, setIsCheckingProfile] = useState(true);
  
  const {
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
  } = useProfileForm(eventId);

  useEffect(() => {
    if (userId && eventId) {
      checkForExistingProfile();
    }
  }, [userId, eventId]);

  const checkForExistingProfile = async () => {
    setIsCheckingProfile(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .eq('event_id', eventId)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setHasProfile(true);
        setIsUpdating(true);
        
        if (!data.embedding) {
          console.log("Profile found but no embedding, generating embedding...");
          const { success, error: embeddingError } = await generateProfileEmbedding(userId, eventId);
          
          if (embeddingError) {
            console.error("Error generating embedding:", embeddingError);
          } else {
            console.log("Embedding generated successfully");
          }
        }
        
        toast({
          title: "Already Registered",
          description: "You are already registered for this event. Redirecting to dashboard...",
          variant: "default",
        });
        
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      } else {
        console.log("No profile found, creating one and generating embedding...");
        
        const { success: enrollSuccess, error: enrollError } = await ensureUserEnrolled(userId, eventId);
        
        if (!enrollSuccess) {
          console.error("Error enrolling user:", enrollError);
        }
        
        const { data: userData } = await supabase.auth.getUser();
        
        const { data: otherProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .neq('event_id', eventId)
          .limit(1)
          .maybeSingle();
        
        if (otherProfile) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: userId,
              event_id: eventId,
              name: otherProfile.name,
              email: otherProfile.email || userData?.user?.email,
              age: otherProfile.age,
              gender: otherProfile.gender,
              hobbies: otherProfile.hobbies,
              about_you: otherProfile.about_you,
              skills: otherProfile.skills,
              interests: otherProfile.interests,
              linkedin_url: otherProfile.linkedin_url
            });
          
          if (profileError) {
            console.error("Error creating profile from existing profile:", profileError);
          } else {
            await generateProfileEmbedding(userId, eventId);
            
            toast({
              title: "Profile Created",
              description: "Your profile has been created from existing data. Redirecting to dashboard...",
              variant: "default",
            });
            
            setTimeout(() => {
              navigate('/dashboard');
            }, 1500);
          }
        }
      }
    } catch (error) {
      console.error('Error checking for existing profile:', error);
    } finally {
      setIsCheckingProfile(false);
    }
  };

  const handleResumeChange = (file: File) => {
    setFormData((prev) => ({ ...prev, resume: file }));
    setResumeFileName(file.name);
    
    if (formErrors.resume) {
      setFormErrors(prev => ({ ...prev, resume: undefined }));
    }
  };

  const handleAdditionalFilesChange = (files: File[]) => {
    setFormData((prev) => ({ 
      ...prev, 
      additionalFiles: [...prev.additionalFiles, ...files] 
    }));
    setAdditionalFileNames((prev) => [...prev, ...files.map(f => f.name)]);
  };

  const handleAddTag = (field: 'skills' | 'interests', tag: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: [...prev[field], tag]
    }));
  };
  
  const handleRemoveTag = (field: 'skills' | 'interests', index: number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Error",
        description: "Please fix the errors in the form",
        variant: "destructive",
      });
      return;
    }
    
    if (!userId || !eventId) {
      toast({
        title: "Error",
        description: "Missing user or event information",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const { success: enrollSuccess, error: enrollError } = await ensureUserEnrolled(userId, eventId);
      
      if (!enrollSuccess) {
        throw enrollError || new Error("Failed to enroll in event");
      }
      
      const profileData = {
        id: userId,
        event_id: eventId,
        name: formData.name,
        email: formData.email,
        age: formData.age ? parseInt(String(formData.age)) : null,
        gender: formData.gender,
        hobbies: formData.hobbies,
        about_you: formData.aboutYou,
        skills: formData.skills,
        interests: formData.interests,
        linkedin_url: formData.linkedinUrl
      };
      
      const { error } = await supabase
        .from('profiles')
        .upsert(profileData, { onConflict: 'id,event_id' });
      
      if (error) throw error;
      
      let resumeUrl = null;
      if (formData.resume) {
        const { data: resumeData, error: resumeError } = await supabase.storage
          .from('resumes')
          .upload(`${userId}/${eventId}/${formData.resume.name}`, formData.resume);
        
        if (resumeError) throw resumeError;
        
        if (resumeData) {
          const { data: urlData } = supabase.storage
            .from('resumes')
            .getPublicUrl(resumeData.path);
          
          resumeUrl = urlData.publicUrl;
          
          await supabase
            .from('profiles')
            .update({ resume_url: resumeUrl })
            .eq('id', userId)
            .eq('event_id', eventId);
        }
      }
      
      if (formData.additionalFiles.length > 0) {
        const fileUrls: string[] = [];
        
        for (const file of formData.additionalFiles) {
          const { data: fileData, error: fileError } = await supabase.storage
            .from('additional_files')
            .upload(`${userId}/${eventId}/${file.name}`, file);
          
          if (fileError) {
            console.error('Error uploading additional file:', fileError);
            continue;
          }
          
          if (fileData) {
            const { data: urlData } = supabase.storage
              .from('additional_files')
              .getPublicUrl(fileData.path);
            
            fileUrls.push(urlData.publicUrl);
          }
        }
        
        if (fileUrls.length > 0) {
          await supabase
            .from('profiles')
            .update({ additional_files: fileUrls })
            .eq('id', userId)
            .eq('event_id', eventId);
        }
      }
      
      const { data: updatedProfileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .eq('event_id', eventId)
        .single();
        
      if (profileError) throw profileError;
      
      const { success: embeddingSuccess, error: embeddingError } = 
        await generateProfileEmbedding(userId, eventId);
      
      if (!embeddingSuccess) {
        console.error("Error generating profile embedding:", embeddingError);
        toast({
          title: "Warning",
          description: "Profile saved but embedding generation failed. Some features may be limited.",
          variant: "destructive",
        });
      } else {
        console.log("Profile embedding generated successfully");
      }
      
      toast({
        title: "Success",
        description: "Your profile has been saved and you've been registered for the event",
        variant: "default",
      });
      
      setHasProfile(true);
      setIsUpdating(true);
      
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
      
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: error.message || "There was an error saving your profile",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCheckingProfile) {
    return (
      <div className="container py-8 mx-auto text-center">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Checking profile status...</AlertTitle>
          <AlertDescription>
            Please wait while we check your registration status.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!eventId || !event) {
    return (
      <div className="container py-8 mx-auto text-center">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Missing event information</AlertTitle>
          <AlertDescription>
            Please return to the dashboard and select an event.
          </AlertDescription>
        </Alert>
        <Button 
          variant="outline" 
          onClick={() => navigate('/dashboard')} 
          className="mt-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

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
      
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>{event?.name ? `${event.name} Information` : 'Event Information'}</CardTitle>
          <CardDescription>
            {hasProfile 
              ? "Your profile for this event is complete. You can update it at any time."
              : "Complete your profile for this event to connect with others."}
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit} noValidate>
          {Object.values(formErrors).some(error => !!error) && (
            <Alert variant="destructive" className="mx-6 mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                Please fix the errors below before submitting the form.
              </AlertDescription>
            </Alert>
          )}
          
          {hasProfile && (
            <Alert className="mx-6 mb-6">
              <Check className="h-4 w-4 text-green-500" />
              <AlertTitle>Profile Complete</AlertTitle>
              <AlertDescription>
                Your profile for this event is complete. You can update it at any time.
              </AlertDescription>
            </Alert>
          )}
          
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ProfileBasicInfo 
                age={formData.age.toString()}
                gender={formData.gender}
                hobbies={formData.hobbies}
                linkedinUrl={formData.linkedinUrl}
                onInputChange={handleChange}
                onGenderChange={handleRadioChange}
              />
              
              <div className="space-y-4">
                <ResumeUpload 
                  resumeFileName={resumeFileName}
                  hasError={!!formErrors.resume}
                  errorMessage={formErrors.resume}
                  onResumeChange={handleResumeChange}
                />
                
                <AdditionalFilesUpload 
                  fileNames={additionalFileNames}
                  onFilesChange={handleAdditionalFilesChange}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <TagInput 
                label="Skills (press Enter after each)"
                id="skills-input"
                placeholder="Add a skill and press Enter"
                tags={formData.skills}
                onAddTag={(tag) => handleAddTag('skills', tag)}
                onRemoveTag={(index) => handleRemoveTag('skills', index)}
              />
              
              <TagInput 
                label="Interests (press Enter after each)"
                id="interests-input"
                placeholder="Add an interest and press Enter"
                tags={formData.interests}
                onAddTag={(tag) => handleAddTag('interests', tag)}
                onRemoveTag={(index) => handleRemoveTag('interests', index)}
              />
            </div>
            
            <ProfileAboutSection 
              aboutYou={formData.aboutYou}
              onInputChange={handleChange}
            />
          </CardContent>
          
          <CardFooter className="flex justify-between">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate('/dashboard')}
            >
              Back to Dashboard
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                'Saving...'
              ) : isUpdating ? (
                'Update Profile'
              ) : (
                'Save Profile'
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default EventForm;
