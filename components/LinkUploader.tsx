
import React, { useState } from 'react';
import { Link as LinkIcon, Globe, ArrowRight, Loader2 } from 'lucide-react';

interface LinkUploaderProps {
  onUrlSubmit: (url: string) => void;
  disabled?: boolean;
}

const LinkUploader: React.FC<LinkUploaderProps> = ({ onUrlSubmit, disabled }) => {
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onUrlSubmit(url.trim());
      setUrl('');
    }
  };

  return (
    <div className="flex flex-col gap-4 p-6 bg-slate-800/30 rounded-xl border border-slate-700/50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <LinkIcon size={16} /> Link Upload
        </span>
      </div>
      
      <form onSubmit={handleSubmit} className="relative group">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors">
          <Globe size={18} />
        </div>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste audio/video link here..."
          disabled={disabled}
          className="block w-full pl-10 pr-12 py-3 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all disabled:opacity-50"
          required
        />
        <button
          type="submit"
          disabled={disabled || !url.trim()}
          className="absolute right-2 top-1.5 bottom-1.5 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center justify-center transition-all disabled:bg-slate-800 disabled:text-slate-600 shadow-lg shadow-blue-900/20"
        >
          <ArrowRight size={18} />
        </button>
      </form>
      
      <p className="text-[10px] text-slate-500 leading-relaxed italic">
        Supports direct media links (MP3, MP4) and public video pages. AI will browse the link to extract content.
      </p>
    </div>
  );
};

export default LinkUploader;
