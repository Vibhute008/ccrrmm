
export enum UserRole {
  BOSS = 'BOSS',
  SALES_MANAGER = 'SALES_MANAGER',
  TELECALLER = 'TELECALLER',
  TECH_LEAD = 'TECH_LEAD',
}

export interface User {
  email: string;
  name: string;
  role: UserRole;
}

// Telecaller Types
export enum LeadStatus {
  NEW = 'New',
  INTERESTED_BOOKED = 'Interested - Meeting Booked',
  INTERESTED_NOT_BOOKED = 'Interested - Not Booked',
  NOT_INTERESTED = 'Not Interested',
  FOLLOW_UP = 'Follow Up',
}

export interface Lead {
  id: string;
  name: string;
  email?: string; // Added email field
  city: string;
  country?: string; 
  category: string; 
  phone: string;
  status: LeadStatus;
  firstCallDate?: string;
  followUpDate?: string;
  meetingDate?: string;
  remarks?: string;
  socialMediaLinks?: string[]; // Array of URLs
}

// Sales Manager Types
export enum CampaignPlatform {
  EMAIL = 'Email',
  LINKEDIN = 'LinkedIn',
  INSTAGRAM = 'Instagram',
}

export interface CampaignLead {
  id: string;
  name?: string; // For Email/LinkedIn
  // Instagram specific
  instagramHandle?: string;
  followersCount?: string;
  // LinkedIn specific
  linkedinProfile?: string;
  // Email specific
  email?: string;
  companyName?: string;
  status: 'Contacted' | 'Replied' | 'Converted' | 'Pending';
}

export type CampaignStatus = 'Upcoming' | 'Active' | 'Past';

export interface Campaign {
  id: string;
  name: string;
  platform: CampaignPlatform;
  leadsGenerated: number; // kept for summary stats
  status: CampaignStatus;
  startDate: string; // YYYY-MM-DD
  dueDate: string;   // YYYY-MM-DD
  leads: CampaignLead[]; // Detailed leads
  documents: string[]; // Attached files (screenshots, lists, etc)
}

export interface DailyReport {
  id: string;
  date: string;
  fileName: string;
  uploader: string;
}

// Tech Lead Types
export enum ProjectStatus {
  UPCOMING = 'Upcoming',
  ONGOING = 'Ongoing',
  COMPLETED = 'Completed',
}

export interface Milestone {
  id: string;
  title: string;
  isCompleted: boolean;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  status: ProjectStatus;
  description: string;
  milestones: Milestone[];
  documents: string[]; // Mock file names
  progress: number; // 0-100
}

// Tree Structure for Telecaller
export interface FolderNode {
  id: string;
  name: string;
  children?: FolderNode[];
  type: 'root' | 'country' | 'city' | 'category';
}