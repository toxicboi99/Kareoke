const audio = document.getElementById("audio");
const lyricsDiv = document.getElementById("lyrics");
const playBtn = document.getElementById("playBtn");
const micBtn = document.getElementById("micBtn");
const loadBtn = document.getElementById("loadBtn");
const lrcInput = document.getElementById("lrcInput");
const musicVol = document.getElementById("musicVol");
const micVol = document.getElementById("micVol");
const echoVol = document.getElementById("echoVol");
const recordBtn = document.getElementById("recordBtn");
const songBtn = document.getElementById("songBtn");
const songInput = document.getElementById("songInput");

let lyrics = [];
let micStream = null;
let audioCtx = null;
let musicGain, micGain, delayNode, feedback, micSource;


/* ================= PLAY ================= */

playBtn.onclick = async () => {

  if(!audioCtx){
    audioCtx = new AudioContext();
    setupMusicNode();
  }

  await audioCtx.resume();

  if(audio.paused){
    audio.play();
    playBtn.innerText="⏸";
  }else{
    audio.pause();
    playBtn.innerText="▶";
  }
};


/* ================= MUSIC NODE ================= */

function setupMusicNode(){
  const musicSource = audioCtx.createMediaElementSource(audio);
  musicGain = audioCtx.createGain();
  musicSource.connect(musicGain).connect(audioCtx.destination);
}


/* ================= SONG UPLOAD ================= */

songBtn.onclick = ()=> songInput.click();

songInput.onchange = e=>{
  const file = e.target.files[0];
  if(file){
    audio.src = URL.createObjectURL(file);
  }
};


/* ================= DRAG DROP ================= */

document.body.addEventListener("dragover", e=>e.preventDefault());

document.body.addEventListener("drop", e=>{
  e.preventDefault();
  const file=e.dataTransfer.files[0];
  if(file && file.type.includes("audio")){
    audio.src = URL.createObjectURL(file);
  }
});


/* ================= LRC ================= */

loadBtn.onclick = ()=> lrcInput.click();

lrcInput.onchange = e=>{
  const reader=new FileReader();
  reader.onload=()=>parseLRC(reader.result);
  reader.readAsText(e.target.files[0]);
};

function parseLRC(text){
  lyrics=[];
  lyricsDiv.innerHTML="";

  text.split("\n").forEach(line=>{
    const m=line.match(/\[(\d+):(\d+).(\d+)\](.*)/);
    if(m){
      lyrics.push({
        time: (+m[1])*60 + (+m[2]) + (+m[3])/100,
        text: m[4]
      });
    }
  });

  lyrics.sort((a,b)=>a.time-b.time);

  lyrics.forEach(l=>{
    const div=document.createElement("div");
    div.className="line";
    div.innerText=l.text;
    lyricsDiv.appendChild(div);
  });
}


/* ================= SYNC ================= */

audio.addEventListener("timeupdate",()=>{
  const lines=document.querySelectorAll(".line");
  const t=audio.currentTime;

  for(let i=lyrics.length-1;i>=0;i--){
    if(t>=lyrics[i].time){
      lines.forEach(x=>x.classList.remove("active"));
      lines[i]?.classList.add("active");
      break;
    }
  }
});


/* ================= MIC ================= */

micBtn.onclick = async ()=>{

  if(!audioCtx){
    audioCtx = new AudioContext();
    setupMusicNode();
  }

  if(!micStream){

    micStream = await navigator.mediaDevices.getUserMedia({audio:true});

    micSource = audioCtx.createMediaStreamSource(micStream);
    micGain = audioCtx.createGain();

    delayNode = audioCtx.createDelay();
    feedback = audioCtx.createGain();

    delayNode.delayTime.value = 0.25;

    micSource
      .connect(micGain)
      .connect(delayNode)
      .connect(feedback)
      .connect(delayNode)
      .connect(audioCtx.destination);

    micGain.connect(audioCtx.destination);

    micBtn.innerText="🔴";

  }else{
    micStream.getTracks().forEach(t=>t.stop());
    micStream=null;
    micBtn.innerText="🎙";
  }
};


/* ================= SLIDERS ================= */

musicVol.oninput = ()=> musicGain.gain.value = musicVol.value;
micVol.oninput = ()=> micGain && (micGain.gain.value = micVol.value);
echoVol.oninput = ()=> feedback && (feedback.gain.value = echoVol.value);


/* ================= RECORD ================= */

let recorder, chunks=[];

recordBtn.onclick = async ()=>{

  if(!recorder){

    const stream = await navigator.mediaDevices.getUserMedia({audio:true});
    recorder = new MediaRecorder(stream);

    recorder.ondataavailable = e => chunks.push(e.data);

    recorder.onstop = ()=>{
      const blob = new Blob(chunks,{type:"audio/webm"});
      const url = URL.createObjectURL(blob);

      const a=document.createElement("a");
      a.href=url;
      a.download="my_singing.webm";
      a.click();

      chunks=[];
      recorder=null;
      recordBtn.innerText="⏺";
    };

    recorder.start();
    recordBtn.innerText="⏹";

  }else{
    recorder.stop();
  }
};
