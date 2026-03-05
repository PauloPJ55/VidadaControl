import { useState, useEffect, useRef } from "react";
import { auth, db, googleProvider } from "./firebase";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, onSnapshot } from "firebase/firestore";

// ─── CONSTANTES ───────────────────────────────────────────────
const TABS = [
  { id: "alimentacao", label: "Alimentação", icon: "🥗" },
  { id: "academia",    label: "Academia",    icon: "💪" },
  { id: "corrida",     label: "Corrida",     icon: "🏃" },
  { id: "ingles",      label: "Inglês",      icon: "🇺🇸" },
  { id: "apostas",     label: "Apostas",     icon: "📊" },
  { id: "marketing",   label: "Marketing Digital", icon: "📱" },
  { id: "curso",       label: "Corpo no Controle", icon: "🎯" },
  { id: "leitura",     label: "Leitura",     icon: "📚" },
  { id: "empresa",     label: "Empresa",     icon: "🏢" },
  { id: "videos",      label: "Vídeos",      icon: "🎬" },
];

const DAYS      = ["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"];
const DAYS_FULL = ["Segunda","Terça","Quarta","Quinta","Sexta","Sábado","Domingo"];

const QUOTES = [
  "Disciplina é a ponte entre objetivos e conquistas.",
  "Cada dia é uma nova chance de superar quem você foi ontem.",
  "O progresso, não a perfeição, é o objetivo.",
  "Foco. Consistência. Resultados.",
  "Você não falha quando cai. Falha quando desiste de levantar.",
  "Construa hoje o futuro que você quer amanhã.",
];

const DEFAULT_WEEKLY = () => {
  const w = {};
  DAYS.forEach(d => { w[d] = { checked: false, tasks: [] }; });
  return w;
};

const DEFAULT_TABS = {
  alimentacao: { estadoAtual: "Peso atual: 80kg",         objetivo: "Peso meta: 72kg",                      progressoAtual: 30, plano: "Déficit calórico de 300kcal/dia\nProteína: 160g/dia\nEvitar industrializados\nBeber 3L de água" },
  academia:    { estadoAtual: "Iniciante – 3x/semana",    objetivo: "Intermediário – 5x/semana, +5kg massa", progressoAtual: 40, plano: "Treino A: Peito + Tríceps\nTreino B: Costas + Bíceps\nTreino C: Pernas\nTreino D: Ombro + Core" },
  corrida:     { estadoAtual: "5km em 32min",             objetivo: "10km em 55min",                        progressoAtual: 50, plano: "Segunda: Rodagem leve 5km\nQuarta: Treino intervalado\nSexta: Rodagem progressiva\nDomingo: Corrida longa" },
  ingles:      { estadoAtual: "Nível B1 – Intermediário", objetivo: "Fluência C1",                          progressoAtual: 35, plano: "Anki 20 cards/dia\nListening 30min/dia\nShadowing 15min/dia\nEscrita 10min/dia" },
  apostas:     { estadoAtual: "Banca: R$ 500",            objetivo: "Banca: R$ 5.000 / ROI sustentável",    progressoAtual: 10, plano: "Estudar estatística e value bet\nRegistrar todas as apostas\nNunca apostar mais de 2% da banca\nReview semanal" },
  marketing:   { estadoAtual: "Faturamento: R$ 2.000/mês",objetivo: "Faturamento: R$ 10.000/mês",           progressoAtual: 20, plano: "Estudar copywriting diariamente\nPostar 1 conteúdo/dia\nTestar 2 criativos/semana\nReview toda segunda" },
  curso:       { estadoAtual: "Módulo 2 de 8",            objetivo: "Concluir e implementar protocolo",     progressoAtual: 25, plano: "1 módulo por semana\nAnotar pontos-chave\nImplementar na prática\nCompartilhar aprendizados" },
  leitura:     { estadoAtual: "2 livros lidos no ano",    objetivo: "12 livros no ano",                     progressoAtual: 16, plano: "20 páginas/dia mínimo\n2 livros simultâneos\nFazer resumo de cada livro" },
  empresa:     { estadoAtual: "25 anos – planejamento",   objetivo: "Abrir empresa aos 28 anos",            progressoAtual: 15, plano: "Estudar abertura de CNPJ\nDefinir nicho e modelo\nReserva de R$ 20.000\nEstudar gestão" },
  videos:      { estadoAtual: "0 vídeos postados",        objetivo: "4 vídeos/semana",                      progressoAtual:  0, plano: "Gravar 2x na semana\nEditar no dia seguinte\nPostar com copy otimizada\nAnalisar métricas" },
};

