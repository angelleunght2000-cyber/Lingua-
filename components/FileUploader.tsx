
import React, { useRef } from 'react';
import { Upload, FileAudio } from 'lucide-react';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFileSelect, disabled }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <div 
      onClick={() => !disabled && inputRef.current?.click()}
      className={`border-2 border-dashed border-slate-700 rounded-xl p-8 flex flex-col items-center justify-center gap-4 transition-all hover:border-blue-500/50 hover:bg-slate-800/50 cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <input 
        type="file" 
        ref={inputRef} 
        onChange={handleChange} 
        accept="audio/*" 
        className="hidden" 
      />
      <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-blue-400">
        <Upload size={32} />
      </div>
      <div className="text-center">
        <p className="text-lg font-semibold text-slate-200">Upload Audio File</p>
        <p className="text-sm text-slate-400">MP3, WAV, M4A supported</p>
      </div>
    </div>
  );
};

export default FileUploader;
