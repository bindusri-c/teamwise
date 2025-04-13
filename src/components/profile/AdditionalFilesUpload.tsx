
import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Upload } from 'lucide-react';

interface AdditionalFilesUploadProps {
  fileNames: string[];
  onFilesChange: (files: File[]) => void;
}

const AdditionalFilesUpload: React.FC<AdditionalFilesUploadProps> = ({
  fileNames,
  onFilesChange
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAdditionalFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const validFiles: File[] = [];
    
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
    });
    
    if (validFiles.length > 0) {
      onFilesChange(validFiles);
    }
    
    e.target.value = '';
  };

  return (
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
      {fileNames.length > 0 && (
        <div className="mt-2">
          <p className="text-sm font-medium">Uploaded files:</p>
          <ul className="text-sm list-disc list-inside">
            {fileNames.map((name, index) => (
              <li key={index}>{name}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AdditionalFilesUpload;
