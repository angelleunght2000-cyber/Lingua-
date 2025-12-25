
import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Trash2, ListChecks, FileText, Loader2, LayoutDashboard, PlusCircle, RefreshCcw, AlertCircle } from 'lucide-react';
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

  // Handle translation when language changes after a result is present
  useEffect(() => {
    if (result && status === 'completed') {
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
      setResult(null);
      
      const base64 = await fileToBase64(file);
      const finalResult = await gemini.summarizeAudioFile(base64, file.type, language);
      
      setResult(finalResult);
      autoSave(finalResult);
      setStatus('completed');
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during processing.");
      setStatus('error');
    }
  };

  const handleUrlSubmit = async (url: string) => {
    try {
      setStatus('processing');
      setError(null);
      setLiveTranscript('');
      setResult(null);
      
      const finalResult = await gemini.summarizeLink(url, language);
      setResult(finalResult);
      autoSave(finalResult);
      setStatus('completed');
    } catch (err: any) {
      setError(err.message || "Link analysis failed.");
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
        (err) => { 
          setError(err.message); 
          setStatus('error');
          stopRecording(); 
        }
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
      setError("Microphone access denied or error: " + err.message);
      setStatus('idle');
    }
  };

  const stopRecording = () => {
    if (status !== 'recording') return;
    setStatus('processing');
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (liveSessionRef.current) {
      liveSessionRef.current.then((s: any) => s.close());
      liveSessionRef.current = null;
    }
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
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-900/40">
            <LayoutDashboard className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">LinguaSummarize AI</h1>
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Global Transcription Engine</p>
          </div>
        </div>
        {(result || error || status === 'completed') && (
          <button onClick={startNew} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-900/20 text-white">
            <PlusCircle size={14} /> START NEW
          </button>
        )}
      </header>

      <main className="w-full max-w-6xl mx-auto space-y-10">
        {/* Workspace Controls */}
        <section className={`bg-slate-900/40 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl relative backdrop-blur-md transition-all duration-500 ${result ? 'opacity-30 hover:opacity-100 scale-[0.98] hover:scale-100' : ''}`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <LanguageSelector selected={language} onSelect={setLanguage} disabled={status === 'recording' || status === 'processing'} />
            <div className="flex items-center gap-4">
              {isTranslating && (
                <span className="text-xs font-bold text-indigo-400 animate-pulse flex items-center gap-2 bg-indigo-400/10 px-3 py-1.5 rounded-full border border-indigo-400/20">
                  <RefreshCcw size={14} className="animate-spin" /> ADAPTING DIALECT...
                </span>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FileUploader onFileSelect={handleFileSelect} disabled={status === 'processing' || status === 'recording'} />
            <LinkUploader onUrlSubmit={handleUrlSubmit} disabled={status === 'processing' || status === 'recording'} />
            <div className="flex flex-col gap-4 p-6 bg-slate-800/40 rounded-2xl border border-slate-700/50 shadow-inner">
              <AudioVisualizer stream={streamRef.current} isActive={status === 'recording'} />
              <button 
                onClick={status === 'recording' ? stopRecording : startRecording}
                disabled={status === 'processing'}
                className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all transform active:scale-95 ${status === 'recording' ? 'bg-red-500 shadow-lg shadow-red-900/30' : 'bg-slate-700 hover:bg-indigo-600 text-white'}`}
              >
                {status === 'recording' ? <><Square size={20} fill="currentColor"/> STOP RECORDING</> : <><Mic size={20}/> RECORD LIVE</>}
              </button>
              <div className="px-3 py-2 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                <p className="text-[10px] text-purple-300 font-medium text-center">
                  🎙️ Max Recording: <span className="font-bold">60 minutes</span> per session
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Status Messaging */}
        {status === 'processing' && !result && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4 animate-pulse">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-indigo-400 font-medium tracking-wide">AI is analyzing your audio content...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 flex items-start gap-4 text-red-400 animate-in fade-in slide-in-from-top-4">
            <AlertCircle className="flex-shrink-0" />
            <div>
              <h4 className="font-bold mb-1">Processing Error</h4>
              <p className="text-sm opacity-90">{error}</p>
            </div>
          </div>
        )}

        {/* Active Workspace Results */}
        {(liveTranscript || result) && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-8 duration-700">
            <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-3xl p-6 md:p-8 h-[500px] flex flex-col shadow-2xl overflow-hidden backdrop-blur-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs font-bold text-slate-500 tracking-widest flex items-center gap-2"><FileText size={16} className="text-indigo-500"/> TRANSCRIPT</h3>
                {result?.classification && (
                  <span className="text-[10px] font-bold bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full border border-indigo-500/20 uppercase tracking-tighter">
                    {result.classification}
                  </span>
                )}
              </div>
              <div className="overflow-y-auto prose prose-invert prose-sm max-w-none flex-grow custom-scrollbar pr-2">
                {result?.suggestedTitle && <h2 className="text-xl font-bold text-white mb-4">{result.suggestedTitle}</h2>}
                {result?.artistInfo && result.classification?.toLowerCase().includes('music') && (
                  <div className="mb-4 px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-lg inline-block">
                    <p className="text-xs font-semibold text-purple-300">
                      🎵 {result.artistInfo !== 'Unknown - Unknown' ? result.artistInfo : 'Artist & Song: Unknown'}
                    </p>
                  </div>
                )}
                <p className="text-slate-300 leading-relaxed text-base whitespace-pre-wrap">
                  {liveTranscript || result?.transcript || "Awaiting transcription segments..."}
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-900/20 to-slate-900/60 border border-indigo-500/20 rounded-3xl p-6 md:p-8 h-[500px] flex flex-col shadow-2xl relative backdrop-blur-sm">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <ListChecks size={80} />
              </div>
              <h3 className="text-xs font-bold text-indigo-400 mb-6 tracking-widest flex items-center gap-2"><ListChecks size={16}/> EXECUTIVE SUMMARY</h3>
              <div className="overflow-y-auto flex-grow space-y-5 custom-scrollbar pr-2">
                {isTranslating ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-50 space-y-4">
                    <Loader2 className="animate-spin text-indigo-500" size={32} />
                    <p className="text-sm font-medium">Updating language context...</p>
                  </div>
                ) : result?.summary ? (
                  result.summary.map((pt, i) => (
                    <div key={i} className="flex gap-4 text-sm text-slate-200 leading-relaxed group">
                      <div className="w-2 h-2 rounded-full bg-indigo-500 mt-2 flex-shrink-0 group-hover:scale-125 transition-transform" />
                      <span className="font-medium">{pt}</span>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-600 italic space-y-2">
                    <p>Analysis in progress...</p>
                  </div>
                )}
              </div>
              {result && (
                <div className="mt-6 pt-6 border-t border-slate-800/50">
                   <p className="text-[10px] text-slate-500 font-medium">Processing completed via Gemini 3 Pro</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* History / Group Workspace */}
        <section className="pt-16 border-t border-slate-900">
          <HistoryPanel 
            items={history}
            groups={groups}
            onDelete={id => setHistory(h => h.filter(i => i.id !== id))}
            onSelect={item => { 
              setResult(item); 
              setLiveTranscript(''); 
              setStatus('completed');
              window.scrollTo({ top: 400, behavior: 'smooth' }); 
            }}
            onRename={(id, name) => setHistory(h => h.map(i => i.id === id ? {...i, customName: name} : i))}
            onMove={(id, gId) => setHistory(h => h.map(i => i.id === id ? {...i, groupId: gId} : i))}
            onAddGroup={name => setGroups(g => [...g, {id: crypto.randomUUID(), name}])}
            onAnalyzeGroup={async (gId) => gemini.analyzeGroup(history.filter(i => i.groupId === gId), language)}
          />
        </section>
      </main>
      
      <footer className="w-full max-w-6xl mx-auto py-12 text-center border-t border-slate-900 mt-20">
        <p className="text-slate-600 text-xs font-medium tracking-widest uppercase">LinguaSummarize AI &copy; 2024 • Built with Google Gemini API</p>
      </footer>
    </div>
  );
};

export default App;
