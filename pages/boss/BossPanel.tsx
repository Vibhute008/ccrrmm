
import React, { useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useUI } from '../../context/UIContext';
import { LeadStatus, CampaignPlatform } from '../../types';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, TrendingUp, PhoneCall, Code, ExternalLink, FileText, ArrowRight, Activity, CalendarCheck, CheckCircle2, Target, ThumbsUp, Clock, Mail, Instagram, Linkedin } from 'lucide-react';
import { Link } from 'react-router-dom';

const BossPanel = () => {
  const { leads, projects, campaigns, reports, fileMap } = useData();
  const { showAlert } = useUI();

  const totalLeads = leads.length;
  const bookedMeetings = leads.filter(l => l.status === LeadStatus.INTERESTED_BOOKED).length;
  const conversionRate = totalLeads > 0 ? ((bookedMeetings / totalLeads) * 100).toFixed(1) : 0;
  
  const totalProjects = projects.length;
  const ongoingProjects = projects.filter(p => p.status === 'Ongoing').length;
  const completedProjects = projects.filter(p => p.status === 'Completed').length;
  
  const totalCampaigns = campaigns.length;
  const activeCampaigns = useMemo(() => campaigns.filter(c => c.status === 'Active').length, [campaigns]);

  const leadStatusData = [
    { name: 'Booked', value: leads.filter(l => l.status === LeadStatus.INTERESTED_BOOKED).length },
    { name: 'Interested', value: leads.filter(l => l.status === LeadStatus.INTERESTED_NOT_BOOKED).length },
    { name: 'Not Interested', value: leads.filter(l => l.status === LeadStatus.NOT_INTERESTED).length },
    { name: 'New', value: leads.filter(l => l.status === LeadStatus.NEW).length },
    { name: 'Follow Up', value: leads.filter(l => l.status === LeadStatus.FOLLOW_UP).length },
  ].filter(d => d.value > 0); 

  const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6366f1', '#3b82f6'];

  const campaignStats = useMemo(() => {
    let total = 0;
    let converted = 0;
    let interested = 0;
    let pending = 0;
    let contacted = 0;

    campaigns.forEach(c => {
      total += c.leads.length;
      c.leads.forEach(l => {
        if (l.status === 'Converted') converted++;
        else if (l.status === 'Replied') interested++;
        else if (l.status === 'Contacted') contacted++;
        else pending++;
      });
    });

    const inProgress = interested + contacted;
    const responseRate = total > 0 ? (((interested + converted) / total) * 100).toFixed(0) : '0';
    const conversionRate = total > 0 ? ((converted / total) * 100).toFixed(1) : '0';

    return { 
        total, 
        converted, 
        inProgress,
        pending: pending + contacted, 
        responseRate,
        conversionRate
    };
  }, [campaigns]);

  const topCampaigns = useMemo(() => {
    return campaigns
        .filter(c => c.status === 'Active' || c.status === 'Past')
        .sort((a, b) => {
             const convA = a.leads.filter(l => l.status === 'Converted').length;
             const convB = b.leads.filter(l => l.status === 'Converted').length;
             return convB - convA;
        });
  }, [campaigns]);

  const handleOpenReport = async (reportId: string, fileName: string) => {
    const url = fileMap[reportId];
    if (url) {
      window.open(url, '_blank');
    } else {
      await showAlert(`Simulation: Opening "${fileName}" from server.`, "File Access");
    }
  };

  const getPlatformIcon = (p: CampaignPlatform) => {
    switch (p) {
      case CampaignPlatform.INSTAGRAM: return <Instagram size={14} className="text-pink-600" />;
      case CampaignPlatform.LINKEDIN: return <Linkedin size={14} className="text-blue-700" />;
      case CampaignPlatform.EMAIL: return <Mail size={14} className="text-gray-500" />;
    }
  };

  const KPICard = ({ title, value, sub, icon: Icon, color }: any) => (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group">
      <div className={`absolute top-0 right-0 p-4 opacity-[0.08] group-hover:opacity-20 transition-opacity ${color}`}>
        <Icon size={64} />
      </div>
      <div className="relative z-10">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${color} bg-opacity-10 text-opacity-100`}>
           <Icon size={20} className={color.replace('bg-', 'text-')} />
        </div>
        <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider">{title}</h3>
        <p className="text-3xl font-extrabold text-gray-800 mt-1">{value}</p>
        <p className="text-xs text-gray-400 mt-1 font-medium">{sub}</p>
      </div>
    </div>
  );

  const ReportList = ({ uploader, accentColor }: { uploader: string, accentColor: string }) => {
    const deptReports = reports.filter(r => r.uploader === uploader);
    
    return (
      <div className="mt-auto pt-4 border-t border-gray-100 shrink-0">
        <h4 className="text-xs font-bold uppercase text-gray-400 mb-3 flex items-center">
          <FileText size={12} className="mr-1" /> Recent Reports
        </h4>
        <div className="space-y-2 h-24 overflow-y-auto custom-scrollbar pr-1">
          {deptReports.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-gray-300">
              <FileText size={24} className="mb-1 opacity-50"/>
              <span className="text-[10px]">No reports yet</span>
            </div>
          )}
          {deptReports.map(r => (
            <div key={r.id} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100 group hover:border-gray-200 transition-colors">
              <div className="overflow-hidden mr-2">
                <p className="text-xs font-semibold text-gray-700 truncate">{r.fileName}</p>
                <p className="text-[10px] text-gray-400">{r.date}</p>
              </div>
              <button 
                onClick={() => handleOpenReport(r.id, r.fileName)}
                className={`p-1.5 rounded-md bg-white shadow-sm opacity-0 group-hover:opacity-100 transition-all hover:bg-${accentColor}-50 text-${accentColor}-600`}
              >
                <ExternalLink size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-10 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Executive Dashboard</h1>
          <p className="text-gray-500 mt-1">Real-time insights across the enterprise.</p>
        </div>
        <div className="flex items-center space-x-2 text-sm bg-white px-4 py-2 rounded-full shadow-sm border border-gray-200 text-gray-600">
            <CalendarCheck size={16} className="text-indigo-500"/>
            <span className="font-medium">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard title="Total Leads" value={totalLeads} sub="Across all pipelines" icon={Users} color="bg-indigo-500" />
        <KPICard title="Conversion Rate" value={`${conversionRate}%`} sub={`${bookedMeetings} Meetings Booked`} icon={Activity} color="bg-emerald-500" />
        <KPICard title="Active Campaigns" value={activeCampaigns} sub={`${totalCampaigns} Total Campaigns`} icon={TrendingUp} color="bg-blue-500" />
        <KPICard title="Project Velocity" value={ongoingProjects} sub={`${completedProjects} Completed`} icon={Code} color="bg-purple-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden h-[560px]">
          <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-blue-50 to-white shrink-0">
             <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg mr-3 text-blue-600"><TrendingUp size={20} /></div>
                <div>
                    <h2 className="font-bold text-gray-800">Sales</h2>
                    <p className="text-xs text-gray-500">Campaign Performance</p>
                </div>
             </div>
             <Link to="/sales" className="p-2 hover:bg-white rounded-full transition-colors text-gray-400 hover:text-blue-600"><ArrowRight size={18}/></Link>
          </div>
          <div className="p-5 flex-1 flex flex-col overflow-hidden">
            
            <div className="grid grid-cols-4 gap-2 mb-6 shrink-0">
                <div className="text-center">
                    <p className="text-2xl font-extrabold text-gray-800 leading-none">{campaignStats.total}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Total Leads</p>
                </div>
                <div className="text-center">
                    <p className="text-2xl font-extrabold text-emerald-600 leading-none">{campaignStats.converted}</p>
                    <p className="text-[10px] text-emerald-500 font-bold uppercase mt-1">Won Leads</p>
                </div>
                <div className="text-center">
                    <p className="text-2xl font-extrabold text-blue-600 leading-none">{campaignStats.inProgress}</p>
                    <p className="text-[10px] text-blue-500 font-bold uppercase mt-1" title="Replied or Contacted">Engaged</p>
                </div>
                <div className="text-center">
                    <p className="text-2xl font-extrabold text-gray-500 leading-none">{campaignStats.conversionRate}%</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Conversion</p>
                </div>
            </div>

            <div className="flex-1 min-h-0 mb-2 space-y-4 overflow-y-auto custom-scrollbar pr-2">
              <div className="flex justify-between items-end border-b border-gray-50 pb-1 sticky top-0 bg-white z-10">
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Top Campaigns</p>
                <span className="text-[10px] text-gray-400">Conv. / Total</span>
              </div>
              
              {topCampaigns.map(c => {
                  const cTotal = c.leads.length;
                  const cConv = c.leads.filter(l => l.status === 'Converted').length;
                  const cProg = cTotal > 0 ? (cConv / cTotal) * 100 : 0;
                  
                  return (
                      <div key={c.id}>
                          <div className="flex justify-between items-center mb-1">
                              <div className="flex items-center gap-2">
                                  {getPlatformIcon(c.platform)}
                                  <span className="text-sm font-semibold text-gray-700 truncate max-w-[120px]">{c.name}</span>
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase font-bold
                                      ${c.status === 'Active' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>
                                      {c.status}
                                  </span>
                              </div>
                              <span className="text-xs font-mono text-gray-500">{cConv} / {cTotal}</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className="h-full bg-indigo-500 rounded-full transition-all duration-500" 
                                style={{ width: `${cProg}%` }} 
                              />
                          </div>
                          <div className="flex justify-between mt-0.5">
                              <span className="text-[9px] text-gray-400">{c.startDate} - {c.dueDate}</span>
                              <span className="text-[9px] text-indigo-500 font-medium">{cProg.toFixed(0)}% Won</span>
                          </div>
                      </div>
                  )
              })}
              {topCampaigns.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-8 italic">No active campaign data.</p>
              )}
            </div>

            <ReportList uploader="Sales Manager" accentColor="blue" />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden h-[560px]">
          <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-emerald-50 to-white shrink-0">
             <div className="flex items-center">
                <div className="p-2 bg-emerald-100 rounded-lg mr-3 text-emerald-600"><PhoneCall size={20} /></div>
                <div>
                    <h2 className="font-bold text-gray-800">Telecalling</h2>
                    <p className="text-xs text-gray-500">Lead Processing</p>
                </div>
             </div>
             <Link to="/telecaller" className="p-2 hover:bg-white rounded-full transition-colors text-gray-400 hover:text-emerald-600"><ArrowRight size={18}/></Link>
          </div>
          <div className="p-5 flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 min-h-0 mb-4 relative -mx-4">
                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={leadStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {leadStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                    </PieChart>
                 </ResponsiveContainer>
                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                        <span className="block text-3xl font-bold text-gray-800">{bookedMeetings}</span>
                        <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wide">Meetings</span>
                    </div>
                 </div>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center mb-4 px-4 shrink-0">
                 {leadStatusData.slice(0,4).map((d, i) => (
                    <div key={i} className="flex items-center text-xs">
                        <div className="w-2.5 h-2.5 rounded-full mr-2" style={{backgroundColor: COLORS[i]}}></div>
                        <span className="text-gray-600">{d.name}</span>
                        <span className="ml-1 text-gray-400 font-mono">({d.value})</span>
                    </div>
                 ))}
            </div>
            <ReportList uploader="Telecaller" accentColor="emerald" />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden h-[560px]">
          <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-purple-50 to-white shrink-0">
             <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg mr-3 text-purple-600"><Code size={20} /></div>
                <div>
                    <h2 className="font-bold text-gray-800">Technology</h2>
                    <p className="text-xs text-gray-500">Development</p>
                </div>
             </div>
             <Link to="/tech" className="p-2 hover:bg-white rounded-full transition-colors text-gray-400 hover:text-purple-600"><ArrowRight size={18}/></Link>
          </div>
          <div className="p-5 flex-1 flex flex-col overflow-hidden">
            <div className="grid grid-cols-2 gap-3 mb-6 shrink-0">
                <div className="bg-purple-50 rounded-xl p-4 text-center border border-purple-100">
                    <p className="text-3xl font-extrabold text-purple-600">{ongoingProjects}</p>
                    <p className="text-[10px] text-purple-400 font-bold uppercase mt-1">Ongoing</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-center border border-gray-100">
                    <p className="text-3xl font-extrabold text-gray-600">{completedProjects}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Completed</p>
                </div>
            </div>
            
             <div className="flex-1 min-h-0 mb-4 overflow-y-auto custom-scrollbar pr-2">
                <div className="space-y-4">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide border-b border-gray-100 pb-2 sticky top-0 bg-white">Latest Project Updates</p>
                    {projects.map(p => (
                        <div key={p.id} className="flex items-start group">
                            <CheckCircle2 size={16} className={`mt-0.5 mr-3 shrink-0 transition-colors ${p.status === 'Completed' ? 'text-green-500' : 'text-purple-400 group-hover:text-purple-600'}`} />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-700 truncate">{p.name}</p>
                                <p className="text-xs text-gray-500 truncate mt-0.5">{p.description}</p>
                            </div>
                        </div>
                    ))}
                    {projects.length === 0 && (
                         <p className="text-sm text-gray-400 text-center py-4 italic">No projects started.</p>
                    )}
                </div>
             </div>
             <ReportList uploader="Tech Lead" accentColor="purple" />
          </div>
        </div>

      </div>
    </div>
  );
};

export default BossPanel;