
import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import CustomSelect from '../../components/CustomSelect';
import { Campaign, CampaignPlatform, CampaignLead, UserRole, CampaignStatus } from '../../types';
import { PlusCircle, FileText, Upload, Instagram, Linkedin, Mail, Trash2, Edit2, ArrowLeft, Plus, FileUp, X, Save, Clock, Calendar, CheckCircle, Archive, AlertCircle, ChevronRight, ExternalLink, CheckSquare, Search } from 'lucide-react';
import { read, utils } from 'xlsx';

const getPlatformIcon = (p: CampaignPlatform) => {
  switch (p) {
    case CampaignPlatform.INSTAGRAM: return <Instagram size={18} className="text-pink-600" />;
    case CampaignPlatform.LINKEDIN: return <Linkedin size={18} className="text-blue-700" />;
    case CampaignPlatform.EMAIL: return <Mail size={18} className="text-gray-600" />;
  }
};

const getLocalDateStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const SalesManagerPanel = () => {
  const { campaigns, reports, fileMap, addCampaign, updateCampaign, deleteCampaign, addReport, storeFile } = useData();
  const { user } = useAuth();
  const { showAlert, showConfirm, showToast } = useUI();
  
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const todayStr = getLocalDateStr();
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekStr = nextWeek.toISOString().split('T')[0];

  const [campaignForm, setCampaignForm] = useState<{name: string, platform: CampaignPlatform, startDate: string, dueDate: string}>({
    name: '',
    platform: CampaignPlatform.EMAIL,
    startDate: todayStr,
    dueDate: nextWeekStr
  });

  const [showLeadModal, setShowLeadModal] = useState(false);
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [leadForm, setLeadForm] = useState<Partial<CampaignLead>>({});
  const [showImportModal, setShowImportModal] = useState(false);
  const [pasteData, setPasteData] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());

  const canManageCampaigns = user?.role === UserRole.BOSS || user?.role === UserRole.SALES_MANAGER;

  const myReports = useMemo(() => reports.filter(r => r.uploader === 'Sales Manager'), [reports]);
  const selectedCampaign = useMemo(() => campaigns.find(c => c.id === selectedCampaignId), [campaigns, selectedCampaignId]);
  
  useEffect(() => {
    setSelectedLeadIds(new Set());
  }, [selectedCampaignId]);

  const filteredCampaigns = useMemo(() => {
    if (!searchQuery.trim()) return campaigns;
    const q = searchQuery.toLowerCase();
    return campaigns.filter(c => c.name.toLowerCase().includes(q));
  }, [campaigns, searchQuery]);

  const activeCampaigns = useMemo(() => filteredCampaigns.filter(c => c.status === 'Active'), [filteredCampaigns]);
  const upcomingCampaigns = useMemo(() => filteredCampaigns.filter(c => c.status === 'Upcoming'), [filteredCampaigns]);
  const pastCampaigns = useMemo(() => filteredCampaigns.filter(c => c.status === 'Past'), [filteredCampaigns]);

  const determineStatus = (start: string, due: string): CampaignStatus => {
      const today = getLocalDateStr();
      if (today > due) return 'Past';
      if (today >= start && today <= due) return 'Active';
      return 'Upcoming';
  };

  const openCampaignModal = (camp?: Campaign) => {
      if (camp) {
          setEditingCampaignId(camp.id);
          setCampaignForm({ name: camp.name, platform: camp.platform, startDate: camp.startDate, dueDate: camp.dueDate });
      } else {
          setEditingCampaignId(null);
          setCampaignForm({ name: '', platform: CampaignPlatform.EMAIL, startDate: todayStr, dueDate: nextWeekStr });
      }
      setShowCampaignModal(true);
  };

  const handleCampaignSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      if (!editingCampaignId && campaignForm.startDate < todayStr) {
          await showAlert("Start Date cannot be in the past for new campaigns.", "Validation Error");
          return;
      }
      if (campaignForm.dueDate < campaignForm.startDate) {
          await showAlert("Due Date must be after Start Date.", "Validation Error");
          return;
      }

      const status = determineStatus(campaignForm.startDate, campaignForm.dueDate);
      
      if (editingCampaignId) {
          updateCampaign(editingCampaignId, { ...campaignForm, status });
          showToast('Campaign updated', 'success');
      } else {
          addCampaign({
              id: Math.random().toString(),
              leadsGenerated: 0,
              leads: [],
              documents: [],
              status,
              ...campaignForm
          });
          showToast('Campaign scheduled', 'success');
      }
      setShowCampaignModal(false);
  };

  const handleDeleteCampaign = async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if(await showConfirm("Delete this campaign permanently?", "Delete Campaign")) {
        deleteCampaign(id);
        showToast('Campaign deleted', 'error');
      }
  };

  const handleReportUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reportId = Math.random().toString();
    storeFile(reportId, file);
    addReport({ id: reportId, fileName: file.name, date: getLocalDateStr(), uploader: 'Sales Manager' });
    showToast('Report uploaded', 'success');
    e.target.value = ''; 
  };
  const handleOpenReport = (id: string) => {
      const url = fileMap[id];
      if(url) window.open(url, '_blank');
  };

  const handleLeadSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedCampaignId || !selectedCampaign) return;
      
      let newLeads = [...selectedCampaign.leads];
      if (editingLeadId) {
          newLeads = newLeads.map(l => l.id === editingLeadId ? { ...l, ...leadForm } : l);
          showToast('Lead updated', 'success');
      } else {
          newLeads = [{ id: Math.random().toString(), status: 'Pending', ...leadForm }, ...newLeads];
          showToast('Lead added', 'success');
      }
      updateCampaign(selectedCampaignId, { leads: newLeads, leadsGenerated: newLeads.length });
      setShowLeadModal(false);
  };

  const handleSelectAll = () => {
      if (!selectedCampaign) return;
      if (selectedLeadIds.size === selectedCampaign.leads.length && selectedCampaign.leads.length > 0) {
          setSelectedLeadIds(new Set());
      } else {
          setSelectedLeadIds(new Set(selectedCampaign.leads.map(l => l.id)));
      }
  };

  const toggleSelection = (id: string) => {
      const newSet = new Set(selectedLeadIds);
      if (newSet.has(id)) {
          newSet.delete(id);
      } else {
          newSet.add(id);
      }
      setSelectedLeadIds(newSet);
  };

  const handleBulkDelete = async () => {
      if (!selectedCampaign) return;
      if (await showConfirm(`Delete ${selectedLeadIds.size} selected leads?`, 'Bulk Delete')) {
          const newLeads = selectedCampaign.leads.filter(l => !selectedLeadIds.has(l.id));
          updateCampaign(selectedCampaign.id, { leads: newLeads, leadsGenerated: newLeads.length });
          setSelectedLeadIds(new Set());
          showToast('Leads deleted', 'error');
      }
  };

  const handleBulkStatusUpdate = (status: string) => {
      if (!selectedCampaign || !status) return;
      const newLeads = selectedCampaign.leads.map(l => 
        selectedLeadIds.has(l.id) ? { ...l, status: status as any } : l
      );
      updateCampaign(selectedCampaign.id, { leads: newLeads });
      setSelectedLeadIds(new Set());
      showToast('Statuses updated', 'success');
  };

  const parseCSVLine = (text: string) => {
      const result = [];
      let cur = '';
      let inQuote = false;
      for (let i = 0; i < text.length; i++) {
          const char = text[i];
          if (char === '"') {
              inQuote = !inQuote;
          } else if (char === ',' && !inQuote) {
              result.push(cur.trim());
              cur = '';
          } else {
              cur += char;
          }
      }
      result.push(cur.trim());
      return result.map(c => c.replace(/^"|"$/g, '').trim());
  };

  const processImportedData = (rows: string[]) => {
      if (!selectedCampaignId || !selectedCampaign) return;
      
      const importedLeads: CampaignLead[] = [];
      
      rows.forEach(row => {
        if(!row.trim()) return;
        
        let cols = parseCSVLine(row);
        if (cols.length === 1 && row.includes('\t')) {
            cols = row.split('\t').map(c => c.trim());
        }

        if (!cols[0]) return;
        const lead: Partial<CampaignLead> = { id: Math.random().toString(), status: 'Pending' };
        
        if (selectedCampaign.platform === CampaignPlatform.INSTAGRAM) {
            lead.instagramHandle = cols[0];
            lead.followersCount = cols[1] || '';
        } else if (selectedCampaign.platform === CampaignPlatform.LINKEDIN) {
            lead.name = cols[0];
            lead.linkedinProfile = cols[1] || '';
        } else {
            lead.name = cols[0];
            lead.email = cols[1] || '';
            lead.companyName = cols[2] || '';
        }
        importedLeads.push(lead as CampaignLead);
      });

      if (importedLeads.length > 0) {
          const combined = [...importedLeads, ...selectedCampaign.leads];
          updateCampaign(selectedCampaignId, { leads: combined, leadsGenerated: combined.length });
          setPasteData('');
          setShowImportModal(false);
          showAlert(`Successfully imported ${importedLeads.length} leads.`, 'Import Success');
      }
  };

  const handleImportPaste = () => {
    const rows = pasteData.trim().split('\n');
    processImportedData(rows);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    
    if (isExcel) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = e.target?.result;
            if (!data) return;
            const wb = read(data, { type: 'array' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const json = utils.sheet_to_json(ws, { header: 1 }) as any[][];

            // Remove header if present
            if (json.length > 0) {
                const firstRow = json[0].map(c => String(c).toLowerCase());
                if (firstRow.some(c => c.includes('name') || c.includes('handle') || c.includes('email'))) {
                    json.shift();
                }
            }

            // Convert to CampaignLead objects
            if (!selectedCampaignId || !selectedCampaign) return;
            const importedLeads: CampaignLead[] = [];

            json.forEach(row => {
                if (!row || row.length === 0) return;
                const lead: Partial<CampaignLead> = { id: Math.random().toString(), status: 'Pending' };
                
                // Normalize to strings
                const cols = row.map(c => c ? String(c).trim() : '');
                
                if (!cols[0]) return;

                if (selectedCampaign.platform === CampaignPlatform.INSTAGRAM) {
                    lead.instagramHandle = cols[0];
                    lead.followersCount = cols[1] || '';
                } else if (selectedCampaign.platform === CampaignPlatform.LINKEDIN) {
                    lead.name = cols[0];
                    lead.linkedinProfile = cols[1] || '';
                } else {
                    lead.name = cols[0];
                    lead.email = cols[1] || '';
                    lead.companyName = cols[2] || '';
                }
                importedLeads.push(lead as CampaignLead);
            });

             if (importedLeads.length > 0) {
                const combined = [...importedLeads, ...selectedCampaign.leads];
                updateCampaign(selectedCampaignId, { leads: combined, leadsGenerated: combined.length });
                setPasteData('');
                setShowImportModal(false);
                showAlert(`Successfully imported ${importedLeads.length} leads from Excel.`, 'Import Success');
            }
        };
        reader.readAsArrayBuffer(file);
    } else {
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            const rows = text.split('\n');
            const firstRow = rows[0].toLowerCase();
            if (firstRow.includes('name') || firstRow.includes('handle') || firstRow.includes('email')) {
                rows.shift();
            }
            processImportedData(rows);
        };
        reader.readAsText(file);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          // Manually trigger the same logic as file input change
          const file = e.dataTransfer.files[0];
          const fakeEvent = { target: { files: [file] } } as any;
          handleFileImport(fakeEvent);
          e.dataTransfer.clearData();
      }
  };

  const deleteLead = async (id: string) => {
      if(!selectedCampaignId || !selectedCampaign) return;
      if(await showConfirm("Delete lead?", "Confirm Delete")) {
        const filtered = selectedCampaign.leads.filter(l => l.id !== id);
        updateCampaign(selectedCampaignId, { leads: filtered, leadsGenerated: filtered.length });
        showToast('Lead deleted', 'error');
      }
  }

  const CampaignCard = ({ c, accentColor, icon: Icon }: any) => (
      <div 
        onClick={() => setSelectedCampaignId(c.id)}
        className={`bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden group flex flex-col`}
      >
        <div className={`absolute top-0 left-0 w-1 h-full bg-${accentColor}-500`}></div>
        <div className="flex justify-between items-start mb-2 pl-2">
            <div className="flex items-center gap-2">
                 <div className="p-1.5 bg-gray-50 rounded-md border border-gray-100">{getPlatformIcon(c.platform)}</div>
                 <div>
                    <h3 className="font-bold text-gray-800 text-sm leading-tight">{c.name}</h3>
                    <div className="flex items-center text-[10px] text-gray-500 font-medium mt-0.5">
                        <span>{c.startDate}</span>
                        <span className="mx-1">-</span>
                        <span>{c.dueDate}</span>
                    </div>
                 </div>
            </div>
            {canManageCampaigns && (
                <button onClick={(e) => { e.stopPropagation(); openCampaignModal(c); }} className="text-gray-300 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Edit2 size={12} />
                </button>
            )}
        </div>
        <div className="mt-auto pl-2 flex items-center justify-between">
            <div className="flex items-center text-xs text-gray-600 font-medium bg-gray-50 px-2 py-1 rounded-md">
                <Icon size={12} className={`mr-1.5 text-${accentColor}-500`} />
                {c.leadsGenerated} Leads
            </div>
            <ChevronRight size={14} className="text-gray-300 group-hover:text-indigo-500 transition-colors" />
        </div>
      </div>
  );

  const platformOptions = Object.values(CampaignPlatform);
  const leadStatusOptions = ['Pending', 'Contacted', 'Replied', 'Converted'];

  return (
    <div className="h-full flex flex-col md:flex-row gap-6">
      <div className="flex-1 flex flex-col min-w-0 bg-white/50 rounded-2xl md:mr-0">
        {!selectedCampaign ? (
            <div className="h-full flex flex-col overflow-y-auto pr-2">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Campaign Pipeline</h1>
                        <p className="text-sm text-gray-500">Manage your outreach lifecycle</p>
                    </div>
                    
                    <div className="flex gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                            <input 
                                type="text"
                                placeholder="Search campaigns..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        {canManageCampaigns && (
                            <button onClick={() => openCampaignModal()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg shadow-indigo-200 flex items-center transition-all hover:scale-105 whitespace-nowrap">
                                <PlusCircle size={16} className="mr-2" /> Schedule
                            </button>
                        )}
                    </div>
                </div>

                <div className="mb-8">
                    <div className="flex items-center mb-3">
                        <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
                        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Live Now</h2>
                        <span className="ml-2 bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{activeCampaigns.length}</span>
                    </div>
                    {activeCampaigns.length === 0 ? (
                        <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center text-gray-400 text-sm">No active campaigns.</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {activeCampaigns.map(c => <CampaignCard key={c.id} c={c} accentColor="green" icon={Clock} />)}
                        </div>
                    )}
                </div>

                <div className="mb-8">
                    <div className="flex items-center mb-3">
                        <span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
                        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Upcoming</h2>
                        <span className="ml-2 bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{upcomingCampaigns.length}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                         {upcomingCampaigns.map(c => <CampaignCard key={c.id} c={c} accentColor="blue" icon={Calendar} />)}
                         {upcomingCampaigns.length === 0 && <p className="text-sm text-gray-400 italic col-span-full">No upcoming campaigns scheduled.</p>}
                    </div>
                </div>

                <div>
                     <div className="flex items-center mb-3">
                        <span className="w-2 h-2 rounded-full bg-gray-400 mr-2"></span>
                        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">History</h2>
                    </div>
                    <div className="space-y-2">
                        {pastCampaigns.map(c => (
                            <div key={c.id} onClick={() => setSelectedCampaignId(c.id)} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer group transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="text-gray-400">{getPlatformIcon(c.platform)}</div>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-600 group-hover:text-gray-900">{c.name}</p>
                                        <p className="text-[10px] text-gray-400">{c.startDate} - {c.dueDate}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{c.leadsGenerated} leads</span>
                                    {canManageCampaigns && <button onClick={(e) => handleDeleteCampaign(e, c.id)} className="text-gray-300 hover:text-red-500 p-1"><Trash2 size={12}/></button>}
                                    <ChevronRight size={14} className="text-gray-300" />
                                </div>
                            </div>
                        ))}
                        {pastCampaigns.length === 0 && <p className="text-sm text-gray-400 italic">No past campaigns found.</p>}
                    </div>
                </div>
            </div>
        ) : (
            <div className="h-full flex flex-col bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden animate-in slide-in-from-right-4 duration-300">
                 <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setSelectedCampaignId(null)} className="p-2 hover:bg-white rounded-full border border-transparent hover:border-gray-200 transition-all text-gray-500"><ArrowLeft size={18} /></button>
                        <div>
                            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                {selectedCampaign.name}
                                <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wide border
                                    ${selectedCampaign.status === 'Active' ? 'bg-green-50 text-green-600 border-green-100' : 
                                      selectedCampaign.status === 'Upcoming' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                                    {selectedCampaign.status}
                                </span>
                            </h2>
                            <p className="text-xs text-gray-500 flex items-center gap-1"><Calendar size={10}/> {selectedCampaign.startDate} to {selectedCampaign.dueDate}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setShowImportModal(true)} className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-50 flex items-center shadow-sm">
                            <FileUp size={14} className="mr-1.5"/> Import
                        </button>
                        <button onClick={() => { setEditingLeadId(null); setLeadForm({}); setShowLeadModal(true); }} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 flex items-center shadow-md">
                            <Plus size={14} className="mr-1.5"/> Add Lead
                        </button>
                    </div>
                 </div>
                 
                 {selectedLeadIds.size > 0 && (
                    <div className="bg-indigo-600 text-white px-4 py-2 flex justify-between items-center animate-in slide-in-from-top-2 shadow-md sticky top-0 z-20">
                        <span className="text-sm font-medium flex items-center">
                            <CheckSquare size={16} className="mr-2"/>
                            {selectedLeadIds.size} leads selected
                        </span>
                        <div className="flex gap-3">
                           <div className="w-40">
                              <CustomSelect 
                                value="" 
                                onChange={handleBulkStatusUpdate}
                                options={leadStatusOptions}
                                placeholder="Change Status..."
                                className="text-gray-900 text-xs"
                              />
                           </div>
                            <button 
                                onClick={handleBulkDelete}
                                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors flex items-center"
                            >
                                <Trash2 size={14} className="mr-1"/> Delete Selected
                            </button>
                        </div>
                    </div>
                 )}

                 <div className="flex-1 overflow-auto bg-white relative">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-gray-50 text-gray-500 font-semibold uppercase tracking-wider text-xs sticky top-0 z-10 shadow-sm">
                             <tr>
                                <th className="w-10 px-6 py-3 border-b text-center">
                                   <input 
                                      type="checkbox" 
                                      className="cursor-pointer rounded text-indigo-600 focus:ring-indigo-500"
                                      onChange={handleSelectAll}
                                      checked={selectedCampaign.leads.length > 0 && selectedLeadIds.size === selectedCampaign.leads.length}
                                   />
                                </th>
                                {selectedCampaign.platform === CampaignPlatform.EMAIL && (
                                    <>
                                        <th className="px-6 py-3">Name</th>
                                        <th className="px-6 py-3">Email</th>
                                        <th className="px-6 py-3">Company</th>
                                    </>
                                )}
                                {selectedCampaign.platform === CampaignPlatform.INSTAGRAM && (
                                    <>
                                        <th className="px-6 py-3">Insta Handle</th>
                                        <th className="px-6 py-3">Followers</th>
                                    </>
                                )}
                                {selectedCampaign.platform === CampaignPlatform.LINKEDIN && (
                                    <>
                                        <th className="px-6 py-3">Name</th>
                                        <th className="px-6 py-3">Profile Link</th>
                                    </>
                                )}
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                             </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {selectedCampaign.leads.map(lead => (
                                <tr key={lead.id} className={`hover:bg-indigo-50/30 group transition-colors ${selectedLeadIds.has(lead.id) ? 'bg-indigo-50' : ''}`}>
                                    <td className="px-6 py-3 text-center">
                                       <input 
                                          type="checkbox" 
                                          className="cursor-pointer rounded text-indigo-600 focus:ring-indigo-500"
                                          checked={selectedLeadIds.has(lead.id)}
                                          onChange={() => toggleSelection(lead.id)}
                                       />
                                    </td>
                                    
                                    {selectedCampaign.platform === CampaignPlatform.EMAIL && (
                                        <>
                                            <td className="px-6 py-3 font-medium text-gray-900">{lead.name || '-'}</td>
                                            <td className="px-6 py-3 text-gray-600">{lead.email || '-'}</td>
                                            <td className="px-6 py-3 text-gray-500">{lead.companyName || '-'}</td>
                                        </>
                                    )}

                                    {selectedCampaign.platform === CampaignPlatform.INSTAGRAM && (
                                        <>
                                            <td className="px-6 py-3 font-medium text-gray-900 flex items-center">
                                                <Instagram size={14} className="text-pink-600 mr-2"/>
                                                {lead.instagramHandle || '-'}
                                            </td>
                                            <td className="px-6 py-3 text-gray-600">{lead.followersCount || '-'}</td>
                                        </>
                                    )}

                                    {selectedCampaign.platform === CampaignPlatform.LINKEDIN && (
                                        <>
                                            <td className="px-6 py-3 font-medium text-gray-900">{lead.name || '-'}</td>
                                            <td className="px-6 py-3 text-blue-600">
                                                <a href={lead.linkedinProfile} target="_blank" rel="noreferrer" className="hover:underline flex items-center w-fit">
                                                    {lead.linkedinProfile && lead.linkedinProfile.length > 30 ? lead.linkedinProfile.substring(0,30)+'...' : lead.linkedinProfile} 
                                                    <ExternalLink size={10} className="ml-1"/>
                                                </a>
                                            </td>
                                        </>
                                    )}

                                    <td className="px-6 py-3">
                                         <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                            ${lead.status === 'Converted' ? 'bg-green-100 text-green-800' :
                                              lead.status === 'Replied' ? 'bg-blue-100 text-blue-800' :
                                              lead.status === 'Contacted' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                                            {lead.status === 'Converted' && <CheckCircle size={10} className="mr-1"/>}
                                            {lead.status}
                                         </span>
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => { setEditingLeadId(lead.id); setLeadForm(lead); setShowLeadModal(true); }} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-md transition-colors"><Edit2 size={14}/></button>
                                            <button onClick={() => deleteLead(lead.id)} className="p-1.5 hover:bg-red-50 text-red-600 rounded-md transition-colors"><Trash2 size={14}/></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {selectedCampaign.leads.length === 0 && (
                                <tr>
                                    <td colSpan={selectedCampaign.platform === CampaignPlatform.EMAIL ? 6 : 5} className="px-6 py-12 text-center text-gray-400">
                                        <div className="flex flex-col items-center">
                                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                                                <AlertCircle size={24} className="text-gray-300" />
                                            </div>
                                            <p>No leads yet. Start adding!</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                 </div>
            </div>
        )}
      </div>

      <div className="w-full md:w-80 flex-none flex flex-col gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 flex flex-col h-[calc(100vh-2rem)] md:h-auto md:max-h-full sticky top-4">
               <h3 className="font-bold text-gray-800 mb-1 flex items-center">
                   <FileText size={18} className="mr-2 text-orange-500" /> Daily Reporting
               </h3>
               <p className="text-xs text-gray-500 mb-4">Submit your EOD status here.</p>
               
               <label className="border-2 border-dashed border-indigo-100 bg-indigo-50/50 hover:bg-indigo-50 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all hover:border-indigo-300 group mb-6">
                    <div className="bg-white p-2 rounded-full shadow-sm mb-2 group-hover:scale-110 transition-transform">
                        <Upload size={20} className="text-indigo-600" />
                    </div>
                    <span className="text-xs font-bold text-indigo-700">Upload Report</span>
                    <span className="text-[10px] text-indigo-400 mt-1">PDF, Excel, Docx</span>
                    <input type="file" className="hidden" onChange={handleReportUpload} />
               </label>

               <div className="flex-1 overflow-hidden flex flex-col min-h-[200px]">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Recent Uploads</h4>
                    <div className="overflow-y-auto custom-scrollbar flex-1 space-y-2 pr-1">
                        {myReports.length === 0 && <p className="text-xs text-center text-gray-300 py-4 italic">No history available</p>}
                        {myReports.map(r => (
                            <div key={r.id} className="flex justify-between items-center p-2.5 bg-gray-50 rounded-lg border border-gray-100 group hover:border-gray-200 transition-colors">
                                <div className="overflow-hidden mr-2">
                                    <p className="text-xs font-semibold text-gray-700 truncate">{r.fileName}</p>
                                    <p className="text-[10px] text-gray-400">{r.date}</p>
                                </div>
                                <button onClick={() => handleOpenReport(r.id)} className="text-gray-400 hover:text-indigo-600 transition-colors p-1"><ExternalLink size={12}/></button>
                            </div>
                        ))}
                    </div>
               </div>
          </div>
      </div>

      {showCampaignModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-2xl animate-in zoom-in duration-200">
                  <div className="flex justify-between items-center mb-4 border-b pb-3">
                      <h3 className="font-bold text-gray-800">{editingCampaignId ? 'Edit Campaign' : 'Schedule Campaign'}</h3>
                      <button onClick={() => setShowCampaignModal(false)}><X size={20} className="text-gray-400 hover:text-gray-600"/></button>
                  </div>
                  <form onSubmit={handleCampaignSubmit} className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Name</label>
                          <input className="w-full border border-gray-300 p-2 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" required value={campaignForm.name} onChange={e => setCampaignForm({...campaignForm, name: e.target.value})} placeholder="e.g. Winter Outreach"/>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Platform</label>
                          <CustomSelect 
                            value={campaignForm.platform}
                            onChange={(val) => setCampaignForm({...campaignForm, platform: val as any})}
                            options={platformOptions}
                          />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Start Date</label>
                              <input 
                                type="date" 
                                className="w-full border border-gray-300 p-2 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                                required 
                                value={campaignForm.startDate} 
                                onChange={e => setCampaignForm({...campaignForm, startDate: e.target.value})} 
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Due Date</label>
                              <input 
                                type="date" 
                                className="w-full border border-gray-300 p-2 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                                required 
                                min={campaignForm.startDate}
                                value={campaignForm.dueDate} 
                                onChange={e => setCampaignForm({...campaignForm, dueDate: e.target.value})} 
                              />
                          </div>
                      </div>
                      <p className="text-[10px] text-gray-400 bg-gray-50 p-2 rounded border border-gray-100">
                          Campaigns automatically update status:<br/>
                          • Upcoming: Before Start Date<br/>
                          • Active: Start Date to Due Date<br/>
                          • Past: After Due Date
                      </p>
                      <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-md transition-transform active:scale-95">Save Schedule</button>
                  </form>
              </div>
          </div>
      )}

      {showLeadModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
               <div className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-2xl animate-in zoom-in duration-200">
                  <div className="flex justify-between items-center mb-4 border-b pb-3">
                      <h3 className="font-bold text-gray-800">{editingLeadId ? 'Edit Lead' : 'Add New Lead'}</h3>
                      <button onClick={() => setShowLeadModal(false)}><X size={20} className="text-gray-400 hover:text-gray-600"/></button>
                  </div>
                  <form onSubmit={handleLeadSubmit} className="space-y-3">
                      {selectedCampaign?.platform === CampaignPlatform.INSTAGRAM && (
                          <>
                             <input className="w-full border border-gray-300 p-2 rounded text-sm" placeholder="Instagram Handle (@...)" value={leadForm.instagramHandle || ''} onChange={e => setLeadForm({...leadForm, instagramHandle: e.target.value})} required/>
                             <input className="w-full border border-gray-300 p-2 rounded text-sm" placeholder="Followers Count" value={leadForm.followersCount || ''} onChange={e => setLeadForm({...leadForm, followersCount: e.target.value})} />
                          </>
                      )}
                      {selectedCampaign?.platform === CampaignPlatform.LINKEDIN && (
                          <>
                             <input className="w-full border border-gray-300 p-2 rounded text-sm" placeholder="Full Name" value={leadForm.name || ''} onChange={e => setLeadForm({...leadForm, name: e.target.value})} required/>
                             <input className="w-full border border-gray-300 p-2 rounded text-sm" placeholder="Profile URL" value={leadForm.linkedinProfile || ''} onChange={e => setLeadForm({...leadForm, linkedinProfile: e.target.value})} required/>
                          </>
                      )}
                      {selectedCampaign?.platform === CampaignPlatform.EMAIL && (
                          <>
                             <input className="w-full border border-gray-300 p-2 rounded text-sm" placeholder="Full Name" value={leadForm.name || ''} onChange={e => setLeadForm({...leadForm, name: e.target.value})} required/>
                             <input type="email" className="w-full border border-gray-300 p-2 rounded text-sm" placeholder="Email Address" value={leadForm.email || ''} onChange={e => setLeadForm({...leadForm, email: e.target.value})} required/>
                             <input className="w-full border border-gray-300 p-2 rounded text-sm" placeholder="Company Name" value={leadForm.companyName || ''} onChange={e => setLeadForm({...leadForm, companyName: e.target.value})} />
                          </>
                      )}
                      
                      <CustomSelect 
                        value={leadForm.status || 'Pending'}
                        onChange={(val) => setLeadForm({...leadForm, status: val as any})}
                        options={leadStatusOptions}
                      />

                      <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-md mt-2">Save Lead</button>
                  </form>
               </div>
          </div>
      )}

      {showImportModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white p-6 rounded-2xl w-full max-w-2xl shadow-2xl animate-in zoom-in duration-200">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-gray-800 flex items-center"><FileUp size={18} className="mr-2 text-indigo-600"/> Import Data</h3>
                      <button onClick={() => setShowImportModal(false)}><X size={20} className="text-gray-400 hover:text-gray-600"/></button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <label 
                             onDragOver={onDragOver}
                             onDragLeave={onDragLeave}
                             onDrop={onDrop}
                             className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all group
                                ${isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400 bg-gray-50'}`}
                        >
                            <div className={`bg-white p-3 rounded-full shadow-sm mb-3 transition-transform ${isDragging ? 'scale-110' : 'group-hover:scale-110'}`}>
                                <Upload size={24} className="text-indigo-600" />
                            </div>
                            <span className="text-sm font-bold text-gray-700">Click or Drag File Here</span>
                            <span className="text-xs text-gray-400 mt-1 text-center">Supports .csv, .xlsx, .xls</span>
                            <input type="file" accept=".csv, .xlsx, .xls" className="hidden" onChange={handleFileImport} />
                        </label>

                        <div className="flex flex-col">
                            <textarea 
                                className="flex-1 border border-gray-300 rounded-lg p-3 text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none mb-2 resize-none" 
                                placeholder={`Or paste data here...\nFormat: Name/Handle, Contact/Followers, Company`}
                                value={pasteData}
                                onChange={e => setPasteData(e.target.value)}
                            />
                            <button onClick={handleImportPaste} disabled={!pasteData} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 self-end w-full shadow-sm">
                                Process Pasted Data
                            </button>
                        </div>
                  </div>
                  
                  <div className="mt-4 text-[10px] text-gray-400 bg-gray-50 p-2 rounded border border-gray-100">
                      <strong>Format Guide:</strong> <br/>
                      Email: Name, Email, Company<br/>
                      LinkedIn: Name, Profile URL<br/>
                      Instagram: Handle, Followers
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default SalesManagerPanel;