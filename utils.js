
const h=React.createElement;
const F=React.Fragment;
const{useState,useEffect,useRef,useCallback,useMemo}=React;

const SUPA_URL="https://jmsaceushtshgqulreyu.supabase.co";
const SUPA_KEY="sb_publishable_DCO2buENQ1j__8cN32TVTQ_miaroN4l";
const MODEL="claude-haiku-4-5-20251001";
const FREE_DAILY_LIMIT=50;

const S={
  get:k=>{try{return JSON.parse(localStorage.getItem(k))}catch{return null}},
  set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}},
  del:k=>{try{localStorage.removeItem(k)}catch{}}
};
const uid=()=>Math.random().toString(36).slice(2,9);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

// ── Voice ─────────────────────────────────────────────────────────
let voiceList=[],cachedVoices={},voiceUnlocked=false,iosTimer=null;
function loadVoices(){voiceList=window.speechSynthesis?.getVoices()||[];cachedVoices={}}
if(window.speechSynthesis){setTimeout(loadVoices,600);window.speechSynthesis.onvoiceschanged=loadVoices}

function unlockVoice(){
  if(voiceUnlocked||!window.speechSynthesis)return;
  voiceUnlocked=true;
  const u=new SpeechSynthesisUtterance(" ");u.volume=0;u.rate=10;
  window.speechSynthesis.speak(u);
  if(!iosTimer)iosTimer=setInterval(()=>{
    if(window.speechSynthesis?.speaking){window.speechSynthesis.pause();window.speechSynthesis.resume()}
  },10000);
}

function getBestVoice(gender,lang){
  const key=gender+"-"+lang;
  if(cachedVoices[key])return cachedVoices[key];
  if(!voiceList.length)voiceList=window.speechSynthesis?.getVoices()||[];
  const sh=(lang||"en-US").slice(0,2).toLowerCase();
  let pool=voiceList.filter(v=>v.lang.toLowerCase().startsWith(sh));
  if(!pool.length)pool=voiceList.filter(v=>v.lang.startsWith("en"));
  if(!pool.length)pool=voiceList.slice(0,5);
  let v=gender==="male"
    ?pool.find(v=>/male|man|david|mark|daniel|jorge|henrik|aaron|fred/i.test(v.name))||(pool.length>1?pool[1]:pool[0])
    :pool.find(v=>/female|woman|samantha|victoria|karen|alva|anna|alice|moira/i.test(v.name))||pool[0];
  cachedVoices[key]=v;return v;
}

function speak(text,gender,lang,rate=1){
  if(!window.speechSynthesis||!text)return;
  try{
    if(window.speechSynthesis.paused)window.speechSynthesis.resume();
    window.speechSynthesis.cancel();
    const clean=text.replace(/<[^>]+>/g,"").replace(/\*\*/g,"").replace(/\s+/g," ").trim().slice(0,600);
    if(!clean)return;
    const u=new SpeechSynthesisUtterance(clean);
    const voice=getBestVoice(gender,lang||"en-US");
    if(voice){u.voice=voice;u.lang=voice.lang}else u.lang=lang||"en-US";
    u.rate=Math.max(0.5,Math.min(2,rate*0.9));u.pitch=gender==="male"?0.85:1.05;u.volume=1;
    setTimeout(()=>{try{window.speechSynthesis.speak(u)}catch{}},80);
  }catch{}
}

// ── AI — calls Netlify function (no API key needed in browser) ────
async function callAI(system,messages,tries=3,mtok=800){
  // Get Supabase auth token to identify the user (for usage tracking)
  let token=null;
  try{
    const s=await getSupa().auth.getSession();
    token=s.data?.session?.access_token||null;
  }catch{}

  for(let i=0;i<tries;i++){
    try{
      const r=await fetch("/.netlify/functions/chat",{
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          ...(token&&{"Authorization":"Bearer "+token})
        },
        body:JSON.stringify({system,messages,maxTokens:mtok})
      });

      // Daily limit reached
      if(r.status===429){
        const d=await r.json().catch(()=>({}));
        if(d.code==="DAILY_LIMIT")throw new Error("LIMIT:"+( d.error||"Daily limit reached"));
        if(i<tries-1){await sleep(8000*(i+1));continue}
        throw new Error(d.error||"For många förfrågningar. Vänta 30 sekunder.");
      }

      if(!r.ok){
        const d=await r.json().catch(()=>({}));
        throw new Error(d.error||"Fel "+r.status);
      }

      const d=await r.json();
      if(d.error)throw new Error(d.error);
      return d.text;

    }catch(e){
      if(e.message.startsWith("LIMIT:"))throw e;
      if(!navigator.onLine)throw new Error("Ingen internetuppkoppling.");
      if(i===tries-1)throw e;
      await sleep(2000);
    }
  }
}

