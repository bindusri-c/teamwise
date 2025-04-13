
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface TagInputProps {
  label: string;
  id: string;
  placeholder: string;
  tags: string[];
  onAddTag: (tag: string) => void;
  onRemoveTag: (index: number) => void;
}

const TagInput: React.FC<TagInputProps> = ({
  label,
  id,
  placeholder,
  tags,
  onAddTag,
  onRemoveTag
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const value = (e.target as HTMLInputElement).value.trim();
      if (value) {
        onAddTag(value);
        (e.target as HTMLInputElement).value = '';
      }
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input 
        id={id} 
        placeholder={placeholder} 
        onKeyDown={handleKeyDown} 
      />
      <div className="flex flex-wrap gap-2 mt-2">
        {tags.map((tag, index) => (
          <div key={index} className="bg-secondary px-3 py-1 rounded-full flex items-center text-sm">
            {tag}
            <button 
              type="button" 
              className="ml-2 text-secondary-foreground/70 hover:text-secondary-foreground"
              onClick={() => onRemoveTag(index)}
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TagInput;
