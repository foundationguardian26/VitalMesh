import { useState, useEffect, useRef, useCallback } from "react";

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "#050810",
  surface: "#0a0f1a",
  card: "#0e1520",
  border: "#162030",
  borderBright: "#1e3048",
  accent: "#00e5ff",
  accentDim: "#0097a7",
  accentGlow: "rgba(0,229,255,0.12)",
  green: "#39ff14",
  orange: "#ff6b35",
  purple: "#9b59b6",
  yellow: "#f1c40f",
  text: "#c8d8ec",
  textBright: "#eaf4ff",
  textDim: "#5a7a99",
  muted: "#3a5570",
};

const MONO = "'Space Mono', monospace";
const SANS = "'Outfit', sans-serif";

// ─── Global Styles ────────────────────────────────────────────────────────────
function Styles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Outfit:wght@300;400;600;700;900&display=swap');
      *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
      body{background:${C.bg};color:${C.text};font-family:${SANS};overflow-x:hidden;}
      ::-webkit-scrollbar{width:4px;}
      ::-webkit-scrollbar-track{background:${C.bg};}
      ::-webkit-scrollbar-thumb{background:${C.accentDim};border-radius:2px;}
      @keyframes blink{0%,100%{opacity:1;}50%{opacity:0.3;}}
      @keyframes slideUp{from{transform:translateY(20px);opacity:0;}to{transform:translateY(0);opacity:1;}}
      @keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
      @keyframes pulse{0%,100%{transform:scale(1);}50%{transform:scale(1.05);}}
      @keyframes scan{0%{transform:translateY(-100%);}100%{transform:translateY(100vh);}}
      @keyframes rotate{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
    `}</style>
  );
}

// ─── Nav ──────────────────────────────────────────────────────────────────────
const TABS = ["Overview","Avatar Dashboard","Environmental","Hardware Setup","Manual"];

function Nav({ tab, setTab }) {
  return (
    <nav style={{
      position:"sticky",top:0,zIndex:200,
      background:"rgba(5,8,16,0.95)",backdropFilter:"blur(16px)",
      borderBottom:`1px solid ${C.border}`,
      display:"flex",alignItems:"center",
      padding:"0 24px",height:52,gap:4,
    }}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginRight:24}}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke={C.accent} strokeWidth="1" opacity=".4"/>
          <circle cx="12" cy="12" r="5" stroke={C.accent} strokeWidth="1" opacity=".7"/>
          <circle cx="12" cy="12" r="2" fill={C.accent}/>
          <line x1="12" y1="12" x2="19" y2="7" stroke={C.accent} strokeWidth="1.5"/>
        </svg>
        <span style={{fontFamily:MONO,fontWeight:700,fontSize:16,color:C.textBright}}>
          Vital<span style={{color:C.accent}}>Mesh</span>
        </span>
        <span style={{
          fontSize:9,color:C.accentDim,fontFamily:MONO,
          background:C.accentGlow,border:`1px solid ${C.accentDim}`,
          borderRadius:3,padding:"1px 5px",
        }}>v0.7.0</span>
      </div>
      {TABS.map(t=>(
        <button key={t} onClick={()=>setTab(t)} style={{
          background:tab===t?C.accentGlow:"transparent",
          border:tab===t?`1px solid ${C.accentDim}`:"1px solid transparent",
          color:tab===t?C.accent:C.textDim,
          borderRadius:5,padding:"5px 12px",fontSize:12,
          fontFamily:SANS,cursor:"pointer",transition:"all .2s",whiteSpace:"nowrap",
        }}>{t}</button>
      ))}
      <a href="https://github.com/ruvnet/VitalMesh" target="_blank" rel="noopener"
        style={{
          marginLeft:"auto",color:C.textDim,fontSize:12,
          textDecoration:"none",padding:"5px 10px",
          border:`1px solid ${C.border}`,borderRadius:5,
          display:"flex",alignItems:"center",gap:4,
        }}>GitHub</a>
    </nav>
  );
}

// ─── AVATAR POSE ENGINE ───────────────────────────────────────────────────────
// 17 COCO keypoints: nose, eyes(2), ears(2), shoulders(2), elbows(2),
// wrists(2), hips(2), knees(2), ankles(2)
const KP = {
  NOSE:0, L_EYE:1, R_EYE:2, L_EAR:3, R_EAR:4,
  L_SHOULDER:5, R_SHOULDER:6, L_ELBOW:7, R_ELBOW:8,
  L_WRIST:9, R_WRIST:10, L_HIP:11, R_HIP:12,
  L_KNEE:13, R_KNEE:14, L_ANKLE:15, R_ANKLE:16,
};
const BONES = [
  [KP.NOSE,KP.L_EYE],[KP.NOSE,KP.R_EYE],
  [KP.L_EYE,KP.L_EAR],[KP.R_EYE,KP.R_EAR],
  [KP.L_SHOULDER,KP.R_SHOULDER],
  [KP.L_SHOULDER,KP.L_ELBOW],[KP.L_ELBOW,KP.L_WRIST],
  [KP.R_SHOULDER,KP.R_ELBOW],[KP.R_ELBOW,KP.R_WRIST],
  [KP.L_SHOULDER,KP.L_HIP],[KP.R_SHOULDER,KP.R_HIP],
  [KP.L_HIP,KP.R_HIP],
  [KP.L_HIP,KP.L_KNEE],[KP.L_KNEE,KP.L_ANKLE],
  [KP.R_HIP,KP.R_KNEE],[KP.R_KNEE,KP.R_ANKLE],
  [KP.L_SHOULDER,KP.NOSE],[KP.R_SHOULDER,KP.NOSE],
];
const BONE_COLORS = [
  C.accent,C.accent,C.accent,C.accent,
  "#ffffff",
  C.green,C.green,C.orange,C.orange,
  "#ffffff","#ffffff","#ffffff",
  C.green,C.green,C.orange,C.orange,
  C.accent,C.accent,
];

// Base skeleton (normalized 0-1 coords for a standing person, centered)
function basePose() {
  return [
    [0.50, 0.08],  // nose
    [0.48, 0.07],  // l_eye
    [0.52, 0.07],  // r_eye
    [0.46, 0.08],  // l_ear
    [0.54, 0.08],  // r_ear
    [0.40, 0.22],  // l_shoulder
    [0.60, 0.22],  // r_shoulder
    [0.32, 0.38],  // l_elbow
    [0.68, 0.38],  // r_elbow
    [0.28, 0.52],  // l_wrist
    [0.72, 0.52],  // r_wrist
    [0.43, 0.52],  // l_hip
    [0.57, 0.52],  // r_hip
    [0.41, 0.72],  // l_knee
    [0.59, 0.72],  // r_knee
    [0.40, 0.92],  // l_ankle
    [0.60, 0.92],  // r_ankle
  ];
}

// Animate pose based on activity
function animatePose(base, t, activity, breathAmp) {
  const pts = base.map(p => [...p]);
  const breath = Math.sin(t * 0.8) * breathAmp * 0.012;

  if (activity === "standing") {
    // Gentle sway + breathing
    const sway = Math.sin(t * 0.4) * 0.008;
    pts.forEach((p,i) => { if(i>=5) p[0] += sway; });
    // Chest expand
    [KP.L_SHOULDER,KP.R_SHOULDER].forEach(i => { pts[i][1] -= breath; });
  }
  else if (activity === "walking") {
    const phase = t * 1.8;
    // Arms swing
    pts[KP.L_ELBOW][0] = base[KP.L_ELBOW][0] + Math.sin(phase) * 0.06;
    pts[KP.L_WRIST][0] = base[KP.L_WRIST][0] + Math.sin(phase) * 0.09;
    pts[KP.R_ELBOW][0] = base[KP.R_ELBOW][0] - Math.sin(phase) * 0.06;
    pts[KP.R_WRIST][0] = base[KP.R_WRIST][0] - Math.sin(phase) * 0.09;
    // Legs stride
    pts[KP.L_KNEE][1] = base[KP.L_KNEE][1] + Math.sin(phase) * 0.07;
    pts[KP.L_ANKLE][1] = base[KP.L_ANKLE][1] + Math.sin(phase) * 0.06;
    pts[KP.R_KNEE][1] = base[KP.R_KNEE][1] - Math.sin(phase) * 0.07;
    pts[KP.R_ANKLE][1] = base[KP.R_ANKLE][1] - Math.sin(phase) * 0.06;
    // Torso bob
    const bob = Math.abs(Math.sin(phase * 2)) * 0.01;
    for(let i=0;i<5;i++) pts[i][1] += bob;
  }
  else if (activity === "sitting") {
    // Compress legs
    pts[KP.L_HIP][1] = 0.46; pts[KP.R_HIP][1] = 0.46;
    pts[KP.L_KNEE][1] = 0.52; pts[KP.R_KNEE][1] = 0.52;
    pts[KP.L_KNEE][0] = 0.34; pts[KP.R_KNEE][0] = 0.66;
    pts[KP.L_ANKLE][1] = 0.70; pts[KP.R_ANKLE][1] = 0.70;
    pts[KP.L_ANKLE][0] = 0.30; pts[KP.R_ANKLE][0] = 0.70;
    // Slight forward lean
    for(let i=0;i<=KP.R_EAR;i++) pts[i][1] += 0.05;
    [KP.L_SHOULDER,KP.R_SHOULDER].forEach(i=>{ pts[i][1] -= breath; });
  }
  else if (activity === "sleeping") {
    // Rotate 90deg - lay flat
    pts.forEach(p=>{ const tmp=p[0]; p[0]=p[1]*0.6+0.2; p[1]=tmp*0.5+0.35; });
    // Breathing chest rise
    pts[KP.L_SHOULDER][1] -= breath * 0.5;
    pts[KP.R_SHOULDER][1] -= breath * 0.5;
  }
  else if (activity === "fall") {
    const fallProg = Math.min(1, (t % 6) / 2);
    // Crumple to ground
    pts.forEach(p=>{ p[1] = 0.5 + (p[1]-0.5)*(1-fallProg*0.5) + fallProg*0.3; });
    pts.forEach(p=>{ p[0] = 0.5 + (p[0]-0.5)*(1+fallProg*0.4); });
  }

  // Breathing on torso always
  [KP.L_SHOULDER,KP.R_SHOULDER].forEach(i=>{ pts[i][1] -= breath*0.5; });

  return pts;
}

function AvatarCanvas({ width=340, height=420, activity="standing", breathing=14, running=true }) {
  const canvasRef = useRef(null);
  const tRef = useRef(0);
  const base = useRef(basePose());
  const trailRef = useRef([]);

  useEffect(() => {
    let raf;
    function draw() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (running) tRef.current += 0.016;
      const t = tRef.current;

      // Background
      ctx.fillStyle = C.surface;
      ctx.fillRect(0,0,width,height);

      // Grid
      ctx.strokeStyle = C.border;
      ctx.lineWidth = 0.5;
      for(let x=0;x<width;x+=30){
        ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,height);ctx.stroke();
      }
      for(let y=0;y<height;y+=30){
        ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(width,y);ctx.stroke();
      }

      // Floor line
      ctx.strokeStyle = C.borderBright;
      ctx.lineWidth = 1;
      ctx.setLineDash([4,4]);
      ctx.beginPath();ctx.moveTo(0,height-30);ctx.lineTo(width,height-30);ctx.stroke();
      ctx.setLineDash([]);

      // Compute pose
      const breathAmp = breathing / 14;
      const pts = animatePose(base.current, t, activity, breathAmp);

      // Scale to canvas
      const pad = 40;
      const scaleX = (width - pad*2);
      const scaleY = (height - pad*2 - 20);
      const scaled = pts.map(([x,y]) => [x*scaleX+pad, y*scaleY+pad]);

      // Shadow / glow on ground
      if(activity !== "sleeping") {
        const hx = scaled[KP.L_HIP][0]*0.5 + scaled[KP.R_HIP][0]*0.5;
        const grd = ctx.createRadialGradient(hx, height-32, 2, hx, height-32, 50);
        grd.addColorStop(0, "rgba(0,229,255,0.15)");
        grd.addColorStop(1, "rgba(0,229,255,0)");
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.ellipse(hx, height-32, 50, 12, 0, 0, Math.PI*2);
        ctx.fill();
      }

      // Draw bones
      BONES.forEach(([a,b], i) => {
        const [x1,y1] = scaled[a];
        const [x2,y2] = scaled[b];
        ctx.beginPath();
        ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);
        ctx.strokeStyle = BONE_COLORS[i] || C.accent;
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 6;
        ctx.shadowColor = BONE_COLORS[i] || C.accent;
        ctx.stroke();
        ctx.shadowBlur = 0;
      });

      // Draw keypoints
      scaled.forEach(([x,y], i) => {
        ctx.beginPath();
        ctx.arc(x, y, i <= KP.R_EAR ? 5 : 4, 0, Math.PI*2);
        ctx.fillStyle = i<=KP.R_EAR ? C.accent : "#ffffff";
        ctx.shadowBlur = 8;
        ctx.shadowColor = C.accent;
        ctx.fill();
        ctx.shadowBlur = 0;
        // Confidence rings
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI*2);
        ctx.strokeStyle = "rgba(0,229,255,0.15)";
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // Head circle
      const [nx,ny] = scaled[KP.NOSE];
      ctx.beginPath();
      ctx.arc(nx, ny-12, 14, 0, Math.PI*2);
      ctx.strokeStyle = "rgba(0,229,255,0.4)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Keypoint labels (minimal)
      ctx.fillStyle = C.textDim;
      ctx.font = `8px ${MONO}`;
      ctx.textAlign = "center";
      ["","","","","","LS","RS","","","LW","RW","LH","RH","LK","RK","LA","RA"]
        .forEach((lbl,i)=>{
          if(!lbl) return;
          const [x,y] = scaled[i];
          ctx.fillText(lbl, x, y-10);
        });

      // CSI signal trail (top right corner)
      trailRef.current.push(Math.sin(t*2)*30 + Math.sin(t*5.3)*15 + (Math.random()-0.5)*5);
      if(trailRef.current.length > 60) trailRef.current.shift();
      ctx.beginPath();
      ctx.strokeStyle = "rgba(0,229,255,0.3)";
      ctx.lineWidth = 1;
      trailRef.current.forEach((v,i)=>{
        const x = width - 100 + i*(100/60);
        const y = 30 + v;
        i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
      });
      ctx.stroke();
      ctx.fillStyle = C.textDim;
      ctx.font = `7px ${MONO}`;
      ctx.textAlign = "left";
      ctx.fillText("CSI", width-100, 20);

      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [activity, breathing, running, width, height]);

  return <canvas ref={canvasRef} width={width} height={height} style={{display:"block",borderRadius:8}} />;
}

// ─── AVATAR DASHBOARD ─────────────────────────────────────────────────────────
const ACTIVITIES = ["standing","walking","sitting","sleeping","fall"];
const ACTIVITY_ICONS = { standing:"🧍", walking:"🚶", sitting:"🪑", sleeping:"😴", fall:"⚠️" };

function VitalCard({ label, value, unit, color, sub }) {
  return (
    <div style={{
      background:C.card,border:`1px solid ${C.border}`,
      borderRadius:8,padding:"14px 16px",
    }}>
      <div style={{fontSize:10,color:C.textDim,fontFamily:MONO,
        textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:6}}>{label}</div>
      <div style={{fontSize:26,fontWeight:900,color,fontFamily:MONO,lineHeight:1}}>
        {value}<span style={{fontSize:12,color:C.textDim,fontWeight:400,marginLeft:3}}>{unit}</span>
      </div>
      {sub && <div style={{fontSize:11,color:C.textDim,marginTop:4}}>{sub}</div>}
    </div>
  );
}

function MiniWave({ color=C.accent, freq=1, amp=20, w=120, h=40 }) {
  const ref = useRef(null);
  const t = useRef(0);
  useEffect(()=>{
    let raf;
    function draw(){
      const c=ref.current; if(!c) return;
      const ctx=c.getContext("2d");
      ctx.clearRect(0,0,w,h);
      t.current+=0.04*freq;
      ctx.beginPath();
      ctx.strokeStyle=color;
      ctx.lineWidth=1.5;
      ctx.shadowBlur=4;ctx.shadowColor=color;
      for(let x=0;x<=w;x++){
        const y=h/2+Math.sin(t.current+(x/w)*Math.PI*4)*amp*0.4
          +Math.sin(t.current*0.5+(x/w)*Math.PI*2)*amp*0.2;
        x===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
      }
      ctx.stroke();ctx.shadowBlur=0;
      raf=requestAnimationFrame(draw);
    }
    raf=requestAnimationFrame(draw);
    return ()=>cancelAnimationFrame(raf);
  },[color,freq,amp,w,h]);
  return <canvas ref={ref} width={w} height={h} style={{display:"block"}}/>;
}

function AvatarDashboard() {
  const [activity, setActivity] = useState("standing");
  const [running, setRunning] = useState(true);
  const [persons, setPersons] = useState(1);
  const [vitals, setVitals] = useState({ br:14, hr:68, motion:22, snr:44, confidence:94 });
  const [log, setLog] = useState([
    {t:"00:00",msg:"System online — CSI streaming at 20Hz",c:C.green},
    {t:"00:01",msg:"Presence detected — Zone A",c:C.accent},
    {t:"00:02",msg:"Pose model loaded — WiFlow v1 (92.9% PCK@20)",c:C.accent},
    {t:"00:03",msg:"Breathing: 14 bpm — normal range",c:C.green},
  ]);
  const [mode, setMode] = useState("Live Sensing");

  useEffect(()=>{
    if(!running) return;
    const id=setInterval(()=>{
      setVitals(v=>({
        br: Math.max(10,Math.min(22,v.br+(Math.random()-.5)*0.8)),
        hr: Math.max(55,Math.min(90,v.hr+(Math.random()-.5)*2)),
        motion: Math.max(0,Math.min(100,v.motion+(Math.random()-.5)*8)),
        snr: Math.max(28,Math.min(55,v.snr+(Math.random()-.5)*2)),
        confidence: Math.max(80,Math.min(99,v.confidence+(Math.random()-.5)*2)),
      }));
      if(Math.random()<0.12){
        const msgs=[
          ["Keypoint confidence refresh — avg 93%",C.accent],
          ["Breathing rhythm stable",C.green],
          ["Motion vector updated",C.accent],
          ["Heart rate: normal sinus rhythm",C.green],
          ["CSI subcarrier variance: normal",C.textDim],
          ["Pose skeleton locked — 17/17 keypoints",C.green],
        ];
        const [msg,c]=msgs[Math.floor(Math.random()*msgs.length)];
        const d=new Date();
        setLog(l=>[{
          t:`${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}`,
          msg,c
        },...l.slice(0,14)]);
      }
    },700);
    return ()=>clearInterval(id);
  },[running]);

  return (
    <div style={{padding:"28px 28px",maxWidth:1200,margin:"0 auto"}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24,flexWrap:"wrap"}}>
        <h2 style={{fontSize:20,fontWeight:800,color:C.textBright}}>Avatar Sensing Dashboard</h2>
        <span style={{
          fontSize:10,color:running?C.green:C.muted,fontFamily:MONO,
          background:running?"rgba(57,255,20,0.08)":"transparent",
          border:`1px solid ${running?C.green:C.muted}`,
          borderRadius:3,padding:"2px 8px",
          animation:running?"blink 2s infinite":"none",
        }}>{running?"● LIVE SIMULATION":"○ PAUSED"}</span>
        <div style={{marginLeft:"auto",display:"flex",gap:8,flexWrap:"wrap"}}>
          {["Live Sensing","Sleep Monitor","Fall Detection","Vital Signs"].map(m=>(
            <button key={m} onClick={()=>setMode(m)} style={{
              background:mode===m?C.accentGlow:"transparent",
              border:`1px solid ${mode===m?C.accentDim:C.border}`,
              color:mode===m?C.accent:C.textDim,
              borderRadius:5,padding:"5px 12px",fontSize:11,
              fontFamily:MONO,cursor:"pointer",
            }}>{m}</button>
          ))}
          <button onClick={()=>setRunning(r=>!r)} style={{
            background:running?"rgba(255,107,53,0.1)":C.accentGlow,
            border:`1px solid ${running?C.orange:C.accentDim}`,
            color:running?C.orange:C.accent,
            borderRadius:5,padding:"5px 12px",fontSize:11,cursor:"pointer",
          }}>{running?"⏸ Pause":"▶ Resume"}</button>
        </div>
      </div>

      {/* Main grid */}
      <div style={{display:"grid",gridTemplateColumns:"340px 1fr",gap:20,marginBottom:20}}>
        {/* Avatar */}
        <div style={{
          background:C.card,border:`1px solid ${C.borderBright}`,
          borderRadius:10,padding:16,
          display:"flex",flexDirection:"column",gap:12,
        }}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:11,color:C.textDim,fontFamily:MONO,
              textTransform:"uppercase",letterSpacing:"0.1em"}}>
              17-Keypoint Skeleton
            </span>
            <span style={{
              fontSize:10,color:C.green,fontFamily:MONO,
              background:"rgba(57,255,20,0.08)",border:`1px solid ${C.green}`,
              borderRadius:3,padding:"1px 6px",
            }}>{vitals.confidence.toFixed(0)}% CONF</span>
          </div>
          <AvatarCanvas
            width={308} height={380}
            activity={activity}
            breathing={vitals.br}
            running={running}
          />
          {/* Activity buttons */}
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {ACTIVITIES.map(a=>(
              <button key={a} onClick={()=>setActivity(a)} style={{
                flex:1,minWidth:50,
                background:activity===a?C.accentGlow:"transparent",
                border:`1px solid ${activity===a?C.accentDim:C.border}`,
                color:activity===a?C.accent:C.textDim,
                borderRadius:5,padding:"6px 4px",fontSize:10,
                fontFamily:MONO,cursor:"pointer",textAlign:"center",
              }}>
                {ACTIVITY_ICONS[a]}<br/>{a}
              </button>
            ))}
          </div>
          <div style={{fontSize:10,color:C.textDim,textAlign:"center",fontFamily:MONO}}>
            Tap activity to simulate pose · Real data from WiFi CSI
          </div>
        </div>

        {/* Right panel */}
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          {/* Vitals grid */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
            <VitalCard label="Breathing Rate" value={vitals.br.toFixed(1)} unit="bpm"
              color={C.accent} sub="Normal: 12–20 bpm"/>
            <VitalCard label="Heart Rate" value={Math.round(vitals.hr)} unit="bpm"
              color={C.orange} sub="Normal: 60–100 bpm"/>
            <VitalCard label="Motion Level" value={Math.round(vitals.motion)} unit="%"
              color={vitals.motion>70?C.orange:C.green}
              sub={vitals.motion>70?"Elevated":"Normal"}/>
            <VitalCard label="Persons Detected" value={persons} unit=""
              color={C.accent} sub="Zone A active"/>
            <VitalCard label="Signal Quality" value={Math.round(vitals.snr)} unit="dB SNR"
              color={vitals.snr>35?C.green:C.orange} sub="CSI amplitude"/>
            <VitalCard label="Pose Confidence" value={vitals.confidence.toFixed(0)} unit="%"
              color={vitals.confidence>85?C.green:C.orange} sub="WiFlow v1"/>
          </div>

          {/* Waveforms */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:14}}>
              <div style={{fontSize:10,color:C.textDim,fontFamily:MONO,
                textTransform:"uppercase",letterSpacing:".1em",marginBottom:8}}>
                Breathing Waveform
              </div>
              <MiniWave color={C.accent} freq={vitals.br/14} amp={22} w={260} h={55}/>
            </div>
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:14}}>
              <div style={{fontSize:10,color:C.textDim,fontFamily:MONO,
                textTransform:"uppercase",letterSpacing:".1em",marginBottom:8}}>
                Cardiac Rhythm
              </div>
              <MiniWave color={C.orange} freq={vitals.hr/68} amp={18} w={260} h={55}/>
            </div>
          </div>

          {/* Person count */}
          <div style={{
            background:C.card,border:`1px solid ${C.border}`,
            borderRadius:8,padding:14,
            display:"flex",alignItems:"center",gap:20,
          }}>
            <div>
              <div style={{fontSize:10,color:C.textDim,fontFamily:MONO,
                textTransform:"uppercase",letterSpacing:".1em",marginBottom:8}}>
                Simulate Person Count
              </div>
              <div style={{display:"flex",gap:8}}>
                {[0,1,2,3].map(n=>(
                  <button key={n} onClick={()=>setPersons(n)} style={{
                    width:40,height:40,borderRadius:6,
                    background:persons===n?C.accentGlow:"transparent",
                    border:`1px solid ${persons===n?C.accentDim:C.border}`,
                    color:persons===n?C.accent:C.textDim,
                    fontSize:16,cursor:"pointer",
                  }}>{n}</button>
                ))}
              </div>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:10,color:C.textDim,fontFamily:MONO,marginBottom:8}}>
                SEMANTIC STATES
              </div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {[
                  ["room-active",C.green],
                  [activity==="sleeping"?"someone-sleeping":"awake",C.accent],
                  [activity==="fall"?"FALL ALERT":"stable",activity==="fall"?C.orange:C.green],
                  ["no-distress",C.green],
                ].map(([label,color])=>(
                  <span key={label} style={{
                    fontSize:10,color,fontFamily:MONO,
                    background:`${color}11`,border:`1px solid ${color}`,
                    borderRadius:3,padding:"2px 8px",
                  }}>{label}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Log */}
          <div style={{
            background:C.card,border:`1px solid ${C.border}`,
            borderRadius:8,padding:14,flex:1,
          }}>
            <div style={{fontSize:10,color:C.textDim,fontFamily:MONO,
              textTransform:"uppercase",letterSpacing:".1em",marginBottom:10}}>
              System Log
            </div>
            <div style={{maxHeight:140,overflowY:"auto"}}>
              {log.map((l,i)=>(
                <div key={i} style={{
                  display:"flex",gap:10,padding:"3px 0",
                  borderBottom:`1px solid ${C.border}`,
                  fontSize:11,fontFamily:MONO,
                }}>
                  <span style={{color:C.textDim,minWidth:40}}>{l.t}</span>
                  <span style={{color:l.c}}>{l.msg}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div style={{
        background:C.accentGlow,border:`1px solid ${C.accentDim}`,
        borderRadius:8,padding:"12px 16px",
        display:"flex",gap:12,alignItems:"flex-start",
      }}>
        <span style={{fontSize:18}}>💡</span>
        <div style={{fontSize:13,color:C.textDim,lineHeight:1.6}}>
          <strong style={{color:C.textBright}}>What you're seeing:</strong> The stick figure above
          is exactly how VitalMesh renders a real person through a wall — reconstructed from WiFi signal
          disturbances across 17 COCO keypoints (shoulders, elbows, wrists, hips, knees, ankles,
          nose, eyes, ears). On real hardware, the skeleton updates at 20 Hz from your ESP32 nodes.
          Tap any activity button to see how each pose looks. The <strong style={{color:C.accent}}>WiFlow model
          (92.9% accuracy)</strong> runs entirely on a Raspberry Pi — no cloud, no camera.
        </div>
      </div>
    </div>
  );
}

// ─── HARDWARE SETUP ───────────────────────────────────────────────────────────
function Code({ children, lang="bash" }) {
  const [ok,setOk]=useState(false);
  return (
    <div style={{background:"#020508",border:`1px solid ${C.border}`,borderRadius:7,marginBottom:12}}>
      <div style={{
        display:"flex",justifyContent:"space-between",alignItems:"center",
        padding:"5px 12px",borderBottom:`1px solid ${C.border}`,
      }}>
        <span style={{fontSize:10,color:C.textDim,fontFamily:MONO}}>{lang}</span>
        <button onClick={()=>{navigator.clipboard.writeText(children.trim()).catch(()=>{});setOk(true);setTimeout(()=>setOk(false),1500);}}
          style={{background:"transparent",border:`1px solid ${C.border}`,
            color:ok?C.green:C.textDim,fontSize:10,borderRadius:3,
            padding:"2px 8px",cursor:"pointer",fontFamily:MONO}}>
          {ok?"✓ copied":"copy"}
        </button>
      </div>
      <pre style={{
        padding:"12px 14px",overflowX:"auto",margin:0,
        fontSize:12,lineHeight:1.7,color:C.accent,fontFamily:MONO,
      }}>{children.trim()}</pre>
    </div>
  );
}

function Alert({ type="info", children }) {
  const colors={info:[C.accent,C.accentGlow],warn:[C.orange,"rgba(255,107,53,0.08)"],ok:[C.green,"rgba(57,255,20,0.08)"]};
  const [c,bg]=colors[type]||colors.info;
  return (
    <div style={{background:bg,border:`1px solid ${c}`,borderRadius:7,padding:"12px 14px",marginBottom:14}}>
      <div style={{fontSize:13,color:C.textDim,lineHeight:1.6}}>{children}</div>
    </div>
  );
}

function HardwareSetup() {
  const [step,setStep]=useState(0);

  const steps=[
    {
      icon:"🛒",title:"Buy the Hardware",
      content:<div>
        <Alert type="warn">
          <strong style={{color:C.orange}}>Critical:</strong> You need ESP32-<strong>S3</strong> specifically.
          The original ESP32, ESP32-C3, and ESP32-C6 are NOT supported — they are single-core and
          cannot handle CSI DSP processing. Only ESP32-S3 exposes the CSI API.
        </Alert>
        <h4 style={{color:C.accent,fontSize:13,fontFamily:MONO,marginBottom:10}}>MINIMUM SETUP (~$30)</h4>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
          {[
            ["ESP32-S3-DevKitC-1","3×","~$9 each","Amazon / AliExpress","8MB flash version"],
            ["USB-C Data Cables","3×","~$2 each","Any supplier","Must be data cables, not charge-only"],
            ["Your WiFi Router","1×","Already own","2.4 GHz band","Acts as RF illuminator"],
            ["Host PC / Laptop","1×","Already own","Win/Mac/Linux","Runs the Docker server"],
          ].map(([item,qty,price,where,note],i)=>(
            <div key={i} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:7,padding:12}}>
              <div style={{fontSize:14,fontWeight:700,color:C.textBright,marginBottom:4}}>{item}</div>
              <div style={{display:"flex",gap:8,marginBottom:4}}>
                <span style={{color:C.accent,fontFamily:MONO,fontSize:12}}>{qty}</span>
                <span style={{color:C.green,fontFamily:MONO,fontSize:12}}>{price}</span>
                <span style={{color:C.textDim,fontSize:12}}>{where}</span>
              </div>
              <div style={{fontSize:11,color:C.textDim,fontStyle:"italic"}}>{note}</div>
            </div>
          ))}
        </div>
        <h4 style={{color:C.accent,fontSize:13,fontFamily:MONO,marginBottom:10}}>RECOMMENDED FULL SETUP (~$85)</h4>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {[
            ["ESP32-S3-DevKitC-1","6×","~$54","For full room mesh coverage"],
            ["Raspberry Pi Zero 2 W","1×","~$15","Cognitum Seed — edge AI hub"],
            ["MicroSD Card 32GB","1×","~$8","For Pi storage"],
            ["5V USB Power Hub","1×","~$12","Power all nodes from one supply"],
          ].map(([item,qty,price,note],i)=>(
            <div key={i} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:7,padding:12}}>
              <div style={{fontSize:14,fontWeight:700,color:C.textBright,marginBottom:4}}>{item}</div>
              <div style={{display:"flex",gap:8,marginBottom:4}}>
                <span style={{color:C.accent,fontFamily:MONO,fontSize:12}}>{qty}</span>
                <span style={{color:C.green,fontFamily:MONO,fontSize:12}}>{price}</span>
              </div>
              <div style={{fontSize:11,color:C.textDim}}>{note}</div>
            </div>
          ))}
        </div>
      </div>
    },
    {
      icon:"💻",title:"Install Prerequisites",
      content:<div>
        <p style={{color:C.textDim,marginBottom:16,lineHeight:1.7}}>
          Before flashing anything, get these tools installed on your computer.
        </p>
        <h4 style={{color:C.textBright,fontSize:14,marginBottom:8}}>1. Install Docker Desktop</h4>
        <Alert type="info">Download from <strong style={{color:C.accent}}>https://www.docker.com/products/docker-desktop</strong> — available for Windows, Mac, and Linux. This runs the VitalMesh sensing server.</Alert>
        <h4 style={{color:C.textBright,fontSize:14,marginBottom:8,marginTop:16}}>2. Install Python & esptool</h4>
        <Code lang="bash">{`# Install Python first from https://python.org if not already installed
# Then install esptool for flashing ESP32 firmware:
pip install esptool

# Verify it works:
python -m esptool version
# Expected: esptool.py v5.x`}</Code>
        <h4 style={{color:C.textBright,fontSize:14,marginBottom:8,marginTop:16}}>3. Install USB Driver (Windows only)</h4>
        <Alert type="warn">
          Windows users: Install the <strong style={{color:C.orange}}>CP210x USB driver</strong> from Silicon Labs.
          Search "CP210x Windows driver Silicon Labs" — this is what lets your PC see the ESP32 as a COM port.
          Mac and Linux include this driver already.
        </Alert>
        <h4 style={{color:C.textBright,fontSize:14,marginBottom:8,marginTop:16}}>4. Download VitalMesh firmware</h4>
        <Code lang="bash">{`# Go to the releases page:
# https://github.com/ruvnet/VitalMesh/releases/tag/v0.6.6-esp32

# Download these 6 files:
# bootloader.bin
# partition-table.bin
# ota_data_initial.bin
# esp32-csi-node.bin
# nvs.bin
# firmware.bin

# Or clone the full repo:
git clone https://github.com/ruvnet/VitalMesh
cd VitalMesh`}</Code>
      </div>
    },
    {
      icon:"⚡",title:"Flash ESP32-S3 Nodes",
      content:<div>
        <p style={{color:C.textDim,marginBottom:16,lineHeight:1.7}}>
          Do this for each ESP32-S3 board. Repeat for all 3–6 nodes.
        </p>
        <h4 style={{color:C.textBright,fontSize:14,marginBottom:8}}>Step 1: Connect the board</h4>
        <Alert type="info">
          Plug the ESP32-S3 into your computer via USB-C. On Windows it will appear as COM7, COM9, etc.
          On Mac it appears as /dev/cu.usbserial-*. On Linux it's /dev/ttyUSB0.
        </Alert>
        <h4 style={{color:C.textBright,fontSize:14,marginBottom:8,marginTop:14}}>Step 2: Flash the firmware</h4>
        <Code lang="bash">{`# WINDOWS (replace COM7 with your actual COM port):
python -m esptool --chip esp32s3 --port COM7 --baud 460800 \\
  --before default-reset --after hard-reset \\
  write_flash --flash_mode dio --flash_size 8MB \\
  0x0      bootloader.bin \\
  0x8000   partition-table.bin \\
  0xf000   ota_data_initial.bin \\
  0x20000  esp32-csi-node.bin

# MAC / LINUX (replace port path):
python -m esptool --chip esp32s3 --port /dev/cu.usbserial-0001 --baud 460800 \\
  --before default-reset --after hard-reset \\
  write_flash --flash_mode dio --flash_size 8MB \\
  0x0      bootloader.bin \\
  0x8000   partition-table.bin \\
  0xf000   ota_data_initial.bin \\
  0x20000  esp32-csi-node.bin`}</Code>
        <h4 style={{color:C.textBright,fontSize:14,marginBottom:8,marginTop:14}}>Step 3: Provision WiFi credentials</h4>
        <Code lang="bash">{`python scripts/provision.py \\
  --port COM7 \\
  --ssid "YourWiFiName" \\
  --password "YourWiFiPassword" \\
  --target-ip 192.168.1.100   # Your host PC's local IP`}</Code>
        <h4 style={{color:C.textBright,fontSize:14,marginBottom:8,marginTop:14}}>Step 4: Verify boot</h4>
        <Code lang="bash">{`python -m esptool --port COM7 monitor

# ✅ Good output looks like:
# I (1234) vitalmesh: CSI capture initialized — 52 subcarriers at 20Hz
# I (1235) vitalmesh: WiFi connected — SSID: YourWiFiName
# I (1236) vitalmesh: UDP streaming to 192.168.1.100:5006
# W (3126) ota_update: NVS namespace 'security' not found — OTA LOCKED

# ❌ If you see "Target chip not ESP32-S3" — wrong board type
# ❌ If you see "Failed to connect" — hold BOOT button while running command`}</Code>
        <Alert type="ok">
          <strong style={{color:C.green}}>The OTA warning is correct and expected.</strong> It means
          the over-the-air update endpoint is locked until you set a password — this is the secure
          default. Your node is working properly.
        </Alert>
      </div>
    },
    {
      icon:"📐",title:"Node Placement",
      content:<div>
        <p style={{color:C.textDim,marginBottom:16,lineHeight:1.7}}>
          Where you put the nodes determines what you can sense and how accurately.
          CSI sensing works through walls — but geometry matters.
        </p>
        <Alert type="info">
          <strong style={{color:C.textBright}}>Key principle:</strong> You need multiple signal paths
          around the person. Place nodes so they triangulate the space from different angles.
          Your WiFi router also acts as a free additional illuminator.
        </Alert>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginTop:16}}>
          {[
            {
              title:"Bedroom / Sleep Monitor",nodes:2,
              tips:["Diagonal corners of the room","Mount at 1–1.5m height (mattress level)","Keep 1m away from metal headboards","Cover the entire bed area"],
              use:"Best for: breathing, heart rate, bed exit, sleep movement"
            },
            {
              title:"Living Room / Fall Detection",nodes:3,
              tips:["Triangle formation across the room","Cover all floor zones","Height 1.2–1.8m","Avoid placing behind large furniture"],
              use:"Best for: fall detection, presence, walking, sitting"
            },
            {
              title:"Hallway / Entry Detection",nodes:2,
              tips:["One node at each end of hallway","Height 1.2m","Works through single drywall","Detects direction of movement"],
              use:"Best for: entry detection, person count, transit"
            },
            {
              title:"Full Home (4–6 nodes)",nodes:"4–6",
              tips:["One per room minimum","Overlapping coverage zones","Neighbor routers add free illumination","Channel hop: 1, 6, 11"],
              use:"Best for: full home presence, multi-room tracking"
            },
          ].map(({title,nodes,tips,use},i)=>(
            <div key={i} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:14}}>
              <div style={{fontSize:15,fontWeight:700,color:C.textBright,marginBottom:4}}>{title}</div>
              <div style={{fontSize:11,color:C.accent,fontFamily:MONO,marginBottom:10}}>{nodes} nodes</div>
              <ul style={{listStyle:"none",padding:0,marginBottom:10}}>
                {tips.map((t,j)=>(
                  <li key={j} style={{fontSize:12,color:C.textDim,padding:"2px 0",
                    display:"flex",gap:6}}>
                    <span style={{color:C.accentDim}}>→</span>{t}
                  </li>
                ))}
              </ul>
              <div style={{fontSize:11,color:C.green,fontStyle:"italic"}}>{use}</div>
            </div>
          ))}
        </div>
      </div>
    },
    {
      icon:"🖥️",title:"Run the Server",
      content:<div>
        <p style={{color:C.textDim,marginBottom:16,lineHeight:1.7}}>
          The VitalMesh server runs on your computer or Raspberry Pi and collects CSI data from all nodes.
        </p>
        <h4 style={{color:C.textBright,fontSize:14,marginBottom:8}}>Option A: Docker — Simulated (no hardware needed)</h4>
        <Code lang="bash">{`docker pull ruvnet/vitalmesh:latest
docker run -p 3000:3000 ruvnet/vitalmesh:latest
# Open http://localhost:3000`}</Code>
        <h4 style={{color:C.textBright,fontSize:14,marginBottom:8,marginTop:16}}>Option B: Docker — Real ESP32 Nodes</h4>
        <Code lang="bash">{`docker run --net=host ruvnet/vitalmesh:0.7.0 \\
  --source esp32 \\
  --mqtt --mqtt-host localhost
# Open http://localhost:3000`}</Code>
        <h4 style={{color:C.textBright,fontSize:14,marginBottom:8,marginTop:16}}>Option C: Home Assistant Integration</h4>
        <Code lang="yaml">{`# docker-compose.yml
version: "3.8"
services:
  vitalmesh:
    image: ruvnet/vitalmesh:0.7.0
    network_mode: host
    restart: unless-stopped
    command: >
      --source esp32
      --mqtt
      --mqtt-host YOUR_HOME_ASSISTANT_IP
      --privacy-mode

# In Home Assistant:
# 1. Install Mosquitto broker add-on (Add-on Store)
# 2. Settings → Devices & Services → Add Integration → MQTT
# 3. VitalMesh auto-creates 21 entities per node:
#    sensor.vitalmesh_node01_presence
#    sensor.vitalmesh_node01_breathing_rate
#    sensor.vitalmesh_node01_heart_rate
#    sensor.vitalmesh_node01_fall_detected
#    ... and 17 more`}</Code>
      </div>
    },
  ];

  return (
    <div style={{display:"flex",maxWidth:1100,margin:"0 auto",padding:"28px",gap:20}}>
      <div style={{width:200,flexShrink:0}}>
        <div style={{fontSize:10,color:C.textDim,fontFamily:MONO,marginBottom:12,
          textTransform:"uppercase",letterSpacing:".1em"}}>Hardware Guide</div>
        {steps.map((s,i)=>(
          <button key={i} onClick={()=>setStep(i)} style={{
            display:"flex",alignItems:"center",gap:8,
            width:"100%",textAlign:"left",
            background:step===i?C.accentGlow:"transparent",
            border:step===i?`1px solid ${C.accentDim}`:"1px solid transparent",
            borderRadius:7,padding:"9px 10px",marginBottom:5,cursor:"pointer",
          }}>
            <span style={{fontSize:16}}>{s.icon}</span>
            <div>
              <div style={{fontSize:10,color:step===i?C.accent:C.textDim,fontFamily:MONO}}>STEP {i+1}</div>
              <div style={{fontSize:12,color:step===i?C.textBright:C.muted,fontWeight:600}}>{s.title}</div>
            </div>
          </button>
        ))}
      </div>
      <div style={{flex:1}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
          <span style={{fontSize:28}}>{steps[step].icon}</span>
          <div>
            <div style={{fontSize:10,color:C.textDim,fontFamily:MONO}}>STEP {step+1} OF {steps.length}</div>
            <h2 style={{fontSize:20,fontWeight:800,color:C.textBright}}>{steps[step].title}</h2>
          </div>
        </div>
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"24px"}}>
          {steps[step].content}
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:14}}>
          <button onClick={()=>setStep(s=>Math.max(0,s-1))} disabled={step===0} style={{
            background:"transparent",border:`1px solid ${step===0?C.border:C.accentDim}`,
            color:step===0?C.border:C.accent,borderRadius:7,
            padding:"9px 18px",cursor:step===0?"default":"pointer",fontSize:13,
          }}>← Previous</button>
          <button onClick={()=>setStep(s=>Math.min(steps.length-1,s+1))}
            disabled={step===steps.length-1} style={{
              background:step===steps.length-1?"transparent":C.accent,
              border:`1px solid ${C.accentDim}`,
              color:step===steps.length-1?C.accentDim:C.bg,
              borderRadius:7,padding:"9px 18px",
              cursor:step===steps.length-1?"default":"pointer",
              fontSize:13,fontWeight:700,
            }}>Next Step →</button>
        </div>
      </div>
    </div>
  );
}

