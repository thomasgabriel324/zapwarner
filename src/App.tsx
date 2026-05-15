import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Smartphone, 
  Settings as SettingsIcon, 
  History, 
  Play, 
  Square,
  RefreshCw,
  Plus,
  Activity,
  CheckCircle2,
  AlertCircle,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Types
interface Instance {
  instance: {
    instanceName: string;
    status: string;
    owner?: string;
    profileName?: string;
    profilePictureUrl?: string;
  };
  metrics: {
    sent: number;
    received: number;
    score: number;
    lastInteracted: string;
  };
}

interface Log {
  id: number;
  timestamp: string;
  message: string;
  type: 'info' | 'error' | 'success';
}

interface Settings {
  evolutionUrl: string;
  evolutionApiKey: string;
  intervalMin: number;
  intervalMax: number;
  isActive: boolean;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'instances' | 'settings' | 'logs'>('dashboard');
  const [instances, setInstances] = useState<Instance[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [settings, setSettings] = useState<Settings>({
    evolutionUrl: '',
    evolutionApiKey: '',
    intervalMin: 5,
    intervalMax: 15,
    isActive: false
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [instRes, logsRes, settRes] = await Promise.all([
        fetch('/api/instances'),
        fetch('/api/logs'),
        fetch('/api/settings')
      ]);
      const instData = await instRes.json();
      const logsData = await logsRes.json();
      const settData = await settRes.json();
      
      setInstances(instData);
      setLogs(logsData);
      setSettings(settData);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const updateSettings = async (newSettings: Partial<Settings>) => {
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...settings, ...newSettings })
      });
      const data = await response.json();
      setSettings(data);
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  };

  const toggleMaturator = () => {
    updateSettings({ isActive: !settings.isActive });
  };

  const getMaturityColor = (score: number) => {
    if (score < 50) return 'text-rose-500';
    if (score < 150) return 'text-amber-500';
    return 'text-emerald-500';
  };

  const getMaturityProgress = (score: number) => {
    return Math.min(100, (score / 200) * 100);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 font-sans selection:bg-emerald-500/30">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-zinc-900/50 border-r border-zinc-800 p-6 z-50">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="size-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <MessageSquare className="text-white size-6" />
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-tight">ZapWarmer</h1>
            <p className="text-xs text-zinc-500 font-medium">MATURADOR ETERNO</p>
          </div>
        </div>

        <nav className="space-y-1">
          <NavItem 
            icon={<LayoutDashboard size={20} />} 
            label="Dashboard" 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
          />
          <NavItem 
            icon={<Smartphone size={20} />} 
            label="Instâncias" 
            active={activeTab === 'instances'} 
            onClick={() => setActiveTab('instances')} 
          />
          <NavItem 
            icon={<History size={20} />} 
            label="Logs de Atividade" 
            active={activeTab === 'logs'} 
            onClick={() => setActiveTab('logs')} 
          />
          <NavItem 
            icon={<SettingsIcon size={20} />} 
            label="Configurações" 
            active={activeTab === 'settings'} 
            onClick={() => setActiveTab('settings')} 
          />
        </nav>

        <div className="absolute bottom-6 left-6 right-6">
          <button 
            onClick={toggleMaturator}
            className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-300 ${
              settings.isActive 
                ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500 hover:text-white' 
                : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-95'
            }`}
          >
            {settings.isActive ? (
              <><Square size={18} fill="currentColor" /> Parar Maturador</>
            ) : (
              <><Play size={18} fill="currentColor" /> Iniciar Maturador</>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-10 max-w-7xl">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <header className="flex justify-between items-end">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                  <p className="text-zinc-500 mt-1">Visão geral do seu sistema de maturação automática.</p>
                </div>
                <div className="flex gap-3">
                  <div className="bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-lg flex items-center gap-2">
                    <Activity className={`size-4 ${settings.isActive ? 'text-emerald-500 animate-pulse' : 'text-rose-500'}`} />
                    <span className="text-sm font-medium">Status: {settings.isActive ? 'Maturador Ativo' : 'Pausado'}</span>
                  </div>
                </div>
              </header>

              <div className="grid grid-cols-4 gap-6">
                <StatCard 
                  title="Total de Chips" 
                  value={instances.length.toString()} 
                  icon={<Smartphone className="text-emerald-500" />} 
                  description="Integrados via Evolution" 
                />
                <StatCard 
                  title="Chips Prontos" 
                  value={instances.filter(i => i.metrics.score > 200).length.toString()} 
                  icon={<CheckCircle2 className="text-emerald-500" />} 
                  description="Score acima de 200" 
                />
                <StatCard 
                  title="Total Transações" 
                  value={instances.reduce((acc, i) => acc + i.metrics.sent + i.metrics.received, 0).toString()} 
                  icon={<MessageSquare className="text-emerald-500" />} 
                  description="Fluxos detectados" 
                />
                <StatCard 
                  title="Maturidade Média" 
                  value={(instances.length ? (instances.reduce((acc, i) => acc + i.metrics.score, 0) / instances.length).toFixed(0) : "0")} 
                  icon={<Activity className="text-emerald-500" />} 
                  description="Score médio geral" 
                />
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <History className="size-5 text-emerald-500" />
                      Fluxo em Tempo Real
                    </h3>
                  </div>
                  <div className="space-y-4">
                    {logs.slice(0, 6).map(log => (
                      <div key={log.id} className="flex items-start gap-4 p-3 rounded-xl bg-zinc-900 border border-zinc-800/50 hover:border-zinc-700 transition-colors">
                        <div className={`mt-1 size-2 rounded-full shrink-0 ${
                          log.type === 'success' ? 'bg-emerald-500' : log.type === 'error' ? 'bg-rose-500' : 'bg-blue-500'
                        }`} />
                        <div className="flex-1">
                          <p className="text-sm text-zinc-300 leading-snug">{log.message}</p>
                          <div className="flex justify-between mt-1">
                            <span className="text-[10px] text-zinc-500 uppercase tracking-widest">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {logs.length === 0 && (
                      <div className="text-center py-10 opacity-50 flex flex-col items-center gap-2">
                        <Activity className="size-8 text-zinc-800" />
                        <p>Nenhuma atividade registrada.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                    <Smartphone className="size-5 text-emerald-500" />
                    Heatmap de Maturação
                  </h3>
                  <div className="space-y-4">
                    {instances.sort((a,b) => b.metrics.score - a.metrics.score).slice(0, 6).map(inst => (
                      <div key={inst.instance.instanceName} className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800/50">
                        <div className="flex items-center gap-3">
                          <div className="size-10 bg-zinc-800 rounded-lg flex items-center justify-center font-bold text-xs ring-1 ring-zinc-700">
                             {inst.instance.profilePictureUrl ? (
                               <img src={inst.instance.profilePictureUrl} className="size-full object-cover rounded-lg" alt="" />
                             ) : (
                                inst.instance.instanceName.slice(0,2).toUpperCase()
                             )}
                          </div>
                          <div>
                            <span className="text-sm font-semibold block">{inst.instance.instanceName}</span>
                            <span className="text-[10px] text-zinc-500 uppercase tracking-tighter">Última: {inst.metrics.lastInteracted ? new Date(inst.metrics.lastInteracted).toLocaleTimeString() : 'N/A'}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-xs font-bold ${getMaturityColor(inst.metrics.score)}`}>
                            {inst.metrics.score.toFixed(1)} <span className="text-[8px] text-zinc-600 ml-1">pts</span>
                          </span>
                          <div className="w-24 h-1 bg-zinc-800 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${inst.metrics.score > 150 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                              style={{ width: `${getMaturityProgress(inst.metrics.score)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    {instances.length === 0 && (
                      <div className="text-center py-10 opacity-50">Configura a Evolution nas Settings.</div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'instances' && (
            <motion.div
              key="instances"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-8"
            >
              <header className="flex justify-between items-end">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">Chips em Maturação</h2>
                  <p className="text-zinc-500 mt-1">Todos os dispositivos conectados que estão conversando entre si.</p>
                </div>
                <div className="flex gap-4">
                  <div className="bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-xl flex items-center gap-3">
                    <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Total Ativos</div>
                    <div className="bg-emerald-500/20 text-emerald-500 px-2 py-0.5 rounded text-sm font-bold">
                      {instances.filter(i => i.instance.status === 'open').length}
                    </div>
                  </div>
                </div>
              </header>

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                {instances.map((inst, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={inst.instance.instanceName} 
                    className="bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-sm rounded-3xl p-6 group hover:border-emerald-500/40 transition-all duration-300 shadow-xl relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                      <Smartphone size={100} />
                    </div>

                    <div className="flex items-start justify-between mb-6 relative">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="size-16 bg-zinc-800 rounded-2xl flex items-center justify-center overflow-hidden border border-zinc-700 shadow-inner group-hover:border-emerald-500/50 transition-colors">
                            {inst.instance.profilePictureUrl ? (
                              <img src={inst.instance.profilePictureUrl} alt="" className="size-full object-cover" />
                            ) : (
                              <Smartphone size={24} className="text-zinc-600" />
                            )}
                          </div>
                          <div className={`absolute -bottom-1 -right-1 size-5 rounded-full border-4 border-zinc-900 ${
                            inst.instance.status === 'open' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-rose-500'
                          }`} />
                        </div>
                        <div>
                          <h4 className="font-bold text-zinc-100 text-lg group-hover:text-emerald-400 transition-colors">{inst.instance.instanceName}</h4>
                          <p className="text-xs text-zinc-500 font-mono tracking-tight">{inst.instance.owner || 'Conectando...'}</p>
                        </div>
                      </div>
                      <div className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                        inst.instance.status === 'open' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                      }`}>
                        {inst.instance.status}
                      </div>
                    </div>

                    <div className="bg-zinc-950/60 rounded-2xl p-5 space-y-4 border border-zinc-800/50">
                      <div>
                        <div className="flex justify-between text-[10px] text-zinc-400 font-bold uppercase mb-2 tracking-widest">
                          <span>Progresso da Maturação</span>
                          <span className={`${getMaturityColor(inst.metrics.score)}`}>{getMaturityProgress(inst.metrics.score).toFixed(0)}%</span>
                        </div>
                        <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${getMaturityProgress(inst.metrics.score)}%` }}
                            className={`h-full rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)] ${inst.metrics.score > 150 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="border-r border-zinc-800 pr-4">
                          <p className="text-[10px] text-zinc-500 uppercase font-black tracking-tighter mb-1">Enviadas</p>
                          <p className="text-2xl font-black">{inst.metrics.sent}</p>
                        </div>
                        <div className="pl-4">
                          <p className="text-[10px] text-zinc-500 uppercase font-black tracking-tighter mb-1">Recebidas</p>
                          <p className="text-2xl font-black">{inst.metrics.received}</p>
                        </div>
                      </div>
                      
                      <div className="pt-3 border-t border-zinc-800/50 flex justify-between items-center">
                        <span className="text-[9px] text-zinc-600 font-bold uppercase">Maturity Score</span>
                        <span className={`text-xs font-mono font-bold ${getMaturityColor(inst.metrics.score)}`}>{inst.metrics.score.toFixed(1)}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
              
              {instances.length === 0 && (
                <div className="text-center py-20 bg-zinc-900/30 border border-dashed border-zinc-800 rounded-3xl">
                  <RefreshCw className="size-12 text-zinc-700 mx-auto mb-4 animate-spin-slow" />
                  <h3 className="text-xl font-bold text-zinc-500 uppercase tracking-widest">Buscando Dispositivos...</h3>
                  <p className="text-zinc-600 mt-2 max-w-sm mx-auto">Verifique se a URL e API KEY da sua Evolution API estão corretas nas configurações.</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-2xl space-y-8"
            >
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Configurações</h2>
                <p className="text-zinc-500 mt-1">Configure a integração com a Evolution API.</p>
              </div>

              <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-400 ml-1">URL da Evolution API</label>
                  <input 
                    type="text" 
                    value={settings.evolutionUrl}
                    onChange={(e) => updateSettings({ evolutionUrl: e.target.value })}
                    placeholder="https://api.suadominio.com"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-400 ml-1">API Key (Global)</label>
                  <input 
                    type="password" 
                    value={settings.evolutionApiKey}
                    onChange={(e) => updateSettings({ evolutionApiKey: e.target.value })}
                    placeholder="Sua chave de API"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6 pt-4 border-t border-zinc-800">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-zinc-400 ml-1">Intervalo Mín (Minutos)</label>
                    <input 
                      type="number" 
                      value={settings.intervalMin}
                      onChange={(e) => updateSettings({ intervalMin: Number(e.target.value) })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-zinc-400 ml-1">Intervalo Máx (Minutos)</label>
                    <input 
                      type="number" 
                      value={settings.intervalMax}
                      onChange={(e) => updateSettings({ intervalMax: Number(e.target.value) })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>

                <button 
                  onClick={() => fetchData()}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCw size={18} /> Testar Conexão
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'logs' && (
            <motion.div
              key="logs"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              <header className="flex justify-between items-end">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">Logs do Sistema</h2>
                  <p className="text-zinc-500 mt-1">Histórico completo de transações em tempo real.</p>
                </div>
                <button 
                  onClick={() => setLogs([])}
                  className="text-zinc-500 hover:text-zinc-100 text-sm font-medium flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 transition-all"
                >
                  Limpar Logs
                </button>
              </header>

              <div className="bg-zinc-950/50 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
                <div className="bg-zinc-900/80 px-6 py-4 border-b border-zinc-800 flex justify-between items-center">
                  <div className="flex gap-4 items-center">
                    <div className="size-3 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                    <span className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-widest">Console vivo</span>
                  </div>
                </div>
                <div className="p-4 font-mono text-xs max-h-[600px] overflow-y-auto space-y-1">
                  {logs.map((log) => (
                    <div key={log.id} className="group hover:bg-zinc-900/50 px-3 py-1.5 rounded flex items-start gap-4 transition-colors">
                      <span className="text-zinc-600 shrink-0 select-none">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                      <span className={`uppercase font-bold shrink-0 w-16 ${
                        log.type === 'success' ? 'text-emerald-500' : log.type === 'error' ? 'text-rose-500' : 'text-blue-400'
                      }`}>
                        {log.type}
                      </span>
                      <span className="text-zinc-300 group-hover:text-zinc-100">{log.message}</span>
                    </div>
                  ))}
                  {logs.length === 0 && (
                    <div className="py-20 text-center text-zinc-600 italic">Console vazio. Aguardando atividade...</div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
        active 
          ? 'bg-emerald-500/10 text-emerald-500 font-bold border-r-4 border-emerald-500 rounded-r-none' 
          : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
      }`}
    >
      <span className={`${active ? 'text-emerald-500' : 'group-hover:scale-110 transition-transform'}`}>{icon}</span>
      <span className="text-sm tracking-tight">{label}</span>
      {active && (
        <motion.div 
          layoutId="activeNav" 
          className="absolute left-0 w-1 h-8 bg-emerald-500 rounded-r-full"
        />
      )}
    </button>
  );
}

function StatCard({ title, value, icon, description }: { title: string, value: string, icon: React.ReactNode, description: string }) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-3xl hover:border-emerald-500/30 transition-all duration-300 group shadow-lg">
      <div className="flex justify-between items-start mb-4">
        <div className="size-10 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-center group-hover:bg-emerald-500 group-hover:border-emerald-500 transition-all">
          <div className="group-hover:text-white transition-colors">{icon}</div>
        </div>
      </div>
      <div>
        <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-1">{title}</p>
        <div className="flex items-baseline gap-2">
          <h4 className="text-4xl font-black tracking-tighter">{value}</h4>
        </div>
        <p className="text-zinc-600 text-[10px] mt-2 font-medium">{description}</p>
      </div>
    </div>
  );
}
