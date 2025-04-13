
import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Upload, Loader2 } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

interface ResumeUploadProps {
  resumeFileName: string;
  hasError: boolean;
  errorMessage?: string;
  onResumeChange: (file: File) => void;
  onParseResume: (text: string) => void;
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
  const [isParsing, setIsParsing] = useState(false);

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

  const parseResume = async () => {
    const file = resumeInputRef.current?.files?.[0];
    if (!file) {
      toast({
        title: "No resume uploaded",
        description: "Please upload a resume first",
        variant: "destructive"
      });
      return;
    }
    
    if (file.type !== 'application/pdf') {
      toast({
        title: "PDF files only",
        description: "Only PDF files can be parsed automatically",
        variant: "destructive"
      });
      return;
    }
    
    setIsParsing(true);
    
    try {
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
      
      onParseResume(fullText);
      
      toast({
        title: "Resume parsed",
        description: "Resume data has been extracted and filled in the form"
      });
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

  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <Label 
          htmlFor="resume"
          className={hasError ? "text-destructive" : ""}
        >
          Resume (PDF) <span className="text-destructive">*</span>
        </Label>
        {resumeFileName && (
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
        accept=".pdf,application/pdf" 
        className="hidden" 
        onChange={handleResumeChange} 
        aria-invalid={hasError}
        aria-describedby={hasError ? "resume-error" : undefined}
      />
      {hasError && errorMessage && (
        <p id="resume-error" className="text-sm text-destructive">{errorMessage}</p>
      )}
      <p className="text-xs text-muted-foreground italic mt-1">
        Note: Only PDF files can be parsed automatically.
      </p>
    </div>
  );
};

export default ResumeUpload;
