
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Lead, Project, Campaign, DailyReport, LeadStatus, ProjectStatus, CampaignPlatform, UserRole, FolderNode, CampaignStatus } from '../types';

interface DataContextType {
  leads: Lead[];
  projects: Project[];
  campaigns: Campaign[];
  reports: DailyReport[];
  folders: FolderNode;
  fileMap: Record<string, string>; // ID -> Blob URL
  
  // Leads
  addLead: (lead: Lead) => void;
  importLeads: (leads: Partial<Lead>[], countryName?: string) => void; // Added countryName param
  updateLead: (id: string, updates: Partial<Lead>) => void;
  deleteLead: (id: string) => void;
  // Bulk Lead Actions
  deleteLeads: (ids: string[]) => void;
  updateLeads: (ids: string[], updates: Partial<Lead>) => void;

  // Projects
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;

  // Campaigns
  addCampaign: (campaign: Campaign) => void;
  updateCampaign: (id: string, updates: Partial<Campaign>) => void;
  deleteCampaign: (id: string) => void;

  // Reports
  addReport: (report: DailyReport) => void;

  // Files
  storeFile: (id: string, file: File) => void;

  // Folders
  addFolder: (parentId: string, name: string, type: 'country' | 'city' | 'category') => void;
  renameFolder: (id: string, name: string) => void;
  deleteFolder: (id: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Storage Keys
const STORAGE_KEYS = {
  LEADS: 'raulo_crm_leads',
  PROJECTS: 'raulo_crm_projects',
  CAMPAIGNS: 'raulo_crm_campaigns',
  REPORTS: 'raulo_crm_reports',
  FOLDERS: 'raulo_crm_folders',
};

// Helper for Local Date YYYY-MM-DD
const getLocalDateStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Mock Data
const INITIAL_LEADS: Lead[] = [
  { id: '1', name: 'Supreme Interiors', email: 'info@supreme.com', city: 'Mumbai', country: 'India', category: 'Interior Designers', phone: '099201 61633', status: LeadStatus.INTERESTED_BOOKED, meetingDate: '2023-10-15T14:00', socialMediaLinks: ['https://instagram.com/supreme_interiors'] },
  { id: '2', name: 'Artneit Designs', email: 'contact@artneit.com', city: 'Mumbai', country: 'India', category: 'Interior Designers', phone: '075068 03602', status: LeadStatus.INTERESTED_NOT_BOOKED, remarks: 'Busy, call later', socialMediaLinks: [] },
  { id: '3', name: 'Bandra Cafe', email: 'hello@bandracafe.com', city: 'Mumbai', country: 'India', category: 'Cafes', phone: '098765 43210', status: LeadStatus.NEW, socialMediaLinks: ['https://facebook.com/bandracafe', 'https://instagram.com/bandracafe'] },
  { id: '4', name: 'Delhi Estate', email: 'sales@delhiestate.in', city: 'Delhi', country: 'India', category: 'Real Estate', phone: '011223 34455', status: LeadStatus.NOT_INTERESTED, socialMediaLinks: [] },
];

const INITIAL_PROJECTS: Project[] = [
  { 
    id: '1', 
    name: 'Raulo CRM V1', 
    client: 'Internal', 
    status: ProjectStatus.ONGOING, 
    description: 'Developing the internal CRM system.', 
    progress: 65, 
    documents: ['specs.pdf'],
    milestones: [
        { id: 'm1', title: 'UI Design', isCompleted: true }, 
        { id: 'm2', title: 'Frontend Dev', isCompleted: true },
        { id: 'm3', title: 'Backend Integration', isCompleted: false }
    ] 
  },
  { 
    id: '2', 
    name: 'E-commerce Redesign', 
    client: 'ShopifyClient', 
    status: ProjectStatus.UPCOMING, 
    description: 'Redesigning the checkout flow.', 
    progress: 0, 
    documents: [],
    milestones: [{ id: 'm4', title: 'Kickoff Meeting', isCompleted: false }] 
  },
  { 
    id: '3', 
    name: 'Social Booster', 
    client: 'InfluencerAgency', 
    status: ProjectStatus.COMPLETED, 
    description: 'Setting up social media handles and content.', 
    progress: 100, 
    documents: [],
    milestones: [{ id: 'm5', title: 'Create Accounts', isCompleted: true }] 
  }
];

// Calculate statuses for mock data based on today
const today = getLocalDateStr();
const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

const INITIAL_CAMPAIGNS: Campaign[] = [
  { 
    id: '1', 
    name: 'Winter Email Blast', 
    platform: CampaignPlatform.EMAIL, 
    leadsGenerated: 2, 
    status: 'Active', 
    startDate: today,
    dueDate: nextWeek,
    documents: ['email_copy_v1.pdf'],
    leads: [
      { id: 'e1', name: 'John Doe', email: 'john@corp.com', companyName: 'MegaCorp', status: 'Contacted' },
      { id: 'e2', name: 'Jane Smith', email: 'jane@start.up', companyName: 'StartUp Inc', status: 'Replied' }
    ]
  },
  { 
    id: '2', 
    name: 'CEO Outreach', 
    platform: CampaignPlatform.LINKEDIN, 
    leadsGenerated: 1, 
    status: 'Past', 
    startDate: lastWeek,
    dueDate: yesterday,
    documents: [],
    leads: [
      { id: 'l1', name: 'Michael Scott', linkedinProfile: 'linkedin.com/in/mscott', status: 'Converted' }
    ]
  },
  { 
    id: '3', 
    name: 'Influencer Collab', 
    platform: CampaignPlatform.INSTAGRAM, 
    leadsGenerated: 0, 
    status: 'Upcoming', 
    startDate: nextWeek,
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    documents: ['influencer_list.xlsx'],
    leads: []
  },
];

const INITIAL_FOLDERS: FolderNode = {
  id: 'root',
  name: 'Global Database',
  type: 'root',
  children: [
    {
      id: 'in',
      name: 'India',
      type: 'country',
      children: [
        {
          id: 'mumbai',
          name: 'Mumbai',
          type: 'city',
          children: [
            { id: 'mum-real', name: 'Real Estate', type: 'category' },
            { id: 'mum-cafe', name: 'Cafes', type: 'category' },
            { id: 'mum-int', name: 'Interior Designers', type: 'category' },
          ]
        },
        {
          id: 'delhi',
          name: 'Delhi',
          type: 'city',
          children: [
            { id: 'del-real', name: 'Real Estate', type: 'category' },
          ]
        }
      ]
    }
  ]
};

// Helper to load state from LocalStorage
const loadFromStorage = <T,>(key: string, fallback: T): T => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch (e) {
    console.error(`Failed to load ${key} from local storage`, e);
    return fallback;
  }
};

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [leads, setLeads] = useState<Lead[]>(() => loadFromStorage(STORAGE_KEYS.LEADS, INITIAL_LEADS));
  const [projects, setProjects] = useState<Project[]>(() => loadFromStorage(STORAGE_KEYS.PROJECTS, INITIAL_PROJECTS));
  const [campaigns, setCampaigns] = useState<Campaign[]>(() => loadFromStorage(STORAGE_KEYS.CAMPAIGNS, INITIAL_CAMPAIGNS));
  const [reports, setReports] = useState<DailyReport[]>(() => loadFromStorage(STORAGE_KEYS.REPORTS, []));
  const [folders, setFolders] = useState<FolderNode>(() => loadFromStorage(STORAGE_KEYS.FOLDERS, INITIAL_FOLDERS));
  const [fileMap, setFileMap] = useState<Record<string, string>>({});

