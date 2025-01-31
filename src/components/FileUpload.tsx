import React, { useRef, ChangeEvent } from 'react';
import { Upload } from 'lucide-react';
import './FileUpload.css';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = (): void => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <div className="upload-container">
      <input
        type="file"
        className="file-input"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf"
      />
      <button disabled onClick={handleClick} className="upload-button" style={{opacity:'.5'}}>
        <Upload size={20} />
        Upload File
      </button>
    </div>
  );
};
