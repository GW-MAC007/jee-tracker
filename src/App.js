import { useState, useEffect, useCallback, useRef } from "react";

const SUPABASE_URL = "https://kebcqrpofzwdnaaetavt.supabase.co";
const SUPABASE_KEY = "sb_publishable_Y8QGHMAorDJ7q8GuY8M1kQ_PQceeV5X";

const SUBJECTS = {
  Physics: {
    color: "#FF6B35", icon: "⚡",
    chapters: [
      "Units & Measurements","Kinematics (1D & 2D)","Laws of Motion & Friction",
      "Work, Energy & Power","Circular Motion","Centre of Mass & Collisions",
      "Rotational Motion","Gravitation","Mechanical Properties of Solids",
      "Mechanical Properties of Fluids","Thermal Properties of Matter",
      "Thermodynamics","Kinetic Theory of Gases","Simple Harmonic Motion",
      "Waves & Sound","Electric Charges & Fields","Electric Potential & Capacitance",
      "Current Electricity","Moving Charges & Magnetism","Magnetism & Matter",
      "Electromagnetic Induction","Alternating Current","Electromagnetic Waves",
      "Ray Optics & Optical Instruments","Wave Optics",
      "Dual Nature of Radiation & Matter","Atoms","Nuclei",
      "Semiconductor Electronics","Communication Systems","Experimental Physics"
    ]
  },
  Chemistry: {
    color: "#00C9A7", icon: "🧪",
    chapters: [
      "Some Basic Concepts of Chemistry (Mole Concept)","Structure of Atom",
      "Classification of Elements & Periodicity","Chemical Bonding & Molecular Structure",
      "States of Matter (Gases & Liquids)","Thermodynamics (Chemical)",
      "Equilibrium (Chemical & Ionic)","Redox Reactions","Solutions",
      "Electrochemistry","Chemical Kinetics","Surface Chemistry","Solid State",
      "Nuclear & Radiochemistry","Hydrogen & Its Compounds",
      "s-Block Elements (Alkali & Alkaline Earth)","p-Block Elements (Group 13 & 14)",
      "p-Block Elements (Group 15, 16, 17 & 18)","d & f Block Elements",
      "Coordination Compounds","Metallurgy (General Principles)","Qualitative Analysis",
      "Basic Principles of Organic Chemistry","Hydrocarbons (Alkanes, Alkenes, Alkynes)",
      "Aromatic Compounds","Haloalkanes & Haloarenes","Alcohols, Phenols & Ethers",
      "Aldehydes, Ketones & Carboxylic Acids","Amines",
      "Biomolecules (Carbohydrates, Proteins, Nucleic Acids)",
      "Polymers","Chemistry in Everyday Life","Environmental Chemistry","Practical Organic Chemistry"
    ]
  },
  Maths: {
    color: "#845EF7", icon: "∑",
    chapters: [
      "Sets, Relations & Functions","Complex Numbers","Quadratic Equations & Inequalities",
      "Sequences & Series (AP, GP, HP)","Permutations & Combinations","Binomial Theorem",
      "Mathematical Induction","Matrices","Determinants","Linear Inequalities",
      "Trigonometric Functions & Identities","Inverse Trigonometric Functions",
      "Properties of Triangles & Solutions","Heights & Distances",
      "Straight Lines","Circles","Parabola","Ellipse","Hyperbola",
      "Limits & Continuity","Differentiation","Applications of Derivatives",
      "Indefinite Integration","Definite Integration","Area Under Curves",
      "Differential Equations","Vectors","3D Geometry","Plane & Line in 3D",
      "Statistics (Mean, Variance, SD)","Probability","Bayes' Theorem & Distributions",
      "Mathematical Reasoning & Logic","Linear Programming"
    ]
  }
};

const INITIAL_DATA = {
  chapters: {}, backlogs: [], tests: [], studyLog: {}, dailyGoal: 8,
  qLog: {}, errors: [], weekPlan: {}
};

const STATUS_CFG = {
  pending:      { label: "Pending",      bg: "#1a1a2e", border: "#333",    text: "#666" },
  "in-progress":{ label: "In Progress",  bg: "#0d1f1a", border: "#00C9A7", text: "#00C9A7" },
  done:         { label: "Done ✓",       bg: "#0d1f0d", border: "#4CAF50", text: "#4CAF50" },
  revision:     { label: "Revision ↻",   bg: "#1f1800", border: "#FFB347", text: "#FFB347" }
};
const DIFFICULTY = {
  easy:   { label: "Easy",   color: "#4CAF50" },
  medium: { label: "Medium", color: "#FFB347" },
  hard:   { label: "Hard",   color: "#FF6B35" }
};
const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const TABS = [
  { id:"dashboard", label:"📊 Dashboard" },
  { id:"chapters",  label:"📚 Chapters"  },
  { id:"practice",  label:"🎯 Practice"  },
  { id:"backlogs",  label:"⚠️ Backlogs"  },
  { id:"errors",    label:"❌ Errors"     },
  { id:"tests",     label:"📝 Mock Tests" },
  { id:"planner",   label:"📅 Planner"   },
  { id:"study",     label:"⏱ Study Log"  },
];

// ── Supabase helpers ──────────────────────────────────────────────
async function sbFetch(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Prefer": "return=representation",
      ...(opts.headers || {})
    }
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function signUp(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: { "Content-Type":"application/json", "apikey": SUPABASE_KEY },
    body: JSON.stringify({ email, password })
  });
  return res.json();
}

async function signIn(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "Content-Type":"application/json", "apikey": SUPABASE_KEY },
    body: JSON.stringify({ email, password })
  });
  return res.json();
}

