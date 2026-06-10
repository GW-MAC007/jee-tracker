import { useState, useEffect, useRef } from "react";

// ── CONFIG ────────────────────────────────────────────────────────
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

const STATUS_CFG = {
  pending:       { label:"Pending",      bg:"#1a1a2e", border:"#333",    text:"#666"    },
  "in-progress": { label:"In Progress",  bg:"#0d1f1a", border:"#00C9A7", text:"#00C9A7" },
  done:          { label:"Done ✓",       bg:"#0d1f0d", border:"#4CAF50", text:"#4CAF50" },
  revision:      { label:"Revision ↻",   bg:"#1f1800", border:"#FFB347", text:"#FFB347" }
};
const DIFFICULTY = {
  easy:   { label:"Easy",   color:"#4CAF50" },
  medium: { label:"Medium", color:"#FFB347" },
  hard:   { label:"Hard",   color:"#FF6B35" }
};
const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

const EMPTY = {
  chapters:{}, backlogs:[], tests:[], studyLog:{}, dailyGoal:8,
  qLog:{}, errors:[], weekPlan:{}
};

// ── Supabase helpers ──────────────────────────────────────────────
async function sbAuth(email, password, mode) {
  const url = mode === "login"
    ? `${SUPABASE_URL}/auth/v1/token?grant_type=password`
    : `${SUPABASE_URL}/auth/v1/signup`;
  const r = await fetch(url, {
    method:"POST",
    headers:{"Content-Type":"application/json","apikey":SUPABASE_KEY},
    body: JSON.stringify({email,password})
  });
  return r.json();
}
async function cloudLoad(uid, tok) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/tracker_data?user_id=eq.${uid}&select=data`, {
    headers:{"apikey":SUPABASE_KEY,"Authorization":`Bearer ${tok}`}
  });
  const rows = await r.json();
  return rows?.length ? rows[0].data : null;
}
async function cloudSave(uid, tok, data) {
  await fetch(`${SUPABASE_URL}/rest/v1/tracker_data?user_id=eq.${uid}`, {
    method:"DELETE", headers:{"apikey":SUPABASE_KEY,"Authorization":`Bearer ${tok}`}
  });
  await fetch(`${SUPABASE_URL}/rest/v1/tracker_data`, {
    method:"POST",
    headers:{"apikey":SUPABASE_KEY,"Authorization":`Bearer ${tok}`,"Content-Type":"application/json","Prefer":"return=minimal"},
    body: JSON.stringify({user_id:uid, data, updated_at:new Date().toISOString()})
  });
}

// ── Auth Screen ───────────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [mode, setMode]       = useState("login");
  const [email, setEmail]     = useState("");
  const [pass, setPass]       = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg]         = useState("");

  async function submit() {
    if (!email || !pass) return setMsg("Enter email and password.");
    setLoading(true); setMsg("");
    try {
      const res = await sbAuth(email, pass, mode);
      if (res.error) setMsg(res.error.message || JSON.stringify(res.error));
      else if (res.access_token) onAuth({ uid: res.user.id, tok: res.access_token, email: res.user.email });
      else setMsg(mode==="signup" ? "✅ Account created! Check email, then log in." : "Unexpected error.");
    } catch(e) { setMsg("Network error: " + e.message); }
    setLoading(false);
  }

  return (
    <div style={{minHeight:"100vh",background:"#07070f",display:"flex",alignItems:"center",justifyContent:"center",padding:"20px",fontFamily:"'Space Mono',monospace"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@800&family=Space+Mono&display=swap');*{box-sizing:border-box;margin:0;padding:0}`}</style>
      <div style={{background:"#0d0d1a",border:"1px solid #2a2a3a",borderRadius:"16px",padding:"36px 28px",width:"100%",maxWidth:"360px"}}>
        <div style={{textAlign:"center",marginBottom:"28px"}}>
          <div style={{fontFamily:"'Syne',sans-serif",fontSize:"24px",fontWeight:800,color:"#e8e8f0"}}>JEE <span style={{color:"#845EF7"}}>TRACKER</span></div>
          <div style={{fontSize:"9px",color:"#444",letterSpacing:"2px",marginTop:"4px"}}>MAINS · ADVANCED · BOARDS</div>
        </div>
        <div style={{display:"flex",gap:"6px",marginBottom:"20px"}}>
          {["login","signup"].map(m=>(
            <button key={m} onClick={()=>{setMode(m);setMsg("");}} style={{flex:1,padding:"8px",fontSize:"12px",fontFamily:"inherit",cursor:"pointer",borderRadius:"6px",border:`1px solid ${mode===m?"#845EF7":"#2a2a3a"}`,background:mode===m?"#845EF7":"transparent",color:mode===m?"#fff":"#666"}}>
              {m==="login"?"Log In":"Sign Up"}
            </button>
          ))}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
          <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)}
            style={{background:"#0a0a18",border:"1px solid #2a2a3a",borderRadius:"6px",color:"#e8e8f0",fontFamily:"inherit",fontSize:"13px",padding:"10px 12px",outline:"none",width:"100%"}}/>
          <input type="password" placeholder="Password (min 6 chars)" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()}
            style={{background:"#0a0a18",border:"1px solid #2a2a3a",borderRadius:"6px",color:"#e8e8f0",fontFamily:"inherit",fontSize:"13px",padding:"10px 12px",outline:"none",width:"100%"}}/>
          {msg&&<div style={{fontSize:"12px",color:msg.startsWith("✅")?"#4CAF50":"#FF6B35",textAlign:"center",lineHeight:"1.4"}}>{msg}</div>}
          <button onClick={submit} disabled={loading}
            style={{background:"#845EF7",color:"#fff",fontWeight:700,padding:"11px",fontSize:"13px",fontFamily:"inherit",border:"none",borderRadius:"6px",cursor:loading?"not-allowed":"pointer",opacity:loading?0.7:1,marginTop:"4px"}}>
            {loading?"Please wait...":(mode==="login"?"Log In →":"Create Account →")}
          </button>
        </div>
        <div style={{fontSize:"10px",color:"#333",textAlign:"center",marginTop:"18px",lineHeight:"1.5"}}>
          Your data syncs across all devices.<br/>Use the same account on PC + mobile.
        </div>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────