// Vision call — prepends image materials
async function callAIVision(system,messages,imageMats=[],tries=3){
  let apiMessages=[...messages];
  if(imageMats.length>0){
    const imgContent=imageMats.map(img=>({
      type:"image",source:{type:"base64",media_type:img.mimeType||"image/jpeg",data:img.b64}
    }));
    imgContent.push({type:"text",text:"These are the visual study materials the student uploaded. Use them as primary teaching reference."});
    apiMessages=[
      {role:"user",content:imgContent},
      {role:"assistant",content:"I can see all the visual materials clearly. I will reference them in my teaching."},
      ...messages
    ];
  }
  return callAI(system,apiMessages,tries);
}

function parseJSON(raw){
  try{
    const s=raw.replace(/```json/gi,"").replace(/```/gi,"").trim();
    let i=s.indexOf("{"),i2=s.indexOf("[");
    if(i===-1&&i2===-1)return null;
    if(i===-1)i=i2;else if(i2!==-1&&i2<i)i=i2;
    return JSON.parse(s.slice(i));
  }catch{return null}
}

function hl(t){
  if(!t)return"";
  return t.replace(/\*\*(.*?)\*\*/g,'<strong style="color:#92400e">$1</strong>').replace(/\n/g,"<br/>");
}

// ── Supabase ──────────────────────────────────────────────────────
let SUPA=null;
const getSupa=()=>{if(!SUPA)SUPA=window.supabase.createClient(SUPA_URL,SUPA_KEY);return SUPA};

const db={
  subs:async uid=>(await getSupa().from("subjects").select("*").eq("user_id",uid).order("created_at")).data||[],
  saveSub:async(s,uid)=>getSupa().from("subjects").upsert({id:s.id,user_id:uid,name:s.name,emoji:s.emoji,color:s.color,sessions:s.sessions||0}),
  delSub:async id=>getSupa().from("subjects").delete().eq("id",id),
  mats:async sid=>(await getSupa().from("materials").select("*").eq("subject_id",sid).order("created_at")).data||[],
  saveMat:async(m,sid,uid)=>getSupa().from("materials").upsert({id:m.id,subject_id:sid,user_id:uid,name:m.name,kind:m.kind,text_content:m.text||""}),
  delMat:async id=>getSupa().from("materials").delete().eq("id",id),
  saveSession:async(key,uid,msgs)=>{
    try{await getSupa().from("sessions").upsert({subject_id:key,user_id:uid,messages:JSON.stringify(msgs.slice(-40)),updated_at:new Date().toISOString()},{onConflict:"subject_id,user_id"})}catch{}
  },
  loadSession:async(key,uid)=>{
    try{const r=await getSupa().from("sessions").select("messages").eq("subject_id",key).eq("user_id",uid).single();return r.data?JSON.parse(r.data.messages):null}catch{return null}
  }
};

