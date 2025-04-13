
export interface EventFormData {
  name: string;
  email: string;
  age: string | number;
  gender: '' | 'male' | 'female';
  hobbies: string;
  resume: File | null;
  additionalFiles: File[];
  aboutYou: string;
  image: File | null;
  skills: string[];
  interests: string[];
  linkedinUrl: string;
}
