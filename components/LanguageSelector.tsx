
import React from 'react';
import { Language } from '../types';
import { Globe } from 'lucide-react';

interface LanguageSelectorProps {
  selected: Language;
  onSelect: (lang: Language) => void;
  disabled?: boolean;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ selected, onSelect, disabled }) => {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-slate-400 flex items-center gap-2">
        <Globe size={16} /> Target Language
      </label>
      <div className="flex flex-wrap gap-2">
        {Object.values(Language).map((lang) => (
          <button
            key={lang}
            disabled={disabled}
            onClick={() => onSelect(lang)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              selected === lang
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {lang}
          </button>
        ))}
      </div>
    </div>
  );
};

export default LanguageSelector;