// ── Mastery ───────────────────────────────────────────────────────
const mastery={
  get:sid=>S.get("m_"+sid)||{pct:0,concepts:{}},
  set:(sid,d)=>S.set("m_"+sid,d),
  afterLesson(sid){const d=mastery.get(sid);d.pct=Math.min(100,d.pct+5);mastery.set(sid,d);return d.pct},
  afterQuiz(sid,questions,answers){
    const d=mastery.get(sid);
    const correct=questions.filter((q,i)=>answers[i]===q.answer).length;
    const score=Math.round(correct/questions.length*100);
    d.pct=Math.min(100,Math.round(d.pct*0.55+score*0.45));
    questions.forEach((q,i)=>{
      const k=(q.q||"").slice(0,40);
      d.concepts[k]=Math.max(0,Math.min(100,(d.concepts[k]||0)+(answers[i]===q.answer?22:-8)));
    });
    mastery.set(sid,d);return d.pct;
  },
  afterFlash(sid,total,known){
    const d=mastery.get(sid);
    d.pct=Math.min(100,Math.round(d.pct*0.7+(known/total)*30));
    mastery.set(sid,d);return d.pct;
  }
};

// ── File reading ──────────────────────────────────────────────────
const readTextFile=file=>new Promise(res=>{const r=new FileReader();r.onload=e=>res(e.target.result);r.readAsText(file)});

async function readPdfFile(file){
  if(!window.pdfjsLib)return"PDF kunde inte läsas. Klistra in texten manuellt.";
  return new Promise(res=>{
    const r=new FileReader();
    r.onload=async e=>{
      try{
        const pdf=await pdfjsLib.getDocument({data:e.target.result}).promise;
        let text="";const pages=Math.min(pdf.numPages,50);
        for(let i=1;i<=pages;i++){const page=await pdf.getPage(i);const c=await page.getTextContent();text+=c.items.map(it=>it.str).join(" ")+"\n"}
        res(text.trim()||"Texten kunde inte extraheras. Klistra in manuellt.");
      }catch{res("PDF-fel. Klistra in texten manuellt.")}
    };
    r.onerror=()=>res("Kunde inte läsa filen.");
    r.readAsArrayBuffer(file);
  });
}

async function readMat(file){
  const isImg=file.type.startsWith("image/");
  if(isImg)return new Promise(res=>{const r=new FileReader();r.onload=e=>res({kind:"image",mimeType:file.type,b64:e.target.result.split(",")[1],name:file.name,text:""});r.readAsDataURL(file)});
  if(file.type==="application/pdf"){const text=await readPdfFile(file);return{kind:"text",text,name:file.name}}
  const text=await readTextFile(file);return{kind:"text",text,name:file.name};
}

function getYouTubeId(url){
  if(!url)return null;
  const m=url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?#]+)/);
  return m?m[1]:null;
}

async function fetchYouTubeTranscript(videoId){
  try{
    const r=await fetch("/.netlify/functions/transcript",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({videoId})});
    if(!r.ok)return null;
    const d=await r.json();return d.transcript||null;
  }catch{return null}
}

function matText(mats){
  return mats.filter(m=>m.text?.length>0).map(m=>`=== "${m.name}" ===\n${m.text.slice(0,3000)}`).join("\n\n");
}
function getImageMats(mats,bins){
  return mats.filter(m=>m.kind==="image"&&bins[m.id]?.b64).map(m=>bins[m.id]);
}

// ── System prompts ────────────────────────────────────────────────
const lvMap={easy:"Use simple clear language.",medium:"University level.",hard:"Advanced academic.",mixed:"Vary difficulty."};
const sysLumio=(s,m,l,lang)=>`You are Lumio, expert AI tutor for "${s}". Respond ONLY in ${lang}. Base 100% on provided materials. Use **bold** for key terms. ${lvMap[l]||lvMap.medium} MAX 3 sentences + 1 question.\nMATERIALS:\n${matText(m)||"None."}`;
const sysAtlas=(s,m,l,lang,asked)=>`You are Atlas, structured tutor for "${s}". Respond in ${lang}. Base 100% on materials. **Bold** key terms. Previously asked: ${asked.join("; ")||"none"}. ${lvMap[l]||lvMap.medium} MAX 3 sentences + 1 question.\nMATERIALS:\n${matText(m)||"None."}`;
const sysSpark=(s,m,lang,asked)=>`You are Spark, challenger for "${s}". Respond in ${lang}. Base 100% on materials. Challenge student thinking. Previously asked: ${asked.join("; ")||"none"}. MAX 2 sentences + 1 probing question.\nMATERIALS:\n${matText(m)||"None."}`;
const sysChat=(s,m,lang)=>`You are Lumio AI for "${s}". Respond in ${lang}. Base 100% on materials. **Bold** key terms. Detailed exam-ready answers. Cite [Source: "name"].\nMATERIALS:\n${matText(m)||"None."}`;