// ─── POSE TRAINING ────────────────────────────────────────────────────────────
function PoseTraining() {
  const [phase,setPhase]=useState(0);
  const PHASES=[
    {icon:"📡",title:"Collect CSI Data",time:"5 min",
      desc:"Walk normally around your room for 5 minutes while the ESP32 nodes record CSI. The system builds a fingerprint of how your body distorts signals in your specific space.",
      cmd:`# Start CSI recording on host machine
python scripts/record-csi-udp.py --duration 300 --output data/recordings/

# On a second terminal, watch signal quality:
node scripts/rf-scan.js --port 5006 --duration 30

# Walk slowly through all areas of the room
# Sit, stand, raise arms — cover all poses you want detected
# Duration: 300 seconds = 5 minutes`
    },
    {icon:"🏷️",title:"Generate Weak Labels",time:"Auto",
      desc:"VitalMesh doesn't need a camera. It uses 10 sensor signals to auto-generate approximate body position labels: RSSI triangulation for head, subcarrier asymmetry for hands, vibration for feet.",
      cmd:`# Auto-generate pose labels from CSI data
# Uses: RSSI triangulation, subcarrier asymmetry, vibration patterns
node scripts/align-ground-truth.js \\
  --csi data/recordings/*.csi.jsonl \\
  --output data/paired/

# This generates 5 initial keypoints automatically:
# head (from RSSI), hands (from subcarrier asymmetry),
# feet (from vibration), then interpolates to full 17`
    },
    {icon:"🧠",title:"Train WiFlow Model",time:"19 min",
      desc:"The WiFlow architecture (1.8M parameters, TCN + axial attention) trains on your paired data. It learns the mapping between CSI patterns and body keypoints specific to your room.",
      cmd:`# Train the pose model (runs on CPU, ~19 minutes)
node scripts/train-wiflow-supervised.js \\
  --data data/paired/*.jsonl \\
  --scale lite \\
  --epochs 50 \\
  --output models/my-room-pose.safetensors

# Or download pretrained model from Hugging Face:
pip install huggingface_hub
huggingface-cli download ruv/vitalmesh --local-dir models/

# Monitor training progress:
# Epoch 1/50 — loss: 0.42
# Epoch 10/50 — loss: 0.18
# Epoch 50/50 — loss: 0.08  ← target PCK@20 > 85%`
    },
    {icon:"✅",title:"Validate & Deploy",time:"2 min",
      desc:"Run the validation harness to confirm your model reaches the accuracy threshold, then hot-reload it into the live server — no restart needed.",
      cmd:`# Run deterministic validation harness
python scripts/validate-pose.py \\
  --model models/my-room-pose.safetensors \\
  --data data/paired/

# Expected output:
# PCK@20: 89.4%   ← Good! (>85% threshold)
# Eval loss: 0.078
# Keypoint accuracy: nose 94%, shoulders 91%, hips 88%

# Deploy to live server (hot-reload):
curl -X POST http://localhost:3000/api/model/reload \\
  -H "Content-Type: application/json" \\
  -d '{"path": "models/my-room-pose.safetensors"}'

# Dashboard will show live skeleton within seconds`
    },
  ];

  return (
    <div style={{maxWidth:900,margin:"0 auto",padding:"28px"}}>
      <h2 style={{fontSize:20,fontWeight:800,color:C.textBright,marginBottom:6}}>
        Pose Model Training
      </h2>
      <p style={{color:C.textDim,marginBottom:24,lineHeight:1.7}}>
        Pose estimation — the 17-keypoint skeleton — requires training for your specific room.
        Walls, furniture, and room geometry affect how WiFi signals bounce. Total time: about 25 minutes.
        No camera required.
      </p>

      {/* Pipeline visual */}
      <div style={{
        display:"flex",alignItems:"center",gap:0,marginBottom:28,
        overflowX:"auto",padding:"4px 0",
      }}>
        {PHASES.map((p,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",flex:1,minWidth:140}}>
            <button onClick={()=>setPhase(i)} style={{
              flex:1,background:phase===i?C.accentGlow:C.card,
              border:`1px solid ${phase===i?C.accentDim:C.border}`,
              borderRadius:8,padding:"12px 8px",cursor:"pointer",
              textAlign:"center",
            }}>
              <div style={{fontSize:20,marginBottom:4}}>{p.icon}</div>
              <div style={{fontSize:10,color:phase===i?C.accent:C.textDim,
                fontFamily:MONO,marginBottom:2}}>PHASE {i+1}</div>
              <div style={{fontSize:12,color:phase===i?C.textBright:C.muted,
                fontWeight:600,lineHeight:1.3}}>{p.title}</div>
              <div style={{fontSize:10,color:C.green,fontFamily:MONO,marginTop:4}}>{p.time}</div>
            </button>
            {i<PHASES.length-1 && (
              <div style={{color:C.accentDim,fontSize:18,padding:"0 4px",flexShrink:0}}>→</div>
            )}
          </div>
        ))}
      </div>

      {/* Active phase detail */}
      <div style={{background:C.card,border:`1px solid ${C.borderBright}`,borderRadius:10,padding:24}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
          <span style={{fontSize:28}}>{PHASES[phase].icon}</span>
          <div>
            <div style={{fontSize:10,color:C.accent,fontFamily:MONO}}>PHASE {phase+1} · {PHASES[phase].time}</div>
            <h3 style={{fontSize:18,fontWeight:800,color:C.textBright}}>{PHASES[phase].title}</h3>
          </div>
        </div>
        <p style={{color:C.textDim,lineHeight:1.7,marginBottom:16}}>{PHASES[phase].desc}</p>
        <Code lang="bash">{PHASES[phase].cmd}</Code>
      </div>

      {/* Accuracy info */}
      <div style={{
        marginTop:20,background:C.accentGlow,border:`1px solid ${C.accentDim}`,
        borderRadius:8,padding:"14px 16px",
      }}>
        <div style={{fontSize:13,color:C.textBright,fontWeight:700,marginBottom:8}}>
          📊 WiFlow Model Accuracy (v0.7.0)
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
          {[
            ["PCK@20","92.9%","Pose accuracy"],
            ["Eval Loss","0.082","Lower = better"],
            ["Model Size","881 KB","4-bit quantized"],
            ["Inference","0.008ms","On Raspberry Pi"],
          ].map(([label,val,sub])=>(
            <div key={label} style={{textAlign:"center"}}>
              <div style={{fontSize:20,fontWeight:900,color:C.accent,fontFamily:MONO}}>{val}</div>
              <div style={{fontSize:11,color:C.textBright,fontWeight:600}}>{label}</div>
              <div style={{fontSize:10,color:C.textDim}}>{sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── FULL MANUAL ──────────────────────────────────────────────────────────────
function Manual() {
  const [section,setSection]=useState(0);

  const sections=[
    {
      icon:"📖",title:"What is VitalMesh?",
      content:<div style={{lineHeight:1.8,color:C.textDim}}>
        <h3 style={{color:C.textBright,fontSize:16,marginBottom:12}}>Overview</h3>
        <p style={{marginBottom:12}}>
          VitalMesh is an open-source edge AI system that turns ordinary WiFi signals into a contactless
          human sensing platform. It detects presence, movement, breathing rate, heart rate, and
          full-body pose — <strong style={{color:C.textBright}}>without cameras, wearables, or cloud connectivity.</strong>
        </p>
        <p style={{marginBottom:16}}>
          Every WiFi router in your home constantly floods the space with radio waves at 2.4 GHz.
          When a person is present, their body absorbs and reflects these waves. Every breath,
          heartbeat, and movement creates a measurable disturbance. VitalMesh captures this disturbance
          using <strong style={{color:C.accent}}>Channel State Information (CSI)</strong> — data that
          describes exactly how the signal changed across 52–192 frequency subcarriers.
        </p>
        <h3 style={{color:C.textBright,fontSize:16,marginBottom:12}}>What It Can Detect</h3>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
          {[
            ["✅ Presence","Is anyone in the room? Works through walls."],
            ["✅ Breathing Rate","12–20 bpm normal. Works during sleep."],
            ["✅ Heart Rate","Contactless cardiac rhythm estimate."],
            ["✅ Motion Level","How much movement is happening."],
            ["✅ Fall Detection","Rapid motion signature triggers alert."],
            ["✅ Person Count","How many people are present (min-cut algorithm)."],
            ["⚙️ Pose Skeleton","17 keypoints — requires model training for your room."],
            ["⚙️ Sleep Stages","Movement patterns overnight — requires training."],
          ].map(([title,desc])=>(
            <div key={title} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:6,padding:10}}>
              <div style={{fontSize:13,color:C.textBright,fontWeight:600,marginBottom:3}}>{title}</div>
              <div style={{fontSize:12,color:C.textDim}}>{desc}</div>
            </div>
          ))}
        </div>
        <h3 style={{color:C.textBright,fontSize:16,marginBottom:12}}>What It Cannot Do</h3>
        <Alert type="warn">
          VitalMesh does <strong style={{color:C.orange}}>NOT</strong> produce a camera-like visual image.
          You will not see a photo or video through the wall. What you see is a stick-figure skeleton
          (17 joints) reconstructed from signal math — not pixels. Think radar, not camera.
        </Alert>
        <h3 style={{color:C.textBright,fontSize:16,marginBottom:12,marginTop:4}}>How It Works (Simple)</h3>
        <p style={{marginBottom:8}}>Think of it like sonar on a submarine. The submarine sends out a sound pulse and listens for what bounces back. VitalMesh does the same thing with WiFi radio waves:</p>
        <ol style={{paddingLeft:20,display:"flex",flexDirection:"column",gap:6}}>
          {[
            "Your WiFi router broadcasts radio waves continuously",
            "ESP32-S3 nodes listen to those waves on 52–192 frequency channels simultaneously",
            "When you move, breathe, or walk — your body changes how the waves bounce",
            "VitalMesh measures those changes 20 times per second",
            "AI models translate the changes into body position, breathing rate, and heart rate",
            "The result appears as a live skeleton on your screen",
          ].map((s,i)=>(
            <li key={i} style={{fontSize:13,color:C.textDim}}>
              <span style={{color:C.accent,fontFamily:MONO,marginRight:6}}>{i+1}.</span>{s}
            </li>
          ))}
        </ol>
      </div>
    },
    {
      icon:"⚙️",title:"System Requirements",
      content:<div style={{lineHeight:1.8,color:C.textDim}}>
        <h3 style={{color:C.textBright,fontSize:16,marginBottom:12}}>Hardware Requirements</h3>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",marginBottom:20,fontSize:13}}>
            <thead>
              <tr style={{borderBottom:`1px solid ${C.border}`}}>
                {["Component","Minimum","Recommended","Notes"].map(h=>(
                  <th key={h} style={{textAlign:"left",padding:"8px 12px",color:C.textBright,fontFamily:MONO,fontSize:11}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["ESP32 Sensor","ESP32-S3 (1 node)","ESP32-S3 × 3–6","S3 ONLY — no S2, C3, original"],
                ["WiFi Router","2.4 GHz any","802.11n or newer","Already in your home"],
                ["Host Computer","Any modern PC","Raspberry Pi 4+","Runs Docker server"],
                ["RAM (host)","4 GB","8 GB","For model inference"],
                ["Storage","2 GB free","10 GB","Docker images + data"],
                ["Network","Local LAN","Gigabit LAN","No internet required"],
              ].map((row,i)=>(
                <tr key={i} style={{borderBottom:`1px solid ${C.border}`,background:i%2===0?C.surface:"transparent"}}>
                  {row.map((cell,j)=>(
                    <td key={j} style={{padding:"8px 12px",color:j===0?C.textBright:C.textDim,
                      fontFamily:j===0?MONO:SANS}}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h3 style={{color:C.textBright,fontSize:16,marginBottom:12}}>Software Requirements</h3>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
          {[
            ["Docker Desktop","28.x or later","Required for server"],
            ["Python","3.9+","For esptool & scripts"],
            ["esptool","5.x+","pip install esptool"],
            ["Node.js (optional)","18+","For JS training scripts"],
            ["Rust (optional)","1.89+","For best performance"],
            ["Git","Any","Clone the repo"],
          ].map(([name,ver,note])=>(
            <div key={name} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:6,padding:10,display:"flex",gap:10,alignItems:"center"}}>
              <div style={{flex:1}}>
                <div style={{fontSize:13,color:C.textBright,fontWeight:600}}>{name}</div>
                <div style={{fontSize:11,color:C.textDim}}>{note}</div>
              </div>
              <span style={{fontSize:11,color:C.accent,fontFamily:MONO,
                background:C.accentGlow,border:`1px solid ${C.accentDim}`,
                borderRadius:3,padding:"1px 6px"}}>{ver}</span>
            </div>
          ))}
        </div>
        <h3 style={{color:C.textBright,fontSize:16,marginBottom:12}}>OS Support</h3>
        <div style={{display:"flex",gap:10}}>
          {[["Windows","10 / 11 ✅"],["macOS","10.15+ ✅"],["Ubuntu","18.04+ ✅"],["Raspberry Pi OS","✅"]].map(([os,ver])=>(
            <div key={os} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:6,padding:"8px 12px",textAlign:"center"}}>
              <div style={{fontSize:13,color:C.textBright,fontWeight:600}}>{os}</div>
              <div style={{fontSize:11,color:C.green,fontFamily:MONO}}>{ver}</div>
            </div>
          ))}
        </div>
      </div>
    },
    {
      icon:"🚀",title:"Quick Start (30 seconds)",
      content:<div>
        <p style={{color:C.textDim,lineHeight:1.7,marginBottom:16}}>
          Try the full dashboard with simulated data instantly. No hardware needed.
        </p>
        {[
          ["Install Docker","https://docker.com/products/docker-desktop","Download and install Docker Desktop for your OS"],
          ["Pull the image","","docker pull ruvnet/vitalmesh:latest"],
          ["Run the server","","docker run -p 3000:3000 ruvnet/vitalmesh:latest"],
          ["Open dashboard","http://localhost:3000","Your browser"],
        ].map(([step,link,desc],i)=>(
          <div key={i} style={{display:"flex",gap:14,marginBottom:12,alignItems:"flex-start"}}>
            <span style={{
              width:28,height:28,borderRadius:"50%",flexShrink:0,
              background:C.accentGlow,border:`1px solid ${C.accentDim}`,
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:12,color:C.accent,fontFamily:MONO,
            }}>{i+1}</span>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:700,color:C.textBright,marginBottom:4}}>{step}</div>
              {link && <div style={{fontSize:12,color:C.accentDim,marginBottom:4}}>{link}</div>}
              <Code lang="bash">{desc}</Code>
            </div>
          </div>
        ))}
        <Alert type="ok">
          <strong style={{color:C.green}}>You're now running VitalMesh.</strong> The simulated dashboard
          shows all sensing modes — presence, vitals, pose skeleton, fall detection, sleep monitoring —
          with realistic simulated data. Switch to real ESP32 hardware by following the Hardware Setup tab.
        </Alert>
      </div>
    },
    {
      icon:"🔒",title:"Privacy & Security",
      content:<div style={{lineHeight:1.8,color:C.textDim}}>
        <h3 style={{color:C.textBright,fontSize:16,marginBottom:12}}>Privacy Architecture</h3>
        <p style={{marginBottom:16}}>
          VitalMesh was designed privacy-first from the ground up. Every design decision keeps your data local.
        </p>
        <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:20}}>
          {[
            {title:"No Camera",icon:"📷",desc:"No video, no images, no pixels ever captured or stored. The system only processes radio wave disturbances."},
            {title:"No Cloud",icon:"☁️",desc:"All computation happens on your local network. No data ever leaves your home. Works fully offline."},
            {title:"No Wearable",icon:"⌚",desc:"No device on the person's body. Completely passive sensing from existing WiFi signals."},
            {title:"Privacy Mode",icon:"🔇",desc:"--privacy-mode flag strips HR, breathing rate, and pose keypoints from MQTT output. Only semantic states published."},
            {title:"Ed25519 Attestation",icon:"🔑",desc:"Every measurement is cryptographically signed. Each edge module binary is verified before installation."},
            {title:"OTA Lockdown",icon:"🔒",desc:"Firmware update endpoint locked by default until you provision a password. Fail-closed security."},
          ].map(({title,icon,desc})=>(
            <div key={title} style={{display:"flex",gap:12,background:C.surface,
              border:`1px solid ${C.border}`,borderRadius:7,padding:12}}>
              <span style={{fontSize:22,flexShrink:0}}>{icon}</span>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:C.textBright,marginBottom:3}}>{title}</div>
                <div style={{fontSize:13,color:C.textDim}}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
        <h3 style={{color:C.textBright,fontSize:16,marginBottom:12}}>Enable Privacy Mode</h3>
        <Code lang="bash">{`# Strips biometrics from MQTT — only semantic states published
docker run --net=host ruvnet/vitalmesh:0.7.0 \\
  --source esp32 \\
  --mqtt --mqtt-host localhost \\
  --privacy-mode    # ← Add this flag

# With privacy mode ON, MQTT publishes:
# ✅ room-active, someone-sleeping, fall-detected
# ✅ presence (yes/no), person-count
# ❌ heart rate (suppressed)
# ❌ breathing rate (suppressed)
# ❌ pose keypoints (suppressed)`}</Code>
      </div>
    },
    {
      icon:"🆘",title:"Troubleshooting",
      content:<div>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {[
            {
              problem:"ESP32 won't connect — 'Failed to connect to ESP32-S3'",
              cause:"The board isn't in download mode",
              fix:`# Hold the BOOT button on the board, then run the flash command
# Release BOOT once you see "Connecting..." in the terminal
# If still failing, try lower baud rate:
python -m esptool --chip esp32s3 --port COM7 --baud 115200 write_flash ...`
            },
            {
              problem:"'Target chip not ESP32-S3' error",
              cause:"Wrong board — you have an original ESP32, not S3",
              fix:`# Check your board: look for "ESP32-S3" printed on the chip
# Original ESP32, ESP32-C3, ESP32-S2 are NOT supported
# Buy: "ESP32-S3-DevKitC-1" — search that exact name`
            },
            {
              problem:"No CSI data streaming — nodes show online but no signal",
              cause:"WiFi 5GHz band or non-standard router",
              fix:`# VitalMesh requires 2.4 GHz band (802.11n/b/g)
# In your router settings, ensure 2.4 GHz is enabled
# Provision nodes to 2.4 GHz SSID specifically:
python scripts/provision.py --port COM7 --ssid "YourNetwork_2G" ...`
            },
            {
              problem:"Dashboard loads but shows no data",
              cause:"Host IP mismatch or firewall blocking UDP 5006",
              fix:`# Find your actual local IP:
# Windows: ipconfig | look for IPv4 Address
# Mac/Linux: ip addr or ifconfig
# Re-provision with correct IP:
python scripts/provision.py --port COM7 --target-ip YOUR_ACTUAL_IP
# Open UDP port 5006 in Windows Firewall if needed`
            },
            {
              problem:"Pose skeleton not showing (vitals work fine)",
              cause:"Pose model not trained for your environment",
              fix:`# This is expected! Pose requires training.
# Follow the Pose Training tab to train for your room
# Or download pretrained model:
huggingface-cli download ruv/vitalmesh --local-dir models/`
            },
          ].map(({problem,cause,fix},i)=>(
            <div key={i} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:14}}>
              <div style={{fontSize:13,fontWeight:700,color:C.orange,marginBottom:4}}>⚠ {problem}</div>
              <div style={{fontSize:12,color:C.textDim,marginBottom:8}}><strong style={{color:C.textBright}}>Cause:</strong> {cause}</div>
              <Code lang="bash">{fix}</Code>
            </div>
          ))}
        </div>
      </div>
    },
  ];

  return (
    <div style={{display:"flex",maxWidth:1100,margin:"0 auto",padding:"28px",gap:20}}>
      <div style={{width:200,flexShrink:0}}>
        <div style={{fontSize:10,color:C.textDim,fontFamily:MONO,marginBottom:12,
          textTransform:"uppercase",letterSpacing:".1em"}}>Full Manual</div>
        {sections.map((s,i)=>(
          <button key={i} onClick={()=>setSection(i)} style={{
            display:"flex",alignItems:"center",gap:8,
            width:"100%",textAlign:"left",
            background:section===i?C.accentGlow:"transparent",
            border:section===i?`1px solid ${C.accentDim}`:"1px solid transparent",
            borderRadius:7,padding:"9px 10px",marginBottom:5,cursor:"pointer",
          }}>
            <span style={{fontSize:16}}>{s.icon}</span>
            <div style={{fontSize:12,color:section===i?C.textBright:C.muted,fontWeight:600,lineHeight:1.3}}>{s.title}</div>
          </button>
        ))}
      </div>
      <div style={{flex:1}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
          <span style={{fontSize:28}}>{sections[section].icon}</span>
          <h2 style={{fontSize:20,fontWeight:800,color:C.textBright}}>{sections[section].title}</h2>
        </div>
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:24}}>
          {sections[section].content}
        </div>
      </div>
    </div>
  );
}

// ─── OVERVIEW ─────────────────────────────────────────────────────────────────
function Overview({ setTab }) {
  return (
    <div>
      <section style={{
        position:"relative",overflow:"hidden",
        padding:"80px 48px 60px",
        background:`radial-gradient(ellipse 70% 50% at 50% 0%, rgba(0,229,255,0.07) 0%, transparent 70%)`,
      }}>
        <div style={{
          position:"absolute",inset:0,pointerEvents:"none",
          backgroundImage:`linear-gradient(${C.border} 1px, transparent 1px), linear-gradient(90deg, ${C.border} 1px, transparent 1px)`,
          backgroundSize:"48px 48px",opacity:.25,
        }}/>
        <div style={{maxWidth:800,margin:"0 auto",textAlign:"center",position:"relative"}}>
          <div style={{
            display:"inline-flex",alignItems:"center",gap:8,
            border:`1px solid ${C.accentDim}`,borderRadius:20,
            padding:"3px 14px",marginBottom:28,
            color:C.accent,fontSize:11,fontFamily:MONO,
            background:C.accentGlow,
          }}>
            <span style={{width:6,height:6,background:C.green,borderRadius:"50%",display:"inline-block"}}/>
            OPEN SOURCE · ESP32-S3 · NO CAMERA · NO CLOUD · LOCAL ONLY
          </div>
          <h1 style={{
            fontSize:"clamp(36px,5.5vw,66px)",
            fontWeight:900,lineHeight:1.1,color:C.textBright,marginBottom:20,
            animation:"slideUp .8s ease both",
          }}>
            See Through Walls<br/>
            <span style={{color:C.accent}}>With WiFi Signals</span>
          </h1>
          <p style={{fontSize:17,color:C.textDim,lineHeight:1.7,maxWidth:560,margin:"0 auto 32px",
            animation:"slideUp .8s .15s ease both"}}>
            VitalMesh reconstructs a live 17-keypoint body skeleton, breathing rate, and heart rate
            from WiFi disturbances — entirely on a $9 ESP32 chip, through walls, no camera.
          </p>
          <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap",
            animation:"slideUp .8s .3s ease both"}}>
            <button onClick={()=>setTab("Avatar Dashboard")} style={{
              background:C.accent,color:C.bg,border:"none",borderRadius:7,
              padding:"12px 24px",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:SANS,
            }}>→ Live Avatar Dashboard</button>
            <button onClick={()=>setTab("Manual")} style={{
              background:"transparent",color:C.accent,
              border:`1px solid ${C.accentDim}`,borderRadius:7,
              padding:"12px 24px",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:SANS,
            }}>Full Manual</button>
            <button onClick={()=>setTab("Hardware Setup")} style={{
              background:"transparent",color:C.textDim,
              border:`1px solid ${C.border}`,borderRadius:7,
              padding:"12px 24px",fontSize:14,cursor:"pointer",fontFamily:SANS,
            }}>Hardware Guide</button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <div style={{display:"flex",justifyContent:"center",flexWrap:"wrap",
        borderTop:`1px solid ${C.border}`,borderBottom:`1px solid ${C.border}`,background:C.surface}}>
        {[
          ["~$9","per ESP32-S3 node"],["3–6 nodes","per room"],
          ["17 keypoints","body skeleton"],["92.9%","pose accuracy (PCK@20)"],
          ["20 Hz","CSI stream rate"],["0 cloud","fully local"],
        ].map(([v,l],i)=>(
          <div key={i} style={{
            padding:"20px 28px",textAlign:"center",
            borderRight:i<5?`1px solid ${C.border}`:"none",
          }}>
            <div style={{fontSize:22,fontWeight:900,color:C.accent,fontFamily:MONO}}>{v}</div>
            <div style={{fontSize:11,color:C.textDim,marginTop:3}}>{l}</div>
          </div>
        ))}
      </div>

      {/* What you see */}
      <section style={{padding:"60px 48px",maxWidth:1000,margin:"0 auto"}}>
        <h2 style={{fontSize:26,fontWeight:800,color:C.textBright,textAlign:"center",marginBottom:40}}>
          What You See on Your Screen
        </h2>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:16}}>
          {[
            {icon:"🧍",title:"Stick Figure Avatar",desc:"17-joint skeleton rendered live at 20 fps. Updates as the person moves, walks, sits, or falls. Works through walls.",tag:"REQUIRES TRAINING"},
            {icon:"🫀",title:"Breathing Waveform",desc:"Real-time sine wave showing breathing rhythm. Rate displayed in BPM. Works in the dark, through drywall.",tag:"OUT OF BOX"},
            {icon:"❤️",title:"Heart Rate Estimate",desc:"Contactless cardiac rhythm from micro-Doppler vibration of the chest wall. ±5 BPM accuracy.",tag:"OUT OF BOX"},
            {icon:"📍",title:"Presence Radar",desc:"Spatial map showing where people are detected in the room. Multi-person tracking with min-cut algorithm.",tag:"OUT OF BOX"},
            {icon:"🚨",title:"Fall Alert",desc:"Sudden motion signature triggers instant alert. Semantic state 'fall-detected' published to Home Assistant.",tag:"OUT OF BOX"},
            {icon:"😴",title:"Sleep Monitor",desc:"Overnight breathing trends, bed-exit detection, and movement patterns. No wearable needed.",tag:"OUT OF BOX"},
          ].map(({icon,title,desc,tag})=>(
            <div key={title} style={{
              background:C.card,border:`1px solid ${C.border}`,
              borderRadius:10,padding:"20px 18px",
              transition:"border-color .2s",
            }}
              onMouseEnter={e=>e.currentTarget.style.borderColor=C.accentDim}
              onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}
            >
              <div style={{fontSize:28,marginBottom:10}}>{icon}</div>
              <h3 style={{fontSize:15,fontWeight:700,color:C.textBright,marginBottom:6}}>{title}</h3>
              <p style={{fontSize:13,color:C.textDim,lineHeight:1.6,marginBottom:10}}>{desc}</p>
              <span style={{
                fontSize:9,fontFamily:MONO,
                color:tag.includes("TRAINING")?C.orange:C.green,
                background:tag.includes("TRAINING")?"rgba(255,107,53,0.1)":"rgba(57,255,20,0.08)",
                border:`1px solid ${tag.includes("TRAINING")?C.orange:C.green}`,
                borderRadius:3,padding:"2px 7px",
              }}>{tag}</span>
            </div>
          ))}
        </div>
      </section>

      {/* vs Competitor comparison */}
      <section style={{padding:"0 48px 60px",maxWidth:1000,margin:"0 auto"}}>
        <h2 style={{fontSize:26,fontWeight:800,color:C.textBright,textAlign:"center",marginBottom:12}}>
          How VitalMesh Compares
        </h2>
        <p style={{textAlign:"center",color:C.textDim,fontSize:14,marginBottom:32}}>
          No mmWave radar offers breathing rate, heart rate, or pose skeleton. VitalMesh is in a class of its own.
        </p>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead>
              <tr style={{borderBottom:`2px solid ${C.border}`}}>
                {["Feature","VitalMesh","mmWave Radar","Everything Presence One"].map((h,i)=>(
                  <th key={h} style={{
                    padding:"10px 16px",textAlign:i===0?"left":"center",
                    color:i===1?C.accent:C.textBright,fontFamily:MONO,fontSize:11,
                    background:i===1?C.accentGlow:"transparent",
                    borderRadius:i===1?"6px 6px 0 0":0,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["Presence Detection","✅","✅","✅"],
                ["Breathing Rate","✅","❌","❌"],
                ["Heart Rate","✅","❌","❌"],
                ["Fall Detection","✅","✅","❌"],
                ["17-Keypoint Pose","✅","❌","❌"],
                ["Sleep Monitoring","✅","❌","❌"],
                ["Temperature / Humidity","✅","❌","✅"],
                ["Ambient Light","✅","❌","✅"],
                ["Bluetooth Proxy","✅","❌","✅"],
                ["Through-Wall Sensing","✅","⚠️ limited","❌"],
                ["No Camera","✅","✅","✅"],
                ["Fully Local / No Cloud","✅","✅","✅"],
                ["Price (DIY kit)","~$30","$40–$120","$65"],
              ].map(([feat,...vals],i)=>(
                <tr key={feat} style={{
                  borderBottom:`1px solid ${C.border}`,
                  background:i%2===0?"transparent":C.surface,
                }}>
                  <td style={{padding:"10px 16px",color:C.textDim,fontWeight:500}}>{feat}</td>
                  {vals.map((v,j)=>(
                    <td key={j} style={{
                      padding:"10px 16px",textAlign:"center",
                      color:v==="✅"?C.green:v==="❌"?C.muted:C.yellow,
                      fontFamily:MONO,fontSize:14,
                      background:j===0?C.accentGlow:"transparent",
                    }}>{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* BUY THE KIT CTA */}
      <section style={{
        margin:"0 48px 60px",
        background:`linear-gradient(135deg, rgba(0,229,255,0.08) 0%, rgba(0,150,255,0.05) 100%)`,
        border:`1px solid ${C.accentDim}`,
        borderRadius:16,padding:"48px 40px",
        textAlign:"center",
        position:"relative",overflow:"hidden",
      }}>
        <div style={{
          position:"absolute",top:-40,right:-40,width:200,height:200,
          background:"radial-gradient(circle, rgba(0,229,255,0.08) 0%, transparent 70%)",
          pointerEvents:"none",
        }}/>
        <div style={{
          display:"inline-flex",alignItems:"center",gap:8,
          border:`1px solid ${C.green}`,borderRadius:20,
          padding:"3px 14px",marginBottom:20,
          color:C.green,fontSize:11,fontFamily:MONO,
          background:"rgba(57,255,20,0.06)",
        }}>
          ● AVAILABLE NOW — FIRST RUN OF 10 KITS
        </div>
        <h2 style={{fontSize:32,fontWeight:900,color:C.textBright,marginBottom:12}}>
          VitalMesh Starter Kit
        </h2>
        <div style={{fontSize:42,fontWeight:900,color:C.accent,fontFamily:MONO,marginBottom:8}}>
          $129
        </div>
        <p style={{color:C.textDim,fontSize:15,marginBottom:32,maxWidth:520,margin:"0 auto 32px"}}>
          3× pre-flashed ESP32-S3 nodes · USB-C data cables · printed setup card with QR code · handwritten thank-you note. Ships via USPS Priority Mail.
        </p>
        <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap",marginBottom:28}}>
          {[
            "✅ Pre-flashed firmware",
            "✅ Works with Home Assistant",
            "✅ 21+ entities auto-created",
            "✅ No subscription",
            "✅ Open source",
            "✅ US shipping included",
          ].map(f=>(
            <span key={f} style={{
              fontSize:13,color:C.textDim,background:C.card,
              border:`1px solid ${C.border}`,borderRadius:6,
              padding:"6px 14px",
            }}>{f}</span>
          ))}
        </div>
        <a
          href="https://www.tindie.com"
          target="_blank"
          rel="noopener"
          style={{
            display:"inline-block",
            background:C.accent,color:C.bg,
            border:"none",borderRadius:8,
            padding:"14px 40px",fontSize:16,fontWeight:800,
            cursor:"pointer",fontFamily:SANS,
            textDecoration:"none",
            boxShadow:`0 0 32px rgba(0,229,255,0.3)`,
            transition:"transform .15s",
          }}
          onMouseEnter={e=>e.currentTarget.style.transform="scale(1.03)"}
          onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}
        >
          Buy on Tindie →
        </a>
        <div style={{marginTop:16,fontSize:12,color:C.textDim}}>
          Limited to 10 kits · DIY build guide available free on GitHub
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop:`1px solid ${C.border}`,
        padding:"28px 48px",
        display:"flex",justifyContent:"space-between",alignItems:"center",
        flexWrap:"wrap",gap:16,
        background:C.surface,
      }}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke={C.accent} strokeWidth="1" opacity=".4"/>
            <circle cx="12" cy="12" r="5" stroke={C.accent} strokeWidth="1" opacity=".7"/>
            <circle cx="12" cy="12" r="2" fill={C.accent}/>
            <line x1="12" y1="12" x2="19" y2="7" stroke={C.accent} strokeWidth="1.5"/>
          </svg>
          <span style={{fontFamily:MONO,fontWeight:700,fontSize:14,color:C.textBright}}>
            Vital<span style={{color:C.accent}}>Mesh</span>
          </span>
          <span style={{fontSize:11,color:C.textDim,fontFamily:MONO}}>v0.7.0</span>
        </div>
        <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>
          {[
            ["GitHub","https://github.com/ruvnet/VitalMesh"],
            ["Tindie","https://www.tindie.com"],
            ["Docker Hub","https://hub.docker.com/r/ruvnet/vitalmesh"],
            ["r/homeassistant","https://reddit.com/r/homeassistant"],
          ].map(([label,href])=>(
            <a key={label} href={href} target="_blank" rel="noopener" style={{
              fontSize:12,color:C.textDim,textDecoration:"none",
              fontFamily:MONO,
            }}
              onMouseEnter={e=>e.currentTarget.style.color=C.accent}
              onMouseLeave={e=>e.currentTarget.style.color=C.textDim}
            >{label}</a>
          ))}
        </div>
        <div style={{fontSize:11,color:C.muted,fontFamily:MONO}}>
          MIT License · Open Source · No Cloud
        </div>
      </footer>
    </div>
  );
}

// ─── ENVIRONMENTAL SENSORS ────────────────────────────────────────────────────
function Sparkline({ data, color, w=120, h=36 }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, w, h);
    if (data.length < 2) return;
    const min = Math.min(...data), max = Math.max(...data);
    const range = max - min || 1;
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    data.forEach((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
    // Fill under
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
    ctx.fillStyle = color + "22";
    ctx.fill();
  }, [data, color, w, h]);
  return <canvas ref={ref} width={w} height={h} style={{ display: "block" }} />;
}

function GaugeArc({ value, min, max, color, size = 110 }) {
  const pct = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const r = 42, cx = size / 2, cy = size / 2 + 8;
  const startAngle = Math.PI * 0.75;
  const endAngle = Math.PI * 0.75 + pct * Math.PI * 1.5;
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy + r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy + r * Math.sin(endAngle);
  const large = pct > 0.5 ? 1 : 0;
  const trackX2 = cx + r * Math.cos(startAngle + Math.PI * 1.5);
  const trackY2 = cy + r * Math.sin(startAngle + Math.PI * 1.5);
  return (
    <svg width={size} height={size} style={{ display: "block", margin: "0 auto" }}>
      <path d={`M ${x1} ${y1} A ${r} ${r} 0 1 1 ${trackX2} ${trackY2}`}
        fill="none" stroke={C.border} strokeWidth={6} strokeLinecap="round" />
      {pct > 0.01 && (
        <path d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`}
          fill="none" stroke={color} strokeWidth={6} strokeLinecap="round" />
      )}
    </svg>
  );
}

function EnvCard({ icon, label, value, unit, color, min, max, history, status, statusColor }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 10, padding: "18px 16px",
      display: "flex", flexDirection: "column", gap: 10,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 10, color: C.textDim, fontFamily: MONO, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 4 }}>{label}</div>
          <div style={{ fontSize: 28, fontWeight: 900, color, fontFamily: MONO, lineHeight: 1 }}>
            {typeof value === "number" ? value.toFixed(label === "Temperature" ? 1 : label === "Humidity" ? 0 : 0) : value}
            <span style={{ fontSize: 12, color: C.textDim, fontWeight: 400, marginLeft: 3 }}>{unit}</span>
          </div>
        </div>
        <span style={{ fontSize: 22 }}>{icon}</span>
      </div>
      <GaugeArc value={value} min={min} max={max} color={color} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{
          fontSize: 10, fontFamily: MONO, padding: "2px 8px", borderRadius: 3,
          color: statusColor, background: `${statusColor}18`, border: `1px solid ${statusColor}`,
        }}>{status}</span>
        <Sparkline data={history} color={color} />
      </div>
    </div>
  );
}

function BluetoothDevice({ name, rssi, type, seen, paired }) {
  const bars = Math.min(4, Math.max(1, Math.round((rssi + 100) / 20)));
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "10px 14px", background: C.surface,
      border: `1px solid ${paired ? C.accentDim : C.border}`, borderRadius: 8,
      marginBottom: 8,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: "50%",
        background: paired ? C.accentGlow : "rgba(255,255,255,0.04)",
        border: `1px solid ${paired ? C.accentDim : C.border}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M6 7l10 10M16 7L6 17M12 4v16M12 4l4 4M12 4l-4 4M12 20l4-4M12 20l-4-4" stroke={paired ? C.accent : C.textDim} strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.textBright, marginBottom: 2 }}>{name}</div>
        <div style={{ fontSize: 11, color: C.textDim, fontFamily: MONO }}>{type} · last seen {seen}</div>
      </div>
      <div style={{ display: "flex", gap: 2, alignItems: "flex-end" }}>
        {[1,2,3,4].map(b => (
          <div key={b} style={{
            width: 4, height: b * 5 + 4, borderRadius: 2,
            background: b <= bars ? C.accent : C.border,
          }} />
        ))}
      </div>
      <div style={{ fontSize: 10, color: C.textDim, fontFamily: MONO, minWidth: 50, textAlign: "right" }}>{rssi} dBm</div>
      {paired && <span style={{ fontSize: 9, color: C.green, fontFamily: MONO, background: "rgba(57,255,20,0.08)", border: `1px solid ${C.green}`, borderRadius: 3, padding: "1px 6px" }}>PROXY</span>}
    </div>
  );
}

function LightBar({ value }) {
  const pct = Math.min(100, (value / 2000) * 100);
  const color = value < 50 ? C.purple : value < 300 ? C.accentDim : value < 1000 ? C.yellow : C.orange;
  const label = value < 10 ? "Dark" : value < 50 ? "Dim" : value < 300 ? "Indoor" : value < 800 ? "Bright" : "Sunlight";
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: C.textDim, fontFamily: MONO }}>0 lx</span>
        <span style={{ fontSize: 12, color, fontFamily: MONO, fontWeight: 700 }}>{Math.round(value)} lx — {label}</span>
        <span style={{ fontSize: 11, color: C.textDim, fontFamily: MONO }}>2000 lx</span>
      </div>
      <div style={{ height: 10, background: C.border, borderRadius: 5, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 5, transition: "width .5s, background .5s" }} />
      </div>
    </div>
  );
}

function EnvironmentalSensors() {
  const [running, setRunning] = useState(true);
  const [temp, setTemp] = useState(21.4);
  const [humidity, setHumidity] = useState(48);
  const [light, setLight] = useState(340);
  const [tempHistory, setTempHistory] = useState(() => Array.from({length:30}, (_,i) => 20 + Math.sin(i*0.3)*2));
  const [humidHistory, setHumidHistory] = useState(() => Array.from({length:30}, (_,i) => 48 + Math.sin(i*0.5)*5));
  const [lightHistory, setLightHistory] = useState(() => Array.from({length:30}, (_,i) => 340 + Math.sin(i*0.4)*80));
  const [btDevices] = useState([
    { name: "iPhone 15 Pro (Alex)", rssi: -52, type: "Phone", seen: "now", paired: true },
    { name: "Pixel 8 (Jamie)", rssi: -71, type: "Phone", seen: "2m ago", paired: true },
    { name: "AirPods Pro", rssi: -63, type: "Earbuds", seen: "now", paired: false },
    { name: "Apple Watch Series 9", rssi: -58, type: "Wearable", seen: "now", paired: false },
    { name: "Unknown device", rssi: -89, type: "Unknown", seen: "5m ago", paired: false },
  ]);
  const [log, setLog] = useState([
    { t:"00:00", msg:"Environmental sensors online", c: C.green },
    { t:"00:01", msg:"Temperature: 21.4°C — comfortable range", c: C.accent },
    { t:"00:02", msg:"BLE proxy active — 2 devices proxied", c: C.accent },
    { t:"00:03", msg:"Light: 340 lx — indoor bright", c: C.textDim },
  ]);

  const push = (history, val) => [...history.slice(-29), val];

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const t = Date.now() / 1000;
      const newTemp = 21.4 + Math.sin(t * 0.05) * 1.5 + (Math.random() - 0.5) * 0.15;
      const newHumid = 48 + Math.sin(t * 0.04) * 6 + (Math.random() - 0.5) * 1;
      const newLight = Math.max(0, 340 + Math.sin(t * 0.08) * 120 + (Math.random() - 0.5) * 30);
      setTemp(newTemp);
      setHumidity(Math.round(newHumid));
      setLight(newLight);
      setTempHistory(h => push(h, newTemp));
      setHumidHistory(h => push(h, newHumid));
      setLightHistory(h => push(h, newLight));
      if (Math.random() < 0.1) {
        const msgs = [
          ["Humidity trending up — consider ventilation", C.yellow],
          ["Temperature stable — HVAC not required", C.green],
          ["BLE heartbeat: 2 proxied devices active", C.accent],
          ["Light level drop detected — dusk approaching", C.purple],
          ["Ambient conditions: comfortable", C.green],
          ["CO₂ estimate from occupancy + ventilation: 620 ppm", C.textDim],
        ];
        const [msg, c] = msgs[Math.floor(Math.random() * msgs.length)];
        const d = new Date();
        setLog(l => [{
          t: `${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}`,
          msg, c,
        }, ...l.slice(0, 14)]);
      }
    }, 800);
    return () => clearInterval(id);
  }, [running]);

  const tempStatus = temp < 18 ? ["Too Cold", C.accent] : temp > 26 ? ["Too Warm", C.orange] : ["Comfortable", C.green];
  const humidStatus = humidity < 30 ? ["Too Dry", C.orange] : humidity > 65 ? ["Too Humid", C.orange] : ["Optimal", C.green];
  const lightStatus = light < 50 ? ["Dark", C.purple] : light < 300 ? ["Dim", C.accentDim] : light < 1000 ? ["Good", C.green] : ["Bright", C.yellow];

  return (
    <div style={{ padding: "28px", maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: C.textBright }}>Environmental Sensors</h2>
        <span style={{
          fontSize: 10, color: running ? C.green : C.muted, fontFamily: MONO,
          background: running ? "rgba(57,255,20,0.08)" : "transparent",
          border: `1px solid ${running ? C.green : C.muted}`,
          borderRadius: 3, padding: "2px 8px",
          animation: running ? "blink 2s infinite" : "none",
        }}>{running ? "● LIVE" : "○ PAUSED"}</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button onClick={() => setRunning(r => !r)} style={{
            background: running ? "rgba(255,107,53,0.1)" : C.accentGlow,
            border: `1px solid ${running ? C.orange : C.accentDim}`,
            color: running ? C.orange : C.accent,
            borderRadius: 5, padding: "5px 12px", fontSize: 11, cursor: "pointer",
          }}>{running ? "⏸ Pause" : "▶ Resume"}</button>
        </div>
      </div>

      {/* Main grid: env cards + BT */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
        <EnvCard
          icon="🌡️" label="Temperature" value={temp} unit="°C" color={C.orange}
          min={10} max={35} history={tempHistory}
          status={tempStatus[0]} statusColor={tempStatus[1]}
        />
        <EnvCard
          icon="💧" label="Humidity" value={humidity} unit="%" color={C.accent}
          min={0} max={100} history={humidHistory}
          status={humidStatus[0]} statusColor={humidStatus[1]}
        />
        <div style={{
          background: C.card, border: `1px solid ${C.border}`,
          borderRadius: 10, padding: "18px 16px",
          display: "flex", flexDirection: "column", gap: 10,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 10, color: C.textDim, fontFamily: MONO, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 4 }}>Ambient Light</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: C.yellow, fontFamily: MONO, lineHeight: 1 }}>
                {Math.round(light)}<span style={{ fontSize: 12, color: C.textDim, fontWeight: 400, marginLeft: 3 }}>lx</span>
              </div>
            </div>
            <span style={{ fontSize: 22 }}>☀️</span>
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
            <LightBar value={light} />
          </div>
          <Sparkline data={lightHistory} color={C.yellow} w={260} h={36} />
          <span style={{
            alignSelf: "flex-start",
            fontSize: 10, fontFamily: MONO, padding: "2px 8px", borderRadius: 3,
            color: lightStatus[1], background: `${lightStatus[1]}18`, border: `1px solid ${lightStatus[1]}`,
          }}>{lightStatus[0]}</span>
        </div>
      </div>

      {/* Second row: BT proxy + comfort index + log */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        {/* BT Proxy */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "18px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 10, color: C.textDim, fontFamily: MONO, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 2 }}>Bluetooth Proxy</div>
              <div style={{ fontSize: 13, color: C.textBright, fontWeight: 700 }}>
                {btDevices.filter(d => d.paired).length} devices proxied to Home Assistant
              </div>
            </div>
            <div style={{
              fontSize: 10, color: C.green, fontFamily: MONO,
              background: "rgba(57,255,20,0.08)", border: `1px solid ${C.green}`,
              borderRadius: 3, padding: "2px 8px",
            }}>ACTIVE</div>
          </div>
          <div>
            {btDevices.map((d, i) => <BluetoothDevice key={i} {...d} />)}
          </div>
          <div style={{ marginTop: 10, padding: "10px 12px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 7 }}>
            <div style={{ fontSize: 10, color: C.textDim, fontFamily: MONO, marginBottom: 6 }}>HOW IT WORKS</div>
            <div style={{ fontSize: 12, color: C.textDim, lineHeight: 1.6 }}>
              Each ESP32-S3 node runs a <span style={{ color: C.accent, fontFamily: MONO }}>BLE proxy</span> that relays nearby Bluetooth advertisements over WiFi to Home Assistant. Any BLE device — fitness trackers, sensors, tags — appears as a HA entity without a dedicated gateway.
            </div>
          </div>
        </div>

        {/* Comfort index + log */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Comfort index */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "18px 16px" }}>
            <div style={{ fontSize: 10, color: C.textDim, fontFamily: MONO, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 12 }}>Comfort Index</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { label: "Heat Index", value: (temp + (humidity - 40) * 0.1).toFixed(1), unit: "°C", color: C.orange },
                { label: "Dew Point", value: (temp - (100 - humidity) / 5).toFixed(1), unit: "°C", color: C.accent },
                { label: "Feels Like", value: temp < 18 ? "Chilly" : temp > 25 ? "Warm" : "Comfortable", unit: "", color: C.green },
                { label: "Air Quality", value: "Good", unit: "", color: C.green },
              ].map(({ label, value, unit, color }) => (
                <div key={label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 7, padding: "10px 12px" }}>
                  <div style={{ fontSize: 10, color: C.textDim, fontFamily: MONO, marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color, fontFamily: MONO }}>{value}<span style={{ fontSize: 11, color: C.textDim, marginLeft: 2 }}>{unit}</span></div>
                </div>
              ))}
            </div>
          </div>

          {/* Log */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "18px 16px", flex: 1 }}>
            <div style={{ fontSize: 10, color: C.textDim, fontFamily: MONO, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 10 }}>Sensor Log</div>
            <div style={{ maxHeight: 180, overflowY: "auto" }}>
              {log.map((l, i) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "3px 0", borderBottom: `1px solid ${C.border}`, fontSize: 11, fontFamily: MONO }}>
                  <span style={{ color: C.textDim, minWidth: 40 }}>{l.t}</span>
                  <span style={{ color: l.c }}>{l.msg}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* HA integration info */}
      <div style={{ background: C.accentGlow, border: `1px solid ${C.accentDim}`, borderRadius: 8, padding: "14px 18px" }}>
        <div style={{ fontSize: 13, color: C.textDim, lineHeight: 1.7 }}>
          <strong style={{ color: C.textBright }}>Home Assistant entities auto-created:</strong>{" "}
          <code style={{ color: C.accent, fontFamily: MONO, fontSize: 11 }}>sensor.vitalmesh_temperature</code>{" · "}
          <code style={{ color: C.accent, fontFamily: MONO, fontSize: 11 }}>sensor.vitalmesh_humidity</code>{" · "}
          <code style={{ color: C.accent, fontFamily: MONO, fontSize: 11 }}>sensor.vitalmesh_illuminance</code>{" · "}
          <code style={{ color: C.accent, fontFamily: MONO, fontSize: 11 }}>sensor.vitalmesh_ble_{"{mac}"}</code>{" "}
          — all published via MQTT alongside the presence and vitals sensors. Temperature and humidity use the
          onboard SHT31 sensor on the ESP32-S3 node. Illuminance uses the ambient light photodiode.
          BLE proxy requires ESP-IDF 5.1+ (included in the VitalMesh firmware build).
        </div>
      </div>
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tab,setTab]=useState("Overview");
  return (
    <>
      <Styles/>
      <Nav tab={tab} setTab={setTab}/>
      {tab==="Overview" && <Overview setTab={setTab}/>}
      {tab==="Avatar Dashboard" && <AvatarDashboard/>}
      {tab==="Environmental" && <EnvironmentalSensors/>}
      {tab==="Hardware Setup" && <HardwareSetup/>}
      {tab==="Manual" && <Manual/>}
    </>
  );
}
