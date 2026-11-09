// 효과음 엔진(새 판): 파일 없이 Web Audio로 그 자리에서 합성하는 8비트 소리. 정의는 SOUNDS, 재생은 synth.play(이름). 디자인 시스템 페이지(/design-system, shell/ds.js)에서 들어 보고 고친다.
// 대시보드는 shell/dashboard.js의 sfx(이름)으로 부른다(켜짐·임베드·리플레이 확인 후 synth.play)
// 목소리(voice) 하나 = 파형 w(pulse12·pulse25·square·triangle·saw·sine·noise), 높이 f(Hz·'E6' 같은 음이름, [시작,끝]이면 미끄러짐), 길이 d초, 시작 at초, 크기 v(0~1).
// lp/hp(Hz)는 필터. 노이즈는 f 대신 lp/hp만, 음에 붙이면 배음을 깎는다(자주 나는 소리의 2kHz 위 찌르는 성분을 줄이는 용도). 같은 소리는 gap초(기본 .05) 안에 다시 울리지 않는다(방문자가 몰릴 때 겹침 방지)
// 한 세트처럼 들리게 하는 규칙:
//  - 음높이는 전부 C 장5음계(C·D·E·G·A). 성공·긍정·열림은 위로, 실패·닫힘·퇴장은 아래로. 가장 높은 기본음은 A6(1760Hz) 이하, tick만 예외(C7)
//  - 등급(tier)별 크기: ui(click·tick·on·off·open·close, 60ms 이하) < visit(방문자, 250ms 이하) < accent(드문 강조, unlock만 700ms까지). 등급 사이 약 5dB, 같은 등급은 RMS ±2dB 안
//  - 크기는 synth.render(정의)로 OfflineAudioContext에 그려 RMS·피크를 재서 맞춘다(마스터 .5 → 컴프레서까지 지난 값). 어택 4ms, 끝은 지수 감쇠, 피크 -1dBFS 아래
export const SOUNDS={
  // inUse: 대시보드(p6.js sfx)가 실제로 내는 소리. coin·chime·blip은 이벤트 설정(event_config)에 저장되는 이름이라 키를 바꾸지 않는다
  enter:    { label:'방문자 입장', desc:'새 방문자가 마을에 들어올 때. E5→A5', inUse:true, tier:'visit', gap:.08, voices:[{w:'square',f:'E5',d:.06,v:.22,lp:2400},{w:'square',f:'A5',d:.09,at:.06,v:.22,lp:2400}] },
  coin:     { label:'코인', desc:'이벤트 설정에서 고르는 소리(구매 등). C6→E6', inUse:true, tier:'visit', gap:.08, voices:[{w:'square',f:'C6',d:.07,v:.2},{w:'square',f:'E6',d:.16,at:.07,v:.2}] },
  chime:    { label:'차임', desc:'이벤트 설정에서 고르는 소리(가입 등). C5·E5·G5', inUse:true, tier:'visit', gap:.08, voices:[{w:'square',f:'C5',d:.05,v:.17},{w:'square',f:'E5',d:.05,at:.05,v:.17},{w:'square',f:'G5',d:.14,at:.1,v:.17}] },
  blip:     { label:'블립', desc:'이벤트 설정에서 고르는 소리(짧은 알림). C6', inUse:true, tier:'visit', gap:.08, voices:[{w:'square',f:'C6',d:.05,v:.45}] },
  enter2:   { label:'입장(펄스)', desc:'입장 소리 후보. 더 얇은 펄스파, C6→G6', tier:'visit', gap:.08, voices:[{w:'pulse25',f:'C6',d:.06,v:.35,lp:3200},{w:'pulse25',f:'G6',d:.12,at:.06,v:.35,lp:3200}] },
  leave:    { label:'방문자 퇴장', desc:'방문자가 마을을 떠날 때. G5→C5', inUse:true, tier:'visit', gap:.08, voices:[{w:'triangle',f:'G5',d:.07,v:.3},{w:'triangle',f:'C5',d:.14,at:.07,v:.3}] },
  bot:      { label:'봇 방문', desc:'봇으로 분류된 방문자가 들어올 때. C5·C6·C5', inUse:true, tier:'visit', gap:.1, voices:[{w:'square',f:'C5',d:.04,v:.2},{w:'square',f:'C6',d:.04,at:.05,v:.2},{w:'square',f:'C5',d:.04,at:.1,v:.2}] },
  click:    { label:'버튼 누름', desc:'버튼을 누를 때. E6→A5로 짧게', inUse:true, tier:'ui', voices:[{w:'square',f:['E6','A5'],d:.025,v:.22,lp:2600}] },
  tick:     { label:'항목 이동', desc:'드롭다운·탭에서 항목을 옮길 때. C7(유일하게 2kHz 위)', inUse:true, tier:'ui', voices:[{w:'pulse12',f:'C7',d:.015,v:.6,lp:4500}] },
  on:       { label:'켜기', desc:'토글·체크박스를 켤 때. C6→G6', inUse:true, tier:'ui', voices:[{w:'pulse25',f:['C6','G6'],d:.06,v:.42}] },
  off:      { label:'끄기', desc:'토글·체크박스를 끌 때. G5→C5', inUse:true, tier:'ui', voices:[{w:'pulse25',f:['G5','C5'],d:.06,v:.41}] },
  open:     { label:'패널 열기', desc:'모달·확인창·메뉴가 열릴 때. D4→A5', inUse:true, tier:'ui', voices:[{w:'triangle',f:['D4','A5'],d:.06,v:.37}] },
  close:    { label:'패널 닫기', desc:'모달·확인창·메뉴가 닫힐 때. A5→D4', inUse:true, tier:'ui', voices:[{w:'triangle',f:['A5','D4'],d:.06,v:.37}] },
  save:     { label:'저장 완료', desc:'"저장했어요"가 뜰 때. C6·E6·G6', inUse:true, tier:'accent', voices:[{w:'pulse25',f:'C6',d:.05,v:.59},{w:'pulse25',f:'E6',d:.05,at:.05,v:.59},{w:'pulse25',f:'G6',d:.12,at:.1,v:.59}] },
  error:    { label:'실패', desc:'저장·요청이 실패했을 때. D3→A2', inUse:true, tier:'accent', voices:[{w:'square',f:'D3',d:.1,v:.33},{w:'square',f:'A2',d:.18,at:.12,v:.33}] },
  remove:   { label:'지우기', desc:'건물·사이트를 지울 때. 노이즈 + G4→E2', inUse:true, tier:'accent', voices:[{w:'noise',lp:3500,d:.12,v:.9},{w:'square',f:['G4','E2'],d:.14,v:.6}] },
  shutter:  { label:'사진 찍기', desc:'마을 사진을 찍을 때. 노이즈 둘', inUse:true, tier:'accent', voices:[{w:'noise',hp:3000,d:.03,v:.84},{w:'noise',hp:1800,d:.05,at:.06,v:.67}] },
  unlock:   { label:'테마 해금', desc:'새 테마가 열릴 때. C5·E5·G5·C6→E6+G6', inUse:true, tier:'accent', gap:.5, voices:[{w:'pulse25',f:'C5',d:.06,v:.24},{w:'pulse25',f:'E5',d:.06,at:.06,v:.24},{w:'pulse25',f:'G5',d:.06,at:.12,v:.24},{w:'pulse25',f:'C6',d:.06,at:.18,v:.24},{w:'pulse25',f:'E6',d:.32,at:.26,v:.22},{w:'pulse12',f:'G6',d:.32,at:.26,v:.13},{w:'triangle',f:'C4',d:.4,at:.26,v:.48}] },
};
export const synth=(()=>{
  let ctx=null, out=null, comp=null, ana=null, vol=.5; const last={}, waves={}, noises=new WeakMap();
  const SEMI={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
  const hz=f=>{ if (typeof f!=='string') return f; const m=/^([A-G])(#?)(\d)$/.exec(f); return 440*2**((12*(+m[3]+1)+SEMI[m[1]]+(m[2]?1:0)-69)/12); };
  const midi=m=>440*2**((m-69)/12);   // MIDI 번호 → Hz (C4=60)
  // 출력 사슬: 마스터 게인(효과음 크기) → 컴프레서 → 애널라이저(오실로스코프) → 스피커. 배경음(bgm)은 컴프레서로 바로 들어온다
  function graph(ac){ const o=ac.createGain(); o.gain.value=vol; const c=ac.createDynamicsCompressor(), a=ac.createAnalyser(); a.fftSize=1024; o.connect(c); c.connect(a); a.connect(ac.destination); return { out:o, comp:c, ana:a }; }
  function init(){
    if (!ctx){ const AC=window.AudioContext||window.webkitAudioContext; if (!AC) return null; ctx=new AC(); ({ out, comp, ana }=graph(ctx)); }
    if (ctx.state==='suspended') ctx.resume(); // 브라우저는 사용자가 한 번 누르기 전까지 소리를 막는다
    return ctx;
  }
  // 펄스파(듀티 12.5%·25%)는 푸리에 계수로 만든다. NES 같은 얇은 소리. 실시간 컨텍스트 것만 캐시한다
  function wave(ac, w){ const cache=ac===ctx ? waves : {}; if (cache[w]) return cache[w]; const duty=w==='pulse12'?.125:.25, n=64, re=new Float32Array(n), im=new Float32Array(n);
    for (let k=1;k<n;k++) re[k]=2*Math.sin(Math.PI*k*duty)/(Math.PI*k); return cache[w]=ac.createPeriodicWave(re, im); }
  function noise(ac){ let b=noises.get(ac); if (!b){ b=ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const a=b.getChannelData(0); for (let i=0;i<a.length;i++) a[i]=Math.random()*2-1; noises.set(ac, b); } return b; }   // 1초 백색소음, 컨텍스트마다 하나
  function source(ac, o, t, d){ let s;
    if (o.w==='noise'){ s=ac.createBufferSource(); s.buffer=noise(ac); s.loop=true; }
    else { s=ac.createOscillator(); const [f0,f1]=[].concat(o.f).map(hz);
      if (o.w.startsWith('pulse')) s.setPeriodicWave(wave(ac, o.w)); else s.type=o.w==='saw'?'sawtooth':o.w;
      s.frequency.setValueAtTime(f0, t); if (f1) s.frequency.exponentialRampToValueAtTime(f1, t+d); }
    let node=s;
    for (const [k,type] of [['lp','lowpass'],['hp','highpass']]) if (o[k]){ const f=ac.createBiquadFilter(); f.type=type; f.frequency.value=o[k]; node.connect(f); node=f; }
    return [s, node];
  }
  // 어택 4ms, 끝은 지수 감쇠(-80dB). 게인 기본값을 먼저 0으로: 시작 시각이 렌더 블록(128표본) 중간이면 Chromium이 소스를 자동화보다 한두 표본 먼저 내보내 기본값 1로 '딱' 소리가 난다
  function voice(ac, dest, o, t0){ const t=t0+(o.at||0), d=o.d, g=ac.createGain(), [s,tail]=source(ac, o, t, d); g.gain.value=0;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(o.v??.3, t+.004); g.gain.exponentialRampToValueAtTime(.0001, t+d);
    tail.connect(g); g.connect(dest); s.start(t); s.stop(t+d+.02); }
  // def를 주면 SOUNDS 대신 그걸 울린다(디자인 시스템 편집기). 막혔거나 gap 안이면 false
  function play(name, def=SOUNDS[name]){ if (!def || !init()) return false; const now=ctx.currentTime;
    if (now-(last[name]??-1) < (def.gap??.05)) return false; last[name]=now;
    for (const o of def.voices) voice(ctx, out, o, now+.01); return true; }
  const length=def=>Math.max(...def.voices.map(o=>(o.at||0)+o.d));
  // 소리 하나를 OfflineAudioContext에 그려 AudioBuffer로 돌려준다(크기 측정·검증용). 스피커 앞까지 같은 사슬을 지난다
  function render(def, secs=length(def)+.1, sr=48000){ const ac=new OfflineAudioContext(1, Math.ceil(secs*sr), sr), g=graph(ac); for (const o of def.voices) voice(ac, g.out, o, .01); return ac.startRendering(); }
  return { play, init, hz, midi, length, render, graph, wave, noise, analyser:()=>ana, ctx:()=>ctx, bus:()=>comp,
    get volume(){ return vol; }, set volume(v){ vol=v; if (out) out.gain.value=v; } };
})();

// ---- 배경음(BGM·환경음): 몇 시간 켜 둬도 안 질리게, 멜로디 없이 조용한 루프. 정의는 TRACKS, 재생은 bgm.start(이름)·bgm.stop()·bgm.volume. 동시에 하나만, 바뀔 때 .7초 페이드
// music: 8마디 코드 진행 위에 느린 아르페지오(pulse12) + 삼각파 베이스 + 아주 작은 하이햇. 마디마다 시드 고정 난수로 패턴·쉼표·옥타브를 바꿔 64마디가 한 바퀴(32마디 안에 같은 마디가 없다)
// ambient: 노이즈 + 필터 + LFO를 계속 틀고, 새·귀뚜라미·물방울 같은 짧은 소리를 난수 간격으로 예약한다
// 예약은 Web Audio 시간축: 25ms마다 currentTime+0.1초(탭이 뒤에 있으면 +1.2초. 타이머가 1초에 한 번으로 느려지므로)까지의 음을 미리 잡아 둔다. 박자는 타이머가 아니라 AudioContext 시계가 정한다
export const TRACKS={
  day:        { label:'낮 배경음', desc:'IV–V–iii–vi로 도는 밝은 아르페지오. 84 BPM', kind:'music', bpm:84, seed:7, prog:['IV','V','iii','vi','IV','V','I','vi'], oct:5, rest:.12, bassTwice:true, hat:[.5,.3], lead:0 },
  night:      { label:'밤 배경음', desc:'I–iii–IV–iv로 가라앉는 느린 아르페지오와 긴 사인 음. 72 BPM', kind:'music', bpm:72, seed:11, prog:['I','iii','IV','iv','I','iii','vi','iv'], oct:4, rest:.22, bassTwice:false, hat:[0,.25], lead:1 },
  'amb-day':  { label:'낮 환경음', desc:'바람(저역 노이즈 + LFO)과 가끔 새소리(사인 처프)', kind:'ambient', seed:3, wind:{ lp:520, v:1, lfo:[[.11,260],[.037,140]] }, birds:{ every:[2.5,7], v:.55 } },
  'amb-night':{ label:'밤 환경음', desc:'귀뚜라미(4~5kHz 사인 펄스)와 낮은 바람', kind:'ambient', seed:5, wind:{ lp:220, v:1.45, lfo:[[.07,80]] }, crickets:{ f:[4300,4700], every:[.45,.8], v:.5 } },
  'amb-rain': { label:'비', desc:'대역 필터 노이즈 + 난수 물방울(장5음계)', kind:'ambient', seed:9, rain:{ bp:2400, q:.6, v:1, lfo:[[.23,.3],[.051,.2]] }, drops:{ every:[.05,.3], v:.6 } },
};
export const bgm=(()=>{
  const CHORD={ I:[0,4,7], ii:[2,5,9], iii:[4,7,11], IV:[5,9,12], V:[7,11,14], vi:[9,12,16], iv:[5,8,12] };   // C 기준 반음 간격(C장조 + 빌려온 iv)
  const LEVEL={ arp:.0035, bass:.006, hat:.001, lead:.0022, wind:.033, birds:.016, crickets:.018, rain:.014, drops:.0065 };   // 부품별 기본 크기(효과음 ui 등급보다 RMS 10dB 아래가 되도록 잰 값). 전체는 bgm.volume
  let ctx=null, master=null, cur=null, timer=0, vol=.6; const fading=[];
  // 시드 고정 난수(mulberry32). 같은 시드면 같은 순서
  function rng(seed){ let a=seed>>>0; return ()=>{ a=(a+0x6D2B79F5)>>>0; let t=a; t=Math.imul(t^(t>>>15), t|1); t^=t+Math.imul(t^(t>>>7), t|61); return ((t^(t>>>14))>>>0)/4294967296; }; }
  // 음 하나. a 어택, rel 있으면 끝 rel초만 감쇠(지속음), 없으면 어택 뒤 바로 지수 감쇠(뜯는 음)
  function tone(ac, dest, { w, f, f1, d, v, a=.006, rel }, t){ const s=ac.createOscillator(), g=ac.createGain(); g.gain.value=0;   // 기본값 0: synth.voice와 같은 이유(경계 클릭)
    if (w.startsWith('pulse')) s.setPeriodicWave(synth.wave(ac, w)); else s.type=w;
    s.frequency.setValueAtTime(f, t); if (f1) s.frequency.exponentialRampToValueAtTime(f1, t+d);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t+a);
    if (rel){ g.gain.setValueAtTime(v, Math.max(t+a, t+d-rel)); } g.gain.exponentialRampToValueAtTime(.0001, t+d);
    s.connect(g); g.connect(dest); s.start(t); s.stop(t+d+.02); }
  // 노이즈 한 조각(하이햇·물방울 튀는 소리)
  function hit(ac, dest, { hp, lp, d, v }, t){ const s=ac.createBufferSource(); s.buffer=synth.noise(ac); s.loop=true; const g=ac.createGain(); g.gain.value=0; let node=s;
    for (const [val,type] of [[hp,'highpass'],[lp,'lowpass']]) if (val){ const f=ac.createBiquadFilter(); f.type=type; f.frequency.value=val; node.connect(f); node=f; }
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t+.002); g.gain.exponentialRampToValueAtTime(.0001, t+d);
    node.connect(g); g.connect(dest); s.start(t, (t*997)%1*.5); s.stop(t+d+.02); }
  // 계속 도는 노이즈 + 필터 + LFO(필터 주파수나 게인을 천천히 흔든다). 돌려주는 stop(t)으로 끈다
  function bed(ac, dest, { lp, bp, q, v, lfo }){ const s=ac.createBufferSource(); s.buffer=synth.noise(ac); s.loop=true; const f=ac.createBiquadFilter(); f.type=bp?'bandpass':'lowpass'; f.frequency.value=bp||lp; f.Q.value=q??.7;
    const g=ac.createGain(); g.gain.value=v; s.connect(f); f.connect(g); g.connect(dest); s.start(); const oscs=[s];
    for (const [rate, depth] of lfo||[]){ const o=ac.createOscillator(), og=ac.createGain(); o.frequency.value=rate; o.connect(og);
      if (bp){ og.gain.value=depth*v; og.connect(g.gain); } else { og.gain.value=depth; og.connect(f.frequency); }   // 비는 게인(세기, v의 비율), 바람은 컷오프(Hz)를 흔든다
      o.start(); oscs.push(o); }
    return { stop:t=>oscs.forEach(o=>o.stop(t)) }; }

  // music 플레이어: 8분음표 단위로 예약한다. 마디가 바뀔 때 그 마디의 계획(패턴·쉼표·옥타브·베이스·리드)을 시드 난수로 세운다
  function music(ac, dest, def, trace){
    const g=ac.createGain(), lp=ac.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=2600; lp.connect(g); g.connect(dest);
    const beat=60/def.bpm, step=beat/2, PATS=[[0,1,2,3,4,5,4,3],[0,2,1,3,2,4,3,5],[0,3,1,4,2,5,2,4],[0,1,2,1,3,2,4,3],[0,2,4,2,1,3,5,3]];
    let t0=0, i=0, plan=null;
    function planBar(bar){ const r=rng(def.seed*7919+bar%64), ch=CHORD[def.prog[bar%def.prog.length]], base=12*(def.oct+1);
      const pool=[ch[0],ch[1],ch[2],ch[0]+12,ch[1]+12,ch[2]+12].map(n=>base+n), pat=PATS[Math.floor(r()*PATS.length)];
      const notes=pat.map((p,k)=>{ if (k>0 && r()<def.rest) return null; let n=pool[p]; if (k>0 && r()<.08) n+=(n<base+12?12:-12); return n; });   // 첫 박은 늘 근음(화성을 잡아 준다)
      const bass=[base-36+ch[0]], twice=def.bassTwice && r()<.7; if (twice) bass.push(r()<.5 ? bass[0] : bass[0]+7);
      const lead=def.lead && bar%2===0 ? base+12+ch[Math.floor(r()*3)] : null;
      return { notes, bass, lead, hatSkip:r()<.25 }; }
    return { gain:g, bpm:def.bpm, barLen:beat*4,
      begin(t){ t0=t; },
      pos(now){ const b=(now-t0)/beat; return b<0 ? { bar:0, beat:0 } : { bar:Math.floor(b/4), beat:Math.floor(b%4) }; },
      schedule(until){ while (t0+i*step < until){ const t=t0+i*step, k=i%8, bar=Math.floor(i/8); if (k===0) plan=planBar(bar);
          trace?.push({ i, t, lead:t-ac.currentTime });
          const n=plan.notes[k]; if (n!=null) tone(ac, lp, { w:'pulse12', f:synth.midi(n), d:step*1.6, v:LEVEL.arp }, t);
          if (k===0) tone(ac, lp, { w:'triangle', f:synth.midi(plan.bass[0]), d:beat*(plan.bass[1]!=null?1.9:3.8), v:LEVEL.bass, a:.02, rel:.25 }, t);
          if (k===4 && plan.bass[1]!=null) tone(ac, lp, { w:'triangle', f:synth.midi(plan.bass[1]), d:beat*1.9, v:LEVEL.bass, a:.02, rel:.25 }, t);
          const hv=def.hat[k%2]; if (hv && !(plan.hatSkip && k===6)) hit(ac, g, { hp:7000, d:.03, v:LEVEL.hat*hv }, t);
          if (k===0 && plan.lead!=null) tone(ac, g, { w:'sine', f:synth.midi(plan.lead), d:beat*6, v:LEVEL.lead, a:.4, rel:1 }, t);
          i++; } } };
  }
  // ambient 플레이어: 바닥(bed)은 바로 켜고, 짧은 소리는 난수 간격으로 예약한다
  function ambient(ac, dest, def, trace){
    const g=ac.createGain(); g.connect(dest); const r=rng(def.seed*104729), beds=[]; let next=0;
    const between=([a,b])=>a+r()*(b-a);
    const PENTA=[84,88,91,93,96];   // C6 E6 G6 A6 C7
    function event(t){ trace?.push({ t, lead:t-ac.currentTime });
      if (def.birds){ const n=2+Math.floor(r()*4), f=2200+r()*900, up=r()<.6; for (let k=0;k<n;k++) tone(ac, g, { w:'sine', f, f1:up?f*(1.25+r()*.25):f*(.72+r()*.1), d:.05+r()*.04, v:LEVEL.birds*def.birds.v*(.7+r()*.3), a:.005 }, t+k*(.09+r()*.07)); return between(def.birds.every); }
      if (def.crickets){ const f=def.crickets.f[Math.floor(r()*def.crickets.f.length)]+r()*120, n=3+Math.floor(r()*2); for (let k=0;k<n;k++) tone(ac, g, { w:'sine', f, d:.018, v:LEVEL.crickets*def.crickets.v, a:.004 }, t+k*.04); return between(def.crickets.every); }
      if (def.drops){ const big=r()<.1, f=synth.midi(PENTA[Math.floor(r()*PENTA.length)]-(big?12:0)); tone(ac, g, { w:'sine', f, f1:f*.7, d:big?.08:.035, v:LEVEL.drops*def.drops.v*(big?1.3:.6+r()*.4), a:.003 }, t); return between(def.drops.every); }
      return 1; }
    return { gain:g, bpm:0,
      begin(t){ next=t+.3; if (def.wind) beds.push(bed(ac, g, { ...def.wind, v:LEVEL.wind*def.wind.v })); if (def.rain) beds.push(bed(ac, g, { ...def.rain, v:LEVEL.rain*def.rain.v })); },
      pos(){ return null; },
      schedule(until){ while (next < until) next+=event(next); },
      end(t){ beds.forEach(b=>b.stop(t)); } };
  }
  function make(ac, dest, name, trace){ const def=TRACKS[name]; const p=(def.kind==='music' ? music : ambient)(ac, dest, def, trace); p.name=name; p.def=def; return p; }

  function init(){ if (master) return true; const ac=synth.init(); if (!ac) return false; ctx=ac; master=ac.createGain(); master.gain.value=vol; master.connect(synth.bus()); return true; }
  function tick(){ const until=ctx.currentTime+(document.hidden ? 1.2 : .1); if (cur) cur.schedule(until); if (!cur && !fading.length){ clearInterval(timer); timer=0; } }
  // 지금 것을 fade초로 줄이고 끝낸다. 예약된 음은 게인이 0이 된 뒤 끊어 버린다
  function fadeOut(p, fade){ const t=ctx.currentTime; p.gain.gain.cancelScheduledValues(t); p.gain.gain.setValueAtTime(p.gain.gain.value, t); p.gain.gain.linearRampToValueAtTime(0, t+fade);
    fading.push(p); setTimeout(()=>{ try { p.end?.(ctx.currentTime); p.gain.disconnect(); } catch {} fading.splice(fading.indexOf(p), 1); }, fade*1000+100); }
  function start(name, { fade=.7 }={}){ if (!TRACKS[name] || !init()) return false; if (cur?.name===name) return true;
    if (cur) fadeOut(cur, fade);
    const t=ctx.currentTime+.05, p=make(ctx, master, name, bgm.trace); p.gain.gain.setValueAtTime(0, t); p.gain.gain.linearRampToValueAtTime(1, t+fade); p.begin(t); cur=p;
    if (!timer) timer=setInterval(tick, 25); tick(); return true; }
  function stop({ fade=.7 }={}){ if (!cur) return; fadeOut(cur, fade); cur=null; }
  // 트랙을 OfflineAudioContext에 secs초 그려 AudioBuffer로(크기 측정용). 페이드 없이 바로 시작하고 컴프레서까지 같은 사슬을 지난다
  function render(name, secs=16, sr=48000){ const ac=new OfflineAudioContext(1, Math.ceil(secs*sr), sr), g=synth.graph(ac), m=ac.createGain(); m.gain.value=vol; m.connect(g.comp);
    const p=make(ac, m, name); p.gain.gain.value=1; p.begin(.05); p.schedule(secs); return ac.startRendering(); }
  return { start, stop, render, TRACKS, trace:null,
    get current(){ return cur?.name??null; }, get position(){ return cur && ctx ? cur.pos(ctx.currentTime) : null; },
    get volume(){ return vol; }, set volume(v){ vol=v; if (master) master.gain.setTargetAtTime(v, ctx.currentTime, .05); } };
})();
