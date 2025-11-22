
import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useUI } from '../../context/UIContext';
import CustomSelect from '../../components/CustomSelect';
import { FolderNode, Lead, LeadStatus } from '../../types';
import { ChevronRight, ChevronDown, Folder, Database, Plus, Save, Trash2, Edit2, FilePlus, X, Search, Upload, FileUp, Globe, MapPin, Instagram, Facebook, Linkedin, FileText, ExternalLink, CheckSquare, Calendar } from 'lucide-react';
import { read, utils } from 'xlsx';

// Helper for ID
const generateId = () => Math.random().toString(36).substr(2, 9);

// Helper to format date for input
const formatForInput = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
        // Try to parse string
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        // Format to YYYY-MM-DDThh:mm
        const pad = (n: number) => n < 10 ? '0'+n : n;
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch (e) {
        return '';
    }
};

// Robust Date Parser for Imports
const parseImportDate = (val: any): string | undefined => {
    if (!val) return undefined;
    
    // 1. Native Date Object (from SheetJS with cellDates: true)
    if (val instanceof Date) {
        if (isNaN(val.getTime())) return undefined;
        const pad = (n: number) => n < 10 ? '0'+n : n;
        return `${val.getFullYear()}-${pad(val.getMonth()+1)}-${pad(val.getDate())}T${pad(val.getHours())}:${pad(val.getMinutes())}`;
    }

    // 2. Numeric (Excel Serial Number)
    if (typeof val === 'number') {
        const date = new Date(Math.round((val - 25569) * 86400 * 1000));
        if (!isNaN(date.getTime())) {
             const pad = (n: number) => n < 10 ? '0'+n : n;
             return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
        }
    }
    
    const str = String(val).trim();
    if (!str) return undefined;

    // 3. String looking like Excel Serial (e.g. "45230")
    // Avoid matching phone numbers (e.g. 9876543210)
    // Excel 30000 = ~1982, 70000 = ~2091.
    if (/^\d+(\.\d+)?$/.test(str)) {
         const num = parseFloat(str);
         if (num > 30000 && num < 70000) { 
             const date = new Date(Math.round((num - 25569) * 86400 * 1000));
             if (!isNaN(date.getTime())) {
                 const pad = (n: number) => n < 10 ? '0'+n : n;
                 return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
             }
         }
    }

    // 4. Regex for DD/MM/YYYY or DD-MM-YYYY with optional time
    // Captures: 1:Day, 2:Month, 3:Year, 4:Hour, 5:Min, 6:Sec, 7:AM/PM
    const dmyRegex = /^(\d{1,2})[-./](\d{1,2})[-./](\d{4})(?:\s+(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?\s*(am|pm)?)?/i;
    const match = str.match(dmyRegex);
    
    if (match) {
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1; // JS months are 0-indexed
        const year = parseInt(match[3], 10);
        
        // Default to 09:00 AM if no time provided for a meeting
        let hour = match[4] ? parseInt(match[4], 10) : 9; 
        const min = match[5] ? parseInt(match[5], 10) : 0;
        const meridian = match[7] ? match[7].toLowerCase() : null;

        // Adjust for AM/PM
        if (meridian === 'pm' && hour < 12) hour += 12;
        if (meridian === 'am' && hour === 12) hour = 0;

        const date = new Date(year, month, day, hour, min);
        if (!isNaN(date.getTime()) && date.getFullYear() > 1900 && date.getFullYear() < 2100) {
             const pad = (n: number) => n < 10 ? '0'+n : n;
             return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
        }
    }

    // 5. Final Fallback: Native Date Parse (covers ISO YYYY-MM-DD etc)
    const nativeDate = new Date(str);
    if (!isNaN(nativeDate.getTime()) && nativeDate.getFullYear() > 1900 && nativeDate.getFullYear() < 2100) {
         const pad = (n: number) => n < 10 ? '0'+n : n;
         return `${nativeDate.getFullYear()}-${pad(nativeDate.getMonth()+1)}-${pad(nativeDate.getDate())}T${pad(nativeDate.getHours())}:${pad(nativeDate.getMinutes())}`;
    }
    
    return undefined;
};

interface TreeNodeProps {
  node: FolderNode;
  onSelect: (node: FolderNode) => void;
  selectedId: string;
  level?: number;
}

const TreeNode: React.FC<TreeNodeProps> = ({ node, onSelect, selectedId, level = 0 }) => {
  const { addFolder, renameFolder, deleteFolder } = useData();
  const { showPrompt, showConfirm, showToast } = useUI();
  const [isOpen, setIsOpen] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const hasChildren = node.children && node.children.length > 0;

  const handleAddSubfolder = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Determine next level type
    let nextType: 'country' | 'city' | 'category' = 'category';
    let nextTypeLabel = 'Category';
    
    if (node.type === 'root') {
        nextType = 'country';
        nextTypeLabel = 'Country';
    } else if (node.type === 'country') {
        nextType = 'city';
        nextTypeLabel = 'City';
    }

    const name = await showPrompt(`Enter new ${nextTypeLabel} name:`, '', 'Create Folder');
    if (!name) return;
    
    addFolder(node.id, name, nextType);
    setIsOpen(true);
    showToast(`${nextTypeLabel} created`, 'success');
  };

  const handleRename = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const name = await showPrompt("Enter new name:", node.name, 'Rename Folder');
    if (name) {
      renameFolder(node.id, name);
      showToast('Folder renamed', 'success');
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = await showConfirm(`Delete folder "${node.name}" and all its contents?`, 'Delete Folder');
    if (confirmed) {
      deleteFolder(node.id);
      showToast('Folder deleted', 'error');
    }
  };

  const getIcon = () => {
      if (node.type === 'root') return <Database size={14} className="mr-2 text-indigo-600" />;
      if (node.type === 'country') return <Globe size={14} className="mr-2 text-blue-500" />;
      if (node.type === 'city') return <MapPin size={14} className="mr-2 text-red-500" />;
      return <Folder size={14} className="mr-2 text-yellow-500" />;
  };
  
  return (
    <div className="select-none">
      <div 
        className={`flex items-center py-1.5 px-2 cursor-pointer transition-colors group relative ${selectedId === node.id ? 'bg-indigo-100 text-indigo-700 font-medium' : 'hover:bg-gray-100'}`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => onSelect(node)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <span 
          className="mr-1 text-gray-400 hover:text-gray-600"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
        >
          {hasChildren ? (isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <span className="w-3.5 inline-block" />}
        </span>
        {getIcon()}
        <span className="text-sm truncate max-w-[120px]">{node.name}</span>

        {/* Folder Actions */}
        {isHovered && (
          <div className="absolute right-2 flex space-x-1 bg-white/90 rounded shadow-sm px-1 z-10">
             {node.type !== 'category' && (
               <button onClick={handleAddSubfolder} title="Add Subfolder" className="text-green-600 hover:bg-green-100 rounded p-0.5">
                 <Plus size={12} />
               </button>
             )}
             {node.type !== 'root' && (
               <>
                <button onClick={handleRename} title="Rename" className="text-blue-600 hover:bg-blue-100 rounded p-0.5">
                  <Edit2 size={12} />
                </button>
                <button onClick={handleDelete} title="Delete" className="text-red-600 hover:bg-red-100 rounded p-0.5">
                  <Trash2 size={12} />
                </button>
               </>
             )}
          </div>
        )}
      </div>
      {isOpen && hasChildren && (
        <div>
          {node.children!.map(child => (
            <TreeNode key={child.id} node={child} onSelect={onSelect} selectedId={selectedId} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

const TelecallerPanel = () => {
  const { leads, folders, reports, fileMap, addLead, importLeads, updateLead, deleteLead, deleteLeads, updateLeads, addReport, storeFile } = useData();
  const { showAlert, showConfirm, showToast } = useUI();
  
  const [selectedNode, setSelectedNode] = useState<FolderNode>(folders);
  const [showImport, setShowImport] = useState(false);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [pasteData, setPasteData] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Selection State
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Lead Form State
  const [leadForm, setLeadForm] = useState<Partial<Lead>>({
    name: '',
    email: '',
    city: '',
    category: '',
    phone: '',
    status: LeadStatus.NEW,
    remarks: '',
    socialMediaLinks: []
  });

  // Temp social link input in modal
  const [newSocialLink, setNewSocialLink] = useState('');

  // Reset selection on folder change
  useEffect(() => {
    setSelectedLeadIds(new Set());
  }, [selectedNode.id]);

  // Sync selectedNode with updated folders from context
  const findNode = (root: FolderNode, id: string): FolderNode | null => {
      if (root.id === id) return root;
      if (root.children) {
          for (const child of root.children) {
              const found = findNode(child, id);
              if (found) return found;
          }
      }
      return null;
  };

  const activeNode = useMemo(() => {
      return findNode(folders, selectedNode.id);
  }, [folders, selectedNode.id]);

  const activePath = useMemo(() => {
      const findPath = (node: FolderNode, id: string): FolderNode[] | null => {
          if (node.id === id) return [node];
          if (node.children) {
              for (const child of node.children) {
                  const path = findPath(child, id);
                  if (path) return [node, ...path];
              }
          }
          return null;
      };
      return findPath(folders, selectedNode.id);
  }, [folders, selectedNode.id]);


  // Filter leads
  const filteredLeads = useMemo(() => {
    if (!activeNode) return [];

    let result = [];
    
    // 1. Tree Filter
    if (activeNode.type === 'root') {
        result = leads;
    } 
    else if (activeNode.type === 'country') {
        // Show leads belonging to this country
        const cityNames = activeNode.children?.map(c => c.name) || [];
        result = leads.filter(l => 
            l.country === activeNode.name || 
            (!l.country && cityNames.includes(l.city)) // Fallback for old data without country field
        );
    }
    else if (activeNode.type === 'city') {
        result = leads.filter(l => l.city === activeNode.name);
    }
    else if (activeNode.type === 'category') {
        let cityName = null;
        if (activePath && activePath.length >= 2) {
             const parent = activePath[activePath.length - 2];
             if (parent.type === 'city') cityName = parent.name;
        }
        
        result = leads.filter(l => 
            l.category === activeNode.name && 
            (cityName ? l.city === cityName : true)
        );
    }

    // 2. Search Filter
    if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        result = result.filter(l => 
            l.name.toLowerCase().includes(q) || 
            l.phone.includes(q) ||
            l.city.toLowerCase().includes(q) ||
            l.category.toLowerCase().includes(q) ||
            (l.email && l.email.toLowerCase().includes(q))
        );
    }

    // 3. Status Filter
    if (statusFilter !== 'All') {
        result = result.filter(l => l.status === statusFilter);
    }

    return result;
  }, [leads, activeNode, activePath, searchQuery, statusFilter]);
  
  // Bulk Actions Handlers
  const handleSelectAll = () => {
    if (selectedLeadIds.size === filteredLeads.length && filteredLeads.length > 0) {
        setSelectedLeadIds(new Set());
    } else {
        setSelectedLeadIds(new Set(filteredLeads.map(l => l.id)));
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
      if (await showConfirm(`Delete ${selectedLeadIds.size} selected leads?`, 'Bulk Delete')) {
          deleteLeads(Array.from(selectedLeadIds));
          setSelectedLeadIds(new Set());
          showToast(`${selectedLeadIds.size} leads deleted`, 'success');
      }
  };

  const handleBulkStatusUpdate = (status: string) => {
      if (!status) return;
      updateLeads(Array.from(selectedLeadIds), { status: status as LeadStatus });
      setSelectedLeadIds(new Set());
      showToast('Statuses updated successfully', 'success');
  };

  // Filter Telecaller Reports
  const myReports = useMemo(() => reports.filter(r => r.uploader === 'Telecaller'), [reports]);

  const handleDailyReportUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reportId = Math.random().toString();
    storeFile(reportId, file);

    addReport({
        id: reportId,
        fileName: file.name,
        date: new Date().toISOString().split('T')[0],
        uploader: 'Telecaller'
    });

    e.target.value = '';
    showToast("Report uploaded successfully.", 'success');
  };
  
  const handleOpenReport = (id: string) => {
      const url = fileMap[id];
      if (url) window.open(url, '_blank');
  };

  // --- Import Logic ---
  const getImportContext = () => {
      let targetCountry = 'India';
      let forcedCity = undefined;
      let forcedCategory = undefined;

      if (activePath) {
          const countryNode = activePath.find(n => n.type === 'country');
          if (countryNode) targetCountry = countryNode.name;
          const node = activePath[activePath.length - 1]; 
          if (node.type === 'city') {
              forcedCity = node.name;
          } else if (node.type === 'category') {
              forcedCategory = node.name;
              if (activePath.length >= 2) {
                  const parent = activePath[activePath.length - 2];
                  if (parent.type === 'city') forcedCity = parent.name;
              }
          }
      }
      return { targetCountry, forcedCity, forcedCategory };
  };

  // Improved Header Detection
  const identifyColumns = (headerRow: any[]) => {
    const headers = headerRow.map(h => String(h).toLowerCase().trim());
    const map: Record<string, number> = {};
    
    headers.forEach((h, i) => {
      if (h.includes('name') || h.includes('company') || h.includes('lead')) map['name'] = i;
      else if (h.includes('phone') || h.includes('mobile') || h.includes('contact')) map['phone'] = i;
      else if (h.includes('email') || h.includes('mail')) map['email'] = i;
      else if (h.includes('city') || h.includes('location')) map['city'] = i;
      else if (h.includes('category') || h.includes('niche') || h.includes('industry')) map['category'] = i;
      else if (h.includes('social') || h.includes('link') || h.includes('url') || h.includes('web') || h.includes('instagram') || h.includes('facebook')) map['social'] = i;
      else if (h.includes('remark') || h.includes('note') || h.includes('comment') || h.includes('description')) map['remarks'] = i;
      else if (h.includes('status')) map['status'] = i;
      else if (h.includes('date') || h.includes('meeting') || h.includes('appointment') || h.includes('schedule') || h.includes('time')) map['meeting'] = i;
    });
    
    if (Object.keys(map).length > 0) return map;
    return null;
  };

  // Improved Map with Heuristics
  const mapRowToLead = (row: any[], headerMap: Record<string, number> | null, forcedCity?: string, forcedCategory?: string): Partial<Lead> => {
      const val = (idx: number | undefined) => (idx !== undefined && row[idx] !== undefined) ? String(row[idx]).trim() : '';
      const rawVal = (idx: number | undefined) => (idx !== undefined) ? row[idx] : undefined;

      // 1. Use Headers if available
      if (headerMap) {
          return {
              name: val(headerMap['name']) || 'Unknown',
              phone: val(headerMap['phone']),
              email: val(headerMap['email']),
              city: forcedCity || val(headerMap['city']) || 'Unknown',
              category: forcedCategory || val(headerMap['category']) || 'General',
              socialMediaLinks: val(headerMap['social']) ? [val(headerMap['social'])] : [],
              remarks: val(headerMap['remarks']), 
              status: (val(headerMap['status']) as LeadStatus) || LeadStatus.NEW,
              meetingDate: parseImportDate(rawVal(headerMap['meeting']))
          };
      }

      // 2. Heuristic Fallback (No Headers detected)
      let name = '', phone = '', email = '', city = '', category = '', social = '', remarks = '', meetingDate = undefined;
      const remainingCols: string[] = [];

      row.forEach((cell) => {
          const str = String(cell).trim();
          if (!str) return;

          // Email Detection
          if (!email && /\S+@\S+\.\S+/.test(str)) {
              email = str;
              return;
          }
          
          // URL Detection
          if (!social && /^(http|www|instagram|facebook|linkedin)/i.test(str)) {
              social = str;
              return;
          }

          // Strict Phone Detection (at least 7 digits, symbols allowed)
          if (!phone && /^[\d\+\-\(\)\s]{7,}$/.test(str) && !str.includes('/20') && !str.includes('-20') && !str.includes(':')) {
              phone = str;
              return;
          }

          // Date Detection via Robust Parser
          if (!meetingDate) {
              const detectedDate = parseImportDate(cell); // Pass cell directly to handle cellDates
              if (detectedDate) {
                  meetingDate = detectedDate;
                  return;
              }
          }

          remainingCols.push(str);
      });

      // Second pass: Look for loose phone numbers in remaining columns (e.g. "12345")
      if (!phone) {
          const loosePhoneIdx = remainingCols.findIndex(c => /\d{5,}/.test(c));
          if (loosePhoneIdx !== -1) {
              phone = remainingCols[loosePhoneIdx];
              remainingCols.splice(loosePhoneIdx, 1);
          }
      }

      // Assign remaining columns positionally to Name, City, Category, Remarks
      // Standard order assumption: Name | City | Category | Remarks
      if (remainingCols.length > 0) name = remainingCols[0];
      if (remainingCols.length > 1 && !forcedCity) city = remainingCols[1];
      if (remainingCols.length > 2 && !forcedCategory) category = remainingCols[2];
      
      // If forced city/category exist, shift index use
      let remarkStartIndex = 3;
      if (forcedCity) remarkStartIndex--;
      if (forcedCategory) remarkStartIndex--;
      
      if (remainingCols.length > remarkStartIndex) {
          remarks = remainingCols.slice(remarkStartIndex).join(' ');
      }

      return {
          name: name || 'Unknown',
          phone: phone,
          email: email,
          city: forcedCity || city || 'Unknown',
          category: forcedCategory || category || 'General',
          socialMediaLinks: social ? [social] : [],
          remarks: remarks,
          status: LeadStatus.NEW,
          meetingDate: meetingDate
      };
  };

  const handleImportPaste = () => {
    if (!activeNode) return;
    const { targetCountry, forcedCity, forcedCategory } = getImportContext();

    const rows = pasteData.trim().split('\n');
    if (rows.length === 0) return;

    const leadsToImport: Partial<Lead>[] = [];
    
    // Check for header
    const firstRowCols = rows[0].split(/[\t,]/);
    const headerMap = identifyColumns(firstRowCols);
    const startIndex = headerMap ? 1 : 0;

    for (let i = startIndex; i < rows.length; i++) {
        const row = rows[i];
        if (!row.trim()) continue;
        const cols = row.split(/[\t]/);
        
        let mapped: Partial<Lead>;
        if (cols.length < 2 && row.includes(',')) {
             const csvCols = parseCSVLine(row);
             mapped = mapRowToLead(csvCols, headerMap, forcedCity, forcedCategory);
        } else {
             mapped = mapRowToLead(cols, headerMap, forcedCity, forcedCategory);
        }
        
        leadsToImport.push({
            ...mapped,
            status: mapped.status || LeadStatus.NEW,
            // Do not overwrite remarks if they are empty
            remarks: mapped.remarks || '' 
        });
    }

    if (leadsToImport.length > 0) {
        importLeads(leadsToImport, targetCountry);
        setPasteData('');
        setShowImport(false);
        showAlert(`Successfully imported ${leadsToImport.length} leads into ${targetCountry} > ${forcedCity || 'File City'}!`, 'Import Success');
    }
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

  const processFile = (file: File) => {
    const { targetCountry, forcedCity, forcedCategory } = getImportContext();
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    if (isExcel) {
         const reader = new FileReader();
         reader.onload = (e) => {
            const data = e.target?.result;
            if (!data) return;
            // IMPORTANT: Use cellDates: true to get JS Date objects directly
            const workbook = read(data, { type: 'array', cellDates: true });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

            if (jsonData.length === 0) return;

            const headerMap = identifyColumns(jsonData[0]);
            const startIndex = headerMap ? 1 : 0;
            const leadsToImport: Partial<Lead>[] = [];

            for (let i = startIndex; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (!row || row.length === 0) continue;
                
                const mapped = mapRowToLead(row, headerMap, forcedCity, forcedCategory);
                leadsToImport.push({
                    ...mapped,
                    status: mapped.status || LeadStatus.NEW,
                    remarks: mapped.remarks || ''
                });
            }

            if (leadsToImport.length > 0) {
                importLeads(leadsToImport, targetCountry);
                setShowImport(false);
                showAlert(`Successfully imported ${leadsToImport.length} leads into ${targetCountry} > ${forcedCity || 'File City'}!`, 'Import Success');
            }
         };
         reader.readAsArrayBuffer(file);
    } else {
        // CSV Processing
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target?.result as string;
          const rows = text.split('\n');
          const leadsToImport: Partial<Lead>[] = [];
          
          if (rows.length === 0) return;
          
          const firstRowCols = parseCSVLine(rows[0]);
          const headerMap = identifyColumns(firstRowCols);
          const startIndex = headerMap ? 1 : 0;

          for (let i = startIndex; i < rows.length; i++) {
            const row = rows[i].trim();
            if (!row) continue;
            const cols = parseCSVLine(row);
            if (cols.length >= 1) {
                const mapped = mapRowToLead(cols, headerMap, forcedCity, forcedCategory);
                leadsToImport.push({
                    ...mapped,
                    status: mapped.status || LeadStatus.NEW,
                    remarks: mapped.remarks || ''
                });
            }
          }
          
          if (leadsToImport.length > 0) {
              importLeads(leadsToImport, targetCountry);
              setShowImport(false);
              showAlert(`Successfully imported ${leadsToImport.length} leads into ${targetCountry} > ${forcedCity || 'File City'}!`, 'Import Success');
          }
        };
        reader.readAsText(file);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
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
          processFile(e.dataTransfer.files[0]);
          e.dataTransfer.clearData();
      }
  };

  const handleSaveLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeNode) return;

    if (editingLeadId) {
        updateLead(editingLeadId, leadForm);
        showToast('Lead updated successfully', 'success');
    } else {
        let country = 'India';
        if (activePath) {
             const cNode = activePath.find(n => n.type === 'country');
             if (cNode) country = cNode.name;
        }

        addLead({
            id: generateId(),
            name: leadForm.name || 'New Lead',
            email: leadForm.email || '',
            city: leadForm.city || (activeNode.type === 'city' ? activeNode.name : 'Unknown'),
            country: country,
            category: leadForm.category || (activeNode.type === 'category' ? activeNode.name : 'General'),
            phone: leadForm.phone || '',
            status: leadForm.status || LeadStatus.NEW,
            remarks: leadForm.remarks || '',
            meetingDate: leadForm.meetingDate,
            socialMediaLinks: leadForm.socialMediaLinks || []
        } as Lead);
        showToast('Lead added successfully', 'success');
    }
    closeModal();
  };

  const openEditModal = (lead: Lead) => {
      setLeadForm(lead);
      setEditingLeadId(lead.id);
      setNewSocialLink('');
      setShowLeadModal(true);
  }

  const openAddModal = () => {
      if (!activeNode) return;
      setLeadForm({
        name: '',
        email: '',
        city: activeNode.type === 'city' ? activeNode.name : '',
        category: activeNode.type === 'category' ? activeNode.name : '',
        phone: '',
        status: LeadStatus.NEW,
        remarks: '',
        socialMediaLinks: []
      });
      setEditingLeadId(null);
      setNewSocialLink('');
      setShowLeadModal(true);
  }

  const closeModal = () => {
      setShowLeadModal(false);
      setEditingLeadId(null);
  }

  const addSocialLink = () => {
    if(newSocialLink) {
        setLeadForm(prev => ({
            ...prev,
            socialMediaLinks: [...(prev.socialMediaLinks || []), newSocialLink]
        }));
        setNewSocialLink('');
    }
  };

  const removeSocialLink = (index: number) => {
      setLeadForm(prev => ({
          ...prev,
          socialMediaLinks: (prev.socialMediaLinks || []).filter((_, i) => i !== index)
      }));
  };

  const getSocialIcon = (url: string) => {
    if (url.includes('instagram')) return <Instagram size={14} className="text-pink-600" />;
    if (url.includes('facebook')) return <Facebook size={14} className="text-blue-600" />;
    if (url.includes('linkedin')) return <Linkedin size={14} className="text-blue-800" />;
    return <Globe size={14} className="text-gray-500" />;
  };

  // Prepare options for custom select
  const statusOptions = ['All', ...Object.values(LeadStatus)];
  const leadStatusOptions = Object.values(LeadStatus);

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
      {/* Sidebar Tree */}
      <div className="w-64 border-r border-gray-200 flex flex-col bg-gray-50 shrink-0">
        <div className="p-4 border-b border-gray-200 bg-white flex justify-between items-center">
          <h2 className="font-bold text-gray-700 flex items-center">
            <Database size={18} className="mr-2 text-indigo-600" />
            Directory
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          <TreeNode node={folders} onSelect={setSelectedNode} selectedId={selectedNode?.id} />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {!activeNode ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                <Folder size={48} className="mb-2 text-gray-300 opacity-50" />
                <p className="font-medium text-gray-500">Folder unavailable</p>
                <p className="text-xs mt-1">It may have been deleted. Please select another folder.</p>
            </div>
        ) : (
        <>
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white z-10">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-800 truncate flex items-center gap-2">
                {activeNode.type === 'country' && <Globe size={20} className="text-blue-500"/>}
                {activeNode.type === 'city' && <MapPin size={20} className="text-red-500"/>}
                {activeNode.name}
            </h1>
            <p className="text-sm text-gray-500">{filteredLeads.length} leads found</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
             {/* Filters */}
             <div className="flex items-center gap-2 flex-1 sm:flex-none">
                <div className="relative flex-1 sm:w-48">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                    <input 
                        type="text" 
                        placeholder="Search name, phone..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                </div>
                <div className="w-40">
                  <CustomSelect 
                    value={statusFilter} 
                    onChange={setStatusFilter} 
                    options={statusOptions} 
                    placeholder="Status"
                  />
                </div>
             </div>

             {/* Actions */}
             <div className="flex gap-2">
                <button 
                  onClick={() => setShowReportModal(true)}
                  className="flex items-center justify-center bg-orange-100 text-orange-700 px-4 py-2 rounded-lg hover:bg-orange-200 transition-colors shadow-sm text-sm font-medium"
                >
                  <FileText size={16} className="mr-2" />
                  Reports
                </button>
                <button 
                  onClick={() => setShowImport(!showImport)}
                  className="flex items-center justify-center bg-indigo-100 text-indigo-700 px-4 py-2 rounded-lg hover:bg-indigo-200 transition-colors shadow-sm text-sm font-medium"
                >
                  <FilePlus size={16} className="mr-2" />
                  Import
                </button>
                <button 
                  onClick={openAddModal}
                  className="flex items-center justify-center bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors shadow-sm text-sm font-medium"
                >
                  <Plus size={16} className="mr-2" />
                  Add Lead
                </button>
             </div>
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selectedLeadIds.size > 0 && (
            <div className="bg-indigo-600 text-white px-4 py-2 flex justify-between items-center animate-in slide-in-from-top-2 shadow-md relative z-10">
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
                        className="text-gray-900"
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

        {/* Import Modal Area */}
        {showImport && (
          <div className="p-4 bg-indigo-50 border-b border-indigo-100 animate-in slide-in-from-top-2">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-bold text-indigo-900 flex items-center"><Upload size={16} className="mr-2"/> Import Leads</h3>
                <button onClick={() => setShowImport(false)} className="text-indigo-400 hover:text-indigo-600"><X size={18}/></button>
            </div>
            
            <div className="mb-4 bg-white/50 border border-indigo-100 rounded p-2 text-xs flex items-center text-indigo-700">
                <span className="font-bold mr-1">Target Folder:</span>
                <span className="flex items-center">
                    {activePath?.map((n, i) => (
                        <React.Fragment key={n.id}>
                            {i > 0 && <ChevronRight size={10} className="mx-0.5 text-gray-400"/>}
                            {n.name}
                        </React.Fragment>
                    )) || 'Global'}
                </span>
                <span className="ml-2 text-indigo-400 italic">
                    (Imported data will be forced into this location)
                </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <label 
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center group transition-all relative cursor-pointer
                        ${isDragging ? 'border-indigo-500 bg-indigo-100' : 'border-indigo-200 bg-white hover:border-indigo-400'}`}
                >
                    <FileUp size={32} className="text-indigo-300 mb-2 group-hover:text-indigo-500 transition-colors" />
                    <p className="text-sm font-medium text-gray-700">Click or Drag CSV / Excel File</p>
                    <p className="text-xs text-gray-400 mt-1">Smart Column Detection Enabled</p>
                    <input 
                        type="file" 
                        accept=".csv, .xlsx, .xls"
                        onChange={handleFileUpload}
                        className="hidden"
                    />
                </label>

                <div className="flex flex-col">
                     <textarea
                        className="flex-1 w-full p-3 border border-indigo-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none mb-2 min-h-[100px]"
                        placeholder={`Paste data here...`}
                        value={pasteData}
                        onChange={(e) => setPasteData(e.target.value)}
                    ></textarea>
                    <button onClick={handleImportPaste} className="self-end px-4 py-2 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center shadow-sm">
                        <Save size={14} className="mr-1" /> Process Pasted Data
                    </button>
                </div>
            </div>
          </div>
        )}

        {/* Add/Edit Lead Modal */}
        {showLeadModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100]">
            <div className="bg-white p-6 rounded-xl w-[500px] shadow-2xl animate-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4 border-b pb-3">
                    <h3 className="text-lg font-bold text-gray-800">{editingLeadId ? 'Edit Lead' : 'Add New Lead'}</h3>
                    <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                </div>
                <form onSubmit={handleSaveLead} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Name</label>
                            <input type="text" className="w-full border border-gray-300 p-2 rounded text-sm focus:ring-1 focus:ring-indigo-500 outline-none" value={leadForm.name} onChange={e => setLeadForm({...leadForm, name: e.target.value})} required />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
                            <input type="email" className="w-full border border-gray-300 p-2 rounded text-sm focus:ring-1 focus:ring-indigo-500 outline-none" value={leadForm.email} onChange={e => setLeadForm({...leadForm, email: e.target.value})} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone</label>
                            <input type="text" className="w-full border border-gray-300 p-2 rounded text-sm focus:ring-1 focus:ring-indigo-500 outline-none" value={leadForm.phone} onChange={e => setLeadForm({...leadForm, phone: e.target.value})} required />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">City</label>
                            <input type="text" className="w-full border border-gray-300 p-2 rounded text-sm focus:ring-1 focus:ring-indigo-500 outline-none" value={leadForm.city} onChange={e => setLeadForm({...leadForm, city: e.target.value})} required />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category</label>
                        <input type="text" className="w-full border border-gray-300 p-2 rounded text-sm focus:ring-1 focus:ring-indigo-500 outline-none" value={leadForm.category} onChange={e => setLeadForm({...leadForm, category: e.target.value})} required />
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Social Media Links</label>
                        <div className="flex space-x-2 mb-2">
                            <input 
                                type="text" 
                                className="flex-1 border border-gray-300 p-2 rounded text-sm focus:ring-1 focus:ring-indigo-500 outline-none" 
                                placeholder="https://instagram.com/..." 
                                value={newSocialLink} 
                                onChange={e => setNewSocialLink(e.target.value)} 
                            />
                            <button type="button" onClick={addSocialLink} className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded text-sm font-medium hover:bg-indigo-200">Add</button>
                        </div>
                        <div className="space-y-1">
                            {leadForm.socialMediaLinks?.map((link, i) => (
                                <div key={i} className="flex justify-between items-center bg-white p-1.5 rounded border border-gray-200 text-xs">
                                    <span className="truncate flex-1 text-gray-600 mr-2">{link}</span>
                                    <button type="button" onClick={() => removeSocialLink(i)} className="text-red-500 hover:text-red-700"><X size={12}/></button>
                                </div>
                            ))}
                            {(!leadForm.socialMediaLinks || leadForm.socialMediaLinks.length === 0) && <p className="text-xs text-gray-400 italic">No links added.</p>}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status</label>
                        <CustomSelect 
                          value={leadForm.status || LeadStatus.NEW}
                          onChange={(val) => setLeadForm({...leadForm, status: val as LeadStatus})}
                          options={leadStatusOptions}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Remarks</label>
                        <textarea className="w-full border border-gray-300 p-2 rounded text-sm focus:ring-1 focus:ring-indigo-500 outline-none" rows={2} value={leadForm.remarks} onChange={e => setLeadForm({...leadForm, remarks: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Meeting Date</label>
                        <input 
                          type="datetime-local" 
                          className="w-full border border-gray-300 p-2 rounded text-sm focus:ring-1 focus:ring-indigo-500 outline-none" 
                          value={formatForInput(leadForm.meetingDate)}
                          onChange={e => setLeadForm({...leadForm, meetingDate: e.target.value})} 
                        />
                    </div>
                    <div className="pt-4 flex justify-end space-x-2 border-t mt-2">
                        <button type="button" onClick={closeModal} className="px-4 py-2 text-gray-600 text-sm hover:bg-gray-100 rounded">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded text-sm font-medium hover:bg-indigo-700">Save Lead</button>
                    </div>
                </form>
            </div>
          </div>
        )}
        
        {/* Daily Reports Modal */}
        {showReportModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
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
                              <span>Select File</span>
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

        {/* CRM Table */}
        <div className="flex-1 overflow-auto bg-white relative">
          <table className="w-full text-left text-sm whitespace-nowrap">
            {/* Sticky header Z-index increased to 30 */}
            <thead className="bg-gray-50 sticky top-0 z-30 shadow-sm text-gray-600 font-semibold uppercase tracking-wider border-b border-gray-200">
              <tr>
                <th className="w-10 px-4 py-3 text-center">
                   <input 
                      type="checkbox" 
                      className="cursor-pointer rounded text-indigo-600 focus:ring-indigo-500"
                      onChange={handleSelectAll}
                      checked={filteredLeads.length > 0 && selectedLeadIds.size === filteredLeads.length}
                   />
                </th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Socials</th>
                <th className="px-4 py-3 w-40">Status</th>
                <th className="px-4 py-3">Remarks</th>
                <th className="px-4 py-3">Meeting</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLeads.map(lead => (
                <tr key={lead.id} className={`hover:bg-blue-50 transition-colors group ${selectedLeadIds.has(lead.id) ? 'bg-indigo-50' : ''}`}>
                  <td className="px-4 py-3 text-center">
                     <input 
                        type="checkbox" 
                        className="cursor-pointer rounded text-indigo-600 focus:ring-indigo-500"
                        checked={selectedLeadIds.has(lead.id)}
                        onChange={() => toggleSelection(lead.id)}
                     />
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{lead.name}</td>
                  <td className="px-4 py-3 text-gray-600">{lead.email || '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{lead.city}</td>
                  <td className="px-4 py-3 text-gray-500">{lead.category}</td>
                  <td className="px-4 py-3 font-mono text-gray-600">{lead.phone}</td>
                  <td className="px-4 py-3">
                    <div className="flex space-x-1">
                        {lead.socialMediaLinks?.map((link, i) => (
                            <a key={i} href={link} target="_blank" rel="noreferrer" className="p-1 hover:bg-gray-200 rounded-full transition-colors" title={link}>
                                {getSocialIcon(link)}
                            </a>
                        ))}
                        {(!lead.socialMediaLinks || lead.socialMediaLinks.length === 0) && <span className="text-gray-300">-</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="w-36 relative">
                       <CustomSelect 
                         value={lead.status}
                         onChange={(val) => updateLead(lead.id, { status: val as LeadStatus })}
                         options={leadStatusOptions}
                         className="text-xs"
                       />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <input 
                      type="text" 
                      value={lead.remarks || ''}
                      onChange={(e) => updateLead(lead.id, { remarks: e.target.value })}
                      placeholder="Add remarks..."
                      className="w-full bg-transparent border-b border-transparent focus:border-indigo-500 outline-none text-gray-600 placeholder-gray-300"
                    />
                  </td>
                   <td className="px-4 py-3">
                     <div className="relative">
                         <input 
                          type="datetime-local"
                          value={formatForInput(lead.meetingDate)}
                          onChange={(e) => updateLead(lead.id, { meetingDate: e.target.value })}
                          className="bg-transparent text-gray-500 text-xs focus:text-indigo-600 outline-none w-full cursor-pointer"
                        />
                        {!lead.meetingDate && <Calendar size={14} className="text-gray-300 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"/>}
                     </div>
                   </td>
                   <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEditModal(lead)} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded" title="Edit"><Edit2 size={14} /></button>
                          <button onClick={async () => { if(await showConfirm('Delete lead?', 'Confirm Delete')) { deleteLead(lead.id); showToast('Lead deleted', 'error'); }}} className="text-red-600 hover:bg-red-50 p-1.5 rounded" title="Delete"><Trash2 size={14} /></button>
                      </div>
                   </td>
                </tr>
              ))}
              {filteredLeads.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-gray-400">
                    {searchQuery || statusFilter !== 'All' ? 'No leads match your filters.' : 'No leads found here. Select a folder or add data!'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </>
        )}
      </div>
    </div>
  );
};

export default TelecallerPanel;