  // Persist to LocalStorage on changes
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(leads)); }, [leads]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects)); }, [projects]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.CAMPAIGNS, JSON.stringify(campaigns)); }, [campaigns]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports)); }, [reports]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(folders)); }, [folders]);

  // Automatic Campaign Status Update based on Date Range
  useEffect(() => {
    const todayStr = getLocalDateStr();
    
    setCampaigns(prevCampaigns => {
      let hasChanges = false;
      const updated = prevCampaigns.map(c => {
        let newStatus: CampaignStatus = c.status;
        
        if (todayStr > c.dueDate) {
          newStatus = 'Past';
        } else if (todayStr >= c.startDate && todayStr <= c.dueDate) {
          newStatus = 'Active';
        } else if (todayStr < c.startDate) {
          newStatus = 'Upcoming';
        }

        if (newStatus !== c.status) {
          hasChanges = true;
          return { ...c, status: newStatus };
        }
        return c;
      });

      return hasChanges ? updated : prevCampaigns;
    });
  }, []); // Run on mount

  // Lead Actions - prepend to show new on top
  const addLead = (lead: Lead) => setLeads(prev => [lead, ...prev]);
  const updateLead = (id: string, updates: Partial<Lead>) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  };
  const deleteLead = (id: string) => setLeads(prev => prev.filter(l => l.id !== id));

  // Bulk Lead Actions
  const deleteLeads = (ids: string[]) => {
    setLeads(prev => prev.filter(l => !ids.includes(l.id)));
  };
  
  const updateLeads = (ids: string[], updates: Partial<Lead>) => {
    setLeads(prev => prev.map(l => ids.includes(l.id) ? { ...l, ...updates } : l));
  };

  // Bulk Import with Folder Auto-Creation
  const importLeads = (newLeadsData: Partial<Lead>[], countryName: string = 'India') => {
    // 1. Sanitize City Names to prevent "Road Names" or "City, State" clutter
    const sanitizeCity = (raw: string) => {
        if (!raw) return 'Unknown';
        let clean = raw.split(/[,(]/)[0];
        if (clean.includes(' - ')) {
            clean = clean.split(' - ')[0];
        }
        clean = clean.trim();
        clean = clean.replace(/\w\S*/g, (w) => (w.replace(/^\w/, (c) => c.toUpperCase())));
        return clean || 'Unknown';
    };

    const processedLeads = newLeadsData.map(l => ({
        ...l,
        city: l.city ? sanitizeCity(l.city) : 'Unknown',
        category: l.category ? l.category.trim() : 'General',
        country: countryName
    }));

    setFolders(prev => {
        const next = JSON.parse(JSON.stringify(prev));
        const ensureChild = (parent: FolderNode, name: string, type: FolderNode['type']) => {
            let child = parent.children?.find(c => c.name.trim().toLowerCase() === name.trim().toLowerCase());
            if (!child) {
                child = {
                    id: Math.random().toString(36).substr(2, 9),
                    name: name.trim(),
                    type,
                    children: []
                };
                parent.children = [...(parent.children || []), child];
            }
            return child;
        };

        // Determine target country folder
        let cName = countryName;
        let countryNode = next.children?.find((c: FolderNode) => c.name.trim().toLowerCase() === cName.trim().toLowerCase());
        
        if (!countryNode) {
             countryNode = ensureChild(next, cName, 'country');
        }

        processedLeads.forEach(lead => {
            const city = lead.city;
            const category = lead.category;
            if (city && category) {
                const cityNode = ensureChild(countryNode!, city!, 'city');
                ensureChild(cityNode, category!, 'category');
            }
        });

        return next;
    });

    setLeads(prev => {
        const readyLeads = processedLeads.map(l => ({
            id: l.id || Math.random().toString(36).substr(2, 9),
            name: l.name || 'Unknown',
            email: l.email || '',
            city: l.city || 'Unknown',
            country: l.country || countryName,
            category: l.category || 'General',
            phone: l.phone || '',
            status: l.status || LeadStatus.NEW,
            remarks: l.remarks || '',
            meetingDate: l.meetingDate,
            socialMediaLinks: l.socialMediaLinks || []
        } as Lead));
        return [...readyLeads, ...prev];
    });
  };

  // Project Actions
  const addProject = (project: Project) => setProjects(prev => [...prev, project]);
  const updateProject = (id: string, updates: Partial<Project>) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };
  const deleteProject = (id: string) => {
      setProjects(prev => prev.filter(p => p.id !== id));
  }

  // Campaign Actions
  const addCampaign = (campaign: Campaign) => setCampaigns(prev => [...prev, campaign]);
  const updateCampaign = (id: string, updates: Partial<Campaign>) => {
    setCampaigns(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };
  const deleteCampaign = (id: string) => setCampaigns(prev => prev.filter(c => c.id !== id));

  // Report Actions
  const addReport = (report: DailyReport) => setReports(prev => [report, ...prev]);

  // File Actions
  const storeFile = (id: string, file: File) => {
    const url = URL.createObjectURL(file);
    setFileMap(prev => ({ ...prev, [id]: url }));
  };

  // Folder Actions (Recursive)
  const addFolder = (parentId: string, name: string, type: 'country' | 'city' | 'category') => {
    const newFolder: FolderNode = { id: Math.random().toString(36).substr(2, 9), name, type, children: [] };
    const addNodeRecursive = (node: FolderNode): FolderNode => {
      if (node.id === parentId) {
        return { ...node, children: [...(node.children || []), newFolder] };
      }
      if (node.children) {
        return { ...node, children: node.children.map(addNodeRecursive) };
      }
      return node;
    };
    setFolders(prev => addNodeRecursive(prev));
  };

  const renameFolder = (id: string, name: string) => {
    const updateNodeRecursive = (node: FolderNode): FolderNode => {
      if (node.id === id) return { ...node, name };
      if (node.children) return { ...node, children: node.children.map(updateNodeRecursive) };
      return node;
    };
    setFolders(prev => updateNodeRecursive(prev));
  };

  const deleteFolder = (id: string) => {
    let targetNode: FolderNode | null = null;
    let targetParent: FolderNode | null = null;
    const findTarget = (node: FolderNode, parent: FolderNode | null): boolean => {
        if (node.id === id) {
            targetNode = node;
            targetParent = parent;
            return true;
        }
        if (node.children) {
            for (const child of node.children) {
                if (findTarget(child, node)) return true;
            }
        }
        return false;
    };
    findTarget(folders, null);

    if (targetNode) {
        const node = targetNode as FolderNode;
        const parent = targetParent;
        setLeads(prev => prev.filter(l => {
            if (node.type === 'category' && parent?.type === 'city') {
                return !(l.city === parent.name && l.category === node.name);
            }
            if (node.type === 'city') {
                return l.city !== node.name;
            }
            if (node.type === 'country') {
                const cities = node.children?.map(c => c.name) || [];
                // Delete leads from this country (checking city membership as proxy if country field missing, or explicit country)
                return !(l.country === node.name || (!l.country && cities.includes(l.city)));
            }
            return true;
        }));

        const deleteNodeRecursive = (n: FolderNode): FolderNode => {
            if (n.children) {
                const filteredChildren = n.children.filter(child => child.id !== id);
                if (filteredChildren.length !== n.children.length) {
                    return { ...n, children: filteredChildren };
                }
                return { ...n, children: n.children.map(deleteNodeRecursive) };
            }
            return n;
        };
        
        setFolders(prev => deleteNodeRecursive(prev));
    }
  };

  return (
    <DataContext.Provider value={{
      leads,
      projects,
      campaigns,
      reports,
      folders,
      fileMap,
      addLead,
      importLeads,
      updateLead,
      deleteLead,
      deleteLeads,
      updateLeads,
      addProject,
      updateProject,
      deleteProject,
      addCampaign,
      updateCampaign,
      deleteCampaign,
      addReport,
      storeFile,
      addFolder,
      renameFolder,
      deleteFolder
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};