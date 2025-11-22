
import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import CustomSelect from '../../components/CustomSelect';
import { Project, ProjectStatus, UserRole, Milestone } from '../../types';
import { Plus, MoreHorizontal, CheckSquare, Square, Paperclip, Clock, CheckCircle, Trash2, Upload, ArrowRight, Edit, X, Search, Filter, RotateCcw, Code, FileText, ExternalLink } from 'lucide-react';

const ProjectCard: React.FC<{ project: Project; onEdit: (p: Project) => void }> = ({ project, onEdit }) => {
  const { updateProject, deleteProject, storeFile, fileMap } = useData();
  const { showPrompt, showConfirm, showToast, showAlert } = useUI();
  const { user } = useAuth();
  const isBoss = user?.role === UserRole.BOSS;
  const [showDocs, setShowDocs] = useState(false);
  
  const calculateProgress = (milestones: Milestone[]) => {
    if (milestones.length === 0) return 0;
    const completed = milestones.filter(m => m.isCompleted).length;
    return Math.round((completed / milestones.length) * 100);
  };

  const handleStatusChange = (newStatus: ProjectStatus) => {
    updateProject(project.id, { status: newStatus });
    showToast(`Status changed to ${newStatus}`, 'success');
  };

  const toggleMilestone = (milestoneId: string, currentVal: boolean) => {
    const newMilestones = project.milestones.map(m => 
      m.id === milestoneId ? { ...m, isCompleted: !currentVal } : m
    );
    updateProject(project.id, { milestones: newMilestones, progress: calculateProgress(newMilestones) });
  };

  const addMilestone = async () => {
    const title = await showPrompt("Enter milestone title:", "", "Add Milestone");
    if (!title) return;
    const newMilestones = [...project.milestones, { id: Math.random().toString(), title, isCompleted: false }];
    updateProject(project.id, {
        milestones: newMilestones,
        progress: calculateProgress(newMilestones)
    });
    showToast('Milestone added', 'success');
  };

  const editMilestone = async (mId: string, oldTitle: string) => {
    const newTitle = await showPrompt("Edit milestone title:", oldTitle, "Edit Milestone");
    if (!newTitle || newTitle === oldTitle) return;
    
    const newMilestones = project.milestones.map(m => 
        m.id === mId ? { ...m, title: newTitle } : m
    );
    updateProject(project.id, { milestones: newMilestones });
    showToast('Milestone updated', 'success');
  };

  const deleteMilestone = async (mId: string) => {
      if (!await showConfirm("Delete this milestone?", "Confirm Delete")) return;
      const newMilestones = project.milestones.filter(m => m.id !== mId);
      updateProject(project.id, { 
          milestones: newMilestones,
          progress: calculateProgress(newMilestones)
      });
      showToast('Milestone deleted', 'info');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          const fileList = Array.from(e.target.files);
          const fileNames: string[] = [];

          fileList.forEach((f: any) => {
              storeFile(f.name, f);
              fileNames.push(f.name);
          });

          updateProject(project.id, {
              documents: [...project.documents, ...fileNames]
          });
          setShowDocs(true);
          showToast(`${fileList.length} files uploaded`, 'success');
          e.target.value = '';
      }
  };

  const handleOpenFile = async (docName: string) => {
      const url = fileMap[docName];
      if (url) {
          window.open(url, '_blank');
      } else {
          await showAlert(`Simulation: Opening "${docName}" from server.`, "File Preview");
      }
  };

  const handleDeleteFile = async (docName: string) => {
      if(await showConfirm(`Are you sure you want to remove "${docName}"?`, "Delete File")) {
          const newDocs = project.documents.filter(d => d !== docName);
          updateProject(project.id, { documents: newDocs });
          showToast('File removed', 'info');
      }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-4 hover:shadow-md transition-shadow group flex flex-col h-auto max-h-[800px]">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-bold text-gray-800 text-sm">{project.name}</h3>
          <p className="text-xs text-gray-500">{project.client}</p>
        </div>
        <div className="relative group/menu">
            <button className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"><MoreHorizontal size={16} /></button>
            <div className="absolute right-0 w-40 bg-white border border-gray-200 shadow-lg rounded-md hidden group-hover/menu:block z-10">
                <button onClick={() => onEdit(project)} className="block w-full text-left px-4 py-2 text-xs hover:bg-gray-50 flex items-center text-gray-700"><Edit size={12} className="mr-2"/> Edit Project</button>
                <button onClick={addMilestone} className="block w-full text-left px-4 py-2 text-xs hover:bg-gray-50 flex items-center text-gray-700"><Plus size={12} className="mr-2"/> Add Milestone</button>
                {isBoss && <button onClick={() => deleteProject(project.id)} className="block w-full text-left px-4 py-2 text-xs hover:bg-gray-50 text-red-600 flex items-center"><Trash2 size={12} className="mr-2"/> Delete</button>}
            </div>
        </div>
      </div>
      
      <div className="mb-3 max-h-20 overflow-y-auto custom-scrollbar">
         <p className="text-xs text-gray-600">{project.description}</p>
      </div>
      
      {/* Progress Display - Updated to show percentage */}
      <div className="mb-3 shrink-0">
        <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Progress</span>
            <span className={`text-xs font-bold transition-colors duration-300 ${project.progress === 100 ? 'text-green-600' : 'text-indigo-600'}`}>
                {project.progress}%
            </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div className={`h-1.5 rounded-full transition-all duration-500 ${project.progress === 100 ? 'bg-green-500' : 'bg-indigo-600'}`} style={{ width: `${project.progress}%` }}></div>
        </div>
      </div>

      <div className="space-y-1 mb-3 flex-1 min-h-[40px] max-h-[200px] overflow-y-auto custom-scrollbar pr-1 border-b border-gray-50 pb-2">
        {project.milestones.length === 0 && <p className="text-xs text-gray-400 italic">No milestones yet.</p>}
        {project.milestones.map(m => (
          <div key={m.id} className="group/milestone flex items-center justify-between text-xs text-gray-600 hover:bg-gray-50 rounded px-1 -mx-1">
            <div className="flex items-center cursor-pointer flex-1" onClick={() => toggleMilestone(m.id, m.isCompleted)}>
                {m.isCompleted ? <CheckSquare size={12} className="text-indigo-600 mr-2 flex-shrink-0" /> : <Square size={12} className="text-gray-400 mr-2 flex-shrink-0" />}
                <span className={`${m.isCompleted ? 'line-through text-gray-400' : ''} break-all`}>{m.title}</span>
            </div>
            <div className="hidden group-hover/milestone:flex items-center space-x-2 ml-2">
                <button onClick={() => editMilestone(m.id, m.title)} className="text-blue-500 hover:text-blue-700"><Edit size={12} /></button>
                <button onClick={() => deleteMilestone(m.id)} className="text-red-500 hover:text-red-700"><Trash2 size={12} /></button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-3 mt-2 shrink-0">
          {project.status === ProjectStatus.UPCOMING && (
              <button onClick={() => handleStatusChange(ProjectStatus.ONGOING)} className="flex-1 text-xs bg-indigo-100 text-indigo-700 px-2 py-1.5 rounded flex items-center justify-center hover:bg-indigo-200 transition-colors">
                  Start Project <ArrowRight size={12} className="ml-1" />
              </button>
          )}
          {project.status === ProjectStatus.ONGOING && (
              <>
                 <button onClick={() => handleStatusChange(ProjectStatus.UPCOMING)} className="text-xs bg-gray-100 text-gray-700 px-2 py-1.5 rounded flex items-center justify-center hover:bg-gray-200 transition-colors mr-1" title="Move back to Upcoming">
                    <RotateCcw size={12} className="mr-1" /> Hold
                 </button>
                 <button onClick={() => handleStatusChange(ProjectStatus.COMPLETED)} className="flex-1 text-xs bg-green-100 text-green-700 px-2 py-1.5 rounded flex items-center justify-center hover:bg-green-200 transition-colors">
                    Complete <CheckCircle size={12} className="ml-1" />
                 </button>
              </>
          )}
          {project.status === ProjectStatus.COMPLETED && (
               <button onClick={() => handleStatusChange(ProjectStatus.ONGOING)} className="text-xs bg-orange-100 text-orange-700 px-2 py-1.5 rounded flex items-center justify-center hover:bg-orange-200 transition-colors">
                  <RotateCcw size={12} className="mr-1" /> Reopen
              </button>
          )}
      </div>

      <div className="pt-2 border-t border-gray-100 mt-auto shrink-0">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <label className="flex items-center text-gray-500 hover:text-indigo-600 cursor-pointer transition-colors text-xs font-medium group/upload">
                    <div className="p-1 bg-gray-100 group-hover/upload:bg-indigo-50 rounded mr-1 transition-colors">
                        <Upload size={12} />
                    </div>
                    <span className="hidden sm:inline">Upload</span>
                    <input type="file" multiple className="hidden" onChange={handleFileUpload} />
                </label>
                
                {project.documents.length > 0 && (
                    <button 
                        onClick={() => setShowDocs(!showDocs)} 
                        className={`flex items-center text-xs font-medium transition-colors ${showDocs ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <Paperclip size={12} className="mr-1" />
                        {project.documents.length}
                    </button>
                )}
            </div>
        </div>

        {showDocs && project.documents.length > 0 && (
            <div className="mt-3 bg-gray-50/80 p-2 rounded-md border border-gray-100 space-y-1 max-h-[150px] overflow-y-auto custom-scrollbar">
                {project.documents.map((doc, i) => (
                    <div key={i} className="flex justify-between items-center bg-white p-1.5 rounded border border-gray-100 shadow-sm group/doc">
                        <div 
                            className="flex items-center overflow-hidden mr-2 cursor-pointer flex-1" 
                            onClick={() => handleOpenFile(doc)}
                            title="Click to open file"
                        >
                            <FileText size={12} className="text-indigo-500 mr-1.5 flex-shrink-0" />
                            <span className="text-[11px] text-gray-700 truncate hover:text-indigo-600 hover:underline">{doc}</span>
                        </div>
                        <button onClick={() => handleDeleteFile(doc)} className="p-1 hover:bg-red-50 text-red-500 rounded transition-colors">
                            <X size={12} />
                        </button>
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
};

const TechLeadPanel = () => {
  const { projects, reports, fileMap, addProject, updateProject, addReport, storeFile } = useData();
  const { showToast, showAlert } = useUI();

  const [showModal, setShowModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', client: '', description: '' });
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [clientFilter, setClientFilter] = useState('');

  const filteredProjects = useMemo(() => {
      return projects.filter(p => {
          const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                p.description.toLowerCase().includes(searchQuery.toLowerCase());
          const matchesClient = clientFilter ? p.client === clientFilter : true;
          return matchesSearch && matchesClient;
      });
  }, [projects, searchQuery, clientFilter]);

  const uniqueClients = useMemo(() => ['All Clients', ...Array.from(new Set(projects.map(p => p.client)))], [projects]);
  const myReports = useMemo(() => reports.filter(r => r.uploader === 'Tech Lead'), [reports]);

  const handleDailyReportUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reportId = Math.random().toString();
    storeFile(reportId, file);

    addReport({
        id: reportId,
        fileName: file.name,
        date: new Date().toISOString().split('T')[0],
        uploader: 'Tech Lead'
    });

    e.target.value = '';
    showToast('Report uploaded', 'success');
  };

  const handleOpenReport = (id: string) => {
    const url = fileMap[id];
    if (url) window.open(url, '_blank');
  };

  const handleOpenCreate = () => {
      setEditingId(null);
      setForm({ name: '', client: '', description: '' });
      setError(null);
      setShowModal(true);
  };

  const handleOpenEdit = (project: Project) => {
      setEditingId(project.id);
      setForm({ name: project.name, client: project.client, description: project.description });
      setError(null);
      setShowModal(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) {
        setError("Project Name is required.");
        return;
    }
    if (!form.client.trim()) {
        setError("Client Name is required.");
        return;
    }
    
    if (editingId) {
        updateProject(editingId, form);
        showToast('Project updated', 'success');
    } else {
        addProject({
            id: Math.random().toString(),
            name: form.name,
            client: form.client,
            status: ProjectStatus.UPCOMING,
            description: form.description || 'New project initiated.',
            progress: 0,
            milestones: [],
            documents: []
        });
        showToast('Project created', 'success');
    }
    setShowModal(false);
  };

  const clientOptions = uniqueClients.map(c => c === 'All Clients' ? { label: 'All Clients', value: '' } : { label: c, value: c });

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] overflow-hidden">
      <div className="flex-none flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-4 z-10">
        <div>
            <h1 className="text-2xl font-bold text-gray-800">Tech Projects</h1>
            <p className="text-xs text-gray-500">Manage development milestones</p>
        </div>
        
        <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
            <div className="relative group">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500" size={16} />
                <input 
                    type="text" 
                    placeholder="Search projects..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 w-full md:w-64"
                />
            </div>
            
            <div className="w-48">
              <CustomSelect 
                value={clientFilter}
                onChange={setClientFilter}
                options={clientOptions}
                placeholder="Filter Client"
              />
            </div>

            <button 
                onClick={() => setShowReportModal(true)} 
                className="bg-orange-100 text-orange-700 px-4 py-2 rounded-lg flex items-center text-sm font-medium hover:bg-orange-200 transition-colors"
            >
                <FileText size={16} className="mr-2" /> Submit Report
            </button>

            <button onClick={handleOpenCreate} className="bg-slate-900 text-white px-4 py-2 rounded-lg flex items-center text-sm font-medium hover:bg-slate-800 shadow-lg transition-all transform hover:scale-105">
                <Plus size={16} className="mr-2" /> New Project
            </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 min-h-0 pb-2">
        <div className="bg-gray-50 rounded-xl flex flex-col h-full border border-gray-200 shadow-inner overflow-hidden">
          <div className="p-3 border-b border-gray-200 bg-gray-100/50 rounded-t-xl flex justify-between items-center flex-shrink-0">
            <h2 className="font-bold text-gray-600 flex items-center text-sm uppercase tracking-wide"><Clock size={16} className="mr-2" /> Upcoming</h2>
            <span className="bg-white text-gray-600 px-2 py-0.5 rounded-full text-xs font-bold shadow-sm border border-gray-100">{filteredProjects.filter(p => p.status === ProjectStatus.UPCOMING).length}</span>
          </div>
          <div className="p-3 flex-1 overflow-y-auto custom-scrollbar pr-2">
            {filteredProjects.filter(p => p.status === ProjectStatus.UPCOMING).map(p => <ProjectCard key={p.id} project={p} onEdit={handleOpenEdit} />)}
          </div>
        </div>

        <div className="bg-indigo-50/50 rounded-xl flex flex-col h-full border border-indigo-100 shadow-inner overflow-hidden">
          <div className="p-3 border-b border-indigo-100 bg-indigo-100/50 rounded-t-xl flex justify-between items-center flex-shrink-0">
            <h2 className="font-bold text-indigo-700 flex items-center text-sm uppercase tracking-wide"><Code size={16} className="mr-2" /> Ongoing</h2>
             <span className="bg-white text-indigo-600 px-2 py-0.5 rounded-full text-xs font-bold shadow-sm border border-indigo-100">{filteredProjects.filter(p => p.status === ProjectStatus.ONGOING).length}</span>
          </div>
          <div className="p-3 flex-1 overflow-y-auto custom-scrollbar pr-2">
            {filteredProjects.filter(p => p.status === ProjectStatus.ONGOING).map(p => <ProjectCard key={p.id} project={p} onEdit={handleOpenEdit} />)}
          </div>
        </div>

        <div className="bg-emerald-50/50 rounded-xl flex flex-col h-full border border-emerald-100 shadow-inner overflow-hidden">
          <div className="p-3 border-b border-emerald-100 bg-emerald-100/50 rounded-t-xl flex justify-between items-center flex-shrink-0">
            <h2 className="font-bold text-emerald-700 flex items-center text-sm uppercase tracking-wide"><CheckCircle size={16} className="mr-2" /> Completed</h2>
             <span className="bg-white text-emerald-600 px-2 py-0.5 rounded-full text-xs font-bold shadow-sm border border-emerald-100">{filteredProjects.filter(p => p.status === ProjectStatus.COMPLETED).length}</span>
          </div>
          <div className="p-3 flex-1 overflow-y-auto custom-scrollbar pr-2">
            {filteredProjects.filter(p => p.status === ProjectStatus.COMPLETED).map(p => <ProjectCard key={p.id} project={p} onEdit={handleOpenEdit} />)}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h2 className="text-xl font-bold text-gray-800">{editingId ? 'Edit Project' : 'New Project'}</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={24} /></button>
            </div>
            
            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg flex items-center">
                    <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                    {error}
                </div>
            )}

            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Project Name <span className="text-red-500">*</span></label>
                    <input 
                      className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                      placeholder="e.g. CRM System V2" 
                      value={form.name} 
                      onChange={e => setForm({...form, name: e.target.value})} 
                    />
                </div>
                
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Client Name <span className="text-red-500">*</span></label>
                    <input 
                      className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                      placeholder="e.g. Acme Corp" 
                      value={form.client} 
                      onChange={e => setForm({...form, client: e.target.value})} 
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description</label>
                    <textarea 
                      className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                      placeholder="Brief details about the project requirements..." 
                      rows={3}
                      value={form.description} 
                      onChange={e => setForm({...form, description: e.target.value})} 
                    />
                </div>
            </div>

            <div className="mt-8 flex justify-end space-x-3">
              <button onClick={() => setShowModal(false)} className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">Cancel</button>
              <button onClick={handleSave} className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 shadow-md transition-all transform active:scale-95">
                  {editingId ? 'Save Changes' : 'Create Project'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-gray-700 flex items-center"><FileText className="mr-2 text-orange-500" size={18}/> Daily Reports</h3>
                <button onClick={() => setShowReportModal(false)}><X size={20} className="text-gray-400 hover:text-gray-600"/></button>
            </div>
            <div className="p-6">
                <div className="mb-6">
                    <p className="text-sm text-gray-500 mb-2 font-medium">Upload New Report</p>
                    <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-indigo-200 rounded-lg bg-indigo-50 cursor-pointer hover:bg-indigo-100 transition-colors">
                        <div className="flex flex-col items-center text-indigo-600 text-xs font-medium">
                            <Upload size={20} className="mb-1"/> 
                            <span>Select Report File</span>
                        </div>
                        <input type="file" className="hidden" onChange={handleDailyReportUpload} />
                    </label>
                </div>

                <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">My Upload History</h4>
                    <div className="space-y-2 h-40 overflow-y-auto custom-scrollbar bg-gray-50 rounded-lg p-2 border border-gray-100">
                        {myReports.length === 0 && <p className="text-xs text-gray-400 italic text-center py-4">No reports uploaded yet.</p>}
                        {myReports.map(r => (
                        <div key={r.id} className="flex justify-between items-center bg-white p-2 rounded shadow-sm">
                            <div className="overflow-hidden mr-2">
                                <p className="text-xs font-medium text-gray-700 truncate">{r.fileName}</p>
                                <p className="text-[10px] text-gray-400">{r.date}</p>
                            </div>
                            <button onClick={() => handleOpenReport(r.id)} className="text-indigo-400 hover:text-indigo-600">
                                <ExternalLink size={14} />
                            </button>
                        </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
        </div>
      )}

    </div>
  );
};

export default TechLeadPanel;