async function loadFromCloud(userId, token) {
  const rows = await sbFetch(`/tracker_data?user_id=eq.${userId}&select=data`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  return rows && rows.length > 0 ? rows[0].data : null;
}

async function saveToCloud(userId, token, data) {
  await sbFetch(`/tracker_data?user_id=eq.${userId}`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${token}` }
  });
  await sbFetch(`/tracker_data`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Prefer": "return=minimal" },
    body: JSON.stringify({ user_id: userId, data, updated_at: new Date().toISOString() })
  });
}

// ── Auth Screen ───────────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login"); // login | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function handle() {
    if (!email || !password) return setMsg("Enter email and password.");
    setLoading(true); setMsg("");
    try {
      const res = mode === "login" ? await signIn(email, password) : await signUp(email, password);
      if (res.error) { setMsg(res.error.message || res.error); }
      else if (res.access_token) {
        onAuth({ userId: res.user.id, token: res.access_token, email: res.user.email });
      } else {
        setMsg(mode==="signup" ? "Account created! Check your email to confirm, then log in." : "Something went wrong.");
      }
    } catch(e) { setMsg(e.message); }
    setLoading(false);
  }

  return (
    <div style={{ minHeight:"100vh", background:"#07070f", display:"flex", alignItems:"center", justifyContent:"center", padding:"20px", fontFamily:"'Space Mono','Courier New',monospace" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@700;800&display=swap');*{box-sizing:border-box;margin:0;padding:0}.inp{background:#0a0a18;border:1px solid #1e1e30;border-radius:6px;color:#e8e8f0;font-family:inherit;font-size:13px;padding:10px 12px;outline:none;width:100%}.inp:focus{border-color:#845EF7}.btn{cursor:pointer;border:none;font-family:inherit;transition:all .15s;border-radius:6px}.btn:hover{filter:brightness(1.15)}`}</style>
      <div style={{ background:"#0d0d1a", border:"1px solid #1a1a2e", borderRadius:"16px", padding:"36px 32px", width:"100%", maxWidth:"380px" }}>
        <div style={{ textAlign:"center", marginBottom:"28px" }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:"26px", fontWeight:800, color:"#e8e8f0" }}>JEE <span style={{color:"#845EF7"}}>TRACKER</span></div>
          <div style={{ fontSize:"10px", color:"#444", letterSpacing:"2px", marginTop:"4px" }}>MAINS · ADVANCED · BOARDS</div>
        </div>
        <div style={{ display:"flex", gap:"8px", marginBottom:"24px" }}>
          {["login","signup"].map(m=>(
            <button key={m} className="btn" onClick={()=>{setMode(m);setMsg("");}} style={{ flex:1, padding:"8px", fontSize:"12px", background:mode===m?"#845EF7":"transparent", color:mode===m?"#fff":"#666", border:`1px solid ${mode===m?"#845EF7":"#2a2a3a"}` }}>
              {m==="login"?"Log In":"Sign Up"}
            </button>
          ))}
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
          <input className="inp" type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
          <input className="inp" type="password" placeholder="Password (min 6 chars)" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handle()} />
          {msg && <div style={{ fontSize:"12px", color: msg.includes("created")?"#4CAF50":"#FF6B35", textAlign:"center" }}>{msg}</div>}
          <button className="btn" onClick={handle} disabled={loading} style={{ background:"#845EF7", color:"#fff", fontWeight:700, padding:"11px", fontSize:"13px", marginTop:"4px", opacity:loading?0.7:1 }}>
            {loading ? "Please wait..." : mode==="login" ? "Log In" : "Create Account"}
          </button>
        </div>
        <div style={{ fontSize:"10px", color:"#333", textAlign:"center", marginTop:"20px" }}>
          Your data syncs across all devices automatically.
        </div>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────
