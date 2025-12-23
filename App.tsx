
import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Trash2, ListChecks, FileText, Loader2, LayoutDashboard, PlusCircle, RefreshCcw } from 'lucide-react';
import LanguageSelector from './components/LanguageSelector';
import FileUploader from './components/FileUploader';
import AudioVisualizer from './components/AudioVisualizer';
import HistoryPanel from './components/HistoryPanel';
import LinkUploader from './components/LinkUploader';
import { gemini } from './services/geminiService';
import { Language, SummaryResult, AppStatus, HistoryItem, Group } from './types';
import { fileToBase64, createPcmBlob } from './utils/audioConverter';

const App: React.FC = () => {
  const [language, setLanguage] = useState<Language>(Language.ENGLISH);
  const [status, setStatus] = useState<AppStatus>('idle');
  const [result, setResult] = useState<SummaryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isTranslating, setIsTranslating] = useState(false);
  const [groups, setGroups] = useState<Group[]>([
    { id: 'default', name: 'General' },
    { id: 'work', name: 'Work' },
    { id: 'personal', name: 'Personal' }
  ]);
  
  const streamRef = useRef<MediaStream | null>(null);
  const liveSessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  useEffect(() => {
    const savedHistory = localStorage.getItem('lingua_history_v3');
    const savedGroups = localStorage.getItem('lingua_groups');
    if (savedHistory) setHistory(JSON.parse(savedHistory));
    if (savedGroups) setGroups(JSON.parse(savedGroups));
  }, []);

  useEffect(() => {
    localStorage.setItem('lingua_history_v3', JSON.stringify(history));
    localStorage.setItem('lingua_groups', JSON.stringify(groups));
  }, [history, groups]);

  // AUTO-TRANSLATION EFFECT
  useEffect(() => {
    if (result && result.summary.length > 0) {
      handleTranslate();
    }
  }, [language]);

  const handleTranslate = async () => {
    if (!result) return;
    setIsTranslating(true);
    try {
      const translated = await gemini.translateSummary(result.summary, language);
      setResult(prev => prev ? { ...prev, summary: translated } : null);
    } catch (e) {
      console.error("Translation failed", e);
    } finally {
      setIsTranslating(false);
    }
  };

  const autoSave = (res: SummaryResult) => {
    const newItem: HistoryItem = {
      ...res,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      language,
      customName: '',
      groupId: 'default'
    };
    setHistory(prev => [newItem, ...prev]);
  };

  const handleFileSelect = async (file: File) => {
    try {
      setStatus('processing');
      setError(null);
      setLiveTranscript('');
      const base64 = await fileToBase64(file);
      const finalResult = await gemini.summarizeAudioFile(base64, file.type, language);
      setResult(finalResult);
      autoSave(finalResult);
      setStatus('completed');
    } catch (err: any) {
      setError("Processing failed: " + err.message);
      setStatus('error');
    }
  };

  const handleUrlSubmit = async (url: string) => {
    try {
      setStatus('processing');
      setError(null);
      setLiveTranscript('');
      const finalResult = await gemini.summarizeLink(url, language);
      setResult(finalResult);
      autoSave(finalResult);
      setStatus('completed');
    } catch (err: any) {
      setError("Analysis failed: " + err.message);
      setStatus('error');
    }
  };

  const startRecording = async () => {
    try {
      setStatus('recording');
      setError(null);
      setLiveTranscript('');
      setResult(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;
      const sessionPromise = gemini.connectLive(
        language,
        (t) => setLiveTranscript(t),
        (res) => {
          setResult(res);
          autoSave(res);
          setStatus('completed');
        },
        (err) => { setError(err.message); setStatus('error'); }
      );
      liveSessionRef.current = sessionPromise;
      const source = audioCtx.createMediaStreamSource(stream);
      const scriptProcessor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = scriptProcessor;
      scriptProcessor.onaudioprocess = (e) => {
        const pcm = createPcmBlob(e.inputBuffer.getChannelData(0));
        sessionPromise.then((s: any) => s.sendRealtimeInput({ media: pcm }));
      };
      source.connect(scriptProcessor);
      scriptProcessor.connect(audioCtx.destination);
    } catch (err: any) {
      setError("Microphone error: " + err.message);
      setStatus('idle');
    }
  };

  const stopRecording = () => {
    setStatus('processing');
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (processorRef.current) processorRef.current.disconnect();
    if (audioContextRef.current) audioContextRef.current.close();
    if (liveSessionRef.current) liveSessionRef.current.then((s: any) => s.close());
  };

  const startNew = () => {
    setStatus('idle');
    setResult(null);
    setLiveTranscript('');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col p-4 md:p-8">
      <header className="w-full max-w-6xl mx-auto flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
            <LayoutDashboard className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">LinguaSummarize AI</h1>
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Multi-Upload Workspace</p>
          </div>
        </div>
        {(result || error) && (
          <button onClick={startNew} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition-all">
            <PlusCircle size={14} /> NEW UPLOAD
          </button>
        )}
      </header>

      <main className="w-full max-w-6xl mx-auto space-y-12">
        {/* Input Controls - Always visible or toggleable */}
        <section className={`bg-slate-900/50 border border-slate-800 rounded-3xl p-8 shadow-xl relative backdrop-blur-md transition-all duration-500 ${result ? 'opacity-40 hover:opacity-100 scale-95 hover:scale-100' : ''}`}>
          <div className="flex items-center justify-between mb-6">
            <LanguageSelector selected={language} onSelect={setLanguage} disabled={status === 'recording' || isTranslating} />
            {isTranslating && <span className="text-[10px] font-bold text-blue-400 animate-pulse flex items-center gap-2"><RefreshCcw size={12} className="animate-spin" /> TRANSLATING...</span>}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FileUploader onFileSelect={handleFileSelect} disabled={status === 'processing' || status === 'recording'} />
            <LinkUploader onUrlSubmit={handleUrlSubmit} disabled={status === 'processing' || status === 'recording'} />
            <div className="flex flex-col gap-4 p-6 bg-slate-800/30 rounded-xl border border-slate-700/50">
              <AudioVisualizer stream={streamRef.current} isActive={status === 'recording'} />
              <button 
                onClick={status === 'recording' ? stopRecording : startRecording}
                disabled={status === 'processing'}
                className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all ${status === 'recording' ? 'bg-red-600' : 'bg-slate-700 hover:bg-indigo-600'}`}
              >
                {status === 'recording' ? <><Square size={20} fill="currentColor"/> Stop</> : <><Mic size={20}/> Record Live</>}
              </button>
            </div>
          </div>
        </section>

        {/* Results */}
        {(liveTranscript || result || status === 'processing') && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-8">
            <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-2xl p-6 h-[400px] flex flex-col shadow-2xl overflow-hidden">
              <h3 className="text-sm font-bold text-slate-500 mb-4 flex items-center gap-2"><FileText size={16}/> TRANSCRIPT</h3>
              <div className="overflow-y-auto prose prose-invert prose-sm max-w-none flex-grow custom-scrollbar">
                <p className="text-slate-300 leading-relaxed">{liveTranscript || result?.transcript || "Analyzing content..."}</p>
              </div>
            </div>
            <div className="bg-gradient-to-br from-indigo-900/30 to-slate-900/50 border border-indigo-500/30 rounded-2xl p-6 h-[400px] flex flex-col shadow-2xl relative">
              <h3 className="text-sm font-bold text-indigo-400 mb-4 flex items-center gap-2"><ListChecks size={16}/> SUMMARY ({language})</h3>
              <div className="overflow-y-auto flex-grow space-y-4 custom-scrollbar">
                {isTranslating ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-50"><Loader2 className="animate-spin mb-2" /> Translating...</div>
                ) : result?.summary ? (
                  result.summary.map((pt, i) => (
                    <div key={i} className="flex gap-3 text-sm text-slate-200">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 flex-shrink-0" />
                      <span>{pt}</span>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-600 italic">Processing summary...</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* History / Workspace */}
        <section className="pt-12 border-t border-slate-900">
          <HistoryPanel 
            items={history}
            groups={groups}
            onDelete={id => setHistory(h => h.filter(i => i.id !== id))}
            onSelect={item => { setResult(item); window.scrollTo({ top: 400, behavior: 'smooth' }); }}
            onRename={(id, name) => setHistory(h => h.map(i => i.id === id ? {...i, customName: name} : i))}
            onMove={(id, gId) => setHistory(h => h.map(i => i.id === id ? {...i, groupId: gId} : i))}
            onAddGroup={name => setGroups(g => [...g, {id: crypto.randomUUID(), name}])}
            onAnalyzeGroup={async (gId) => gemini.analyzeGroup(history.filter(i => i.groupId === gId), language)}
          />
        </section>
      </main>
    </div>
  );
};

export default App;
