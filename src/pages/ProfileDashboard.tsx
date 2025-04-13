
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
import * as pdfjsLib from 'pdfjs-dist';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const ProfileDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userId } = useCurrentUser();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
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
    lookingFor: '',
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
            lookingFor: profileData.looking_for || prev.lookingFor,
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
  
  const handleTagInputChange = (e: React.KeyboardEvent<HTMLInputElement>, field: 'skills' | 'interests') => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const value = (e.target as HTMLInputElement).value.trim();
      if (value) {
        setProfileData(prev => ({
          ...prev,
          [field]: [...prev[field], value]
        }));
        (e.target as HTMLInputElement).value = '';
      }
    }
  };
  
  const removeTag = (index: number, field: 'skills' | 'interests') => {
    setProfileData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };
  
  const handleResumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Only PDF and DOCX files are allowed for resume",
        variant: "destructive"
      });
      e.target.value = '';
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 5MB",
        variant: "destructive"
      });
      e.target.value = '';
      return;
    }
    
    setNewResume(file);
    setResumeFileName(file.name);
    
    if (formErrors.resume) {
      setFormErrors(prev => ({ ...prev, resume: undefined }));
    }
  };
  
  const parseResume = async () => {
    const file = newResume;
    if (!file) {
      toast({
        title: "No resume uploaded",
        description: "Please upload a resume first",
        variant: "destructive"
      });
      return;
    }
    
    if (file.type !== 'application/pdf') {
      toast({
        title: "PDF files only",
        description: "Only PDF files can be parsed automatically",
        variant: "destructive"
      });
      return;
    }
    
    setIsParsing(true);
    
    try {
      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
      }
      
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + ' ';
      }
      
      const extractedData = {
        skills: extractSkills(fullText),
        interests: extractInterests(fullText),
        linkedinUrl: extractLinkedInUrl(fullText) || '',
        aboutYou: extractParagraph(fullText, 100)
      };
      
      setProfileData(prev => ({
        ...prev,
        linkedinUrl: extractedData.linkedinUrl || prev.linkedinUrl,
        skills: [...new Set([...prev.skills, ...extractedData.skills])],
        interests: [...new Set([...prev.interests, ...extractedData.interests])],
        aboutYou: extractedData.aboutYou || prev.aboutYou
      }));
      
      toast({
        title: "Resume parsed",
        description: "Resume data has been extracted and filled in the form"
      });
    } catch (error) {
      console.error("Error parsing resume:", error);
      toast({
        title: "Error parsing resume",
        description: "There was an error parsing your resume",
        variant: "destructive"
      });
    } finally {
      setIsParsing(false);
    }
  };
  
  const extractLinkedInUrl = (text: string): string | null => {
    const linkedinRegex = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+(?:\/)?/i;
    const match = text.match(linkedinRegex);
    return match ? match[0] : null;
  };
  
  const extractSkills = (text: string): string[] => {
    const skillKeywords = [
      'javascript', 'python', 'react', 'node', 'html', 'css', 'sql', 'java', 'c\\+\\+',
      'leadership', 'management', 'communication', 'teamwork', 'problem solving',
      'analytics', 'excel', 'powerpoint', 'project management', 'public speaking',
      'research', 'design', 'photoshop', 'illustrator', 'agile', 'scrum'
    ];
    return skillKeywords.filter(skill => 
      new RegExp(`\\b${skill}\\b`, 'i').test(text)
    );
  };
  
  const extractInterests = (text: string): string[] => {
    const interestKeywords = [
      'travel', 'music', 'sports', 'reading', 'photography', 'cooking', 'gaming', 'hiking',
      'yoga', 'meditation', 'art', 'dancing', 'volunteering', 'cycling', 'running',
      'swimming', 'chess', 'writing', 'blogging', 'podcasting', 'movies', 'theater'
    ];
    return interestKeywords.filter(interest => 
      new RegExp(`\\b${interest}\\b`, 'i').test(text)
    );
  };
  
  const extractParagraph = (text: string, maxWords: number): string => {
    const words = text.split(/\s+/).slice(0, maxWords);
    return words.join(' ');
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
      // Upload new resume if provided
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
      
      // Get user data for the profile
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      
      // Convert age to number if present
      const ageValue = profileData.age ? parseInt(profileData.age.toString()) : null;
      
      // Prepare profile data
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
        looking_for: profileData.lookingFor || null,
        skills: profileData.skills.length > 0 ? profileData.skills : null,
        interests: profileData.interests.length > 0 ? profileData.interests : null,
        linkedin_url: profileData.linkedinUrl || null,
        updated_at: new Date().toISOString()
      };
      
      console.log("Saving profile data to Supabase:", updatedProfileData);
      
      // Save profile data
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(updatedProfileData);
      
      if (profileError) {
        console.error("Profile save error:", profileError);
        throw new Error(`Error saving profile: ${profileError.message}`);
      }
      
      toast({
        title: "Success",
        description: "Your profile has been updated successfully"
      });
      
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
                    
                    <div>
                      <Label htmlFor="age">Age</Label>
                      <Input 
                        id="age" 
                        name="age" 
                        type="number" 
                        min="18" 
                        max="120" 
                        value={profileData.age} 
                        onChange={handleChange} 
                      />
                    </div>
                    
                    <div>
                      <Label>Gender</Label>
                      <RadioGroup value={profileData.gender} onValueChange={handleRadioChange} className="mt-2">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="male" id="male" />
                          <Label htmlFor="male">Male</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="female" id="female" />
                          <Label htmlFor="female">Female</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="hobbies">Hobbies</Label>
                      <Input 
                        id="hobbies" 
                        name="hobbies" 
                        value={profileData.hobbies} 
                        onChange={handleChange} 
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
                      <Input 
                        id="linkedinUrl" 
                        name="linkedinUrl" 
                        value={profileData.linkedinUrl} 
                        onChange={handleChange} 
                        placeholder="https://linkedin.com/in/username"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="aboutYou">About You</Label>
                      <Textarea 
                        id="aboutYou" 
                        name="aboutYou" 
                        value={profileData.aboutYou} 
                        onChange={handleChange} 
                        rows={4} 
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="lookingFor">Who are you looking to connect with?</Label>
                      <Textarea 
                        id="lookingFor" 
                        name="lookingFor" 
                        value={profileData.lookingFor} 
                        onChange={handleChange} 
                        rows={4} 
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </TabsContent>
            
            <TabsContent value="resume" className="p-0">
              <CardContent className="space-y-6 mt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="resume">Resume (PDF)</Label>
                      {newResume && (
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          onClick={parseResume}
                          disabled={isParsing}
                        >
                          {isParsing ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Parsing...
                            </>
                          ) : (
                            "Autofill from Resume"
                          )}
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => resumeInputRef.current?.click()}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Resume
                      </Button>
                      {resumeFileName && <span className="text-sm">{resumeFileName}</span>}
                    </div>
                    <input 
                      ref={resumeInputRef}
                      id="resume" 
                      name="resume"
                      type="file" 
                      accept=".pdf,application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
                      className="hidden" 
                      onChange={handleResumeChange} 
                    />
                    <p className="text-xs text-muted-foreground italic mt-1">
                      Note: Only PDF files can be parsed automatically.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <div className="space-y-2">
                      <Label htmlFor="skills-input">Skills (press Enter after each)</Label>
                      <Input 
                        id="skills-input" 
                        placeholder="Add a skill and press Enter" 
                        onKeyDown={(e) => handleTagInputChange(e, 'skills')} 
                      />
                      <div className="flex flex-wrap gap-2 mt-2">
                        {profileData.skills.map((skill, index) => (
                          <div key={index} className="bg-secondary px-3 py-1 rounded-full flex items-center text-sm">
                            {skill}
                            <button 
                              type="button" 
                              className="ml-2 text-secondary-foreground/70 hover:text-secondary-foreground"
                              onClick={() => removeTag(index, 'skills')}
                            >
                              &times;
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="interests-input">Interests (press Enter after each)</Label>
                      <Input 
                        id="interests-input" 
                        placeholder="Add an interest and press Enter" 
                        onKeyDown={(e) => handleTagInputChange(e, 'interests')} 
                      />
                      <div className="flex flex-wrap gap-2 mt-2">
                        {profileData.interests.map((interest, index) => (
                          <div key={index} className="bg-secondary px-3 py-1 rounded-full flex items-center text-sm">
                            {interest}
                            <button 
                              type="button" 
                              className="ml-2 text-secondary-foreground/70 hover:text-secondary-foreground"
                              onClick={() => removeTag(index, 'interests')}
                            >
                              &times;
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
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
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
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
