// Show/hide based on screen size
function lmResize(){
  var d=window.innerWidth>=1024;
  var L=document.getElementById("lmLeft"),R=document.getElementById("lmRight");
  if(L)L.style.display=d?"flex":"none";
  if(R)R.style.display=d?"flex":"none";
  var f=document.getElementById("mobFab");
  if(f&&d)f.style.display="none";
}
lmResize();window.addEventListener("resize",lmResize);

// Right notes
var _lrK="lr_n";
function lrOpen(){document.getElementById("lmRight").classList.add("open")}
function lrClose(){document.getElementById("lmRight").classList.remove("open")}
function lrSave(){var v=document.getElementById("lrTa").value;try{localStorage.setItem(_lrK,v)}catch{}document.getElementById("lrSv").textContent=v.length?v.length+" chars ✓":"Start writing..."}
function lrLoad(){var v=localStorage.getItem(_lrK)||"";var t=document.getElementById("lrTa");if(t)t.value=v;var s=document.getElementById("lrSv");if(s)s.textContent=v.length?v.length+" chars ✓":"Start writing...";}
function lrDl(){var b=new Blob([document.getElementById("lrTa")?.value||""],{type:"text/plain"});var a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="notes.txt";a.click()}
function lrClear(){if(confirm("Clear notes?")){document.getElementById("lrTa").value="";lrSave()}}

// Left nav
function llGo(i){
  // Update sidebar active state
  for(var j=0;j<5;j++){
    var e=document.getElementById("lb"+j);
    if(e)e.classList.toggle("on",j===i);
  }
  // Use React setter directly (most reliable)
  var tabs=["subjects","lesson","dual","games","profile"];
  if(window._setTab){
    window._setTab(tabs[i]);
  } else {
    // Fallback: click nav item
    var items=document.querySelectorAll(".ni");
    if(items[i])items[i].click();
  }
}
function llNew(){llGo(0);setTimeout(function(){if(window._setShowNewSub)window._setShowNewSub(true);else{var n=document.querySelector(".new-card");if(n)n.click();}},200);}

// Sync subjects
function llSync(){
  var list=document.getElementById("llList");if(!list)return;
  // Find subject cards - try multiple selectors
  var cards=Array.from(document.querySelectorAll(".subj-card"));
  if(!cards.length){
    list.innerHTML="<div class='ll-empty'>No subjects yet</div>";
  } else {
    // Only rebuild if count changed
    if(list.children.length!==cards.length+0){
      list.innerHTML="";
      cards.forEach(function(card,i){
        var nameEl=card.querySelector("[data-nid]")||card;
        var name=(nameEl.dataset?.nnm)||(card.textContent||"Subject "+(i+1)).trim().slice(0,25);
        var emojiEl=card.querySelector("[style*='font-size:2']");
        var emoji=emojiEl?emojiEl.textContent.trim().slice(0,2):"📚";
        var btn=document.createElement("button");
        btn.className="ll-srow";
        btn.innerHTML="<span style='flex-shrink:0;margin-right:6px'>"+emoji+"</span><span style='overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1'>"+name+"</span>";
        btn.onclick=function(){
          // Use React setter to navigate to this subject
          if(window._setActive&&window._subjects){
            var subj=window._subjects[i];
            if(subj){window._setActive(subj);window._setTab("subject");}
          } else {
            card.click();
          }
          var nid=card.querySelector("[data-nid]");
          var k="lr_n_"+(nid?.dataset?.nid||i);
          if(k!==_lrK){_lrK=k;lrLoad();var t=document.getElementById("lrTitle");if(t)t.textContent="Notes — "+name;}
        };
        list.appendChild(btn);
      });
    }
  }
  // Sync active tab indicator
  var a=document.querySelector(".ni.on .ni-lb");
  if(a){
    var t=a.textContent.toLowerCase();
    [["subjects",0],["lesson",1],["dual",2],["games",3],["profile",4]].forEach(function(e){
      var el=document.getElementById("lb"+e[1]);
      if(el)el.classList.toggle("on",t.includes(e[0].slice(0,4)));
    });
  }
}
setInterval(llSync,900);setTimeout(lrLoad,400);

// Mobile notes
var _mK="lr_n";
function mobOpen(){document.getElementById("mobPan").classList.add("on");document.getElementById("mobOv").classList.add("on");var v=localStorage.getItem(_mK)||"";document.getElementById("mobTa").value=v;document.getElementById("mobSv").textContent=v.length?v.length+" chars ✓":"Start writing...";}
function mobClose(){document.getElementById("mobPan").classList.remove("on");document.getElementById("mobOv").classList.remove("on");}
function mobSave(){var v=document.getElementById("mobTa").value;try{localStorage.setItem(_mK,v)}catch{}document.getElementById("mobSv").textContent=v.length?v.length+" chars ✓":"Start writing...";}
function mobDl(){var b=new Blob([document.getElementById("mobTa")?.value||""],{type:"text/plain"});var a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="notes.txt";a.click()}
function mobClear(){if(confirm("Clear?")){document.getElementById("mobTa").value="";mobSave();}}
setInterval(function(){if(window.innerWidth>=1024)return;var ok=document.querySelector(".top-brand")||document.querySelector(".subj-card");var f=document.getElementById("mobFab");if(f)f.style.display=ok?"flex":"none";},800);
