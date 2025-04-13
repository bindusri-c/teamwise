
import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { EventFormData } from '@/types/eventForm';
import { Loader2, Upload, ArrowLeft, AlertCircle, Info } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

const EventForm = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userId } = useCurrentUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
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
    lookingFor: '',
    image: null,
    skills: [],
    interests: [],
    linkedinUrl: ''
  });
  
  const [formErrors, setFormErrors] = useState<{
    resume?: string;
  }>({});
  
  const [resumeFileName, setResumeFileName] = useState<string>('');
  const [additionalFileNames, setAdditionalFileNames] = useState<string[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);
  
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
            aboutYou: profileData.about_you || prev.aboutYou,
            lookingFor: profileData.looking_for || prev.lookingFor
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
  
  const handleTagInputChange = (e: React.KeyboardEvent<HTMLInputElement>, field: 'skills' | 'interests') => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const value = (e.target as HTMLInputElement).value.trim();
      if (value) {
        setFormData((prev) => ({
          ...prev,
          [field]: [...prev[field], value]
        }));
        (e.target as HTMLInputElement).value = '';
      }
    }
  };
  
  const removeTag = (index: number, field: 'skills' | 'interests') => {
    setFormData((prev) => ({
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
    
    setFormData((prev) => ({ ...prev, resume: file }));
    setResumeFileName(file.name);
    
    if (formErrors.resume) {
      setFormErrors(prev => ({ ...prev, resume: undefined }));
    }
  };

  const handleAdditionalFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const validFiles: File[] = [];
    const validFileNames: string[] = [];
    
    Array.from(files).forEach(file => {
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: `${file.name}: Only PDF and DOCX files are allowed`,
          variant: "destructive"
        });
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name}: Maximum file size is 5MB`,
          variant: "destructive"
        });
        return;
      }
      
      validFiles.push(file);
      validFileNames.push(file.name);
    });
    
    if (validFiles.length > 0) {
      setFormData((prev) => ({ ...prev, additionalFiles: [...prev.additionalFiles, ...validFiles] }));
      setAdditionalFileNames((prev) => [...prev, ...validFileNames]);
    }
    
    e.target.value = '';
  };

  const parseResume = async () => {
    const file = formData.resume;
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
      
      setFormData(prev => ({
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
    const errors: {
      resume?: string;
    } = {};
    
    if (!formData.resume) {
      errors.resume = "Please upload your resume";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!eventId) {
      toast({
        title: "Error",
        description: "Event ID is missing",
        variant: "destructive"
      });
      return;
    }
    
    if (!userId) {
      toast({
        title: "Error",
        description: "You need to be logged in to submit the form",
        variant: "destructive"
      });
      return;
    }

    if (!validateForm()) {
      toast({
        title: "Missing information",
        description: "Please upload your resume to continue",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      console.log("Starting file uploads...");
      
      // Use default image
      const imageUrl = "https://placeholder.co/400";
      console.log("Using default profile image:", imageUrl);
      
      // Upload resume
      const resumeFile = formData.resume;
      const resumePath = `${userId}/${Date.now()}_${resumeFile.name}`;
      
      const { error: resumeError } = await supabase.storage
        .from('resumes')
        .upload(resumePath, resumeFile);
      
      if (resumeError) {
        console.error("Resume upload error:", resumeError);
        throw new Error(`Error uploading resume: ${resumeError.message}`);
      }
      
      const { data: { publicUrl: resumeUrl } } = supabase.storage
        .from('resumes')
        .getPublicUrl(resumePath);
      
      console.log("Resume uploaded successfully:", resumeUrl);
      
      // Upload additional files if any
      const additionalFilesUrls: string[] = [];
      
      for (const file of formData.additionalFiles) {
        const filePath = `${userId}/${Date.now()}_${file.name}`;
        
        const { error: fileError } = await supabase.storage
          .from('additional_files')
          .upload(filePath, file);
        
        if (fileError) {
          console.error("Additional file upload error:", fileError);
          throw new Error(`Error uploading additional file: ${fileError.message}`);
        }
        
        const { data: { publicUrl } } = supabase.storage
          .from('additional_files')
          .getPublicUrl(filePath);
        
        additionalFilesUrls.push(publicUrl);
      }
      
      console.log("Additional files uploaded successfully:", additionalFilesUrls);
      
      // Get user data for the profile
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      
      // Convert age to number if present
      const ageValue = formData.age ? parseInt(formData.age.toString()) : null;
      
      // Prepare profile data
      const profileData = {
        id: userId,
        event_id: eventId,
        name: userData.user?.user_metadata?.full_name || userData.user?.email?.split('@')[0] || 'Anonymous User',
        email: userData.user?.email || '',
        age: ageValue,
        gender: formData.gender || null,
        hobbies: formData.hobbies || null,
        image_url: imageUrl,
        resume_url: resumeUrl,
        additional_files: additionalFilesUrls,
        about_you: formData.aboutYou || null,
        looking_for: formData.lookingFor || null,
        skills: formData.skills.length > 0 ? formData.skills : null,
        interests: formData.interests.length > 0 ? formData.interests : null,
        linkedin_url: formData.linkedinUrl || null,
        created_at: new Date().toISOString()
      };
      
      console.log("Saving profile data to Supabase:", profileData);
      
      // Save profile data
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(profileData);
      
      if (profileError) {
        console.error("Profile save error:", profileError);
        throw new Error(`Error saving profile: ${profileError.message}`);
      }
      
      console.log("Profile saved successfully");
      
      // Generate embedding for matching
      const { error: embeddingError } = await supabase.functions
        .invoke('generate-embedding', {
          body: { 
            userId,
            eventId,
            profileData
          }
        });
      
      if (embeddingError) {
        console.error("Embedding generation error:", embeddingError);
        toast({
          title: "Warning",
          description: "Your profile was saved, but we couldn't generate embeddings. Some matching features may not work.",
          variant: "destructive"
        });
      } else {
        console.log("Embedding generated successfully");
      }
      
      // Add as participant
      const { error: participantError } = await supabase
        .from('participants')
        .upsert({
          user_id: userId,
          event_id: eventId
        });
      
      if (participantError) {
        console.error("Error adding participant:", participantError);
      }
      
      toast({
        title: "Success",
        description: "Your profile has been submitted successfully"
      });
      
      navigate(`/event-details/${eventId}`);
      
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "There was an error submitting your form",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <CardTitle>{event?.name ? `Register for ${event.name}` : 'Event Registration'}</CardTitle>
          <CardDescription>Please fill out the form below to complete your registration</CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit} noValidate>
          {Object.values(formErrors).some(error => !!error) && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                Please fix the errors below before submitting the form.
              </AlertDescription>
            </Alert>
          )}
          
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="age">Age</Label>
                  <Input 
                    id="age" 
                    name="age" 
                    type="number" 
                    min="18" 
                    max="120" 
                    value={formData.age} 
                    onChange={handleChange} 
                  />
                </div>
                
                <div>
                  <Label>Gender</Label>
                  <RadioGroup value={formData.gender} onValueChange={handleRadioChange} className="mt-2">
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
                
                <div>
                  <Label htmlFor="hobbies">Hobbies</Label>
                  <Input 
                    id="hobbies" 
                    name="hobbies" 
                    value={formData.hobbies} 
                    onChange={handleChange} 
                  />
                </div>
                
                <div>
                  <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
                  <Input 
                    id="linkedinUrl" 
                    name="linkedinUrl" 
                    value={formData.linkedinUrl} 
                    onChange={handleChange} 
                    placeholder="https://linkedin.com/in/username"
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label 
                      htmlFor="resume"
                      className={formErrors.resume ? "text-destructive" : ""}
                    >
                      Resume (PDF) <span className="text-destructive">*</span>
                    </Label>
                    {formData.resume && (
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
                      className={formErrors.resume ? "border-destructive" : ""}
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
                    accept=".pdf,application/pdf" 
                    className="hidden" 
                    onChange={handleResumeChange} 
                    aria-invalid={!!formErrors.resume}
                    aria-describedby={formErrors.resume ? "resume-error" : undefined}
                  />
                  {formErrors.resume && (
                    <p id="resume-error" className="text-sm text-destructive">{formErrors.resume}</p>
                  )}
                  <p className="text-xs text-muted-foreground italic mt-1">
                    Note: Only PDF files can be parsed automatically.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="additional-files">Additional Files (PDF/DOCX, max 5MB each)</Label>
                  <div className="flex items-center gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Files
                    </Button>
                  </div>
                  <input 
                    ref={fileInputRef}
                    id="additional-files" 
                    name="additional-files"
                    type="file" 
                    accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
                    className="hidden" 
                    multiple 
                    onChange={handleAdditionalFilesChange} 
                  />
                  {additionalFileNames.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-medium">Uploaded files:</p>
                      <ul className="text-sm list-disc list-inside">
                        {additionalFileNames.map((name, index) => (
                          <li key={index}>{name}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="skills-input">Skills (press Enter after each)</Label>
                <Input 
                  id="skills-input" 
                  placeholder="Add a skill and press Enter" 
                  onKeyDown={(e) => handleTagInputChange(e, 'skills')} 
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.skills.map((skill, index) => (
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
                  {formData.interests.map((interest, index) => (
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
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="aboutYou">About You</Label>
                <Textarea 
                  id="aboutYou" 
                  name="aboutYou" 
                  value={formData.aboutYou} 
                  onChange={handleChange} 
                  rows={4} 
                />
              </div>
              
              <div>
                <Label htmlFor="lookingFor">Who are you looking to connect with?</Label>
                <Textarea 
                  id="lookingFor" 
                  name="lookingFor" 
                  value={formData.lookingFor} 
                  onChange={handleChange} 
                  rows={4} 
                />
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-between">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate('/dashboard')}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default EventForm;
