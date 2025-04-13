
import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Upload } from 'lucide-react';

interface ResumeUploadProps {
  resumeFileName: string;
  hasError: boolean;
  errorMessage?: string;
  onResumeChange: (file: File) => void;
  onParseResume?: (text: string) => void;
}

const ResumeUpload: React.FC<ResumeUploadProps> = ({
  resumeFileName,
  hasError,
  errorMessage,
  onResumeChange,
  onParseResume
}) => {
  const { toast } = useToast();
  const resumeInputRef = useRef<HTMLInputElement>(null);

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
    
    onResumeChange(file);
  };

  return (
    <div className="space-y-2">
      <Label 
        htmlFor="resume"
        className={hasError ? "text-destructive" : ""}
      >
        Resume (PDF) <span className="text-destructive">*</span>
      </Label>
      <div className="flex items-center gap-2">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => resumeInputRef.current?.click()}
          className={hasError ? "border-destructive" : ""}
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
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
        className="hidden" 
        onChange={handleResumeChange} 
        aria-invalid={hasError}
        aria-describedby={hasError ? "resume-error" : undefined}
      />
      {hasError && errorMessage && (
        <p id="resume-error" className="text-sm text-destructive">{errorMessage}</p>
      )}
    </div>
  );
};

export default ResumeUpload;
