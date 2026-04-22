import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie
} from 'recharts';
import { 
  Users, Calendar, Briefcase, Search, Filter, LogOut, ChevronRight, Cake, 
  UserCircle, Star, Grid, Church, Plus, Printer, X, Check, Edit2, Save,
  Sun, Moon, LayoutDashboard, Menu, Flame
} from 'lucide-react';
import { membersData, MONTHS, DEPARTMENTS } from '../data/members';
import { Member } from '../types';
import { cn } from '../lib/utils';

interface DashboardProps {
  onLogout: () => void;
}

export default function Dashboard({ onLogout }: DashboardProps) {
  const [allMembers, setAllMembers] = useState<Member[]>(membersData);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [leadershipFilter, setLeadershipFilter] = useState<'all' | 'leadership' | 'congregation'>('all');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Modals state
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Filtered members list
  const filteredMembers = useMemo(() => {
    return allMembers.filter(m => {
      const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDept = !selectedDept || m.departments.includes(selectedDept);
      const matchesMonth = !selectedMonth || m.month === selectedMonth;
      const matchesLeadership = leadershipFilter === 'all' || 
                                (leadershipFilter === 'leadership' ? m.isLeadership : !m.isLeadership);

      return matchesSearch && matchesDept && matchesMonth && matchesLeadership;
    });
  }, [allMembers, searchTerm, selectedDept, selectedMonth, leadershipFilter]);

  // Data processing for charts
  const deptData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredMembers.forEach(m => {
      m.departments.forEach(dept => {
        counts[dept] = (counts[dept] || 0) + 1;
      });
    });
    return DEPARTMENTS.map(dept => ({
      name: dept,
      value: counts[dept] || 0
    })).filter(d => d.value > 0);
  }, [filteredMembers]);

  const monthData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredMembers.forEach(m => {
      counts[m.month] = (counts[m.month] || 0) + 1;
    });
    return MONTHS.map(month => ({
      name: month,
      value: counts[month] || 0
    }));
  }, [filteredMembers]);

  const leadershipStats = useMemo(() => {
    const leaders = filteredMembers.filter(m => m.isLeadership).length;
    const congregation = filteredMembers.length - leaders;
    return [
      { name: 'Liderança', value: leaders },
      { name: 'Congregação', value: congregation }
    ].filter(s => s.value > 0);
  }, [filteredMembers]);

  // Next birthdays (today or soon)
  const upcomingBirthdays = useMemo(() => {
    return [...allMembers].sort((a, b) => {
      const monthA = MONTHS.indexOf(a.month);
      const monthB = MONTHS.indexOf(b.month);
      if (monthA !== monthB) return monthA - monthB;
      return a.day - b.day;
    }).slice(0, 5);
  }, [allMembers]);

  const resetFilters = () => {
    setSelectedDept(null);
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
        <div className="space-y-8">
          <div className="flex flex-col items-center gap-3 px-2 text-center pb-4 border-b border-white/5">
            <div className="relative">
              <div className={cn(
                "w-20 h-20 rounded-full flex items-center justify-center p-0.5 transition-all relative overflow-hidden",
                isDarkMode 
                  ? "bg-gradient-to-tr from-sky-600 to-sky-400 shadow-lg shadow-sky-500/20" 
                  : "bg-gradient-to-tr from-sky-500 to-sky-300 shadow-lg shadow-sky-500/10"
              )}>
                <div className={cn(
                  "w-full h-full rounded-full flex flex-col items-center justify-center text-white border-2 border-white/20",
                  isDarkMode ? "bg-[#0f172a]/80" : "bg-white/80"
                )}>
                  <Church className={cn("w-8 h-8 mb-0.5", isDarkMode ? "text-sky-400" : "text-sky-600")} />
                  <span className={cn("text-[6px] font-black uppercase leading-none text-center px-2", isDarkMode ? "text-sky-400" : "text-sky-600")}>
                    MENSAGEIROS DA FÉ
                  </span>
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-amber-500 rounded-full flex items-center justify-center shadow-lg border-2 border-[#0f172a]">
                <Flame className="w-3.5 h-3.5 text-white fill-white" />
              </div>
            </div>
            <div className="space-y-0.5">
              <span className={cn("text-[10px] font-black tracking-[0.2em] uppercase leading-none", isDarkMode ? "text-white" : "text-slate-800")}>Portal Ecclesia</span>
              <p className={cn("text-[8px] font-bold uppercase tracking-tighter", isDarkMode ? "text-sky-500" : "text-sky-600")}>Congr. Mensageiros da Fé</p>
            </div>
          </div>

          <nav className="space-y-1 pt-4">
            <NavItem 
              icon={<LayoutDashboard className="w-4 h-4" />} 
              label="Dashboard" 
              active={!selectedDept && !selectedMonth} 
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
                  <label className={cn("text-[10px] font-bold ml-1 uppercase tracking-wider", isDarkMode ? "text-slate-500" : "text-slate-400")}>Mês do Aniversário</label>
                  <select 
                    value={selectedMonth || ''} 
                    onChange={(e) => setSelectedMonth(e.target.value || null)}
                    className={cn(
                      "w-full border rounded-lg py-2 px-3 text-xs focus:outline-none focus:ring-2 transition-all appearance-none",
                      isDarkMode 
                        ? "bg-slate-800/50 border-white/5 text-slate-300 focus:ring-sky-500/20" 
                        : "bg-slate-50 border-slate-200 text-slate-700 focus:ring-sky-500/10"
                    )}
                  >
                    <option value="">Todos os Meses</option>
                    {MONTHS.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className={cn("text-[10px] font-bold ml-1 uppercase tracking-wider", isDarkMode ? "text-slate-500" : "text-slate-400")}>Departamento</label>
                  <select 
                    value={selectedDept || ''} 
                    onChange={(e) => setSelectedDept(e.target.value || null)}
                    className={cn(
                      "w-full border rounded-lg py-2 px-3 text-xs focus:outline-none focus:ring-2 transition-all appearance-none",
                      isDarkMode 
                        ? "bg-slate-800/50 border-white/5 text-slate-300 focus:ring-sky-500/20" 
                        : "bg-slate-50 border-slate-200 text-slate-700 focus:ring-sky-500/10"
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
              <div className="min-w-0">
                <p className={cn("text-xs font-bold truncate", isDarkMode ? "text-white" : "text-slate-800")}>Admin Mensageiros</p>
                <p className="text-[10px] text-slate-500 truncate uppercase font-bold tracking-tighter">Congregação Ativa</p>
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
          "h-auto py-3 md:h-16 shrink-0 border-b px-4 md:px-8 flex flex-wrap md:flex-nowrap items-center justify-between sticky top-0 z-10 transition-colors duration-500",
          isDarkMode ? "bg-[#0f172a] border-white/5" : "bg-white border-slate-200"
        )}>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className={cn(
                "p-2.5 rounded-xl lg:hidden border transition-all active:scale-95", 
                isDarkMode 
                  ? "bg-slate-800/50 border-white/5 text-sky-400 hover:bg-slate-800" 
                  : "bg-slate-50 border-slate-200 text-sky-600 hover:bg-slate-100"
              )}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex flex-col md:flex-row md:items-center md:gap-2">
              <h2 className={cn("text-base md:text-lg font-bold tracking-tight", isDarkMode ? "text-white" : "text-slate-800")}>
                Portal Ecclesia
              </h2>
              <span className={cn("text-[9px] font-bold uppercase tracking-widest hidden sm:inline-block px-2 py-1 rounded border leading-none", isDarkMode ? "bg-sky-500/10 text-sky-400 border-sky-500/20" : "bg-sky-50 text-sky-600 border-sky-200")}>
               Mensageiros da Fé
              </span>
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
            <button 
              onClick={() => setIsReportModalOpen(true)}
              className={cn(
                "p-2 border rounded-lg text-xs font-bold transition-colors md:px-4 md:py-2 md:flex md:gap-2 md:items-center",
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
              onClick={() => {
                setEditingMember(null);
                setIsMemberModalOpen(true);
              }}
              className="p-2 bg-sky-500 rounded-lg text-xs font-bold text-white shadow-lg shadow-sky-500/10 hover:bg-sky-400 transition-colors flex items-center md:px-4 md:py-2 md:gap-2"
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
              { label: 'Membros Ativos', value: filteredMembers.length, sub: 'Filtro atual', color: 'sky' },
              { label: 'Liderança', value: filteredMembers.filter(m => m.isLeadership).length, sub: 'Corpo diretivo', color: 'indigo' },
              { label: 'Congregação', value: filteredMembers.filter(m => !m.isLeadership).length, sub: 'Membros gerais', color: 'teal' },
              { label: 'Aniversariantes', value: filteredMembers.filter(m => m.month === MONTHS[new Date().getMonth()]).length, sub: 'Este mês', color: 'sky' }
            ].map((stat, i) => (
              <StatCard 
                key={i}
                label={stat.label} 
                value={stat.value} 
                subtext={stat.sub}
                color={stat.color as any}
                darkMode={isDarkMode}
              />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart: Departments */}
            <div className={cn("card-sleek !shadow-none min-h-[350px]", !isDarkMode && "bg-white border-slate-200")}>
              <h3 className={cn("text-xs font-bold uppercase tracking-widest mb-6 border-b pb-2", isDarkMode ? "text-slate-500 border-white/5" : "text-slate-400 border-slate-100")}>Departamentos</h3>
              <div className="h-[250px] w-full min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%" minHeight={250}>
                  <BarChart data={deptData} layout="vertical" margin={{ left: 0, right: 20 }}>
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: isDarkMode ? '#64748b' : '#94a3b8', fontSize: 10 }}
                      width={100}
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
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {deptData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#0ea5e9' : '#6366f1'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart: Leadership vs Congregation */}
            <div className={cn("card-sleek !shadow-none min-h-[350px]", !isDarkMode && "bg-white border-slate-200")}>
              <h3 className={cn("text-xs font-bold uppercase tracking-widest mb-6 border-b pb-2", isDarkMode ? "text-slate-500 border-white/5" : "text-slate-400 border-slate-100")}>Composição da Igreja</h3>
              <div className="h-[250px] w-full flex flex-col items-center justify-center min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%" minHeight={250}>
                  <PieChart>
                    <Pie
                      data={leadershipStats}
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {leadershipStats.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#f59e0b' : '#0ea5e9'} />
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
                      <span className={cn("text-[10px] font-bold uppercase", isDarkMode ? "text-slate-500" : "text-slate-400")}>{d.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Chart: Monthly Distribution */}
            <div className={cn("card-sleek !shadow-none min-h-[350px]", !isDarkMode && "bg-white border-slate-200")}>
              <h3 className={cn("text-xs font-bold uppercase tracking-widest mb-6 border-b pb-2", isDarkMode ? "text-slate-500 border-white/5" : "text-slate-400 border-slate-100")}>Ciclo de Aniversários</h3>
              <div className="h-[250px] w-full min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%" minHeight={250}>
                  <BarChart data={monthData}>
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: isDarkMode ? '#64748b' : '#94a3b8', fontSize: 8 }}
                      interval={0}
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
                    <Bar dataKey="value" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Members Table */}
          <div className={cn("card-sleek !p-0 overflow-hidden !shadow-none", !isDarkMode && "bg-white border-slate-200")}>
            <div className={cn("p-6 border-b flex flex-col md:flex-row md:items-center justify-between gap-4", isDarkMode ? "border-white/5" : "border-slate-100")}>
              <h3 className={cn("text-lg font-bold", isDarkMode ? "text-white" : "text-slate-800")}>Relatório Digital - Mensageiros da Fé</h3>
              <div className="flex items-center gap-2">
                <AnimatePresence>
                  {searchTerm || selectedDept || selectedMonth || leadershipFilter !== 'all' ? (
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
                              <Cake className="w-3 h-3 text-rose-500/50" />
                              <span className={cn("text-xs transition-colors uppercase font-bold tracking-tighter", isDarkMode ? "text-slate-600 group-hover:text-slate-400" : "text-slate-400 group-hover:text-slate-600")}>
                                {member.birthday}
                              </span>
                            </div>
                            <button 
                              onClick={() => {
                                setEditingMember(member);
                                setIsMemberModalOpen(true);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-sky-500/10 rounded-md text-sky-400 transition-all"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Member Form Modal */}
      <AnimatePresence>
        {isMemberModalOpen && (
          <MemberFormModal 
            member={editingMember} 
            isDarkMode={isDarkMode}
            onClose={() => setIsMemberModalOpen(false)} 
            onSave={(member) => {
              if (editingMember) {
                setAllMembers(prev => prev.map(m => m.id === member.id ? member : m));
              } else {
                setAllMembers(prev => [...prev, { ...member, id: Math.random().toString(36).substr(2, 9) }]);
              }
              setIsMemberModalOpen(false);
            }}
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

  const handlePrint = () => {
    const reportMembers = selectedDepts.length === 0 
      ? members 
      : members.filter(m => m.departments.some(d => selectedDepts.includes(d)));

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>Relatório de Membros - Ecclesia</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #1e293b; }
            h1 { color: #0ea5e9; margin-bottom: 5px; }
            p.meta { color: #64748b; font-size: 12px; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { text-align: left; background: #f8fafc; padding: 12px; border-bottom: 2px solid #e2e8f0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }
            td { padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
            .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; text-transform: uppercase; margin-right: 4px; }
            .leader { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
            .dept { background: #f1f5f9; color: #475569; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <h1>Relatório de Membros - Congregação Mensageiros da Fé</h1>
          <p class="meta">Gerado em ${new Date().toLocaleDateString('pt-BR')} | Gestão Ecclesia</p>
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Classificação</th>
                <th>Departamentos</th>
                <th>Aniversário</th>
              </tr>
            </thead>
            <tbody>
              ${reportMembers.sort((a, b) => a.name.localeCompare(b.name)).map(m => `
                <tr>
                  <td><strong>${m.name}</strong></td>
                  <td>${m.isLeadership ? '<span class="badge leader">Liderança</span>' : 'Congregação'}</td>
                  <td>${m.departments.map(d => `<span class="badge dept">${d}</span>`).join('')}</td>
                  <td>${m.birthday}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>window.print();</script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
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
                    setSelectedDepts(selectedDepts.filter(d => d !== dept));
                  } else {
                    setSelectedDepts([...selectedDepts, dept]);
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
              className="flex-1 px-6 py-3 bg-sky-500 rounded-xl text-sm font-bold text-white shadow-lg shadow-sky-500/10 hover:bg-sky-400 transition-colors flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Imprimir Relatório
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
  
  function StatCard({ label, value, subtext, subtextColor = "text-slate-500", color, darkMode }: { label: string, value: number, subtext: string, subtextColor?: string, color: 'sky' | 'indigo' | 'teal', darkMode?: boolean }) {
    const colors = {
      sky: darkMode ? "text-sky-400" : "text-sky-600",
      indigo: darkMode ? "text-indigo-400" : "text-indigo-600",
      teal: darkMode ? "text-teal-400" : "text-teal-600"
    };
  
    return (
      <div className={cn(
        "card-sleek flex flex-col justify-center items-center text-center py-8 !shadow-none transition-colors duration-500",
        !darkMode && "bg-white border-slate-200"
      )}>
        <p className={cn("text-[10px] uppercase tracking-[0.2em] font-bold mb-2", darkMode ? "text-slate-500" : "text-slate-400")}>{label}</p>
        <p className={cn("text-5xl font-bold tracking-tighter transition-colors duration-500", colors[color])}>{value}</p>
        <p className={cn("text-[10px] font-bold mt-3 uppercase tracking-widest", darkMode ? subtextColor : "text-slate-400")}>{subtext}</p>
      </div>
    );
  }