function buildHist(msgs){
  const hist=[];
  for(const m of msgs){
    const role=m.role==="user"?"user":"assistant";
    if(hist.length&&hist[hist.length-1].role===role){hist[hist.length-1].content+=" "+m.text;continue}
    hist.push({role,content:m.text});
  }
  while(hist.length&&hist[0].role!=="user")hist.shift();
  while(hist.length&&hist[hist.length-1].role!=="user")hist.pop();
  return hist.length?hist:null;
}

// ── Constants ─────────────────────────────────────────────────────
const COLORS=["#F0C84A","#34D399","#60A5FA","#A78BFA","#F87171","#FB923C","#E879F9","#2DD4BF"];
const EMOJIS=["📚","🧪","🏛️","💻","🫀","🔬","⚗️","🌍","➕","🎭","🎵","⚖️","🏥","✈️","🌿","📐","🧠","🏆","🌐","🔭"];
const LEVELS=[{id:"easy",l:"Easy",d:"Basics"},{id:"medium",l:"Medium",d:"University"},{id:"hard",l:"Hard",d:"Exam level"},{id:"mixed",l:"Mixed",d:"All levels"}];
const LANGS=["English","Svenska","Espanol","Francais","Deutsch","Arabic","Hindi","Portugues","Chinese","Japanese"];
const LANG_CODES={"English":"en-US","Svenska":"sv-SE","Espanol":"es-ES","Francais":"fr-FR","Deutsch":"de-DE","Arabic":"ar-SA","Hindi":"hi-IN","Portugues":"pt-BR","Chinese":"zh-CN","Japanese":"ja-JP"};
const NAV=[{id:"subjects",ic:"📚",lb:"Subjects"},{id:"lesson",ic:"🎓",lb:"Lesson"},{id:"dual",ic:"🤖",lb:"Dual AI"},{id:"games",ic:"🎮",lb:"Games"},{id:"profile",ic:"👤",lb:"Profile"}];

// ── Mastery ring component ────────────────────────────────────────
function MasteryRing({value=0,size=52,color="#D4A017"}){
  const r=(size/2)-5,circ=2*Math.PI*r,offset=circ-(value/100)*circ;
  return h("div",{style:{position:"relative",width:size,height:size,flexShrink:0}},
    h("svg",{width:size,height:size,style:{position:"absolute",top:0,left:0}},
      h("circle",{cx:size/2,cy:size/2,r,fill:"none",stroke:"#E3E8F5",strokeWidth:4}),
      h("circle",{cx:size/2,cy:size/2,r,fill:"none",stroke:color,strokeWidth:4,strokeDasharray:circ,strokeDashoffset:offset,strokeLinecap:"round",style:{transform:"rotate(-90deg)",transformOrigin:"50% 50%",transition:"stroke-dashoffset .6s ease"}})
    ),
    h("div",{style:{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}},
      h("div",{style:{fontSize:size*0.22,fontWeight:800,fontFamily:"Syne,sans-serif",color,lineHeight:1}},value+"%")
    )
  );
}

// ── YouTube player ────────────────────────────────────────────────
function VideoPlayer({url}){
  const ytId=getYouTubeId(url);
  if(ytId)return h("div",{className:"video-wrap"},h("iframe",{src:`https://www.youtube.com/embed/${ytId}?rel=0`,title:"Video",allowFullScreen:true,allow:"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"}));
  return h("a",{href:url,target:"_blank",rel:"noopener noreferrer",style:{color:"#4F46E5",fontSize:".82rem",wordBreak:"break-all"}},url);
}

