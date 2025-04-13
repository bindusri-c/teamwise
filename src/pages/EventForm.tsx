import React, { useState, useRef } from 'react';
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
import { Loader2, Upload } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { useCurrentUser } from '@/hooks/useCurrentUser';

const EventForm = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userId } = useCurrentUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
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
    interests: []
  });
  
  const [resumeFileName, setResumeFileName] = useState<string>('');
  const [imageFileName, setImageFileName] = useState<string>('');
  const [additionalFileNames, setAdditionalFileNames] = useState<string[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Only JPEG, PNG and GIF files are allowed for images",
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
    
    setFormData((prev) => ({ ...prev, image: file }));
    setImageFileName(file.name);
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
    
    setIsParsing(true);
    
    try {
      if (file.type === 'application/pdf') {
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
          name: extractField(fullText, /name:?\s*([A-Za-z\s]+)/i) || '',
          email: extractEmail(fullText) || '',
          skills: extractSkills(fullText),
          interests: extractInterests(fullText),
          aboutYou: extractParagraph(fullText, 100)
        };
        
        setFormData(prev => ({
          ...prev,
          name: extractedData.name || prev.name,
          email: extractedData.email || prev.email,
          skills: [...new Set([...prev.skills, ...extractedData.skills])],
          interests: [...new Set([...prev.interests, ...extractedData.interests])],
          aboutYou: extractedData.aboutYou || prev.aboutYou
        }));
        
        toast({
          title: "Resume parsed",
          description: "Resume data has been extracted and filled in the form"
        });
      } else {
        toast({
          title: "DOCX parsing not implemented",
          description: "DOCX parsing is not implemented in this demo"
        });
      }
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
  
  const extractField = (text: string, regex: RegExp): string | null => {
    const match = text.match(regex);
    return match ? match[1].trim() : null;
  };
  
  const extractEmail = (text: string): string | null => {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const match = text.match(emailRegex);
    return match ? match[0] : null;
  };
  
  const extractSkills = (text: string): string[] => {
    const skillKeywords = ['javascript', 'python', 'react', 'node', 'html', 'css', 'sql', 'java', 'c++', 'leadership', 'management'];
    return skillKeywords.filter(skill => 
      new RegExp(`\\b${skill}\\b`, 'i').test(text)
    );
  };
  
  const extractInterests = (text: string): string[] => {
    const interestKeywords = ['travel', 'music', 'sports', 'reading', 'photography', 'cooking', 'gaming', 'hiking'];
    return interestKeywords.filter(interest => 
      new RegExp(`\\b${interest}\\b`, 'i').test(text)
    );
  };
  
  const extractParagraph = (text: string, maxWords: number): string => {
    const words = text.split(/\s+/).slice(0, maxWords);
    return words.join(' ');
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
    
    setIsSubmitting(true);
    
    try {
      const { data: imageData, error: imageError } = await supabase.storage
        .from('profiles')
        .upload(`${userId}/${Date.now()}_${formData.image.name}`, formData.image);
      
      if (imageError) throw imageError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('profiles')
        .getPublicUrl(imageData.path);
          
      const imageUrl = publicUrl;
      
      const { data: resumeData, error: resumeError } = await supabase.storage
        .from('resumes')
        .upload(`${userId}/${Date.now()}_${formData.resume.name}`, formData.resume);
      
      if (resumeError) throw resumeError;
      
      const { data: { publicUrl: resumeUrl } } = supabase.storage
        .from('resumes')
        .getPublicUrl(resumeData.path);
          
      const additionalFilesUrls: string[] = [];
      for (const file of formData.additionalFiles) {
        const { data: fileData, error: fileError } = await supabase.storage
          .from('additional_files')
          .upload(`${userId}/${Date.now()}_${file.name}`, file);
        
        if (fileError) throw fileError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('additional_files')
          .getPublicUrl(fileData.path);
          
        additionalFilesUrls.push(publicUrl);
      }
      
      const submissionData = {
        ...formData,
        imageUrl,
        resumeUrl,
        additionalFiles: additionalFilesUrls,
        linkedinUrl: ''
      };
      
      const { data: responseData, error: responseError } = await supabase.functions
        .invoke('generate-embedding', {
          body: { 
            formData: submissionData,
            eventId
          }
        });
      
      if (responseError) throw responseError;
      
      toast({
        title: "Success",
        description: "Your profile has been submitted successfully"
      });
      
      navigate('/dashboard');
      
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
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Event Registration</CardTitle>
          <CardDescription>Please fill out the form below to complete your registration</CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input 
                    id="name" 
                    name="name" 
                    value={formData.name} 
                    onChange={handleChange} 
                    required 
                  />
                </div>
                
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    name="email" 
                    type="email" 
                    value={formData.email} 
                    onChange={handleChange} 
                    required 
                  />
                </div>
                
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
                    required 
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
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="profile-picture">Profile Picture</Label>
                  <div className="flex items-center gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => imageInputRef.current?.click()}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Image
                    </Button>
                    {imageFileName && <span className="text-sm">{imageFileName}</span>}
                  </div>
                  <input 
                    ref={imageInputRef}
                    id="profile-picture" 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleImageChange} 
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="resume">Resume (PDF/DOCX)</Label>
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
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Resume
                    </Button>
                    {resumeFileName && <span className="text-sm">{resumeFileName}</span>}
                  </div>
                  <input 
                    ref={resumeInputRef}
                    id="resume" 
                    type="file" 
                    accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
                    className="hidden" 
                    onChange={handleResumeChange} 
                  />
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
