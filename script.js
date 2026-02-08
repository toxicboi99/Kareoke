const media = document.getElementById("media");
const lyricsDiv = document.getElementById("lyrics");
const playBtn = document.getElementById("playBtn");
const micBtn = document.getElementById("micBtn");
const recordBtn = document.getElementById("recordBtn");
const songBtn = document.getElementById("songBtn");
const loadBtn = document.getElementById("loadBtn");

const songInput = document.getElementById("songInput");
const lrcInput = document.getElementById("lrcInput");

const musicVol = document.getElementById("musicVol");
const micVol = document.getElementById("micVol");
const echoVol = document.getElementById("echoVol");


let lyrics = [];
let audioCtx, musicGain, micGain, delayNode, feedback, micStream, micSource;


/* ================= PLAY ================= */

playBtn.onclick = async ()=>{

  if(!audioCtx){
    audioCtx = new AudioContext();
    setupMusic();
  }

  await audioCtx.resume();

  if(media.paused){
    media.play();

    // icon + text
    playBtn.innerHTML = "⏸<span>Pause</span>";

  }else{
    media.pause();

    playBtn.innerHTML = "▶<span>Play</span>";
  }
};


function setupMusic(){
  const src = audioCtx.createMediaElementSource(media);
  musicGain = audioCtx.createGain();
  src.connect(musicGain).connect(audioCtx.destination);
}

/* ================= SONG UPLOAD ================= */

songBtn.onclick = ()=> songInput.click();

songInput.onchange = e=>{
  const file = e.target.files[0];
  if(file) media.src = URL.createObjectURL(file);
};


/* ================= DRAG DROP ================= */

document.body.addEventListener("dragover", e=>e.preventDefault());

document.body.addEventListener("drop", e=>{
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if(file) media.src = URL.createObjectURL(file);
});


/* ================= LRC ================= */

loadBtn.onclick = ()=> lrcInput.click();

lrcInput.onchange = e=>{
  const reader = new FileReader();
  reader.onload = ()=> parseLRC(reader.result);
  reader.readAsText(e.target.files[0]);
};


function parseLRC(text){

  lyrics=[];
  lyricsDiv.innerHTML="";

  text.split("\n").forEach(line=>{
    const m=line.match(/\[(\d+):(\d+).(\d+)\](.*)/);
    if(m){
      lyrics.push({
        time:(+m[1])*60+(+m[2])+(+m[3])/100,
        text:m[4]
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

media.addEventListener("timeupdate",()=>{
  const lines=document.querySelectorAll(".line");
  const t=media.currentTime;

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
    setupMusic();
  }

  if(!micStream){

    micStream = await navigator.mediaDevices.getUserMedia({
      audio:{
        noiseSuppression:true,
        echoCancellation:true,
        autoGainControl:true
      }
    });

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

    micBtn.innerHTML = "🔴<span>Mic ON</span>";

  }else{
    micStream.getTracks().forEach(t=>t.stop());
    micStream=null;
    micBtn.innerHTML = "🎙<span>Mic</span>";
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

    recorder.ondataavailable=e=>chunks.push(e.data);

    recorder.onstop=()=>{
      const blob=new Blob(chunks,{type:"audio/webm"});
      const url=URL.createObjectURL(blob);

      const a=document.createElement("a");
      a.href=url;
      a.download="recording.webm";
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