const buildInitialData = () => {
  const d = {};
  TABS.forEach(t => { d[t.id] = { ...DEFAULT_TABS[t.id], weekly: DEFAULT_WEEKLY() }; });
  return d;
};

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────
export default function App() {
  // auth
  const [user,        setUser]        = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // dados
  const [data,        setData]        = useState(buildInitialData);
  const [profile,     setProfile]     = useState({ name: "", photo: null });
  const [syncing,     setSyncing]     = useState(false);
  const saveTimeout = useRef(null);

  // UI
  const [activeTab,       setActiveTab]       = useState("home");
  const [dayModal,        setDayModal]        = useState(null);
  const [editingField,    setEditingField]    = useState(null);
  const [newTask,         setNewTask]         = useState("");
  const [editingTaskId,   setEditingTaskId]   = useState(null);
  const [editingTaskText, setEditingTaskText] = useState("");
  const [editingName,     setEditingName]     = useState(false);
  const [tempName,        setTempName]        = useState("");
  const [quote]  = useState(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  const photoInputRef = useRef(null);

  // ── AUTH listener ──
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u);
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  // ── FIRESTORE listener (leitura em tempo real) ──
  useEffect(() => {
    if (!user) return;
    const ref = doc(db, "users", user.uid);
    const unsub = onSnapshot(ref, snap => {
      if (snap.exists()) {
        const d = snap.data();
        if (d.appData) setData(d.appData);
        if (d.profile) setProfile(d.profile);
      }
    });
    return unsub;
  }, [user]);

  // ── SALVAR no Firestore (debounce 1.5s) ──
  const saveToCloud = (newData, newProfile) => {
    if (!user) return;
    clearTimeout(saveTimeout.current);
    setSyncing(true);
    saveTimeout.current = setTimeout(async () => {
      try {
        await setDoc(doc(db, "users", user.uid), {
          appData: newData,
          profile: newProfile,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      } catch (e) { console.error(e); }
      setSyncing(false);
    }, 1500);
  };

  const updateData = (newData) => {
    setData(newData);
    saveToCloud(newData, profile);
  };

  const updateProfile = (newProfile) => {
    setProfile(newProfile);
    saveToCloud(data, newProfile);
  };

  // ── LOGIN / LOGOUT ──
  const handleLogin = async () => {
    try { await signInWithPopup(auth, googleProvider); }
    catch (e) { console.error(e); }
  };
  const handleLogout = async () => {
    await signOut(auth);
    setData(buildInitialData());
    setProfile({ name: "", photo: null });
  };

  // ── HELPERS DE DADOS ──
  const updateTabField = (tabId, field, value) => {
    const nd = { ...data, [tabId]: { ...data[tabId], [field]: value } };
    updateData(nd);
  };

  const toggleDayCheck = (tabId, day) => {
    const nd = { ...data, [tabId]: { ...data[tabId], weekly: { ...data[tabId].weekly,
      [day]: { ...data[tabId].weekly[day], checked: !data[tabId].weekly[day].checked }
    }}};
    updateData(nd);
  };

  const addTask = (tabId, day) => {
    if (!newTask.trim()) return;
    const task = { id: Date.now(), text: newTask.trim(), done: false };
    const nd = { ...data, [tabId]: { ...data[tabId], weekly: { ...data[tabId].weekly,
      [day]: { ...data[tabId].weekly[day], tasks: [...(data[tabId].weekly[day].tasks || []), task] }
    }}};
    updateData(nd);
    setNewTask("");
  };

  const toggleTask = (tabId, day, taskId) => {
    const nd = { ...data, [tabId]: { ...data[tabId], weekly: { ...data[tabId].weekly,
      [day]: { ...data[tabId].weekly[day],
        tasks: data[tabId].weekly[day].tasks.map(t => t.id === taskId ? { ...t, done: !t.done } : t)
      }
    }}};
    updateData(nd);
  };

  const deleteTask = (tabId, day, taskId) => {
    const nd = { ...data, [tabId]: { ...data[tabId], weekly: { ...data[tabId].weekly,
      [day]: { ...data[tabId].weekly[day],
        tasks: data[tabId].weekly[day].tasks.filter(t => t.id !== taskId)
      }
    }}};
    updateData(nd);
  };

  const saveEditTask = (tabId, day, taskId) => {
    if (!editingTaskText.trim()) return;
    const nd = { ...data, [tabId]: { ...data[tabId], weekly: { ...data[tabId].weekly,
      [day]: { ...data[tabId].weekly[day],
        tasks: data[tabId].weekly[day].tasks.map(t => t.id === taskId ? { ...t, text: editingTaskText.trim() } : t)
      }
    }}};
    updateData(nd);
    setEditingTaskId(null); setEditingTaskText("");
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => updateProfile({ ...profile, photo: ev.target.result });
    reader.readAsDataURL(file);
  };

  // ── STATS ──
  const getStats = () => {
    let total = 0, done = 0;
    TABS.forEach(t => {
      DAYS.forEach(d => {
        const tasks = data[t.id]?.weekly?.[d]?.tasks || [];
        total += tasks.length;
        done  += tasks.filter(x => x.done).length;
      });
    });
    return { total, done, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  };

  const stats = getStats();
  const currentTab = TABS.find(t => t.id === activeTab);
  const tabData    = activeTab !== "home" ? data[activeTab] : null;

  // ── TELA DE LOGIN ──
  if (authLoading) return (
    <div style={{ minHeight:"100vh", background:"#0a0a0a", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ color:"#e63946", fontFamily:"'Bebas Neue',sans-serif", fontSize:28, letterSpacing:3 }}>CARREGANDO...</div>
    </div>
  );

  if (!user) return (
    <div style={{ minHeight:"100vh", background:"#0a0a0a", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:24, padding:24 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;600&display=swap');`}</style>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:48, color:"#e63946", letterSpacing:4 }}>VIDA</div>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:48, color:"#2a2a2a", letterSpacing:4, marginTop:-12 }}>CONTROL</div>
        <div style={{ color:"#444", fontSize:14, marginTop:8 }}>Seu painel de evolução pessoal</div>
      </div>
      <button onClick={handleLogin} style={{ display:"flex", alignItems:"center", gap:12, background:"#fff", color:"#111", border:"none", borderRadius:12, padding:"14px 28px", fontSize:15, fontWeight:600, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
        <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.34-8.16 2.34-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
        Entrar com Google
      </button>
      <div style={{ color:"#333", fontSize:12, textAlign:"center", maxWidth:280 }}>Seus dados ficam salvos na nuvem e sincronizam entre todos os seus dispositivos</div>
    </div>
  );

  // ── APP PRINCIPAL ──
  return (
    <div style={{ minHeight:"100vh", background:"#0a0a0a", color:"#f0f0f0", fontFamily:"'DM Sans','Segoe UI',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Bebas+Neue&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-track { background:#111; }
        ::-webkit-scrollbar-thumb { background:#e63946; border-radius:2px; }
        .tab-scroll { display:flex; gap:6px; overflow-x:auto; padding:0 16px 10px; scrollbar-width:thin; }
        .tab-btn  { flex-shrink:0; padding:8px 16px; border-radius:24px; border:1.5px solid #222; background:#111; color:#888; font-size:13px; font-weight:500; cursor:pointer; transition:all .2s; white-space:nowrap; font-family:inherit; }
        .tab-btn:hover  { border-color:#e63946; color:#e63946; }
        .tab-btn.active { background:#e63946; border-color:#e63946; color:#fff; font-weight:600; }
        .home-btn { flex-shrink:0; padding:8px 16px; border-radius:24px; border:1.5px solid #222; background:#111; color:#888; font-size:13px; font-weight:600; cursor:pointer; transition:all .2s; font-family:inherit; }
        .home-btn.active { border-color:#e63946; color:#e63946; }
        .pbar-bg   { background:#1a1a1a; border-radius:999px; overflow:hidden; }
        .pbar-fill { height:100%; background:linear-gradient(90deg,#e63946,#ff6b6b); border-radius:999px; transition:width .6s ease; }
        .card { background:#111; border:1px solid #1e1e1e; border-radius:16px; padding:20px; }
        .editable { cursor:pointer; border-bottom:1px dashed #333; padding-bottom:2px; transition:border-color .2s; }
        .editable:hover { border-color:#e63946; }
        input, textarea { background:#1a1a1a; border:1px solid #333; border-radius:8px; color:#f0f0f0; padding:8px 12px; font-family:inherit; font-size:14px; outline:none; }
        input:focus, textarea:focus { border-color:#e63946; }
        .day-pill { padding:7px 14px; border-radius:20px; font-size:12px; font-weight:600; cursor:pointer; border:1.5px solid #1e1e1e; background:#111; color:#666; transition:all .2s; display:flex; align-items:center; gap:6px; }
        .day-pill:hover { border-color:#e63946; color:#e63946; }
        .day-pill.done { background:#1a0508; border-color:#e63946; color:#e63946; }
        .btn-red   { background:#e63946; color:#fff; border:none; border-radius:8px; padding:8px 18px; font-weight:600; font-size:13px; cursor:pointer; font-family:inherit; transition:opacity .2s; }
        .btn-red:hover { opacity:.85; }
        .btn-ghost { background:transparent; color:#666; border:1px solid #222; border-radius:8px; padding:6px 12px; font-size:12px; cursor:pointer; font-family:inherit; transition:all .2s; }
        .btn-ghost:hover { color:#e63946; border-color:#e63946; }
        .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.88); z-index:100; display:flex; align-items:center; justify-content:center; padding:16px; }
        .modal { background:#111; border:1px solid #222; border-radius:20px; width:100%; max-width:480px; max-height:85vh; overflow-y:auto; padding:24px; }
        .task-item  { display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:10px; background:#0d0d0d; border:1px solid #1e1e1e; margin-bottom:8px; }
        .task-check { width:18px; height:18px; border-radius:4px; border:2px solid #333; background:transparent; cursor:pointer; flex-shrink:0; display:flex; align-items:center; justify-content:center; transition:all .2s; }
        .task-check.done { background:#e63946; border-color:#e63946; }
        .range-input { -webkit-appearance:none; width:100%; height:4px; border-radius:2px; background:#1e1e1e; outline:none; cursor:pointer; }
        .range-input::-webkit-slider-thumb { -webkit-appearance:none; width:16px; height:16px; border-radius:50%; background:#e63946; cursor:pointer; }
        .stat-box { background:#111; border:1px solid #1e1e1e; border-radius:12px; padding:16px; text-align:center; }
        .label { font-size:11px; text-transform:uppercase; letter-spacing:1.5px; color:#555; font-weight:600; }
        .av-wrap { position:relative; cursor:pointer; flex-shrink:0; }
        .av-wrap:hover .av-ov { opacity:1; }
        .av-ov { position:absolute; inset:0; border-radius:50%; background:rgba(230,57,70,.75); display:flex; align-items:center; justify-content:center; opacity:0; transition:opacity .2s; font-size:16px; }
        .name-inp { background:transparent; border:none; border-bottom:1.5px solid #e63946; color:#ddd; font-size:13px; font-weight:500; font-family:inherit; outline:none; padding:2px 0; min-width:80px; max-width:180px; }
        .sync-dot { width:7px; height:7px; border-radius:50%; background:#e63946; animation:pulse 1s infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
      `}</style>

      {/* ── HEADER ── */}
      <div style={{ background:"#0d0d0d", borderBottom:"1px solid #1a1a1a", padding:"14px 0 0" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, padding:"0 20px 12px" }}>

          {/* Avatar */}
          <div className="av-wrap" style={{ width:46, height:46 }} onClick={() => photoInputRef.current?.click()}>
            {profile.photo ? (
              <img src={profile.photo} alt="Perfil" style={{ width:46, height:46, borderRadius:"50%", objectFit:"cover", border:"2.5px solid #e63946", display:"block" }} />
            ) : (
              <div style={{ width:46, height:46, borderRadius:"50%", border:"2px dashed #e63946", background:"#150305", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:1 }}>
                <span style={{ fontSize:16 }}>📷</span>
                <span style={{ fontSize:8, color:"#e63946", fontWeight:700 }}>FOTO</span>
              </div>
            )}
            <div className="av-ov">📷</div>
          </div>
          <input ref={photoInputRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handlePhotoUpload} />

          {/* Nome */}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"baseline", gap:6, marginBottom:3 }}>
              <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, color:"#e63946", letterSpacing:2 }}>VIDA</span>
              <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, color:"#2e2e2e", letterSpacing:2 }}>CONTROL</span>
              {syncing && <div className="sync-dot" title="Sincronizando..." />}
            </div>
            {editingName ? (
              <input className="name-inp" autoFocus value={tempName}
                onChange={e => setTempName(e.target.value)}
                onBlur={() => { updateProfile({ ...profile, name: tempName.trim() }); setEditingName(false); }}
                onKeyDown={e => {
                  if (e.key === "Enter") { updateProfile({ ...profile, name: tempName.trim() }); setEditingName(false); }
                  if (e.key === "Escape") setEditingName(false);
                }}
                placeholder="Digite seu nome..." />
            ) : (
              <div style={{ fontSize:13, color: profile.name ? "#888" : "#3a3a3a", cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}
                onClick={() => { setTempName(profile.name); setEditingName(true); }}>
                {profile.name
                  ? <><span style={{ color:"#666" }}>{getGreeting()},</span> <span style={{ color:"#ccc", fontWeight:600 }}>{profile.name}</span> <span style={{ fontSize:11 }}>✏️</span></>
                  : <span>✏️ Adicionar meu nome</span>
                }
              </div>
            )}
          </div>

          {/* % + logout */}
          <div style={{ textAlign:"right", flexShrink:0 }}>
            <div style={{ color:"#e63946", fontWeight:700, fontSize:22, fontFamily:"'Bebas Neue'", lineHeight:1 }}>{stats.pct}%</div>
            <div style={{ fontSize:10, color:"#444", letterSpacing:1 }}>progresso</div>
            <button onClick={handleLogout} style={{ fontSize:10, color:"#333", background:"none", border:"none", cursor:"pointer", marginTop:2 }}>sair</button>
          </div>
        </div>

        {/* Abas */}
        <div className="tab-scroll">
          <button className={`home-btn ${activeTab==="home"?"active":""}`} onClick={() => setActiveTab("home")}>⚡ HOME</button>
          {TABS.map(t => (
            <button key={t.id} className={`tab-btn ${activeTab===t.id?"active":""}`} onClick={() => setActiveTab(t.id)}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTEÚDO ── */}
      <div style={{ padding:"20px 16px", maxWidth:800, margin:"0 auto" }}>

        {/* HOME */}
        {activeTab === "home" && (
          <div>
            <div className="card" style={{ marginBottom:16, borderLeft:"3px solid #e63946", background:"#0c0203" }}>
              <div className="label" style={{ marginBottom:8 }}>frase do dia</div>
              <div style={{ fontSize:15, fontStyle:"italic", color:"#bbb", lineHeight:1.7 }}>"{quote}"</div>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:16 }}>
              {[["concluídas", stats.done, "#e63946"], ["pendentes", stats.total-stats.done, "#444"], ["geral", `${stats.pct}%`, "#e63946"]].map(([label, val, color]) => (
                <div className="stat-box" key={label}>
                  <div style={{ fontSize:30, fontFamily:"'Bebas Neue'", color }}>{val}</div>
                  <div className="label">{label}</div>
                </div>
              ))}
            </div>

            <div className="card" style={{ marginBottom:16 }}>
              <div className="label" style={{ marginBottom:10 }}>produtividade geral</div>
              <div className="pbar-bg" style={{ height:8, marginBottom:8 }}>
                <div className="pbar-fill" style={{ width:`${stats.pct}%` }} />
              </div>
              <div style={{ fontSize:12, color:"#444" }}>{stats.done} de {stats.total} tarefas concluídas</div>
            </div>

            <div className="label" style={{ marginBottom:12 }}>seus pilares</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              {TABS.map(t => {
                const pct = data[t.id]?.progressoAtual || 0;
                return (
                  <div key={t.id} className="card" style={{ cursor:"pointer" }} onClick={() => setActiveTab(t.id)}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                      <div>
                        <div style={{ fontSize:20 }}>{t.icon}</div>
                        <div style={{ fontSize:13, fontWeight:600, color:"#ccc", marginTop:4 }}>{t.label}</div>
                      </div>
                      <div style={{ fontSize:22, fontFamily:"'Bebas Neue'", color:"#e63946" }}>{pct}%</div>
                    </div>
                    <div className="pbar-bg" style={{ height:4 }}>
                      <div className="pbar-fill" style={{ width:`${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB */}
        {activeTab !== "home" && tabData && currentTab && (
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
              <span style={{ fontSize:28 }}>{currentTab.icon}</span>
              <div>
                <div style={{ fontFamily:"'Bebas Neue'", fontSize:24, color:"#e63946", letterSpacing:1 }}>{currentTab.label}</div>
                <div className="label">painel de controle</div>
              </div>
            </div>

            <div className="card" style={{ marginBottom:14 }}>
              <div className="label" style={{ marginBottom:14 }}>visão geral</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:16 }}>
                {[["estadoAtual","estado atual"],["objetivo","objetivo final"]].map(([field, label]) => (
                  <div key={field}>
                    <div className="label" style={{ marginBottom:6 }}>{label}</div>
                    {editingField === `${activeTab}-${field}` ? (
                      <input autoFocus style={{ width:"100%" }} value={tabData[field]}
                        onChange={e => updateTabField(activeTab, field, e.target.value)}
                        onBlur={() => setEditingField(null)}
                        onKeyDown={e => e.key==="Enter" && setEditingField(null)} />
                    ) : (
                      <div className="editable" onClick={() => setEditingField(`${activeTab}-${field}`)} style={{ fontSize:14, color:"#ddd" }}>{tabData[field]}</div>
                    )}
                  </div>
                ))}
              </div>
              <div className="label" style={{ marginBottom:8 }}>progresso</div>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                <span style={{ fontSize:13, color:"#888" }}>Falta {100-tabData.progressoAtual}% para o objetivo</span>
                <span style={{ fontFamily:"'Bebas Neue'", fontSize:20, color:"#e63946" }}>{tabData.progressoAtual}%</span>
              </div>
              <div className="pbar-bg" style={{ height:8, marginBottom:10 }}>
                <div className="pbar-fill" style={{ width:`${tabData.progressoAtual}%` }} />
              </div>
              <input type="range" min="0" max="100" value={tabData.progressoAtual} className="range-input"
                onChange={e => updateTabField(activeTab, "progressoAtual", Number(e.target.value))} />
            </div>

            <div className="card" style={{ marginBottom:14 }}>
              <div className="label" style={{ marginBottom:12 }}>plano principal</div>
              {editingField === `${activeTab}-plano` ? (
                <div>
                  <textarea rows={6} style={{ width:"100%", resize:"vertical" }} value={tabData.plano}
                    onChange={e => updateTabField(activeTab, "plano", e.target.value)} />
                  <button className="btn-red" style={{ marginTop:8 }} onClick={() => setEditingField(null)}>Salvar</button>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize:14, color:"#bbb", lineHeight:1.9, whiteSpace:"pre-line" }}>{tabData.plano}</div>
                  <button className="btn-ghost" style={{ marginTop:12 }} onClick={() => setEditingField(`${activeTab}-plano`)}>✏️ Editar plano</button>
                </div>
              )}
            </div>

            <div className="card">
              <div className="label" style={{ marginBottom:14 }}>checklist semanal</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                {DAYS.map((day, i) => {
                  const dd = tabData.weekly?.[day] || { checked:false, tasks:[] };
                  const tasks = dd.tasks || [];
                  const done  = tasks.filter(t => t.done).length;
                  return (
                    <div className={`day-pill ${dd.checked?"done":""}`} key={day}
                      onClick={() => setDayModal({ tabId:activeTab, dayIndex:i })}>
                      <div onClick={e => { e.stopPropagation(); toggleDayCheck(activeTab, day); }}
                        style={{ width:14, height:14, borderRadius:3, border:`2px solid ${dd.checked?"#e63946":"#444"}`, background:dd.checked?"#e63946":"transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        {dd.checked && <span style={{ fontSize:8, color:"#fff" }}>✓</span>}
                      </div>
                      <span>{day}</span>
                      {tasks.length > 0 && <span style={{ background:"#1a0508", color:"#e63946", borderRadius:10, padding:"1px 6px", fontSize:10, fontWeight:700 }}>{done}/{tasks.length}</span>}
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop:10, fontSize:12, color:"#333" }}>Clique no dia para ver e editar tarefas</div>
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL DIA ── */}
      {dayModal && (() => {
        const { tabId, dayIndex } = dayModal;
        const day    = DAYS[dayIndex];
        const dayFull= DAYS_FULL[dayIndex];
        const tab    = TABS.find(t => t.id === tabId);
        const dd     = data[tabId]?.weekly?.[day] || { checked:false, tasks:[] };
        const tasks  = dd.tasks || [];
        return (
          <div className="modal-overlay" onClick={() => setDayModal(null)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
                <div>
                  <div style={{ fontFamily:"'Bebas Neue'", fontSize:22, color:"#e63946", letterSpacing:1 }}>{dayFull}</div>
                  <div style={{ fontSize:12, color:"#555" }}>{tab?.icon} {tab?.label}</div>
                </div>
                <button className="btn-ghost" onClick={() => setDayModal(null)}>✕</button>
              </div>

              <div style={{ display:"flex", gap:8, marginBottom:16, alignItems:"center" }}>
                <div style={{ background:"#0d0d0d", border:"1px solid #1a1a1a", borderRadius:8, padding:"8px 14px", fontSize:12, color:"#666" }}>
                  <span style={{ color:"#e63946", fontWeight:700 }}>{tasks.filter(t=>t.done).length}</span> / {tasks.length} tarefas
                </div>
                {tasks.length > 0 && (
                  <div className="pbar-bg" style={{ height:4, flex:1 }}>
                    <div className="pbar-fill" style={{ width:`${Math.round(tasks.filter(t=>t.done).length/tasks.length*100)}%` }} />
                  </div>
                )}
              </div>

              <div style={{ marginBottom:14 }}>
                {tasks.length === 0 && <div style={{ textAlign:"center", color:"#333", padding:"24px 0", fontSize:13 }}>Nenhuma tarefa ainda. Adicione abaixo 👇</div>}
                {tasks.map(task => (
                  <div key={task.id} className="task-item">
                    <div className={`task-check ${task.done?"done":""}`} onClick={() => toggleTask(tabId, day, task.id)}>
                      {task.done && <span style={{ fontSize:9, color:"#fff" }}>✓</span>}
                    </div>
                    {editingTaskId === task.id ? (
                      <input style={{ flex:1 }} value={editingTaskText}
                        onChange={e => setEditingTaskText(e.target.value)}
                        onBlur={() => saveEditTask(tabId, day, task.id)}
                        onKeyDown={e => { if(e.key==="Enter") saveEditTask(tabId,day,task.id); if(e.key==="Escape"){setEditingTaskId(null);setEditingTaskText("");} }}
                        autoFocus />
                    ) : (
                      <span style={{ flex:1, fontSize:14, color:task.done?"#444":"#ddd", textDecoration:task.done?"line-through":"none" }}
                        onDoubleClick={() => { setEditingTaskId(task.id); setEditingTaskText(task.text); }}>
                        {task.text}
                      </span>
                    )}
                    <button onClick={() => deleteTask(tabId, day, task.id)}
                      style={{ background:"none", border:"none", color:"#333", cursor:"pointer", fontSize:18, padding:"0 4px" }}
                      onMouseOver={e => e.currentTarget.style.color="#e63946"}
                      onMouseOut={e  => e.currentTarget.style.color="#333"}>×</button>
                  </div>
                ))}
              </div>

              <div style={{ display:"flex", gap:8 }}>
                <input style={{ flex:1 }} placeholder="Nova tarefa..." value={newTask}
                  onChange={e => setNewTask(e.target.value)}
                  onKeyDown={e => { if(e.key==="Enter") addTask(tabId, day); }} />
                <button className="btn-red" onClick={() => addTask(tabId, day)}>+</button>
              </div>
              <div style={{ fontSize:11, color:"#333", marginTop:6 }}>Duplo clique na tarefa para editar</div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
