// Hooghly Map Mission — Black Force 007
// Mobile-first, localStorage progress, simple quiz per location

document.addEventListener("DOMContentLoaded", () => {
  // ----- CONFIG: missions (one per zone id) -----
  const MISSIONS = {
    singur: {
      title: "Singur — Training Quiz",
      desc: "Basic cyber training. সঠিক উত্তর দিলে Mission Complete।",
      questions: [
        { q: "HTTP কী এর জন্য?", a: ["HyperText Transfer Protocol","High Transfer Text Protocol","Home Transfer Type Protocol","Hyperlink Transfer Tool"], correct: 0 },
        { q: "CAPTCHA কেন লাগে?", a: ["বট আলাদা করতে","ডেটা এনক্রিপ্ট করতে","রেন্ডার বাড়াতে","কোনোটাই নয়"], correct: 0 }
      ]
    },
    police: {
      title: "Police Station — Secure Comm",
      desc: "Protect the station. সঠিক উত্তর দিলে XP পাবে।",
      questions: [
        { q: "SSL/HTTPS কী নিশ্চিত করে?", a: ["Secure connection","Faster speed","More ads","Debugging"], correct: 0 },
        { q: "2FA মানে?", a: ["Two Factor Authentication","Two Form Access","Two File Auth","None"], correct: 0 }
      ]
    },
    village: {
      title: "Village — Local Puzzle",
      desc: "Local knowledge quiz.",
      questions: [
        { q: "CAPTCHA কোন কাজ করে?", a: ["বট আলাদা করে","ইন্টারনেট দ্রুত করে","সার্ভার আপগ্রেড করে","কোনোটাই নয়"], correct: 0 },
        { q: "Strong password কিরকম?", a: ["লম্বা এবং মিক্সড", "short & common", "123456", "user name"], correct: 0 }
      ]
    },
    pairaurah: {
      title: "Pairaurah — Recon Mission",
      desc: "Final recon. সাবধান হয়ে উত্তর দাও।",
      questions: [
        { q: "SEO মানে?", a: ["Search Engine Optimization","Secure Engine Operation","System Encryption Option","None"], correct: 0 },
        { q: "Phishing কি?", a: ["Fraud attempt","New protocol","Software update","Network tool"], correct: 0 }
      ]
    }
  };

  // ----- state & DOM -----
  const zoneEls = document.querySelectorAll(".zone");
  const modal = document.getElementById("missionModal");
  const missionTitle = document.getElementById("missionTitle");
  const missionDesc = document.getElementById("missionDesc");
  const qIndex = document.getElementById("qIndex");
  const qTotal = document.getElementById("qTotal");
  const qText = document.getElementById("qText");
  const qOptions = document.getElementById("qOptions");
  const nextQ = document.getElementById("nextQ");
  const closeModal = document.getElementById("closeModal");
  const abortMission = document.getElementById("abortMission");
  const toast = document.getElementById("toast");
  const rankNameEl = document.getElementById("rankName");
  const playerXPEl = document.getElementById("playerXP");

  // player data: from localStorage
  const PLAYER_KEY = "bf_map_player_v1";
  const PROG_KEY = "bf_map_progress_v1";

  let player = loadPlayer(); // { xp: number }
  let progress = loadProgress(); // { singur: bool, ... }
  updatePlayerUI();

  // simple web audio
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  let audioCtx = null;
  function ensureAudio(){ if(!audioCtx) audioCtx = new AudioCtx(); }
  function beep(freq=880,dur=100){ try{ ensureAudio(); const o=audioCtx.createOscillator(); const g=audioCtx.createGain(); o.type='sine'; o.frequency.value=freq; g.gain.value=0.05; o.connect(g); g.connect(audioCtx.destination); o.start(); setTimeout(()=>o.stop(),dur);}catch(e){} }

  // attach click to zones
  zoneEls.forEach(z => {
    const id = z.getAttribute("data-id");
    // reflect completed state
    if(progress[id]) z.classList.add("completed");
    z.addEventListener("click", ()=> openMission(id));
  });

  // open mission modal
  let curMission = null, curQIndex = 0;
  function openMission(id){
    if(!MISSIONS[id]) return showToast("No mission found for " + id);
    curMission = MISSIONS[id];
    curQIndex = 0;
    missionTitle.textContent = curMission.title;
    missionDesc.textContent = curMission.desc;
    qTotal.textContent = curMission.questions.length;
    renderQuestion();
    modal.classList.remove("hidden");
    beep(1000,80);
  }

  // render current question
  function renderQuestion(){
    const qs = curMission.questions;
    const item = qs[curQIndex];
    qIndex.textContent = curQIndex + 1;
    qText.textContent = item.q;
    qOptions.innerHTML = "";
    item.a.forEach((opt, idx) => {
      const b = document.createElement("div");
      b.className = "option";
      b.textContent = opt;
      b.tabIndex = 0;
      b.addEventListener("click", ()=> selectAnswer(b, idx));
      qOptions.appendChild(b);
    });
    nextQ.disabled = true;
  }

  function selectAnswer(el, idx){
    // disable all
    Array.from(qOptions.children).forEach((c,i) => { c.style.pointerEvents = "none"; if(i === curMission.questions[curQIndex].correct) c.classList.add("correct"); if(i === idx && i !== curMission.questions[curQIndex].correct) c.classList.add("wrong"); });
    const correct = curMission.questions[curQIndex].correct;
    if(idx === correct){
      // success
      player.xp = (player.xp || 0) + 5;
      updatePlayerUI();
      beep(1200,120);
      showToast("Correct! +5 XP");
    } else {
      beep(240,180);
      showToast("Wrong answer");
    }
    nextQ.disabled = false;
  }

  nextQ.addEventListener("click", ()=>{
    const totalQ = curMission.questions.length;
    if(curQIndex < totalQ - 1){
      curQIndex++;
      renderQuestion();
    } else {
      completeMission();
    }
  });

  closeModal.addEventListener("click", ()=> {
    modal.classList.add("hidden");
  });
  abortMission.addEventListener("click", ()=> {
    modal.classList.add("hidden");
    showToast("Mission aborted");
  });

  function completeMission(){
    // mark progress by mission title key (derive id)
    // find id by title
    const id = Object.keys(MISSIONS).find(k => MISSIONS[k].title === curMission.title);
    if(id){
      progress[id] = true;
      saveProgress();
      // visually mark completed
      const el = document.querySelector(`.zone[data-id="${id}"]`);
      if(el) el.classList.add("completed");
    }
    modal.classList.add("hidden");
    showToast("Mission Complete! Area secured.");
  }

  // utilities: localStorage
  function loadPlayer(){
    try {
      const raw = localStorage.getItem(PLAYER_KEY);
      if(raw) return JSON.parse(raw);
    } catch(e){}
    const base = { xp: 0 };
    localStorage.setItem(PLAYER_KEY, JSON.stringify(base));
    return base;
  }
  function savePlayer(){ localStorage.setItem(PLAYER_KEY, JSON.stringify(player)); updatePlayerUI(); }
  function loadProgress(){
    try {
      const r = localStorage.getItem(PROG_KEY);
      if(r) return JSON.parse(r);
    } catch(e){}
    const base = { singur:false, police:false, village:false, pairaurah:false };
    localStorage.setItem(PROG_KEY, JSON.stringify(base));
    return base;
  }
  function saveProgress(){ localStorage.setItem(PROG_KEY, JSON.stringify(progress)); }

  function updatePlayerUI(){
    playerXPEl.textContent = player.xp || 0;
    // simple level calc & rank
    const lvl = Math.floor((player.xp || 0) / 15) + 1;
    let rank = "Cadet";
    if(lvl >= 6) rank = "Tech Commander";
    else if(lvl >= 4) rank = "Hacker Elite";
    else if(lvl >= 2) rank = "Field Agent";
    rankNameEl.textContent = rank;
    savePlayer();
  }

  // small toast
  let toastTimer = null;
  function showToast(msg){
    toast.textContent = msg;
    toast.classList.remove("hidden");
    if(toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(()=> toast.classList.add("hidden"), 2000);
  }

  // initial UI reflect for completed zones
  Object.keys(progress).forEach(k => {
    if(progress[k]){
      const el = document.querySelector(`.zone[data-id="${k}"]`);
      if(el) el.classList.add("completed");
    }
  });

});
