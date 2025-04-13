
export interface EventFormData {
  name: string;
  email: string;
  age: number | '';
  gender: 'male' | 'female' | '';
  hobbies: string;
  resume: File | null;
  additionalFiles: File[];
  aboutYou: string;
  lookingFor: string;
  image: File | null;
  skills: string[];
  interests: string[];
}
