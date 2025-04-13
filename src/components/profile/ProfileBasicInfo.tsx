
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface ProfileBasicInfoProps {
  age: string;
  gender: '' | 'male' | 'female';
  hobbies: string;
  linkedinUrl: string;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onGenderChange: (value: 'male' | 'female' | '') => void;
}

const ProfileBasicInfo: React.FC<ProfileBasicInfoProps> = ({
  age,
  gender,
  hobbies,
  linkedinUrl,
  onInputChange,
  onGenderChange
}) => {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="age">Age</Label>
        <Input 
          id="age" 
          name="age" 
          type="number" 
          min="18" 
          max="120" 
          value={age} 
          onChange={onInputChange} 
        />
      </div>
      
      <div>
        <Label>Gender</Label>
        <RadioGroup value={gender} onValueChange={onGenderChange} className="mt-2">
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
          value={hobbies} 
          onChange={onInputChange} 
        />
      </div>
      
      <div>
        <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
        <Input 
          id="linkedinUrl" 
          name="linkedinUrl" 
          value={linkedinUrl} 
          onChange={onInputChange} 
          placeholder="https://linkedin.com/in/username"
        />
      </div>
    </div>
  );
};

export default ProfileBasicInfo;