export default function JEETracker() {
  const [auth, setAuth] = useState(null); // {userId, token, email}
  const [data, setData] = useState(INITIAL_DATA);
  const [tab, setTab] = useState("dashboard");
  const [subTab, setSubTab] = useState("Physics");
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const [lastSynced, setLastSynced] = useState(null);

  const [addTestOpen, setAddTestOpen] = useState(false);
  const [testAnalysisOpen, setTestAnalysisOpen] = useState(null);
  const [testForm, setTestForm] = useState({ name:"", date:"", physics:"", chemistry:"", maths:"", total:"", silly:"", concept:"", time:"", unattempted:"", notes:"" });
  const [backlogInput, setBacklogInput] = useState({ subject:"Physics", chapter:"", note:"" });
  const [todayHours, setTodayHours] = useState("");
  const [todayQs, setTodayQs] = useState({ subject:"Physics", chapter:"", count:"", type:"practice" });
  const [errorForm, setErrorForm] = useState({ subject:"Physics", chapter:"", mistake:"", correction:"" });
  const [weekPlanInput, setWeekPlanInput] = useState({ day:"Mon", subject:"Physics", target:"" });

  const today = new Date().toISOString().split("T")[0];

  // Load from cloud on login
  useEffect(() => {
    if (!auth) return;
    (async () => {
      setSyncing(true); setSyncMsg("Loading your data...");
      try {
        const cloud = await loadFromCloud(auth.userId, auth.token);
        if (cloud) { setData({ ...INITIAL_DATA, ...cloud }); }
        setSyncMsg("Synced ✓"); setLastSynced(new Date());
      } catch(e) { setSyncMsg("Load failed: " + e.message); }
      setSyncing(false);
    })();
  }, [auth]);

  // Auto-save to cloud whenever data changes (debounced)
  const syncRef = useRef(null);
  useEffect(() => {
    if (!auth) return;
    if (syncRef.current) clearTimeout(syncRef.current);
    syncRef.current = setTimeout(async () => {
      setSyncing(true); setSyncMsg("Saving...");
      try {
        await saveToCloud(auth.userId, auth.token, data);
        setSyncMsg("Saved ✓"); setLastSynced(new Date());
      } catch(e) { setSyncMsg("Save failed"); }
      setSyncing(false);
    }, 1500);
  }, [data]);

  if (!auth) return <AuthScreen onAuth={setAuth} />;

  // ── helpers ──
  const upd = fn => setData(d => fn({ ...d }));
  function getChap(sub, ch) { return data.chapters[sub]?.[ch] || {}; }
  function setChap(sub, ch, field, val) {
    upd(d => { d.chapters = { ...d.chapters, [sub]: { ...(d.chapters[sub]||{}), [ch]: { ...(d.chapters[sub]?.[ch]||{}), [field]: val } } }; return d; });
  }
  function cycleStatus(sub, ch) {
    const order = ["pending","in-progress","done","revision"];
    const curr = getChap(sub,ch).status || "pending";
    const next = order[(order.indexOf(curr)+1) % order.length];
    setChap(sub, ch, "status", next);
    if (next==="done") upd(d => { d.backlogs = d.backlogs.filter(b => !(b.subject===sub && b.chapter===ch)); return d; });
  }
  function cycleDiff(sub, ch) {
    const order = ["","easy","medium","hard"];
    const curr = getChap(sub,ch).difficulty || "";
    setChap(sub, ch, "difficulty", order[(order.indexOf(curr)+1) % order.length]);
  }
  function subjectProgress(sub) {
    const chs = SUBJECTS[sub].chapters;
    const done = chs.filter(c => getChap(sub,c).status==="done").length;
    const inp  = chs.filter(c => getChap(sub,c).status==="in-progress").length;
    const rev  = chs.filter(c => getChap(sub,c).status==="revision").length;
    return { done, inp, rev, total:chs.length, pct:Math.round((done/chs.length)*100) };
  }
  function totalQs(type) {
    let t=0;
    Object.values(data.qLog||{}).forEach(dl => Object.values(dl).forEach(sl => Object.values(sl).forEach(e => { if(!type||e.type===type) t+=e.count||0; })));
    return t;
  }
  function todayQCount() {
    let t=0;
    Object.values(data.qLog?.[today]||{}).forEach(sl => Object.values(sl).forEach(e => t+=e.count||0));
    return t;
  }
  function weekHours() {
    let t=0;
    for(let i=0;i<7;i++){const d=new Date();d.setDate(d.getDate()-i);t+=data.studyLog[d.toISOString().split("T")[0]]||0;}
    return t;
  }
  function logQ() {
    if(!todayQs.chapter||!todayQs.count) return;
    upd(d => {
      d.qLog=d.qLog||{};d.qLog[today]=d.qLog[today]||{};d.qLog[today][todayQs.subject]=d.qLog[today][todayQs.subject]||{};
      const key=todayQs.chapter+"_"+todayQs.type;
      d.qLog[today][todayQs.subject][key]={chapter:todayQs.chapter,type:todayQs.type,count:(d.qLog[today][todayQs.subject][key]?.count||0)+parseInt(todayQs.count)};
      return d;
    });
    setTodayQs(q=>({...q,count:""}));
  }
  function logHours() {
    const h=parseFloat(todayHours); if(!h||h<=0) return;
    upd(d=>{d.studyLog={...d.studyLog,[today]:(d.studyLog[today]||0)+h};return d;});
    setTodayHours("");
  }
  function addError() {
    if(!errorForm.mistake) return;
    upd(d=>{d.errors=[...(d.errors||[]),{...errorForm,id:Date.now(),date:today,resolved:false}];return d;});
    setErrorForm(f=>({...f,mistake:"",correction:""}));
  }
  function addBacklog() {
    if(!backlogInput.chapter.trim()) return;
    upd(d=>{d.backlogs=[...d.backlogs,{...backlogInput,id:Date.now(),added:today}];return d;});
    setBacklogInput(b=>({...b,chapter:"",note:""}));
  }
  function addTest() {
    if(!testForm.name) return;
    upd(d=>{d.tests=[...d.tests,{...testForm,id:Date.now()}];return d;});
    setTestForm({name:"",date:"",physics:"",chemistry:"",maths:"",total:"",silly:"",concept:"",time:"",unattempted:"",notes:""});
    setAddTestOpen(false);
  }
  function addWeekPlan() {
    if(!weekPlanInput.target) return;
    upd(d=>{d.weekPlan=d.weekPlan||{};d.weekPlan[weekPlanInput.day]=[...(d.weekPlan[weekPlanInput.day]||[]),{subject:weekPlanInput.subject,target:weekPlanInput.target,done:false,id:Date.now()}];return d;});
    setWeekPlanInput(w=>({...w,target:""}));
  }

  const todayStudy = data.studyLog[today]||0;
  const goalPct = Math.min(100,Math.round((todayStudy/data.dailyGoal)*100));

  return (
    <div style={{minHeight:"100vh",background:"#07070f",color:"#e8e8f0",fontFamily:"'Space Mono','Courier New',monospace"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#222;border-radius:2px}
        .btn{cursor:pointer;border:none;font-family:inherit;transition:all .15s;border-radius:6px}
        .btn:hover{filter:brightness(1.15);transform:translateY(-1px)}
        .card{background:#0d0d1a;border:1px solid #1a1a2e;border-radius:12px;padding:18px}
        .inp{background:#0a0a18;border:1px solid #1e1e30;border-radius:6px;color:#e8e8f0;font-family:inherit;font-size:12px;padding:8px 10px;outline:none}
        .inp:focus{border-color:#845EF7}
        select.inp option{background:#0a0a18}
        .pb-bg{background:#111128;border-radius:99px;height:5px;overflow:hidden}
        .pb{height:100%;border-radius:99px;transition:width .4s}
        .modal-ov{position:fixed;inset:0;background:rgba(0,0,0,.85);display:flex;align-items:center;justify-content:center;z-index:200;padding:16px}
        .modal{background:#0d0d1a;border:1px solid #2a2a3a;border-radius:14px;padding:24px;width:100%;max-width:480px;max-height:90vh;overflow-y:auto}
        .chap-btn{cursor:pointer;border-radius:8px;padding:10px 12px;border:1px solid;font-family:inherit;font-size:11px;text-align:left;width:100%;transition:all .15s}
        .chap-btn:hover{filter:brightness(1.2);transform:translateY(-1px)}
        .tag{display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700}
      `}</style>

      {/* Header */}
      <div style={{background:"#07070f",borderBottom:"1px solid #1a1a2e",padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100}}>
        <div>
          <div style={{fontFamily:"'Syne',sans-serif",fontSize:"18px",fontWeight:800}}>JEE <span style={{color:"#845EF7"}}>TRACKER</span></div>
          <div style={{fontSize:"9px",color:"#444",letterSpacing:"2px"}}>MAINS · ADVANCED · BOARDS</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:"10px",color:syncing?"#FFB347":"#4CAF50",marginBottom:"2px"}}>{syncMsg}</div>
          <div style={{fontSize:"10px",color:"#444"}}>{auth.email.split("@")[0]}</div>
          <button className="btn" onClick={()=>setAuth(null)} style={{fontSize:"9px",color:"#444",background:"transparent",padding:"2px 6px",border:"1px solid #222",marginTop:"3px"}}>Log out</button>
        </div>
      </div>

      {/* Nav */}
      <div style={{display:"flex",gap:"4px",padding:"8px 12px",borderBottom:"1px solid #1a1a2e",overflowX:"auto"}}>
        {TABS.map(t=>(
          <button key={t.id} className="btn" onClick={()=>setTab(t.id)} style={{
            padding:"6px 12px",fontSize:"11px",whiteSpace:"nowrap",
            background:tab===t.id?"#845EF7":"transparent",
            color:tab===t.id?"#fff":"#666",
            border:tab===t.id?"none":"1px solid #1e1e30"
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{padding:"16px",maxWidth:"960px",margin:"0 auto"}}>

        {/* DASHBOARD */}
        {tab==="dashboard"&&(
          <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
            <div className="card" style={{borderColor:"#845EF733",background:"linear-gradient(135deg,#0d0d1a,#130f20)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"}}>
                <span style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:"14px"}}>Today's Overview</span>
                <span style={{fontSize:"11px",color:"#845EF7"}}>{todayStudy}h · {todayQCount()} Qs</span>
              </div>
              <div className="pb-bg"><div className="pb" style={{width:`${goalPct}%`,background:"linear-gradient(90deg,#845EF7,#00C9A7)"}}/></div>
              <div style={{fontSize:"10px",color:"#444",marginTop:"4px"}}>{goalPct}% of {data.dailyGoal}h daily goal</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:"12px"}}>
              {Object.entries(SUBJECTS).map(([sub,cfg])=>{
                const p=subjectProgress(sub);
                const hard=SUBJECTS[sub].chapters.filter(c=>getChap(sub,c).difficulty==="hard").length;
                return (
                  <div key={sub} className="card" style={{borderColor:cfg.color+"33"}}>
                    <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"8px"}}>
                      <span style={{fontSize:"18px"}}>{cfg.icon}</span>
                      <div style={{flex:1}}>
                        <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:"13px"}}>{sub}</div>
                        <div style={{fontSize:"10px",color:"#555"}}>{p.done}/{p.total} done · {hard} hard</div>
                      </div>
                      <div style={{fontSize:"20px",fontFamily:"'Syne',sans-serif",fontWeight:800,color:cfg.color}}>{p.pct}%</div>
                    </div>
                    <div className="pb-bg"><div className="pb" style={{width:`${p.pct}%`,background:cfg.color}}/></div>
                    <div style={{display:"flex",gap:"10px",marginTop:"6px",fontSize:"10px"}}>
                      <span style={{color:"#4CAF50"}}>✓{p.done}</span>
                      <span style={{color:"#00C9A7"}}>◑{p.inp}</span>
                      <span style={{color:"#FFB347"}}>↻{p.rev}</span>
                      <span style={{color:"#555"}}>{p.total-p.done-p.inp-p.rev} left</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:"10px"}}>
              {[
                {label:"Week Hours",val:weekHours().toFixed(1)+"h",c:"#845EF7"},
                {label:"Total Qs",val:totalQs(),c:"#00C9A7"},
                {label:"PYQs Done",val:totalQs("pyq"),c:"#FF6B35"},
                {label:"Backlogs",val:data.backlogs.length,c:"#FFB347"},
                {label:"Open Errors",val:(data.errors||[]).filter(e=>!e.resolved).length,c:"#FF4444"},
                {label:"Tests Taken",val:data.tests.length,c:"#845EF7"},
              ].map(s=>(
                <div key={s.label} className="card" style={{textAlign:"center",padding:"12px 8px"}}>
                  <div style={{fontSize:"22px",fontFamily:"'Syne',sans-serif",fontWeight:800,color:s.c}}>{s.val}</div>
                  <div style={{fontSize:"10px",color:"#444",marginTop:"2px"}}>{s.label}</div>
                </div>
              ))}
            </div>
            {Object.entries(SUBJECTS).some(([sub])=>SUBJECTS[sub].chapters.some(c=>getChap(sub,c).difficulty==="hard"))&&(
              <div className="card" style={{borderColor:"#FF6B3533"}}>
                <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,color:"#FF6B35",marginBottom:"8px",fontSize:"12px"}}>🔥 Hard Chapters — Focus Here</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:"6px"}}>
                  {Object.entries(SUBJECTS).flatMap(([sub,cfg])=>
                    SUBJECTS[sub].chapters.filter(c=>getChap(sub,c).difficulty==="hard").map(c=>(
                      <span key={sub+c} style={{background:"#1a0f0a",border:"1px solid #FF6B3544",borderRadius:"6px",padding:"3px 8px",fontSize:"11px"}}>
                        <span style={{color:cfg.color}}>{cfg.icon}</span> {c}
                      </span>
                    ))
                  )}
                </div>
              </div>
            )}
            {(data.errors||[]).filter(e=>!e.resolved).length>0&&(
              <div className="card" style={{borderColor:"#FF444433"}}>
                <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,color:"#FF4444",marginBottom:"8px",fontSize:"12px"}}>❌ Unresolved Mistakes</div>
                {(data.errors||[]).filter(e=>!e.resolved).slice(-3).reverse().map(e=>(
                  <div key={e.id} style={{fontSize:"11px",color:"#aaa",padding:"4px 0",borderBottom:"1px solid #1a1a2e"}}>
                    <span style={{color:SUBJECTS[e.subject]?.color}}>{e.subject}</span> · {e.chapter} — {e.mistake.slice(0,50)}{e.mistake.length>50?"...":""}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CHAPTERS */}
        {tab==="chapters"&&(
          <div>
            <div style={{display:"flex",gap:"8px",marginBottom:"14px",flexWrap:"wrap"}}>
              {Object.entries(SUBJECTS).map(([sub,cfg])=>(
                <button key={sub} className="btn" onClick={()=>setSubTab(sub)} style={{padding:"6px 14px",fontSize:"12px",background:subTab===sub?cfg.color:"#0d0d1a",color:subTab===sub?"#fff":cfg.color,border:`1px solid ${cfg.color}44`}}>{cfg.icon} {sub}</button>
              ))}
            </div>
            <div style={{fontSize:"10px",color:"#333",marginBottom:"10px"}}>Tap to cycle status · Tap ⚑ to set difficulty</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(185px,1fr))",gap:"8px"}}>
              {SUBJECTS[subTab].chapters.map((ch,i)=>{
                const chd=getChap(subTab,ch);
                const st=chd.status||"pending";
                const diff=chd.difficulty||"";
                const cfg=STATUS_CFG[st];
                const dcfg=diff?DIFFICULTY[diff]:null;
                const qCount=Object.values(data.qLog||{}).reduce((acc,dl)=>{Object.values(dl[subTab]||{}).forEach(e=>{if(e.chapter===ch)acc+=e.count||0;});return acc;},0);
                const pyqCount=Object.values(data.qLog||{}).reduce((acc,dl)=>{Object.values(dl[subTab]||{}).forEach(e=>{if(e.chapter===ch&&e.type==="pyq")acc+=e.count||0;});return acc;},0);
                return (
                  <button key={i} className="chap-btn" onClick={()=>cycleStatus(subTab,ch)} style={{background:cfg.bg,borderColor:cfg.border,color:cfg.text}}>
                    <div style={{fontSize:"9px",color:"#444",marginBottom:"2px"}}>Ch {String(i+1).padStart(2,"0")}</div>
                    <div style={{fontWeight:700,fontSize:"12px",color:"#ddd",marginBottom:"5px",lineHeight:"1.3"}}>{ch}</div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{fontSize:"10px"}}>{cfg.label}</span>
                      <div style={{display:"flex",gap:"4px",alignItems:"center"}}>
                        {dcfg&&<span className="tag" style={{background:dcfg.color+"22",color:dcfg.color,fontSize:"9px"}}>{dcfg.label}</span>}
                        <span style={{fontSize:"12px",cursor:"pointer"}} onClick={e=>{e.stopPropagation();cycleDiff(subTab,ch);}}>⚑</span>
                      </div>
                    </div>
                    {qCount>0&&<div style={{fontSize:"9px",color:"#444",marginTop:"3px"}}>Qs:{qCount} · PYQ:{pyqCount}</div>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* PRACTICE */}
        {tab==="practice"&&(
          <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:"17px"}}>🎯 Practice Tracker</div>
            <div className="card" style={{borderColor:"#00C9A733"}}>
              <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,color:"#00C9A7",marginBottom:"10px",fontSize:"13px"}}>Log Questions</div>
              <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
                <select className="inp" value={todayQs.subject} onChange={e=>setTodayQs(q=>({...q,subject:e.target.value,chapter:""}))} style={{minWidth:"100px"}}>
                  {Object.keys(SUBJECTS).map(s=><option key={s}>{s}</option>)}
                </select>
                <select className="inp" value={todayQs.chapter} onChange={e=>setTodayQs(q=>({...q,chapter:e.target.value}))} style={{flex:2,minWidth:"150px"}}>
                  <option value="">Chapter...</option>
                  {SUBJECTS[todayQs.subject].chapters.map(c=><option key={c}>{c}</option>)}
                </select>
                <select className="inp" value={todayQs.type} onChange={e=>setTodayQs(q=>({...q,type:e.target.value}))} style={{minWidth:"95px"}}>
                  <option value="practice">Practice</option>
                  <option value="pyq">PYQ</option>
                  <option value="mock">Mock</option>
                  <option value="revision">Revision</option>
                </select>
                <input className="inp" type="number" placeholder="Count" value={todayQs.count} onChange={e=>setTodayQs(q=>({...q,count:e.target.value}))} style={{width:"70px"}} min="1"/>
                <button className="btn" onClick={logQ} style={{background:"#00C9A7",color:"#000",fontWeight:700,padding:"8px 14px",fontSize:"12px"}}>Log</button>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:"10px"}}>
              {[{label:"Total Qs",val:totalQs(),c:"#00C9A7"},{label:"PYQs",val:totalQs("pyq"),c:"#FF6B35"},{label:"Mock Qs",val:totalQs("mock"),c:"#845EF7"},{label:"Today",val:todayQCount(),c:"#FFB347"}].map(s=>(
                <div key={s.label} className="card" style={{textAlign:"center",padding:"12px 8px"}}>
                  <div style={{fontSize:"24px",fontFamily:"'Syne',sans-serif",fontWeight:800,color:s.c}}>{s.val}</div>
                  <div style={{fontSize:"10px",color:"#444",marginTop:"2px"}}>{s.label}</div>
                </div>
              ))}
            </div>
            <div className="card" style={{borderColor:"#FF6B3533"}}>
              <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,color:"#FF6B35",marginBottom:"10px",fontSize:"12px"}}>📌 PYQ Progress (target ~300 per subject)</div>
              {Object.entries(SUBJECTS).map(([sub,cfg])=>{
                const pyq=Object.values(data.qLog||{}).reduce((acc,dl)=>{Object.values(dl[sub]||{}).forEach(e=>{if(e.type==="pyq")acc+=e.count||0;});return acc;},0);
                return (
                  <div key={sub} style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"8px"}}>
                    <span style={{color:cfg.color,width:"65px",fontSize:"11px"}}>{cfg.icon} {sub}</span>
                    <div className="pb-bg" style={{flex:1}}><div className="pb" style={{width:`${Math.min(100,(pyq/300)*100)}%`,background:cfg.color}}/></div>
                    <span style={{fontSize:"11px",color:"#555",width:"55px",textAlign:"right"}}>{pyq}/300</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* BACKLOGS */}
        {tab==="backlogs"&&(
          <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
            <div className="card" style={{borderColor:"#FF6B3544"}}>
              <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,color:"#FF6B35",marginBottom:"10px",fontSize:"13px"}}>➕ Add Backlog</div>
              <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
                <select className="inp" value={backlogInput.subject} onChange={e=>setBacklogInput(b=>({...b,subject:e.target.value}))} style={{minWidth:"100px"}}>
                  {Object.keys(SUBJECTS).map(s=><option key={s}>{s}</option>)}
                </select>
                <input className="inp" placeholder="Chapter..." value={backlogInput.chapter} onChange={e=>setBacklogInput(b=>({...b,chapter:e.target.value}))} style={{flex:1,minWidth:"130px"}}/>
                <input className="inp" placeholder="Note (optional)" value={backlogInput.note} onChange={e=>setBacklogInput(b=>({...b,note:e.target.value}))} style={{flex:1,minWidth:"110px"}}/>
                <button className="btn" onClick={addBacklog} style={{background:"#FF6B35",color:"#fff",fontWeight:700,padding:"8px 14px",fontSize:"12px"}}>Add</button>
              </div>
            </div>
            {Object.keys(SUBJECTS).map(sub=>{
              const subs=data.backlogs.filter(b=>b.subject===sub);
              if(!subs.length) return null;
              return (
                <div key={sub} className="card" style={{borderColor:SUBJECTS[sub].color+"33"}}>
                  <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,color:SUBJECTS[sub].color,marginBottom:"8px",fontSize:"13px"}}>{SUBJECTS[sub].icon} {sub} ({subs.length})</div>
                  <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
                    {subs.map(b=>(
                      <div key={b.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"#07070f",border:"1px solid #1a1a2e",borderRadius:"8px",padding:"8px 12px"}}>
                        <div>
                          <div style={{fontSize:"12px",fontWeight:700,color:"#ddd"}}>{b.chapter}</div>
                          {b.note&&<div style={{fontSize:"10px",color:"#555"}}>{b.note}</div>}
                        </div>
                        <div style={{display:"flex",gap:"5px"}}>
                          <button className="btn" onClick={()=>cycleStatus(b.subject,b.chapter)} style={{background:"#0a1f0a",color:"#4CAF50",border:"1px solid #4CAF5044",fontSize:"10px",padding:"3px 8px"}}>✓</button>
                          <button className="btn" onClick={()=>upd(d=>{d.backlogs=d.backlogs.filter(x=>x.id!==b.id);return d;})} style={{background:"#1f0a0a",color:"#FF6B35",border:"1px solid #FF6B3533",fontSize:"10px",padding:"3px 8px"}}>✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {data.backlogs.length===0&&<div style={{textAlign:"center",color:"#444",padding:"40px"}}>🎉 No backlogs!</div>}
          </div>
        )}

        {/* ERRORS */}
        {tab==="errors"&&(
          <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:"17px"}}>❌ Mistake Notebook</div>
            <div className="card" style={{borderColor:"#FF444433"}}>
              <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,color:"#FF4444",marginBottom:"10px",fontSize:"13px"}}>Log a Mistake</div>
              <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
                <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
                  <select className="inp" value={errorForm.subject} onChange={e=>setErrorForm(f=>({...f,subject:e.target.value}))} style={{minWidth:"100px"}}>
                    {Object.keys(SUBJECTS).map(s=><option key={s}>{s}</option>)}
                  </select>
                  <select className="inp" value={errorForm.chapter} onChange={e=>setErrorForm(f=>({...f,chapter:e.target.value}))} style={{flex:1,minWidth:"150px"}}>
                    <option value="">Chapter...</option>
                    {SUBJECTS[errorForm.subject].chapters.map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <textarea className="inp" placeholder="What went wrong..." value={errorForm.mistake} onChange={e=>setErrorForm(f=>({...f,mistake:e.target.value}))} rows={2} style={{resize:"vertical",width:"100%"}}/>
                <textarea className="inp" placeholder="Correct approach..." value={errorForm.correction} onChange={e=>setErrorForm(f=>({...f,correction:e.target.value}))} rows={2} style={{resize:"vertical",width:"100%"}}/>
                <button className="btn" onClick={addError} style={{background:"#FF4444",color:"#fff",fontWeight:700,padding:"8px 14px",fontSize:"12px",alignSelf:"flex-start"}}>Add</button>
              </div>
            </div>
            {Object.keys(SUBJECTS).map(sub=>{
              const errs=(data.errors||[]).filter(e=>e.subject===sub);
              if(!errs.length) return null;
              return (
                <div key={sub} className="card" style={{borderColor:SUBJECTS[sub].color+"33"}}>
                  <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,color:SUBJECTS[sub].color,marginBottom:"8px",fontSize:"13px"}}>{SUBJECTS[sub].icon} {sub} — {errs.filter(e=>!e.resolved).length} open</div>
                  <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
                    {errs.map(e=>(
                      <div key={e.id} style={{background:e.resolved?"#0a0f0a":"#0f070a",border:`1px solid ${e.resolved?"#4CAF5022":"#FF444422"}`,borderRadius:"8px",padding:"8px 10px"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"6px"}}>
                          <div style={{flex:1}}>
                            <div style={{fontSize:"10px",color:SUBJECTS[sub].color,marginBottom:"2px"}}>{e.chapter} · {e.date}</div>
                            <div style={{fontSize:"11px",color:"#ccc"}}>{e.mistake}</div>
                            {e.correction&&<div style={{fontSize:"10px",color:"#4CAF50",marginTop:"2px"}}>✓ {e.correction}</div>}
                          </div>
                          <button className="btn" onClick={()=>upd(d=>{d.errors=d.errors.map(x=>x.id===e.id?{...x,resolved:!x.resolved}:x);return d;})}
                            style={{background:e.resolved?"#1a2a1a":"#0f1a0f",color:e.resolved?"#4CAF50":"#888",border:`1px solid ${e.resolved?"#4CAF5044":"#444"}`,fontSize:"9px",padding:"3px 7px",whiteSpace:"nowrap"}}>
                            {e.resolved?"✓ Done":"Resolve"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {(data.errors||[]).length===0&&<div style={{textAlign:"center",color:"#444",padding:"40px"}}>No mistakes logged yet.</div>}
          </div>
        )}

        {/* TESTS */}
        {tab==="tests"&&(
          <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:"17px"}}>📝 Mock Tests</div>
              <button className="btn" onClick={()=>setAddTestOpen(true)} style={{background:"#845EF7",color:"#fff",fontWeight:700,padding:"8px 14px",fontSize:"12px"}}>+ Add</button>
            </div>
            {data.tests.length>1&&(
              <div className="card">
                <div style={{fontSize:"10px",color:"#444",marginBottom:"8px",letterSpacing:"1px"}}>SCORE TREND (click bar for analysis)</div>
                <div style={{display:"flex",alignItems:"flex-end",gap:"5px",height:"80px"}}>
                  {[...data.tests].slice(-12).map((t,i)=>{
                    const score=parseFloat(t.total)||0;
                    const h=Math.max(8,(score/100)*72);
                    const c=score>=70?"#4CAF50":score>=50?"#FFB347":"#FF6B35";
                    return (
                      <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:"2px",cursor:"pointer"}} onClick={()=>setTestAnalysisOpen(t)}>
                        <div style={{fontSize:"8px",color:c,fontWeight:700}}>{score}%</div>
                        <div style={{width:"100%",height:`${h}px`,background:c,borderRadius:"3px 3px 0 0",opacity:0.8}}/>
                        <div style={{fontSize:"8px",color:"#333",overflow:"hidden",maxWidth:"26px",textAlign:"center"}}>{t.name.slice(0,4)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
              {[...data.tests].reverse().map(t=>{
                const total=parseFloat(t.total)||0;
                const c=total>=70?"#4CAF50":total>=50?"#FFB347":"#FF6B35";
                return (
                  <div key={t.id} className="card" style={{cursor:"pointer"}} onClick={()=>setTestAnalysisOpen(t)}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div>
                        <div style={{fontWeight:700,fontSize:"13px"}}>{t.name}</div>
                        <div style={{fontSize:"10px",color:"#444"}}>{t.date}</div>
                      </div>
                      <div style={{fontSize:"24px",fontFamily:"'Syne',sans-serif",fontWeight:800,color:c}}>{total}%</div>
                    </div>
                    <div style={{display:"flex",gap:"10px",marginTop:"6px",fontSize:"11px",flexWrap:"wrap"}}>
                      {[["⚡",t.physics,"#FF6B35"],["🧪",t.chemistry,"#00C9A7"],["∑",t.maths,"#845EF7"]].map(([ic,v,col])=>(
                        <span key={ic} style={{color:"#555"}}>{ic} <span style={{color:col,fontWeight:700}}>{v||"—"}%</span></span>
                      ))}
                    </div>
                    {(t.silly||t.concept||t.time||t.unattempted)&&(
                      <div style={{display:"flex",gap:"6px",marginTop:"5px",flexWrap:"wrap"}}>
                        {t.silly&&<span className="tag" style={{background:"#2a1f00",color:"#FFB347"}}>Silly:{t.silly}</span>}
                        {t.concept&&<span className="tag" style={{background:"#1a0f0a",color:"#FF6B35"}}>Concept:{t.concept}</span>}
                        {t.time&&<span className="tag" style={{background:"#0f0a1a",color:"#845EF7"}}>Time:{t.time}</span>}
                        {t.unattempted&&<span className="tag" style={{background:"#0a1a1a",color:"#00C9A7"}}>Unattempted:{t.unattempted}</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {data.tests.length===0&&<div style={{textAlign:"center",color:"#444",padding:"40px"}}>No tests yet.</div>}
          </div>
        )}

        {/* PLANNER */}
        {tab==="planner"&&(
          <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:"17px"}}>📅 Weekly Planner</div>
            <div className="card" style={{borderColor:"#845EF733"}}>
              <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
                <select className="inp" value={weekPlanInput.day} onChange={e=>setWeekPlanInput(w=>({...w,day:e.target.value}))} style={{minWidth:"70px"}}>
                  {DAYS.map(d=><option key={d}>{d}</option>)}
                </select>
                <select className="inp" value={weekPlanInput.subject} onChange={e=>setWeekPlanInput(w=>({...w,subject:e.target.value}))} style={{minWidth:"100px"}}>
                  {Object.keys(SUBJECTS).map(s=><option key={s}>{s}</option>)}
                </select>
                <input className="inp" placeholder="Target (e.g. Rotational PYQs)" value={weekPlanInput.target} onChange={e=>setWeekPlanInput(w=>({...w,target:e.target.value}))} style={{flex:1,minWidth:"140px"}}/>
                <button className="btn" onClick={addWeekPlan} style={{background:"#845EF7",color:"#fff",fontWeight:700,padding:"8px 14px",fontSize:"12px"}}>Add</button>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:"10px"}}>
              {DAYS.map(day=>{
                const tasks=(data.weekPlan||{})[day]||[];
                const done=tasks.filter(t=>t.done).length;
                return (
                  <div key={day} className="card" style={{borderColor:done===tasks.length&&tasks.length>0?"#4CAF5033":"#1a1a2e"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"6px"}}>
                      <span style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:"13px"}}>{day}</span>
                      {tasks.length>0&&<span style={{fontSize:"10px",color:done===tasks.length?"#4CAF50":"#555"}}>{done}/{tasks.length}</span>}
                    </div>
                    {tasks.length===0&&<div style={{fontSize:"11px",color:"#333"}}>No targets</div>}
                    <div style={{display:"flex",flexDirection:"column",gap:"5px"}}>
                      {tasks.map(t=>(
                        <div key={t.id} style={{display:"flex",alignItems:"center",gap:"5px"}}>
                          <button className="btn" onClick={()=>upd(d=>{d.weekPlan[day]=d.weekPlan[day].map(x=>x.id===t.id?{...x,done:!x.done}:x);return d;})}
                            style={{width:"15px",height:"15px",borderRadius:"3px",border:`1px solid ${t.done?"#4CAF50":"#444"}`,background:t.done?"#4CAF50":"transparent",flexShrink:0,padding:0,fontSize:"9px",color:"#000"}}>
                            {t.done?"✓":""}
                          </button>
                          <span style={{fontSize:"11px",color:t.done?"#444":"#bbb",textDecoration:t.done?"line-through":"none",flex:1,lineHeight:"1.3"}}>
                            <span style={{color:SUBJECTS[t.subject]?.color,fontSize:"9px"}}>{t.subject.slice(0,3)} </span>{t.target}
                          </span>
                          <button className="btn" onClick={()=>upd(d=>{d.weekPlan[day]=d.weekPlan[day].filter(x=>x.id!==t.id);return d;})} style={{color:"#333",fontSize:"11px",background:"transparent",padding:"0 2px"}}>✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STUDY LOG */}
        {tab==="study"&&(
          <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:"17px"}}>⏱ Study Log</div>
            <div className="card" style={{borderColor:"#00C9A733"}}>
              <div style={{display:"flex",gap:"8px",alignItems:"center",flexWrap:"wrap",marginBottom:"12px"}}>
                <input className="inp" type="number" placeholder="Hours..." value={todayHours} onChange={e=>setTodayHours(e.target.value)} style={{width:"110px"}} min="0" max="24" step="0.5"/>
                <button className="btn" onClick={logHours} style={{background:"#00C9A7",color:"#000",fontWeight:700,padding:"8px 14px",fontSize:"12px"}}>Log</button>
                <span style={{fontSize:"12px",color:"#555"}}>Today: <span style={{color:"#00C9A7"}}>{todayStudy}h</span></span>
              </div>
              <div className="pb-bg"><div className="pb" style={{width:`${goalPct}%`,background:"linear-gradient(90deg,#00C9A7,#845EF7)"}}/></div>
            </div>
            <div className="card">
              <div style={{fontSize:"11px",color:"#555",marginBottom:"8px"}}>Daily Goal</div>
              <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
                {[6,8,10,12,14,16].map(h=>(
                  <button key={h} className="btn" onClick={()=>upd(d=>{d.dailyGoal=h;return d;})} style={{padding:"5px 12px",fontSize:"11px",background:data.dailyGoal===h?"#845EF7":"#0d0d1a",color:data.dailyGoal===h?"#fff":"#666",border:`1px solid ${data.dailyGoal===h?"#845EF7":"#1e1e30"}`}}>{h}h</button>
                ))}
              </div>
            </div>
            <div className="card">
              <div style={{fontSize:"11px",color:"#555",marginBottom:"10px"}}>Last 21 Days</div>
              <div style={{display:"flex",gap:"4px",flexWrap:"wrap"}}>
                {Array.from({length:21}).map((_,i)=>{
                  const d=new Date();d.setDate(d.getDate()-(20-i));
                  const key=d.toISOString().split("T")[0];
                  const hours=data.studyLog[key]||0;
                  const intensity=Math.min(1,hours/data.dailyGoal);
                  return (
                    <div key={key} style={{flex:"1",minWidth:"28px",textAlign:"center"}}>
                      <div style={{height:"32px",background:intensity===0?"#111128":`rgba(132,94,247,${0.15+intensity*0.85})`,borderRadius:"4px",border:"1px solid #1a1a2e"}} title={`${key}: ${hours}h`}/>
                      <div style={{fontSize:"8px",color:"#333",marginTop:"2px"}}>{d.getDate()}</div>
                      <div style={{fontSize:"8px",color:hours>0?"#845EF7":"#222"}}>{hours>0?hours+"h":"—"}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ADD TEST MODAL */}
      {addTestOpen&&(
        <div className="modal-ov" onClick={()=>setAddTestOpen(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:"16px",marginBottom:"14px"}}>Add Mock Test</div>
            <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
              <input className="inp" placeholder="Test name" value={testForm.name} onChange={e=>setTestForm(f=>({...f,name:e.target.value}))} style={{width:"100%"}}/>
              <input className="inp" type="date" value={testForm.date} onChange={e=>setTestForm(f=>({...f,date:e.target.value}))} style={{width:"100%"}}/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px"}}>
                <input className="inp" placeholder="Physics %" type="number" value={testForm.physics} onChange={e=>setTestForm(f=>({...f,physics:e.target.value}))}/>
                <input className="inp" placeholder="Chem %" type="number" value={testForm.chemistry} onChange={e=>setTestForm(f=>({...f,chemistry:e.target.value}))}/>
                <input className="inp" placeholder="Maths %" type="number" value={testForm.maths} onChange={e=>setTestForm(f=>({...f,maths:e.target.value}))}/>
              </div>
              <input className="inp" placeholder="Overall %" type="number" value={testForm.total} onChange={e=>setTestForm(f=>({...f,total:e.target.value}))} style={{width:"100%"}}/>
              <div style={{fontSize:"11px",color:"#555"}}>Marks lost due to:</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
                <input className="inp" placeholder="Silly mistakes" type="number" value={testForm.silly} onChange={e=>setTestForm(f=>({...f,silly:e.target.value}))}/>
                <input className="inp" placeholder="Concept gaps" type="number" value={testForm.concept} onChange={e=>setTestForm(f=>({...f,concept:e.target.value}))}/>
                <input className="inp" placeholder="Time mgmt" type="number" value={testForm.time} onChange={e=>setTestForm(f=>({...f,time:e.target.value}))}/>
                <input className="inp" placeholder="Unattempted" type="number" value={testForm.unattempted} onChange={e=>setTestForm(f=>({...f,unattempted:e.target.value}))}/>
              </div>
              <textarea className="inp" placeholder="Notes / improvements..." value={testForm.notes} onChange={e=>setTestForm(f=>({...f,notes:e.target.value}))} rows={2} style={{resize:"vertical",width:"100%"}}/>
              <div style={{display:"flex",gap:"8px",justifyContent:"flex-end",marginTop:"4px"}}>
                <button className="btn" onClick={()=>setAddTestOpen(false)} style={{background:"#111128",color:"#666",border:"1px solid #2a2a3a",padding:"7px 12px",fontSize:"11px"}}>Cancel</button>
                <button className="btn" onClick={addTest} style={{background:"#845EF7",color:"#fff",fontWeight:700,padding:"7px 16px",fontSize:"11px"}}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TEST ANALYSIS MODAL */}
      {testAnalysisOpen&&(
        <div className="modal-ov" onClick={()=>setTestAnalysisOpen(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:"16px",marginBottom:"4px"}}>{testAnalysisOpen.name}</div>
            <div style={{fontSize:"10px",color:"#444",marginBottom:"14px"}}>{testAnalysisOpen.date}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px",marginBottom:"14px"}}>
              {[["⚡ Physics",testAnalysisOpen.physics,"#FF6B35"],["🧪 Chemistry",testAnalysisOpen.chemistry,"#00C9A7"],["∑ Maths",testAnalysisOpen.maths,"#845EF7"]].map(([l,v,c])=>(
                <div key={l} style={{textAlign:"center",background:"#07070f",borderRadius:"8px",padding:"8px",border:`1px solid ${c}33`}}>
                  <div style={{fontSize:"18px",fontWeight:700,color:c,fontFamily:"'Syne',sans-serif"}}>{v||"—"}%</div>
                  <div style={{fontSize:"9px",color:"#444",marginTop:"2px"}}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{fontSize:"30px",fontFamily:"'Syne',sans-serif",fontWeight:800,textAlign:"center",color:parseFloat(testAnalysisOpen.total)>=70?"#4CAF50":parseFloat(testAnalysisOpen.total)>=50?"#FFB347":"#FF6B35",marginBottom:"14px"}}>{testAnalysisOpen.total}% Overall</div>
            {(testAnalysisOpen.silly||testAnalysisOpen.concept||testAnalysisOpen.time||testAnalysisOpen.unattempted)&&(
              <div style={{marginBottom:"12px"}}>
                <div style={{fontSize:"10px",color:"#555",marginBottom:"6px",letterSpacing:"1px"}}>MARKS LOST</div>
                {[["Silly Mistakes",testAnalysisOpen.silly,"#FFB347"],["Concept Gaps",testAnalysisOpen.concept,"#FF6B35"],["Time Mgmt",testAnalysisOpen.time,"#845EF7"],["Unattempted",testAnalysisOpen.unattempted,"#00C9A7"]].filter(([,v])=>v).map(([l,v,c])=>(
                  <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid #1a1a2e",fontSize:"11px"}}>
                    <span style={{color:"#888"}}>{l}</span><span style={{color:c,fontWeight:700}}>-{v} marks</span>
                  </div>
                ))}
              </div>
            )}
            {testAnalysisOpen.notes&&<div style={{background:"#07070f",borderRadius:"8px",padding:"8px",fontSize:"11px",color:"#888",border:"1px solid #1a1a2e"}}>📝 {testAnalysisOpen.notes}</div>}
            <button className="btn" onClick={()=>setTestAnalysisOpen(null)} style={{background:"#845EF7",color:"#fff",fontWeight:700,padding:"8px",fontSize:"12px",marginTop:"14px",width:"100%"}}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

