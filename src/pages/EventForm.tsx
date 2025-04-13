
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { useProfileForm } from '@/hooks/useProfileForm';
import ResumeUpload from '@/components/profile/ResumeUpload';
import AdditionalFilesUpload from '@/components/profile/AdditionalFilesUpload';
import ProfileBasicInfo from '@/components/profile/ProfileBasicInfo';
import ProfileAboutSection from '@/components/profile/ProfileAboutSection';
import TagInput from '@/components/profile/TagInput';
import { 
  extractLinkedInUrl, 
  extractSkills, 
  extractInterests, 
  extractParagraph 
} from '@/utils/resumeParser';

const EventForm = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
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
    validateForm
  } = useProfileForm(eventId);

  // Handle resume file upload
  const handleResumeChange = (file: File) => {
    setFormData((prev) => ({ ...prev, resume: file }));
    setResumeFileName(file.name);
    
    if (formErrors.resume) {
      setFormErrors(prev => ({ ...prev, resume: undefined }));
    }
  };

  // Handle parsing resume content
  const handleParseResume = (text: string) => {
    const extractedData = {
      skills: extractSkills(text),
      interests: extractInterests(text),
      linkedinUrl: extractLinkedInUrl(text) || '',
      aboutYou: extractParagraph(text, 100)
    };
    
    setFormData(prev => ({
      ...prev,
      linkedinUrl: extractedData.linkedinUrl || prev.linkedinUrl,
      skills: [...new Set([...prev.skills, ...extractedData.skills])],
      interests: [...new Set([...prev.interests, ...extractedData.interests])],
      aboutYou: extractedData.aboutYou || prev.aboutYou
    }));
  };

  // Handle additional files upload
  const handleAdditionalFilesChange = (files: File[]) => {
    setFormData((prev) => ({ 
      ...prev, 
      additionalFiles: [...prev.additionalFiles, ...files] 
    }));
    setAdditionalFileNames((prev) => [...prev, ...files.map(f => f.name)]);
  };

  // Handle tag management
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
            This form is currently read-only. Please update your profile information in the Profile Dashboard.
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={(e) => e.preventDefault()} noValidate>
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
                  onParseResume={handleParseResume}
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
              lookingFor={formData.lookingFor}
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
              disabled={true}
              className="cursor-not-allowed opacity-50"
            >
              Form Disabled
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default EventForm;
