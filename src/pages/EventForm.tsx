
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { LoaderCircle, Upload, User, Mail, Calendar, Users, Gift, FileText, Files, Info, Search, Image } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';
import DashboardHeader from '@/components/DashboardHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { EventFormData } from '@/types/eventForm';

const EventForm = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [event, setEvent] = useState<Tables<'events'> | null>(null);
  const [formData, setFormData] = useState<EventFormData>({
    name: '',
    email: user?.email || '',
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
  const [resumePreview, setResumePreview] = useState<string>('');
  const [imagePreview, setImagePreview] = useState<string>('');
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<{ [key: string]: boolean }>({
    'Programming': false,
    'Marketing': false,
    'Design': false,
    'Sales': false,
    'Finance': false,
    'Operations': false,
    'HR': false,
    'Other': false,
  });
  const [selectedInterests, setSelectedInterests] = useState<{ [key: string]: boolean }>({
    'AI': false,
    'Blockchain': false,
    'Mobile': false,
    'Web': false,
    'Data Science': false,
    'UX/UI': false,
    'Business': false,
    'Other': false,
  });

  useEffect(() => {
    if (!eventId) {
      navigate('/dashboard');
      return;
    }

    const fetchEvent = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('id', eventId)
          .single();

        if (error) throw error;
        setEvent(data);
      } catch (error: any) {
        console.error('Error fetching event:', error);
        toast({
          title: "Error",
          description: "Could not find event details. Please try again.",
          variant: "destructive",
        });
        navigate('/dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvent();
  }, [eventId, navigate, toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGenderChange = (value: string) => {
    setFormData(prev => ({ ...prev, gender: value as 'male' | 'female' }));
  };

  const handleSkillChange = (skill: string, checked: boolean) => {
    setSelectedSkills(prev => ({ ...prev, [skill]: checked }));
    
    setFormData(prev => {
      const newSkills = checked 
        ? [...prev.skills, skill] 
        : prev.skills.filter(s => s !== skill);
      return { ...prev, skills: newSkills };
    });
  };

  const handleInterestChange = (interest: string, checked: boolean) => {
    setSelectedInterests(prev => ({ ...prev, [interest]: checked }));
    
    setFormData(prev => {
      const newInterests = checked 
        ? [...prev.interests, interest] 
        : prev.interests.filter(i => i !== interest);
      return { ...prev, interests: newInterests };
    });
  };

  const handleResumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Check if file type is allowed (PDF or DOCX)
      const fileType = file.type;
      if (fileType !== 'application/pdf' && 
          fileType !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF or DOCX file for your resume",
          variant: "destructive",
        });
        return;
      }
      
      setFormData(prev => ({ ...prev, resume: file }));
      setResumePreview(file.name);

      // Here we could add logic to extract data from resume for autofill
      toast({
        title: "Resume uploaded",
        description: "Your resume has been uploaded successfully.",
      });
    }
  };

  const handleAdditionalFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      
      // Check each file
      const validFiles = filesArray.filter(file => {
        // File type check
        const fileType = file.type;
        const validType = fileType === 'application/pdf' || 
                         fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        
        // File size check (5MB = 5 * 1024 * 1024 bytes)
        const validSize = file.size <= 5 * 1024 * 1024;
        
        if (!validType) {
          toast({
            title: "Invalid file type",
            description: `${file.name} is not a PDF or DOCX file`,
            variant: "destructive",
          });
        }
        
        if (!validSize) {
          toast({
            title: "File too large",
            description: `${file.name} exceeds the 5MB limit`,
            variant: "destructive",
          });
        }
        
        return validType && validSize;
      });
      
      // Update state with valid files
      setFormData(prev => ({ 
        ...prev, 
        additionalFiles: [...prev.additionalFiles, ...validFiles]
      }));
      
      // Update file names for display
      setFileNames(prev => [
        ...prev,
        ...validFiles.map(file => file.name)
      ]);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Check if file is an image
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please upload an image file",
          variant: "destructive",
        });
        return;
      }
      
      setFormData(prev => ({ ...prev, image: file }));
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImagePreview(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFormData(prev => {
      const newFiles = [...prev.additionalFiles];
      newFiles.splice(index, 1);
      return { ...prev, additionalFiles: newFiles };
    });
    
    setFileNames(prev => {
      const newNames = [...prev];
      newNames.splice(index, 1);
      return newNames;
    });
  };

  const handleAutoFill = () => {
    // This would normally parse the resume and extract data
    // For this demo, we'll just show a toast notification
    toast({
      title: "Autofill feature",
      description: "In a production app, this would parse your resume to extract your information.",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // We'll implement the submit logic later as mentioned by the user
    console.log('Form submitted:', formData);
    toast({
      title: "Form Submitted",
      description: "Your information has been saved (demo only).",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <DashboardHeader />
        <div className="flex-1 flex items-center justify-center">
          <LoaderCircle className="h-12 w-12 animate-spin text-rag-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <DashboardHeader />
      
      <main className="flex-1 container py-8 px-4 md:px-6">
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Join {event?.name}</CardTitle>
              <CardDescription>
                Please fill out your details to complete your registration for this event
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Name Field */}
                    <div className="space-y-2">
                      <Label htmlFor="name" className="flex items-center gap-2">
                        <User className="h-4 w-4" /> Name
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="Your full name"
                        required
                      />
                    </div>
                    
                    {/* Email Field */}
                    <div className="space-y-2">
                      <Label htmlFor="email" className="flex items-center gap-2">
                        <Mail className="h-4 w-4" /> Email
                      </Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="Your email address"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Age Field */}
                    <div className="space-y-2">
                      <Label htmlFor="age" className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" /> Age
                      </Label>
                      <Input
                        id="age"
                        name="age"
                        type="number"
                        value={formData.age}
                        onChange={handleInputChange}
                        placeholder="Your age"
                        min={18}
                        max={120}
                      />
                    </div>
                    
                    {/* Gender Field */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Users className="h-4 w-4" /> Gender
                      </Label>
                      <RadioGroup 
                        value={formData.gender} 
                        onValueChange={handleGenderChange}
                        className="flex space-x-4"
                      >
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
                  
                  {/* Hobbies Field */}
                  <div className="space-y-2">
                    <Label htmlFor="hobbies" className="flex items-center gap-2">
                      <Gift className="h-4 w-4" /> Hobbies
                    </Label>
                    <Input
                      id="hobbies"
                      name="hobbies"
                      value={formData.hobbies}
                      onChange={handleInputChange}
                      placeholder="Your hobbies (e.g., reading, hiking, cooking)"
                    />
                  </div>
                  
                  {/* Resume Upload */}
                  <div className="space-y-2">
                    <Label htmlFor="resume" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" /> Resume (PDF or DOCX)
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="resume"
                        name="resume"
                        type="file"
                        onChange={handleResumeChange}
                        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        className="hidden"
                      />
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => document.getElementById('resume')?.click()}
                        className="flex-1"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Resume
                      </Button>
                      <Button 
                        type="button" 
                        variant="secondary"
                        onClick={handleAutoFill}
                        disabled={!formData.resume}
                      >
                        Autofill from Resume
                      </Button>
                    </div>
                    {resumePreview && (
                      <p className="text-sm text-muted-foreground">
                        Uploaded: {resumePreview}
                      </p>
                    )}
                  </div>
                  
                  {/* Additional Files */}
                  <div className="space-y-2">
                    <Label htmlFor="additionalFiles" className="flex items-center gap-2">
                      <Files className="h-4 w-4" /> Additional Files (PDF or DOCX, max 5MB each)
                    </Label>
                    <Input
                      id="additionalFiles"
                      name="additionalFiles"
                      type="file"
                      onChange={handleAdditionalFilesChange}
                      accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      multiple
                      className="hidden"
                    />
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => document.getElementById('additionalFiles')?.click()}
                      className="w-full"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Additional Files
                    </Button>
                    {fileNames.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {fileNames.map((name, index) => (
                          <li key={index} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
                            <span className="truncate max-w-[90%]">{name}</span>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleRemoveFile(index)}
                              className="h-6 w-6 p-0"
                            >
                              ×
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  
                  {/* About You */}
                  <div className="space-y-2">
                    <Label htmlFor="aboutYou" className="flex items-center gap-2">
                      <Info className="h-4 w-4" /> About You
                    </Label>
                    <Textarea
                      id="aboutYou"
                      name="aboutYou"
                      value={formData.aboutYou}
                      onChange={handleInputChange}
                      placeholder="Share a little about yourself, your background, and experiences"
                      rows={4}
                    />
                  </div>
                  
                  {/* Looking For */}
                  <div className="space-y-2">
                    <Label htmlFor="lookingFor" className="flex items-center gap-2">
                      <Search className="h-4 w-4" /> Who You're Looking to Meet
                    </Label>
                    <Textarea
                      id="lookingFor"
                      name="lookingFor"
                      value={formData.lookingFor}
                      onChange={handleInputChange}
                      placeholder="Describe the type of people you'd like to connect with at this event"
                      rows={3}
                    />
                  </div>
                  
                  {/* Profile Image */}
                  <div className="space-y-2">
                    <Label htmlFor="image" className="flex items-center gap-2">
                      <Image className="h-4 w-4" /> Profile Image
                    </Label>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <Input
                          id="image"
                          name="image"
                          type="file"
                          onChange={handleImageChange}
                          accept="image/*"
                          className="hidden"
                        />
                        <Button 
                          type="button" 
                          variant="outline"
                          onClick={() => document.getElementById('image')?.click()}
                          className="w-full"
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          Upload Image
                        </Button>
                      </div>
                      {imagePreview && (
                        <div className="w-16 h-16 rounded-full overflow-hidden border">
                          <img 
                            src={imagePreview} 
                            alt="Profile Preview" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Skills & Interests */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Skills */}
                    <div className="space-y-3">
                      <Label className="text-base">Skills</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.keys(selectedSkills).map((skill) => (
                          <div key={skill} className="flex items-center space-x-2">
                            <Checkbox 
                              id={`skill-${skill}`} 
                              checked={selectedSkills[skill]}
                              onCheckedChange={(checked) => 
                                handleSkillChange(skill, checked as boolean)
                              }
                            />
                            <Label 
                              htmlFor={`skill-${skill}`}
                              className="text-sm font-normal"
                            >
                              {skill}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Interests */}
                    <div className="space-y-3">
                      <Label className="text-base">Interests</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.keys(selectedInterests).map((interest) => (
                          <div key={interest} className="flex items-center space-x-2">
                            <Checkbox 
                              id={`interest-${interest}`} 
                              checked={selectedInterests[interest]}
                              onCheckedChange={(checked) => 
                                handleInterestChange(interest, checked as boolean)
                              }
                            />
                            <Label 
                              htmlFor={`interest-${interest}`}
                              className="text-sm font-normal"
                            >
                              {interest}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                
                <Button type="submit" className="w-full">
                  Submit Registration
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default EventForm;
