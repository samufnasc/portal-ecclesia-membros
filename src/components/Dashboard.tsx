import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie
} from 'recharts';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  Users, Calendar, Briefcase, Search, Filter, LogOut, ChevronRight, Cake, 
  UserCircle, Star, Grid, Church, Plus, Printer, X, Check, Edit2, Save,
  Sun, Moon, LayoutDashboard, Menu, Flame, Camera, ChevronDown, ChevronUp, Trash2
} from 'lucide-react';
import { membersData, MONTHS, DEPARTMENTS } from '../data/members';
import { Member } from '../types';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

interface DashboardProps {
  onLogout: () => void;
}

export default function Dashboard({ onLogout }: DashboardProps) {
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [leadershipFilter, setLeadershipFilter] = useState<'all' | 'leadership' | 'congregation'>('all');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [churchName, setChurchName] = useState('Mensageiros da Fé');

  // Modals state
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  
  // Collapsible sections state (mobile) - Start collapsed on mobile
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    depts: window.innerWidth >= 1024,
    composition: false,
    anniversaries: false,
    upcoming: window.innerWidth >= 1024
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev: Record<string, boolean>) => ({ ...prev, [section]: !prev[section] }));
  };

  const [isSyncing, setIsSyncing] = useState(false);

  // User Session & Permissions
  const [currentUser, setCurrentUser] = useState<{ name: string; role: 'admin' | 'leader' | 'visitor' }>(() => {
    const saved = localStorage.getItem('portal_user_session');
    return saved ? JSON.parse(saved) : { name: 'Visitante', role: 'visitor' };
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const u = loginUsername.trim().toLowerCase();
    const p = loginPassword.trim();

    if (u === 'admin' && p === 'Jesussalva') {
      const user = { name: 'Administrador', role: 'admin' as const };
      setCurrentUser(user);
      localStorage.setItem('portal_user_session', JSON.stringify(user));
      setIsLoginModalOpen(false);
      setLoginUsername('');
      setLoginPassword('');
      return;
    }

    const foundLeader = allMembers.find(m => {
      if (!m.isLeadership) return false;
      const nameLower = m.name.toLowerCase();
      const cleanName = nameLower.replace(/^(pr\.?|pra\.?|pastor|pastora|missionária|missionario|diácono|diaconisa|obreiro|obreira|irmão|irmã)\s+/i, '');
      const parts = cleanName.split(/\s+/);
      const matchFirst = parts[0] === u;
      const matchFull = nameLower.includes(u);
      return matchFirst || matchFull;
    });

    if (foundLeader && p === '1234567') {
      const user = { name: foundLeader.name, role: 'leader' as const };
      setCurrentUser(user);
      localStorage.setItem('portal_user_session', JSON.stringify(user));
      setIsLoginModalOpen(false);
      setLoginUsername('');
      setLoginPassword('');
      return;
    }

    setLoginError('Credenciais inválidas. Para líderes, use seu primeiro nome e senha (1 a 7).');
  };

  const handleLogout = () => {
    const visitor = { name: 'Visitante', role: 'visitor' as const };
    setCurrentUser(visitor);
    localStorage.removeItem('portal_user_session');
  };

  const checkPermissionAndExecute = (action: () => void) => {
    if (currentUser.role === 'admin' || currentUser.role === 'leader') {
      action();
    } else {
      setIsLoginModalOpen(true);
    }
  };

  // Profile Logo Change
  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setLogoBase64(base64);
        
        // Save to Supabase if online
        if (supabase && !isOffline) {
          try {
            const { error } = await supabase
              .from('settings')
              .upsert({ 
                id: 'main', 
                logo_url: base64, 
                church_name: churchName,
                updated_at: new Date().toISOString() 
              }, { onConflict: 'id' });
            
            if (error) {
              console.error('Erro ao salvar logo no Supabase:', error);
              alert('Erro ao salvar logo na nuvem. Ela ficará salva apenas nesta sessão.');
            } else {
              console.log('Logo salva com sucesso no Supabase');
            }
          } catch (err) {
            console.error('Exceção ao salvar logo:', err);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Supabase Integration
  const fetchData = async () => {
    setIsLoading(true);
    
    if (!supabase) {
      setAllMembers(membersData);
      setIsOffline(true);
      setIsLoading(false);
      return;
    }

    try {
      // 1. Fetch Members
      const { data: members, error: mError } = await supabase
        .from('members')
        .select('*')
        .order('name');
      
      if (mError && mError.code !== 'PGRST205') throw mError;

      // 2. Fetch Settings (Logo and Name)
      const { data: settings, error: sError } = await supabase
        .from('settings')
        .select('*')
        .eq('id', 'main')
        .single();
      
      if (sError && sError.code !== 'PGRST205' && sError.code !== 'PGRST116') {
        // Silently handle generic fetch errors to avoid intrusive warnings
        if (sError.message !== 'Failed to fetch') {
          console.warn('Settings table error:', sError);
        }
      }

      if (settings) {
        if (settings.logo_url) setLogoBase64(settings.logo_url);
        if (settings.church_name) setChurchName(settings.church_name);
      }
      
      if (members && members.length > 0) {
        const mappedData = members.map(m => ({
          ...m,
          isLeadership: m.is_leadership,
          membershipType: m.membership_type
        }));
        setAllMembers(mappedData);
        setIsOffline(false);
      } else {
        setAllMembers(membersData);
        setIsOffline(mError?.code === 'PGRST205');
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setAllMembers(membersData);
      setIsOffline(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveMember = async (member: Member) => {
    if (isOffline || !supabase) {
      if (member.id) {
        setAllMembers((prev: Member[]) => prev.map((m: Member) => m.id === member.id ? member : m));
      } else {
        setAllMembers((prev: Member[]) => [...prev, { ...member, id: Math.random().toString(36).substr(2, 9) }]);
      }
      setIsMemberModalOpen(false);
      setEditingMember(null);
      return;
    }

    try {
      const isEditing = !!member.id;
      const dbMember = {
        name: member.name,
        birthday: member.birthday,
        month: member.month,
        day: member.day,
        departments: member.departments,
        is_leadership: member.isLeadership,
        membership_type: member.membershipType
      };

      if (isEditing) {
        const { error } = await supabase
          .from('members')
          .update(dbMember)
          .eq('id', member.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('members')
          .insert([dbMember]);
        if (error) throw error;
      }
      
      await fetchData();
      setIsMemberModalOpen(false);
      setEditingMember(null);
    } catch (err) {
      console.error('Error saving member:', err);
      alert('Erro ao salvar no banco de dados. Salvando localmente para esta sessão.');
      // Fallback update
      if (member.id) {
        setAllMembers((prev: Member[]) => prev.map((m: Member) => m.id === member.id ? member : m));
      } else {
        setAllMembers((prev: Member[]) => [...prev, { ...member, id: Math.random().toString(36).substr(2, 9) }]);
      }
      setIsMemberModalOpen(false);
    }
  };

  const handleDeleteMember = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este membro?')) return;
    
    if (isOffline || !supabase) {
      setAllMembers((prev: Member[]) => prev.filter((m: Member) => m.id !== id));
      return;
    }

    try {
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', id);
      if (error) throw error;
      await fetchData();
    } catch (err) {
      console.error('Error deleting member:', err);
      setAllMembers((prev: Member[]) => prev.filter((m: Member) => m.id !== id));
    }
  };

  const handleSyncData = async () => {
    if (!supabase || isOffline) return;
    if (!confirm('Deseja enviar os dados iniciais locais para o seu banco de dados Supabase?')) return;
    
    setIsSyncing(true);
    try {
      const dbMembers = membersData.map((m: Member) => ({
        name: m.name,
        birthday: m.birthday,
        month: m.month,
        day: m.day,
        departments: m.departments,
        is_leadership: m.isLeadership,
        membership_type: m.membershipType
      }));

      const { error } = await supabase
        .from('members')
        .insert(dbMembers);
      
      if (error) throw error;

      // Also sync settings if they exist
      if (supabase) {
        await supabase
          .from('settings')
          .upsert({ 
            id: 'main', 
            logo_url: logoBase64, 
            church_name: churchName,
            updated_at: new Date().toISOString()
          });
      }
      
      alert('Dados sincronizados com sucesso!');
      await fetchData();
    } catch (err) {
      console.error('Sync error:', err);
      alert('Erro ao sincronizar dados. Verifique a tabela no Supabase.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Filtered members list - SORTED BY BIRTHDAY
  const filteredMembers = useMemo(() => {
    const filtered = allMembers.filter(m => {
      const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDept = selectedDepts.length === 0 || m.departments.some(d => selectedDepts.includes(d));
      const matchesMonth = !selectedMonth || m.month === selectedMonth;
      const matchesLeadership = leadershipFilter === 'all' || 
                                (leadershipFilter === 'leadership' ? m.isLeadership : !m.isLeadership);

      return matchesSearch && matchesDept && matchesMonth && matchesLeadership;
    });

    // Sort primarily by birthday (month first, then day)
    return filtered.sort((a, b) => {
      const monthIndexA = MONTHS.indexOf(a.month);
      const monthIndexB = MONTHS.indexOf(b.month);
      if (monthIndexA !== monthIndexB) return monthIndexA - monthIndexB;
      return a.day - b.day;
    });
  }, [allMembers, searchTerm, selectedDepts, selectedMonth, leadershipFilter]);

  // Data processing for charts - CROSS-FILTERING (Charts shouldn't filter themselves)
  const deptData = useMemo(() => {
    const counts: Record<string, number> = {};
    // When computing chart data, we ignore its own filter to keep UI stable (Power BI behavior)
    const dataForDepts = allMembers.filter(m => {
      const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesMonth = !selectedMonth || m.month === selectedMonth;
      const matchesLeadership = leadershipFilter === 'all' || 
                                (leadershipFilter === 'leadership' ? m.isLeadership : !m.isLeadership);
      return matchesSearch && matchesMonth && matchesLeadership;
    });

    dataForDepts.forEach(m => {
      m.departments.forEach(dept => {
        counts[dept] = (counts[dept] || 0) + 1;
      });
    });
    return DEPARTMENTS.map(dept => ({
      name: dept,
      value: counts[dept] || 0
    })).filter(d => d.value > 0);
  }, [allMembers, searchTerm, selectedMonth, leadershipFilter]);

  const monthData = useMemo(() => {
    const counts: Record<string, number> = {};
    const dataForMonths = allMembers.filter(m => {
      const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDept = selectedDepts.length === 0 || m.departments.some(d => selectedDepts.includes(d));
      const matchesLeadership = leadershipFilter === 'all' || 
                                (leadershipFilter === 'leadership' ? m.isLeadership : !m.isLeadership);
      return matchesSearch && matchesDept && matchesLeadership;
    });

    dataForMonths.forEach(m => {
      counts[m.month] = (counts[m.month] || 0) + 1;
    });
    return MONTHS.map(month => ({
      name: month,
      value: counts[month] || 0
    }));
  }, [allMembers, searchTerm, selectedDepts, leadershipFilter]);

  const leadershipStats = useMemo(() => {
    const dataForLeadership = allMembers.filter(m => {
      const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDept = selectedDepts.length === 0 || m.departments.some(d => selectedDepts.includes(d));
      const matchesMonth = !selectedMonth || m.month === selectedMonth;
      return matchesSearch && matchesDept && matchesMonth;
    });

    const leaders = dataForLeadership.filter(m => m.isLeadership).length;
    const congregation = dataForLeadership.length - leaders;
    return [
      { name: 'Liderança', value: leaders },
      { name: 'Congregação', value: congregation }
    ].filter(s => s.value > 0);
  }, [allMembers, searchTerm, selectedDepts, selectedMonth]);

  // Next birthdays logic (Current month remaining, or Next month)
  const upcomingBirthdays = useMemo(() => {
    const today = new Date();
    const currentMonthIndex = today.getMonth();
    const currentMonthName = MONTHS[currentMonthIndex];
    const currentDay = today.getDate();

    // Check current month first
    const currentMonthRemaining = [...allMembers]
      .filter(m => m.month === currentMonthName && m.day >= currentDay)
      .sort((a, b) => a.day - b.day);

    if (currentMonthRemaining.length === 0) {
      // If none in current month, show next month
      const nextMonthIndex = (currentMonthIndex + 1) % 12;
      const nextMonthName = MONTHS[nextMonthIndex];
      return [...allMembers]
        .filter(m => m.month === nextMonthName)
        .sort((a, b) => a.day - b.day);
    }

    return currentMonthRemaining;
  }, [allMembers]);

  const resetFilters = () => {
    setSelectedDepts([]);
    setSelectedMonth(null);
    setLeadershipFilter('all');
    setSearchTerm('');
  };

  return (
    <div className={cn(
      "flex h-screen overflow-hidden transition-colors duration-500",
      isDarkMode ? "bg-[#0f172a] text-[#f8fafc]" : "bg-[#f1f5f9] text-[#1e293b]"
    )}>
      {/* Sidebar - Mobile Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar - Desktop & Mobile */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col w-64 p-6 justify-between shrink-0 border-r transition-all duration-500 lg:static lg:translate-x-0",
        isDarkMode ? "bg-[#0f172a] border-white/5" : "bg-white border-slate-200",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="space-y-6 md:space-y-8 overflow-y-auto custom-scrollbar pr-1">
          <div className="flex flex-col items-center gap-3 px-2 text-center pb-6 border-b border-white/5">
            <div className="relative group/logo">
              <div className={cn(
                "w-20 h-20 rounded-full flex items-center justify-center p-0.5 transition-all relative overflow-hidden",
                isDarkMode 
                  ? "bg-gradient-to-tr from-sky-600 to-sky-400 shadow-xl shadow-sky-500/20" 
                  : "bg-gradient-to-tr from-sky-500 to-sky-300 shadow-xl shadow-sky-500/10"
              )}>
                <div className={cn(
                  "w-full h-full rounded-full flex flex-col items-center justify-center text-white border-2 border-white/20 relative",
                  isDarkMode ? "bg-[#0f172a]/90" : "bg-white/90"
                )}>
                  {logoBase64 ? (
                    <img src={logoBase64} alt="Church Logo" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <>
                      <Church className={cn("w-8 h-8 mb-0.5", isDarkMode ? "text-sky-400" : "text-sky-600")} />
                      <span className={cn("text-[6px] font-black uppercase leading-none text-center px-2", isDarkMode ? "text-sky-400" : "text-sky-600")}>
                        {churchName.toUpperCase()}
                      </span>
                    </>
                  )}
                  
                  {currentUser.role === 'admin' && (
                    <label className="absolute inset-0 bg-black/50 opacity-0 group-hover/logo:opacity-100 transition-all duration-300 flex flex-col items-center justify-center cursor-pointer rounded-full backdrop-blur-[2px]">
                      <Camera className="w-5 h-5 text-white mb-1" />
                      <span className="text-[6px] font-black text-white uppercase">Trocar Logo</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                    </label>
                  )}
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-amber-500 rounded-full flex items-center justify-center shadow-lg border-2 border-[#0f172a] animate-pulse">
                <Flame className="w-3.5 h-3.5 text-white fill-white" />
              </div>
            </div>
            <div className="space-y-1 relative group/name">
              <h2 className={cn("text-xs font-black tracking-[0.25em] uppercase leading-none", isDarkMode ? "text-white" : "text-slate-800")}>PORTAL ECCLESIA</h2>
              <div className="flex items-center gap-2">
                <p className={cn("text-[8px] font-black uppercase tracking-tighter", isDarkMode ? "text-sky-500" : "text-sky-600")}>{churchName}</p>
                {currentUser.role === 'admin' && (
                  <button 
                    onClick={() => {
                      const newName = prompt('Novo nome da igreja:', churchName);
                      if (newName) {
                        setChurchName(newName);
                        if (supabase && !isOffline) {
                          supabase.from('settings').upsert({ id: 'main', church_name: newName, logo_url: logoBase64 });
                        }
                      }
                    }}
                    className="opacity-0 group-hover/name:opacity-100 transition-opacity p-1 hover:bg-white/10 rounded cursor-pointer"
                    title="Editar Nome da Igreja"
                  >
                    <Edit2 className="w-2 h-2 text-slate-500" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <nav className="space-y-1 pt-4">
            <NavItem 
              icon={<LayoutDashboard className="w-4 h-4" />} 
              label="Dashboard" 
              active={selectedDepts.length === 0 && !selectedMonth} 
              darkMode={isDarkMode}
              onClick={() => {
                resetFilters();
                setIsSidebarOpen(false);
              }} 
            />
            <NavItem 
              icon={<Users className="w-4 h-4" />} 
              label="Membros" 
              darkMode={isDarkMode}
              onClick={() => {
                resetFilters();
                setIsSidebarOpen(false);
              }}
            />
            
            <div className="pt-6 px-3 space-y-6">
              <p className={cn("text-[10px] font-bold uppercase tracking-[0.2em] mb-4 ml-1", isDarkMode ? "text-slate-500" : "text-slate-400")}>Filtros Essenciais</p>
              
              <div className="space-y-4">
            <div className="space-y-1.5">
                  <label className={cn("text-[10px] font-bold ml-1 uppercase tracking-widest", isDarkMode ? "text-slate-400" : "text-slate-500")}>Mês do Aniversário</label>
                  <select 
                    value={selectedMonth || ''} 
                    onChange={(e) => {
                      setSelectedMonth(e.target.value || null);
                      if (window.innerWidth < 1024) setIsSidebarOpen(false);
                    }}
                    className={cn(
                      "w-full border rounded-xl py-2.5 px-4 text-xs font-bold focus:outline-none focus:ring-2 transition-all appearance-none cursor-pointer uppercase tracking-tighter",
                      isDarkMode 
                        ? "bg-slate-800/80 border-white/5 text-sky-400 focus:ring-sky-500/20" 
                        : "bg-slate-50 border-slate-200 text-sky-700 focus:ring-sky-500/10"
                    )}
                  >
                    <option value="">Todos os Meses</option>
                    {MONTHS.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5 pt-2">
                  <label className={cn("text-[10px] font-bold ml-1 uppercase tracking-widest", isDarkMode ? "text-slate-400" : "text-slate-500")}>Departamento</label>
                  <select 
                    value={selectedDepts[0] || ''} 
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedDepts(val ? [val] : []);
                      if (window.innerWidth < 1024) setIsSidebarOpen(false);
                    }}
                    className={cn(
                      "w-full border rounded-xl py-2.5 px-4 text-xs font-bold focus:outline-none focus:ring-2 transition-all appearance-none cursor-pointer uppercase tracking-tighter",
                      isDarkMode 
                        ? "bg-slate-800/80 border-white/5 text-sky-400 focus:ring-sky-500/20" 
                        : "bg-slate-50 border-slate-200 text-sky-700 focus:ring-sky-500/10"
                    )}
                  >
                    <option value="">Todos os Departamentos</option>
                    {DEPARTMENTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className={cn("text-[10px] font-bold ml-1 uppercase tracking-wider", isDarkMode ? "text-slate-500" : "text-slate-400")}>Classificação</label>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { id: 'all', label: 'Todos', activeColor: 'bg-sky-500/10 border-sky-500/50 text-sky-400', lightActiveColor: 'bg-sky-500/10 border-sky-500/50 text-sky-600' },
                      { id: 'leadership', label: 'Liderança', activeColor: 'bg-amber-500/10 border-amber-500/50 text-amber-400', lightActiveColor: 'bg-amber-500/10 border-amber-500/50 text-amber-600' },
                      { id: 'congregation', label: 'Congregação', activeColor: 'bg-teal-500/10 border-teal-500/50 text-teal-400', lightActiveColor: 'bg-teal-500/10 border-teal-500/50 text-teal-600' }
                    ].map((btn) => (
                      <button 
                        key={btn.id}
                        onClick={() => setLeadershipFilter(btn.id as any)}
                        className={cn(
                          "text-[10px] font-bold py-2 px-3 rounded-lg border transition-all text-left uppercase tracking-widest",
                          leadershipFilter === btn.id 
                            ? isDarkMode ? btn.activeColor : btn.lightActiveColor
                            : isDarkMode 
                              ? "bg-slate-800/30 border-white/5 text-slate-500 hover:border-white/10"
                              : "bg-slate-100 border-slate-200 text-slate-400 hover:border-slate-300"
                        )}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </nav>
        </div>

        <div className="space-y-4">
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={cn(
              "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all text-xs font-bold uppercase tracking-widest border",
              isDarkMode 
                ? "bg-slate-800/50 border-white/5 text-slate-400 hover:text-sky-400 hover:border-sky-500/20" 
                : "bg-slate-100 border-slate-200 text-slate-500 hover:text-sky-600 hover:border-sky-500/30"
            )}
          >
            <div className="flex items-center gap-3">
              {isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              <span>Alternar Tema</span>
            </div>
            <div className={cn(
              "w-8 h-4 rounded-full relative transition-all",
              isDarkMode ? "bg-sky-500/20" : "bg-slate-300"
            )}>
              <div className={cn(
                "absolute top-1 w-2 h-2 rounded-full transition-all",
                isDarkMode ? "right-1 bg-sky-400" : "left-1 bg-white"
              )} />
            </div>
          </button>

          <div className={cn(
            "p-4 rounded-xl border mx-2",
            isDarkMode ? "bg-slate-800/50 border-white/5" : "bg-slate-50 border-slate-200"
          )}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center font-bold text-xs text-white shadow-lg shadow-sky-500/20">AD</div>
              <div className="min-w-0 text-left">
                <p className={cn("text-xs font-bold truncate", isDarkMode ? "text-white" : "text-slate-800")}>Painel Administrativo</p>
                <p className="text-[10px] text-slate-500 truncate uppercase font-bold tracking-tighter">Igreja Conectada</p>
              </div>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium",
              isDarkMode ? "text-slate-500 hover:text-red-400 hover:bg-red-400/5" : "text-slate-400 hover:text-red-600 hover:bg-red-50"
            )}
          >
            <LogOut className="w-4 h-4" />
            <span>Sair do Sistema</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className={cn(
          "h-auto py-3 md:h-16 shrink-0 border-b px-4 md:px-8 flex flex-wrap md:flex-nowrap items-center justify-between sticky top-0 z-10 transition-all duration-500",
          isDarkMode ? "bg-[#0f172a]/95 border-white/5" : "bg-white/95 border-slate-200",
          "backdrop-blur-md"
        )}>
          <div className="flex items-center gap-2 md:gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className={cn(
                "p-2 rounded-xl lg:hidden border transition-all active:scale-95 flex items-center justify-center", 
                isDarkMode 
                  ? "bg-slate-800/50 border-white/5 text-sky-400" 
                  : "bg-slate-50 border-slate-200 text-sky-600"
              )}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className={cn("text-sm md:text-lg font-black tracking-tight whitespace-nowrap", isDarkMode ? "text-white" : "text-slate-800")}>
                  Portal Ecclesia
                </h2>
                <div className={cn("hidden sm:block w-1 h-1 rounded-full", isDarkMode ? "bg-slate-600" : "bg-slate-300")} />
              </div>
              <p className={cn("text-[9px] md:text-[10px] font-black uppercase tracking-widest truncate", isDarkMode ? "text-sky-500" : "text-sky-600")}>
                {churchName}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 flex-1 max-w-md md:ml-8 mt-2 md:mt-0 order-3 md:order-2 w-full md:w-auto">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-sky-400 transition-colors" />
              <input 
                type="text" 
                placeholder="Pesquisar membros..." 
                className={cn(
                  "w-full pl-11 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all",
                  isDarkMode 
                    ? "bg-slate-800/50 border-white/5 text-white focus:ring-sky-500/20 placeholder:text-slate-600" 
                    : "bg-slate-50 border-slate-200 text-slate-800 focus:ring-sky-500/10 placeholder:text-slate-400"
                )}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2 ml-auto order-2 md:order-3">
            {isOffline ? (
              <div className={cn(
                "hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest mr-2",
                isDarkMode ? "bg-amber-500/10 border-amber-500/20 text-amber-500" : "bg-amber-50 border-amber-200 text-amber-600"
              )}>
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Modo Local
              </div>
            ) : allMembers.length === membersData.length && allMembers[0]?.name === membersData[0]?.name && (
              <button 
                onClick={handleSyncData}
                disabled={isSyncing}
                className={cn(
                  "hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest mr-2 animate-bounce hover:animate-none transition-all",
                  isDarkMode ? "bg-sky-500/10 border-sky-500/20 text-sky-400" : "bg-sky-50 border-sky-200 text-sky-600"
                )}
              >
                <Flame className={cn("w-3 h-3", isSyncing && "animate-spin")} />
                {isSyncing ? 'Sincronizando...' : 'Sincronizar Cloud'}
              </button>
            )}
            {currentUser.role !== 'visitor' ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-sky-500/10 border border-sky-500/30 rounded-xl text-xs font-bold text-sky-400">
                <span>👤 {currentUser.name} ({currentUser.role === 'admin' ? 'Admin' : 'Líder'})</span>
                <button onClick={handleLogout} className="text-slate-400 hover:text-white ml-2 text-xs underline cursor-pointer">Sair</button>
              </div>
            ) : (
              <button 
                onClick={() => setIsLoginModalOpen(true)}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-white/10 rounded-lg text-xs font-bold text-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Entrar como Admin ou Líder"
              >
                <span>🔑 Entrar</span>
              </button>
            )}

            <button 
              onClick={() => checkPermissionAndExecute(() => setIsReportModalOpen(true))}
              className={cn(
                "p-2 border rounded-lg text-xs font-bold transition-colors md:px-4 md:py-2 md:flex md:gap-2 md:items-center cursor-pointer",
                isDarkMode 
                  ? "bg-slate-800 border-white/5 text-slate-300 hover:bg-slate-700" 
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              )}
              title="Relatórios"
            >
              <Printer className="w-4 h-4 md:w-3.5 md:h-3.5" />
              <span className="hidden md:inline">Relatórios</span>
            </button>
            <button 
              onClick={() => checkPermissionAndExecute(() => {
                setEditingMember(null);
                setIsMemberModalOpen(true);
              })}
              className="p-2 bg-sky-500 rounded-lg text-xs font-bold text-white shadow-lg shadow-sky-500/10 hover:bg-sky-400 transition-colors flex items-center md:px-4 md:py-2 md:gap-2 cursor-pointer"
              title="Novo Membro"
            >
              <Plus className="w-4 h-4 md:w-3.5 md:h-3.5" />
              <span className="hidden md:inline">Novo Membro</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 md:space-y-8">
          {/* Stats Section */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {[
              { label: 'Membros Ativos', value: filteredMembers.length, sub: 'Filtro atual', color: 'sky', action: () => resetFilters() },
              { label: 'Liderança', value: filteredMembers.filter(m => m.isLeadership).length, sub: 'Corpo diretivo', color: 'indigo', action: () => setLeadershipFilter(prev => prev === 'leadership' ? 'all' : 'leadership') },
              { label: 'Congregação', value: filteredMembers.filter(m => !m.isLeadership).length, sub: 'Membros gerais', color: 'teal', action: () => setLeadershipFilter(prev => prev === 'congregation' ? 'all' : 'congregation') },
              { label: 'Aniversariantes', value: filteredMembers.filter(m => m.month === MONTHS[new Date().getMonth()]).length, sub: 'Este mês', color: 'sky', action: () => {
                const curMonth = MONTHS[new Date().getMonth()];
                setSelectedMonth(prev => prev === curMonth ? null : curMonth);
              }}
            ].map((stat, i) => (
              <StatCard 
                key={i}
                label={stat.label} 
                value={stat.value} 
                subtext={stat.sub}
                color={stat.color as any}
                darkMode={isDarkMode}
                onClick={stat.action}
              />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart: Departments */}
            <div className={cn("card-sleek !shadow-none min-h-fit transition-all duration-300", !isDarkMode && "bg-white border-slate-200")}>
              <button 
                onClick={() => toggleSection('depts')}
                className={cn("w-full flex items-center justify-between text-xs font-bold uppercase tracking-widest mb-4 md:mb-6 border-b pb-2", isDarkMode ? "text-white border-white/5" : "text-slate-800 border-slate-100")}
              >
                <span>Departamentos</span>
                <div className="lg:hidden">
                  {expandedSections.depts ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>
              
              <AnimatePresence>
                {(expandedSections.depts || window.innerWidth >= 1024) && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden h-[250px] w-full min-h-[250px]"
                  >
                    <ResponsiveContainer width="100%" height="100%" minHeight={250}>
                      <BarChart data={deptData} layout="vertical" margin={{ left: 0, right: 20 }}>
                        <XAxis type="number" hide />
                        <YAxis 
                          dataKey="name" 
                          type="category" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: isDarkMode ? '#cbd5e1' : '#475569', fontSize: 9, fontWeight: '600' }}
                          width={90}
                        />
                        <Tooltip 
                          cursor={{ fill: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}
                          contentStyle={{ 
                            backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', 
                            border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)', 
                            borderRadius: '8px', 
                            fontSize: '12px',
                            color: isDarkMode ? '#fff' : '#000'
                          }}
                        />
                        <Bar 
                          dataKey="value" 
                          radius={[0, 4, 4, 0]}
                          onClick={(data: any) => {
                            const name = data?.name;
                            if (name && typeof name === 'string') {
                              setSelectedDepts((prev: string[]) => 
                                prev.includes(name) 
                                  ? prev.filter((d: string) => d !== name) 
                                  : [...prev, name]
                              );
                              if (window.innerWidth < 768) {
                                window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                              }
                            }
                          }}
                          className="cursor-pointer transition-all duration-300"
                        >
                          {deptData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={selectedDepts.includes(entry.name) ? '#0ea5e9' : (isDarkMode ? 'rgba(14, 165, 233, 0.4)' : 'rgba(14, 165, 233, 0.45)')} 
                              className="transition-all duration-500"
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Chart: Leadership vs Congregation */}
            <div className={cn("card-sleek !shadow-none min-h-fit transition-all duration-300", !isDarkMode && "bg-white border-slate-200")}>
              <button 
                onClick={() => toggleSection('composition')}
                className={cn("w-full flex items-center justify-between text-xs font-bold uppercase tracking-widest mb-4 md:mb-6 border-b pb-2", isDarkMode ? "text-white border-white/5" : "text-slate-800 border-slate-100")}
              >
                <span>Composição da Igreja</span>
                <div className="lg:hidden">
                  {expandedSections.composition ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              <AnimatePresence>
                {(expandedSections.composition || window.innerWidth >= 1024) && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="h-[250px] w-full flex flex-col items-center justify-center min-h-[250px]">
                      <ResponsiveContainer width="100%" height="100%" minHeight={250}>
                        <PieChart>
                          <Pie
                            data={leadershipStats}
                            innerRadius={55}
                            outerRadius={75}
                            paddingAngle={5}
                            dataKey="value"
                            onClick={(data) => {
                              if (data && data.name) {
                                const filterValue = data.name === 'Liderança' ? 'leadership' : 'congregation';
                                const currentFilter = leadershipFilter;
                                if (currentFilter === filterValue) {
                                  setLeadershipFilter('all');
                                } else {
                                  setLeadershipFilter(filterValue);
                                  if (window.innerWidth < 768) {
                                    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                                  }
                                }
                              }
                            }}
                            className="cursor-pointer outline-none"
                          >
                            {leadershipStats.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={
                                  (leadershipFilter === 'leadership' && entry.name === 'Liderança') ||
                                  (leadershipFilter === 'congregation' && entry.name === 'Congregação')
                                    ? (entry.name === 'Liderança' ? '#f59e0b' : '#0ea5e9') 
                                    : (leadershipFilter !== 'all' ? (isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)') : (entry.name === 'Liderança' ? '#f59e0b' : '#0ea5e9'))
                                } 
                                className="transition-all duration-500"
                              />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', 
                              border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)', 
                              borderRadius: '8px', 
                              fontSize: '12px',
                              color: isDarkMode ? '#fff' : '#000'
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex justify-center gap-4 mt-4">
                        {leadershipStats.map((d, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: i === 0 ? '#f59e0b' : '#0ea5e9' }} />
                            <span className={cn("text-[10px] font-bold uppercase", isDarkMode ? "text-slate-400" : "text-slate-500")}>{d.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Chart: Monthly Distribution */}
            <div className={cn("card-sleek !shadow-none min-h-fit transition-all duration-300", !isDarkMode && "bg-white border-slate-200")}>
              <button 
                onClick={() => toggleSection('anniversaries')}
                className={cn("w-full flex items-center justify-between text-xs font-bold uppercase tracking-widest mb-4 md:mb-6 border-b pb-2", isDarkMode ? "text-white border-white/5" : "text-slate-800 border-slate-100")}
              >
                <span>Aniversários</span>
                <div className="lg:hidden">
                  {expandedSections.anniversaries ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              <AnimatePresence>
                {(expandedSections.anniversaries || window.innerWidth >= 1024) && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden h-[250px] w-full min-h-[250px]"
                  >
                    <ResponsiveContainer width="100%" height="100%" minHeight={250}>
                      <BarChart data={monthData}>
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: isDarkMode ? '#cbd5e1' : '#475569', fontSize: 7, fontWeight: '700' }}
                          interval={0}
                          angle={window.innerWidth < 768 ? -45 : 0}
                          textAnchor={window.innerWidth < 768 ? 'end' : 'middle'}
                          height={window.innerWidth < 768 ? 50 : 30}
                        />
                        <Tooltip 
                          cursor={{ fill: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}
                          contentStyle={{ 
                            backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', 
                            border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)', 
                            borderRadius: '8px', 
                            fontSize: '12px',
                            color: isDarkMode ? '#fff' : '#000'
                          }}
                        />
                        <Bar 
                          dataKey="value" 
                          radius={[4, 4, 0, 0]} 
                          onClick={(data) => {
                            if (data && data.name) {
                              const newMonth = data.name === selectedMonth ? null : data.name;
                              setSelectedMonth(newMonth);
                              if (newMonth && window.innerWidth < 768) {
                                window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                              }
                            }
                          }}
                          className="cursor-pointer transition-all duration-300"
                        >
                          {monthData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={selectedMonth === entry.name ? '#0ea5e9' : (isDarkMode ? 'rgba(14, 165, 233, 0.4)' : 'rgba(14, 165, 233, 0.45)')} 
                              className="transition-all duration-500"
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Upcoming Birthdays Section */}
            <div className={cn("card-sleek !shadow-none min-h-fit lg:col-span-3 transition-all duration-300", !isDarkMode && "bg-white border-slate-200")}>
              <button 
                onClick={() => toggleSection('upcoming')}
                className={cn("w-full flex items-center justify-between text-xs font-bold uppercase tracking-widest mb-4 border-b pb-2", isDarkMode ? "text-white border-white/5" : "text-slate-800 border-slate-100")}
              >
                <div className="flex items-center gap-2">
                  <Cake className="w-4 h-4 text-rose-500" />
                  <span>Próximos Aniversariantes</span>
                </div>
                <div className="lg:hidden">
                  {expandedSections.upcoming ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              <AnimatePresence>
                {(expandedSections.upcoming || window.innerWidth >= 1024) && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                      {upcomingBirthdays.map((m, i) => (
                        <div 
                          key={i} 
                          className={cn(
                            "p-3 rounded-xl border flex flex-col items-center text-center transition-all",
                            isDarkMode ? "bg-white/5 border-white/5" : "bg-slate-50 border-slate-100"
                          )}
                        >
                          <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-xs bg-sky-500 text-white mb-2 shadow-lg shadow-sky-500/20">
                            {m.name.charAt(0)}
                          </div>
                          <p className={cn("text-[9px] md:text-[10px] font-black uppercase line-clamp-2 w-full px-1", isDarkMode ? "text-white" : "text-slate-800")}>
                            {m.name.split(' ').slice(0, 2).join(' ')}
                          </p>
                          <p className="text-[9px] font-black text-sky-500 mt-1">{m.birthday}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Members Table */}
          <div className={cn("card-sleek !p-0 overflow-hidden !shadow-none", !isDarkMode && "bg-white border-slate-200")}>
            <div className={cn("p-6 border-b flex flex-col md:flex-row md:items-center justify-between gap-4", isDarkMode ? "border-white/5" : "border-slate-100")}>
              <h3 className={cn("text-lg font-bold", isDarkMode ? "text-white" : "text-slate-800")}>Relatório Digital - Mensageiros da Fé</h3>
              <div className="flex items-center gap-2">
                <AnimatePresence>
                  {searchTerm || selectedDepts.length > 0 || selectedMonth || leadershipFilter !== 'all' ? (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      onClick={resetFilters}
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg border transition-all",
                        isDarkMode 
                          ? "text-slate-500 hover:text-white bg-slate-800/50 border-white/5" 
                          : "text-slate-400 hover:text-slate-800 bg-slate-50 border-slate-200"
                      )}
                    >
                      Limpar Ativos
                    </motion.button>
                  ) : null}
                </AnimatePresence>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className={cn("text-[9px]", isDarkMode ? "bg-slate-800/30" : "bg-slate-50")}>
                    <th className={cn("px-6 py-4 font-bold uppercase tracking-[0.15em] border-b", isDarkMode ? "text-slate-500 border-white/5" : "text-slate-400 border-slate-100")}>Membro</th>
                    <th className={cn("px-6 py-4 font-bold uppercase tracking-[0.15em] border-b", isDarkMode ? "text-slate-500 border-white/5" : "text-slate-400 border-slate-100")}>Classificação</th>
                    <th className={cn("px-6 py-4 font-bold uppercase tracking-[0.15em] border-b", isDarkMode ? "text-slate-500 border-white/5" : "text-slate-400 border-slate-100")}>Departamentos</th>
                    <th className={cn("px-6 py-4 font-bold uppercase tracking-[0.15em] border-b", isDarkMode ? "text-slate-500 border-white/5" : "text-slate-400 border-slate-100")}>Aniversário</th>
                  </tr>
                </thead>
                <tbody className={cn("divide-y", isDarkMode ? "divide-white/5" : "divide-slate-100")}>
                  <AnimatePresence mode="popLayout">
                    {filteredMembers.map((member) => (
                      <motion.tr 
                        key={member.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={cn("group transition-colors cursor-default", isDarkMode ? "hover:bg-white/5" : "hover:bg-slate-50")}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-lg border flex items-center justify-center font-bold text-[10px] transition-all",
                              member.isLeadership 
                                ? "bg-amber-500/10 border-amber-500/20 text-amber-500" 
                                : isDarkMode ? "bg-slate-800 border-white/5 text-slate-500" : "bg-slate-100 border-slate-200 text-slate-400"
                            )}>
                              {member.name.charAt(0).toUpperCase()}
                            </div>
                            <span className={cn("text-sm font-semibold transition-colors", isDarkMode ? "text-slate-300 group-hover:text-white" : "text-slate-700 group-hover:text-slate-900")}>
                              {member.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {member.isLeadership ? (
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase border bg-amber-500/10 text-amber-500 border-amber-500/20">
                              Liderança
                            </span>
                          ) : (
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[9px] font-bold uppercase border",
                              isDarkMode ? "bg-slate-800/50 text-slate-500 border-white/5" : "bg-slate-100 text-slate-400 border-slate-200"
                            )}>
                              Congregação
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {member.departments.map((dept, idx) => (
                              <span key={idx} className={cn(
                                "text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
                                isDarkMode ? "text-slate-500 bg-white/5" : "text-slate-400 bg-slate-100"
                              )}>
                                {dept}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-between gap-1.5">
                            <div className="flex items-center gap-1.5">
                              <Cake className="w-3 h-3 text-rose-500" />
                              <span className={cn("text-xs transition-colors uppercase font-black tracking-tighter", isDarkMode ? "text-white" : "text-slate-600 group-hover:text-slate-900")}>
                                {member.birthday}
                              </span>
                            </div>
                            <div className={cn(
                              "flex items-center gap-1 transition-opacity",
                              "lg:opacity-0 lg:group-hover:opacity-100 opacity-100"
                            )}>
                              <button 
                                onClick={() => checkPermissionAndExecute(() => {
                                  setEditingMember(member);
                                  setIsMemberModalOpen(true);
                                })}
                                className={cn("p-1.5 rounded transition-colors", isDarkMode ? "hover:bg-sky-500/10 text-sky-400" : "hover:bg-slate-200 text-sky-600")}
                                title="Editar"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button 
                                onClick={() => checkPermissionAndExecute(() => handleDeleteMember(member.id))}
                                className={cn("p-1.5 rounded transition-colors", isDarkMode ? "hover:bg-red-500/10 text-red-500" : "hover:bg-red-50 text-red-600")}
                                title="Excluir"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer Signature - Creative & Discreet */}
          <footer className="pt-12 pb-8 opacity-20 hover:opacity-60 transition-opacity duration-700">
            <p className={cn(
              "text-[9px] font-bold tracking-[0.3em] uppercase text-center",
              isDarkMode ? "text-slate-500" : "text-slate-400"
            )}>
              © {new Date().getFullYear()} Portal Ecclesia • Desenvolvido por Samuel Nascimento • Com ajuda do Espírito Santo
            </p>
          </footer>
        </div>
      </main>

      {/* Member Form Modal */}
      <AnimatePresence>
        {isMemberModalOpen && (
          <MemberFormModal 
            member={editingMember} 
            isDarkMode={isDarkMode}
            onClose={() => {
              setIsMemberModalOpen(false);
              setEditingMember(null);
            }} 
            onSave={handleSaveMember}
          />
        )}
      </AnimatePresence>

      {/* Report Modal */}
      <AnimatePresence>
        {isReportModalOpen && (
          <ReportModal 
            members={allMembers}
            isDarkMode={isDarkMode}
            onClose={() => setIsReportModalOpen(false)} 
          />
        )}
      </AnimatePresence>

      {/* Login Modal */}
      <AnimatePresence>
        {isLoginModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn(
                "w-full max-w-md rounded-2xl border p-6 shadow-2xl relative",
                isDarkMode ? "bg-[#0f172a] border-white/10 text-white" : "bg-white border-slate-200 text-slate-800"
              )}
            >
              <button 
                onClick={() => setIsLoginModalOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:bg-white/5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-sky-500 rounded-2xl mb-3 shadow-lg shadow-sky-500/20 text-white">
                  <Church className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold">Acesso Restrito</h3>
                <p className="text-slate-400 text-xs mt-1">
                  Faça login como Administrador ou Líder de Departamento para acessar <strong>+Novo Membro</strong> e <strong>Relatórios</strong>.
                </p>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 ml-1 mb-1 block">
                    Usuário (Primeiro Nome ou 'admin')
                  </label>
                  <input
                    type="text"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder="Ex: Samuel, Karoline ou admin"
                    required
                    className={cn(
                      "w-full px-4 py-3 rounded-xl border text-sm outline-none focus:ring-2",
                      isDarkMode ? "bg-slate-800 border-white/5 text-white focus:ring-sky-500/20" : "bg-slate-50 border-slate-200 text-slate-800 focus:ring-sky-500/10"
                    )}
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1 ml-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                      Senha de Acesso
                    </label>
                    <span className="text-[10px] text-sky-400 italic">Dica (Admin): "Quem é o autor da Salvação?"</span>
                  </div>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="•••••••"
                    required
                    className={cn(
                      "w-full px-4 py-3 rounded-xl border text-sm outline-none focus:ring-2",
                      isDarkMode ? "bg-slate-800 border-white/5 text-white focus:ring-sky-500/20" : "bg-slate-50 border-slate-200 text-slate-800 focus:ring-sky-500/10"
                    )}
                  />
                </div>

                {loginError && (
                  <p className="text-red-400 text-xs bg-red-400/10 p-3 rounded-lg border border-red-400/20">
                    {loginError}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full bg-sky-500 hover:bg-sky-400 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-sky-500/20 transition-all cursor-pointer"
                >
                  Entrar no Sistema
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MemberFormModal({ member, isDarkMode, onClose, onSave }: { member: Member | null, isDarkMode: boolean, onClose: () => void, onSave: (m: Member) => void }) {
  const [formData, setFormData] = useState<Partial<Member>>(member || {
    name: '',
    birthday: '',
    month: 'Janeiro',
    day: 1,
    departments: [],
    isLeadership: false,
    membershipType: 'Batizado'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.birthday) return;
    onSave(formData as Member);
  };

  const toggleDept = (dept: string) => {
    const current = formData.departments || [];
    if (current.includes(dept)) {
      setFormData({ ...formData, departments: current.filter(d => d !== dept) });
    } else {
      setFormData({ ...formData, departments: [...current, dept] });
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className={cn(
          "w-full max-w-xl border rounded-2xl shadow-2xl overflow-hidden transition-colors duration-500",
          isDarkMode ? "bg-[#1e293b] border-white/10" : "bg-white border-slate-200 text-slate-800"
        )}
      >
        <div className={cn(
          "p-6 border-b flex items-center justify-between",
          isDarkMode ? "border-white/5 bg-white/5" : "border-slate-100 bg-slate-50"
        )}>
          <h3 className="text-xl font-bold">{member ? 'Editar Membro' : 'Novo Membro'}</h3>
          <button onClick={onClose} className={cn("p-2 rounded-lg transition-colors", isDarkMode ? "hover:bg-white/5" : "hover:bg-slate-200")}>
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className={cn("text-[10px] font-bold uppercase tracking-widest ml-1", isDarkMode ? "text-slate-500" : "text-slate-400")}>Nome Completo</label>
              <input 
                type="text" 
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className={cn(
                  "w-full border rounded-xl px-4 py-3 text-sm outline-none transition-all",
                  isDarkMode 
                    ? "bg-slate-800/50 border-white/5 text-white focus:ring-2 focus:ring-sky-500/20" 
                    : "bg-slate-50 border-slate-200 text-slate-800 focus:ring-2 focus:ring-sky-500/10"
                )}
                placeholder="Ex: João Silva"
                required
              />
            </div>
            <div className="space-y-2">
              <label className={cn("text-[10px] font-bold uppercase tracking-widest ml-1", isDarkMode ? "text-slate-500" : "text-slate-400")}>Tipo de Membresia</label>
              <select 
                value={formData.membershipType}
                onChange={e => setFormData({ ...formData, membershipType: e.target.value as any })}
                className={cn(
                  "w-full border rounded-xl px-4 py-3 text-sm outline-none transition-all appearance-none",
                  isDarkMode 
                    ? "bg-slate-800/50 border-white/5 text-white focus:ring-2 focus:ring-sky-500/20" 
                    : "bg-slate-50 border-slate-200 text-slate-800 focus:ring-2 focus:ring-sky-500/10"
                )}
              >
                <option value="Batizado">Batizado</option>
                <option value="Congregado">Congregado</option>
                <option value="Visitante">Visitante</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className={cn("text-[10px] font-bold uppercase tracking-widest ml-1", isDarkMode ? "text-slate-500" : "text-slate-400")}>Aniversário (Ex: 05/jan)</label>
              <input 
                type="text" 
                value={formData.birthday}
                onChange={e => {
                  const val = e.target.value;
                  const parts = val.split('/');
                  const day = parseInt(parts[0]);
                  setFormData({ ...formData, birthday: val, day: isNaN(day) ? 1 : day });
                }}
                className={cn(
                  "w-full border rounded-xl px-4 py-3 text-sm outline-none transition-all",
                  isDarkMode 
                    ? "bg-slate-800/50 border-white/5 text-white focus:ring-2 focus:ring-sky-500/20" 
                    : "bg-slate-50 border-slate-200 text-slate-800 focus:ring-2 focus:ring-sky-500/10"
                )}
                placeholder="DD/ddd (ex: 22/nov)"
                required
              />
            </div>
            <div className="space-y-2">
              <label className={cn("text-[10px] font-bold uppercase tracking-widest ml-1", isDarkMode ? "text-slate-500" : "text-slate-400")}>Mês (Sincronização)</label>
              <select 
                value={formData.month}
                onChange={e => setFormData({ ...formData, month: e.target.value })}
                className={cn(
                  "w-full border rounded-xl px-4 py-3 text-sm outline-none transition-all appearance-none",
                  isDarkMode 
                    ? "bg-slate-800/50 border-white/5 text-white focus:ring-2 focus:ring-sky-500/20" 
                    : "bg-slate-50 border-slate-200 text-slate-800 focus:ring-2 focus:ring-sky-500/10"
                )}
              >
                {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <label className={cn("text-[10px] font-bold uppercase tracking-widest ml-1 block", isDarkMode ? "text-slate-500" : "text-slate-400")}>Departamentos (Múltipla Escolha)</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {DEPARTMENTS.map(dept => (
                <button
                  key={dept}
                  type="button"
                  onClick={() => toggleDept(dept)}
                  className={cn(
                    "text-[10px] font-bold p-2.5 rounded-lg border transition-all text-left uppercase tracking-widest flex items-center justify-between",
                    formData.departments?.includes(dept) 
                      ? "bg-sky-500/10 border-sky-500/50 text-sky-400" 
                      : isDarkMode 
                        ? "bg-slate-800/30 border-white/5 text-slate-500 hover:border-white/10"
                        : "bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300"
                  )}
                >
                  <span className="truncate">{dept}</span>
                  {formData.departments?.includes(dept) && <Check className="w-3 h-3 shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 flex items-center gap-4">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, isLeadership: !formData.isLeadership })}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg border text-xs font-bold uppercase tracking-widest transition-all",
                formData.isLeadership 
                  ? "bg-amber-500/10 border-amber-500/50 text-amber-500" 
                  : isDarkMode ? "bg-slate-800/30 border-white/5 text-slate-500" : "bg-slate-50 border-slate-200 text-slate-400"
              )}
            >
              <Star className={cn("w-3.5 h-3.5", formData.isLeadership && "fill-amber-500")} />
              {formData.isLeadership ? 'É Liderança' : 'Tornar Liderança'}
            </button>
          </div>

          <div className="pt-6 flex gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className={cn(
                "flex-1 px-6 py-3 border rounded-xl text-sm font-bold transition-colors",
                isDarkMode 
                  ? "bg-slate-800 border-white/5 text-slate-400 hover:bg-slate-700" 
                  : "bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200"
              )}
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="flex-1 px-6 py-3 bg-sky-500 rounded-xl text-sm font-bold text-white shadow-lg shadow-sky-500/10 hover:bg-sky-400 transition-colors flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {member ? 'Salvar Alterações' : 'Cadastrar Membro'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function ReportModal({ members, isDarkMode, onClose }: { members: Member[], isDarkMode: boolean, onClose: () => void }) {
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handlePrint = async () => {
    setIsGenerating(true);
    const reportMembers = selectedDepts.length === 0 
      ? members 
      : members.filter(m => m.departments.some(d => selectedDepts.includes(d)));

    // Create a hidden div for rendering the report
    const reportElement = document.createElement('div');
    reportElement.style.padding = '40px';
    reportElement.style.width = '800px';
    reportElement.style.backgroundColor = 'white';
    reportElement.style.color = '#1e293b';
    reportElement.style.fontFamily = 'sans-serif';
    reportElement.style.position = 'fixed';
    reportElement.style.left = '-10000px';
    reportElement.innerHTML = `
      <h1 style="color: #0ea5e9; margin: 0; font-size: 24px;">Relatório de Membros</h1>
      <h2 style="color: #1e293b; margin: 0 0 5px 0; font-size: 18px;">Congregação Mensageiros da Fé</h2>
      <p style="color: #64748b; font-size: 12px; margin-bottom: 30px;">Gerado em ${new Date().toLocaleDateString('pt-BR')} | Portal Ecclesia</p>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
            <th style="padding: 12px; text-align: left; font-size: 11px; text-transform: uppercase;">Nome</th>
            <th style="padding: 12px; text-align: left; font-size: 11px; text-transform: uppercase;">Classificação</th>
            <th style="padding: 12px; text-align: left; font-size: 11px; text-transform: uppercase;">Departamentos</th>
            <th style="padding: 12px; text-align: left; font-size: 11px; text-transform: uppercase;">Aniversário</th>
          </tr>
        </thead>
        <tbody>
          ${reportMembers.sort((a, b) => a.name.localeCompare(b.name)).map(m => `
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px; font-size: 13px;"><strong>${m.name}</strong></td>
              <td style="padding: 10px; font-size: 11px;">${m.isLeadership ? 'Liderança' : 'Congregação'}</td>
              <td style="padding: 10px; font-size: 11px;">${m.departments.join(', ')}</td>
              <td style="padding: 10px; font-size: 13px;">${m.birthday}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    document.body.appendChild(reportElement);

    try {
      const canvas = await html2canvas(reportElement, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`relatorio-membros-${new Date().getTime()}.pdf`);
    } catch (err) {
      console.error('PDF Error:', err);
    } finally {
      document.body.removeChild(reportElement);
      setIsGenerating(false);
      onClose();
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className={cn(
          "w-full max-w-lg border rounded-2xl shadow-2xl overflow-hidden transition-colors duration-500",
          isDarkMode ? "bg-[#1e293b] border-white/10" : "bg-white border-slate-200 text-slate-800"
        )}
      >
        <div className={cn(
          "p-6 border-b flex items-center justify-between",
          isDarkMode ? "border-white/5 bg-white/5" : "border-slate-100 bg-slate-50"
        )}>
          <h3 className="text-xl font-bold">Gerar Relatório</h3>
          <button onClick={onClose} className={cn("p-2 rounded-lg transition-colors", isDarkMode ? "hover:bg-white/5" : "hover:bg-slate-200")}>
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <p className={cn("text-sm", isDarkMode ? "text-slate-400" : "text-slate-500")}>
            Selecione os departamentos que deseja incluir no relatório. Deixe vazio para imprimir todos os membros.
          </p>
          
          <div className="grid grid-cols-2 gap-2 max-h-[40vh] overflow-y-auto custom-scrollbar pr-2">
            {DEPARTMENTS.map(dept => (
              <button
                key={dept}
                onClick={() => {
                  if (selectedDepts.includes(dept)) {
                    setSelectedDepts((prev: string[]) => prev.filter((d: string) => d !== dept));
                  } else {
                    setSelectedDepts((prev: string[]) => [...prev, dept]);
                  }
                }}
                className={cn(
                  "text-[10px] font-bold p-2.5 rounded-lg border transition-all text-left uppercase tracking-widest flex items-center justify-between",
                  selectedDepts.includes(dept) 
                    ? "bg-sky-500/10 border-sky-500/50 text-sky-400" 
                    : isDarkMode 
                      ? "bg-slate-800/30 border-white/5 text-slate-500 hover:border-white/10"
                      : "bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300"
                )}
              >
                <span className="truncate">{dept}</span>
                {selectedDepts.includes(dept) && <Check className="w-3 h-3 shrink-0" />}
              </button>
            ))}
          </div>

          <div className="flex gap-3 pt-6">
            <button 
              onClick={onClose}
              className={cn(
                "flex-1 px-6 py-3 border rounded-xl text-sm font-bold transition-colors",
                isDarkMode 
                  ? "bg-slate-800 border-white/5 text-slate-400 hover:bg-slate-700" 
                  : "bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200"
              )}
            >
              Fechar
            </button>
            <button 
              onClick={handlePrint}
              disabled={isGenerating}
              className={cn(
                "flex-1 px-6 py-3 bg-sky-500 rounded-xl text-sm font-bold text-white shadow-lg shadow-sky-500/10 hover:bg-sky-400 transition-colors flex items-center justify-center gap-2",
                isGenerating && "opacity-50 cursor-not-allowed"
              )}
            >
              {isGenerating ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Printer className="w-4 h-4" />
              )}
              {isGenerating ? 'Gerando...' : 'Gerar PDF'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function NavItem({ icon, label, active, darkMode, onClick }: { icon: React.ReactNode, label: string, active?: boolean, darkMode?: boolean, onClick?: () => void }) {
    return (
      <button 
        onClick={onClick}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all font-bold text-xs uppercase tracking-widest border",
          active 
            ? darkMode ? "bg-sky-500/10 text-sky-400 border-sky-500/20" : "bg-sky-500 text-white border-transparent shadow-lg shadow-sky-500/20"
            : darkMode ? "text-slate-500 border-transparent hover:bg-white/5" : "text-slate-400 border-transparent hover:bg-slate-50"
        )}
      >
        {icon}
        <span>{label}</span>
      </button>
    );
  }
  
  function StatCard({ label, value, subtext, subtextColor = "text-slate-500", color, darkMode, onClick }: { label: string, value: number, subtext: string, subtextColor?: string, color: 'sky' | 'indigo' | 'teal', darkMode?: boolean, onClick?: () => void, [key: string]: any }) {
    const colors = {
      sky: darkMode ? "text-sky-400" : "text-sky-600",
      indigo: darkMode ? "text-indigo-400" : "text-indigo-600",
      teal: darkMode ? "text-teal-400" : "text-teal-600"
    };
  
    return (
      <button 
        onClick={onClick}
        className={cn(
          "card-sleek flex flex-col justify-center items-center text-center py-6 md:py-8 !shadow-none transition-all duration-300 w-full hover:scale-[1.02] active:scale-95 group",
          !darkMode ? "bg-white border-slate-200" : "bg-white/5 border-white/5 hover:bg-white/[0.07]"
        )}
      >
        <p className={cn("text-[8px] md:text-[10px] uppercase tracking-[0.2em] font-bold mb-2", darkMode ? "text-slate-400 group-hover:text-slate-300" : "text-slate-400 group-hover:text-slate-600 transition-colors")}>{label}</p>
        <p className={cn("text-3xl md:text-5xl font-black tracking-tighter transition-all duration-500", colors[color])}>{value}</p>
        <p className={cn("text-[8px] md:text-[10px] font-bold mt-2 md:mt-3 uppercase tracking-widest", darkMode ? subtextColor : "text-slate-400")}>{subtext}</p>
      </button>
    );
  }
