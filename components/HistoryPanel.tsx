
import React, { useState } from 'react';
import { HistoryItem, Group, GroupSummary } from '../types';
import { Clock, Trash2, Edit2, GripVertical, Plus, FolderOpen, MoreVertical, Check, PieChart, Loader2, X, BarChart3 } from 'lucide-react';

interface HistoryPanelProps {
  items: HistoryItem[];
  groups: Group[];
  onDelete: (id: string) => void;
  onSelect: (item: HistoryItem) => void;
  onRename: (id: string, newName: string) => void;
  onMove: (id: string, groupId: string) => void;
  onAddGroup: (name: string) => void;
  onAnalyzeGroup: (groupId: string) => Promise<GroupSummary>;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ 
  items, groups, onDelete, onSelect, onRename, onMove, onAddGroup, onAnalyzeGroup 
}) => {
  const [newGroupName, setNewGroupName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');
  const [analyzingGroupId, setAnalyzingGroupId] = useState<string | null>(null);
  const [groupAnalysis, setGroupAnalysis] = useState<GroupSummary | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('itemId', id);
  };

  const handleDrop = (e: React.DragEvent, groupId: string) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData('itemId');
    onMove(itemId, groupId);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };

  const submitRename = (id: string) => {
    onRename(id, tempName);
    setEditingId(null);
  };

  const triggerGroupAnalysis = async (groupId: string) => {
    setAnalyzingGroupId(groupId);
    try {
      const result = await onAnalyzeGroup(groupId);
      setGroupAnalysis(result);
    } catch (e) {
      console.error(e);
    } finally {
      setAnalyzingGroupId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <FolderOpen size={24} className="text-blue-400" /> Workspace
        </h3>
        <div className="flex items-center gap-2">
          <input 
            type="text" 
            placeholder="New group..." 
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none w-32"
          />
          <button 
            onClick={() => { if(newGroupName) { onAddGroup(newGroupName); setNewGroupName(''); } }}
            className="p-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white transition-colors"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      <div className="flex gap-6 overflow-x-auto pb-4 custom-scrollbar">
        {groups.map(group => (
          <div 
            key={group.id} 
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, group.id)}
            className="flex-shrink-0 w-80 bg-slate-900/40 rounded-2xl border border-slate-800 flex flex-col min-h-[400px]"
          >
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/20">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                {group.name}
                <span className="bg-slate-800 text-slate-500 text-[10px] px-2 py-0.5 rounded-full">
                  {items.filter(i => i.groupId === group.id).length}
                </span>
              </h4>
              <button 
                onClick={() => triggerGroupAnalysis(group.id)}
                disabled={items.filter(i => i.groupId === group.id).length < 2}
                className="p-1.5 hover:bg-blue-500/10 text-blue-400 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5 text-[10px] font-bold"
                title="Summarize Group"
              >
                {analyzingGroupId === group.id ? <Loader2 size={12} className="animate-spin" /> : <BarChart3 size={12} />}
                INSIGHTS
              </button>
            </div>

            <div className="p-3 space-y-3 flex-grow overflow-y-auto max-h-[600px]">
              {items.filter(i => i.groupId === group.id).map(item => (
                <div 
                  key={item.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item.id)}
                  className="group relative bg-slate-800/50 border border-slate-700/50 hover:border-blue-500/50 rounded-xl p-3 transition-all cursor-pointer shadow-sm active:scale-95"
                  onClick={() => onSelect(item)}
                >
                  <div className="flex items-start gap-2">
                    <GripVertical size={14} className="mt-1 text-slate-600 cursor-grab" />
                    <div className="flex-grow min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[9px] font-bold text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded">
                          {item.classification}
                        </span>
                        <button 
                          onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                          className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 p-1"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>

                      {editingId === item.id ? (
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <input autoFocus className="bg-slate-900 border border-blue-500 text-sm rounded px-2 py-1 w-full" value={tempName} onChange={e => setTempName(e.target.value)} onKeyDown={e => e.key === 'Enter' && submitRename(item.id)} />
                          <button onClick={() => submitRename(item.id)} className="text-green-500"><Check size={14}/></button>
                        </div>
                      ) : (
                        <h5 className="text-slate-100 font-medium text-sm leading-tight truncate flex items-center justify-between">
                          {item.customName || item.suggestedTitle}
                          <Edit2 size={10} className="opacity-0 group-hover:opacity-100 text-slate-500 ml-1" onClick={(e) => { e.stopPropagation(); setEditingId(item.id); setTempName(item.customName || item.suggestedTitle); }} />
                        </h5>
                      )}
                      
                      <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-500">
                        <Clock size={10} />
                        {new Date(item.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Group Analysis Modal */}
      {groupAnalysis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-600/20 to-indigo-600/20">
              <h3 className="text-xl font-bold flex items-center gap-3">
                <PieChart className="text-blue-400" /> Group Intelligence Report
              </h3>
              <button onClick={() => setGroupAnalysis(null)} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto space-y-8 custom-scrollbar">
              <section>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Data Breakdown</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {groupAnalysis.dataBreakdown.map((stat, i) => (
                    <div key={i} className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 flex flex-col items-center justify-center text-center">
                      <span className="text-2xl font-bold text-blue-400">{stat.count}</span>
                      <span className="text-[10px] text-slate-400 font-medium">{stat.label}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Collective Summary</h4>
                <ul className="space-y-3">
                  {groupAnalysis.collectiveSummary.map((pt, i) => (
                    <li key={i} className="flex gap-3 text-sm text-slate-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                      {pt}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="bg-slate-800/30 p-5 rounded-2xl border border-slate-700/30">
                <h4 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">Primary Themes</h4>
                <p className="text-sm text-slate-400 italic leading-relaxed">{groupAnalysis.overallThemes}</p>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryPanel;
