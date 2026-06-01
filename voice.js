var _vc={active:false,recording:false,thinking:false,speaking:false,stream:null,mediaRecorder:null,audioChunks:[],history:[],checkInterval:null,lastSoundTime:0,hasSound:false,SILENCE_MS:1800,VOL_THRESHOLD:4,systemPrompt:"You are Luxori, a friendly AI study tutor in a voice call. Keep answers SHORT — 2-4 sentences. Be warm and natural."};
function vcShowBtn(){if(window.innerWidth>=1024)return;var ok=document.querySelector(".top-brand")||document.querySelector(".subj-card");var el=document.getElementById("vcBtn");if(el)el.style.display=ok?"flex":"none";}
setInterval(vcShowBtn,800);
async function vcStart(){
  _vc.active=true;_vc.history=[];
  document.getElementById("vcScreen").classList.add("on");
  vcSt("Requesting microphone...");vcTxt("Allow microphone when asked");
  try{
    _vc.stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});
    var actx=new(window.AudioContext||window.webkitAudioContext)();await actx.resume();
    var analyser=actx.createAnalyser();analyser.fftSize=512;
    actx.createMediaStreamSource(_vc.stream).connect(analyser);
    var buf=new Uint8Array(analyser.frequencyBinCount);
    var uname="";try{var u=await getSupa().auth.getSession();uname=u?.data?.session?.user?.email?.split("@")[0]||""}catch{}
    var matEl=document.querySelector("[data-nid]");var subj=matEl?.dataset?.nnm||"";
    var greeting="Hi"+(uname?", "+uname:"")+"! I'm Luxori. "+(subj?"Ready to study "+subj+" together? ":"")+"What would you like to learn today?";
    _vc.history.push({role:"assistant",content:greeting});
    vcTxt(greeting);vcSt("Luxori is speaking...");vcMic("thinking");
    vcSpeak(greeting,function(){if(_vc.active)vcResume(analyser,buf);});
  }catch(e){
    _vc.active=false;
    vcSt(e.name==="NotFoundError"?"⚠️ No microphone found":e.name==="NotAllowedError"?"⚠️ Microphone blocked — allow it in browser":"Error: "+e.message);
  }
}
function vcResume(analyser,buf){
  if(!_vc.active)return;
  _vc.thinking=false;_vc.speaking=false;_vc.hasSound=false;_vc.lastSoundTime=Date.now();
  _vc.audioChunks=[];
  var mime=MediaRecorder.isTypeSupported("audio/webm")?"audio/webm":MediaRecorder.isTypeSupported("audio/mp4")?"audio/mp4":"";
  try{_vc.mediaRecorder=new MediaRecorder(_vc.stream,mime?{mimeType:mime}:{});_vc.mediaRecorder.ondataavailable=function(e){if(e.data&&e.data.size>0)_vc.audioChunks.push(e.data)};_vc.mediaRecorder.start(200);_vc.recording=true;}catch(er){}
  vcMic("listening");vcSt("🎙️ Listening — speak naturally");
  clearInterval(_vc.checkInterval);
  _vc.checkInterval=setInterval(function(){
    if(!_vc.active||_vc.thinking||_vc.speaking)return;
    analyser.getByteFrequencyData(buf);
    var sum=0;for(var i=0;i<buf.length;i++)sum+=buf[i];var vol=sum/buf.length;
    if(vol>_vc.VOL_THRESHOLD){_vc.lastSoundTime=Date.now();_vc.hasSound=true;var m=document.getElementById("vcMic");if(m)m.style.transform="scale("+(1+Math.min(vol/150,.35))+")";}
    else{var m=document.getElementById("vcMic");if(m)m.style.transform="scale(1)";if(_vc.hasSound&&Date.now()-_vc.lastSoundTime>_vc.SILENCE_MS){_vc.hasSound=false;vcSend(analyser,buf);}}
  },100);
}
function vcSend(analyser,buf){
  if(!_vc.recording||_vc.thinking)return;
  _vc.recording=false;_vc.thinking=true;clearInterval(_vc.checkInterval);
  vcMic("thinking");vcSt("Processing...");
  if(_vc.mediaRecorder&&_vc.mediaRecorder.state!=="inactive"){_vc.mediaRecorder.onstop=function(){vcTranscribe(analyser,buf)};_vc.mediaRecorder.stop();}else vcTranscribe(analyser,buf);
}
async function vcTranscribe(analyser,buf){
  if(!_vc.audioChunks.length){vcResume(analyser,buf);return;}
  var blob=new Blob(_vc.audioChunks,{type:_vc.mediaRecorder?.mimeType||"audio/webm"});
  if(blob.size<800){vcResume(analyser,buf);return;}
  vcSt("Transcribing with Whisper...");console.log("[Voice] Sending audio, size:",blob.size);
  try{
    var b64=await new Promise(function(res){var r=new FileReader();r.onload=function(e){res(e.target.result.split(",")[1])};r.readAsDataURL(blob)});
    var resp=await fetch("/.netlify/functions/whisper",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({audio:b64})});
    var d=await resp.json();console.log("[Voice] Whisper response:",d);var txt=d.text?d.text.trim():"";
    if(!txt||txt.length<2){
      vcSt("Couldn't hear clearly — speak again");
      vcResume(analyser,buf);return;
    }
    vcTxt("You: "+txt);vcSt("Luxori is thinking...");
    _vc.history.push({role:"user",content:txt});
    if(_vc.history.length>12)_vc.history=_vc.history.slice(-12);
    var matEl=document.querySelector("[data-nid]");
    var sys=_vc.systemPrompt+(matEl?" You are helping study: "+matEl.dataset.nnm:"");
    var token=null;try{var s=await getSupa().auth.getSession();token=s?.data?.session?.access_token}catch{}
    var r2=await fetch("/.netlify/functions/chat",{method:"POST",headers:{"Content-Type":"application/json",...(token?{"Authorization":"Bearer "+token}:{})},body:JSON.stringify({system:sys,messages:_vc.history,maxTokens:200})});
    var d2=await r2.json();console.log("[Voice] Chat response:",d2);var reply=d2.text||"Could you repeat that?";
    _vc.history.push({role:"assistant",content:reply});_vc.thinking=false;
    vcTxt(reply);vcSpeak(reply,function(){if(_vc.active)vcResume(analyser,buf)});
  }catch(e){
    console.error("[Voice] Error:", e);
    vcSt("Error — try again. Tap 📵 to end.");
    _vc.thinking=false;
    if(_vc.active)vcResume(analyser,buf);
  }
}
function vcSpeak(text,onDone){
  if(!window.speechSynthesis){if(onDone)onDone();return;}
  speechSynthesis.cancel();_vc.speaking=true;vcMic("thinking");vcSt("Luxori is speaking...");document.getElementById("vcWave").style.display="flex";
  var parts=(text.replace(/[*#`]/g,"").trim().match(/[^.!?]+[.!?]?/g)||[text]).filter(s=>s.trim().length>1);
  var i=0;function next(){if(i>=parts.length||!_vc.active){_vc.speaking=false;document.getElementById("vcWave").style.display="none";if(onDone)onDone();return;}
    var u=new SpeechSynthesisUtterance(parts[i++].trim());var vs=speechSynthesis.getVoices();var v=vs.find(v=>v.lang.startsWith("en")&&v.name.includes("Google"))||vs.find(v=>v.lang.startsWith("en"))||vs[0];if(v){u.voice=v;u.lang=v.lang}else u.lang="en-US";u.rate=1;u.volume=1;u.onend=()=>setTimeout(next,80);u.onerror=()=>setTimeout(next,80);speechSynthesis.speak(u);}
  next();
}
function vcEnd(){_vc.active=false;_vc.recording=false;_vc.thinking=false;_vc.speaking=false;clearInterval(_vc.checkInterval);if(_vc.mediaRecorder&&_vc.mediaRecorder.state!=="inactive")try{_vc.mediaRecorder.stop()}catch{}if(_vc.stream)_vc.stream.getTracks().forEach(t=>t.stop());if(window.speechSynthesis)speechSynthesis.cancel();document.getElementById("vcScreen").classList.remove("on");vcMic("idle");}
function vcSt(t){var e=document.getElementById("vcSt");if(e)e.textContent=t}
function vcTxt(t){var e=document.getElementById("vcTxt");if(e)e.textContent=t}
function vcMic(s){var m=document.getElementById("vcMic");if(!m)return;m.className="vcall-mic "+s;m.style.transform="scale(1)";m.textContent=s==="listening"?"🎙️":s==="thinking"?"💭":"🎤";}
