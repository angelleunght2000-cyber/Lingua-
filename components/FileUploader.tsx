
import React, { useRef, useState } from 'react';
import { Upload, FileAudio, AlertCircle } from 'lucide-react';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFileSelect, disabled }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>('');
  
  const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB in bytes

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        setError(`File too large! Maximum size: 20MB`);
        setTimeout(() => setError(''), 5000);
        return;
      }
      setError('');
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
        <div className="mt-3 px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <p className="text-[10px] text-blue-300 font-medium">
            📁 Max: <span className="font-bold">20MB</span> | ⏱️ Duration: Up to <span className="font-bold">9.5 hours</span>
          </p>
        </div>
        {error && (
          <div className="mt-2 px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 justify-center">
            <AlertCircle size={12} className="text-red-400" />
            <p className="text-[10px] text-red-400 font-medium">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUploader;