// ── Mic hook ──────────────────────────────────────────────────────
function useMic(onResult,langCode){
  const[on,setOn]=useState(false);
  const ref=useRef(null);
  const start=useCallback(()=>{
    if(on){try{ref.current?.stop()}catch{}setOn(false);return}
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){alert("Voice input requires Chrome.");return}
    try{
      const r=new SR();ref.current=r;
      r.lang=langCode||"en-US";r.continuous=false;r.interimResults=false;
      r.onstart=()=>setOn(true);r.onend=()=>setOn(false);
      r.onerror=e=>{setOn(false);if(e.error==="not-allowed")alert("Mikrofon blockerad. Tillåt den i webbläsarinställningarna.")};
      r.onresult=e=>{const t=e.results?.[0]?.[0]?.transcript;setOn(false);if(t)onResult(t)};
      r.start();
    }catch{setOn(false)}
  },[on,onResult,langCode]);
  return[on,start];
}

// ── MsgList ───────────────────────────────────────────────────────
function MsgList({msgs,loading,loadingRole,onSend,showHints,langCode,speechRate=1}){
  const[inp,setInp]=useState("");
  const endRef=useRef(null);
  const[mic,startMic]=useMic(useCallback(t=>onSend(t),[onSend]),langCode);
  useEffect(()=>endRef.current?.scrollIntoView({behavior:"smooth"}),[msgs,loading]);
  function send(){const t=inp.trim();if(!t||loading)return;onSend(t);setInp("")}
  const rc=r=>r==="atlas"?"#4F46E5":r==="spark"?"#E11D48":"#D4A017";
  const rl=r=>r==="atlas"?"ATLAS":r==="spark"?"SPARK":"LUMIO";
  const bc=r=>"bub "+(r==="atlas"?"bub-A":r==="spark"?"bub-S":r==="user"?"bub-U":"bub-L");
  const ac=r=>"av "+(r==="atlas"?"av-A":r==="spark"?"av-S":r==="user"?"av-U":"av-L");
  return h(F,null,
    h("div",{className:"msgs-area"},
      msgs.map((m,i)=>h("div",{key:m.id||i,className:"msg-block"},
        m.role!=="user"&&h("div",{className:"msg-who",style:{color:rc(m.role)}},rl(m.role)),
        h("div",{className:"msg-row"+(m.role==="user"?" usr":"")},
          m.role!=="user"&&h("div",{className:ac(m.role)},m.role==="atlas"?"A":m.role==="spark"?"S":"L"),
          m.role==="user"&&h("div",{className:ac(m.role)},"U"),
          h("div",{className:bc(m.role),dangerouslySetInnerHTML:{__html:hl(m.text)}})
        ),
        m.role!=="user"&&h("button",{className:"listen-btn",onClick:()=>{unlockVoice();speak(m.text,m.role==="atlas"?"female":"male",langCode,speechRate)}},"🔊 Listen")
      )),
      loading&&h("div",{className:"msg-block"},
        h("div",{className:"msg-who",style:{color:rc(loadingRole)}},rl(loadingRole)+" thinking…"),
        h("div",{className:"msg-row"},
          h("div",{className:"av "+(loadingRole==="atlas"?"av-A":loadingRole==="spark"?"av-S":"av-L")},loadingRole==="atlas"?"A":loadingRole==="spark"?"S":"L"),
          h("div",{className:"typing",style:{background:loadingRole==="atlas"?"#EEF2FF":loadingRole==="spark"?"#fff1f2":"#FFFBEB",border:"1px solid "+(loadingRole==="atlas"?"#C7D2FE":loadingRole==="spark"?"#fecdd3":"#F0C84A44")}},
            [0,1,2].map(j=>h("div",{key:j,className:"dp",style:{background:rc(loadingRole)}}))
          )
        )
      ),
      h("div",{ref:endRef})
    ),
    h("div",{className:"inp-area"},
      h("div",{className:"inp-row"},
        h("button",{className:"mic-btn"+(mic?" on":""),onClick:()=>{unlockVoice();startMic()}},mic?"⏹":"🎙"),
        h("textarea",{className:"txt-inp",value:inp,onChange:e=>setInp(e.target.value),onKeyDown:e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send()}},placeholder:"Answer here…",disabled:!!loading,rows:1}),
        h("button",{className:"send-btn",onClick:send,disabled:!!loading||!inp.trim()},"→")
      ),
      showHints&&h("div",{className:"hints"},
        ["I don't understand","Give an example","Simpler","Go deeper","Next topic"].map(hint=>h("button",{key:hint,className:"hint",onClick:()=>onSend(hint)},hint))
      )
    )
  );
}

