
import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface ProfileAboutSectionProps {
  aboutYou: string;
  lookingFor: string;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

const ProfileAboutSection: React.FC<ProfileAboutSectionProps> = ({
  aboutYou,
  lookingFor,
  onInputChange
}) => {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="aboutYou">About You</Label>
        <Textarea 
          id="aboutYou" 
          name="aboutYou" 
          value={aboutYou} 
          onChange={onInputChange} 
          rows={4} 
        />
      </div>
      
      <div>
        <Label htmlFor="lookingFor">Who are you looking to connect with?</Label>
        <Textarea 
          id="lookingFor" 
          name="lookingFor" 
          value={lookingFor} 
          onChange={onInputChange} 
          rows={4} 
        />
      </div>
    </div>
  );
};

export default ProfileAboutSection;
