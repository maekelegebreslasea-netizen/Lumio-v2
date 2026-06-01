function App(){
  const[user,setUser]=useState(null);
  const[authLoad,setAuthLoad]=useState(true);
  const[authMode,setAuthMode]=useState("login");
  const[email,setEmail]=useState("");
  const[pass,setPass]=useState("");
  const[authMsg,setAuthMsg]=useState({t:"",c:""});
  const[authBusy,setAuthBusy]=useState(false);
  const[tab,setTab]=useState("subjects");
  const[active,setActive]=useState(null);
  const[subjects,setSubjects]=useState([]);
  const[bins,setBins]=useState({});
  const[xp,setXp]=useState(()=>S.get("xp")||0);
  const[xpPop,setXpPop]=useState(null);
  const[lessonCount,setLessonCount]=useState(()=>S.get("lc")||0);
  const[correctCount,setCorrectCount]=useState(()=>S.get("cc")||0);
  const[lessonLevel,setLessonLevel]=useState("medium");
  const[lang,setLang]=useState(()=>S.get("lm_lang")||"English");
  const[speechRate,setSpeechRate]=useState(()=>parseFloat(S.get("lm_rate")||"1"));
  const[showLang,setShowLang]=useState(false);
  const[masteryPct,setMasteryPct]=useState({});
  const[isOnline,setIsOnline]=useState(navigator.onLine);
  const[usageToday,setUsageToday]=useState(()=>S.get("usage_"+new Date().toISOString().slice(0,10))||0);

  // Toast system
  const[toasts,setToasts]=useState([]);
  const addToast=useCallback((msg,type="err")=>{
    const id=uid();
    setToasts(t=>[...t,{id,msg,type}]);
    setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),4500);
  },[]);
  const removeToast=id=>setToasts(t=>t.filter(x=>x.id!==id));

  // Lesson states
  const[lMsgs,setLMsgs]=useState([]);
  const[lLoad,setLLoad]=useState(false);
  const[lState,setLState]=useState("idle");
  const[lSum,setLSum]=useState(null);
  const[lCon,setLCon]=useState([]);
  const[lSumLoad,setLSumLoad]=useState(null);

  // Dual states
  const[dMsgs,setDMsgs]=useState([]);
  const[dLoad,setDLoad]=useState(null);
  const[dState,setDState]=useState("idle");
  const[dSum,setDSum]=useState(null);
  const[dCon,setDCon]=useState([]);
  const[dSumLoad,setDSumLoad]=useState(null);
  const[dAsked,setDAsked]=useState([]);

  // Chat
  const[cMsgs,setCMsgs]=useState([]);
  const[cLoad,setCLoad]=useState(false);
  const[cSum,setCSum]=useState(null);
  const[cSumLoad,setCSumLoad]=useState(false);
  const[cInp,setCInp]=useState("");
  const cEndRef=useRef(null);

  // Quiz
  const[qData,setQData]=useState(null);
  const[qLoad,setQLoad]=useState(false);
  const[qAns,setQAns]=useState({});
  const[qDone,setQDone]=useState(false);
  const[qLvl,setQLvl]=useState("medium");

  // Games
  const[gameMode,setGameMode]=useState("menu");
  const[flashCards,setFlashCards]=useState(null);
  const[flashIdx,setFlashIdx]=useState(0);
  const[flashFlipped,setFlashFlipped]=useState(false);
  const[flashLoad,setFlashLoad]=useState(false);
  const[flashKnown,setFlashKnown]=useState(0);
  const[speedQ,setSpeedQ]=useState(null);
  const[speedIdx,setSpeedIdx]=useState(0);
  const[speedAns,setSpeedAns]=useState(null);
  const[speedScore,setSpeedScore]=useState(0);
  const[speedDone,setSpeedDone]=useState(false);
  const[speedLoad,setSpeedLoad]=useState(false);

  // Modals
  const[showNewSub,setShowNewSub]=useState(false);
  const[showAddMat,setShowAddMat]=useState(false);
  const[showDel,setShowDel]=useState(null);
  const[showUpgrade,setShowUpgrade]=useState(false);
  const[subName,setSubName]=useState("");
  const[subEmoji,setSubEmoji]=useState("📚");
  const[subColor,setSubColor]=useState("#F0C84A");
  const[matTab,setMatTab]=useState("file");
  const[pasteT,setPasteT]=useState("");
  const[pasteN,setPasteN]=useState("");
  const[vidUrl,setVidUrl]=useState("");
  const[uploading,setUploading]=useState(false);
  const[transcribing,setTranscribing]=useState(false);
  const fileRef=useRef(null);

  // Expose navigation to desktop sidebar
  useEffect(()=>{
    window._setTab=setTab;
    window._setActive=setActive;
    window._setShowNewSub=setShowNewSub;
    window._setGameMode=setGameMode;
    window._subjects=subjects;
  });

  // Persist XP
  useEffect(()=>{S.set("xp",xp)},[xp]);
  useEffect(()=>{S.set("lc",lessonCount)},[lessonCount]);
  useEffect(()=>{S.set("cc",correctCount)},[correctCount]);

  // Online/offline
  useEffect(()=>{
    const on=()=>setIsOnline(true);
    const off=()=>{setIsOnline(false);addToast("Ingen internetuppkoppling","warn")};
    window.addEventListener("online",on);window.addEventListener("offline",off);
    return()=>{window.removeEventListener("online",on);window.removeEventListener("offline",off)};
  },[]);

  useEffect(()=>cEndRef.current?.scrollIntoView({behavior:"smooth"}),[cMsgs,cLoad]);

  useEffect(()=>{
    if(!active)return;
    setLMsgs([]);setLState("idle");setLSum(null);setLCon([]);setLSumLoad(null);
    setDMsgs([]);setDState("idle");setDSum(null);setDCon([]);setDSumLoad(null);setDAsked([]);
    setCMsgs([]);setCSum(null);setCSumLoad(false);
    setMasteryPct(p=>({...p,[active.id]:mastery.get(active.id).pct}));
  },[active?.id]);

  useEffect(()=>{
    getSupa().auth.getSession().then(r=>{setUser(r.data?.session?.user||null);setAuthLoad(false)});
    const{data}=getSupa().auth.onAuthStateChange((_,s)=>setUser(s?.user||null));
    return()=>data?.subscription?.unsubscribe();
  },[]);

  useEffect(()=>{
    if(!user){setSubjects([]);return}
    (async()=>{
      try{
        const ss=await db.subs(user.id);
        const withMats=await Promise.all(ss.map(async s=>{
          const mats=await db.mats(s.id);
          return{...s,materials:mats.map(m=>({...m,text:m.text_content||""}))};
        }));
        setSubjects(withMats);
        const mp={};withMats.forEach(s=>{mp[s.id]=mastery.get(s.id).pct});setMasteryPct(mp);
      }catch(e){addToast("Could not load subjects: "+e.message)}
    })();
  },[user?.id]);

  // AI error handler — shows proper toast
  function handleAIError(e,fallbackMsg){
    if(e.message.startsWith("LIMIT:")){
      setShowUpgrade(true);
      addToast("Daily limit reached. Upgrade for unlimited.","warn");
    }else if(e.message.includes("internet")||e.message.includes("network")){
      addToast("Ingen internet. Kontrollera uppkopplingen.","err");
    }else{
      addToast(fallbackMsg||"Something went wrong. Try again.","err");
    }
  }

  function addXP(amt,lbl){
    setXp(x=>{const n=x+amt;S.set("xp",n);return n});
    setXpPop({lbl,k:Date.now()});setTimeout(()=>setXpPop(null),2500);
  }
  const getMats=()=>active?.materials||[];
  const getImgMats=()=>getImageMats(getMats(),bins);
  const hasMats=!!(active?.materials?.length);
  const langCode=LANG_CODES[lang]||"en-US";

  async function updateMats(sid,mats){
    setSubjects(p=>p.map(s=>s.id===sid?{...s,materials:mats}:s));
    if(active?.id===sid)setActive(p=>({...p,materials:mats}));
  }
  function updateMasteryPct(sid,pct){
    setMasteryPct(p=>({...p,[sid]:pct}));
    setSubjects(p=>p.map(s=>s.id===sid?{...s,_m:pct}:s));
    if(active?.id===sid)setActive(p=>({...p,_m:pct}));
  }

  // Auth
  async function signIn(){
    setAuthBusy(true);setAuthMsg({t:"",c:""});
    const r=await getSupa().auth.signInWithPassword({email:email.trim(),password:pass});
    if(r.error)setAuthMsg({t:"Wrong email or password.",c:"err"});
    setAuthBusy(false);
  }
  async function signUp(){
    if(pass.length<6){setAuthMsg({t:"Password needs at least 8 characters.",c:"err"});return}
    setAuthBusy(true);setAuthMsg({t:"",c:""});
    const r=await getSupa().auth.signUp({email:email.trim(),password:pass});
    if(r.error){setAuthMsg({t:r.error.message,c:"err"});setAuthBusy(false);return}
    if(r.data?.user){
      const r2=await getSupa().auth.signInWithPassword({email:email.trim(),password:pass});
      if(r2.error)setAuthMsg({t:"Konto skapat! Logga in.",c:"ok"});
    }else setAuthMsg({t:"Kolla din e-post.",c:"ok"});
    setAuthBusy(false);
  }
  async function signOut(){await getSupa().auth.signOut();setSubjects([]);setActive(null);setTab("subjects")}

  // Subjects
  async function createSub(){
    if(!subName.trim()||!user)return;
    const s={id:uid(),name:subName.trim(),emoji:subEmoji,color:subColor,sessions:0,materials:[]};
    await db.saveSub(s,user.id);setSubjects(p=>[...p,s]);
    setSubName("");setShowNewSub(false);setActive(s);setTab("subject");
  }
  async function deleteSub(id){
    await db.delSub(id);setSubjects(p=>p.filter(s=>s.id!==id));setShowDel(null);
    if(active?.id===id){setActive(null);setTab("subjects")}
  }

  // Materials
  async function onFile(e){
    const files=Array.from(e.target.files||[]);
    if(!files.length||!active||!user)return;
    e.target.value="";setUploading(true);
    for(const f of files){
      try{
        if(f.size>5*1024*1024){addToast(f.name+" is too large (max 5MB). Paste the text instead.","warn");continue}
        const data=await readMat(f);
        const mat={id:uid(),name:f.name,kind:data.kind,text:data.text||""};
        if(data.kind==="image"&&data.b64)setBins(p=>({...p,[mat.id]:{kind:"image",mimeType:data.mimeType,b64:data.b64}}));
        await db.saveMat(mat,active.id,user.id);
        await updateMats(active.id,[...getMats(),mat]);
        addToast(f.name+" tillagd ✓","ok");
      }catch(err){addToast("Fel vid uppladdning: "+err.message)}
    }
    setUploading(false);setShowAddMat(false);
  }
  async function addPaste(){
    if(!pasteT.trim()||!active||!user)return;
    const mat={id:uid(),name:pasteN.trim()||"Text "+((getMats().length)+1),kind:"text",text:pasteT.trim()};
    await db.saveMat(mat,active.id,user.id);
    await updateMats(active.id,[...getMats(),mat]);
    setPasteT("");setPasteN("");setShowAddMat(false);
    addToast("Text sparad ✓","ok");
  }
  async function addVid(){
    if(!vidUrl.trim()||!active||!user)return;
    const url=vidUrl.trim();const ytId=getYouTubeId(url);
    let transcript="";
    if(ytId){
      setTranscribing(true);
      addToast("Fetching transcript from YouTube…","info");
      const t=await fetchYouTubeTranscript(ytId);
      if(t){transcript="[Video Transcript]\n"+t;addToast("Transcript fetched ✓","ok");}
      else addToast("No transcript available","warn");
      setTranscribing(false);
    }
    const mat={id:uid(),name:ytId?"YouTube: "+ytId:"Video: "+url.slice(0,50),kind:"video",text:(transcript||"")+"\n[Video URL] "+url};
    await db.saveMat(mat,active.id,user.id);
    await updateMats(active.id,[...getMats(),mat]);
    setVidUrl("");setShowAddMat(false);
  }
  async function delMat(id){
    if(!active)return;
    await db.delMat(id);
    await updateMats(active.id,getMats().filter(m=>m.id!==id));
    setBins(p=>{const n={...p};delete n[id];return n});
  }

  // Summary loader
  async function loadSummary(mats,setSum,setCon,setSumLoad,setLS,hasSaved){
    setSumLoad("Reading your material…");
    const mt=matText(mats);
    const prompt=`Generate a study summary in ${lang} for the given materials. Return ONLY valid JSON: {"summary":"2-3 sentences","concepts":[{"term":"concept","def":"brief def"}]}\nBase on:\n${mt||"No text materials."}`;
    try{
      const raw=await callAI("Respond ONLY with valid JSON. No markdown.",[{role:"user",content:prompt}]);
      const p=parseJSON(raw);
      if(p?.summary)setSum(p.summary);
      if(p?.concepts&&Array.isArray(p.concepts))setCon(p.concepts);
    }catch(e){
      setSum("Kunde inte generera sammanfattning.");
      handleAIError(e);
    }
    setSumLoad(null);setLS(hasSaved?"returning":"start");
  }

  // Luxori Lesson
  async function initLuxori(){
    if(!active||!user)return;
    setLState("loading");
    const mats=getMats();
    const saved=await db.loadSession("L_"+active.id,user.id);
    if(saved?.length)setLMsgs(saved);
    await loadSummary(mats,setLSum,setLCon,setLSumLoad,setLState,!!saved?.length);
  }

  async function startLuxori(opt){
    setLState("active");
    const mats=getMats();const imgMats=getImgMats();
    const sys=sysLuxori(active.name,mats,lessonLevel,lang);
    const existingMsgs=opt==="continue"?lMsgs:[];
    const prompt=opt==="continue"?"Briefly recap what we covered last, then ask a question to check understanding.":
                 opt==="beginning"?"Introduce the very first concept from the materials and ask a question.":
                 `Focus on: ${opt}. Teach this topic and ask a question.`;
    let apiMsgs=[];
    if(existingMsgs.length){const h2=buildHist(existingMsgs);if(h2)apiMsgs=h2;}
    apiMsgs=[...apiMsgs,{role:"user",content:prompt}];
    setLLoad(true);
    try{
      const reply=await callAIVision(sys,apiMsgs,imgMats);
      const newMsg={role:"luxori",text:reply,id:uid()};
      const allMsgs=[...existingMsgs,newMsg];
      setLMsgs(allMsgs);unlockVoice();speak(reply,"male",langCode,speechRate);
      await db.saveSession("L_"+active.id,user.id,allMsgs);
      addXP(15,"+15 XP 🎓");setLessonCount(c=>c+1);
      const pct=mastery.afterLesson(active.id);updateMasteryPct(active.id,pct);
      setSubjects(p=>p.map(s=>s.id===active.id?{...s,sessions:(s.sessions||0)+1}:s));
    }catch(e){
      setLMsgs([...existingMsgs,{role:"luxori",text:"Something went wrong. Try again.",id:uid()}]);
      handleAIError(e);
    }
    setLLoad(false);
  }

  const sendLuxori=useCallback(async text=>{
    if(!text||lLoad)return;
    window.speechSynthesis?.cancel();
    const updated=[...lMsgs,{role:"user",text,id:uid()}];
    setLMsgs(updated);setLLoad(true);
    const hist=buildHist(updated);if(!hist){setLLoad(false);return}
    const mats=getMats();const imgMats=getImgMats();
    try{
      const reply=await callAIVision(sysLuxori(active.name,mats,lessonLevel,lang),hist,imgMats);
      const msgs=[...updated,{role:"luxori",text:reply,id:uid()}];
      setLMsgs(msgs);speak(reply,"male",langCode,speechRate);
      await db.saveSession("L_"+active.id,user.id,msgs);
    }catch(e){
      setLMsgs([...updated,{role:"luxori",text:"Something went wrong. Try again.",id:uid()}]);
      handleAIError(e);
    }
    setLLoad(false);
  },[lMsgs,lLoad,active,lessonLevel,lang,langCode,speechRate,bins]);

  // Dual
  async function initDual(){
    if(!active||!user)return;
    setDState("loading");
    const mats=getMats();
    const saved=await db.loadSession("D_"+active.id,user.id);
    if(saved?.length)setDMsgs(saved);
    await loadSummary(mats,setDSum,setDCon,setDSumLoad,setDState,!!saved?.length);
  }

  async function startDual(opt){
    setDState("active");
    const mats=getMats();const imgMats=getImgMats();
    const existingMsgs=opt==="continue"?dMsgs:[];
    const prompt=opt==="continue"?"Briefly recap the last topic, then ask a follow-up question.":
                 opt==="beginning"?"Start from the beginning. Introduce the first concept and ask a question.":
                 `Focus on: ${opt}. Start there.`;
    let apiMsgs=[];
    if(existingMsgs.length){const h2=buildHist(existingMsgs);if(h2)apiMsgs=h2;}
    apiMsgs=[...apiMsgs,{role:"user",content:prompt}];
    setDLoad("atlas");
    try{
      const reply=await callAIVision(sysAtlas(active.name,mats,lessonLevel,lang,[]),apiMsgs,imgMats);
      const newMsg={role:"atlas",text:reply,id:uid()};
      const allMsgs=[...existingMsgs,newMsg];
      setDMsgs(allMsgs);
      const qm=reply.match(/[^.!?]*\?[^.!?]*/);if(qm)setDAsked([qm[0].trim()]);
      unlockVoice();speak(reply,"female",langCode,speechRate);
      await db.saveSession("D_"+active.id,user.id,allMsgs);
      addXP(15,"+15 XP 🤖");setLessonCount(c=>c+1);
      const pct=mastery.afterLesson(active.id);updateMasteryPct(active.id,pct);
    }catch(e){
      setDMsgs([...existingMsgs,{role:"atlas",text:"Something went wrong. Try again.",id:uid()}]);
      handleAIError(e);
    }
    setDLoad(null);
  }

  const sendDual=useCallback(async text=>{
    if(!text||dLoad)return;
    window.speechSynthesis?.cancel();
    const updated=[...dMsgs,{role:"user",text,id:uid()}];
    setDMsgs(updated);
    const hist=buildHist(updated);if(!hist)return;
    const last=updated.filter(m=>m.role==="atlas"||m.role==="spark").at(-1);
    const next=(!last||last.role==="spark")?"atlas":"spark";
    setDLoad(next);
    const mats=getMats();const imgMats=getImgMats();
    const sys=next==="atlas"?sysAtlas(active.name,mats,lessonLevel,lang,dAsked):sysSpark(active.name,mats,lang,dAsked);
    try{
      const reply=await callAIVision(sys,hist,imgMats);
      const msgs=[...updated,{role:next,text:reply,id:uid()}];
      setDMsgs(msgs);
      const qm=reply.match(/[^.!?]*\?[^.!?]*/);if(qm)setDAsked(p=>[...p,qm[0].trim()].slice(-20));
      speak(reply,next==="atlas"?"female":"male",langCode,speechRate);
      await db.saveSession("D_"+active.id,user.id,msgs);
    }catch(e){
      setDMsgs([...updated,{role:next,text:"Something went wrong. Try again.",id:uid()}]);
      handleAIError(e);
    }
    setDLoad(null);
  },[dMsgs,dLoad,active,lessonLevel,lang,dAsked,langCode,speechRate,bins]);

  // Chat
  async function initChat(){
    if(!active)return;setCSumLoad(true);
    const mt=matText(getMats());if(!mt){setCSumLoad(false);return}
    try{
      const raw=await callAI("Respond ONLY with valid JSON.",[{role:"user",content:`Summary in ${lang} for "${active.name}". {"summary":"2-3 sentences"}\nBase on:\n${mt}`}]);
      const p=parseJSON(raw);if(p?.summary)setCSum(p.summary);
    }catch(e){handleAIError(e)}
    setCSumLoad(false);
  }

  const sendChat=useCallback(async text=>{
    if(!text||cLoad)return;setCInp("");
    const updated=[...cMsgs,{role:"user",text,id:uid()}];setCMsgs(updated);setCLoad(true);
    const hist=buildHist(updated);if(!hist){setCLoad(false);return}
    const imgMats=getImgMats();
    try{
      const reply=await callAIVision(sysChat(active.name,getMats(),lang),hist,imgMats);
      setCMsgs([...updated,{role:"luxori",text:reply,id:uid()}]);
    }catch(e){
      setCMsgs([...updated,{role:"luxori",text:"Something went wrong. Try again.",id:uid()}]);
      handleAIError(e);
    }
    setCLoad(false);
  },[cMsgs,cLoad,active,lang,bins]);

  const[chatMicOn,startChatMic]=useMic(useCallback(t=>sendChat(t),[sendChat]),langCode);

  // Games
  async function genFlashcards(){
    if(!active)return;
    setFlashLoad(true);setFlashCards(null);setFlashIdx(0);setFlashFlipped(false);setFlashKnown(0);
    const mt=matText(getMats());
    if(!mt){setFlashCards({error:"Upload material first."});setFlashLoad(false);return}
    try{
      const raw=await callAI("Return ONLY JSON.",[{role:"user",content:`Create 12 flashcards in ${lang} based ONLY on this material. JSON: {"cards":[{"front":"term","back":"definition"}]}\n\n${mt.slice(0,2500)}`}],3,1500);
      const p=parseJSON(raw);
      setFlashCards(p?.cards?p:{error:"Kunde inte generera."});
      if(p?.cards)addXP(5,"+5 XP ✨");
    }catch(e){setFlashCards({error:"Something went wrong."});handleAIError(e)}
    setFlashLoad(false);
  }

  async function genSpeedQuiz(){
    if(!active)return;
    setSpeedLoad(true);setSpeedQ(null);setSpeedIdx(0);setSpeedAns(null);setSpeedScore(0);setSpeedDone(false);
    const mt=matText(getMats());
    if(!mt){setSpeedQ({error:"Upload material first."});setSpeedLoad(false);return}
    try{
      const raw=await callAI("Return ONLY JSON.",[{role:"user",content:`Create 10 MCQ in ${lang} based ONLY on this material. JSON: {"questions":[{"q":"?","options":["A","B","C","D"],"answer":0}]}\n\n${mt.slice(0,2500)}`}],3,2000);
      const p=parseJSON(raw);
      setSpeedQ(p?.questions?p:{error:"Kunde inte generera."});
      if(p?.questions)addXP(5,"+5 XP ⚡");
    }catch(e){setSpeedQ({error:"Something went wrong."});handleAIError(e)}
    setSpeedLoad(false);
  }

  function answerSpeed(opt){
    if(speedAns!==null)return;
    const isCorrect=opt===speedQ.questions[speedIdx].correct;
    setSpeedAns(opt);
    if(isCorrect){setSpeedScore(s=>s+1);addXP(5,"+5 XP ✓")}
    setTimeout(()=>{
      if(speedIdx+1>=speedQ.questions.length)setSpeedDone(true);
      else{setSpeedIdx(i=>i+1);setSpeedAns(null)}
    },900);
  }

  async function genQuiz(lv){
    const l=lv||qLvl;setQLoad(true);setQData(null);setQAns({});setQDone(false);
    const mt=matText(getMats());
    if(!mt){setQData({error:"Upload material first."});setQLoad(false);return}
    try{
      const raw=await callAI("Return ONLY JSON.",[{role:"user",content:`Create 6 exam MCQ in ${lang} at ${l} level based ONLY on this material. JSON: {"questions":[{"q":"?","options":["A","B","C","D"],"answer":0,"explanation":"why"}]}\n\n${mt.slice(0,2500)}`}],3,2000);
      const p=parseJSON(raw);
      setQData(p?.questions?p:{error:"Kunde inte generera."});
      if(p?.questions)addXP(5,"+5 XP 🎯");
    }catch(e){setQData({error:"Something went wrong."});handleAIError(e)}
    setQLoad(false);
  }

  function submitQuiz(){
    if(!qData?.questions)return;setQDone(true);
    const c=qData.questions.filter((q,i)=>qAns[i]===q.answer).length;
    const tot=qData.questions.length;
    const pct=Math.round(c/tot*100);
    if(c>0)addXP(c*10,`+${c*10} XP 🎉`);
    // Store score for recommendation
    setQData(p=>({...p,_score:c,_total:tot,_pct:pct}));
    if(c===qData.questions.length)addXP(25,"+25 XP PERFEKT! 🏆");
    setCorrectCount(x=>x+c);
    const pct=mastery.afterQuiz(active.id,qData.questions,Object.fromEntries(Object.entries(qAns)));
    updateMasteryPct(active.id,pct);
  }

  const lvlLabel=xp=>xp>=2000?"Master ✨":xp>=1000?"Expert 🎓":xp>=500?"Scholar 📖":xp>=200?"Student 🌱":"Beginner";
  const isGamesTab=tab==="games"||tab==="quiz";

  // ── SCREENS ───────────────────────────────────────────────────────
  if(authLoad)return h("div",{style:{height:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16,background:"linear-gradient(160deg,#0D1137,#1a1f5e)"}},
    h("div",{style:{width:72,height:72,borderRadius:22,background:"linear-gradient(135deg,#F0C84A,#E07D2A)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,boxShadow:"0 8px 32px rgba(240,200,74,.3)"}},"L"),
    h("div",{style:{fontFamily:"Syne,sans-serif",fontSize:"1.8rem",color:"#F0C84A",letterSpacing:"-.4px"}},"Luxori"),
    h("div",{className:"spin",style:{width:24,height:24}})
  );

  if(!user)return h("div",{className:"auth-wrap"},
    h("div",{className:"auth-box"},
      h("div",{className:"auth-logo"},"L"),
      h("div",{className:"auth-brand"},"Luxori"),
      h("p",{className:"auth-sub"},"Learn anything from your own materials"),
      h("div",{className:"auth-tabs"},
        h("button",{className:"auth-tab "+(authMode==="login"?"on":""),onClick:()=>{setAuthMode("login");setAuthMsg({t:"",c:""})}},"Logga in"),
        h("button",{className:"auth-tab "+(authMode==="signup"?"on":""),onClick:()=>{setAuthMode("signup");setAuthMsg({t:"",c:""})}},"Skapa konto")
      ),
      authMsg.t&&h("div",{className:"auth-alert "+(authMsg.c==="ok"?"a-ok":"a-err")},authMsg.t),
      h("span",{className:"auth-lbl"},"E-post"),
      h("input",{className:"auth-input",type:"email",value:email,onChange:e=>setEmail(e.target.value),placeholder:"din@epost.se",onKeyDown:e=>e.key==="Enter"&&(authMode==="login"?signIn():signUp())}),
      h("span",{className:"auth-lbl"},"Password"),
      h("input",{className:"auth-input",type:"password",value:pass,onChange:e=>setPass(e.target.value),placeholder:"Minst 6 tecken",onKeyDown:e=>e.key==="Enter"&&(authMode==="login"?signIn():signUp())}),
      h("button",{className:"auth-btn",disabled:authBusy||!email||!pass,onClick:authMode==="login"?signIn:signUp},authBusy?"Please wait…":authMode==="login"?"Logga in":"Skapa konto")
    )
  );

  // ── MAIN APP ──────────────────────────────────────────────────────
  return h(F,null,
    // Toast notifications
    h("div",{className:"toast-wrap"},
      toasts.map(t=>h("div",{key:t.id,className:`toast toast-${t.type}`,onClick:()=>removeToast(t.id)},
        h("span",null,t.type==="err"?"❌":t.type==="ok"?"✅":t.type==="warn"?"⚠️":"ℹ️"),
        h("span",{style:{flex:1}},t.msg),
        h("span",{style:{opacity:.4,fontSize:".8rem",cursor:"pointer"}},"✕")
      ))
    ),

    xpPop&&h("div",{className:"xp-pop",key:xpPop.k},xpPop.lbl),

    // Language sheet
    showLang&&h("div",{className:"overlay",onClick:()=>setShowLang(false)},
      h("div",{className:"sheet",onClick:e=>e.stopPropagation()},
        h("div",{className:"handle"}),
        h("div",{className:"sh-title"},"🌍 Choose language"),
        h("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}},
          LANGS.map(l=>h("button",{key:l,style:{padding:"12px",background:lang===l?"#FFFBEB":"#F8FAFF",border:"1.5px solid "+(lang===l?"#F0C84A":"#E3E8F5"),borderRadius:13,cursor:"pointer",fontFamily:"Inter,sans-serif",fontSize:".85rem",fontWeight:600,color:lang===l?"#D4A017":"#0D1137"},onClick:()=>{setLang(l);S.set("lm_lang",l);setShowLang(false)}},l))
        )
      )
    ),

    // Upgrade modal
    showUpgrade&&h("div",{className:"overlay",onClick:()=>setShowUpgrade(false)},
      h("div",{className:"sheet",onClick:e=>e.stopPropagation()},
        h("div",{className:"handle"}),
        h("div",{className:"upgrade-box"},
          h("div",{style:{fontSize:48,marginBottom:12}},"🚀"),
          h("div",{style:{fontFamily:"Syne,sans-serif",fontSize:"1.3rem",color:"#F0C84A",marginBottom:8}},"Upgrade Luxori"),
          h("div",{style:{fontSize:".85rem",color:"rgba(255,255,255,.7)",marginBottom:16,lineHeight:1.6}},"You've used all "+FREE_DAILY_LIMIT+" free messages for today."),
          h("div",{style:{display:"flex",flexDirection:"column",gap:8}},
            h("div",{style:{background:"rgba(255,255,255,.06)",borderRadius:14,padding:"14px 16px",border:"1px solid rgba(255,255,255,.1)"}},
              h("div",{style:{fontSize:".95rem",fontWeight:700,color:"#F0C84A"}},"Student — 79 kr/month"),
              h("div",{style:{fontSize:".78rem",color:"rgba(255,255,255,.5)",marginTop:4}},"100 hours/month")
            ),
            h("div",{style:{background:"rgba(240,200,74,.15)",borderRadius:14,padding:"14px 16px",border:"2px solid rgba(240,200,74,.3)"}},
              h("div",{style:{fontSize:".95rem",fontWeight:700,color:"#F0C84A"}},"Unlimited — 199 kr/month"),
              h("div",{style:{fontSize:".78rem",color:"rgba(255,255,255,.5)",marginTop:4}},"Unlimited forever")
            )
          )
        ),
        h("p",{style:{fontSize:".8rem",color:"#6B74A2",textAlign:"center",marginTop:16,marginBottom:4}},"Betalning via Stripe — lanseras snart"),
        h("button",{className:"btn-s",style:{width:"100%"},onClick:()=>setShowUpgrade(false)},"Close")
      )
    ),

    h("div",{className:"app"},
      // Offline banner
      !isOnline&&h("div",{className:"offline-banner"},"📵 Ingen uppkoppling — kontrollera internet"),

      // Top bar
      h("div",{className:"top"},
        h("div",{className:"top-brand"},"Luxori"),
        h("div",{className:"top-chips"},
          h("button",{className:"chip chip-indigo",onClick:()=>setShowLang(true)},lang.slice(0,3)),
          active&&["lesson","dual","chat","subject"].includes(tab)&&
            h("button",{className:"chip",style:{background:active.color+"18",border:"1px solid "+active.color+"44",color:active.color,fontSize:".68rem"}},active.name.slice(0,10)),
          h("button",{className:"chip chip-gold",onClick:()=>setTab("profile")},"⚡ "+xp)
        )
      ),

      // ── SUBJECTS ─────────────────────────────────────────────────
      tab==="subjects"&&h("div",{className:"page"},
        h("div",{className:"page-title"},"My Subjects"),
        h("div",{className:"page-sub"},"Upload your material, Luxori teaches the rest"),
        h("div",{className:"new-card",onClick:()=>setShowNewSub(true)},
          h("div",{style:{width:48,height:48,borderRadius:14,background:"linear-gradient(135deg,#F0C84A,#E07D2A)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0,boxShadow:"0 4px 16px rgba(240,200,74,.3)"}},"+"),
          h("div",null,h("div",{style:{fontWeight:700,color:"#D4A017",fontSize:".96rem"}},"New Subject"),h("div",{style:{fontSize:".74rem",color:"#6B74A2",marginTop:2}},"PDF · video · images · notes"))
        ),
        subjects.length===0&&h("div",{style:{textAlign:"center",padding:"52px 20px"}},
          h("div",{style:{fontSize:64,opacity:.07,marginBottom:12}},"📚"),
          h("div",{style:{fontWeight:700,color:"#6B74A2"}},"No subjects yet"),
          h("div",{style:{fontSize:".78rem",color:"#9ca3af",marginTop:6}},"Create a subject and upload your study material")
        ),
        subjects.map(s=>{
          const mp=masteryPct[s.id]||0;
          return h("div",{key:s.id,className:"subj-card",style:{borderLeft:"3px solid "+s.color},onClick:()=>{setActive(s);setTab("subject")}},
            h("div",{style:{width:50,height:50,borderRadius:14,background:s.color+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0}},s.emoji),
            h("div",{style:{flex:1,minWidth:0}},
              h("div",{style:{fontWeight:700,fontSize:".95rem",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:3}},s.name),
              h("div",{style:{fontSize:".72rem",color:"#6B74A2"}},(s.materials?.length||0)+" material · "+(s.sessions||0)+" lessons")
            ),
            h(MasteryRing,{value:mp,size:46,color:s.color})
          );
        })
      ),

      // ── SUBJECT DETAIL ────────────────────────────────────────────
      tab==="subject"&&active&&h(F,null,
        h("div",{style:{padding:"11px 15px",background:"#fff",borderBottom:"1px solid #E3E8F5",flexShrink:0}},
          h("button",{className:"back-btn",onClick:()=>setTab("subjects")},"‹ Subjects"),
          h("div",{style:{display:"flex",alignItems:"center",gap:12,marginTop:8,marginBottom:10}},
            h("div",{style:{width:52,height:52,borderRadius:15,background:active.color+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,flexShrink:0}},active.emoji),
            h("div",{style:{flex:1}},
              h("div",{"data-nid":active?.id,"data-nnm":active?.name,style:{fontFamily:"Syne,sans-serif",fontSize:"1.15rem",letterSpacing:"-.3px"}},active.name),
              h("div",{style:{fontSize:".73rem",color:"#6B74A2",marginTop:2}},(active.materials?.length||0)+" material · "+(active.sessions||0)+" lessons")
            ),
            h(MasteryRing,{value:masteryPct[active.id]||0,size:56,color:active.color})
          ),
          h("div",null,
            h("span",{className:"tag",style:{background:active.color+"18",color:active.color,border:"1px solid "+active.color+"44"}},"Mastery "+(masteryPct[active.id]||0)+"%"),
            h("button",{className:"tag",style:{background:"#fee2e2",color:"#EF4444",border:"none",cursor:"pointer"},onClick:()=>setShowDel(active.id)},"Delete")
          )
        ),
        h("div",{className:"page"},
          // Mastery breakdown
          (()=>{
            const md=mastery.get(active.id);
            const concepts=Object.entries(md.concepts||{});
            if(!concepts.length)return null;
            return h("div",{style:{background:"#F8FAFF",border:"1px solid #E3E8F5",borderRadius:14,padding:14,marginBottom:16}},
              h("div",{className:"sec-title",style:{margin:"0 0 10px"}},"Knowledge level by area"),
              h("div",{className:"mastery-concepts"},
                concepts.slice(0,5).map(([k,v])=>h("div",{key:k,className:"concept-row"},
                  h("div",{style:{fontSize:".75rem",width:"45%",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},k),
                  h("div",{className:"concept-bar"},h("div",{className:"concept-fill",style:{width:v+"%",background:v>=70?"#10B981":v>=40?"#F0C84A":"#F87171"}})),
                  h("div",{style:{fontSize:".72rem",fontWeight:700,color:"#6B74A2",width:32,textAlign:"right"}},v+"%")
                ))
              )
            );
          })(),

          h("div",{className:"sec-title"},"Difficulty"),
          h("div",{className:"lvl-grid"},
            LEVELS.map(l=>h("div",{key:l.id,className:"lvl "+(lessonLevel===l.id?"on":""),onClick:()=>setLessonLevel(l.id)},
              h("div",{style:{fontSize:".85rem",fontWeight:700,marginBottom:2,color:lessonLevel===l.id?"#D4A017":undefined}},l.l),
              h("div",{style:{fontSize:".7rem",color:"#6B74A2"}},l.d)
            ))
          ),
          h("div",{className:"sec-title"},"Start Learning"),
          h("button",{className:"mode-btn",disabled:!hasMats,onClick:()=>{setTab("lesson");if(lState==="idle")initLuxori()}},
            h("div",{className:"mode-ic",style:{background:"#FFFBEB"}},"🎓"),
            h("div",{style:{flex:1}},h("div",{style:{fontWeight:700,fontSize:".95rem",marginBottom:3}},"Luxori-lektion"),h("div",{style:{fontSize:".78rem",color:"#6B74A2"}},"One AI tutor · voice + text")),
            h("div",{style:{color:"#C4CCEE",fontSize:20}},"›")
          ),
          h("button",{className:"mode-btn",disabled:!hasMats,onClick:()=>{setTab("dual");if(dState==="idle")initDual()}},
            h("div",{className:"mode-ic",style:{background:"#EEF2FF"}},"🤖"),
            h("div",{style:{flex:1}},h("div",{style:{fontWeight:700,fontSize:".95rem",marginBottom:3}},"Atlas + Spark"),h("div",{style:{fontSize:".78rem",color:"#6B74A2"}},"Two AI tutors · explains + challenges")),
            h("div",{style:{color:"#C4CCEE",fontSize:20}},"›")
          ),
          h("button",{className:"mode-btn",disabled:!hasMats,onClick:()=>{setTab("chat");if(!cSum&&!cSumLoad)initChat()}},
            h("div",{className:"mode-ic",style:{background:"#f0fdf4"}},"💬"),
            h("div",{style:{flex:1}},h("div",{style:{fontWeight:700,fontSize:".95rem",marginBottom:3}},"Chatt"),h("div",{style:{fontSize:".78rem",color:"#6B74A2"}},"Ask anything · voice input")),
            h("div",{style:{color:"#C4CCEE",fontSize:20}},"›")
          ),
          !hasMats&&h("div",{className:"info-box info-warn"},"⚠️ Upload material to start a lesson."),

          h("div",{className:"sec-title"},"Material ("+(active.materials?.length||0)+")"),
          h("button",{className:"add-mat-btn",onClick:()=>setShowAddMat(true)},"+ Add material — PDF, text, bild, video"),

          (active.materials||[]).filter(m=>m.kind==="video").map(m=>{
            const url=(m.text||"").split("\n").find(l=>l.includes("[Video URL]"))?.replace("[Video URL] ","")||"";
            const hasTranscript=m.text.includes("[Video Transcript]");
            return h("div",{key:m.id,style:{marginBottom:12}},
              h("div",{style:{fontSize:".74rem",fontWeight:600,color:"#6B74A2",marginBottom:6,display:"flex",alignItems:"center",gap:6}},
                m.name,hasTranscript&&h("span",{style:{padding:"2px 8px",background:"#d1fae5",color:"#065f46",borderRadius:20,fontSize:".65rem",fontWeight:700}},"✓ Transkript")
              ),
              url&&h(VideoPlayer,{url}),
              !hasTranscript&&h("div",{style:{fontSize:".72rem",color:"#9ca3af",marginBottom:4}},"No transcript — AI cannot learn from this video"),
              h("button",{style:{background:"none",border:"none",cursor:"pointer",opacity:.3,fontSize:13,padding:"2px 6px"},onClick:()=>delMat(m.id)},"Delete")
            );
          }),
          (active.materials||[]).filter(m=>m.kind!=="video").map(m=>h("div",{key:m.id,className:"mat-row"},
            h("span",{style:{fontSize:22,flexShrink:0}},m.kind==="image"?"🖼️":"📄"),
            h("div",{style:{flex:1,minWidth:0}},
              h("div",{style:{fontSize:".85rem",fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},m.name),
              h("div",{style:{fontSize:".71rem",color:"#6B74A2"}},m.kind==="text"?(m.text?.length||0)+" tecken":m.kind)
            ),
            m.kind==="image"&&h("span",{style:{fontSize:".65rem",padding:"2px 7px",background:"#EEF2FF",color:"#4F46E5",borderRadius:20,fontWeight:700}},"AI ser ✓"),
            h("button",{style:{background:"none",border:"none",cursor:"pointer",opacity:.25,fontSize:15,padding:"4px 8px"},onClick:()=>delMat(m.id)},"✕")
          ))
        )
      ),

      // ── LESSONS ───────────────────────────────────────────────────
      tab==="lesson"&&active&&h("div",{className:"lesson-page"},
        h("div",{className:"lesson-hdr"},
          h("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}},
            h("button",{className:"back-btn",onClick:()=>{window.speechSynthesis?.cancel();setLState("idle");setTab("subject")}},"‹ Subjects"),
            h("span",{style:{fontSize:".72rem",color:"#6B74A2"}},active.name)
          ),
          h("div",{style:{display:"flex",alignItems:"center",gap:8}},
            h("div",{style:{padding:"4px 12px",background:"#FFFBEB",border:"1px solid #F0C84A44",borderRadius:20,fontSize:".72rem",fontWeight:700,color:"#D4A017"}},"🎓 Luxori"),
            h("div",{style:{marginLeft:"auto"}},h(MasteryRing,{value:masteryPct[active.id]||0,size:28,color:active.color||"#D4A017"})),
            h("button",{style:{padding:"4px 10px",borderRadius:20,fontSize:".7rem",background:"#F8FAFF",border:"1px solid #E3E8F5",color:"#6B74A2",cursor:"pointer",fontFamily:"Inter,sans-serif"},onClick:()=>window.speechSynthesis?.cancel()},"Stop voice")
          ),
          h(SpeedRow,{speechRate,setSpeechRate})
        ),
        (lState==="loading"||lSumLoad)&&h(WherePanel,{loading:lSumLoad||"Reading material…"}),
        (lState==="start"||lState==="returning")&&!lSumLoad&&h(WherePanel,{summary:lSum,concepts:lCon,isReturning:lState==="returning",onStart:startLuxori}),
        lState==="active"&&h(MsgList,{msgs:lMsgs,loading:lLoad,loadingRole:"luxori",onSend:sendLuxori,showHints:true,langCode,speechRate})
      ),

      tab==="dual"&&active&&h("div",{className:"lesson-page"},
        h("div",{className:"lesson-hdr"},
          h("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}},
            h("button",{className:"back-btn",onClick:()=>{window.speechSynthesis?.cancel();setDState("idle");setTab("subject")}},"‹ Subjects"),
            h("span",{style:{fontSize:".72rem",color:"#6B74A2"}},active.name)
          ),
          h("div",{style:{display:"flex",gap:6,alignItems:"center"}},
            h("div",{style:{padding:"4px 10px",background:"#EEF2FF",borderRadius:20,fontSize:".72rem",fontWeight:700,color:"#4F46E5"}},"Atlas"),
            h("span",{style:{color:"#E3E8F5"}},"+"),
            h("div",{style:{padding:"4px 10px",background:"#fff1f2",borderRadius:20,fontSize:".72rem",fontWeight:700,color:"#E11D48"}},"Spark"),
            h("div",{style:{marginLeft:"auto"}},h(MasteryRing,{value:masteryPct[active.id]||0,size:28,color:active.color||"#D4A017"})),
            h("button",{style:{padding:"4px 10px",borderRadius:20,fontSize:".7rem",background:"#F8FAFF",border:"1px solid #E3E8F5",color:"#6B74A2",cursor:"pointer",fontFamily:"Inter,sans-serif"},onClick:()=>window.speechSynthesis?.cancel()},"Stop voice")
          ),
          h(SpeedRow,{speechRate,setSpeechRate})
        ),
        (dState==="loading"||dSumLoad)&&h(WherePanel,{loading:dSumLoad||"Reading material…"}),
        (dState==="start"||dState==="returning")&&!dSumLoad&&h(WherePanel,{summary:dSum,concepts:dCon,isReturning:dState==="returning",onStart:startDual}),
        dState==="active"&&h(MsgList,{msgs:dMsgs,loading:!!dLoad,loadingRole:dLoad||"atlas",onSend:sendDual,showHints:true,langCode,speechRate})
      ),

      tab==="chat"&&active&&h("div",{className:"lesson-page"},
        h("div",{className:"lesson-hdr"},
          h("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center"}},
            h("button",{className:"back-btn",onClick:()=>setTab("subject")},"‹ Subjects"),
            h("span",{style:{fontSize:".72rem",color:"#6B74A2"}},active.name)
          ),
          h("div",{style:{fontSize:".74rem",color:"#6B74A2",marginTop:5}},"Ask anything — Luxori answers from your material")
        ),
        h("div",{className:"msgs-area"},
          cSumLoad&&h("div",{style:{display:"flex",gap:8,alignItems:"center",color:"#6B74A2",fontSize:".84rem"}},h("div",{className:"spin",style:{width:16,height:16}}),"Reading material…"),
          cSum&&cMsgs.length===0&&h("div",{className:"sum-box"},
            h("div",{style:{fontSize:".68rem",fontWeight:700,color:"#D4A017",letterSpacing:".8px",textTransform:"uppercase",marginBottom:8}},"SAMMANFATTNING"),
            h("div",{style:{fontSize:".88rem",lineHeight:1.75},dangerouslySetInnerHTML:{__html:hl(cSum)}}),
            h("div",{style:{display:"flex",flexWrap:"wrap",gap:5,marginTop:10}},
              ["What's on the test?","Nyckelkoncept","Give an exampleprov","What should I focus on?"].map(q=>h("button",{key:q,className:"hint",onClick:()=>sendChat(q)},q))
            )
          ),
          cMsgs.map((m,i)=>h("div",{key:m.id||i,className:"msg-block"},
            m.role!=="user"&&h("div",{className:"msg-who",style:{color:"#D4A017"}},"LUXORI"),
            h("div",{className:"msg-row"+(m.role==="user"?" usr":"")},
              m.role!=="user"&&h("div",{className:"av av-L"},"L"),
              m.role==="user"&&h("div",{className:"av av-U"},"U"),
              h("div",{className:"bub "+(m.role==="user"?"bub-U":"bub-L"),dangerouslySetInnerHTML:{__html:hl(m.text)}})
            )
          )),
          cLoad&&h("div",{className:"msg-block"},
            h("div",{className:"msg-who",style:{color:"#D4A017"}},"LUXORI thinking…"),
            h("div",{className:"msg-row"},
              h("div",{className:"av av-L"},"L"),
              h("div",{className:"typing",style:{background:"#FFFBEB",border:"1px solid #F0C84A44"}},
                [0,1,2].map(j=>h("div",{key:j,className:"dp",style:{background:"#D4A017"}}))
              )
            )
          ),
          h("div",{ref:cEndRef})
        ),
        h("div",{className:"inp-area"},
          h("div",{className:"inp-row"},
            h("button",{className:"mic-btn"+(chatMicOn?" on":""),onClick:()=>{unlockVoice();startChatMic()}},chatMicOn?"⏹":"🎙"),
            h("textarea",{className:"txt-inp",value:cInp,onChange:e=>setCInp(e.target.value),onKeyDown:e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendChat(cInp);setCInp("")}},placeholder:"Ask about your material…",disabled:cLoad,rows:1}),
            h("button",{className:"send-btn",onClick:()=>{sendChat(cInp);setCInp("")},disabled:cLoad||!cInp.trim()},"→")
          )
        )
      ),

      ["lesson","dual","chat"].includes(tab)&&!active&&h("div",{className:"loading-center"},
        h("div",{style:{fontSize:48,opacity:.15}},"📚"),
        h("div",{style:{fontWeight:700,color:"#6B74A2"}},"No subject selected"),
        h("button",{className:"btn-s",style:{marginTop:10},onClick:()=>setTab("subjects")},"Go to subjects")
      ),

      // ── GAMES ─────────────────────────────────────────────────────
      tab==="games"&&h("div",{className:"page"},
        h("div",{className:"page-title"},"Spel"),
        h("div",{className:"page-sub"},active?active.name:"Choose a subject"),
        !active&&h("div",{className:"loading-center",style:{padding:"40px 0"}},
          h("div",{style:{fontSize:48,opacity:.15}},"🎮"),
          h("button",{className:"btn-s",style:{marginTop:14},onClick:()=>setTab("subjects")},"Go to subjects")
        ),
        active&&gameMode==="menu"&&h("div",null,
          h("div",{className:"sec-title"},"Choose game"),
          h("button",{className:"mode-btn",onClick:()=>{setGameMode("flash");genFlashcards()}},
            h("div",{className:"mode-ic",style:{background:"#FFFBEB",fontSize:26}},"🃏"),
            h("div",{style:{flex:1}},h("div",{style:{fontWeight:700,fontSize:".95rem",marginBottom:3}},"Flashcards"),h("div",{style:{fontSize:".78rem",color:"#6B74A2"}},"Flip cards · learn key concepts"))
          ),
          h("button",{className:"mode-btn",onClick:()=>{setGameMode("speed");genSpeedQuiz()}},
            h("div",{className:"mode-ic",style:{background:"#fff1f2",fontSize:26}},"⚡"),
            h("div",{style:{flex:1}},h("div",{style:{fontWeight:700,fontSize:".95rem",marginBottom:3}},"Snabbquiz"),h("div",{style:{fontSize:".78rem",color:"#6B74A2"}},"10 questions · how fast can you answer?"))
          ),
          h("button",{className:"mode-btn",onClick:()=>{setGameMode("quiz");setTab("quiz")}},
            h("div",{className:"mode-ic",style:{background:"#EEF2FF",fontSize:26}},"🎯"),
            h("div",{style:{flex:1}},h("div",{style:{fontWeight:700,fontSize:".95rem",marginBottom:3}},"Provquiz"),h("div",{style:{fontSize:".78rem",color:"#6B74A2"}},"Full exam with explanations"))
          )
        ),

        active&&gameMode==="flash"&&h("div",null,
          h("button",{className:"btn-s",style:{marginBottom:14},onClick:()=>setGameMode("menu")},"‹ Spel"),
          flashLoad&&h("div",{className:"loading-center"},h("div",{className:"spin",style:{width:32,height:32,borderWidth:3}}),h("div",{style:{color:"#6B74A2"}},"Genererar flashcards…")),
          flashCards?.error&&h("div",{className:"info-box info-warn"},flashCards.error),
          flashCards?.cards&&h("div",null,
            h("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}},
              h("span",{style:{fontSize:".82rem",color:"#6B74A2"}},(flashIdx+1)+" / "+flashCards.cards.length),
              h("span",{style:{fontSize:".82rem",fontWeight:700,color:"#10B981"}},"Kunde: "+flashKnown),
              h("button",{className:"btn-s",style:{fontSize:".76rem",padding:"6px 12px"},onClick:()=>{setFlashIdx(0);setFlashFlipped(false);setFlashKnown(0)}},lang==="Svenska"?"🔄 Starta om":"🔄 Restart"),h("button",{style:{fontSize:".76rem",padding:"6px 10px",background:"#4F46E5",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontWeight:600},onClick:()=>{setFlashCards(null);genFlashcards()}},lang==="Svenska"?"➕ Nya kort":"➕ New cards")
            ),
            h("div",{style:{height:6,background:"#F3F5FF",borderRadius:3,marginBottom:18,overflow:"hidden"}},
              h("div",{style:{height:"100%",background:"linear-gradient(90deg,#F0C84A,#E07D2A)",borderRadius:3,width:((flashIdx+1)/flashCards.cards.length*100)+"%",transition:"width .3s"}})
            ),
            h("div",{className:"flash-card",style:{background:flashFlipped?"#FFFBEB":"#F8FAFF",border:"2px solid "+(flashFlipped?"#F0C84A":"#E3E8F5")},onClick:()=>setFlashFlipped(f=>!f)},
              h("div",{style:{fontSize:".68rem",fontWeight:700,color:"#6B74A2",letterSpacing:".8px",textTransform:"uppercase",marginBottom:14}},flashFlipped?"SVAR":"CONCEPT — tap to reveal"),
              h("div",{style:{fontSize:"1.1rem",fontWeight:600,lineHeight:1.65}},flashFlipped?flashCards.cards[flashIdx].back:flashCards.cards[flashIdx].front)
            ),
            flashFlipped&&h("div",{style:{display:"flex",gap:10}},
              h("button",{style:{flex:1,padding:13,background:"#fee2e2",border:"1px solid #fca5a5",borderRadius:14,color:"#EF4444",fontFamily:"Inter,sans-serif",fontWeight:700,cursor:"pointer"},onClick:()=>{setFlashFlipped(false);if(flashIdx+1<flashCards.cards.length)setFlashIdx(i=>i+1);else{const p=mastery.afterFlash(active.id,flashCards.cards.length,flashKnown);updateMasteryPct(active.id,p);addXP(10,"+10 XP");setGameMode("menu")}}},"✗ Kunde inte"),
              h("button",{style:{flex:1,padding:13,background:"#d1fae5",border:"1px solid #6ee7b7",borderRadius:14,color:"#059669",fontFamily:"Inter,sans-serif",fontWeight:700,cursor:"pointer"},onClick:()=>{setFlashKnown(k=>k+1);setFlashFlipped(false);if(flashIdx+1<flashCards.cards.length)setFlashIdx(i=>i+1);else{const known=flashKnown+1;const p=mastery.afterFlash(active.id,flashCards.cards.length,known);updateMasteryPct(active.id,p);addXP(20,"+20 XP 🏆");}}},"✓ Kunde!")
            ),
            !flashFlipped&&h("div",{style:{textAlign:"center",color:"#9ca3af",fontSize:".75rem",marginTop:8}},"Tap card to reveal answer")
          )
        ),

        active&&gameMode==="speed"&&h("div",null,
          h("button",{className:"btn-s",style:{marginBottom:14},onClick:()=>setGameMode("menu")},"‹ Spel"),
          speedLoad&&h("div",{className:"loading-center"},h("div",{className:"spin",style:{width:32,height:32,borderWidth:3}}),h("div",{style:{color:"#6B74A2"}},"Genererar quiz…")),
          speedQ?.error&&h("div",{className:"info-box info-warn"},speedQ.error),
          speedQ?.questions&&!speedDone&&h("div",null,
            h("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}},
              h("span",{style:{fontSize:".82rem",color:"#6B74A2"}},(speedIdx+1)+" / "+speedQ.questions.length),
              h("span",{style:{fontSize:".9rem",fontWeight:800,color:"#D4A017"}},speedScore+" p")
            ),
            h("div",{style:{height:6,background:"#F3F5FF",borderRadius:3,marginBottom:16,overflow:"hidden"}},
              h("div",{style:{height:"100%",background:"linear-gradient(90deg,#F0C84A,#E07D2A)",borderRadius:3,width:(speedIdx/speedQ.questions.length*100)+"%",transition:"width .3s"}})
            ),
            h("div",{style:{background:"#fff",border:"1px solid #E3E8F5",borderRadius:18,padding:"22px 17px",marginBottom:16,minHeight:80,display:"flex",alignItems:"center",justifyContent:"center",textAlign:"center",boxShadow:"0 2px 20px rgba(0,0,0,.05)"}},
              h("div",{style:{fontSize:"1rem",fontWeight:600,lineHeight:1.65}},speedQ.questions[speedIdx].q)
            ),
            h("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}},
              speedQ.questions[speedIdx].options.map((opt,i)=>{
                const q=speedQ.questions[speedIdx];
                const isCorrect=q.answer!==undefined ? i===q.answer : opt===q.correct;
                const isSelected=speedAns===opt;
                let bg="#fff",border="1px solid #E3E8F5",color="#0D1137";
                if(speedAns!==null){if(isCorrect){bg="#d1fae5";border="2px solid #10B981";color="#065f46";}else if(isSelected){bg="#fee2e2";border="2px solid #EF4444";color="#991b1b";}}
                const feedbackIcon=speedAns!==null?(isCorrect?"✓":(isSelected?"✗":"")):"";
                return h("button",{key:i,style:{padding:"14px 10px",background:bg,border,borderRadius:14,cursor:speedAns!==null?"default":"pointer",fontFamily:"Inter,sans-serif",fontSize:".86rem",fontWeight:500,color,lineHeight:1.5,textAlign:"center",transition:"all .15s"},onClick:()=>answerSpeed(opt,i)},opt);
              })
            )
          ),
          speedQ?.questions&&speedDone&&h("div",{style:{textAlign:"center",padding:"36px 20px"}},
            h("div",{style:{fontSize:60,marginBottom:16}},speedScore>=8?"🏆":speedScore>=5?"⭐":"📚"),
            h("div",{style:{fontFamily:"Syne,sans-serif",fontSize:"1.5rem",color:"#D4A017",marginBottom:6,letterSpacing:"-.3px"}},speedScore>=8?"Excellent!":speedScore>=5?"Well done!":"Keep practicing!"),
            h("div",{style:{color:"#6B74A2",fontSize:".88rem",marginBottom:22}},speedScore+" / "+speedQ.questions.length+" correct"),
            h("div",{style:{display:"flex",gap:10,justifyContent:"center"}},
              h("button",{className:"btn-s",onClick:()=>{genSpeedQuiz();setSpeedDone(false)}},lang==="Svenska"?"🔄 Spela igen":"🔄 Play again"),h("button",{style:{padding:"12px 16px",background:"#4F46E5",color:"#fff",border:"none",borderRadius:10,cursor:"pointer",fontWeight:600},onClick:()=>{setSpeedQ(null);setSpeedDone(false);genSpeedQuiz()}},lang==="Svenska"?"➕ More questions":"➕ More questions"),
              h("button",{className:"btn-g",style:{width:"auto",padding:"12px 22px"},onClick:()=>setGameMode("menu")},"Tillbaka")
            )
          )
        )
      ),

      // ── QUIZ ──────────────────────────────────────────────────────
      tab==="quiz"&&h("div",{className:"page"},
        h("div",{style:{display:"flex",alignItems:"center",gap:10,marginBottom:14}},
          h("button",{className:"back-btn",onClick:()=>{setGameMode("menu");setTab("games")}},"‹ Spel"),
          h("div",{className:"page-title",style:{margin:0}},"Provquiz")
        ),
        h("div",{className:"page-sub"},active?active.name:"Choose a subject"),
        active?h(F,null,
          h("div",{className:"lvl-grid"},LEVELS.map(l=>h("div",{key:l.id,className:"lvl "+(qLvl===l.id?"on":""),onClick:()=>setQLvl(l.id)},h("div",{style:{fontSize:".85rem",fontWeight:700,marginBottom:2,color:qLvl===l.id?"#D4A017":undefined}},l.l),h("div",{style:{fontSize:".7rem",color:"#6B74A2"}},l.d)))),
          h("button",{className:"btn-g",style:{marginBottom:14},disabled:qLoad||!hasMats,onClick:()=>genQuiz(qLvl)},qLoad?"Genererar…":"Generera prov"),
          !hasMats&&h("div",{className:"info-box info-warn"},"Upload material first"),
          qLoad&&h("div",{style:{display:"flex",gap:8,alignItems:"center",color:"#6B74A2",fontSize:".84rem",marginBottom:12}},h("div",{className:"spin",style:{width:18,height:18}}),"Generating quiz…"),
          qData?.error&&h("div",{className:"info-box info-warn"},qData.error),
          (qData?.questions||[]).map((q,qi)=>h("div",{key:qi,className:"q-card"},
            h("div",{style:{fontSize:".7rem",color:"#4F46E5",marginBottom:8,fontWeight:600}},q.source||active.name),
            h("div",{style:{fontWeight:600,marginBottom:11,fontSize:".9rem",lineHeight:1.7}},(qi+1)+". "+q.q),
            q.options.map((o,oi)=>{
              let c="opt";
              if(qAns[qi]===oi)c+=" sel";
              if(qDone){if(oi===q.answer)c="opt ok";else if(qAns[qi]===oi)c="opt no"}
              return h("div",{key:oi,className:c,onClick:()=>{if(!qDone)setQAns(p=>({...p,[qi]:oi}))}},h("span",{style:{opacity:.4,flexShrink:0}},["A","B","C","D"][oi]+". "),o);
            }),
            qDone&&h("div",{className:"expl"},q.explanation)
          )),
          qData?.questions&&h("div",null,
            qDone&&h("div",{style:{background:"linear-gradient(135deg,#F0EFFE,#EEF2FF)",borderRadius:14,padding:"14px 16px",marginBottom:14}},
              h("div",{style:{fontSize:"1.1rem",fontWeight:700,color:"#4F46E5",marginBottom:4}},
                qData._score!==undefined?(qData._score+"/"+(qData._total||6)+" correct — "+qData._pct+"%"):"Done!"
              ),
              h("div",{style:{fontSize:".85rem",color:"#374151",marginTop:6}},
                qData._pct>=80?"🏆 Excellent! You have a strong understanding of this material."
                :qData._pct>=60?"👍 Good effort! Review the questions you got wrong below."
                :qData._pct>=40?"📖 Keep studying! Focus on the highlighted explanations."
                :"💡 No worries — read through the explanations and try again."
              )
            ),
            h("div",{style:{display:"flex",gap:8,marginBottom:16}},
            !qDone
              ?h("button",{className:"btn-g",style:{flex:1},onClick:submitQuiz,disabled:Object.keys(qAns).length<qData.questions.length},"Check answers")
            )
              :h(F,null,h("button",{className:"btn-s",onClick:()=>{setQDone(false);setQAns({})}},lang==="Svenska"?"🔄 Try again":"🔄 Try again"),h("button",{style:{flex:1,padding:"12px",background:"#4F46E5",color:"#fff",border:"none",borderRadius:10,cursor:"pointer",fontWeight:600},onClick:()=>{setQData(null);setQAns({});setQDone(false);genQuiz(qLvl)}},lang==="Svenska"?"➕ More questions":"➕ More questions"),h("button",{className:"btn-g",style:{flex:1},onClick:()=>genQuiz(qLvl)},lang==="Svenska"?"Nytt prov":"New quiz"))
          )
        ):h("div",{style:{textAlign:"center",padding:"48px 20px"}},h("button",{className:"btn-s",onClick:()=>setTab("subjects")},"Go to subjects"))
      ),

      // ── PROFILE ───────────────────────────────────────────────────
      tab==="profile"&&h("div",{className:"page"},
        h("div",{className:"page-title"},"Profil"),
        h("div",{style:{background:"linear-gradient(135deg,#FFFBEB,#FFF8D6)",border:"1px solid #F0C84A44",borderRadius:20,padding:20,marginBottom:18,display:"flex",alignItems:"center",gap:16}},
          h("div",{style:{fontSize:"3rem",lineHeight:1}},xp>=2000?"🎓":xp>=1000?"🏅":xp>=500?"📖":"🌱"),
          h("div",{style:{flex:1}},
            h("div",{style:{fontFamily:"Syne,sans-serif",fontSize:"1.2rem",color:"#D4A017",letterSpacing:"-.3px"}},lvlLabel(xp)),
            h("div",{style:{fontSize:".74rem",color:"#6B74A2",marginTop:3}},xp+" XP totalt"),
            h("div",{className:"prog-bar"},h("div",{className:"prog-fill",style:{width:Math.min(100,(xp%500)/5)+"%"}})),
            h("div",{style:{fontSize:".68rem",color:"#9ca3af",marginTop:4}},500-(xp%500)+" XP to next level")
          )
        ),
        // Usage indicator
        h("div",{className:"usage-bar"},
          h("span",{style:{fontSize:".7rem",fontWeight:600}},"Today:"),
          h("div",{className:"usage-fill-wrap"},
            h("div",{className:"usage-fill",style:{width:(usageToday/FREE_DAILY_LIMIT*100)+"%",background:usageToday>40?"#EF4444":usageToday>30?"#F0C84A":"#10B981"}})
          ),
          h("span",null,usageToday+" / "+FREE_DAILY_LIMIT+" messages"),
          usageToday>=FREE_DAILY_LIMIT&&h("button",{style:{padding:"2px 8px",background:"linear-gradient(135deg,#F0C84A,#E07D2A)",border:"none",borderRadius:20,fontSize:".67rem",fontWeight:700,cursor:"pointer",color:"#000"},onClick:()=>setShowUpgrade(true)},"Upgrade")
        ),
        h("div",{className:"stat-grid"},
          [{n:xp,l:"Total XP"},{n:lessonCount,l:"Lessons"},{n:subjects.length,l:"Subjects"},{n:correctCount,l:"Correct answers"}]
            .map(item=>h("div",{key:item.l,className:"stat-card"},h("div",{className:"stat-n"},item.n),h("div",{className:"stat-l"},item.l)))
        ),
        subjects.length>0&&h("div",{style:{background:"#fff",border:"1px solid #E3E8F5",borderRadius:16,padding:16,marginBottom:16}},
          h("div",{className:"sec-title",style:{margin:"0 0 12px"}},"Mastery per subject"),
          subjects.map(s=>h("div",{key:s.id,style:{display:"flex",alignItems:"center",gap:10,marginBottom:10,cursor:"pointer"},onClick:()=>{setActive(s);setTab("subject")}},
            h("div",{style:{fontSize:18,flexShrink:0}},s.emoji),
            h("div",{style:{flex:1,minWidth:0}},
              h("div",{style:{fontSize:".82rem",fontWeight:600,marginBottom:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},s.name),
              h("div",{className:"concept-bar",style:{height:8}},h("div",{className:"concept-fill",style:{width:(masteryPct[s.id]||0)+"%",background:s.color||"#D4A017"}}))
            ),
            h("div",{style:{fontSize:".8rem",fontWeight:700,color:s.color||"#D4A017",flexShrink:0,width:36,textAlign:"right"}},(masteryPct[s.id]||0)+"%")
          ))
        ),
        h("div",{style:{background:"#fff",border:"1px solid #E3E8F5",borderRadius:16,padding:16}},
          h("div",{style:{fontWeight:700,fontSize:".85rem",marginBottom:12}},"Konto"),
          h("div",{style:{fontSize:".74rem",color:"#6B74A2",marginBottom:12}},user?.email),
          h("button",{className:"btn-s",style:{width:"100%",marginBottom:8,display:"block",textAlign:"left"},onClick:()=>setShowLang(true)},"🌍 Language: "+lang),
          h("button",{className:"btn-s",style:{width:"100%",marginBottom:8,display:"block",textAlign:"left"},onClick:()=>setShowUpgrade(true)},"🚀 Upgrade plan"),
          h("button",{className:"btn-r",style:{width:"100%",display:"block"},onClick:signOut},"Sign out")
        )
      ),

      // ── MODALS ────────────────────────────────────────────────────
      showNewSub&&h("div",{className:"overlay",onClick:()=>setShowNewSub(false)},
        h("div",{className:"sheet",onClick:e=>e.stopPropagation()},
          h("div",{className:"handle"}),
          h("div",{className:"sh-title"},"New Subject"),
          h("span",{className:"lbl"},"Namn"),
          h("input",{type:"text",value:subName,onChange:e=>setSubName(e.target.value),placeholder:"t.ex. Anatomi, Historia, Fysik…",autoFocus:true}),
          h("span",{className:"lbl"},"Ikon"),
          h("div",{className:"emoji-grid"},EMOJIS.map(e=>h("button",{key:e,className:"emj "+(subEmoji===e?"on":""),onClick:()=>setSubEmoji(e)},e))),
          h("span",{className:"lbl"},"Color"),
          h("div",{className:"clr-row"},COLORS.map(c=>h("button",{key:c,className:"clr "+(subColor===c?"on":""),style:{background:c},onClick:()=>setSubColor(c)}))),
          h("button",{className:"btn-g",disabled:!subName.trim(),onClick:createSub},"Create subject")
        )
      ),

      showAddMat&&h("div",{className:"overlay",onClick:()=>{if(!uploading&&!transcribing)setShowAddMat(false)}},
        h("div",{className:"sheet",onClick:e=>e.stopPropagation(),style:{maxHeight:"90vh"}},
          h("div",{className:"handle"}),
          h("div",{className:"sh-title"},"Add material"),
          h("div",{className:"tab-row"},
            [{id:"file",l:"📄 Fil"},{id:"paste",l:"✏️ Text"},{id:"video",l:"▶️ Video"}].map(t=>
              h("button",{key:t.id,className:"tb "+(matTab===t.id?"on":""),onClick:()=>setMatTab(t.id)},t.l)
            )
          ),
          matTab==="file"&&(uploading
            ?h("div",{className:"loading-center",style:{padding:"40px 0"}},h("div",{className:"spin",style:{width:36,height:36,borderWidth:3}}),h("div",{style:{fontWeight:600,color:"#D4A017"}},"Bearbetar fil…"),h("div",{style:{fontSize:".78rem",color:"#6B74A2",marginTop:6}},"Extracting text..."))
            :h(F,null,
              h("div",{className:"drop-zone",onClick:e=>{e.stopPropagation();fileRef.current?.click()}},
                h("div",{style:{fontSize:44,marginBottom:12}},"📁"),
                h("div",{style:{fontWeight:700,marginBottom:5,fontSize:".96rem"}},"Tap to upload"),
                h("div",{style:{fontSize:".78rem",color:"#6B74A2"}},"PDF · Image · Text — max 5MB"),
                h("input",{ref:fileRef,type:"file",multiple:true,accept:"image/*,.pdf,.txt,.md",style:{display:"none"},onChange:onFile})
              ),
              h("div",{className:"info-box info-tip",style:{marginTop:12}},"📷 Images & diagrams: AI can see them. PDF text extracted automatically."),
              h("div",{className:"info-box info-ok",style:{margin:"8px 0 0"}},"💡 Tip: For large books, paste key chapters in the Text tab.")
            )
          ),
          matTab==="paste"&&h(F,null,
            h("input",{type:"text",value:pasteN,onChange:e=>setPasteN(e.target.value),placeholder:"Namn (t.ex. Kapitel 3 — Celldelning)"}),
            h("textarea",{value:pasteT,onChange:e=>setPasteT(e.target.value),placeholder:"Paste your text here — from PDF, Word or website.",style:{minHeight:160}}),
            h("button",{className:"btn-g",disabled:!pasteT.trim(),onClick:addPaste},"Save text")
          ),
          matTab==="video"&&h(F,null,
            h("input",{type:"text",value:vidUrl,onChange:e=>setVidUrl(e.target.value),placeholder:"https://youtube.com/watch?v=…"}),
            vidUrl&&getYouTubeId(vidUrl)&&h("div",{style:{marginBottom:14}},
              h("div",{style:{fontSize:".73rem",color:"#10B981",marginBottom:7,fontWeight:600}},"✓ YouTube link — preview:"),
              h(VideoPlayer,{url:vidUrl})
            ),
            transcribing&&h("div",{className:"info-box info-tip",style:{display:"flex",alignItems:"center",gap:8}},h("div",{className:"spin",style:{width:16,height:16,flexShrink:0}}),"Fetching transcript..."),
            !transcribing&&h("div",{className:"info-box info-tip",style:{marginBottom:12}},"🎬 Luxori extracts the transcript so AI can teach from the video."),
            h("button",{className:"btn-g",disabled:!vidUrl.trim()||transcribing,onClick:addVid},transcribing?"Fetching transcript…":"Add video")
          )
        )
      ),

      showDel&&h("div",{className:"overlay",onClick:()=>setShowDel(null)},
        h("div",{className:"sheet",onClick:e=>e.stopPropagation()},
          h("div",{className:"handle"}),
          h("div",{style:{fontFamily:"Syne,sans-serif",fontSize:"1.1rem",color:"#EF4444",marginBottom:10}},"Delete subject?"),
          h("p",{style:{fontSize:".87rem",color:"#6B74A2",marginBottom:22,lineHeight:1.65}},"This permanently deletes the subject and all its material."),
          h("div",{style:{display:"flex",gap:8}},
            h("button",{className:"btn-s",style:{flex:1},onClick:()=>setShowDel(null)},"Cancel"),
            h("button",{className:"btn-r",style:{flex:1},onClick:()=>deleteSub(showDel)},"Delete")
          )
        )
      ),

      // ── NAV ───────────────────────────────────────────────────────
      h("div",{className:"nav"},
        NAV.map(n=>{
          const isOn=tab===n.id||(tab==="subject"&&n.id==="subjects")||(isGamesTab&&n.id==="games");
          return h("button",{key:n.id,className:"ni "+(isOn?"on":""),onClick:()=>{
            window.speechSynthesis?.cancel();
            if(n.id==="subjects")setTab(active&&tab!=="subjects"?"subject":"subjects");
            else if(n.id==="lesson"){if(active){setTab("lesson");if(lState==="idle")initLuxori();}else setTab("subjects")}
            else if(n.id==="dual"){if(active){setTab("dual");if(dState==="idle")initDual();}else setTab("subjects")}
            else if(n.id==="games"){setGameMode("menu");setTab("games");}
            else setTab(n.id);
          }},
            h("span",{className:"ni-ic"},n.ic),
            h("span",{className:"ni-lb"},n.lb),
            n.id==="lesson"&&lState==="active"&&h("div",{className:"ni-dot"}),
            n.id==="dual"&&dState==="active"&&h("div",{className:"ni-dot"})
          );
        })
      )
    )
  );
}

// ── Init ──────────────────────────────────────────────────────────
if(window.pdfjsLib){
  pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
}
ReactDOM.createRoot(document.getElementById("root")).render(h(App,null));