// ── WherePanel ────────────────────────────────────────────────────
function WherePanel({summary,concepts,isReturning,onStart,loading}){
  if(loading)return h("div",{className:"loading-center"},h("div",{className:"spin",style:{width:32,height:32,borderWidth:3}}),h("div",{style:{color:"#6B74A2",fontSize:".84rem"}},loading));
  return h("div",{style:{flex:1,overflowY:"auto",padding:"14px 15px 8px",WebkitOverflowScrolling:"touch"}},
    summary&&h("div",{className:"sum-box"},
      h("div",{style:{fontSize:".68rem",fontWeight:700,color:"#D4A017",letterSpacing:".8px",textTransform:"uppercase",marginBottom:8}},"MATERIAL SUMMARY"),
      h("div",{style:{fontSize:".88rem",lineHeight:1.75},dangerouslySetInnerHTML:{__html:hl(summary)}}),
      concepts?.length>0&&h("div",{style:{display:"flex",flexWrap:"wrap",gap:6,marginTop:10}},
        concepts.map((c,i)=>h("span",{key:i,style:{padding:"4px 12px",borderRadius:20,background:"#fff8e1",border:"1px solid #F0C84A44",color:"#92400e",fontSize:".73rem",fontWeight:600}},typeof c==="string"?c:c.term))
      )
    ),
    h("div",{className:"where-box"},
      h("div",{style:{fontWeight:700,fontSize:".88rem",marginBottom:12}},isReturning?"Welcome back — where would you like to continue?":"Where would you like to start?"),
      isReturning?h(F,null,
        h("button",{className:"where-btn",onClick:()=>onStart("continue")},h("div",{style:{fontSize:20}},"▶️"),h("div",null,h("div",{style:{fontWeight:600}},"Continue where we left off"),h("div",{style:{fontSize:".72rem",color:"#6B74A2",marginTop:2}},"Pick up from last session"))),
        h("button",{className:"where-btn",onClick:()=>onStart("beginning")},h("div",{style:{fontSize:20}},"🔄"),h("div",null,h("div",{style:{fontWeight:600}},"Start from the beginning"),h("div",{style:{fontSize:".72rem",color:"#6B74A2",marginTop:2}},"Go through everything again")))
      ):h(F,null,
        h("button",{className:"where-btn",onClick:()=>onStart("beginning")},h("div",{style:{fontSize:20}},"🚀"),h("div",null,h("div",{style:{fontWeight:600}},"From the beginning"),h("div",{style:{fontSize:".72rem",color:"#6B74A2",marginTop:2}},"Start with the first concept"))),
        (concepts||[]).slice(0,3).map((c,i)=>{
          const term=typeof c==="string"?c:c.term;
          const def=typeof c==="object"?c.def:"";
          return h("button",{key:i,className:"where-btn",onClick:()=>onStart(term)},h("div",{style:{fontSize:20}},"🎯"),h("div",null,h("div",{style:{fontWeight:600}},"Focus: "+term),h("div",{style:{fontSize:".72rem",color:"#6B74A2",marginTop:2}},def)));
        })
      )
    )
  );
}

// ── Speed slider ──────────────────────────────────────────────────
function SpeedRow({speechRate,setSpeechRate}){
  return h("div",{style:{display:"flex",alignItems:"center",gap:8,marginTop:7,padding:"3px 0"}},
    h("span",{style:{fontSize:".67rem",color:"#6B74A2",flexShrink:0}},"Hastighet"),
    h("input",{type:"range",min:.5,max:2,step:.1,value:speechRate,onChange:e=>{const v=parseFloat(e.target.value);setSpeechRate(v);S.set("lm_rate",v)},style:{flex:1,cursor:"pointer"}}),
    h("span",{style:{fontSize:".68rem",color:"#D4A017",fontWeight:700,flexShrink:0,width:30}},speechRate+"x")
  );
}

// ── APP ───────────────────────────────────────────────────────────