export default function App() {
  const [auth, setAuth]   = useState(null);
  const [data, setData]   = useState(EMPTY);
  const [tab, setTab]     = useState("dashboard");
  const [subTab, setSubTab] = useState("Physics");
  const [syncMsg, setSyncMsg] = useState("");
  const [syncing, setSyncing] = useState(false);
  const saveTimer = useRef(null);

  // Forms
  const [addTestOpen, setAddTestOpen]       = useState(false);
  const [testAnalysis, setTestAnalysis]     = useState(null);
  const [testForm, setTestForm]             = useState({name:"",date:"",physics:"",chemistry:"",maths:"",total:"",silly:"",concept:"",time:"",unattempted:"",notes:""});
  const [backlogIn, setBacklogIn]           = useState({subject:"Physics",chapter:"",note:""});
  const [todayHours, setTodayHours]         = useState("");
  const [qIn, setQIn]                       = useState({subject:"Physics",chapter:"",count:"",type:"practice"});
  const [errForm, setErrForm]               = useState({subject:"Physics",chapter:"",mistake:"",correction:""});
  const [planIn, setPlanIn]                 = useState({day:"Mon",subject:"Physics",target:""});

  const today = new Date().toISOString().split("T")[0];

  // On login → load cloud data
  useEffect(()=>{
    if (!auth) return;
    (async()=>{
      setSyncing(true); setSyncMsg("Loading…");
      try {
        const cloud = await cloudLoad(auth.uid, auth.tok);
        if (cloud) setData({...EMPTY,...cloud});
        setSyncMsg("Synced ✓");
      } catch { setSyncMsg("Load failed"); }
      setSyncing(false);
    })();
  },[auth]);

  // Auto-save on data change (debounced 1.5s)
  useEffect(()=>{
    if (!auth) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async()=>{
      setSyncing(true); setSyncMsg("Saving…");
      try { await cloudSave(auth.uid, auth.tok, data); setSyncMsg("Saved ✓"); }
      catch { setSyncMsg("Save failed"); }
      setSyncing(false);
    }, 1500);
  },[data, auth]);

  if (!auth) return <AuthScreen onAuth={setAuth}/>;

  // ── helpers ──
  const upd = fn => setData(d => fn({...d}));
  const getChap = (sub,ch) => data.chapters[sub]?.[ch] || {};
  function setChap(sub,ch,field,val){
    upd(d=>{ d.chapters={...d.chapters,[sub]:{...(d.chapters[sub]||{}),[ch]:{...(d.chapters[sub]?.[ch]||{}),[field]:val}}}; return d; });
  }
  function cycleStatus(sub,ch){
    const order=["pending","in-progress","done","revision"];
    const next=order[(order.indexOf(getChap(sub,ch).status||"pending")+1)%4];
    setChap(sub,ch,"status",next);
    if(next==="done") upd(d=>{ d.backlogs=d.backlogs.filter(b=>!(b.subject===sub&&b.chapter===ch)); return d; });
  }
  function cycleDiff(sub,ch){
    const order=["","easy","medium","hard"];
    setChap(sub,ch,"difficulty",order[(order.indexOf(getChap(sub,ch).difficulty||"")+1)%4]);
  }
  function subProg(sub){
    const chs=SUBJECTS[sub].chapters;
    const done=chs.filter(c=>getChap(sub,c).status==="done").length;
    const inp =chs.filter(c=>getChap(sub,c).status==="in-progress").length;
    const rev =chs.filter(c=>getChap(sub,c).status==="revision").length;
    return {done,inp,rev,total:chs.length,pct:Math.round(done/chs.length*100)};
  }
  function totalQs(type){
    let t=0;
    Object.values(data.qLog||{}).forEach(dl=>Object.values(dl).forEach(sl=>Object.values(sl).forEach(e=>{if(!type||e.type===type)t+=e.count||0;})));
    return t;
  }
  function todayQs(){
    let t=0;
    Object.values(data.qLog?.[today]||{}).forEach(sl=>Object.values(sl).forEach(e=>t+=e.count||0));
    return t;
  }
  function weekH(){
    let t=0;
    for(let i=0;i<7;i++){const d=new Date();d.setDate(d.getDate()-i);t+=data.studyLog[d.toISOString().split("T")[0]]||0;}
    return t;
  }
  function logQ(){
    if(!qIn.chapter||!qIn.count) return;
    upd(d=>{
      d.qLog=d.qLog||{};d.qLog[today]=d.qLog[today]||{};d.qLog[today][qIn.subject]=d.qLog[today][qIn.subject]||{};
      const k=qIn.chapter+"_"+qIn.type;
      d.qLog[today][qIn.subject][k]={chapter:qIn.chapter,type:qIn.type,count:(d.qLog[today][qIn.subject][k]?.count||0)+parseInt(qIn.count)};
      return d;
    });
    setQIn(q=>({...q,count:""}));
  }
  function logHours(){
    const h=parseFloat(todayHours); if(!h||h<=0) return;
    upd(d=>{d.studyLog={...d.studyLog,[today]:(d.studyLog[today]||0)+h};return d;});
    setTodayHours("");
  }
  function addError(){
    if(!errForm.mistake) return;
    upd(d=>{d.errors=[...(d.errors||[]),{...errForm,id:Date.now(),date:today,resolved:false}];return d;});
    setErrForm(f=>({...f,mistake:"",correction:""}));
  }
  function addBacklog(){
    if(!backlogIn.chapter.trim()) return;
    upd(d=>{d.backlogs=[...d.backlogs,{...backlogIn,id:Date.now(),added:today}];return d;});
    setBacklogIn(b=>({...b,chapter:"",note:""}));
  }
  function addTest(){
    if(!testForm.name) return;
    upd(d=>{d.tests=[...d.tests,{...testForm,id:Date.now()}];return d;});
    setTestForm({name:"",date:"",physics:"",chemistry:"",maths:"",total:"",silly:"",concept:"",time:"",unattempted:"",notes:""});
    setAddTestOpen(false);
  }
  function addPlan(){
    if(!planIn.target) return;
    upd(d=>{d.weekPlan=d.weekPlan||{};d.weekPlan[planIn.day]=[...(d.weekPlan[planIn.day]||[]),{...planIn,done:false,id:Date.now()}];return d;});
    setPlanIn(p=>({...p,target:""}));
  }

  const todayStudy = data.studyLog[today]||0;
  const goalPct    = Math.min(100,Math.round(todayStudy/data.dailyGoal*100));

  const TABS=[
    {id:"dashboard",label:"📊 Dashboard"},
    {id:"chapters", label:"📚 Chapters"},
    {id:"practice", label:"🎯 Practice"},
    {id:"backlogs", label:`⚠️ Backlogs${data.backlogs.length?` (${data.backlogs.length})`:""}`},
    {id:"errors",   label:`❌ Errors${(data.errors||[]).filter(e=>!e.resolved).length?` (${(data.errors||[]).filter(e=>!e.resolved).length})`:""}`},
    {id:"tests",    label:"📝 Mock Tests"},
    {id:"planner",  label:"📅 Planner"},
    {id:"study",    label:"⏱ Study Log"},
  ];

  const S={
    btn:{cursor:"pointer",border:"none",fontFamily:"inherit",borderRadius:"6px",transition:"all .15s"},
    inp:{background:"#0a0a18",border:"1px solid #1e1e30",borderRadius:"6px",color:"#e8e8f0",fontFamily:"inherit",fontSize:"12px",padding:"8px 10px",outline:"none"},
    card:{background:"#0d0d1a",border:"1px solid #1a1a2e",borderRadius:"12px",padding:"16px"},
    pbBg:{background:"#111128",borderRadius:"99px",height:"5px",overflow:"hidden"},
    pb:{height:"100%",borderRadius:"99px",transition:"width .4s"},
  };

  return (
    <div style={{minHeight:"100vh",background:"#07070f",color:"#e8e8f0",fontFamily:"'Space Mono','Courier New',monospace"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Space+Mono:wght@400;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#222;border-radius:2px}
        .hbtn:hover{filter:brightness(1.15);transform:translateY(-1px)}
        .chbtn:hover{filter:brightness(1.2);transform:translateY(-1px)}
        .mov{position:fixed;inset:0;background:rgba(0,0,0,.85);display:flex;align-items:center;justify-content:center;z-index:200;padding:16px}
        .modal{background:#0d0d1a;border:1px solid #2a2a3a;border-radius:14px;padding:22px;width:100%;max-width:460px;max-height:90vh;overflow-y:auto}
        select option{background:#0a0a18}
        .tag{display:inline-block;padding:2px 7px;border-radius:4px;font-size:10px;font-weight:700}
      `}</style>

      {/* ── HEADER ── */}
      <div style={{background:"#07070f",borderBottom:"1px solid #1a1a2e",padding:"10px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100}}>
        <div>
          <div style={{fontFamily:"'Syne',sans-serif",fontSize:"17px",fontWeight:800}}>JEE <span style={{color:"#845EF7"}}>TRACKER</span></div>
          <div style={{fontSize:"9px",color:"#444",letterSpacing:"1.5px"}}>MAINS · ADVANCED · BOARDS</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:"9px",color:syncing?"#FFB347":"#4CAF50",marginBottom:"2px"}}>{syncMsg}</div>
          <div style={{fontSize:"9px",color:"#555"}}>{auth.email.split("@")[0]}</div>
          <button onClick={()=>setAuth(null)} style={{...S.btn,fontSize:"9px",color:"#444",background:"transparent",padding:"2px 6px",border:"1px solid #1e1e30",marginTop:"2px",cursor:"pointer"}}>logout</button>
        </div>
      </div>

      {/* ── NAV ── */}
      <div style={{display:"flex",gap:"3px",padding:"8px 12px",borderBottom:"1px solid #1a1a2e",overflowX:"auto"}}>
        {TABS.map(t=>(
          <button key={t.id} className="hbtn" onClick={()=>setTab(t.id)} style={{...S.btn,padding:"6px 11px",fontSize:"10px",whiteSpace:"nowrap",background:tab===t.id?"#845EF7":"transparent",color:tab===t.id?"#fff":"#666",border:tab===t.id?"none":"1px solid #1e1e30",cursor:"pointer"}}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{padding:"14px",maxWidth:"960px",margin:"0 auto"}}>

        {/* ════ DASHBOARD ════ */}
        {tab==="dashboard"&&(
          <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>

            {/* Today strip */}
            <div style={{...S.card,borderColor:"#845EF733",background:"linear-gradient(135deg,#0d0d1a,#130f20)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"}}>
                <span style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:"14px"}}>Today</span>
                <span style={{fontSize:"11px",color:"#845EF7"}}>{todayStudy}h studied · {todayQs()} Qs solved</span>
              </div>
              <div style={S.pbBg}><div style={{...S.pb,width:`${goalPct}%`,background:"linear-gradient(90deg,#845EF7,#00C9A7)"}}/></div>
              <div style={{fontSize:"10px",color:"#444",marginTop:"4px"}}>{goalPct}% of {data.dailyGoal}h daily goal</div>
            </div>

            {/* Subject cards */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:"10px"}}>
              {Object.entries(SUBJECTS).map(([sub,cfg])=>{
                const p=subProg(sub);
                const hard=SUBJECTS[sub].chapters.filter(c=>getChap(sub,c).difficulty==="hard").length;
                return (
                  <div key={sub} style={{...S.card,borderColor:cfg.color+"33"}}>
                    <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"8px"}}>
                      <span style={{fontSize:"18px"}}>{cfg.icon}</span>
                      <div style={{flex:1}}>
                        <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:"13px"}}>{sub}</div>
                        <div style={{fontSize:"10px",color:"#555"}}>{p.done}/{p.total} done · {hard} hard</div>
                      </div>
                      <div style={{fontSize:"20px",fontFamily:"'Syne',sans-serif",fontWeight:800,color:cfg.color}}>{p.pct}%</div>
                    </div>
                    <div style={S.pbBg}><div style={{...S.pb,width:`${p.pct}%`,background:cfg.color}}/></div>
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

            {/* Stats row */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:"8px"}}>
              {[
                {label:"Week Hours",  val:weekH().toFixed(1)+"h", c:"#845EF7"},
                {label:"Total Qs",    val:totalQs(),              c:"#00C9A7"},
                {label:"PYQs Done",   val:totalQs("pyq"),         c:"#FF6B35"},
                {label:"Backlogs",    val:data.backlogs.length,   c:"#FFB347"},
                {label:"Open Errors", val:(data.errors||[]).filter(e=>!e.resolved).length, c:"#FF4444"},
                {label:"Tests",       val:data.tests.length,      c:"#845EF7"},
              ].map(s=>(
                <div key={s.label} style={{...S.card,textAlign:"center",padding:"10px 6px"}}>
                  <div style={{fontSize:"20px",fontFamily:"'Syne',sans-serif",fontWeight:800,color:s.c}}>{s.val}</div>
                  <div style={{fontSize:"9px",color:"#444",marginTop:"2px"}}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Hard chapters */}
            {Object.entries(SUBJECTS).some(([sub])=>SUBJECTS[sub].chapters.some(c=>getChap(sub,c).difficulty==="hard"))&&(
              <div style={{...S.card,borderColor:"#FF6B3533"}}>
                <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,color:"#FF6B35",marginBottom:"8px",fontSize:"12px"}}>🔥 Hard Chapters — Needs Focus</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:"5px"}}>
                  {Object.entries(SUBJECTS).flatMap(([sub,cfg])=>
                    SUBJECTS[sub].chapters.filter(c=>getChap(sub,c).difficulty==="hard").map(c=>(
                      <span key={sub+c} style={{background:"#1a0f0a",border:"1px solid #FF6B3544",borderRadius:"5px",padding:"3px 8px",fontSize:"10px"}}>
                        <span style={{color:cfg.color}}>{cfg.icon}</span> {c}
                      </span>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Recent errors */}
            {(data.errors||[]).filter(e=>!e.resolved).length>0&&(
              <div style={{...S.card,borderColor:"#FF444433"}}>
                <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,color:"#FF4444",marginBottom:"8px",fontSize:"12px"}}>❌ Unresolved Mistakes</div>
                {(data.errors||[]).filter(e=>!e.resolved).slice(-3).reverse().map(e=>(
                  <div key={e.id} style={{fontSize:"11px",color:"#aaa",padding:"4px 0",borderBottom:"1px solid #1a1a2e"}}>
                    <span style={{color:SUBJECTS[e.subject]?.color}}>{e.subject}</span> · {e.chapter} — {e.mistake.slice(0,55)}{e.mistake.length>55?"...":""}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════ CHAPTERS ════ */}
        {tab==="chapters"&&(
          <div>
            <div style={{display:"flex",gap:"6px",marginBottom:"12px",flexWrap:"wrap"}}>
              {Object.entries(SUBJECTS).map(([sub,cfg])=>(
                <button key={sub} className="hbtn" onClick={()=>setSubTab(sub)} style={{...S.btn,padding:"6px 13px",fontSize:"11px",background:subTab===sub?cfg.color:"#0d0d1a",color:subTab===sub?"#fff":cfg.color,border:`1px solid ${cfg.color}44`,cursor:"pointer"}}>
                  {cfg.icon} {sub}
                </button>
              ))}
            </div>
            <div style={{fontSize:"9px",color:"#333",marginBottom:"10px"}}>Tap to cycle status · Tap ⚑ to set difficulty (Easy/Medium/Hard)</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(175px,1fr))",gap:"7px"}}>
              {SUBJECTS[subTab].chapters.map((ch,i)=>{
                const chd=getChap(subTab,ch);
                const st=chd.status||"pending";
                const diff=chd.difficulty||"";
                const cfg=STATUS_CFG[st];
                const dcfg=diff?DIFFICULTY[diff]:null;
                const qc=Object.values(data.qLog||{}).reduce((a,dl)=>{Object.values(dl[subTab]||{}).forEach(e=>{if(e.chapter===ch)a+=e.count||0;});return a;},0);
                const pyqc=Object.values(data.qLog||{}).reduce((a,dl)=>{Object.values(dl[subTab]||{}).forEach(e=>{if(e.chapter===ch&&e.type==="pyq")a+=e.count||0;});return a;},0);
                return (
                  <button key={i} className="chbtn" onClick={()=>cycleStatus(subTab,ch)}
                    style={{cursor:"pointer",borderRadius:"8px",padding:"10px 11px",border:`1px solid ${cfg.border}`,fontFamily:"inherit",fontSize:"11px",textAlign:"left",width:"100%",transition:"all .15s",background:cfg.bg,color:cfg.text}}>
                    <div style={{fontSize:"9px",color:"#444",marginBottom:"2px"}}>Ch {String(i+1).padStart(2,"0")}</div>
                    <div style={{fontWeight:700,fontSize:"11px",color:"#ddd",marginBottom:"5px",lineHeight:"1.3"}}>{ch}</div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{fontSize:"9px"}}>{cfg.label}</span>
                      <div style={{display:"flex",gap:"3px",alignItems:"center"}}>
                        {dcfg&&<span style={{background:dcfg.color+"22",color:dcfg.color,fontSize:"9px",padding:"1px 5px",borderRadius:"3px",fontWeight:700}}>{dcfg.label}</span>}
                        <span style={{fontSize:"11px",cursor:"pointer",padding:"0 2px"}} onClick={e=>{e.stopPropagation();cycleDiff(subTab,ch);}}>⚑</span>
                      </div>
                    </div>
                    {qc>0&&<div style={{fontSize:"9px",color:"#444",marginTop:"3px"}}>Qs:{qc} · PYQ:{pyqc}</div>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ════ PRACTICE ════ */}
        {tab==="practice"&&(
          <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:"16px"}}>🎯 Practice Tracker</div>
            <div style={{...S.card,borderColor:"#00C9A733"}}>
              <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,color:"#00C9A7",marginBottom:"10px",fontSize:"12px"}}>Log Questions Solved</div>
              <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
                <select style={{...S.inp,minWidth:"95px"}} value={qIn.subject} onChange={e=>setQIn(q=>({...q,subject:e.target.value,chapter:""}))}>
                  {Object.keys(SUBJECTS).map(s=><option key={s}>{s}</option>)}
                </select>
                <select style={{...S.inp,flex:2,minWidth:"140px"}} value={qIn.chapter} onChange={e=>setQIn(q=>({...q,chapter:e.target.value}))}>
                  <option value="">Chapter...</option>
                  {SUBJECTS[qIn.subject].chapters.map(c=><option key={c}>{c}</option>)}
                </select>
                <select style={{...S.inp,minWidth:"90px"}} value={qIn.type} onChange={e=>setQIn(q=>({...q,type:e.target.value}))}>
                  <option value="practice">Practice</option>
                  <option value="pyq">PYQ</option>
                  <option value="mock">Mock</option>
                  <option value="revision">Revision</option>
                </select>
                <input style={{...S.inp,width:"65px"}} type="number" placeholder="Count" value={qIn.count} onChange={e=>setQIn(q=>({...q,count:e.target.value}))} min="1"/>
                <button className="hbtn" onClick={logQ} style={{...S.btn,background:"#00C9A7",color:"#000",fontWeight:700,padding:"8px 13px",fontSize:"11px",cursor:"pointer"}}>Log</button>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:"8px"}}>
              {[{label:"Total Qs",val:totalQs(),c:"#00C9A7"},{label:"PYQs",val:totalQs("pyq"),c:"#FF6B35"},{label:"Mock Qs",val:totalQs("mock"),c:"#845EF7"},{label:"Today",val:todayQs(),c:"#FFB347"}].map(s=>(
                <div key={s.label} style={{...S.card,textAlign:"center",padding:"10px 6px"}}>
                  <div style={{fontSize:"22px",fontFamily:"'Syne',sans-serif",fontWeight:800,color:s.c}}>{s.val}</div>
                  <div style={{fontSize:"9px",color:"#444",marginTop:"2px"}}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{...S.card,borderColor:"#FF6B3533"}}>
              <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,color:"#FF6B35",marginBottom:"10px",fontSize:"12px"}}>📌 PYQ Progress (Target: 300 per subject)</div>
              {Object.entries(SUBJECTS).map(([sub,cfg])=>{
                const pyq=Object.values(data.qLog||{}).reduce((a,dl)=>{Object.values(dl[sub]||{}).forEach(e=>{if(e.type==="pyq")a+=e.count||0;});return a;},0);
                return (
                  <div key={sub} style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"7px"}}>
                    <span style={{color:cfg.color,width:"60px",fontSize:"11px"}}>{cfg.icon} {sub}</span>
                    <div style={S.pbBg}><div style={{...S.pb,width:`${Math.min(100,pyq/300*100)}%`,background:cfg.color}}/></div>
                    <span style={{fontSize:"10px",color:"#555",width:"50px",textAlign:"right"}}>{pyq}/300</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ════ BACKLOGS ════ */}
        {tab==="backlogs"&&(
          <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
            <div style={{...S.card,borderColor:"#FF6B3544"}}>
              <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,color:"#FF6B35",marginBottom:"10px",fontSize:"12px"}}>➕ Add Backlog</div>
              <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
                <select style={{...S.inp,minWidth:"95px"}} value={backlogIn.subject} onChange={e=>setBacklogIn(b=>({...b,subject:e.target.value}))}>
                  {Object.keys(SUBJECTS).map(s=><option key={s}>{s}</option>)}
                </select>
                <input style={{...S.inp,flex:1,minWidth:"120px"}} placeholder="Chapter..." value={backlogIn.chapter} onChange={e=>setBacklogIn(b=>({...b,chapter:e.target.value}))}/>
                <input style={{...S.inp,flex:1,minWidth:"100px"}} placeholder="Note (optional)" value={backlogIn.note} onChange={e=>setBacklogIn(b=>({...b,note:e.target.value}))}/>
                <button className="hbtn" onClick={addBacklog} style={{...S.btn,background:"#FF6B35",color:"#fff",fontWeight:700,padding:"7px 12px",fontSize:"11px",cursor:"pointer"}}>Add</button>
              </div>
            </div>
            {Object.keys(SUBJECTS).map(sub=>{
              const subs=data.backlogs.filter(b=>b.subject===sub);
              if(!subs.length) return null;
              return (
                <div key={sub} style={{...S.card,borderColor:SUBJECTS[sub].color+"33"}}>
                  <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,color:SUBJECTS[sub].color,marginBottom:"8px",fontSize:"12px"}}>{SUBJECTS[sub].icon} {sub} ({subs.length})</div>
                  <div style={{display:"flex",flexDirection:"column",gap:"5px"}}>
                    {subs.map(b=>(
                      <div key={b.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"#07070f",border:"1px solid #1a1a2e",borderRadius:"7px",padding:"7px 10px"}}>
                        <div>
                          <div style={{fontSize:"12px",fontWeight:700,color:"#ddd"}}>{b.chapter}</div>
                          {b.note&&<div style={{fontSize:"9px",color:"#555"}}>{b.note}</div>}
                        </div>
                        <div style={{display:"flex",gap:"4px"}}>
                          <button className="hbtn" onClick={()=>cycleStatus(b.subject,b.chapter)} style={{...S.btn,background:"#0a1f0a",color:"#4CAF50",border:"1px solid #4CAF5044",fontSize:"10px",padding:"3px 7px",cursor:"pointer"}}>✓</button>
                          <button className="hbtn" onClick={()=>upd(d=>{d.backlogs=d.backlogs.filter(x=>x.id!==b.id);return d;})} style={{...S.btn,background:"#1f0a0a",color:"#FF6B35",border:"1px solid #FF6B3533",fontSize:"10px",padding:"3px 7px",cursor:"pointer"}}>✕</button>
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

        {/* ════ ERRORS ════ */}
        {tab==="errors"&&(
          <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:"16px"}}>❌ Mistake Notebook</div>
            <div style={{...S.card,borderColor:"#FF444433"}}>
              <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,color:"#FF4444",marginBottom:"10px",fontSize:"12px"}}>Log a Mistake</div>
              <div style={{display:"flex",flexDirection:"column",gap:"7px"}}>
                <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
                  <select style={{...S.inp,minWidth:"95px"}} value={errForm.subject} onChange={e=>setErrForm(f=>({...f,subject:e.target.value}))}>
                    {Object.keys(SUBJECTS).map(s=><option key={s}>{s}</option>)}
                  </select>
                  <select style={{...S.inp,flex:1,minWidth:"140px"}} value={errForm.chapter} onChange={e=>setErrForm(f=>({...f,chapter:e.target.value}))}>
                    <option value="">Chapter...</option>
                    {SUBJECTS[errForm.subject].chapters.map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <textarea style={{...S.inp,resize:"vertical",width:"100%"}} placeholder="What went wrong..." value={errForm.mistake} onChange={e=>setErrForm(f=>({...f,mistake:e.target.value}))} rows={2}/>
                <textarea style={{...S.inp,resize:"vertical",width:"100%"}} placeholder="Correct approach..." value={errForm.correction} onChange={e=>setErrForm(f=>({...f,correction:e.target.value}))} rows={2}/>
                <button className="hbtn" onClick={addError} style={{...S.btn,background:"#FF4444",color:"#fff",fontWeight:700,padding:"7px 13px",fontSize:"11px",alignSelf:"flex-start",cursor:"pointer"}}>Add</button>
              </div>
            </div>
            {Object.keys(SUBJECTS).map(sub=>{
              const errs=(data.errors||[]).filter(e=>e.subject===sub);
              if(!errs.length) return null;
              return (
                <div key={sub} style={{...S.card,borderColor:SUBJECTS[sub].color+"33"}}>
                  <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,color:SUBJECTS[sub].color,marginBottom:"8px",fontSize:"12px"}}>{SUBJECTS[sub].icon} {sub} — {errs.filter(e=>!e.resolved).length} open</div>
                  <div style={{display:"flex",flexDirection:"column",gap:"5px"}}>
                    {errs.map(e=>(
                      <div key={e.id} style={{background:e.resolved?"#0a0f0a":"#0f070a",border:`1px solid ${e.resolved?"#4CAF5022":"#FF444422"}`,borderRadius:"7px",padding:"8px 10px"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"6px"}}>
                          <div style={{flex:1}}>
                            <div style={{fontSize:"9px",color:SUBJECTS[sub].color,marginBottom:"2px"}}>{e.chapter} · {e.date}</div>
                            <div style={{fontSize:"11px",color:"#ccc"}}>{e.mistake}</div>
                            {e.correction&&<div style={{fontSize:"10px",color:"#4CAF50",marginTop:"2px"}}>✓ {e.correction}</div>}
                          </div>
                          <button className="hbtn" onClick={()=>upd(d=>{d.errors=d.errors.map(x=>x.id===e.id?{...x,resolved:!x.resolved}:x);return d;})}
                            style={{...S.btn,background:e.resolved?"#1a2a1a":"#111",color:e.resolved?"#4CAF50":"#888",border:`1px solid ${e.resolved?"#4CAF5044":"#333"}`,fontSize:"9px",padding:"3px 7px",whiteSpace:"nowrap",cursor:"pointer"}}>
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

        {/* ════ TESTS ════ */}
        {tab==="tests"&&(
          <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:"16px"}}>📝 Mock Tests</div>
              <button className="hbtn" onClick={()=>setAddTestOpen(true)} style={{...S.btn,background:"#845EF7",color:"#fff",fontWeight:700,padding:"7px 13px",fontSize:"11px",cursor:"pointer"}}>+ Add</button>
            </div>
            {data.tests.length>1&&(
              <div style={S.card}>
                <div style={{fontSize:"9px",color:"#444",marginBottom:"7px",letterSpacing:"1px"}}>SCORE TREND — tap bar for analysis</div>
                <div style={{display:"flex",alignItems:"flex-end",gap:"4px",height:"75px"}}>
                  {[...data.tests].slice(-12).map((t,i)=>{
                    const s=parseFloat(t.total)||0;
                    const h=Math.max(8,s/100*68);
                    const c=s>=70?"#4CAF50":s>=50?"#FFB347":"#FF6B35";
                    return (
                      <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:"2px",cursor:"pointer"}} onClick={()=>setTestAnalysis(t)}>
                        <div style={{fontSize:"7px",color:c,fontWeight:700}}>{s}%</div>
                        <div style={{width:"100%",height:`${h}px`,background:c,borderRadius:"2px 2px 0 0",opacity:0.85}}/>
                        <div style={{fontSize:"7px",color:"#333",overflow:"hidden",maxWidth:"24px",textAlign:"center"}}>{t.name.slice(0,4)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div style={{display:"flex",flexDirection:"column",gap:"7px"}}>
              {[...data.tests].reverse().map(t=>{
                const total=parseFloat(t.total)||0;
                const c=total>=70?"#4CAF50":total>=50?"#FFB347":"#FF6B35";
                return (
                  <div key={t.id} style={{...S.card,cursor:"pointer"}} onClick={()=>setTestAnalysis(t)}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div>
                        <div style={{fontWeight:700,fontSize:"13px"}}>{t.name}</div>
                        <div style={{fontSize:"9px",color:"#444"}}>{t.date} · tap for analysis</div>
                      </div>
                      <div style={{fontSize:"22px",fontFamily:"'Syne',sans-serif",fontWeight:800,color:c}}>{total}%</div>
                    </div>
                    <div style={{display:"flex",gap:"10px",marginTop:"5px",fontSize:"10px",flexWrap:"wrap"}}>
                      {[["⚡",t.physics,"#FF6B35"],["🧪",t.chemistry,"#00C9A7"],["∑",t.maths,"#845EF7"]].map(([ic,v,col])=>(
                        <span key={ic} style={{color:"#555"}}>{ic} <span style={{color:col,fontWeight:700}}>{v||"—"}%</span></span>
                      ))}
                    </div>
                    {(t.silly||t.concept||t.time||t.unattempted)&&(
                      <div style={{display:"flex",gap:"5px",marginTop:"4px",flexWrap:"wrap"}}>
                        {t.silly&&<span className="tag" style={{background:"#2a1f00",color:"#FFB347"}}>Silly:{t.silly}</span>}
                        {t.concept&&<span className="tag" style={{background:"#1a0f0a",color:"#FF6B35"}}>Concept:{t.concept}</span>}
                        {t.time&&<span className="tag" style={{background:"#0f0a1a",color:"#845EF7"}}>Time:{t.time}</span>}
                        {t.unattempted&&<span className="tag" style={{background:"#0a1a1a",color:"#00C9A7"}}>Skip:{t.unattempted}</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {data.tests.length===0&&<div style={{textAlign:"center",color:"#444",padding:"40px"}}>No tests yet. Add your first mock!</div>}
          </div>
        )}

        {/* ════ PLANNER ════ */}
        {tab==="planner"&&(
          <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:"16px"}}>📅 Weekly Planner</div>
            <div style={{...S.card,borderColor:"#845EF733"}}>
              <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
                <select style={{...S.inp,minWidth:"65px"}} value={planIn.day} onChange={e=>setPlanIn(p=>({...p,day:e.target.value}))}>
                  {DAYS.map(d=><option key={d}>{d}</option>)}
                </select>
                <select style={{...S.inp,minWidth:"95px"}} value={planIn.subject} onChange={e=>setPlanIn(p=>({...p,subject:e.target.value}))}>
                  {Object.keys(SUBJECTS).map(s=><option key={s}>{s}</option>)}
                </select>
                <input style={{...S.inp,flex:1,minWidth:"130px"}} placeholder="Target (e.g. Waves PYQs)" value={planIn.target} onChange={e=>setPlanIn(p=>({...p,target:e.target.value}))}/>
                <button className="hbtn" onClick={addPlan} style={{...S.btn,background:"#845EF7",color:"#fff",fontWeight:700,padding:"7px 12px",fontSize:"11px",cursor:"pointer"}}>Add</button>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:"8px"}}>
              {DAYS.map(day=>{
                const tasks=(data.weekPlan||{})[day]||[];
                const done=tasks.filter(t=>t.done).length;
                return (
                  <div key={day} style={{...S.card,borderColor:done===tasks.length&&tasks.length>0?"#4CAF5033":"#1a1a2e"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"6px"}}>
                      <span style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:"13px"}}>{day}</span>
                      {tasks.length>0&&<span style={{fontSize:"9px",color:done===tasks.length?"#4CAF50":"#555"}}>{done}/{tasks.length}</span>}
                    </div>
                    {tasks.length===0&&<div style={{fontSize:"10px",color:"#333"}}>No targets</div>}
                    <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
                      {tasks.map(t=>(
                        <div key={t.id} style={{display:"flex",alignItems:"center",gap:"5px"}}>
                          <button onClick={()=>upd(d=>{d.weekPlan[day]=d.weekPlan[day].map(x=>x.id===t.id?{...x,done:!x.done}:x);return d;})}
                            style={{width:"14px",height:"14px",borderRadius:"3px",border:`1px solid ${t.done?"#4CAF50":"#444"}`,background:t.done?"#4CAF50":"transparent",flexShrink:0,cursor:"pointer",fontSize:"9px",color:"#000",padding:0}}>
                            {t.done?"✓":""}
                          </button>
                          <span style={{fontSize:"10px",color:t.done?"#444":"#bbb",textDecoration:t.done?"line-through":"none",flex:1,lineHeight:"1.3"}}>
                            <span style={{color:SUBJECTS[t.subject]?.color,fontSize:"9px"}}>{t.subject.slice(0,3)} </span>{t.target}
                          </span>
                          <button onClick={()=>upd(d=>{d.weekPlan[day]=d.weekPlan[day].filter(x=>x.id!==t.id);return d;})} style={{color:"#333",fontSize:"10px",background:"transparent",border:"none",cursor:"pointer",padding:"0 2px"}}>✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ════ STUDY LOG ════ */}
        {tab==="study"&&(
          <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:"16px"}}>⏱ Study Log</div>
            <div style={{...S.card,borderColor:"#00C9A733"}}>
              <div style={{display:"flex",gap:"6px",alignItems:"center",flexWrap:"wrap",marginBottom:"10px"}}>
                <input style={{...S.inp,width:"100px"}} type="number" placeholder="Hours..." value={todayHours} onChange={e=>setTodayHours(e.target.value)} min="0" max="24" step="0.5"/>
                <button className="hbtn" onClick={logHours} style={{...S.btn,background:"#00C9A7",color:"#000",fontWeight:700,padding:"8px 13px",fontSize:"11px",cursor:"pointer"}}>Log</button>
                <span style={{fontSize:"11px",color:"#555"}}>Today: <span style={{color:"#00C9A7"}}>{todayStudy}h</span></span>
              </div>
              <div style={S.pbBg}><div style={{...S.pb,width:`${goalPct}%`,background:"linear-gradient(90deg,#00C9A7,#845EF7)"}}/></div>
              <div style={{fontSize:"9px",color:"#444",marginTop:"3px"}}>{goalPct}% of {data.dailyGoal}h goal</div>
            </div>
            <div style={S.card}>
              <div style={{fontSize:"10px",color:"#555",marginBottom:"7px"}}>Daily Goal</div>
              <div style={{display:"flex",gap:"5px",flexWrap:"wrap"}}>
                {[6,8,10,12,14,16].map(h=>(
                  <button key={h} className="hbtn" onClick={()=>upd(d=>{d.dailyGoal=h;return d;})} style={{...S.btn,padding:"5px 10px",fontSize:"11px",background:data.dailyGoal===h?"#845EF7":"#0d0d1a",color:data.dailyGoal===h?"#fff":"#666",border:`1px solid ${data.dailyGoal===h?"#845EF7":"#1e1e30"}`,cursor:"pointer"}}>{h}h</button>
                ))}
              </div>
            </div>
            <div style={S.card}>
              <div style={{fontSize:"10px",color:"#555",marginBottom:"10px"}}>Last 21 Days</div>
              <div style={{display:"flex",gap:"3px",flexWrap:"wrap"}}>
                {Array.from({length:21}).map((_,i)=>{
                  const d=new Date();d.setDate(d.getDate()-(20-i));
                  const key=d.toISOString().split("T")[0];
                  const hours=data.studyLog[key]||0;
                  const int=Math.min(1,hours/data.dailyGoal);
                  return (
                    <div key={key} style={{flex:"1",minWidth:"26px",textAlign:"center"}}>
                      <div style={{height:"28px",background:int===0?"#111128":`rgba(132,94,247,${0.15+int*0.85})`,borderRadius:"3px",border:"1px solid #1a1a2e"}} title={`${key}: ${hours}h`}/>
                      <div style={{fontSize:"8px",color:"#333",marginTop:"1px"}}>{d.getDate()}</div>
                      <div style={{fontSize:"8px",color:hours>0?"#845EF7":"#222"}}>{hours>0?hours+"h":"—"}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ════ ADD TEST MODAL ════ */}
      {addTestOpen&&(
        <div className="mov" onClick={()=>setAddTestOpen(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:"15px",marginBottom:"13px"}}>Add Mock Test</div>
            <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
              <input style={{...S.inp,width:"100%"}} placeholder="Test name (e.g. Allen FT-5)" value={testForm.name} onChange={e=>setTestForm(f=>({...f,name:e.target.value}))}/>
              <input style={{...S.inp,width:"100%"}} type="date" value={testForm.date} onChange={e=>setTestForm(f=>({...f,date:e.target.value}))}/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"6px"}}>
                <input style={S.inp} placeholder="Physics %" type="number" value={testForm.physics} onChange={e=>setTestForm(f=>({...f,physics:e.target.value}))}/>
                <input style={S.inp} placeholder="Chem %" type="number" value={testForm.chemistry} onChange={e=>setTestForm(f=>({...f,chemistry:e.target.value}))}/>
                <input style={S.inp} placeholder="Maths %" type="number" value={testForm.maths} onChange={e=>setTestForm(f=>({...f,maths:e.target.value}))}/>
              </div>
              <input style={{...S.inp,width:"100%"}} placeholder="Overall %" type="number" value={testForm.total} onChange={e=>setTestForm(f=>({...f,total:e.target.value}))}/>
              <div style={{fontSize:"10px",color:"#555"}}>Marks lost due to:</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px"}}>
                <input style={S.inp} placeholder="Silly mistakes" type="number" value={testForm.silly} onChange={e=>setTestForm(f=>({...f,silly:e.target.value}))}/>
                <input style={S.inp} placeholder="Concept gaps" type="number" value={testForm.concept} onChange={e=>setTestForm(f=>({...f,concept:e.target.value}))}/>
                <input style={S.inp} placeholder="Time mgmt" type="number" value={testForm.time} onChange={e=>setTestForm(f=>({...f,time:e.target.value}))}/>
                <input style={S.inp} placeholder="Unattempted" type="number" value={testForm.unattempted} onChange={e=>setTestForm(f=>({...f,unattempted:e.target.value}))}/>
              </div>
              <textarea style={{...S.inp,resize:"vertical",width:"100%"}} placeholder="Notes..." value={testForm.notes} onChange={e=>setTestForm(f=>({...f,notes:e.target.value}))} rows={2}/>
              <div style={{display:"flex",gap:"6px",justifyContent:"flex-end",marginTop:"4px"}}>
                <button onClick={()=>setAddTestOpen(false)} style={{...S.btn,background:"#111128",color:"#666",border:"1px solid #2a2a3a",padding:"6px 12px",fontSize:"11px",cursor:"pointer"}}>Cancel</button>
                <button className="hbtn" onClick={addTest} style={{...S.btn,background:"#845EF7",color:"#fff",fontWeight:700,padding:"6px 14px",fontSize:"11px",cursor:"pointer"}}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════ TEST ANALYSIS MODAL ════ */}
      {testAnalysis&&(
        <div className="mov" onClick={()=>setTestAnalysis(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:"15px",marginBottom:"3px"}}>{testAnalysis.name}</div>
            <div style={{fontSize:"10px",color:"#444",marginBottom:"13px"}}>{testAnalysis.date}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"7px",marginBottom:"13px"}}>
              {[["⚡ Phy",testAnalysis.physics,"#FF6B35"],["🧪 Chem",testAnalysis.chemistry,"#00C9A7"],["∑ Maths",testAnalysis.maths,"#845EF7"]].map(([l,v,c])=>(
                <div key={l} style={{textAlign:"center",background:"#07070f",borderRadius:"7px",padding:"8px",border:`1px solid ${c}33`}}>
                  <div style={{fontSize:"17px",fontWeight:700,color:c,fontFamily:"'Syne',sans-serif"}}>{v||"—"}%</div>
                  <div style={{fontSize:"9px",color:"#444",marginTop:"2px"}}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{fontSize:"28px",fontFamily:"'Syne',sans-serif",fontWeight:800,textAlign:"center",color:parseFloat(testAnalysis.total)>=70?"#4CAF50":parseFloat(testAnalysis.total)>=50?"#FFB347":"#FF6B35",marginBottom:"13px"}}>{testAnalysis.total}% Overall</div>
            {(testAnalysis.silly||testAnalysis.concept||testAnalysis.time||testAnalysis.unattempted)&&(
              <div style={{marginBottom:"10px"}}>
                <div style={{fontSize:"9px",color:"#555",marginBottom:"5px",letterSpacing:"1px"}}>MARKS LOST</div>
                {[["Silly Mistakes",testAnalysis.silly,"#FFB347"],["Concept Gaps",testAnalysis.concept,"#FF6B35"],["Time Mgmt",testAnalysis.time,"#845EF7"],["Unattempted",testAnalysis.unattempted,"#00C9A7"]].filter(([,v])=>v).map(([l,v,c])=>(
                  <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid #1a1a2e",fontSize:"11px"}}>
                    <span style={{color:"#888"}}>{l}</span><span style={{color:c,fontWeight:700}}>-{v} marks</span>
                  </div>
                ))}
              </div>
            )}
            {testAnalysis.notes&&<div style={{background:"#07070f",borderRadius:"7px",padding:"8px",fontSize:"11px",color:"#888",border:"1px solid #1a1a2e"}}>📝 {testAnalysis.notes}</div>}
            <button className="hbtn" onClick={()=>setTestAnalysis(null)} style={{...S.btn,background:"#845EF7",color:"#fff",fontWeight:700,padding:"8px",fontSize:"12px",marginTop:"12px",width:"100%",cursor:"pointer"}}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
