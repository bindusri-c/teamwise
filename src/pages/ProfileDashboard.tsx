import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Upload, ArrowLeft, User, FileText, Save, AlertCircle } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import ProfileBasicInfo from '@/components/profile/ProfileBasicInfo';
import ProfileAboutSection from '@/components/profile/ProfileAboutSection';
import TagInput from '@/components/profile/TagInput';
import ResumeUpload from '@/components/profile/ResumeUpload';

const ProfileDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userId } = useCurrentUser();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingEmbedding, setIsGeneratingEmbedding] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    age: '',
    gender: '' as '' | 'male' | 'female',
    hobbies: '',
    skills: [] as string[],
    interests: [] as string[],
    linkedinUrl: '',
    aboutYou: '',
    resumeUrl: '',
    imageUrl: ''
  });
  
  const [resumeFileName, setResumeFileName] = useState<string>('');
  const [newResume, setNewResume] = useState<File | null>(null);
  
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  
  useEffect(() => {
    fetchUserProfile();
  }, [userId]);
  
  const fetchUserProfile = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;
      
      if (userData.user) {
        setProfileData(prev => ({
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
          
          setProfileData(prev => ({
            ...prev,
            name: profileData.name || prev.name,
            age: profileData.age ? profileData.age.toString() : prev.age,
            gender: genderValue,
            hobbies: profileData.hobbies || prev.hobbies,
            linkedinUrl: profileData.linkedin_url || prev.linkedinUrl,
            skills: profileData.skills || prev.skills,
            interests: profileData.interests || prev.interests,
            aboutYou: profileData.about_you || prev.aboutYou,
            resumeUrl: profileData.resume_url || prev.resumeUrl,
            imageUrl: profileData.image_url || prev.imageUrl
          }));
          
          if (profileData.resume_url) {
            const urlParts = profileData.resume_url.split('/');
            setResumeFileName(urlParts[urlParts.length - 1]);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      toast({
        title: "Error",
        description: "Failed to load your profile information.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
    
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };
  
  const handleRadioChange = (value: 'male' | 'female' | '') => {
    setProfileData(prev => ({ ...prev, gender: value }));
  };
  
  const handleTagInputChange = (tag: string, field: 'skills' | 'interests') => {
    setProfileData(prev => ({
      ...prev,
      [field]: [...prev[field], tag]
    }));
  };
  
  const removeTag = (index: number, field: 'skills' | 'interests') => {
    setProfileData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };
  
  const handleResumeChange = (file: File) => {
    setNewResume(file);
    setResumeFileName(file.name);
    
    if (formErrors.resume) {
      setFormErrors(prev => ({ ...prev, resume: undefined }));
    }
  };
  
  const validateForm = (): boolean => {
    const errors: {[key: string]: string} = {};
    
    if (!profileData.name.trim()) {
      errors.name = "Please enter your name";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userId) {
      toast({
        title: "Error",
        description: "You need to be logged in to update your profile",
        variant: "destructive"
      });
      return;
    }

    if (!validateForm()) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    
    setIsSaving(true);
    
    try {
      let resumeUrl = profileData.resumeUrl;
      
      if (newResume) {
        const resumePath = `${userId}/${Date.now()}_${newResume.name}`;
        
        const { error: resumeError } = await supabase.storage
          .from('resumes')
          .upload(resumePath, newResume);
        
        if (resumeError) {
          console.error("Resume upload error:", resumeError);
          throw new Error(`Error uploading resume: ${resumeError.message}`);
        }
        
        const { data: { publicUrl } } = supabase.storage
          .from('resumes')
          .getPublicUrl(resumePath);
          
        resumeUrl = publicUrl;
      }
      
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      
      const ageValue = profileData.age ? parseInt(profileData.age.toString()) : null;
      
      const updatedProfileData = {
        id: userId,
        name: profileData.name,
        email: userData.user?.email || '',
        age: ageValue,
        gender: profileData.gender || null,
        hobbies: profileData.hobbies || null,
        image_url: profileData.imageUrl || "https://placeholder.co/400",
        resume_url: resumeUrl,
        about_you: profileData.aboutYou || null,
        skills: profileData.skills.length > 0 ? profileData.skills : null,
        interests: profileData.interests.length > 0 ? profileData.interests : null,
        linkedin_url: profileData.linkedinUrl || null,
        updated_at: new Date().toISOString()
      };
      
      console.log("Saving profile data to Supabase:", updatedProfileData);
      
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(updatedProfileData);
      
      if (profileError) {
        console.error("Profile save error:", profileError);
        throw new Error(`Error saving profile: ${profileError.message}`);
      }
      
      setIsGeneratingEmbedding(true);
      
      try {
        const { error: embeddingError } = await supabase.functions.invoke('update-profile-embedding', {
          body: {
            profileData: {
              name: profileData.name,
              age: profileData.age,
              gender: profileData.gender,
              hobbies: profileData.hobbies,
              skills: profileData.skills,
              interests: profileData.interests,
              aboutYou: profileData.aboutYou,
              linkedinUrl: profileData.linkedinUrl
            },
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
        }
      } catch (embeddingError) {
        console.error("Error calling update-profile-embedding function:", embeddingError);
        toast({
          title: "Warning",
          description: "Profile saved, but there was an error updating embeddings for matching",
          variant: "destructive"
        });
      } finally {
        setIsGeneratingEmbedding(false);
      }
      
      toast({
        title: "Success",
        description: "Your profile has been updated successfully"
      });
      
      navigate('/dashboard');
      
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "There was an error updating your profile",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="container py-8 mx-auto">
        <div className="flex justify-center items-center min-h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="ml-2">Loading your profile...</p>
        </div>
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
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={profileData.imageUrl} alt={profileData.name} />
              <AvatarFallback>{profileData.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle>Your Profile</CardTitle>
              <CardDescription>Manage your personal information and preferences</CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <Tabs defaultValue="info">
          <div className="px-6">
            <TabsList className="w-full">
              <TabsTrigger value="info" className="flex-1">
                <User className="mr-2 h-4 w-4" /> Personal Info
              </TabsTrigger>
              <TabsTrigger value="resume" className="flex-1">
                <FileText className="mr-2 h-4 w-4" /> Resume & Skills
              </TabsTrigger>
            </TabsList>
          </div>
          
          <form onSubmit={handleSubmit} noValidate>
            {Object.values(formErrors).some(error => !!error) && (
              <Alert variant="destructive" className="mx-6 mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  Please fix the errors below before submitting the form.
                </AlertDescription>
              </Alert>
            )}
            
            <TabsContent value="info" className="p-0">
              <CardContent className="space-y-6 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name" className={formErrors.name ? "text-destructive" : ""}>
                        Name <span className="text-destructive">*</span>
                      </Label>
                      <Input 
                        id="name" 
                        name="name" 
                        value={profileData.name} 
                        onChange={handleChange}
                        className={formErrors.name ? "border-destructive" : ""}
                      />
                      {formErrors.name && (
                        <p className="text-sm text-destructive mt-1">{formErrors.name}</p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input 
                        id="email" 
                        name="email" 
                        value={profileData.email} 
                        readOnly
                        className="bg-gray-100"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
                    </div>
                    
                    <ProfileBasicInfo
                      age={profileData.age}
                      gender={profileData.gender}
                      hobbies={profileData.hobbies}
                      linkedinUrl={profileData.linkedinUrl}
                      onInputChange={handleChange}
                      onGenderChange={handleRadioChange}
                    />
                  </div>
                  
                  <div className="space-y-4">
                    <ProfileAboutSection
                      aboutYou={profileData.aboutYou}
                      onInputChange={handleChange}
                    />
                  </div>
                </div>
              </CardContent>
            </TabsContent>
            
            <TabsContent value="resume" className="p-0">
              <CardContent className="space-y-6 mt-4">
                <div className="space-y-4">
                  <ResumeUpload
                    resumeFileName={resumeFileName}
                    hasError={!!formErrors.resume}
                    errorMessage={formErrors.resume}
                    onResumeChange={handleResumeChange}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <TagInput
                      label="Skills (press Enter after each)"
                      id="skills-input"
                      placeholder="Add a skill and press Enter"
                      tags={profileData.skills}
                      onAddTag={(tag) => handleTagInputChange(tag, 'skills')}
                      onRemoveTag={(index) => removeTag(index, 'skills')}
                    />
                    
                    <TagInput
                      label="Interests (press Enter after each)"
                      id="interests-input"
                      placeholder="Add an interest and press Enter"
                      tags={profileData.interests}
                      onAddTag={(tag) => handleTagInputChange(tag, 'interests')}
                      onRemoveTag={(index) => removeTag(index, 'interests')}
                    />
                  </div>
                </div>
              </CardContent>
            </TabsContent>
            
            <CardFooter className="flex justify-end gap-4 mt-6">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate('/dashboard')}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSaving || isGeneratingEmbedding}
              >
                {isSaving || isGeneratingEmbedding ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isGeneratingEmbedding ? "Processing..." : "Saving..."}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Profile
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Tabs>
      </Card>
    </div>
  );
};

export default ProfileDashboard;
