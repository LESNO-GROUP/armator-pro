// ────────────────────────────────────────────────────────────
//  ZabudujTO Konfigurator — App logic
// ────────────────────────────────────────────────────────────

const STORAGE_KEY = 'lesno_konfig_v3';

const STEPS = [
  {n:1, label:'Typ', next:'Dalej — wymiary'},
  {n:2, label:'Wymiary', next:'Dalej — układ'},
  {n:3, label:'Układ', next:'Dalej — fronty i kolor'},
  {n:4, label:'Materiały', next:'Dalej — podsumowanie'},
  {n:5, label:'Kontakt', next:'Wyślij projekt →'},
];

// default state ----------------------------------------------
function defaultState(){
  return {
    step:1,
    type:'szafa', typeName:'Szafa wnękowa',
    dim:{w:2000, h:2600, d:600},
    uneven:false,
    sections:[
      {w:666, items:defaultItems('szafa','polki')},
      {w:667, items:defaultItems('szafa','drazek')},
      {w:667, items:defaultItems('szafa','szuflady')},
    ],
    base:'cokol', // cokol | podloga | nozki
    leg:'gtv-dak27',
    legColor:'czarna',
    accessories:{oswietlenie:false},
    frontMode:'hinged', // 'hinged' | 'sliding'
    sectionFronts:[true,true,true], // for hinged; ignored for sliding
    material:'k013', materialName:'Biel Alpejska', materialCode:'8685',
    splitFront:false,      // osobny dekor frontów
    frontMat:'plyta',      // 'plyta' | 'mdf' — materiał frontów
    mdf:{finish:'mat', ral:'9010', profile:'gladki'},
    materialFront:'k013',  // używane gdy splitFront===true
    matEditing:'corpus',   // 'corpus' | 'fronts' — który dekor aktualnie wybieramy
    hinges:'soft',         // 'standard' | 'soft' (cichy domyk)
    slidingProfile:'caro',          // caro|nero|novo|ergo|loca|dzielony|bezramowy
    slidingProfileColor:'aluminium',// aluminium|czarny|bialy
    slidingFill:'plyta',            // plyta|lustro|szklo (gdy fillable && !divisible)
    slidingSplits:{count:2, fills:['lustro','plyta']}, // gdy divisible
    handle:'galka-spot', handleColor:'czarny', handlePrice:14,
    previewView:'front',
    matTone:'all',
    band:null,             // {position:'top'|'bottom', h:300, from:0, to:1} — przelotowa półka
    blenda:{left:0, right:0, top:0},  // blendy maskujące (mm, 0 = brak, zakres 0–200)
    slope:{on:false, side:'right', hLow:1800, flat:0},  // skośny sufit: hLow = wys. przy niższej krawędzi, flat = długość prostego sufitu (0 = brak, skos od razu)
    notch:{on:false, side:'left', from:'bottom', w:300, h:1000, d:150},  // uskok: komin/rura — w/h/d przeszkody
    lead:{name:'',email:'',phone:'',city:'',notes:'',consent:false},
  };
}
function defaultItems(type,kind){
  if(kind==='szuflady') return [
    {type:'szuflada', h:200, variant:'standard'},
    {type:'szuflada', h:200, variant:'standard'},
    {type:'szuflada', h:200, variant:'standard'},
    {type:'szuflada', h:200, variant:'standard'},
    {type:'polka', h:250},
    {type:'polka', h:250},
    {type:'polka', h:250},
    {type:'polka', h:250},
    {type:'polka', h:250},
  ];
  if(kind==='drazek') return [
    {type:'polka', h:300},
    {type:'drazek', h:1100, variant:'prosty-owal'},
    {type:'polka', h:300},
    {type:'polka', h:300},
    {type:'polka', h:300},
  ];
  return [
    {type:'polka', h:400},
    {type:'polka', h:400},
    {type:'polka', h:400},
    {type:'polka', h:400},
    {type:'polka', h:400},
    {type:'polka', h:400},
  ];
}

// ── STATE load/save
let STATE;
function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw){
      const parsed = JSON.parse(raw);
      if(parsed && parsed.dim){
        // ── legacy migrations ──────────────────────────────
        if(parsed.handle==='relingowe') parsed.handle='reling-128';
        if(typeof parsed.splitFront==='undefined') parsed.splitFront=false;
        if(!parsed.frontMat) parsed.frontMat='plyta';
        if(!parsed.mdf) parsed.mdf={finish:'mat', ral:'9010', profile:'gladki'};
        if(!parsed.materialFront) parsed.materialFront = parsed.material;
        if(!parsed.matEditing) parsed.matEditing='corpus';
        if(!parsed.hinges) parsed.hinges='soft';
        // sliding migrations — old (slim/standard/ramka/bezramowy + chrom/szampanski) → new GTV systems
        const slidingMap = {slim:'caro', standard:'caro', ramka:'dzielony'};
        if(slidingMap[parsed.slidingProfile]) parsed.slidingProfile = slidingMap[parsed.slidingProfile];
        if(!parsed.slidingProfile) parsed.slidingProfile='caro';
        // rename slidingHwColor → slidingProfileColor + map values
        const colorMap = {chrom:'aluminium', szampanski:'aluminium'};
        if(parsed.slidingHwColor && !parsed.slidingProfileColor){
          parsed.slidingProfileColor = colorMap[parsed.slidingHwColor] || parsed.slidingHwColor;
          delete parsed.slidingHwColor;
        }
        if(!parsed.slidingProfileColor) parsed.slidingProfileColor='aluminium';
        if(!parsed.slidingFill) parsed.slidingFill='plyta';
        if(!parsed.slidingSplits) parsed.slidingSplits={count:2, fills:['lustro','plyta']};
        if(typeof parsed.band === 'undefined') parsed.band = null;
        if(!parsed.blenda) parsed.blenda = {left:0, right:0, top:0};
        if(!parsed.slope) parsed.slope = {on:false, side:'right', hLow:1800, flat:0};
        if(typeof parsed.slope.flat === 'undefined') parsed.slope.flat = parsed.slope.span ? Math.max(0, (parsed.dim?parsed.dim.w:2000) - parsed.slope.span) : 0;
        delete parsed.slope.span;
        // drążek = cała strefa wieszania (dawniej osobny element 60 mm + "przestrzeń otwarta")
        (parsed.sections||[]).forEach(sec=>{
          const its = sec.items||[];
          for(let i=0;i<its.length;i++){
            const it = its[i];
            if(it.type!=='drazek' || (Number(it.h)||0) >= 300) continue;
            if(its[i+1] && its[i+1].type==='otwarta'){ it.h = (Number(it.h)||0) + (Number(its[i+1].h)||0); its.splice(i+1,1); }
            else it.h = 1000;
            if(its[i-1] && its[i-1].type==='otwarta') its[i-1] = {type:'polka', h:its[i-1].h};
          }
        });
        if(!parsed.notch) parsed.notch = {on:false, side:'left', from:'bottom', w:300, h:1000, d:150};
        if(typeof parsed.notch.d === 'undefined') parsed.notch.d = 150;
        if(!parsed.leg) parsed.leg='gtv-dak27';
        if(!parsed.legColor) parsed.legColor='czarna';
        // handle migrations — old set → new set
        const handleMap = {
          'bezuchwytowe':'tipon',
          'galka-kula':'galka-spot',
          'galka-kostka':'galka-spot',
          'krawedziowy':'uchwyt-hexa-160',
          'reling-128':'uchwyt-bagio-128',
          'reling-192':'uchwyt-bagio-192',
          'tbar':'uchwyt-hexa-160',
          'relingowe':'uchwyt-bagio-128',
        };
        if(handleMap[parsed.handle]) parsed.handle = handleMap[parsed.handle];
        if(!parsed.handle) parsed.handle='galka-spot';
        if(!parsed.handleColor) parsed.handleColor='czarny';
        // variant id migrations
        const rodMap={prosty:'prosty-owal', led:'prosty-owal', wysuwny:'pantograf'};
        const drwMap={cicha:'modernbox'};
        (parsed.sections||[]).forEach(sec=>{
          (sec.items||[]).forEach(it=>{
            if(it.type==='drazek' && rodMap[it.variant]) it.variant=rodMap[it.variant];
            if(it.type==='szuflada'){
              if(it.variant==='wewnetrzna'){ it.internal=true; it.variant='standard'; }
              else if(drwMap[it.variant]) it.variant=drwMap[it.variant];
            }
          });
        });
        return parsed;
      }
    }
  }catch(e){}
  return defaultState();
}
function saveState(){ try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(STATE)); }catch(e){} }

// ────────────────────────────────────────────────────────────
//  ICONS for item types (SVG snippets)
// ────────────────────────────────────────────────────────────
const ITEM_ICONS = {
  shelf:`<svg viewBox="0 0 20 20" fill="none"><rect x="2" y="8" width="16" height="3" fill="currentColor"/><line x1="2" y1="13" x2="2" y2="17" stroke="currentColor" stroke-width="1"/><line x1="18" y1="13" x2="18" y2="17" stroke="currentColor" stroke-width="1"/></svg>`,
  rod:`<svg viewBox="0 0 20 20" fill="none"><line x1="2" y1="6" x2="18" y2="6" stroke="currentColor" stroke-width="2"/><circle cx="3" cy="6" r="1.2" fill="currentColor"/><circle cx="17" cy="6" r="1.2" fill="currentColor"/><path d="M6 6 L5 11 L7 11 Z M10 6 L9 12 L11 12 Z M14 6 L13 10 L15 10 Z" fill="none" stroke="currentColor" stroke-width=".8"/></svg>`,
  drawers:`<svg viewBox="0 0 20 20" fill="none"><rect x="3" y="3" width="14" height="4" stroke="currentColor" stroke-width="1" fill="none"/><rect x="3" y="8" width="14" height="4" stroke="currentColor" stroke-width="1" fill="none"/><rect x="3" y="13" width="14" height="4" stroke="currentColor" stroke-width="1" fill="none"/><line x1="8" y1="5" x2="12" y2="5" stroke="currentColor" stroke-width="1"/><line x1="8" y1="10" x2="12" y2="10" stroke="currentColor" stroke-width="1"/><line x1="8" y1="15" x2="12" y2="15" stroke="currentColor" stroke-width="1"/></svg>`,
  drawer:`<svg viewBox="0 0 20 20" fill="none"><rect x="3" y="6" width="14" height="8" stroke="currentColor" stroke-width="1" fill="none"/><line x1="8" y1="10" x2="12" y2="10" stroke="currentColor" stroke-width="1"/></svg>`,
  pantograph:`<svg viewBox="0 0 20 20" fill="none"><line x1="2" y1="5" x2="18" y2="5" stroke="currentColor" stroke-width="1.5"/><path d="M5 5 L3 12 M15 5 L17 12 M5 5 L17 12 M15 5 L3 12" stroke="currentColor" stroke-width=".8"/><line x1="3" y1="12" x2="17" y2="12" stroke="currentColor" stroke-width="1.5"/></svg>`,
  basket:`<svg viewBox="0 0 20 20" fill="none"><path d="M3 7 L17 7 L15 17 L5 17 Z" stroke="currentColor" stroke-width="1" fill="none"/><line x1="3" y1="10" x2="17" y2="10" stroke="currentColor" stroke-width=".7"/><line x1="3" y1="13" x2="17" y2="13" stroke="currentColor" stroke-width=".7"/><line x1="7" y1="7" x2="6" y2="17" stroke="currentColor" stroke-width=".7"/><line x1="13" y1="7" x2="14" y2="17" stroke="currentColor" stroke-width=".7"/></svg>`,
  open:`<svg viewBox="0 0 20 20" fill="none"><rect x="3" y="3" width="14" height="14" stroke="currentColor" stroke-width="1" fill="none" stroke-dasharray="2 2"/></svg>`,
  seat:`<svg viewBox="0 0 20 20" fill="none"><rect x="2" y="8" width="16" height="4" rx="1.5" fill="currentColor"/><line x1="4" y1="12" x2="4" y2="17" stroke="currentColor" stroke-width="1.4"/><line x1="16" y1="12" x2="16" y2="17" stroke="currentColor" stroke-width="1.4"/></svg>`,
  washer:`<svg viewBox="0 0 20 20" fill="none"><rect x="3" y="3" width="14" height="14" rx="1" stroke="currentColor" stroke-width="1.2"/><circle cx="10" cy="11" r="4" stroke="currentColor" stroke-width="1.1"/><circle cx="6" cy="5.5" r="1" fill="currentColor"/><circle cx="14" cy="5.5" r="1" fill="currentColor"/></svg>`,
};

// ────────────────────────────────────────────────────────────
//  COLOR utils
// ────────────────────────────────────────────────────────────
function shade(hex, factor){
  if(!hex) hex = '#cdc6b4';
  const c = String(hex).replace('#','');
  const r = parseInt(c.substr(0,2),16), g=parseInt(c.substr(2,2),16), b=parseInt(c.substr(4,2),16);
  const t = factor<0 ? 0 : 255, p = Math.abs(factor);
  const nr = Math.round((t-r)*p + r), ng=Math.round((t-g)*p + g), nb=Math.round((t-b)*p + b);
  return '#'+[nr,ng,nb].map(x=>x.toString(16).padStart(2,'0')).join('');
}

// ────────────────────────────────────────────────────────────
//  CUT LIST — lista formatek, cięcia i obrzeże
//  MODEL: każda sekcja = osobna szafka z własnymi ściankami
//         (2 boki + wieniec górny + dolny + plecy HDF)
//  Każda formatka płytowa oklejana z 3 stron (przód + dwa boki)
//  Zwraca: pieces[], pieceCount, cutMb, edgeMb, corpusSqm, frontsSqm
// ────────────────────────────────────────────────────────────
// ── Fronty MDF lakierowane ─────────────────────────────────
const MDF_PRICE = 450;                 // zł/m² frontu (MDF 19 mm + lakier jednostronny)
const MDF_FINISH = {mat:'Mat', polmat:'Półmat', polysk:'Połysk'};
const MDF_PROFILES = [
  {id:'gladki',   name:'Gładki'},
  {id:'ramka',    name:'Frezowany — ramka'},
  {id:'wzor',     name:'Frezowany — wzór'},
  {id:'ryflowany',name:'Ryflowany / lamele'},
  {id:'uchwyt',   name:'Uchwyt frezowany'},
];
// Popularne RAL → kolor podglądu (orientacyjnie)
const RAL_HEX = {
  '1013':['#e3d9c6','Biel perłowa'],'1015':['#e6d2b5','Kość słoniowa jasna'],'1019':['#a48f7a','Beż szary'],
  '3004':['#6b1c23','Purpura'],'5011':['#1a2b3c','Granat stalowy'],'5014':['#606e8c','Niebieski gołębi'],
  '6005':['#0f4336','Zieleń mchu'],'6021':['#89ac76','Zieleń blada'],'7004':['#9b9b9b','Szary sygnałowy'],
  '7016':['#383e42','Antracyt'],'7021':['#2f3234','Szary czarny'],'7035':['#cbd0cc','Szary jasny'],
  '7036':['#9a9697','Szary platynowy'],'7044':['#b8b3a6','Szary jedwabisty'],'8017':['#45322e','Brąz czekoladowy'],
  '9001':['#e9e0d2','Biel kremowa'],'9002':['#d7d5cb','Biel szara'],'9003':['#ecece7','Biel sygnałowa'],
  '9005':['#0e0e10','Czerń głęboka'],'9010':['#f1ece1','Biel czysta'],'9016':['#f1f0ea','Biel drogowa'],
  '9018':['#cfd3cd','Biel papirusowa'],
};
function mdfOn(){ return STATE.frontMat === 'mdf' && STATE.frontMode !== 'sliding'; }
function mdfInfo(){
  const r = String((STATE.mdf && STATE.mdf.ral) || '').replace(/\D/g,'');
  const hit = RAL_HEX[r];
  return { ral:r, hex: hit ? hit[0] : '#e8e4dc', name: hit ? hit[1] : (r.length===4 ? 'kolor wg wzornika RAL' : '') };
}
function mdfLabel(){
  const m = STATE.mdf || {}, i = mdfInfo();
  const p = MDF_PROFILES.find(x=>x.id===m.profile) || MDF_PROFILES[0];
  return `MDF 19 mm lakierowany · RAL ${i.ral||'—'} · ${MDF_FINISH[m.finish]||'Mat'} · ${p.name}`;
}

function buildCutList(){
  const d = STATE.dim.d;
  const w = cabinetW(), h = cabinetH();
  const T = 18;
  const pieces = [];
  const add = (name, pw, ph, qty, edges, kind) => {
    if(pw<=0 || ph<=0 || qty<=0) return;
    pieces.push({name, w:Math.round(pw), h:Math.round(ph), qty, edges, kind: kind || 'corpus'});
  };

  // ── każda sekcja jako osobna szafka ──
  STATE.sections.forEach((s,si)=>{
    const secH = Math.round(sectionCabinetH(si));       // wysokość szafki
    const liftMm = s.lift || 0;
    const dSec = notchAffects(si) ? Math.max(100, d - (STATE.notch.d||150)) : d;
    const notchTag = notchAffects(si) ? ` · głęb. ${dSec}` : '';
    const tag = `S${si+1} (${s.w} mm)`;

    // szafka dzielona automatycznie na części ≤ 2000 mm (dół + nadstawka)
    const parts = sectionParts(si);
    parts.forEach((ph, pi)=>{
      const pTag = parts.length > 1
        ? (pi===0 ? ' · dół' : (pi===parts.length-1 ? ' · nadstawka' : ` · część ${pi+1}`))
        : '';
      add(`Bok szafki ${tag}${pTag}${notchTag}`, ph, dSec, 2, 3);
      add(`Wieniec górny ${tag}${pTag}${notchTag}`, s.w, dSec, 1, 3);
      add(`Wieniec dolny ${tag}${pTag}${notchTag}`, s.w, dSec, 1, 3);
      add(`Plecy HDF ${tag}${pTag}`, s.w + 2*T, ph, 1, 0, 'hdf');
    });
    // dno podniesionej sekcji (lift) — dodatkowa półka nośna
    if(liftMm > 0) add(`Dno nad podłogą ${tag}`, s.w, dSec, 1, 3);

    // wyposażenie wnętrza
    const shelves = s.items.filter(it=>it.type==='polka');
    const repl = sectionSplitPlan(si).joints.filter(j=>j.replaces).length;
    const boards = sectionBoardCount(s) - repl;
    if(boards > 0) add(`Półka ${tag}${notchTag}`, s.w, dSec, boards, 3);
    const withDiv = shelves.filter(it=>it.variant==='przegroda').length;
    if(withDiv) add(`Przegroda w półce ${tag}`, 250, dSec, withDiv, 3);
    const seats = s.items.filter(it=>it.type==='siedzisko');
    if(seats.length) add(`Siedzisko płytowe ${tag}`, s.w, dSec, seats.length, 3);
  });

  // przelotowa półka — jedna deska przez kilka szafek
  if(STATE.band){
    let cur = 0, k = 0;
    const flush = ()=>{ if(cur>0){ k++; add(`Półka przelotowa ${k}`, cur, d, 1, 3); } cur = 0; };
    for(let i=STATE.band.from; i<=STATE.band.to && i<STATE.sections.length; i++){
      const sw = STATE.sections[i].w;
      const next = cur ? cur + SEC_STRIDE + sw : sw;
      if(next > MAX_PIECE && cur > 0){ flush(); cur = sw; }
      else cur = next;
    }
    flush();
  }
  // cokół — listwa frontowa, dzielona na odcinki ≤ 2000 mm
  if(STATE.base === 'cokol'){
    splitLen(cabinetW(), MAX_TRIM).forEach((L,i,arr)=>{
      add(`Cokół 100 mm${arr.length>1?` · odcinek ${i+1}`:''}${mdfOn()?' · MDF lakier':''}`, L, 100, 1, mdfOn()?0:3, mdfOn()?'mdf':'corpus');
    });
  }

  // fronty
  if(STATE.frontMode==='sliding'){
    const panels = Math.min(4, Math.max(2, STATE.sections.length));
    splitLen(h, MAX_SHEET).forEach((L,i,arr)=>{
      add(`Front przesuwny (wkład)${arr.length>1?` · pas ${i+1}`:''}`, Math.round(w/panels), L, panels, 4, 'front');
    });
  } else {
    STATE.sections.forEach((s,si)=>{
      if(!STATE.sectionFronts[si]) return;
      const leaves = frontLeaves(si);
      leaves.forEach((lf,li)=>{
        splitLen(lf.h, MAX_SHEET).forEach((L,i,arr)=>{
          add(`Front uchylny S${si+1} (${s.w} mm)${leaves.length>1?` · ${li+1}/${leaves.length}`:''}${arr.length>1?` · część ${i+1}`:''}${mdfOn()?' · MDF lakier':''}`, s.w - 4, L, 1, mdfOn()?0:4, mdfOn()?'mdf':'front');
        });
      });
    });
  }

  // blendy maskujące
  const bl = STATE.blenda || {left:0,right:0,top:0};
  const addSplit = (name, len, wdt, vertical)=>{
    splitLen(len, MAX_TRIM).forEach((L,i,arr)=>{
      const nm = arr.length>1 ? `${name} · odcinek ${i+1}` : name;
      const k = mdfOn() ? 'mdf' : 'front', e = mdfOn() ? 0 : 3, nmm = mdfOn() ? nm + ' · MDF lakier' : nm;
      if(vertical) add(nmm, wdt, L, 1, e, k); else add(nmm, L, wdt, 1, e, k);
    });
  };
  if(bl.left){
    const [a,b] = sideBlendaH('left');
    addSplit(`Blenda lewa${Math.abs(a-b)>1?' (cięta pod skos)':''}`, Math.max(a,b), bl.left, true);
  }
  if(bl.right){
    const [a,b] = sideBlendaH('right');
    addSplit(`Blenda prawa${Math.abs(a-b)>1?' (cięta pod skos)':''}`, Math.max(a,b), bl.right, true);
  }
  if(bl.top)   addSplit('Blenda górna', STATE.dim.w, bl.top,   false);

  let cutMb = 0, edgeMb = 0, pieceCount = 0, corpusSqm = 0, frontsSqm = 0, hdfSqm = 0, mdfSqm = 0;
  pieces.forEach(p=>{
    pieceCount += p.qty;
    const sqm = p.qty * (p.w/1000) * (p.h/1000);
    if(p.kind === 'front') frontsSqm += sqm;
    else if(p.kind === 'hdf') hdfSqm += sqm;
    else if(p.kind === 'mdf'){ mdfSqm += sqm; return; }   // MDF: cięcie + lakier w stawce 450 zł/m²
    else corpusSqm += sqm;
    // cięcie ≈ obwód formatki
    cutMb += p.qty * (2*(p.w + p.h))/1000;
    // obrzeże: 3 = przód + dwa boki, 4 = pełny obwód, 0 = brak (HDF)
    if(p.edges === 4)      edgeMb += p.qty * (2*(p.w + p.h))/1000;
    else if(p.edges === 3) edgeMb += p.qty * (p.w + 2*p.h)/1000;
    else if(p.edges === 1) edgeMb += p.qty * Math.max(p.w, p.h)/1000;
  });

  return {
    pieces,
    pieceCount,
    cutMb: Math.round(cutMb*10)/10,
    edgeMb: Math.round(edgeMb*10)/10,
    cutsCount: pieceCount * 4,
    corpusSqm: Math.round(corpusSqm*1000)/1000,
    frontsSqm: Math.round(frontsSqm*1000)/1000,
    hdfSqm: Math.round(hdfSqm*1000)/1000,
    mdfSqm: Math.round(mdfSqm*1000)/1000,
  };
}

// ────────────────────────────────────────────────────────────
//  PRICING — silnik kosztorysu (brutto)
//  Składowe:
//   1. Materiał (płyta) — cena Kronospan / m² × (1 + odpad)
//   2. Cięcie — m² płyty × cuttingPerSqm × cuttingPerMb
//   3. Obrzeże — m² płyty × edgingPerSqm × edgingPerMb
//   4. Robocizna — m² płyty × laborPerSqm
//   5. Designe — ryczałt designFee
//   6. Akcesoria — wkłady sekcji + zawiasy + uchwyty + nóżki + oświetlenie
// ────────────────────────────────────────────────────────────
function priceBreakdown(){
  normalizeShelfHeights();
  const d = STATE.dim.d;
  const w = cabinetW(), h = cabinetH();

  // 1. Powierzchnie płyty — z REALNEJ listy formatek (każda sekcja = osobna szafka)
  const cut = buildCutList();
  const corpus_m2 = Math.max(0.1, cut.corpusSqm);
  const fronts_m2 = cut.frontsSqm;
  const hdf_m2 = cut.hdfSqm;
  const board_m2 = corpus_m2 + fronts_m2;

  // akcesoria / wkłady sekcji
  let accCost = 0;
  STATE.sections.forEach(s=>{
    s.items.forEach(it=>{
      const t = ITEM_TYPES[it.type]; if(!t) return;
      let p = t.price || 0;
      if(it.variant && t.variants){
        const v = t.variants.find(vv=>vv.id===it.variant);
        if(v) p = v.price || 0;
      } else if(it.type==='szuflady'){
        const count = (it.opts && it.opts.count) || 4;
        p = 80 * count;
      }
      accCost += p;
    });
  });
  const frontCount = STATE.frontMode==='sliding'
    ? Math.min(4, Math.max(2, STATE.sections.length))
    : STATE.sections.reduce((a,_,si)=>a + frontLeaves(si).length, 0);

  // 2. Materiał — cena Kronospana × (1 + odpad)
  const matC = MATERIALS.find(m=>m.id===STATE.material) || MATERIALS[0];
  const matF = STATE.splitFront ? (MATERIALS.find(m=>m.id===STATE.materialFront)||matC) : matC;
  const sheetSqm = PRICING.sheetSqm || 5.796;
  const nest = buildNesting(cut);
  const sheetsNoWaste = nest.sheets || 1;
  const wasteRule = (PRICING.wasteRules||[{maxSheets:Infinity,rate:0.2}])
    .find(r => sheetsNoWaste <= r.maxSheets);
  const waste = board_m2 > 0 ? Math.max(0, (nest.sheets*sheetSqm - board_m2) / board_m2) : 0;
  const mdf_m2 = cut.mdfSqm || 0;
  const mdfCost = mdf_m2 * MDF_PRICE;
  // płyta liczona pełnymi arkuszami z rozkroju (rozpoczęty arkusz = cały)
  const materialCost = nest.cost
    + hdf_m2 * (PRICING.hdfPerSqm || 22)
    + mdfCost;

  // 3. Cięcie + 4. Obrzeże — z realnej listy formatek
  const cuttingMb = cut.cutMb;
  const edgingMb  = cut.edgeMb;
  const cuttingCost = cuttingMb * (PRICING.cuttingPerMb || 0);
  const edgingCost  = edgingMb  * (PRICING.edgingPerMb  || 0);

  // 5. Robocizna — m² zużytej płyty (z odpadem)
  const laborCost = board_m2 * (1 + waste) * (PRICING.laborPerSqm || 0);

  // 6. Designe ryczałt
  const designCost = PRICING.designFee || 0;
  // 6b. Plecy mebla (HDF/płyta) — stała dopłata
  const backCost = PRICING.backPanel || 0;

  // 7. Akcesoria — zawiasy, nóżki, uchwyty, oświetlenie, profile przesuwne
  let hardwareCost = 0;
  if(STATE.frontMode==='hinged'){
    const hinge = HINGES.find(h=>h.id===STATE.hinges) || HINGES[0];
    // liczba zawiasów zależna od wysokości frontu (per sekcja z frontem)
    // wysokość frontu liczona od korpusu (niezależnie od cokołu/nóżek)
    STATE.sections.forEach((s,si)=>{
      frontLeaves(si).forEach(lf=>{ hardwareCost += hingeCount(lf.h) * (hinge.price||0); });
    });
  }
  if(STATE.frontMode==='sliding'){
    const prof = SLIDING_PROFILES.find(p=>p.id===STATE.slidingProfile) || SLIDING_PROFILES[0];
    hardwareCost += frontCount * (prof.price||0);
    // wypełnienie — dopłata × m² powierzchni drzwi
    if(prof.fillable && typeof SLIDING_FILLS!=='undefined'){
      const total_doors_m2 = fronts_m2;
      if(prof.divisible){
        const sp = STATE.slidingSplits || {count:2, fills:['plyta','plyta']};
        const fillsArr = sp.fills.slice(0, sp.count);
        const perStripe = total_doors_m2 / Math.max(1, fillsArr.length);
        fillsArr.forEach(fid=>{
          const f = SLIDING_FILLS.find(x=>x.id===fid);
          if(f && f.price) hardwareCost += perStripe * f.price;
        });
      } else {
        const f = SLIDING_FILLS.find(x=>x.id===STATE.slidingFill);
        if(f && f.price) hardwareCost += total_doors_m2 * f.price;
      }
    }
  }
  // nóżki ×4
  if(STATE.base==='nozki' && typeof LEGS!=='undefined'){
    const leg = LEGS.find(l=>l.id===STATE.leg);
    if(leg) hardwareCost += 4 * (leg.price||0);
  }
  // cokoł — dopłata stała
  if(STATE.base==='cokol') hardwareCost += 25;
  // wiszący — montaż na stelażu/wspornikach
  if(STATE.base==='wiszacy') hardwareCost += 25;
  // handles — tylko dla frontów uchylnych
  let handleCost = 0;
  if(STATE.frontMode !== 'sliding'){
    const handle = HANDLES.find(h=>h.id===STATE.handle) || HANDLES[0];
    if(handle){
      let per = handle.price || 0;
      if(handle.colors){
        const c = handle.colors.find(c=>c.id===STATE.handleColor) || handle.colors[0];
        if(c) per += (c.price||0);
      }
      if(handle.unit==='/ projekt') handleCost = per;
      else if(handle.unit==='/ front') handleCost = frontCount * per;
      else handleCost = frontCount * per; // / szt. — 1 na front
    }
  }
  const handle = HANDLES.find(h=>h.id===STATE.handle) || HANDLES[0];
  hardwareCost += handleCost;
  // LED
  if(STATE.accessories.oswietlenie){
    hardwareCost += (w/1000) * (PRICING.lightingPerM || 0);
  }

  const subtotal = materialCost + cuttingCost + edgingCost + laborCost + designCost + backCost + accCost + hardwareCost;
  const total = Math.max(PRICING.minOrder || 0, Math.round(subtotal));
  const vat = PRICING.vat || 0.23;
  const netto = Math.round(total / (1+vat));

  return {
    // surowe pola
    corpus_m2, fronts_m2, hdf_m2, board_m2,
    sheetsNoWaste, waste, nest,
    matC, matF, frontCount,
    // koszty (zaokrąglone)
    materialCost: Math.round(materialCost),
    mdf_m2, mdfCost: Math.round(mdfCost),
    cuttingCost:  Math.round(cuttingCost),
    edgingCost:   Math.round(edgingCost),
    laborCost:    Math.round(laborCost),
    designCost,
    backCost,
    accCost:      Math.round(accCost),
    hardwareCost: Math.round(hardwareCost),
    handleCost:   Math.round(handleCost),
    total,        // brutto
    netto,        // netto
    vat,
    cut,          // lista formatek + mb cięć/obrzeża
  };
}
function computePrice(){ return priceBreakdown().total; }
function fmtPrice(n){ return new Intl.NumberFormat('pl-PL').format(n) + ' zł'; }
function computeBoardArea(){
  const {w,h,d}=STATE.dim;
  const carcass = (2*h*d + w*d*2 + w*h)/1e6;
  let shelves = 0;
  STATE.sections.forEach(s=>{
    s.items.forEach(it=>{
      if(it.type==='polka') shelves += (s.w/1000)*(d/1000);
    });
  });
  const fronts = (w*h)/1e6;
  return (carcass+shelves+fronts).toFixed(1).replace('.',',');
}

// ────────────────────────────────────────────────────────────
//  STEPPER + STEP NAV
// ────────────────────────────────────────────────────────────
function renderStepper(){
  const el = document.getElementById('stepper');
  el.innerHTML = '';
  STEPS.forEach((s,i)=>{
    const d = document.createElement('div');
    d.className = 'step' + (s.n===STATE.step ? ' active' : s.n<STATE.step ? ' done':'');
    d.innerHTML = `<span class="step-idx">${s.n}</span><span class="step-nm">${s.label}</span>`;
    d.addEventListener('click',()=>{ if(s.n<=STATE.step || s.n===STATE.step+1) goToStep(s.n); });
    el.appendChild(d);
    if(i<STEPS.length-1){ const sep=document.createElement('div'); sep.className='step-sep'; el.appendChild(sep); }
  });
}
function showStep(n){
  document.querySelectorAll('.step-panel').forEach(p=>p.classList.toggle('active', Number(p.dataset.step)===n));
  document.getElementById('btnBack').disabled = (n===1);
  document.getElementById('btnNextLabel').textContent = STEPS[n-1].next;
  document.getElementById('btnNext').classList.toggle('submit', n===5);
  document.getElementById('form').scrollTop = 0;
  if(n===3){ 
    // jednorazowa korekta: jeśli sekcje były rozliczane wg starej formuły (dim.w),
    // a teraz formuła zwęziła użyteczną szerokość — wyrównaj.
    const sum = STATE.sections.reduce((a,s)=>a+s.w,0);
    const usable = usableInternalW();
    if(Math.abs(sum - STATE.dim.w) <= 20 && sum - usable > 20){
      fitSectionWidths();
      saveState();
    }
    renderSections();
  }
  if(n===4) { renderMaterials(); renderFrontSections(); }
  if(n===5) renderSummary();
}
function goToStep(n){
  if(n<1||n>5) return;
  STATE.step = n;
  renderStepper(); showStep(n); updatePrice(); saveState();
}

// ────────────────────────────────────────────────────────────
//  STEP 1 — TYPES
// ────────────────────────────────────────────────────────────
function renderTypes(){
  const grid = document.getElementById('typeGrid');
  grid.innerHTML = '';
  TYPES.forEach(t=>{
    const c = document.createElement('div');
    c.className = 'type-card' + (STATE.type===t.id ? ' sel':'');
    c.innerHTML = `
      <div class="type-render">${TYPE_RENDERS[t.id]}</div>
      <div class="tc-check"><svg viewBox="0 0 12 12"><path d="M2 6l3 3 5-6"/></svg></div>
      <div class="tc-info"><div class="tc-num">${t.num}</div><div class="tc-name">${t.name}</div></div>
    `;
    c.onclick = ()=>{
      STATE.type = t.id; STATE.typeName = t.name;
      // presets
      if(t.id==='regal'){ STATE.dim={w:1600,h:2200,d:350}; STATE.sections=[
        {w:533,items:[{type:'polka',h:350},{type:'polka',h:350},{type:'polka',h:350},{type:'polka',h:350},{type:'polka',h:350},{type:'polka',h:350}]},
        {w:533,items:[{type:'polka',h:350},{type:'polka',h:350},{type:'polka',h:350},{type:'polka',h:350},{type:'polka',h:350},{type:'polka',h:350}]},
        {w:534,items:[{type:'polka',h:350},{type:'polka',h:350},{type:'polka',h:350},{type:'polka',h:350},{type:'polka',h:350},{type:'polka',h:350}]},
      ]; STATE.sectionFronts=[false,false,false]; STATE.frontMode='hinged'; }
      else if(t.id==='lazienka'){ STATE.dim={w:1200,h:2100,d:300}; STATE.sections=[{w:600,items:defaultItems('lazienka','polki')},{w:600,items:defaultItems('lazienka','polki')}]; STATE.sectionFronts=[true,true]; STATE.base='wiszacy'; }
      else if(t.id==='garderoba'){ STATE.dim={w:2400,h:2700,d:600}; STATE.sections=[
        {w:600,items:defaultItems('garderoba','drazek')},
        {w:600,items:defaultItems('garderoba','szuflady')},
        {w:600,items:defaultItems('garderoba','polki')},
        {w:600,items:defaultItems('garderoba','drazek')},
      ]; STATE.sectionFronts=[false,false,false,false]; STATE.frontMode='hinged'; }
      else { STATE.dim={w:2000,h:2600,d:600}; STATE.sections=[{w:666,items:defaultItems('szafa','polki')},{w:667,items:defaultItems('szafa','drazek')},{w:667,items:defaultItems('szafa','szuflady')}]; STATE.sectionFronts=[true,true,true]; }
      // sync dim inputs
      document.getElementById('w').value=STATE.dim.w;
      document.getElementById('h').value=STATE.dim.h;
      document.getElementById('d').value=STATE.dim.d;
      renderTypes(); renderPreview(); updatePrice(); saveState();
      if(typeof syncBaseVisibility==='function') syncBaseVisibility();
    };
    grid.appendChild(c);
  });
}

// ────────────────────────────────────────────────────────────
//  STEP 2 — dimensions bindings
// ────────────────────────────────────────────────────────────
function bindDimensions(){
  ['w','h','d'].forEach(k=>{
    const inp = document.getElementById(k);
    inp.value = STATE.dim[k];
    inp.addEventListener('input',()=>{
      const v = Math.max(Number(inp.min)||0, Number(inp.value)||0);
      STATE.dim[k] = v;
      if(k==='w') fitSectionWidths();
      renderPreview(); updatePrice(); saveState();
      if(STATE.step===3) updateSbInfo();
    });
  });
  const ht = document.getElementById('helpToggle');
  const hb = document.getElementById('helpBody');
  ht.addEventListener('click',()=>{ ht.classList.toggle('open'); hb.classList.toggle('open'); });
  // blendy maskujące
  STATE.blenda = STATE.blenda || {left:0,right:0,top:0};
  [['blendaLeft','left'],['blendaRight','right'],['blendaTop','top']].forEach(([id,key])=>{
    const inp = document.getElementById(id);
    if(!inp) return;
    inp.value = STATE.blenda[key] || 0;
    inp.addEventListener('input',()=>{
      let v = Number(inp.value)||0;
      if(v < 0) v = 0;
      if(v > 200) v = 200;
      STATE.blenda[key] = v;
      fitSectionWidths();
      renderSections(); renderPreview(); updatePrice(); saveState();
    });
    inp.addEventListener('blur',()=>{ inp.value = STATE.blenda[key] || 0; });
  });

  // skośny sufit
  STATE.slope = STATE.slope || {on:false, side:'right', hLow:1800};
  const slopeCfg = document.getElementById('slopeCfg');
  const slopeOnB = document.getElementById('slopeOn');
  const slopeOffB = document.getElementById('slopeOff');
  const slopeHLow = document.getElementById('slopeHLow');
  const slopeHHigh = document.getElementById('slopeHHigh');
  function syncSlopeUI(){
    const s = STATE.slope;
    if(slopeOnB) slopeOnB.classList.toggle('on', s.on);
    if(slopeOffB) slopeOffB.classList.toggle('on', !s.on);
    if(slopeCfg) slopeCfg.hidden = !s.on;
    document.querySelectorAll('[data-slopeside]').forEach(b=>{
      b.classList.toggle('on', b.dataset.slopeside === s.side);
    });
    if(slopeHLow){ slopeHLow.value = s.hLow; slopeHLow.max = cabinetH(); }
    if(slopeHHigh) slopeHHigh.value = cabinetH();
    const spanEl = document.getElementById('slopeFlat');
    if(spanEl){ spanEl.value = s.flat || 0; spanEl.max = cabinetW(); }
  }
  window.__syncSlopeUI = syncSlopeUI;
  if(slopeOnB) slopeOnB.addEventListener('click',()=>{
    STATE.slope.on = true;
    if(STATE.slope.hLow >= cabinetH()) STATE.slope.hLow = Math.max(300, cabinetH() - 600);
    syncSlopeUI(); renderSections(); renderPreview(); updatePrice(); saveState();
  });
  if(slopeOffB) slopeOffB.addEventListener('click',()=>{
    STATE.slope.on = false;
    syncSlopeUI(); renderSections(); renderPreview(); updatePrice(); saveState();
  });
  document.querySelectorAll('[data-slopeside]').forEach(b=>{
    b.addEventListener('click',()=>{
      STATE.slope.side = b.dataset.slopeside;
      syncSlopeUI(); renderSections(); renderPreview(); updatePrice(); saveState();
    });
  });
  if(slopeHLow){
    slopeHLow.addEventListener('input',()=>{
      let v = Number(slopeHLow.value)||0;
      const maxH = cabinetH();
      if(v < 300) v = 300;
      if(v > maxH) v = maxH;
      STATE.slope.hLow = v;
      if(slopeHHigh) slopeHHigh.value = maxH;
      renderSections(); renderPreview(); updatePrice(); saveState();
    });
    slopeHLow.addEventListener('blur',()=>{ slopeHLow.value = STATE.slope.hLow; });
  }
  const slopeFlat = document.getElementById('slopeFlat');
  if(slopeFlat){
    slopeFlat.addEventListener('input',()=>{
      let v = Number(slopeFlat.value)||0;
      if(v < 0) v = 0;
      if(v > cabinetW()) v = cabinetW();
      STATE.slope.flat = v;
      renderSections(); renderPreview(); updatePrice(); saveState();
    });
    slopeFlat.addEventListener('blur',()=>{ slopeFlat.value = STATE.slope.flat || 0; });
  }
  syncSlopeUI();

  // uskok (komin / rura)
  STATE.notch = STATE.notch || {on:false, side:'left', from:'bottom', w:300, h:1000};
  const notchCfg = document.getElementById('notchCfg');
  const notchOnB = document.getElementById('notchOn');
  const notchOffB = document.getElementById('notchOff');
  const notchW = document.getElementById('notchW');
  const notchH = document.getElementById('notchH');
  function syncNotchUI(){
    const n = STATE.notch;
    if(notchOnB) notchOnB.classList.toggle('on', n.on);
    if(notchOffB) notchOffB.classList.toggle('on', !n.on);
    if(notchCfg) notchCfg.hidden = !n.on;
    document.querySelectorAll('[data-notchside]').forEach(b=>b.classList.toggle('on', b.dataset.notchside===n.side));
    document.querySelectorAll('[data-notchfrom]').forEach(b=>b.classList.toggle('on', b.dataset.notchfrom===n.from));
    if(notchW) notchW.value = n.w;
    if(notchH) notchH.value = n.h;
    const dEl = document.getElementById('notchD');
    if(dEl){ dEl.value = n.d || 150; dEl.max = STATE.dim.d; }
  }
  window.__syncNotchUI = syncNotchUI;
  if(notchOnB) notchOnB.addEventListener('click',()=>{
    STATE.notch.on = true; syncNotchUI(); renderSections(); renderPreview(); updatePrice(); saveState();
  });
  if(notchOffB) notchOffB.addEventListener('click',()=>{
    STATE.notch.on = false; syncNotchUI(); renderSections(); renderPreview(); updatePrice(); saveState();
  });
  document.querySelectorAll('[data-notchside]').forEach(b=>{
    b.addEventListener('click',()=>{ STATE.notch.side = b.dataset.notchside; syncNotchUI(); renderSections(); renderPreview(); updatePrice(); saveState(); });
  });
  document.querySelectorAll('[data-notchfrom]').forEach(b=>{
    b.addEventListener('click',()=>{ STATE.notch.from = b.dataset.notchfrom; syncNotchUI(); renderSections(); renderPreview(); updatePrice(); saveState(); });
  });
  if(notchW) notchW.addEventListener('input',()=>{
    let v = Number(notchW.value)||0;
    v = Math.max(50, Math.min(v, Math.max(50, cabinetW() - 200)));
    STATE.notch.w = v; renderSections(); renderPreview(); updatePrice(); saveState();
  });
  if(notchW) notchW.addEventListener('blur',()=>{ notchW.value = STATE.notch.w; });
  if(notchH) notchH.addEventListener('input',()=>{
    let v = Number(notchH.value)||0;
    v = Math.max(50, Math.min(v, Math.max(50, cabinetH() - 300)));
    STATE.notch.h = v; renderSections(); renderPreview(); updatePrice(); saveState();
  });
  if(notchH) notchH.addEventListener('blur',()=>{ notchH.value = STATE.notch.h; });
  const notchD = document.getElementById('notchD');
  if(notchD){
    notchD.addEventListener('input',()=>{
      let v = Number(notchD.value)||0;
      v = Math.max(20, Math.min(v, STATE.dim.d));
      STATE.notch.d = v; renderSections(); renderPreview(); updatePrice(); saveState();
    });
    notchD.addEventListener('blur',()=>{ notchD.value = STATE.notch.d; });
  }
  syncNotchUI();
  const ub = document.getElementById('unevenBox');
  if(STATE.uneven) ub.classList.add('on');
  ub.querySelector('.uneven-top').addEventListener('click',()=>{
    STATE.uneven = !STATE.uneven;
    ub.classList.toggle('on', STATE.uneven);
    saveState();
  });
}

// ────────────────────────────────────────────────────────────
//  STEP 3 — SECTIONS editor
// ────────────────────────────────────────────────────────────
// Wymiary korpusu = wnęka − blendy − luz montażowy (6 mm szer., 5 mm wys.)
function cabinetW(){
  const b = STATE.blenda||{};
  return Math.max(200, STATE.dim.w - (b.left||0) - (b.right||0) - 6);
}
function cabinetH(){
  const b = STATE.blenda||{};
  return Math.max(200, STATE.dim.h - (b.top||0) - 5);
}
// Szerokość użyteczna wewnątrz korpusu (odświeża się wraz z liczbą sekcji)
// Luz montażowy między sąsiednimi szafkami (mm)
const SEC_GAP = 1;
// Odstęp między wnętrzami sąsiednich sekcji: bok prawy + luz + bok lewy sąsiada
const SEC_STRIDE = 36 + SEC_GAP;
function usableInternalW(){
  const n = STATE.sections.length;
  // każda sekcja = osobna szafka z 2 własnymi bokami → 2 × 18 mm × n, plus 1 mm luzu między szafkami
  return Math.max(0, cabinetW() - 36 * n - SEC_GAP * Math.max(0, n - 1));
}
// Dopasuj szerokości do użytecznej szerokości ZACHOWUJĄC proporcje (bez wyrównywania na siłę)
function fitSectionWidths(){
  const W = usableInternalW();
  const n = STATE.sections.length;
  if(!n) return;
  const sum = STATE.sections.reduce((a,s)=>a+(s.w||0),0);
  if(sum <= 0){ balanceSectionWidths(); return; }
  let acc = 0;
  STATE.sections.forEach((s,i)=>{
    if(i < n-1){ s.w = Math.max(150, Math.round(s.w * W / sum)); acc += s.w; }
  });
  STATE.sections[n-1].w = Math.max(150, W - acc);
}
// Użytkownik zmienił szerokość sekcji si — różnicę przejmują pozostałe sekcje proporcjonalnie
function setSectionWidth(si, v){
  const W = usableInternalW();
  const n = STATE.sections.length;
  if(n < 2){ STATE.sections[0].w = W; return; }
  const maxV = W - 150*(n-1);
  v = Math.max(150, Math.min(Math.round(v)||150, maxV));
  STATE.sections[si].w = v;
  const others = STATE.sections.filter((_,i)=>i!==si);
  const rest = W - v;
  const osum = others.reduce((a,s)=>a+s.w,0) || 1;
  let acc = 0;
  others.forEach((s,k)=>{
    if(k < others.length-1){ s.w = Math.max(150, Math.round(s.w * rest / osum)); acc += s.w; }
    else s.w = Math.max(150, rest - acc);
  });
}
// ── Limity formatek ─────────────────────────────────────────
// Arkusz płyty 2800 × 2070 mm. Formatki korpusu max 2000 mm (fronty do 2780 mm).
// Wysokość sufitu wnęki (mm od podłogi) w punkcie xn (mm od lewej ściany wnęki)
function nicheCeilAt(xn){
  const bl = STATE.blenda || {};
  const s = STATE.slope;
  if(!s || !s.on) return STATE.dim.h;
  // cabinetHAt(x) = sufit − górna blenda − 5 mm luzu; x korpusu = xn − blenda.left − 3
  return cabinetHAt(xn - (bl.left||0) - 3) + 5 + (bl.top||0);
}
// Wysokość blendy bocznej przy krawędziach (pod blendą górną) — dopasowana do skosu
function sideBlendaH(side){
  const bl = STATE.blenda || {};
  const Wn = STATE.dim.w, top = bl.top||0;
  const a = side==='left' ? 0 : Wn - (bl.right||0);
  const b = side==='left' ? (bl.left||0) : Wn;
  return [Math.round(nicheCeilAt(a) - top), Math.round(nicheCeilAt(b) - top)];
}
const MAX_PIECE = 2000;
const MAX_SHEET = 2780;
// Blendy i cokoły — wyjątek jak fronty, max 2750 mm w jednym kawałku
const MAX_TRIM = 2750;
// Podziel długość L na równe kawałki ≤ max
function splitLen(L, max){
  L = Math.round(L);
  if(L <= max) return [L];
  const n = Math.ceil(L / max);
  const b = Math.floor(L / n);
  const arr = Array(n).fill(b);
  arr[n-1] = L - b*(n-1);
  return arr;
}
// Podział szafki na dół + nadstawkę.
// Limit boku: 2000 mm, a przy cokole — wymiar arkusza (2780 mm).
// Styk (podwójny wieniec) ustawiany na granicy elementów — najlepiej w miejscu półki,
// która wtedy znika (zastępuje ją wieniec), więc podział nie tnie szuflad ani strefy wieszania.
function sectionSplitPlan(si){
  const s = STATE.sections[si];
  const H = Math.round(sectionCabinetH(si));
  const maxH = STATE.base === 'cokol' ? MAX_SHEET : MAX_PIECE;
  if(!s || H <= maxH) return {parts:[H], joints:[]};
  let y = 18 + ((STATE.band && bandSpans(si) && STATE.band.position==='top') ? STATE.band.h : 0);
  const cands = [];
  s.items.forEach((it,i)=>{
    const rs = rodShelves(s, i);
    if(rs.above) y += 18;
    y += Number(it.h)||0;
    const top = y + 18;               // nadstawka: od góry do styku (z jej wieńcem dolnym)
    const hasBelow = it.type==='polka' || !!rs.below;
    if(i < s.items.length - 1) cands.push({afterIdx:i, replaces: hasBelow, top, bottom: H - top});
    if(hasBelow) y += 18;
  });
  const ok = c => c.top >= 300 && c.bottom >= 300 && c.top <= maxH && c.bottom <= maxH;
  const pick = arr => arr.filter(ok).sort((a,b)=> b.bottom - a.bottom)[0];
  const best = pick(cands.filter(c=>c.replaces)) || pick(cands);
  if(best) return {parts:[best.bottom, best.top], joints:[{afterIdx:best.afterIdx, replaces:best.replaces}]};
  // awaryjnie — stały podział
  const n = Math.ceil(H / maxH);
  const rem = H - maxH*(n-1);
  const parts = rem >= 300 ? [...Array(n-1).fill(maxH), rem] : splitLen(H, maxH);
  return {parts, joints: parts.slice(0,-1).map(()=>({afterIdx:-1, replaces:false}))};
}
function sectionParts(si){ return sectionSplitPlan(si).parts; }
// ile mm wnętrza zabiera styk (36 mm, albo 18 mm gdy zastępuje półkę)
function sectionJointLoss(si){
  return sectionSplitPlan(si).joints.reduce((a,j)=> a + (j.replaces ? 18 : 36), 0);
}
// Układ elementów w pionie (px) z miejscem na styk — wspólny dla wnętrza i nakładki
function interiorLayout(s, si, Hpx){
  const plan = si >= 0 ? sectionSplitPlan(si) : {joints:[]};
  const jAt = new Map(plan.joints.filter(j=>j.afterIdx>=0).map(j=>[j.afterIdx, j]));
  const totalMm = (s.items.reduce((a,it)=>a+(Number(it.h)||0),0) + 36*jAt.size) || 1;
  const k = Hpx / totalMm;
  let acc = 0; const joints = [];
  s.items.forEach((it,i)=>{
    acc += (Number(it.h)||0) * k;
    const j = jAt.get(i);
    if(j){ joints.push({afterIdx:i, y:acc, h:36*k, replaces:j.replaces}); acc += 36*k; }
  });
  return {k, joints, plan};
}
function balanceSectionWidths(){
  const W = usableInternalW();
  const n = STATE.sections.length || 1;
  const per = Math.floor(W / n);
  STATE.sections.forEach(s=> s.w = per);
  if(STATE.sections.length) STATE.sections[STATE.sections.length-1].w = W - per*(STATE.sections.length-1);
}
function sectionItemsSum(s){ return s.items.reduce((a,it)=>a+(Number(it.h)||0),0); }
function sectionShelfCount(s){ return s.items.filter(it=>it.type==='polka').length; }
// Drążek: półka nad strefą (o ile nie ma jej element powyżej) i półka pod strefą —
// chyba że drążek jest pierwszy od góry (wieniec górny) lub ostatni od dołu (wieniec dolny).
function rodShelves(s, idx){
  const its = s.items, n = its.length, it = its[idx];
  if(!it || it.type!=='drazek') return {above:0, below:0};
  const prev = its[idx-1];
  const prevHasBelow = prev && (prev.type==='polka' || prev.type==='drazek');
  return { above: (idx>0 && !prevHasBelow) ? 1 : 0, below: idx < n-1 ? 1 : 0 };
}
function itemBoards(s, idx){
  const it = s.items[idx];
  if(!it) return 0;
  if(it.type==='polka') return 1;
  if(it.type==='drazek'){ const r = rodShelves(s, idx); return r.above + r.below; }
  return 0;
}
function sectionBoardCount(s){ let c = 0; for(let i=0;i<s.items.length;i++) c += itemBoards(s,i); return c; }
function sectionPhysicalSum(s){ return sectionItemsSum(s) + sectionBoardCount(s)*18; }

// ── Fronty na część sekcji ──────────────────────────────────
// s.frontCuts = [idx…]  — podział frontu na półce pod elementem idx
// s.frontOpen = [zone…] — strefy bez frontu (otwarte)
function frontCutCandidates(s){
  const out = [];
  s.items.forEach((it,i)=>{
    if(i >= s.items.length-1) return;
    const below = it.type==='polka' || (it.type==='drazek' && rodShelves(s,i).below);
    if(below) out.push(i);
  });
  return out;
}
function frontZones(si){
  const s = STATE.sections[si]; if(!s) return [];
  const cand = new Set(frontCutCandidates(s));
  const cuts = (s.frontCuts||[]).filter(i=>cand.has(i)).sort((a,b)=>a-b);
  // położenia fizyczne (mm od góry wnętrza)
  const pos = []; let y = 0;
  s.items.forEach((it,i)=>{
    const rs = rodShelves(s,i);
    if(rs.above) y += 18;
    const y0 = y; y += Number(it.h)||0;
    const hasBelow = it.type==='polka' || !!rs.below;
    pos.push({y0, y1:y, mid: hasBelow ? y + 9 : y});
    if(hasBelow) y += 18;
  });
  const total = y || 1;
  const open = new Set(s.frontOpen||[]);
  const zones = []; let start = 0, f0 = 0;
  [...cuts, s.items.length-1].forEach((endIdx, zi)=>{
    const last = zi === cuts.length;
    const f1 = last ? 1 : pos[endIdx].mid / total;
    zones.push({zi, from:start, to:endIdx, f0, f1, open: open.has(zi)});
    start = endIdx + 1; f0 = f1;
  });
  return zones;
}
// skrzydła frontu (tylko strefy z frontem): f0/f1 = ułamek od góry, h = wysokość mm
function frontLeaves(si){
  if(STATE.frontMode!=='hinged' || !STATE.sectionFronts[si]) return [];
  const s = STATE.sections[si];
  const fh = (sectionCabinetH(si) - 36) - (bandSpans(si) ? STATE.band.h : 0) - (s.lift||0);
  const zones = frontZones(si);
  return zones.filter(z=>!z.open).map(z=>({
    f0:z.f0, f1:z.f1, zi:z.zi,
    h: Math.max(50, Math.round((z.f1 - z.f0) * fh) - (zones.length>1 ? 3 : 0))
  }));
}
function baseOffset(){
  if(STATE.base==='cokol') return 100;
  if(STATE.base==='nozki'){
    const l = (typeof LEGS!=='undefined' && LEGS.find(x=>x.id===STATE.leg)) || (typeof LEGS!=='undefined' && LEGS[0]);
    return (l && l.h) || 150;
  }
  return 0;
}

// ── SVG fallback shapes per leg model (when no photo yet)
const LEG_SVGS = {
  'gtv-dak27': `<svg viewBox="0 0 40 80" fill="none" stroke="#1a1a17" stroke-width="1.3"><rect x="14" y="6" width="12" height="64"/><line x1="10" y1="72" x2="30" y2="72" stroke-width="2"/></svg>`,
  'gtv-dap77': `<svg viewBox="0 0 40 80" fill="none" stroke="#1a1a17" stroke-width="1.3"><ellipse cx="20" cy="6" rx="6" ry="2"/><line x1="14" y1="6" x2="14" y2="70"/><line x1="26" y1="6" x2="26" y2="70"/><ellipse cx="20" cy="70" rx="6" ry="2"/><line x1="10" y1="74" x2="30" y2="74" stroke-width="2"/></svg>`,
  'atm-dn701': `<svg viewBox="0 0 40 100" fill="none" stroke="#1a1a17" stroke-width="1.3"><path d="M16 6 L24 6 L22 86 L18 86 Z"/><line x1="10" y1="90" x2="30" y2="90" stroke-width="2"/></svg>`,
  'dn-709':    `<svg viewBox="0 0 40 120" fill="none" stroke="#1a1a17" stroke-width="1.3"><path d="M14 6 L26 6 L24 106 L16 106 Z"/><ellipse cx="20" cy="108" rx="8" ry="2.5"/><line x1="8" y1="113" x2="32" y2="113" stroke-width="2"/></svg>`,
};

function renderLegPicker(){
  const wrap = document.getElementById('legPicker'); if(!wrap) return;
  if(STATE.base!=='nozki'){ wrap.hidden = true; return; }
  wrap.hidden = false;
  if(typeof LEGS==='undefined') return;
  // ensure STATE.leg is valid
  if(!LEGS.find(l=>l.id===STATE.leg)) STATE.leg = LEGS[0].id;
  const cur = LEGS.find(l=>l.id===STATE.leg);
  const grid = document.getElementById('legGrid');
  grid.innerHTML = LEGS.map(l=>`
    <div class="leg-card ${l.id===STATE.leg?'sel':''}" data-leg="${l.id}">
      <div class="leg-thumb">
        ${l.image
          ? `<img src="${l.image}" alt="${l.name}" onerror="this.outerHTML='${(LEG_SVGS[l.id]||'').replace(/'/g,'&apos;').replace(/"/g,'&quot;')}'"/>`
          : (LEG_SVGS[l.id] || '')}
      </div>
      <div class="leg-name">${l.name}</div>
      <div class="leg-brand">${l.brand||''}</div>
      <div class="leg-meta"><span>H ${l.h} mm</span><span>+${l.price} zł</span></div>
    </div>
  `).join('');
  grid.querySelectorAll('.leg-card').forEach(c=>{
    c.onclick = ()=>{
      STATE.leg = c.dataset.leg;
      const lc = LEGS.find(x=>x.id===STATE.leg);
      if(lc && lc.colors && !lc.colors.includes(STATE.legColor)){
        STATE.legColor = lc.colors[0];
      }
      renderLegPicker();
      renderSections(); renderPreview(); updatePrice(); saveState();
    };
  });
  // color row
  const row = document.getElementById('legColorRow');
  if(cur.colors && cur.colors.length > 1 && typeof LEG_COLORS!=='undefined'){
    row.innerHTML = `<span class="leg-color-label">Kolor</span>` + cur.colors.map(c=>{
      const cd = LEG_COLORS[c]; if(!cd) return '';
      return `<button class="leg-color-btn ${c===STATE.legColor?'on':''}" data-lc="${c}">
        <span class="leg-color-sw" style="background:${cd.swatch};border-color:${cd.stroke}"></span>${cd.name}
      </button>`;
    }).join('');
    row.querySelectorAll('.leg-color-btn').forEach(b=>{
      b.onclick = ()=>{
        STATE.legColor = b.dataset.lc;
        renderLegPicker();
        renderPreview(); updatePrice(); saveState();
      };
    });
  } else if(cur.colors && cur.colors.length===1){
    const cd = LEG_COLORS && LEG_COLORS[cur.colors[0]];
    row.innerHTML = cd
      ? `<span class="leg-color-label">Kolor</span><span class="leg-color-btn on"><span class="leg-color-sw" style="background:${cd.swatch};border-color:${cd.stroke}"></span>${cd.name}</span>`
      : '';
  } else {
    row.innerHTML = '';
  }
}
function effectiveInteriorH(){ return cabinetH() - 36 - baseOffset(); }   // 36 = wieniec górny + dolny (2×18 mm)
// ── Skośny sufit ────────────────────────────────────────────
// Wysokość korpusu w punkcie x (mm od lewej krawędzi korpusu).
// Skos jest zakotwiczony we WNĘCE (ścianach), nie w korpusie — blenda nie przesuwa
// miejsca zaczepienia skosu, tylko zabiera miejsce z odcinka prostego sufitu.
function cabinetHAt(x){
  const s = STATE.slope;
  if(!s || !s.on) return cabinetH();
  const bl = STATE.blenda || {left:0, right:0, top:0};
  const Wn = STATE.dim.w;                    // szerokość wnęki
  const hiN = STATE.dim.h - (bl.top || 0);   // sufit wnęki (po odjęciu górnej blendy)
  const loN = Math.max(300, Math.min(s.hLow || hiN, hiN));
  const flat = Math.max(0, Math.min(s.flat || 0, Wn));
  const span = Math.max(1, Wn - flat);
  // x korpusu → x wnęki (lewa blenda + luz montażowy 3 mm)
  const xn = x + (bl.left || 0) + 3;
  let hN;
  if(s.side === 'right'){
    if(xn <= flat) hN = hiN;
    else {
      const t = Math.max(0, Math.min(1, (xn - flat) / span));
      hN = hiN - (hiN - loN) * t;
    }
  } else {
    if(xn >= span) hN = hiN;
    else {
      const t = Math.max(0, Math.min(1, xn / span));
      hN = loN + (hiN - loN) * t;
    }
  }
  // wysokość korpusu = wysokość wnęki w tym punkcie − luz montażowy w pionie
  return Math.max(300, Math.min(cabinetH(), hN - 5));
}
// Wysokość korpusu użyteczna dla danej sekcji (najniższy punkt sekcji)
function sectionCabinetH(si){
  const s = STATE.slope;
  if(!s || !s.on) return cabinetH();
  // x-zakres sekcji w mm (od lewej krawędzi korpusu, z uwzględnieniem płyt 18 mm)
  let x = 18;
  for(let i=0;i<si;i++) x += STATE.sections[i].w + 18;
  const xEnd = x + (STATE.sections[si] ? STATE.sections[si].w : 0);
  // najniższy punkt: prawa krawędź gdy sufit opada w prawo, lewa gdy w lewo
  return s.side === 'right' ? cabinetHAt(xEnd) : cabinetHAt(x);
}
function sectionEffectiveH(si){ return sectionCabinetH(si) - 36 - baseOffset(); }  // 36 = 2×18 mm wieńców
// pozycje "przy podłodze" (pralka) zawsze na końcu listy = najniżej
// ostrzeżenie: pod siedziskiem musi być półka lub szuflady; nad nim min. 1200 mm
function seatWarn(s){
  const idx = s.items.findIndex(it=>it.type==='siedzisko');
  if(idx < 0) return '';
  const warns = [];
  // 1200 mm nad siedziskiem — licz kolejne pozycje w górę do najbliższej półki/płyty
  let above = 0;
  for(let i=idx-1;i>=0;i--){
    above += Number(s.items[i].h)||0;
    if(s.items[i].type==='polka' || s.items[i].type==='siedzisko') break;
  }
  if(above < 1200) warns.push(`Nad siedziskiem <strong>${above} mm</strong> — wymagane min. <strong>1200 mm</strong>.`);
  // pod siedziskiem wymagana półka lub szuflady
  const below = s.items.slice(idx+1);
  const hasStorage = below.some(x=>x.type==='polka'||x.type==='szuflada'||x.type==='szuflady'||x.type==='kosz');
  if(!hasStorage) warns.push('Pod siedziskiem dodaj <strong>półkę lub szuflady</strong> — pusta przestrzeń wymaga podparcia.');
  if(!warns.length) return '';
  return `<div class="seat-warn">⚠ ${warns.join(' ')}</div>`;
}
function sortFloorItems(sec){
  const floor = sec.items.filter(x=>ITEM_TYPES[x.type] && ITEM_TYPES[x.type].atFloor);
  if(!floor.length) return;
  sec.items = sec.items.filter(x=>!(ITEM_TYPES[x.type] && ITEM_TYPES[x.type].atFloor)).concat(floor);
}
// ── Uskok (komin / rura) ────────────────────────────────────
// x-zakres sekcji w mm od lewej krawędzi korpusu
function sectionXRange(si){
  let x = 18;
  for(let i=0;i<si;i++) x += STATE.sections[i].w + SEC_STRIDE;   // bok prawy + luz + bok lewy sąsiada
  return [x, x + (STATE.sections[si] ? STATE.sections[si].w : 0)];
}
function notchAffects(si){
  const n = STATE.notch;
  if(!n || !n.on) return false;
  const W = cabinetW();
  const [xa, xb] = sectionXRange(si);
  const nx0 = n.side === 'left' ? 0 : Math.max(0, W - n.w);
  const nx1 = n.side === 'left' ? Math.min(W, n.w) : W;
  return xa < nx1 && xb > nx0;
}
// liczba zawiasów na front wg wysokości (mm)
function hingeCount(hMm){
  if(hMm <= 600) return 2;
  if(hMm <= 1000) return 3;
  if(hMm <= 1750) return 4;
  if(hMm <= 2500) return 5;
  return 6;
}

// ── ROZKRÓJ na arkusze (tylko do wyceny) ────────────────────
// Arkusz 2800 × 2070, obcięcie 10 mm z każdej strony, rzaz 4 mm.
// Dekory drewnopodobne: pilnujemy kierunku słojów (dłuższy bok formatki wzdłuż 2800, bez obracania).
const SHEET_L = 2800, SHEET_W = 2070, SHEET_TRIM = 10, KERF = 4;
function nestSheets(pieces, grain){
  const L = SHEET_L - 2*SHEET_TRIM, Wd = SHEET_W - 2*SHEET_TRIM;
  // rozwiń ilości; orientacja: dłuższy bok wzdłuż L
  const items = [];
  pieces.forEach(p=>{
    for(let i=0;i<p.qty;i++){
      let a = Math.max(p.w,p.h), b = Math.min(p.w,p.h);
      if(!grain && a > L && b <= L && a <= Wd){ const tmp=a; a=b; b=tmp; }
      items.push({a, b});
    }
  });
  items.sort((x,y)=> y.b - x.b || y.a - x.a);
  // pasy (shelf packing): każdy pas ma wysokość = najszerszy element, wypełniany wzdłuż L
  const sheets = [];   // [{strips:[{h, used}] , usedH}]
  const area = items.reduce((s,i)=>s+i.a*i.b,0);
  items.forEach(it=>{
    let placed = false;
    for(const sh of sheets){
      for(const st of sh.strips){
        if(it.b <= st.h && st.used + it.a <= L){ st.used += it.a + KERF; placed = true; break; }
      }
      if(placed) break;
      if(sh.usedH + it.b <= Wd){ sh.strips.push({h:it.b, used:it.a + KERF}); sh.usedH += it.b + KERF; placed = true; break; }
    }
    if(!placed) sheets.push({strips:[{h:it.b, used:it.a + KERF}], usedH: it.b + KERF});
  });
  const n = sheets.length;
  return { sheets: n, usage: n ? area / (n * SHEET_L * SHEET_W) : 0 };
}
function buildNesting(cut){
  const matC = MATERIALS.find(m=>m.id===STATE.material) || MATERIALS[0];
  const matF = STATE.splitFront ? (MATERIALS.find(m=>m.id===STATE.materialFront)||matC) : matC;
  const groups = {};
  const put = (mat, p)=>{ (groups[mat.id] = groups[mat.id] || {mat, pieces:[]}).pieces.push(p); };
  cut.pieces.forEach(p=>{
    if(p.kind === 'hdf' || p.kind === 'mdf') return;
    put(p.kind === 'front' ? matF : matC, p);
  });
  const sheetSqm = (SHEET_L*SHEET_W)/1e6;
  const out = Object.values(groups).map(g=>{
    const r = nestSheets(g.pieces, g.mat.tone === 'wood');
    return { id:g.mat.id, name:g.mat.name, code:g.mat.code, grain: g.mat.tone==='wood',
             sheets:r.sheets, usage:r.usage, cost: r.sheets * sheetSqm * (g.mat.price||0) };
  });
  return { groups: out, sheets: out.reduce((s,g)=>s+g.sheets,0), cost: out.reduce((s,g)=>s+g.cost,0) };
}

// ── Sprawdzanie znanych ograniczeń ──────────────────────────
const LIMITS = { rodMax:1300, shelfWarn:700, frontMaxW:600, drawerMin:300, drawerMax:900 };
function validateProject(){
  const out = [];
  STATE.sections.forEach((s,si)=>{
    const tag = `Sekcja ${si+1}`;
    s.items.forEach(it=>{
      if(it.type==='drazek' && it.variant!=='pantograf' && s.w > LIMITS.rodMax)
        out.push({lvl:'err', si, msg:`${tag}: drążek ${s.w} mm — maks. ${LIMITS.rodMax} mm. Podziel sekcję albo dodaj podporę.`});
      if(it.type==='drazek' && (Number(it.h)||0) < 800)
        out.push({lvl:'warn', si, msg:`${tag}: strefa wieszania ${it.h} mm — za mało na ubrania (krótkie ok. 900 mm, długie ok. 1500 mm).`});
      if(it.type==='polka' && it.variant!=='przegroda' && s.w > LIMITS.shelfWarn)
        out.push({lvl:'warn', si, msg:`${tag}: półka ${s.w} mm — powyżej ${LIMITS.shelfWarn} mm może się uginać. Rozważ półkę z przegródką.`});
      if((it.type==='szuflada' || it.type==='szuflady') && (s.w < LIMITS.drawerMin || s.w > LIMITS.drawerMax))
        out.push({lvl:'err', si, msg:`${tag}: szuflada ${s.w} mm — dopuszczalnie ${LIMITS.drawerMin}–${LIMITS.drawerMax} mm.`});
    });
    if(STATE.frontMode==='hinged' && STATE.sectionFronts[si] && s.w > LIMITS.frontMaxW)
      out.push({lvl:'warn', si, msg:`${tag}: front uchylny ${s.w} mm — zalecane maks. ${LIMITS.frontMaxW} mm. Rozważ podział na dwie sekcje.`});
  });
  // unikalne komunikaty
  const seen = new Set();
  return out.filter(o=>{ const k=o.lvl+o.msg; if(seen.has(k)) return false; seen.add(k); return true; });
}
function renderWarnings(){
  const el = document.getElementById('secWarnings');
  if(!el) return;
  const list = validateProject();
  if(!list.length){ el.innerHTML = ''; el.hidden = true; return; }
  el.hidden = false;
  el.innerHTML = list.map(o=>`<div class="vw vw--${o.lvl}"><span class="vw-ico">${o.lvl==='err'?'!':'i'}</span><span>${o.msg}</span></div>`).join('');
}
// ── Przelotowa półka (band) ─────────────────────────────────
function bandSpans(si){
  const b = STATE.band;
  return b && si >= b.from && si <= b.to;
}
function sectionInteriorH(si){
  // wysokość użyteczna danej sekcji (skos + pas przelotowy + podniesienie nad podłogą)
  // uskok NIE odejmuje wysokości — zmniejsza głębokość formatek w tym obszarze
  return sectionEffectiveH(si)
    - sectionJointLoss(si)
    - (bandSpans(si) ? STATE.band.h : 0)
    - (STATE.sections[si] && STATE.sections[si].lift ? STATE.sections[si].lift : 0);
}
function clampBand(){
  const b = STATE.band;
  if(!b) return;
  const n = STATE.sections.length;
  b.from = Math.max(0, Math.min(b.from|0, n-1));
  b.to   = Math.max(b.from, Math.min(b.to|0, n-1));
  // pas musi obejmować min. 2 sekcje
  if(b.to === b.from){
    if(b.to < n-1) b.to++; else if(b.from > 0) b.from--;
  }
  // wysokość pasa nie większa niż połowa wnętrza
  const maxH = Math.floor(effectiveInteriorH()*0.5);
  b.h = Math.max(100, Math.min(b.h||300, maxH));
}
function normalizeShelfHeights(){
  if(STATE.band) clampBand();
  // auto-korekta: sekcje nie mogą wystawać poza użyteczną szerokość korpusu
  const usable = usableInternalW();
  const sumW = STATE.sections.reduce((a,s)=>a+s.w,0);
  if(usable > 0 && Math.abs(sumW - usable) > 0){
    fitSectionWidths();
  }
  STATE.sections.forEach(sec=>{
    // pralka zawsze na dole; sekcja z pralką nie może być podniesiona
    if(sec.items.some(x=>ITEM_TYPES[x.type] && ITEM_TYPES[x.type].atFloor)){
      sortFloorItems(sec);
      sec.lift = 0;
    }
    // siedzisko — sama płyta 18 mm
    sec.items.forEach(it=>{ if(it.type==='siedzisko') it.h = 18; });
  });
  STATE.sections.forEach((s,si)=>{
    const polki = s.items.filter(it=>it.type==='polka');
    if(!polki.length) return;
    const autoP = polki.filter(p=>!p.manual);
    if(!autoP.length) return; // all manual — nothing to recompute
    const fixed = s.items.reduce((a,it)=>{
      if(it.type==='polka' && !it.manual) return a;
      return a + (Number(it.h)||0);
    },0);
    const shelfBoards = sectionBoardCount(s) * 18; // płyty półek + półki nad/pod drążkiem
    const remain = Math.max(20*autoP.length, sectionInteriorH(si) - fixed - shelfBoards);
    const h = Math.max(20, Math.floor(remain / autoP.length));
    autoP.forEach(p=> p.h = h);
  });
}

function renderSections(){
  normalizeShelfHeights();
  updateSbInfo();
  const list = document.getElementById('secList');
  list.innerHTML = '';
  STATE.sections.forEach((s,si)=>{
    const itemsSum = sectionItemsSum(s);
    const physSum = sectionPhysicalSum(s);
    const target = sectionInteriorH(si);
    const diff = physSum - target;
    const status = Math.abs(diff)<=30 ? 'ok' : 'bad';
    const card = document.createElement('div');
    card.className = 'sec-card';
    card.innerHTML = `
      <div class="sec-head">
        <div class="sec-idx">S${si+1}</div>
        <div class="sec-width">
          <input type="number" value="${s.w}" data-si="${si}" min="150" max="1200"/>
          <span class="unit">mm</span>
        </div>
        <button class="sec-del" data-si="${si}" title="Usuń sekcję">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
        </button>
      </div>
      <div class="items-list" data-si="${si}">
        ${s.items.map((it,ii)=>renderItemRow(si,ii,it)).join('')}
      </div>
      <div class="sec-lift">
        <label>Nad podłogą</label>
        <div class="sec-lift-input"><input type="number" class="lift-input" data-si="${si}" value="${s.lift||0}" min="0" step="10" ${s.items.some(x=>ITEM_TYPES[x.type]&&ITEM_TYPES[x.type].atFloor)?'disabled title="Sekcja z pralką musi stać na podłodze"':''}/><span class="unit">mm</span></div>
        <span class="sec-lift-note">${s.items.some(x=>ITEM_TYPES[x.type]&&ITEM_TYPES[x.type].atFloor)?'sekcja z pralką — zawsze na podłodze':'0 = sekcja stoi na podłodze; wyżej = wolna przestrzeń pod sekcją'}</span>
      </div>
      <div class="sec-foot">
        <div class="sec-sum">Suma wysokości: <span class="${status}">${physSum} / ${target} mm</span> <span class="sec-sum-note">(w tym półki × 18 mm płyty)</span>${sectionShelfCount(s)>1?` <button class="shelf-balance" data-si="${si}" title="Wyrównaj wysokości półek">⇕ Wyrównaj półki</button>`:''}</div>
        ${seatWarn(s)}
        <div class="add-item-menu">
          <button class="add-item-btn" data-si="${si}">+ Dodaj element</button>
          <div class="add-item-pop" data-si="${si}">
            ${Object.entries(ITEM_TYPES).filter(([k,v])=>!v.onlyTypes || v.onlyTypes.includes(STATE.type)).map(([k,v])=>`
              <div class="aip-item" data-type="${k}" data-si="${si}">
                ${ITEM_ICONS[v.icon]}
                <span>${v.name}${v.brand?` · ${v.brand}`:''}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
    list.appendChild(card);
  });
  bindSectionEvents();
  renderBand();
  renderWarnings();
}

// ── Przelotowa półka — UI ───────────────────────────────────
function renderBand(){
  const el = document.getElementById('bandBlock');
  if(!el) return;
  const n = STATE.sections.length;
  const b = STATE.band;
  if(n < 2){
    el.innerHTML = `<div class="band-head"><div><div class="band-title">Przelotowa półka</div><div class="band-sub">Dostępna przy 2+ sekcjach — łączy skrajną górę lub dół kilku sekcji jedną deską.</div></div></div>`;
    return;
  }
  el.innerHTML = `
    <div class="band-head">
      <div>
        <div class="band-title">Przelotowa półka</div>
        <div class="band-sub">Jedna deska na całą szerokość wybranych sekcji — u góry lub u dołu.</div>
      </div>
      <div class="band-toggle">
        <button data-band="off" class="${!b?'on':''}">Brak</button>
        <button data-band="on" class="${b?'on':''}">Włącz</button>
      </div>
    </div>
    ${b ? `
    <div class="band-cfg">
      <div class="band-row">
        <label>Położenie</label>
        <div class="band-pos">
          <button data-pos="top" class="${b.position==='top'?'on':''}">Górna</button>
          <button data-pos="bottom" class="${b.position==='bottom'?'on':''}">Dolna</button>
        </div>
      </div>
      <div class="band-row">
        <label>Wysokość pasa</label>
        <input type="number" id="bandH" value="${b.h}" min="100" max="${Math.floor(effectiveInteriorH()*0.5)}" step="10"/>
        <span class="unit" style="font-size:.78rem;color:var(--ink-mute)">mm</span>
      </div>
      <div class="band-row">
        <label>Obejmuje sekcje</label>
        <div class="band-span">
          ${STATE.sections.map((s,i)=>`<button data-span="${i}" class="${i>=b.from&&i<=b.to?'on':''}" title="Sekcja ${i+1}">${i+1}</button>`).join('')}
        </div>
      </div>
      <div class="band-sub" style="margin-top:-.2rem">Klikaj numery, by dodać sekcję na brzegu zakresu lub odznaczyć skrajną. Minimum 2 sąsiednie.</div>
    </div>` : ''}
  `;
  // toggle on/off
  el.querySelectorAll('[data-band]').forEach(btn=>{
    btn.onclick = ()=>{
      if(btn.dataset.band==='on' && !STATE.band){
        STATE.band = {position:'top', h:300, from:0, to:Math.min(1,n-1)};
        clampBand();
      } else if(btn.dataset.band==='off'){
        STATE.band = null;
      }
      renderSections(); renderPreview(); updatePrice(); saveState();
    };
  });
  if(!b) return;
  // position
  el.querySelectorAll('[data-pos]').forEach(btn=>{
    btn.onclick = ()=>{ STATE.band.position = btn.dataset.pos; renderSections(); renderPreview(); updatePrice(); saveState(); };
  });
  // height
  const hInp = document.getElementById('bandH');
  if(hInp) hInp.addEventListener('input', ()=>{
    STATE.band.h = Math.max(100, Number(hInp.value)||300);
    clampBand();
    renderPreview(); updatePrice(); saveState();
  });
  // span — click a section number to extend/shrink the contiguous range
  el.querySelectorAll('[data-span]').forEach(btn=>{
    btn.onclick = ()=>{
      const i = +btn.dataset.span;
      const cur = STATE.band;
      const inRange = i>=cur.from && i<=cur.to;
      const len = cur.to - cur.from + 1;
      if(!inRange){
        // poza zakresem — rozszerz do klikniętej sekcji (zawsze ciągły)
        if(i < cur.from) cur.from = i; else cur.to = i;
      } else if(i===cur.from && i===cur.to){
        // nic — pojedyncza (nie powinno wystąpić)
      } else if(i===cur.from){
        // klik lewej krawędzi — odznacz (zwęź z lewej), o ile zostaną ≥2
        if(len>2) cur.from = i+1;
      } else if(i===cur.to){
        // klik prawej krawędzi — odznacz (zwęź z prawej)
        if(len>2) cur.to = i-1;
      } else {
        // klik w środku zakresu — przytnij od bliższej strony
        if(i - cur.from <= cur.to - i) cur.from = i; else cur.to = i;
      }
      clampBand();
      renderSections(); renderPreview(); updatePrice(); saveState();
    };
  });
}
function renderItemRow(si,ii,it){
  const t = ITEM_TYPES[it.type] || ITEM_TYPES.polka;
  const h = it.h || t.defaultH || 300;
  const isAuto = it.type==='polka' && !it.manual;
  const isSeat = it.type==='siedzisko';
  const isFloor = !!t.atFloor;
  const seatH = isSeat ? 18 : h;
  let variantHtml = '';
  if(t.variants){
    const v = t.variants.find(x=>x.id===it.variant) || t.variants[0];
    variantHtml = `<button class="item-variant" data-si="${si}" data-ii="${ii}" title="Zmień wariant">${v.name} <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style="margin-left:.2rem"><path d="M2 4l3 3 3-3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`;
  }
  return `
    <div class="item-row" draggable="true" data-si="${si}" data-ii="${ii}">
      <span class="item-drag" title="Przeciągnij">⋮⋮</span>
      <span class="item-icon">${ITEM_ICONS[t.icon]}</span>
      <span class="item-name">${t.name}${t.brand?` <span style="color:var(--ink-mute);font-family:var(--ff-mono);font-size:.7rem">· ${t.brand}</span>`:''}${it.type==='szuflada' && it.internal?` <span class="item-int-badge">wewn.</span>`:''}</span>
      ${variantHtml}
      <span class="item-opts">
        <input type="number" value="${isSeat?450:h}" data-si="${si}" data-ii="${ii}" data-k="h" min="20" max="2800" ${isSeat?'disabled title="Siedzisko na wysokości 450 mm — stałe"':''} ${isAuto?'data-auto="1" title="Wysokość liczona automatycznie — wpisz, by ustawić ręcznie"':''}/>
        <span class="unit">${isSeat?'mm nad podłogą':(isAuto?'mm · auto':'mm')}</span>
        ${it.type==='polka' && it.manual?`<button class="shelf-reset" data-si="${si}" data-ii="${ii}" title="Wróć do automatycznej wysokości">↺</button>`:''}
      </span>
      ${isFloor?'<span class="item-floor-badge" title="Zawsze przy podłodze">podłoga</span>':`
      <button class="item-move" data-si="${si}" data-ii="${ii}" data-dir="-1" title="W górę">↑</button>
      <button class="item-move" data-si="${si}" data-ii="${ii}" data-dir="1" title="W dół">↓</button>`}
      <button class="item-del" data-si="${si}" data-ii="${ii}" title="Usuń">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
      </button>
    </div>
  `;
}
function bindSectionEvents(){
  // section width
  document.querySelectorAll('.sec-width input').forEach(inp=>{
    inp.addEventListener('change',e=>{
      const si = Number(e.target.dataset.si);
      setSectionWidth(si, Number(e.target.value)||0);
      renderSections(); renderPreview(); updatePrice(); saveState();
    });
    inp.addEventListener('keydown',e=>{ if(e.key==='Enter') e.target.blur(); });
  });
  // delete section
  document.querySelectorAll('.sec-del').forEach(b=>{
    b.addEventListener('click',e=>{
      const si = Number(e.currentTarget.dataset.si);
      if(STATE.sections.length<=1){ toast('Musisz mieć przynajmniej jedną sekcję'); return; }
      STATE.sections.splice(si,1);
      STATE.sectionFronts.splice(si,1);
      fitSectionWidths();
      renderSections(); renderPreview(); updatePrice(); saveState();
    });
  });
  // item height
  document.querySelectorAll('.item-opts input[type=number]').forEach(inp=>{
    inp.addEventListener('input',e=>{
      const si=+e.target.dataset.si, ii=+e.target.dataset.ii;
      const it = STATE.sections[si].items[ii];
      it.h = Math.max(20, Number(e.target.value)||0);
      if(it.type==='polka') it.manual = true;
      renderPreview(); updatePrice(); saveState();
      // live update sum only
      const card = e.target.closest('.sec-card');
      const sum = sectionPhysicalSum(STATE.sections[si]);
      const target = sectionInteriorH(si);
      const el = card.querySelector('.sec-sum span');
      el.textContent = `${sum} / ${target} mm`;
      el.className = Math.abs(sum-target)<=30 ? 'ok' : 'bad';
    });
  });
  document.querySelectorAll('.shelf-reset').forEach(b=>{
    b.addEventListener('click',()=>{
      const si=+b.dataset.si, ii=+b.dataset.ii;
      delete STATE.sections[si].items[ii].manual;
      renderSections(); renderPreview(); updatePrice(); saveState();
    });
  });
  document.querySelectorAll('.lift-input').forEach(inp=>{
    inp.addEventListener('input',()=>{
      const si = +inp.dataset.si;
      let v = Number(inp.value)||0;
      const maxLift = Math.max(0, sectionEffectiveH(si) - 200);
      if(v < 0) v = 0;
      if(v > maxLift) v = maxLift;
      STATE.sections[si].lift = v;
      renderPreview(); updatePrice(); saveState();
      updateSbInfo();
    });
    inp.addEventListener('blur',()=>{
      inp.value = STATE.sections[+inp.dataset.si].lift || 0;
      renderSections();
    });
  });
  document.querySelectorAll('.shelf-balance').forEach(b=>{
    b.addEventListener('click',()=>{
      const si=+b.dataset.si;
      STATE.sections[si].items.forEach(it=>{ if(it.type==='polka') delete it.manual; });
      renderSections(); renderPreview(); updatePrice(); saveState();
    });
  });
  // item count select
  document.querySelectorAll('.item-opts select').forEach(sel=>{
    sel.addEventListener('change',e=>{
      const si=+e.target.dataset.si, ii=+e.target.dataset.ii, opt=e.target.dataset.opt;
      STATE.sections[si].items[ii].opts = STATE.sections[si].items[ii].opts || {};
      STATE.sections[si].items[ii].opts[opt] = Number(e.target.value);
      renderPreview(); updatePrice(); saveState();
    });
  });
  // move up/down
  document.querySelectorAll('.item-move').forEach(b=>{
    b.addEventListener('click',e=>{
      const si=+e.currentTarget.dataset.si, ii=+e.currentTarget.dataset.ii, dir=+e.currentTarget.dataset.dir;
      const arr = STATE.sections[si].items;
      const ni = ii+dir;
      if(ni<0 || ni>=arr.length) return;
      [arr[ii],arr[ni]] = [arr[ni],arr[ii]];
      renderSections(); renderPreview(); updatePrice(); saveState();
    });
  });
  // delete item
  document.querySelectorAll('.item-del').forEach(b=>{
    b.addEventListener('click',e=>{
      const si=+e.currentTarget.dataset.si, ii=+e.currentTarget.dataset.ii;
      STATE.sections[si].items.splice(ii,1);
      renderSections(); renderPreview(); updatePrice(); saveState();
    });
  });
  // add item popup
  document.querySelectorAll('.add-item-btn').forEach(b=>{
    b.addEventListener('click',e=>{
      e.stopPropagation();
      const si = +e.currentTarget.dataset.si;
      document.querySelectorAll('.add-item-pop').forEach(p=>{
        if(+p.dataset.si===si) p.classList.toggle('open');
        else p.classList.remove('open');
      });
    });
  });
  document.querySelectorAll('.aip-item').forEach(it=>{
    it.addEventListener('click',e=>{
      e.stopPropagation();
      const si=+e.currentTarget.dataset.si, type=e.currentTarget.dataset.type;
      const t = ITEM_TYPES[type];
      const sec = STATE.sections[si];
      if(t.atFloor){
        if(sec.items.some(x=>ITEM_TYPES[x.type] && ITEM_TYPES[x.type].atFloor)){
          toast('Ta sekcja ma już miejsce na pralkę'); return;
        }
        if(t.minSecW && sec.w < t.minSecW){
          toast(`Wymaga sekcji ≥ ${t.minSecW} mm (obecnie ${sec.w} mm)`); return;
        }
        if(sec.lift){ sec.lift = 0; toast('Sekcja opuszczona do podłogi — pralka musi stać na podłodze'); }
      }
      const newIt = {type, h: t.defaultH || 300};
      if(t.variants) newIt.variant = t.variants[0].id;
      sec.items.push(newIt);
      if(t.atFloor) sortFloorItems(sec);
      // siedzisko: płyta na 450 mm, 1200 mm wolnej wnęki nad nią, półka pod siedziskiem
      if(type === 'siedzisko'){
        sec.items = sec.items.filter(x=>x.type !== 'siedzisko');
        const rest = sec.items.filter(x=>!(x.type==='polka' && !x.manual) && x.type!=='otwarta');
        sec.items = [
          ...rest,
          {type:'polka', h:0},                       // płyta na 1650 mm (auto-wysokość = reszta)
          {type:'otwarta', h:1200, manual:true},     // wolna wnęka nad siedziskiem
          {type:'siedzisko', h:18},                  // płyta siedziska
          {type:'polka', h:432, manual:true},        // przestrzeń pod siedziskiem (450 − 18)
        ];
      }
      // wnętrze widoczne tylko w podglądzie "Wnętrze" — przełącz automatycznie
      if(STATE.previewView === 'front' && (STATE.frontMode==='sliding' || STATE.sectionFronts[si])){
        STATE.previewView = 'open';
        document.querySelectorAll('.prev-tab').forEach(t2=>t2.classList.toggle('on', t2.dataset.view==='open'));
        toast(`${t.name} dodane — podgląd przełączony na wnętrze`);
      }
      document.querySelector(`.add-item-pop[data-si="${si}"]`).classList.remove('open');
      renderSections(); renderPreview(); updatePrice(); saveState();
    });
  });
  // global close popup
  document.addEventListener('click',()=>document.querySelectorAll('.add-item-pop.open').forEach(p=>p.classList.remove('open')), {once:true});
  // drag and drop
  let dragSrc=null;
  document.querySelectorAll('.item-row').forEach(r=>{
    r.addEventListener('dragstart',e=>{
      dragSrc = {si:+r.dataset.si, ii:+r.dataset.ii};
      r.style.opacity='.4';
    });
    r.addEventListener('dragend',()=>r.style.opacity='1');
    r.addEventListener('dragover',e=>{ e.preventDefault(); r.style.outline='1px dashed var(--accent)'; });
    r.addEventListener('dragleave',()=>r.style.outline='none');
    r.addEventListener('drop',e=>{
      e.preventDefault(); r.style.outline='none';
      if(!dragSrc) return;
      const dst = {si:+r.dataset.si, ii:+r.dataset.ii};
      if(dragSrc.si!==dst.si) return; // same section only
      const arr = STATE.sections[dragSrc.si].items;
      const [m] = arr.splice(dragSrc.ii,1);
      arr.splice(dst.ii,0,m);
      renderSections(); renderPreview(); updatePrice(); saveState();
    });
  });
  // variant chooser
  document.querySelectorAll('.item-variant').forEach(b=>{
    b.addEventListener('click',e=>{
      e.stopPropagation();
      const si=+b.dataset.si, ii=+b.dataset.ii;
      openVariantModal(si,ii);
    });
  });
}

// ── Variant fit-check — section width, cabinet depth, fixed height
function variantFit(v, secW, depthMm){
  // width — bands take precedence over min/max
  if(v.widthBands && v.widthBands.length){
    const ok = v.widthBands.some(b=>secW>=b[0] && secW<=b[1]);
    if(!ok){
      const bandsTxt = v.widthBands.map(b=>b[0]===b[1]?`${b[0]}`:`${b[0]}–${b[1]}`).join(' / ');
      return {ok:false, reason:`Sekcja musi mieć ${bandsTxt} mm (obecnie ${secW} mm)`};
    }
  } else if(v.widthStep){
    const {base, step, tol=0} = v.widthStep;
    if(secW < base) return {ok:false, reason:`Sekcja musi mieć ≥ ${base} mm (obecnie ${secW} mm)`};
    if(v.maxSecW && secW > v.maxSecW) return {ok:false, reason:`Sekcja musi mieć ≤ ${v.maxSecW} mm (obecnie ${secW} mm)`};
    const k = Math.round((secW-base)/step);
    const ideal = base + k*step;
    if(Math.abs(secW-ideal) > tol){
      return {ok:false, reason:`Sekcja co ${step} mm od ${base} mm (najbliższa: ${ideal} mm; obecnie ${secW} mm)`};
    }
  } else {
    if(v.minSecW && secW < v.minSecW) return {ok:false, reason:`Wymaga sekcji ≥ ${v.minSecW} mm (obecnie ${secW} mm)`};
    if(v.maxSecW && secW > v.maxSecW) return {ok:false, reason:`Wymaga sekcji ≤ ${v.maxSecW} mm (obecnie ${secW} mm)`};
  }
  // depth
  if(v.minD && depthMm && depthMm < v.minD){
    return {ok:false, reason:`Wymaga głębokości ≥ ${v.minD} mm (obecnie ${depthMm} mm)`};
  }
  return {ok:true};
}

// ── Variant modal
function openVariantModal(si,ii){
  const it = STATE.sections[si].items[ii];
  const t = ITEM_TYPES[it.type];
  if(!t || !t.variants) return;
  const secW = STATE.sections[si].w;
  let modal = document.getElementById('variantModal');
  if(!modal){
    modal = document.createElement('div');
    modal.id = 'variantModal';
    modal.className = 'vm-overlay';
    document.body.appendChild(modal);
  }

  const renderBody = ()=>{
    const it2 = STATE.sections[si].items[ii];
    const cur = it2.variant || t.variants[0].id;
    const curVariant = t.variants.find(v=>v.id===cur);
    const internalToggle = t.hasInternalToggle ? `
      <div class="vm-internal">
        <div class="vm-int-label">Typ szuflady</div>
        <div class="vm-int-toggle">
          <button class="vm-int-btn ${!it2.internal?'on':''}" data-int="0">Zewnętrzna<span class="vm-int-sub">z własnym frontem</span></button>
          <button class="vm-int-btn ${it2.internal?'on':''}" data-int="1">Wewnętrzna<span class="vm-int-sub">ukryta za frontem</span></button>
        </div>
      </div>` : '';
    // frame color picker for current variant (if it has frameColors)
    const fcs = curVariant && curVariant.frameColors;
    const curFc = it2.frameColor || (fcs && fcs[0]) || null;
    const frameColorPicker = fcs ? `
      <div class="vm-internal">
        <div class="vm-int-label">Kolor stelaża</div>
        <div class="vm-fc-row">
          ${fcs.map(fc=>{
            const c = FRAME_COLORS[fc]; if(!c) return '';
            const on = fc===curFc;
            return `<button class="vm-fc-btn ${on?'on':''}" data-fc="${fc}" title="${c.name}">
              <span class="vm-fc-sw" style="background:${c.swatch};border-color:${c.stroke}"></span>
              <span class="vm-fc-name">${c.name}</span>
            </button>`;
          }).join('')}
        </div>
      </div>` : '';
    modal.innerHTML = `
      <div class="vm-card">
        <div class="vm-head">
          <div>
            <div class="f-label" style="margin-bottom:.3rem">Wariant — ${t.name}</div>
            <div style="font-family:var(--ff-serif);font-size:1.4rem;line-height:1">Wybierz ${t.name.toLowerCase()}</div>
          </div>
          <button class="vm-close" aria-label="Zamknij">×</button>
        </div>
        ${internalToggle}
        <div class="vm-list">
          ${t.variants.map(v=>{
            const fit = variantFit(v, secW, STATE.dim && STATE.dim.d);
            const blocked = !fit.ok;
            const reason = fit.reason || '';
            return `
            <div class="vm-opt ${v.id===cur?'sel':''} ${blocked?'blocked':''}" data-vid="${v.id}" ${blocked?'data-blocked="1"':''}>
              ${v.image?`<div class="vm-opt-thumb"><img src="${v.image}" alt="${v.name}" onerror="this.parentNode.style.display='none'"/></div>`:''}
              <div class="vm-opt-main">
                <div class="vm-opt-name">${v.name}</div>
                <div class="vm-opt-desc">${v.desc||''}</div>
                ${v.brand?`<div class="vm-opt-brand">${v.brand}</div>`:''}
                ${blocked?`<div class="vm-opt-block">⚠ ${reason}</div>`:''}
              </div>
              <div class="vm-opt-price mono">${v.price?'+'+v.price+' zł':'w cenie'}</div>
            </div>`;
          }).join('')}
        </div>
        ${frameColorPicker}
        ${t.note?`<div class="vm-note">${t.note}</div>`:''}
        <div class="vm-foot"><button class="vm-done">Gotowe</button></div>
      </div>`;
    bind();
  };

  const bind = ()=>{
    modal.querySelector('.vm-close').onclick = close;
    const doneBtn = modal.querySelector('.vm-done');
    if(doneBtn) doneBtn.onclick = close;
    modal.querySelectorAll('.vm-int-btn').forEach(b=>{
      b.onclick = ()=>{
        STATE.sections[si].items[ii].internal = b.dataset.int==='1';
        renderSections(); renderPreview(); updatePrice(); saveState();
        renderBody();
      };
    });
    modal.querySelectorAll('.vm-fc-btn').forEach(b=>{
      b.onclick = ()=>{
        STATE.sections[si].items[ii].frameColor = b.dataset.fc;
        renderSections(); renderPreview(); updatePrice(); saveState();
        renderBody();
      };
    });
    modal.querySelectorAll('.vm-opt').forEach(o=>{
      o.onclick = ()=>{
        if(o.dataset.blocked){ toast('Wariant niedostępny dla tej sekcji'); return; }
        const newVid = o.dataset.vid;
        const newV = t.variants.find(v=>v.id===newVid);
        STATE.sections[si].items[ii].variant = newVid;
        // reset frameColor if the new variant doesn't support the current one
        const cur = STATE.sections[si].items[ii].frameColor;
        if(newV && newV.frameColors){
          if(!cur || !newV.frameColors.includes(cur)){
            STATE.sections[si].items[ii].frameColor = newV.frameColors[0];
          }
        } else {
          delete STATE.sections[si].items[ii].frameColor;
        }
        // apply fixedH / minH constraints to the item's height
        if(newV){
          if(newV.fixedH){
            STATE.sections[si].items[ii].h = newV.fixedH;
          } else if(newV.minH && (STATE.sections[si].items[ii].h||0) < newV.minH){
            STATE.sections[si].items[ii].h = newV.minH;
          }
        }
        renderSections(); renderPreview(); updatePrice(); saveState();
        renderBody();
      };
    });
  };
  const close = ()=>modal.classList.remove('show');
  modal.onclick = e=>{ if(e.target===modal) close(); };

  modal.classList.add('show');
  renderBody();
}
function updateSbInfo(){
  const usable = usableInternalW();
  document.getElementById('sbWidth').textContent = `${usable} mm`;
  document.getElementById('sbCount').textContent = STATE.sections.length;
  const sum = STATE.sections.reduce((a,s)=>a+s.w,0);
  const sumEl = document.getElementById('sbSum');
  const diff = sum - usable;
  sumEl.className = Math.abs(diff)<=20 ? 'ok' : 'bad';
  sumEl.textContent = `${sum} mm${Math.abs(diff)>20 ? ` (${diff>0?'+':''}${diff})` : ''}`;
  const balBtn = document.getElementById('sbBalance');
  if(balBtn && !balBtn._bound){
    balBtn._bound = true;
    balBtn.addEventListener('click', ()=>{
      balanceSectionWidths();
      renderSections(); renderPreview(); updatePrice(); saveState();
    });
  }
}

// ────────────────────────────────────────────────────────────
//  STEP 4 — materials + fronts
// ────────────────────────────────────────────────────────────
function renderMdfBlock(){
  const cfg = document.getElementById('mdfCfg');
  if(!cfg) return;
  STATE.mdf = STATE.mdf || {finish:'mat', ral:'9010', profile:'gladki'};
  const isMdf = STATE.frontMat === 'mdf';
  const blk = document.getElementById('mdfBlock');
  if(blk) blk.style.opacity = STATE.frontMode==='sliding' ? .55 : 1;
  document.getElementById('fmatPlyta').classList.toggle('on', !isMdf);
  document.getElementById('fmatMdf').classList.toggle('on', isMdf);
  cfg.hidden = !isMdf;
  document.querySelectorAll('#mdfFinish [data-finish]').forEach(b=>b.classList.toggle('on', b.dataset.finish===STATE.mdf.finish));
  const ralIn = document.getElementById('mdfRal');
  if(ralIn && document.activeElement !== ralIn) ralIn.value = STATE.mdf.ral || '';
  const inf = mdfInfo();
  const sw = document.getElementById('mdfRalSw'); if(sw) sw.style.background = inf.hex;
  const nm = document.getElementById('mdfRalName'); if(nm) nm.textContent = inf.name;
  const icons = {
    gladki:'<svg viewBox="0 0 34 46" fill="none" stroke="#1a1a17" stroke-width="1.2"><rect x="3" y="3" width="28" height="40"/></svg>',
    ramka:'<svg viewBox="0 0 34 46" fill="none" stroke="#1a1a17" stroke-width="1.2"><rect x="3" y="3" width="28" height="40"/><rect x="8" y="8" width="18" height="30"/></svg>',
    wzor:'<svg viewBox="0 0 34 46" fill="none" stroke="#1a1a17" stroke-width="1.2"><rect x="3" y="3" width="28" height="40"/><rect x="8" y="8" width="18" height="13"/><rect x="8" y="25" width="18" height="13"/></svg>',
    ryflowany:'<svg viewBox="0 0 34 46" fill="none" stroke="#1a1a17" stroke-width="1.2"><rect x="3" y="3" width="28" height="40"/><path d="M9 3v40M15 3v40M21 3v40M27 3v40" stroke-width=".8"/></svg>',
    uchwyt:'<svg viewBox="0 0 34 46" fill="none" stroke="#1a1a17" stroke-width="1.2"><rect x="3" y="3" width="28" height="40"/><path d="M3 9h28" stroke-width="2.4"/></svg>',
  };
  const pr = document.getElementById('mdfProfiles');
  if(pr){
    pr.innerHTML = MDF_PROFILES.map(p=>'<button type="button" class="mdf-prof '+(p.id===STATE.mdf.profile?'on':'')+'" data-prof="'+p.id+'">'+(icons[p.id]||'')+'<span>'+p.name+'</span></button>').join('');
    pr.querySelectorAll('[data-prof]').forEach(b=>b.onclick = ()=>{
      STATE.mdf.profile = b.dataset.prof; renderMdfBlock(); renderPreview(); updatePrice(); saveState();
    });
  }
  const lbl = document.getElementById('dekorLabel');
  if(lbl) lbl.textContent = (isMdf && STATE.frontMode!=='sliding') ? 'Dekor płyty — korpus' : 'Dekor płyty';
  if(!cfg._bound){
    cfg._bound = true;
    document.getElementById('fmatPlyta').onclick = ()=>{ STATE.frontMat='plyta'; renderMaterials(); renderPreview(); updatePrice(); saveState(); };
    document.getElementById('fmatMdf').onclick = ()=>{
      if(STATE.frontMode==='sliding') toast('MDF lakierowany dotyczy frontów uchylnych, szuflad, blend i cokołu');
      STATE.frontMat='mdf'; renderMaterials(); renderPreview(); updatePrice(); saveState();
    };
    document.querySelectorAll('#mdfFinish [data-finish]').forEach(b=>b.onclick = ()=>{
      STATE.mdf.finish = b.dataset.finish; renderMdfBlock(); renderPreview(); saveState();
    });
    ralIn.addEventListener('input', ()=>{
      ralIn.value = ralIn.value.replace(/\D/g,'').slice(0,4);
      STATE.mdf.ral = ralIn.value; renderMdfBlock(); renderPreview(); saveState();
    });
  }
}
function renderMaterials(){
  renderMdfBlock();
  const tone = STATE.matTone;
  const filtered = MATERIALS.filter(m=>tone==='all' || m.tone===tone);
  document.getElementById('matCount').textContent = filtered.length;

  // which decor are we currently editing?
  const editing = STATE.splitFront ? STATE.matEditing : 'corpus';
  const curId = (editing==='fronts') ? STATE.materialFront : STATE.material;
  document.getElementById('matEditing').textContent = 'Edytujesz: ' + (editing==='fronts' ? 'fronty' : (STATE.splitFront?'korpus':'korpus + fronty'));

  // selected bar — show both chips
  const corp = MATERIALS.find(m=>m.id===STATE.material) || MATERIALS[0];
  const fron = STATE.splitFront ? (MATERIALS.find(m=>m.id===STATE.materialFront) || corp) : corp;
  const chip = (m,lbl)=>`<div class="msb-chip"><span class="lbl">${lbl}</span><span class="sw">${m.image?`<img src="${m.image}" alt=""/>`:`<span style="background:${m.color||'#cdc6b4'};width:100%;height:100%;display:block"></span>`}</span><span>${m.name} · ${m.code}</span></div>`;
  const bar = document.getElementById('matSelectedBar');
  if(STATE.splitFront){
    bar.style.display = 'flex';
    bar.innerHTML = chip(corp,'Korpus') + chip(fron,'Fronty');
  } else {
    bar.style.display = 'flex';
    bar.innerHTML = chip(corp,'Wszystko');
  }

  const grid = document.getElementById('matGrid');
  grid.innerHTML = '';
  filtered.forEach(m=>{
    const card = document.createElement('div');
    card.className = 'mat-card' + (curId===m.id?' sel':'');
    let swatch;
    if(m.image){
      swatch = `<img src="${m.image}" alt="${m.name}" class="swatch" style="object-fit:cover"/>`;
    } else {
      swatch = generateSwatch(m);
    }
    card.innerHTML = `
      ${swatch}
      <div class="mat-check"><svg viewBox="0 0 12 12"><path d="M2 6l3 3 5-6"/></svg></div>
      <div class="mat-meta">
        <div class="mat-name">${m.name}</div>
        <div class="mat-code">${m.code}</div>
      </div>
    `;
    card.onclick = ()=>{
      if(editing==='fronts'){
        STATE.materialFront = m.id;
      } else {
        STATE.material = m.id; STATE.materialName = m.name; STATE.materialCode = m.code;
        if(!STATE.splitFront) STATE.materialFront = m.id;
      }
      renderMaterials(); renderPreview(); updatePrice(); saveState();
    };
    grid.appendChild(card);
  });
  document.querySelectorAll('.tone-chip').forEach(c=>{
    c.classList.toggle('on', c.dataset.tone===STATE.matTone);
    c.onclick = ()=>{ STATE.matTone = c.dataset.tone; renderMaterials(); saveState(); };
  });
  // split-front toggle
  const chk = document.getElementById('splitFrontChk');
  chk.checked = !!STATE.splitFront;
  chk.onchange = ()=>{
    STATE.splitFront = chk.checked;
    if(!STATE.splitFront){
      STATE.materialFront = STATE.material;
      STATE.matEditing = 'corpus';
    }
    renderMaterials(); renderPreview(); updatePrice(); saveState();
  };
  // corpus/fronts tabs
  document.querySelectorAll('.split-tab').forEach(t=>{
    t.classList.toggle('hidden', !STATE.splitFront);
    t.classList.toggle('on', t.dataset.split===STATE.matEditing);
    t.onclick = ()=>{ STATE.matEditing = t.dataset.split; renderMaterials(); saveState(); };
  });

  renderHingesBlock();
  renderSlidingBlock();
  renderHandles();
  // Uchwyty tylko dla frontów uchylnych
  const handlesBlock = document.getElementById('handlesBlock');
  if(handlesBlock) handlesBlock.style.display = STATE.frontMode==='sliding' ? 'none' : '';

  // front-mode buttons
  document.querySelectorAll('.front-mode-btn').forEach(b=>{
    b.classList.toggle('on', b.dataset.fm===STATE.frontMode);
    b.onclick = ()=>{
      STATE.frontMode = b.dataset.fm;
      renderMaterials(); renderFrontSections(); renderPreview(); updatePrice(); saveState();
    };
  });
}

// ── HINGES ─────────────────────────────────────────────────
function renderHingesBlock(){
  const block = document.getElementById('hingesBlock');
  block.style.display = STATE.frontMode==='hinged' ? 'block' : 'none';
  if(STATE.frontMode!=='hinged') return;
  const tipon = STATE.handle==='tipon';
  // tip-on forces standard hinges
  if(tipon && STATE.hinges==='soft') STATE.hinges='standard';
  document.getElementById('hingeNote').style.display = tipon ? 'block' : 'none';

  const row = document.getElementById('hingeRow');
  const icons = {
    standard:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="8" cy="12" r="4" stroke="#1a1a17" stroke-width="1.4"/><circle cx="16" cy="12" r="4" stroke="#1a1a17" stroke-width="1.4"/></svg>`,
    soft:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="8" cy="12" r="4" stroke="#1a1a17" stroke-width="1.4"/><circle cx="16" cy="12" r="4" stroke="#1a1a17" stroke-width="1.4"/><path d="M20 7c1.5 1.6 1.5 8.4 0 10" stroke="#1a1a17" stroke-width="1.2" stroke-linecap="round"/></svg>`,
  };
  row.innerHTML = HINGES.map(h=>{
    const disabled = (h.id==='soft' && tipon);
    const thumb = h.image
      ? `<img src="${h.image}" alt="${h.name}" onerror="this.outerHTML='${(icons[h.id]||'').replace(/'/g,'&apos;').replace(/"/g,'&quot;')}'"/>`
      : (icons[h.id]||'');
    return `
      <button class="opt-card ${STATE.hinges===h.id?'sel':''} ${disabled?'disabled':''}" data-hinge="${h.id}" ${disabled?'aria-disabled="true"':''}>
        <span class="opt-ico opt-ico--img">${thumb}</span>
        <span class="opt-body">
          <div class="opt-name">${h.name}</div>
          <div class="opt-desc">${h.desc}</div>
          <div class="opt-meta">
            <span class="opt-brand">${h.brand||''}</span>
            <span class="opt-price">${h.price?'+'+h.price+' zł / zawias':'w cenie'}</span>
          </div>
        </span>
      </button>`;
  }).join('');
  row.querySelectorAll('[data-hinge]').forEach(b=>{
    b.onclick = ()=>{
      if(b.classList.contains('disabled')){
        toast('Wybierz inny uchwyt, aby włączyć cichy domyk');
        return;
      }
      STATE.hinges = b.dataset.hinge;
      renderMaterials(); renderPreview(); updatePrice(); saveState();
    };
  });
}

// ── SLIDING (system + kolor profilu + wypełnienie + podział) ─
function renderSlidingBlock(){
  const block = document.getElementById('slidingBlock');
  block.style.display = STATE.frontMode==='sliding' ? 'block' : 'none';
  if(STATE.frontMode!=='sliding') return;

  // Validate state
  if(!SLIDING_PROFILES.find(p=>p.id===STATE.slidingProfile)) STATE.slidingProfile='caro';
  if(!SLIDING_COLORS.find(c=>c.id===STATE.slidingProfileColor)) STATE.slidingProfileColor='aluminium';

  // Fallback SVG per system
  const profIcons = {
    caro:`<svg viewBox="0 0 30 30" fill="none"><rect x="4" y="3" width="22" height="24" stroke="#1a1a17" stroke-width="1.3"/><rect x="6" y="5" width="18" height="20" fill="#1a1a17" opacity=".06"/><rect x="22" y="6" width="3" height="18" fill="#1a1a17"/></svg>`,
    nero:`<svg viewBox="0 0 30 30" fill="none"><rect x="4" y="3" width="22" height="24" stroke="#1a1a17" stroke-width="1.6"/><rect x="6" y="5" width="18" height="20" fill="#1a1a17" opacity=".05"/><rect x="5" y="6" width="3" height="18" fill="#1a1a17"/></svg>`,
    novo:`<svg viewBox="0 0 30 30" fill="none"><rect x="5" y="3" width="20" height="24" stroke="#1a1a17" stroke-width="1"/><rect x="6" y="4" width="18" height="22" fill="#1a1a17" opacity=".06"/></svg>`,
    ergo:`<svg viewBox="0 0 30 30" fill="none"><rect x="4" y="3" width="22" height="24" stroke="#1a1a17" stroke-width="1.3"/><rect x="6" y="5" width="18" height="20" fill="#1a1a17" opacity=".05"/><rect x="13" y="11" width="4" height="8" fill="#1a1a17"/></svg>`,
    loca:`<svg viewBox="0 0 30 30" fill="none"><rect x="4" y="3" width="22" height="24" stroke="#1a1a17" stroke-width="1.3"/><rect x="6" y="5" width="18" height="20" fill="#1a1a17" opacity=".05"/><circle cx="15" cy="15" r="3.2" fill="#1a1a17"/></svg>`,
    dzielony:`<svg viewBox="0 0 30 30" fill="none"><rect x="4" y="3" width="22" height="24" stroke="#1a1a17" stroke-width="1.3"/><line x1="4" y1="11" x2="26" y2="11" stroke="#1a1a17" stroke-width="1.3"/><line x1="4" y1="19" x2="26" y2="19" stroke="#1a1a17" stroke-width="1.3"/></svg>`,
    bezramowy:`<svg viewBox="0 0 30 30" fill="none"><rect x="5" y="3" width="20" height="24" fill="#1a1a17" opacity=".1"/><line x1="5" y1="3" x2="5" y2="27" stroke="#1a1a17" stroke-width=".5" opacity=".4"/><line x1="25" y1="3" x2="25" y2="27" stroke="#1a1a17" stroke-width=".5" opacity=".4"/></svg>`,
  };

  const grid = document.getElementById('profileGrid');
  grid.innerHTML = SLIDING_PROFILES.map(p=>{
    const thumb = p.image
      ? `<img src="${p.image}" alt="${p.name}" onerror="this.outerHTML='${(profIcons[p.id]||'').replace(/'/g,'&apos;').replace(/"/g,'&quot;')}'"/>`
      : (profIcons[p.id]||'');
    return `
      <button class="opt-card ${STATE.slidingProfile===p.id?'sel':''}" data-profile="${p.id}">
        <span class="opt-ico opt-ico--img">${thumb}</span>
        <span class="opt-body">
          <div class="opt-name">${p.name}</div>
          <div class="opt-desc">${p.desc}</div>
          <div class="opt-meta">
            <span class="opt-brand">${p.brand||''}</span>
            <span class="opt-price">${p.price?'+'+p.price+' zł / drzwi':'w cenie'}</span>
          </div>
        </span>
      </button>`;
  }).join('');
  grid.querySelectorAll('[data-profile]').forEach(b=>{
    b.onclick = ()=>{
      STATE.slidingProfile = b.dataset.profile;
      renderSlidingBlock(); renderPreview(); updatePrice(); saveState();
    };
  });

  // Kolor profilu (3 swatch)
  const hw = document.getElementById('hwRow');
  hw.innerHTML = SLIDING_COLORS.map(c=>`
    <button class="hw-card ${STATE.slidingProfileColor===c.id?'sel':''}" data-hw="${c.id}">
      <span class="hw-swatch" style="background:linear-gradient(135deg,${c.sample} 0%,${c.edge} 100%)"></span>
      <span class="hw-name">${c.name}</span>
    </button>`).join('');
  hw.querySelectorAll('[data-hw]').forEach(b=>{
    b.onclick = ()=>{
      STATE.slidingProfileColor = b.dataset.hw;
      renderSlidingBlock(); renderPreview(); updatePrice(); saveState();
    };
  });

  // Wypełnienie / podział
  const prof = SLIDING_PROFILES.find(p=>p.id===STATE.slidingProfile);
  const fillBlock = document.getElementById('slidingFillBlock');
  const splitBlock = document.getElementById('slidingSplitBlock');

  if(prof.fillable && !prof.divisible){
    fillBlock.style.display = 'block';
    splitBlock.style.display = 'none';
    const fillIcons = {
      plyta:`<svg viewBox="0 0 30 30" fill="none"><rect x="3" y="3" width="24" height="24" fill="#a08570" opacity=".5"/><line x1="3" y1="9" x2="27" y2="9" stroke="#5a4a3a" stroke-width=".4" opacity=".5"/><line x1="3" y1="17" x2="27" y2="17" stroke="#5a4a3a" stroke-width=".4" opacity=".5"/></svg>`,
      lustro:`<svg viewBox="0 0 30 30" fill="none"><defs><linearGradient id="m1" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#e6ecef"/><stop offset=".5" stop-color="#c9d1d6"/><stop offset="1" stop-color="#aeb6bc"/></linearGradient></defs><rect x="3" y="3" width="24" height="24" fill="url(#m1)"/></svg>`,
      szklo:`<svg viewBox="0 0 30 30" fill="none"><rect x="3" y="3" width="24" height="24" fill="#d8dde0" opacity=".6"/><rect x="3" y="3" width="24" height="24" fill="#fff" opacity=".25"/></svg>`,
    };
    const fillGrid = document.getElementById('fillGrid');
    fillGrid.innerHTML = SLIDING_FILLS.map(f=>`
      <button class="opt-card ${STATE.slidingFill===f.id?'sel':''}" data-fill="${f.id}">
        <span class="opt-ico opt-ico--img">${fillIcons[f.id]||''}</span>
        <span class="opt-body">
          <div class="opt-name">${f.name}</div>
          <div class="opt-desc">${f.desc}</div>
          <div class="opt-meta">
            <span class="opt-brand"></span>
            <span class="opt-price">${f.price?'+'+f.price+' zł '+f.unit:f.unit}</span>
          </div>
        </span>
      </button>`).join('');
    fillGrid.querySelectorAll('[data-fill]').forEach(b=>{
      b.onclick = ()=>{
        STATE.slidingFill = b.dataset.fill;
        renderSlidingBlock(); renderPreview(); updatePrice(); saveState();
      };
    });
  } else if(prof.divisible){
    fillBlock.style.display = 'none';
    splitBlock.style.display = 'block';
    const sp = STATE.slidingSplits || {count:2, fills:['lustro','plyta']};
    if(sp.fills.length < sp.count){
      sp.fills = sp.fills.concat(Array(sp.count - sp.fills.length).fill('plyta'));
    }
    sp.fills = sp.fills.slice(0, sp.count);
    STATE.slidingSplits = sp;

    const countRow = document.getElementById('splitCountRow');
    countRow.innerHTML = `
      <span class="leg-color-label" style="margin-right:.4rem">Pasów</span>
      <button class="split-pill ${sp.count===2?'on':''}" data-count="2">2 pasy</button>
      <button class="split-pill ${sp.count===3?'on':''}" data-count="3">3 pasy</button>`;
    countRow.querySelectorAll('[data-count]').forEach(b=>{
      b.onclick = ()=>{
        const n = +b.dataset.count;
        STATE.slidingSplits = {count:n, fills:(sp.fills.slice(0,n).concat(Array(Math.max(0,n-sp.fills.length)).fill('plyta'))).slice(0,n)};
        renderSlidingBlock(); renderPreview(); updatePrice(); saveState();
      };
    });
    const stripes = document.getElementById('splitStripes');
    const lbl = sp.count===2 ? ['Góra','Dół'] : ['Góra','Środek','Dół'];
    stripes.innerHTML = Array.from({length:sp.count}).map((_,i)=>{
      const cur = sp.fills[i] || 'plyta';
      return `<div class="split-stripe">
        <span class="split-stripe-label">${lbl[i]}</span>
        <div class="split-stripe-pick">
          ${SLIDING_FILLS.map(f=>`<button class="split-fill-btn ${cur===f.id?'on':''}" data-i="${i}" data-fill="${f.id}">${f.name}${f.price?` <span style="opacity:.6">+${f.price}</span>`:''}</button>`).join('')}
        </div>
      </div>`;
    }).join('');
    stripes.querySelectorAll('[data-fill]').forEach(b=>{
      b.onclick = ()=>{
        const i = +b.dataset.i;
        const fid = b.dataset.fill;
        const arr = STATE.slidingSplits.fills.slice();
        arr[i] = fid;
        STATE.slidingSplits = {count:STATE.slidingSplits.count, fills:arr};
        renderSlidingBlock(); renderPreview(); updatePrice(); saveState();
      };
    });
  } else {
    // bezramowy — tylko płyta
    fillBlock.style.display = 'none';
    splitBlock.style.display = 'none';
  }
}

// ── HANDLES ────────────────────────────────────────────────
function renderHandles(){
  const wrap = document.getElementById('handleGrid');
  // SVG fallback per handle (used until images load)
  const ill = {
    tipon:`<svg width="58" height="42" viewBox="0 0 60 42" fill="none"><rect x="6" y="6" width="48" height="30" stroke="#1a1a17" stroke-width="1.3" rx="1"/><circle cx="30" cy="21" r="7" stroke="#1a1a17" stroke-width="1.2" stroke-dasharray="2 2"/><circle cx="30" cy="21" r="2.2" fill="#1a1a17"/><path d="M30 8 L30 11 M30 31 L30 34 M14 21 L17 21 M43 21 L46 21" stroke="#1a1a17" stroke-width="1.2" stroke-linecap="round"/></svg>`,
    'galka-spot':`<svg width="58" height="42" viewBox="0 0 60 42" fill="none"><rect x="6" y="4" width="48" height="34" stroke="#1a1a17" stroke-width="1.3"/><circle cx="42" cy="21" r="4.5" fill="#1a1a17"/></svg>`,
    'galka-atm':`<svg width="58" height="42" viewBox="0 0 60 42" fill="none"><rect x="6" y="4" width="48" height="34" stroke="#1a1a17" stroke-width="1.3"/><rect x="38" y="17" width="8" height="8" fill="#1a1a17" rx="1"/></svg>`,
    'uchwyt-hexa-160':`<svg width="58" height="42" viewBox="0 0 60 42" fill="none"><rect x="6" y="4" width="48" height="34" stroke="#1a1a17" stroke-width="1.3"/><rect x="6" y="4" width="48" height="4" fill="#1a1a17"/></svg>`,
    'uchwyt-bagio-128':`<svg width="58" height="42" viewBox="0 0 60 42" fill="none"><rect x="6" y="4" width="48" height="34" stroke="#1a1a17" stroke-width="1.3"/><rect x="22" y="20" width="16" height="2" fill="#1a1a17"/><circle cx="23" cy="21" r="1.4" fill="#1a1a17"/><circle cx="37" cy="21" r="1.4" fill="#1a1a17"/></svg>`,
    'uchwyt-bagio-192':`<svg width="58" height="42" viewBox="0 0 60 42" fill="none"><rect x="6" y="4" width="48" height="34" stroke="#1a1a17" stroke-width="1.3"/><rect x="14" y="20" width="32" height="2" fill="#1a1a17"/><circle cx="15" cy="21" r="1.6" fill="#1a1a17"/><circle cx="45" cy="21" r="1.6" fill="#1a1a17"/></svg>`,
  };
  wrap.innerHTML = HANDLES.map(h=>{
    const sel = STATE.handle===h.id;
    const thumb = h.image
      ? `<img src="${h.image}" alt="${h.name}" onerror="this.outerHTML='${(ill[h.id]||'').replace(/'/g,'&apos;').replace(/"/g,'&quot;')}'"/>`
      : (ill[h.id]||'');
    // base + selected color upcharge
    let priceTxt = '';
    if(h.price){
      let extra = 0;
      if(sel && h.colors){
        const c = h.colors.find(c=>c.id===STATE.handleColor) || h.colors[0];
        if(c) extra = c.price||0;
      }
      const total = h.price + extra;
      priceTxt = `+${total} zł ${h.unit||''}`;
    } else {
      priceTxt = 'w cenie';
    }
    return `
      <button class="handle-card ${sel?'sel':''}" data-handle="${h.id}">
        ${h.brand?`<span class="handle-tag">${h.brand}</span>`:''}
        <div class="handle-ill">${thumb}</div>
        <div class="handle-name">${h.name}</div>
        <div class="handle-desc">${h.desc}</div>
        <div class="handle-price">${priceTxt}</div>
      </button>`;
  }).join('');
  wrap.querySelectorAll('.handle-card').forEach(c=>{
    c.onclick = ()=>{
      const h = HANDLES.find(x=>x.id===c.dataset.handle);
      STATE.handle = c.dataset.handle;
      STATE.handlePrice = h ? h.price : 0;
      // reset color if not available for new handle
      if(h && h.colors){
        if(!h.colors.find(cc=>cc.id===STATE.handleColor)){
          STATE.handleColor = h.colors[0].id;
        }
      } else {
        STATE.handleColor = '';
      }
      // tip-on blokuje cichy domyk — auto-przełącz zawiasy
      if(STATE.handle==='tipon' && STATE.hinges==='soft' && STATE.frontMode==='hinged'){
        STATE.hinges='standard';
        toast('Tip-on wymaga zawiasów bez hamulca — zmieniono na standardowe');
      }
      renderMaterials(); renderPreview(); updatePrice(); saveState();
    };
  });
  // ── colors row for the selected handle
  const row = document.getElementById('handleColorRow');
  if(!row) return;
  const cur = HANDLES.find(h=>h.id===STATE.handle);
  if(cur && cur.colors && cur.colors.length>1 && typeof HANDLE_COLORS!=='undefined'){
    row.innerHTML = `<span class="leg-color-label">Kolor ${cur.name.replace(/^.*?[—-]\s*/,'')}</span>` + cur.colors.map(c=>{
      const cd = HANDLE_COLORS[c.id]; if(!cd) return '';
      const upTxt = c.price ? ` <span class="leg-color-up">+${c.price} zł</span>` : '';
      return `<button class="leg-color-btn ${c.id===STATE.handleColor?'on':''}" data-hc="${c.id}">
        <span class="leg-color-sw" style="background:${cd.swatch};border-color:${cd.stroke}"></span>${cd.name}${upTxt}
      </button>`;
    }).join('');
    row.querySelectorAll('.leg-color-btn').forEach(b=>{
      b.onclick = ()=>{
        STATE.handleColor = b.dataset.hc;
        renderHandles(); renderPreview(); updatePrice(); saveState();
      };
    });
  } else if(cur && cur.colors && cur.colors.length===1){
    const cd = HANDLE_COLORS && HANDLE_COLORS[cur.colors[0].id];
    row.innerHTML = cd
      ? `<span class="leg-color-label">Kolor</span><span class="leg-color-btn on"><span class="leg-color-sw" style="background:${cd.swatch};border-color:${cd.stroke}"></span>${cd.name}</span>`
      : '';
  } else {
    row.innerHTML = '';
  }
}
function generateSwatch(m){
  const id = 'sw_'+m.id;
  let defs = '', inner = '';
  if(m.texture==='wood'){
    defs = `<linearGradient id="${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${shade(m.color,0.06)}"/><stop offset=".5" stop-color="${m.color}"/><stop offset="1" stop-color="${shade(m.color,-0.06)}"/></linearGradient>`;
    for(let i=0;i<10;i++){
      const yy = i*10 + (m.id.charCodeAt(2)%5);
      inner += `<line x1="0" y1="${yy}" x2="100" y2="${yy+((m.id.charCodeAt(3)||0)%4-2)*0.3}" stroke="${shade(m.color,-0.14)}" stroke-width=".5" opacity="${.25 + ((i*17)%30)/100}"/>`;
    }
    return `<svg class="swatch" viewBox="0 0 100 100" preserveAspectRatio="none"><defs>${defs}</defs><rect width="100" height="100" fill="url(#${id})"/>${inner}</svg>`;
  }
  if(m.texture==='concrete'){
    // pseudo-random deterministic speckle
    let seed = m.id.charCodeAt(1)*17 + m.id.charCodeAt(2);
    function rnd(){ seed = (seed*9301+49297)%233280; return seed/233280; }
    for(let i=0;i<40;i++){
      inner += `<circle cx="${rnd()*100}" cy="${rnd()*100}" r="${rnd()*1.4+0.2}" fill="${shade(m.color, rnd()*0.25-0.12)}" opacity="${.3+rnd()*0.4}"/>`;
    }
    return `<svg class="swatch" viewBox="0 0 100 100" preserveAspectRatio="none"><rect width="100" height="100" fill="${m.color}"/>${inner}</svg>`;
  }
  if(m.texture==='marble'){
    let seed = m.id.charCodeAt(1)*23 + m.id.charCodeAt(2);
    function rnd(){ seed = (seed*9301+49297)%233280; return seed/233280; }
    let paths = '';
    for(let i=0;i<5;i++){
      const y = rnd()*100;
      paths += `<path d="M0 ${y} Q${25+rnd()*20} ${y+rnd()*20-10} ${50} ${y+rnd()*15-5} T100 ${y+rnd()*20-10}" stroke="${shade(m.color,-0.2)}" stroke-width="${.4+rnd()*.8}" fill="none" opacity="${.4+rnd()*0.3}"/>`;
    }
    return `<svg class="swatch" viewBox="0 0 100 100" preserveAspectRatio="none"><rect width="100" height="100" fill="${m.color}"/>${paths}</svg>`;
  }
  return `<svg class="swatch" viewBox="0 0 100 100" preserveAspectRatio="none"><rect width="100" height="100" fill="${m.color}"/></svg>`;
}
function renderFrontSections(){
  const box = document.getElementById('frontSections');
  if(STATE.frontMode==='sliding'){ box.classList.remove('show'); return; }
  box.classList.add('show');
  // ensure array
  while(STATE.sectionFronts.length<STATE.sections.length) STATE.sectionFronts.push(true);
  STATE.sectionFronts.length = STATE.sections.length;
  const list = document.getElementById('fsList');
  list.innerHTML = '';
  STATE.sections.forEach((s,si)=>{
    const has = STATE.sectionFronts[si];
    const row = document.createElement('div');
    row.className = 'fs-row';
    row.innerHTML = `
      <div class="fs-name"><span class="idx">S${si+1}</span>Sekcja ${si+1} (${s.w} mm)</div>
      <div class="fs-toggle">
        <button class="fs-toggle-btn ${has?'on':''}" data-si="${si}" data-v="1">Z frontem</button>
        <button class="fs-toggle-btn ${!has?'on':''}" data-si="${si}" data-v="0">Otwarta</button>
      </div>
    `;
    if(has){
      const cand = frontCutCandidates(s);
      const zones = frontZones(si);
      const nm = it => (ITEM_TYPES[it.type]||{}).name || it.type;
      const lbl = z => s.items.slice(z.from, z.to+1).map(nm).join(', ');
      const ed = document.createElement('div');
      ed.className = 'fz-edit';
      // wysokość podziału od podłogi wnętrza (dołu sekcji) i od góry
      const fhAll = (sectionCabinetH(si) - 36) - (bandSpans(si) ? STATE.band.h : 0) - (s.lift||0);
      const zAll = frontZones(si);
      const cutPos = ci => {
        // położenie środka półki pod elementem ci, jako ułamek od góry
        const tmp = Object.assign({}, s, {frontCuts:[ci], frontOpen:[]});
        const keep = STATE.sections[si]; STATE.sections[si] = tmp;
        const z = frontZones(si); STATE.sections[si] = keep;
        return z.length > 1 ? z[0].f1 : 1;
      };
      ed.innerHTML = (cand.length ? `<div class="fz-cuts"><span class="fz-lbl">Podziel front na półce <span class="fz-dir">(numeracja od góry)</span>:</span>${cand.map((ci,k)=>{ const f = cutPos(ci); const fromTop = Math.round(f*fhAll), fromBot = Math.round((1-f)*fhAll); return `<button type="button" class="fz-cut ${(s.frontCuts||[]).includes(ci)?'on':''}" data-si="${si}" data-ci="${ci}" title="Półka ${k+1} od góry — ${fromTop} mm od góry, ${fromBot} mm od dołu frontu">${k+1}</button>`; }).join('')}</div>` : '')
        + (zones.length > 1 ? zones.map(z=>`<div class="fz-zone"><span class="fz-zn">${z.zi===0?'Góra':(z.zi===zones.length-1?'Dół':'Środek')}</span><span class="fz-items">${lbl(z)}</span><span class="fz-h mono" title="Wysokość frontu w tej strefie; od dołu sekcji">${Math.round((z.f1-z.f0)*fhAll)} mm · od dołu ${Math.round((1-z.f1)*fhAll)}–${Math.round((1-z.f0)*fhAll)}</span><span class="fs-toggle"><button type="button" class="fz-tg ${!z.open?'on':''}" data-si="${si}" data-zi="${z.zi}" data-v="1">Front</button><button type="button" class="fz-tg ${z.open?'on':''}" data-si="${si}" data-zi="${z.zi}" data-v="0">Otwarte</button></span></div>`).join('') : '');
      if(ed.innerHTML) row.appendChild(ed);
    }
    list.appendChild(row);
  });
  list.querySelectorAll('.fz-cut').forEach(b=>{
    b.onclick = ()=>{
      const s = STATE.sections[+b.dataset.si], ci = +b.dataset.ci;
      const cuts = new Set(s.frontCuts||[]);
      cuts.has(ci) ? cuts.delete(ci) : cuts.add(ci);
      s.frontCuts = [...cuts].sort((a,b)=>a-b);
      s.frontOpen = [];
      renderFrontSections(); renderPreview(); updatePrice(); saveState();
    };
  });
  list.querySelectorAll('.fz-tg').forEach(b=>{
    b.onclick = ()=>{
      const si = +b.dataset.si, s = STATE.sections[si], zi = +b.dataset.zi;
      const op = new Set(s.frontOpen||[]);
      b.dataset.v==='1' ? op.delete(zi) : op.add(zi);
      if(op.size >= frontZones(si).length){ toast('Przynajmniej jedna strefa z frontem — albo ustaw sekcję jako otwartą'); return; }
      s.frontOpen = [...op];
      renderFrontSections(); renderPreview(); updatePrice(); saveState();
    };
  });
  list.querySelectorAll('.fs-toggle-btn').forEach(b=>{
    b.onclick = ()=>{
      const si = +b.dataset.si;
      STATE.sectionFronts[si] = b.dataset.v==='1';
      renderFrontSections(); renderPreview(); updatePrice(); saveState();
    };
  });
}

// ────────────────────────────────────────────────────────────
//  PREVIEW (live SVG)
// ────────────────────────────────────────────────────────────
function updatePreviewFoot(){
  const {w,h,d} = STATE.dim;
  const bl = STATE.blenda || {left:0,right:0,top:0};
  const pfd = document.getElementById('pfDim');
  if(pfd) pfd.textContent = (bl.left||bl.right||bl.top)
    ? `${cabinetW()} × ${cabinetH()} × ${d} (korpus)`
    : `${w} × ${h} × ${d}`;
  const n = STATE.sections.length;
  const pl = n===1?'sekcja':(n<5?'sekcje':'sekcji');
  const pfs = document.getElementById('pfSections');
  if(pfs) pfs.textContent = `${n} ${pl}`;
  const pfb = document.getElementById('pfBoard');
  if(pfb) pfb.textContent = `~${computeBoardArea()} m²`;
  const pht = document.getElementById('phType');
  if(pht) pht.textContent = STATE.typeName;
}

// ── Przełączanie 2D / 3D ────────────────────────────────────
function applyViewMode(){
  const is3d = STATE.previewView === '3d';
  const svg = document.getElementById('cabinetSvg');
  const host = document.getElementById('view3d');
  const modeLbl = document.getElementById('phMode');
  if(svg) svg.hidden = is3d;
  if(host) host.hidden = !is3d;
  if(modeLbl) modeLbl.textContent = is3d ? 'podgląd 3D' : 'podgląd 2D';
  if(is3d && window.ZT3D){
    window.ZT3D.show().then(ok=>{
      if(!ok){
        toast('Nie udało się uruchomić widoku 3D — wracam do 2D');
        STATE.previewView = 'front';
        document.querySelectorAll('.prev-tab').forEach(x=>x.classList.toggle('on', x.dataset.view==='front'));
        applyViewMode();
        renderPreview();
      }
    }).catch(e=>{
      console.error('3D show error', e);
      toast('Nie udało się uruchomić widoku 3D — wracam do 2D');
      STATE.previewView = 'front';
      document.querySelectorAll('.prev-tab').forEach(x=>x.classList.toggle('on', x.dataset.view==='front'));
      applyViewMode();
      renderPreview();
    });
  }
}

function renderPreview(){
  applyViewMode();
  if(STATE.previewView === '3d'){
    normalizeShelfHeights();
    if(window.ZT3D && window.ZT3D.isReady()) window.ZT3D.update();
    updatePreviewFoot();
    return;
  }
  normalizeShelfHeights();
  const svg = document.getElementById('cabinetSvg');
  const d = STATE.dim.d;
  const nicheW = STATE.dim.w, nicheH = STATE.dim.h;
  const w = cabinetW(), h = cabinetH();
  const bl = STATE.blenda || {left:0,right:0,top:0};
  const padX=60,padY=60;
  const maxW=600-padX*2, maxH=700-padY*2;
  // skalujemy do całej wnęki (mebel + blendy), żeby wszystko się zmieściło
  const scale = Math.min(maxW/nicheW, maxH/nicheH);
  const W=w*scale, H=h*scale;
  const NW=nicheW*scale, NH=nicheH*scale;
  const nx0=(600-NW)/2, ny0=(700-NH)/2;
  // korpus wewnątrz wnęki: po blendzie lewej + 3 mm luzu, pod blendą górną + 5 mm
  const x0 = nx0 + (bl.left||0)*scale + 3*scale;
  const y0 = ny0 + (bl.top||0)*scale + 5*scale;
  const matC = MATERIALS.find(m=>m.id===STATE.material)||MATERIALS[0];
  const matF = STATE.splitFront ? (MATERIALS.find(m=>m.id===STATE.materialFront)||matC) : matC;
  const fill = matC.color || '#cdc6b4';
  const fillF = mdfOn() ? mdfInfo().hex : (matF.color || fill);
  const dark = shade(fill,-0.15);
  const darkF = shade(fillF,-0.15);
  // interior detail color — fixed dark so shelves/rods/drawers contrast on light decors
  const detail = '#3a342a';

  let content='';
  content += `<rect x="${x0-8}" y="${y0+H}" width="${W+16}" height="3" fill="rgba(0,0,0,0.08)"/>`;
  content += `<line x1="${x0-30}" y1="${y0}" x2="${x0+W+30}" y2="${y0}" stroke="rgba(26,26,23,0.15)" stroke-width="1"/>`;
  content += `<line x1="${x0-30}" y1="${y0+H}" x2="${x0+W+30}" y2="${y0+H}" stroke="rgba(26,26,23,0.25)" stroke-width="1"/>`;
  content += dimLabel(x0,y0+H+34,x0+W,y0+H+34,`korpus ${w} mm`,'h');
  content += dimLabel(nx0,y0+H+54,nx0+NW,y0+H+54,`wnęka ${STATE.dim.w} mm`,'h');
  content += dimLabel(x0-32,y0,x0-32,y0+H,`korpus ${h} mm`,'v');
  if(Math.abs(nicheH - h) > 1) content += dimLabel(nx0+NW+30,ny0,nx0+NW+30,ny0+NH,`wnęka ${STATE.dim.h} mm`,'v');
  const sl = STATE.slope;
  if(sl && sl.on){
    // korpus jako wielokąt pod skosem (respektuje odcinek skosu)
    const yFor = (hMm) => y0 + H - (hMm / h) * H;
    const Wmm = cabinetW();
    const bl0 = STATE.blenda || {left:0,right:0,top:0};
    const flat = Math.max(0, Math.min(sl.flat || 0, STATE.dim.w));
    const pxFor = (xMm) => x0 + (xMm / w) * W;
    // profil sufitu liczony z cabinetHAt (skos zakotwiczony we wnęce)
    const xsMm = [0];
    let accX = 18;
    STATE.sections.forEach(s=>{ xsMm.push(accX); accX += s.w + SEC_STRIDE; });
    xsMm.push(Wmm);
    // punkt złamania skosu w układzie korpusu
    const breakX = sl.side === 'right'
      ? flat - (bl0.left||0) - 3
      : (STATE.dim.w - flat) - (bl0.left||0) - 3;
    if(breakX > 0 && breakX < Wmm) xsMm.push(breakX);
    const uniq = [...new Set(xsMm.filter(v=>v>=0 && v<=Wmm))].sort((a,b)=>a-b);
    const top = uniq.map(xm=>`${pxFor(xm)},${yFor(cabinetHAt(xm))}`).join(' ');
    content += `<polygon points="${top} ${x0+W},${y0+H} ${x0},${y0+H}" fill="${fill}" stroke="${dark}" stroke-width="1.2"/>`;
    // linia skosu (sufit)
    content += `<polyline points="${top}" fill="none" stroke="${dark}" stroke-width="1.6"/>`;
    // wymiar niższej krawędzi
    const loSide = sl.side === 'right' ? Wmm : 0;
    const yLo = yFor(cabinetHAt(loSide));
    const lowX = sl.side === 'right' ? x0+W+14 : x0-14;
    content += `<text x="${lowX}" y="${yLo + (y0+H-yLo)/2}" font-family="JetBrains Mono" font-size="8" fill="#6a6a62" text-anchor="middle" transform="rotate(-90 ${lowX} ${yLo + (y0+H-yLo)/2})">${Math.round(cabinetHAt(loSide))} mm</text>`;
    // wymiar prostego sufitu (gdy jest)
    if(flat > 0 && breakX > 0 && breakX < Wmm){
      const sx0 = sl.side === 'right' ? pxFor(0) : pxFor(breakX);
      const sx1 = sl.side === 'right' ? pxFor(breakX) : pxFor(Wmm);
      content += `<line x1="${sx0}" y1="${y0-12}" x2="${sx1}" y2="${y0-12}" stroke="${dark}" stroke-width=".8" opacity=".7"/>`;
      content += `<text x="${(sx0+sx1)/2}" y="${y0-16}" font-family="JetBrains Mono" font-size="7.5" fill="#6a6a62" text-anchor="middle">prosty sufit ${flat} mm (wnęka)</text>`;
    }
  } else {
    content += `<rect x="${x0}" y="${y0}" width="${W}" height="${H}" fill="${fill}" stroke="${dark}" stroke-width="1.2"/>`;
  }

  const totalW = STATE.sections.reduce((a,s)=>a+s.w,0)||1;
  let cx = x0 + 18*scale;   // pierwsza szafka po lewym boku
  const band = STATE.band;
  const bandPx = band ? band.h*scale : 0;

  // sliding doors overlay handled after sections
  STATE.sections.forEach((s,si)=>{
    const sw = s.w * scale;
    // przesunięcie sekcji jeśli obejmuje ją pas poziomy
    const spanned = bandSpans(si);
    let secY = y0, secH = H;
    // skos — sekcja przycięta do sufitu (najniższy punkt sekcji)
    if(sl && sl.on){
      const secCabH = sectionCabinetH(si);
      secH = (secCabH / h) * H;
      secY = y0 + (H - secH);
    }
    if(spanned && band){
      if(band.position==='top'){ secY = secY + bandPx; secH = secH - bandPx; }
      else { secH = secH - bandPx; }
    }
    // uskok — nie zmienia wysokości sekcji (redukuje głębokość formatek)
    // sekcja podniesiona nad podłogą
    if(s.lift){
      const liftPx = (s.lift / h) * H;
      secH -= liftPx;
    }
    if(STATE.previewView==='open'){
      drawInterior(s,cx,secY,sw,secH,matC,dark,content=>'');
      content += drawInteriorContent(s,cx,secY,sw,secH,matC,dark);
    } else {
      // front view
      const hasFront = STATE.frontMode==='sliding' ? false : STATE.sectionFronts[si];
      const __zones = hasFront ? frontZones(si) : [];
      if(hasFront && (__zones.length > 1 || __zones.some(z=>z.open))){
        content += drawInteriorContent(s,cx,secY,sw,secH,matC,dark);
        const cid = 'fz'+si;
        const rects = frontLeaves(si).map(lf=>`<rect x="${cx}" y="${secY + lf.f0*secH + (lf.f0>0?1:0)}" width="${sw}" height="${(lf.f1-lf.f0)*secH - (lf.f0>0?1:0) - (lf.f1<1?1:0)}"/>`).join('');
        content += `<defs><clipPath id="${cid}">${rects}</clipPath></defs><g clip-path="url(#${cid})">${drawFront(s,cx,secY,sw,secH,matF,darkF,si)}</g>`;
        frontLeaves(si).forEach(lf=>{
          content += `<rect x="${cx+2}" y="${secY + lf.f0*secH + 1}" width="${sw-4}" height="${(lf.f1-lf.f0)*secH - 2}" fill="none" stroke="${darkF}" stroke-width=".7"/>`;
        });
      } else if(hasFront){
        content += drawFront(s,cx,secY,sw,secH,matF,darkF,si);
      } else {
        content += drawInteriorContent(s,cx,secY,sw,secH,matC,dark);
      }
    }
    if(si<STATE.sections.length-1){
      // podwójna płyta między szafkami (bok prawy + bok lewy sąsiada)
      const gapPx = Math.max(1.6, SEC_STRIDE * scale);
      content += `<rect x="${cx+sw}" y="${secY}" width="${gapPx}" height="${secH}" fill="${shade(fill,-0.06)}" stroke="${dark}" stroke-width=".8"/>`;
      content += `<line x1="${cx+sw+gapPx/2}" y1="${secY}" x2="${cx+sw+gapPx/2}" y2="${secY+secH}" stroke="${dark}" stroke-width=".6" opacity=".8"/>`;
    }
    content += `<text x="${cx+sw/2}" y="${y0+H+16}" font-family="JetBrains Mono" font-size="9" fill="#6a6a62" text-anchor="middle">${Math.round(s.w)}mm</text>`;
    // wolna przestrzeń pod podniesioną sekcją
    if(s.lift){
      const liftPx = (s.lift / h) * H;
      const vy = secY + secH;
      content += `<rect x="${cx+1}" y="${vy}" width="${sw-2}" height="${liftPx}" fill="#ede7d6" stroke="${dark}" stroke-width=".7" stroke-dasharray="4 3"/>`;
      if(liftPx > 18 && sw > 50){
        content += `<text x="${cx+sw/2}" y="${vy+liftPx/2+3}" font-family="JetBrains Mono" font-size="7.5" fill="#6a6a62" text-anchor="middle">wolne ${s.lift} mm</text>`;
      }
    }
    // podział szafki na dół + nadstawkę (podwójny wieniec)
    const __plan = sectionSplitPlan(si);
    const partsH = __plan.parts;
    if(__plan.joints.some(j=>j.afterIdx>=0)){
      interiorLayout(s, si, secH-4).joints.forEach(j=>{
        const yj = secY + 2 + j.y;
        content += `<rect x="${cx}" y="${yj}" width="${sw}" height="${j.h}" fill="${shade(fill,-0.06)}" stroke="${dark}" stroke-width=".8"/>`;
        content += `<line x1="${cx}" y1="${yj + j.h/2}" x2="${cx+sw}" y2="${yj + j.h/2}" stroke="${dark}" stroke-width=".6"/>`;
      });
    } else if(partsH.length > 1){
      let cum = 0;
      for(let p=0;p<partsH.length-1;p++){
        cum += partsH[p];
        const ys = y0 + H - cum*scale;
        content += `<rect x="${cx}" y="${ys - 18*scale}" width="${sw}" height="${36*scale}" fill="${shade(fill,-0.06)}" stroke="${dark}" stroke-width=".8"/>`;
        content += `<line x1="${cx}" y1="${ys}" x2="${cx+sw}" y2="${ys}" stroke="${dark}" stroke-width=".6"/>`;
      }
    }
    cx += sw + SEC_STRIDE*scale;
  });

  // ── Przelotowa półka (band) — rysowana ponad sekcjami ──
  if(band && STATE.frontMode!=='sliding'){
    // oblicz X-zakres obejmowanych sekcji
    let accW = 0;
    for(let i=0;i<band.from;i++) accW += (STATE.sections[i].w + SEC_STRIDE)*scale;
    const bx0 = x0 + 18*scale + accW;
    let bw = 0;
    for(let i=band.from;i<=band.to;i++) bw += STATE.sections[i].w*scale + (i<band.to ? SEC_STRIDE*scale : 0);
    const by = band.position==='top' ? y0 : y0 + H - bandPx;
    // tło pasa (lekko cieplejsze) + ramka
    content += `<rect x="${bx0}" y="${by}" width="${bw}" height="${bandPx}" fill="${shade(fill,0.03)}" stroke="${dark}" stroke-width="1"/>`;
    // linia półki dzieląca pas od sekcji
    const shelfY = band.position==='top' ? by+bandPx : by;
    content += `<line x1="${bx0}" y1="${shelfY}" x2="${bx0+bw}" y2="${shelfY}" stroke="${detail}" stroke-width="2"/>`;
    // delikatna pozioma linia w środku pasa (sugestia przestrzeni)
    content += `<line x1="${bx0+6}" y1="${by+bandPx/2}" x2="${bx0+bw-6}" y2="${by+bandPx/2}" stroke="${shade(detail,0.5)}" stroke-width=".5" stroke-dasharray="4 4" opacity=".5"/>`;
    // etykieta
    content += `<text x="${bx0+bw/2}" y="${by+bandPx/2+3}" font-family="JetBrains Mono" font-size="8.5" fill="#6a6a62" text-anchor="middle">PÓŁKA PRZELOTOWA · ${band.h} mm</text>`;
  }

  // ── Uskok (komin / rura) — rysowany jako przeszkoda ──
  if(STATE.notch && STATE.notch.on){
    const n = STATE.notch;
    const nw = Math.min(W, (n.w / w) * W);
    const nh = Math.min(H, (n.h / h) * H);
    const nx = n.side === 'left' ? x0 : x0 + W - nw;
    const ny = n.from === 'top' ? y0 : y0 + H - nh;
    content += `<defs><pattern id="notchHatch" width="7" height="7" patternTransform="rotate(45)" patternUnits="userSpaceOnUse"><line x1="0" y1="0" x2="0" y2="7" stroke="${dark}" stroke-width="1.1" opacity=".5"/></pattern></defs>`;
    content += `<rect x="${nx}" y="${ny}" width="${nw}" height="${nh}" fill="none"/>`;
    content += `<rect x="${nx}" y="${ny}" width="${nw}" height="${nh}" fill="url(#notchHatch)" stroke="${dark}" stroke-width="1" stroke-dasharray="5 3" opacity=".75"/>`;
    if(nw > 44 && nh > 26){
      content += `<text x="${nx+nw/2}" y="${ny+nh/2-3}" font-family="JetBrains Mono" font-size="8" fill="#6a6a62" text-anchor="middle">USKOK</text>`;
      content += `<text x="${nx+nw/2}" y="${ny+nh/2+8}" font-family="JetBrains Mono" font-size="7" fill="#6a6a62" text-anchor="middle">głęb. −${n.d||150} mm</text>`;
    }
  }

  // Base / legs overlay — visible plinth or legs at the bottom region of the cabinet
  const baseMm = baseOffset();
  const baseHpx = baseMm * scale;
  if(STATE.base==='cokol' && baseHpx>1.5){
    // recessed plinth — inset 20mm from sides, darker
    const inset = Math.max(2, 20*scale);
    const bx = x0 + inset;
    const bw = W - inset*2;
    const by = y0 + H - baseHpx;
    content += `<rect x="${bx}" y="${by+0.5}" width="${bw}" height="${baseHpx-1}" fill="${shade(fill,-0.45)}" stroke="${dark}" stroke-width=".5"/>`;
    // top shadow line where cabinet sits
    content += `<line x1="${x0}" y1="${by}" x2="${x0+W}" y2="${by}" stroke="${dark}" stroke-width=".7"/>`;
  }
  else if(STATE.base==='nozki' && baseHpx>1.5 && typeof LEGS!=='undefined'){
    const leg = LEGS.find(l=>l.id===STATE.leg) || LEGS[0];
    const colorId = (leg.colors && leg.colors.includes(STATE.legColor)) ? STATE.legColor : (leg.colors && leg.colors[0]);
    const lc = (typeof LEG_COLORS!=='undefined' && LEG_COLORS[colorId]) || {swatch:'#a9a8a3', stroke:'#5a5a55'};
    const by0 = y0 + H - baseHpx;
    const by1 = y0 + H;
    // erase plinth-area look — cover with bg
    content += `<rect x="${x0}" y="${by0+0.5}" width="${W}" height="${baseHpx-1}" fill="#ede7d6"/>`;
    content += `<line x1="${x0}" y1="${by0}" x2="${x0+W}" y2="${by0}" stroke="${dark}" stroke-width=".7"/>`;
    // legs — count: 2 if w<=1200, 3 if 1200-1800, 4+ if wider (8mm rule, but cap visual)
    const nLegs = w<=1200 ? 2 : (w<=1800 ? 3 : 4);
    // leg metrics in mm → px
    const legWmm = (leg.id==='gtv-dak27'?40 : leg.id==='gtv-dap77'?40 : leg.id==='atm-dn701'?28 : 30);
    const legW = Math.max(3, legWmm*scale);
    for(let i=0;i<nLegs;i++){
      const t = nLegs===1 ? 0.5 : i/(nLegs-1);
      // inset legs from edges (≈80mm from each side)
      const inset = Math.min(W*0.12, 80*scale);
      const lx = x0 + inset + t*(W - inset*2);
      content += drawLegShape(leg.id, lx, by0, by1, legW, lc);
    }
    // floor line
    content += `<line x1="${x0-10}" y1="${by1}" x2="${x0+W+10}" y2="${by1}" stroke="${dark}" stroke-width="1"/>`;
  }
  else if(STATE.base==='podloga'){
    // just a thicker floor line
    content += `<line x1="${x0-10}" y1="${y0+H}" x2="${x0+W+10}" y2="${y0+H}" stroke="${dark}" stroke-width="1.4"/>`;
  }
  else if(STATE.base==='wiszacy'){
    // floating — gap below cabinet + floor line lower down
    const gap = Math.min(40, H*0.06);
    content += `<line x1="${x0-10}" y1="${y0+H+gap}" x2="${x0+W+10}" y2="${y0+H+gap}" stroke="${dark}" stroke-width="1.2" stroke-dasharray="6 4" opacity=".6"/>`;
    // shadow under cabinet
    content += `<ellipse cx="${x0+W/2}" cy="${y0+H+gap-2}" rx="${W*0.42}" ry="3" fill="rgba(0,0,0,0.12)"/>`;
  }

  // sliding doors — front view only
  if(STATE.previewView==='front' && STATE.frontMode==='sliding'){
    const panels = Math.min(4, Math.max(2, STATE.sections.length));
    const pw = W/panels;
    const hwCol = (SLIDING_COLORS.find(c=>c.id===STATE.slidingProfileColor)||SLIDING_COLORS[0]);
    const hwFill = hwCol.sample, hwEdge = hwCol.edge;
    const profDef = SLIDING_PROFILES.find(p=>p.id===STATE.slidingProfile) || SLIDING_PROFILES[0];
    const trackTop = `<rect x="${x0-2}" y="${y0-6}" width="${W+4}" height="6" fill="${hwEdge}"/>`;
    const trackBot = `<rect x="${x0-2}" y="${y0+H}" width="${W+4}" height="4" fill="${hwEdge}"/>`;
    let doors = '';
    const prof = STATE.slidingProfile;
    // rim width per system: novo 1mm, caro/nero/ergo/loca ~3mm, dzielony 3mm, bezramowy 0.5
    const rimW = prof==='novo' ? 1.5 : prof==='bezramowy' ? 0.6 : 3;
    // mirror gradient defs added once
    const fillFor = (fid) => {
      if(fid==='lustro') return `url(#mirrorG)`;
      if(fid==='szklo')  return `url(#glassG)`;
      return fillF;
    };
    for(let i=0;i<panels;i++){
      const dx = x0 + i*pw + 2;
      const dy = y0 + 3;
      const dh = H - 6;
      doors += `<rect x="${dx}" y="${dy}" width="${pw-4}" height="${dh}" fill="${hwFill}" stroke="${hwEdge}" stroke-width=".6"/>`;
      if(profDef.divisible){
        const sp = STATE.slidingSplits || {count:2, fills:['plyta','plyta']};
        const innerH = dh - rimW*2;
        const innerY0 = dy + rimW;
        const stripeH = innerH / sp.count;
        for(let k=0;k<sp.count;k++){
          const fid = sp.fills[k] || 'plyta';
          const sy = innerY0 + k*stripeH;
          doors += `<rect x="${dx+rimW}" y="${sy}" width="${pw-4-rimW*2}" height="${stripeH}" fill="${fillFor(fid)}" stroke="${darkF}" stroke-width=".4"/>`;
          // divider rail
          if(k<sp.count-1){
            doors += `<rect x="${dx+rimW}" y="${sy+stripeH-rimW/2}" width="${pw-4-rimW*2}" height="${rimW}" fill="${hwFill}"/>`;
          }
        }
      } else {
        const fid = profDef.fillable ? STATE.slidingFill : 'plyta';
        doors += `<rect x="${dx+rimW}" y="${dy+rimW}" width="${pw-4-rimW*2}" height="${dh-rimW*2}" fill="${fillFor(fid)}" stroke="${darkF}" stroke-width=".5"/>`;
      }
      // uchwyt podgląd — różny dla każdego systemu
      if(prof==='caro' || prof==='nero'){
        // pionowy uchwyt na krawędzi (prawy dla CARO, lewy dla NERO)
        const hx = prof==='caro' ? dx+pw-4-rimW-2 : dx+rimW+0;
        doors += `<rect x="${hx}" y="${dy+rimW}" width="2" height="${dh-rimW*2}" fill="${shade(hwEdge,-0.25)}"/>`;
      } else if(prof==='ergo' || prof==='loca'){
        const ux = dx + (pw-4)/2 - 2;
        const uy = dy + dh*0.4;
        if(prof==='ergo'){
          doors += `<rect x="${ux}" y="${uy}" width="4" height="${dh*0.2}" fill="${shade(hwEdge,-0.3)}"/>`;
        } else {
          doors += `<circle cx="${ux+2}" cy="${uy+dh*0.1}" r="3.5" fill="${shade(hwEdge,-0.3)}"/>`;
        }
      }
    }
    content += trackTop + doors + trackBot;
  }

  // ── Blendy maskujące ──
  {
    const blFill = shade(fill,-0.08), blEdge = dark;
    const floorY = ny0 + NH;
    const yN = (hmm) => floorY - hmm*scale;
    const xN = (xmm) => nx0 + xmm*scale;
    const sideBl = (side, bwMm)=>{
      const [ha, hb] = sideBlendaH(side);
      const xa = side==='left' ? 0 : STATE.dim.w - bwMm;
      const xb = side==='left' ? bwMm : STATE.dim.w;
      content += `<polygon points="${xN(xa)},${floorY} ${xN(xa)},${yN(ha)} ${xN(xb)},${yN(hb)} ${xN(xb)},${floorY}" fill="${blFill}" stroke="${blEdge}" stroke-width=".8"/>`;
      const cx = (xN(xa)+xN(xb))/2, cy = (floorY + yN(Math.min(ha,hb)))/2;
      const lbl = Math.abs(ha-hb)>1 ? `${bwMm} · ${Math.max(ha,hb)}` : `${bwMm} · ${ha}`;
      content += `<text x="${cx}" y="${cy}" font-family="JetBrains Mono" font-size="7.5" fill="#6a6a62" text-anchor="middle" transform="rotate(-90 ${cx} ${cy})">${lbl}</text>`;
    };
    if(bl.left)  sideBl('left',  bl.left);
    if(bl.right) sideBl('right', bl.right);
    if(bl.top){
      // górna blenda podąża za sufitem wnęki (także przy skosie)
      const Wn = STATE.dim.w, s = STATE.slope;
      const xs = [0, Wn];
      if(s && s.on){
        const flat = Math.max(0, Math.min(s.flat||0, Wn));
        xs.push(s.side==='right' ? flat : Wn - flat);
      }
      const pts = [...new Set(xs)].filter(v=>v>=0&&v<=Wn).sort((a,b)=>a-b);
      const topEdge = pts.map(x=>`${xN(x)},${yN(nicheCeilAt(x))}`);
      const botEdge = pts.slice().reverse().map(x=>`${xN(x)},${yN(nicheCeilAt(x) - bl.top)}`);
      content += `<polygon points="${topEdge.concat(botEdge).join(' ')}" fill="${blFill}" stroke="${blEdge}" stroke-width=".8"/>`;
      const mid = pts[0] + (pts[pts.length-1]-pts[0])/2;
      content += `<text x="${xN(mid)}" y="${yN(nicheCeilAt(mid) - bl.top/2)+3}" font-family="JetBrains Mono" font-size="7.5" fill="#6a6a62" text-anchor="middle">BLENDA ${bl.top} mm</text>`;
    }
    // obrys wnęki (kreskowany) gdy są blendy
    if(bl.left||bl.right||bl.top){
      content += `<rect x="${nx0}" y="${ny0}" width="${NW}" height="${NH}" fill="none" stroke="${dark}" stroke-width=".7" stroke-dasharray="5 4" opacity=".55"/>`;
    }
  }

  svg.innerHTML = `<defs>
    <linearGradient id="mirrorG" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#e6ecef"/><stop offset=".5" stop-color="#c9d1d6"/><stop offset="1" stop-color="#aeb6bc"/>
    </linearGradient>
    <linearGradient id="glassG" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#dde4e7" stop-opacity=".75"/><stop offset=".5" stop-color="#e8edef" stop-opacity=".6"/><stop offset="1" stop-color="#cdd5d9" stop-opacity=".75"/>
    </linearGradient>
  </defs>${content}`;

  const pfd = document.getElementById('pfDim');
  if(pfd) pfd.textContent = (bl.left||bl.right||bl.top)
    ? `${w} × ${h} × ${d} (korpus)`
    : `${w} × ${h} × ${d}`;
  const n = STATE.sections.length;
  const pl = n===1?'sekcja':(n<5?'sekcje':'sekcji');
  document.getElementById('pfSections').textContent = `${n} ${pl}`;
  document.getElementById('pfBoard').textContent = `~${computeBoardArea()} m²`;
  document.getElementById('phType').textContent = STATE.typeName;
}
function drawFront(s,x,y,sw,sh,mat,dark,si){
  const fill = mat.color || '#cdc6b4';
  let out = `<rect x="${x+2}" y="${y+2}" width="${sw-4}" height="${sh-4}" fill="${shade(mat.color,-0.02)}" stroke="${dark}" stroke-width=".6"/>`;
  // derive drawer count from items
  let drawerCount = 0, drawerH = 0, rodY=null, hasShelves=false, shelfYs=[];
  let acc = 0;
  const totalH = s.items.reduce((a,it)=>a+(Number(it.h)||0),0) || 1;
  const H = sh-4;
  // interior proportional layout used to know WHERE drawer fronts should go
  const interiorItems = [];
  s.items.forEach(it=>{
    const hpx = (Number(it.h)||0)/totalH * H;
    interiorItems.push({type:it.type, opts:it.opts||{}, y0:y+2+acc, y1:y+2+acc+hpx});
    acc += hpx;
  });
  // Draw drawers fronts (one front per szuflada item × count)
  interiorItems.forEach(it=>{
    if(it.type==='szuflady'){
      // legacy block-of-drawers (kept for backward-compat with old saves)
      const n = (it.opts && it.opts.count) || 4;
      const dh = (it.y1-it.y0)/n;
      for(let i=0;i<n;i++){
        out += `<rect x="${x+4}" y="${it.y0+dh*i+1}" width="${sw-8}" height="${dh-2}" fill="${fill}" stroke="${dark}" stroke-width=".5"/>`;
        if(STATE.handle==='relingowe'){
          out += `<rect x="${x+sw/2-10}" y="${it.y0+dh*i+dh/2-1}" width="20" height="2" fill="${dark}"/>`;
        }
      }
    } else if(it.type==='szuflada'){
      if(it.opts && it.opts.skipFront) { /* never */ }
      if(it.internal){
        // internal drawer — no own front, just a faint horizontal line
        out += `<line x1="${x+8}" y1="${(it.y0+it.y1)/2}" x2="${x+sw-8}" y2="${(it.y0+it.y1)/2}" stroke="${dark}" stroke-width=".3" opacity=".25" stroke-dasharray="3 3"/>`;
      } else {
        // single drawer with its own front + diagonal X to indicate drawer
        const dy0 = it.y0+1, dy1 = it.y1-1, dx0 = x+4, dx1 = x+sw-4;
        out += `<rect x="${dx0}" y="${dy0}" width="${sw-8}" height="${dy1-dy0}" fill="${fill}" stroke="${dark}" stroke-width=".5"/>`;
        out += `<line x1="${dx0}" y1="${dy0}" x2="${dx1}" y2="${dy1}" stroke="${dark}" stroke-width=".4" opacity=".55"/>`;
        out += `<line x1="${dx1}" y1="${dy0}" x2="${dx0}" y2="${dy1}" stroke="${dark}" stroke-width=".4" opacity=".55"/>`;
        if(STATE.handle==='relingowe'){
          out += `<rect x="${x+sw/2-10}" y="${(it.y0+it.y1)/2-1}" width="20" height="2" fill="${dark}"/>`;
        }
      }
    }
  });
  if(sw>240){
    out += `<line x1="${x+sw/2}" y1="${y+4}" x2="${x+sw/2}" y2="${y+sh-4}" stroke="${dark}" stroke-width=".6"/>`;
  }
  // Handles on doors (not on drawer areas)
  if(STATE.handle==='relingowe'){
    // one pair mid-height (skip if drawers dominate)
    const hasBigDrawer = interiorItems.some(i=>i.type==='szuflady' && (i.y1-i.y0) > sh*0.5);
    if(!hasBigDrawer){
      out += `<rect x="${x+sw*0.15}" y="${y+sh*0.4}" width="${sw*0.25}" height="3" fill="${dark}"/>`;
      out += `<rect x="${x+sw*0.6}" y="${y+sh*0.4}" width="${sw*0.25}" height="3" fill="${dark}"/>`;
    }
  }
  return out;
}
function drawInteriorContent(s,x,y,sw,sh,mat,dark){
  // override `dark` for interior strokes — guarantee contrast on light decors
  dark = '#3a342a';
  let out = `<rect x="${x+2}" y="${y+2}" width="${sw-4}" height="${sh-4}" fill="${shade(mat.color,0.02)}" stroke="${dark}" stroke-width=".6"/>`;
  const totalH = s.items.reduce((a,it)=>a+(Number(it.h)||0),0) || 1;
  const H = sh-4;
  let acc = 0;
  const __si = STATE.sections.indexOf(s);
  const __L = interiorLayout(s, __si, H);
  s.items.forEach((it,__idx)=>{
    const hpx = (Number(it.h)||0) * __L.k;
    const y0 = y+2+acc, y1 = y0+hpx;
    const __rep = __L.joints.some(j=>j.afterIdx===__idx && j.replaces);
    if(it.type==='polka'){
      // półka (linia u dołu pola) — pomijana, gdy w tym miejscu jest styk dół/nadstawka
      if(!__rep) out += `<line x1="${x+4}" y1="${y1}" x2="${x+sw-4}" y2="${y1}" stroke="${dark}" stroke-width=".9"/>`;
      // wariant z pionową przegródką — pionowa kreska na środku pola tej półki
      if(it.variant==='przegroda'){
        out += `<line x1="${x+sw/2}" y1="${y0}" x2="${x+sw/2}" y2="${y1}" stroke="${dark}" stroke-width=".9"/>`;
      }
    } else if(it.type==='drazek'){
      // strefa wieszania: od półki nad drążkiem do półki pod nim; ubrania na wieszakach
      const __rs = rodShelves(s, __idx);
      if(__rs.above) out += `<line x1="${x+4}" y1="${y0}" x2="${x+sw-4}" y2="${y0}" stroke="${dark}" stroke-width=".9"/>`;
      if(__rs.below && !__rep) out += `<line x1="${x+4}" y1="${y1}" x2="${x+sw-4}" y2="${y1}" stroke="${dark}" stroke-width=".9"/>`;
      const ry = y0 + Math.max(4, 100 * __L.k);   // drążek 100 mm pod półką nad nim
      out += `<line x1="${x+5}" y1="${ry}" x2="${x+sw-5}" y2="${ry}" stroke="${dark}" stroke-width="2.2" stroke-linecap="round"/>`;
      out += `<rect x="${x+4}" y="${ry-3}" width="3" height="6" fill="${dark}"/><rect x="${x+sw-7}" y="${ry-3}" width="3" height="6" fill="${dark}"/>`;
      const gn = Math.max(2, Math.min(9, Math.floor((sw-16)/14)));
      const gs = (sw-24)/gn;
      for(let i=0;i<gn;i++){
        const gx = x + 12 + gs*i + gs/2;
        const len = hpx * (i%3===1 ? 0.62 : (i%3===2 ? 0.8 : 0.7));
        const gb = Math.min(y1 - 3, ry + len);
        out += `<path d="M${gx} ${ry} q0 -3 2 -3" fill="none" stroke="${dark}" stroke-width=".6"/>`;
        out += `<path d="M${gx-gs*0.4} ${ry+8} L${gx} ${ry+1} L${gx+gs*0.4} ${ry+8} L${gx+gs*0.36} ${gb} L${gx-gs*0.36} ${gb} Z" fill="${shade(mat.color,-0.08)}" stroke="${dark}" stroke-width=".5" opacity=".85"/>`;
      }
    } else if(it.type==='szuflady'){
      // legacy
      const n = (it.opts && it.opts.count) || 4;
      const dh = hpx/n;
      for(let i=0;i<n;i++){
        out += `<rect x="${x+6}" y="${y0+dh*i+2}" width="${sw-12}" height="${dh-4}" fill="none" stroke="${dark}" stroke-width=".5"/>`;
      }
      out += `<line x1="${x+4}" y1="${y1}" x2="${x+sw-4}" y2="${y1}" stroke="${dark}" stroke-width=".9"/>`;
    } else if(it.type==='szuflada'){
      // box outline (decor side, faint)
      out += `<rect x="${x+6}" y="${y0+2}" width="${sw-12}" height="${hpx-4}" fill="none" stroke="${dark}" stroke-width=".5"/>`;
      // metal drawer-box sides (modernbox/axispro/puro) — render thin colored side panels when frameColor set
      if(it.frameColor && typeof FRAME_COLORS!=='undefined' && FRAME_COLORS[it.frameColor]){
        const fc = FRAME_COLORS[it.frameColor];
        const bx0 = x+6, bx1 = x+sw-6, by0 = y0+2, by1 = y0+hpx-2;
        // left + right metal side panels
        out += `<rect x="${bx0}" y="${by0}" width="2.2" height="${by1-by0}" fill="${fc.swatch}" stroke="${fc.stroke}" stroke-width=".3"/>`;
        out += `<rect x="${bx1-2.2}" y="${by0}" width="2.2" height="${by1-by0}" fill="${fc.swatch}" stroke="${fc.stroke}" stroke-width=".3"/>`;
        // back lip
        out += `<line x1="${bx0+2.2}" y1="${by1-1.2}" x2="${bx1-2.2}" y2="${by1-1.2}" stroke="${fc.stroke}" stroke-width=".55" opacity=".75"/>`;
        // top edge highlight
        out += `<line x1="${bx0}" y1="${by0+.3}" x2="${bx0+2.2}" y2="${by0+.3}" stroke="${fc.highlight}" stroke-width=".4" opacity=".7"/>`;
        out += `<line x1="${bx1-2.2}" y1="${by0+.3}" x2="${bx1}" y2="${by0+.3}" stroke="${fc.highlight}" stroke-width=".4" opacity=".7"/>`;
      }
      out += `<line x1="${x+4}" y1="${y1}" x2="${x+sw-4}" y2="${y1}" stroke="${dark}" stroke-width=".9"/>`;
    } else if(it.type==='pantograf'){
      // pantograph hanger visual
      out += `<line x1="${x+10}" y1="${y0+8}" x2="${x+sw-10}" y2="${y0+8}" stroke="${dark}" stroke-width="1.5"/>`;
      out += `<path d="M${x+15} ${y0+8} L${x+10} ${y0+hpx*0.5} M${x+sw-15} ${y0+8} L${x+sw-10} ${y0+hpx*0.5} M${x+15} ${y0+8} L${x+sw-10} ${y0+hpx*0.5} M${x+sw-15} ${y0+8} L${x+10} ${y0+hpx*0.5}" stroke="${dark}" stroke-width=".7" fill="none"/>`;
      out += `<line x1="${x+10}" y1="${y0+hpx*0.5}" x2="${x+sw-10}" y2="${y0+hpx*0.5}" stroke="${dark}" stroke-width="1.5"/>`;
      out += `<line x1="${x+4}" y1="${y1}" x2="${x+sw-4}" y2="${y1}" stroke="${dark}" stroke-width=".9"/>`;
    } else if(it.type==='kosz'){
      out += drawBasket(it, x, y0, y1, sw, hpx, dark);
    } else if(it.type==='siedzisko'){
      // płyta siedziska — pogrubiona, wzmocniona
      const th = Math.max(3, Math.min(7, hpx));
      out += `<rect x="${x+3}" y="${y1-th}" width="${sw-6}" height="${th}" fill="${shade(dark,0.5)}" stroke="${dark}" stroke-width="1" rx="1"/>`;
      if(sw > 70) out += `<text x="${x+sw/2}" y="${y1-th-3}" font-family="JetBrains Mono" font-size="6.5" fill="${dark}" text-anchor="middle" opacity=".75">SIEDZISKO 450</text>`;
    } else if(it.type==='pralka'){
      // wnęka na pralkę — obrys + bęben
      out += `<rect x="${x+4}" y="${y0+3}" width="${sw-8}" height="${hpx-6}" fill="none" stroke="${dark}" stroke-width="1.1" stroke-dasharray="6 3" rx="2"/>`;
      const cx2 = x+sw/2, cy2 = y0+hpx*0.56;
      const r = Math.min(sw*0.26, hpx*0.3);
      if(r > 6){
        out += `<circle cx="${cx2}" cy="${cy2}" r="${r}" fill="none" stroke="${dark}" stroke-width="1"/>`;
        out += `<circle cx="${cx2}" cy="${cy2}" r="${r*0.62}" fill="none" stroke="${dark}" stroke-width=".6" opacity=".6"/>`;
        out += `<circle cx="${x+sw*0.22}" cy="${y0+hpx*0.16}" r="1.6" fill="${dark}" opacity=".7"/>`;
        out += `<circle cx="${x+sw*0.32}" cy="${y0+hpx*0.16}" r="1.6" fill="${dark}" opacity=".7"/>`;
      }
      if(hpx>34) out += `<text x="${cx2}" y="${y1-6}" font-family="JetBrains Mono" font-size="7" fill="${dark}" text-anchor="middle" opacity=".75">PRALKA</text>`;
    } else if(it.type==='otwarta'){
      // nothing — just the bottom line
      if(hpx>20) out += `<line x1="${x+4}" y1="${y1}" x2="${x+sw-4}" y2="${y1}" stroke="${dark}" stroke-width=".6" opacity=".5" stroke-dasharray="2 2"/>`;
    }
    acc += hpx;
    const __j = __L.joints.find(j=>j.afterIdx===__idx);
    if(__j) acc += __j.h;
  });
  return out;
}
function drawInterior(){return '';}

// ── Basket / cargo variants — realistic-ish renders per variant
function frameColorOf(it, fallback){
  const fc = it.frameColor || fallback || 'chrom';
  return (typeof FRAME_COLORS!=='undefined' && FRAME_COLORS[fc]) || FRAME_COLORS.chrom;
}
// ── Leg silhouette for the cabinet base — per LEG model
function drawLegShape(legId, cx, by0, by1, w, lc){
  const h = by1 - by0;
  const fill = lc.swatch, strk = lc.stroke;
  const x0 = cx - w/2, x1 = cx + w/2;
  let s = '';
  if(legId==='gtv-dak27'){
    // Square profile — rectangular shaft, foot pad
    s += `<rect x="${x0}" y="${by0+0.5}" width="${w}" height="${h-1.5}" fill="${fill}" stroke="${strk}" stroke-width=".5"/>`;
    s += `<rect x="${x0-1}" y="${by1-1.5}" width="${w+2}" height="1.5" fill="${strk}"/>`;
    // edge highlight
    s += `<line x1="${x0+0.5}" y1="${by0+1}" x2="${x0+0.5}" y2="${by1-2}" stroke="${shade(fill,0.25)}" stroke-width=".4" opacity=".7"/>`;
  } else if(legId==='gtv-dap77'){
    // Cylindrical — ellipse top + tapered cylinder body + foot
    s += `<ellipse cx="${cx}" cy="${by0+0.8}" rx="${w/2}" ry="1.2" fill="${shade(fill,0.1)}" stroke="${strk}" stroke-width=".4"/>`;
    s += `<rect x="${x0}" y="${by0+0.8}" width="${w}" height="${h-3}" fill="${fill}" stroke="${strk}" stroke-width=".4"/>`;
    s += `<ellipse cx="${cx}" cy="${by1-2}" rx="${w/2}" ry="1.2" fill="${shade(fill,-0.15)}" stroke="${strk}" stroke-width=".4"/>`;
    s += `<rect x="${x0-1.5}" y="${by1-1.5}" width="${w+3}" height="1.5" fill="${strk}"/>`;
    // centerline highlight
    s += `<line x1="${cx-w/4}" y1="${by0+2}" x2="${cx-w/4}" y2="${by1-3}" stroke="${shade(fill,0.3)}" stroke-width=".5" opacity=".7"/>`;
  } else if(legId==='atm-dn701'){
    // Slim tapered — trapezoid narrowing slightly
    const taper = w*0.18;
    s += `<path d="M${x0} ${by0+0.5} L${x1} ${by0+0.5} L${x1-taper} ${by1-1.5} L${x0+taper} ${by1-1.5} Z" fill="${fill}" stroke="${strk}" stroke-width=".5"/>`;
    s += `<rect x="${x0+taper-1}" y="${by1-1.5}" width="${w-taper*2+2}" height="1.5" fill="${strk}"/>`;
    s += `<line x1="${x0+1}" y1="${by0+1.5}" x2="${x0+taper+1}" y2="${by1-2.5}" stroke="${shade(fill,0.25)}" stroke-width=".4" opacity=".7"/>`;
  } else { // dn-709 — classic tapered with rounded foot
    const taper = w*0.22;
    s += `<path d="M${x0} ${by0+0.5} L${x1} ${by0+0.5} L${x1-taper} ${by1-3} L${x0+taper} ${by1-3} Z" fill="${fill}" stroke="${strk}" stroke-width=".5"/>`;
    s += `<ellipse cx="${cx}" cy="${by1-2}" rx="${w/2}" ry="2" fill="${shade(fill,-0.15)}" stroke="${strk}" stroke-width=".5"/>`;
    s += `<rect x="${x0-1}" y="${by1-1}" width="${w+2}" height="1" fill="${strk}"/>`;
    s += `<line x1="${x0+1}" y1="${by0+1.5}" x2="${x0+taper+1}" y2="${by1-4}" stroke="${shade(fill,0.25)}" stroke-width=".4" opacity=".7"/>`;
  }
  return s;
}
function drawBasket(it, x, y0, y1, sw, hpx, darkCorpus){
  const variant = it.variant || 'druciany-ikea';
  const fc = frameColorOf(it, 'chrom');
  const strk = fc.stroke;
  const fill = fc.swatch;
  const hi   = fc.highlight;
  // inner working area
  const ix = x+6, iw = sw-12;
  const iy = y0+3, ih = hpx-6;
  const ix2 = ix+iw, iy2 = iy+ih;
  let s = '';
  // bottom shelf line (consistent across variants)
  const bottomLine = `<line x1="${x+4}" y1="${y1}" x2="${x+sw-4}" y2="${y1}" stroke="${darkCorpus}" stroke-width=".9"/>`;

  if(variant==='druciany-ikea'){
    // Wire basket: frame + verticals + 2 horizontal hoops + small ear handles
    s += `<rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" fill="none" stroke="${strk}" stroke-width="1.1" rx="1.5"/>`;
    // verticals
    const n = Math.max(6, Math.floor(iw/7));
    for(let i=1;i<n;i++){
      const xi = ix + (iw*i/n);
      s += `<line x1="${xi}" y1="${iy+1.5}" x2="${xi}" y2="${iy2-1.5}" stroke="${strk}" stroke-width=".45" opacity=".75"/>`;
    }
    // horizontal hoops
    s += `<line x1="${ix+1}" y1="${iy+ih*0.35}" x2="${ix2-1}" y2="${iy+ih*0.35}" stroke="${strk}" stroke-width=".55"/>`;
    s += `<line x1="${ix+1}" y1="${iy+ih*0.72}" x2="${ix2-1}" y2="${iy+ih*0.72}" stroke="${strk}" stroke-width=".55"/>`;
    // ear handles
    s += `<path d="M${ix+iw*0.18} ${iy+1} q ${iw*0.08} -3 ${iw*0.16} 0" fill="none" stroke="${strk}" stroke-width=".9"/>`;
    s += `<path d="M${ix2-iw*0.34} ${iy+1} q ${iw*0.08} -3 ${iw*0.16} 0" fill="none" stroke="${strk}" stroke-width=".9"/>`;
    // top highlight
    s += `<line x1="${ix+2}" y1="${iy+.6}" x2="${ix2-2}" y2="${iy+.6}" stroke="${hi}" stroke-width=".35" opacity=".7"/>`;
  }
  else if(variant==='cargo-spizar'){
    // Cargo: 5 stacked wire trays w/ side rails + top mount line
    s += `<line x1="${ix}" y1="${iy}" x2="${ix2}" y2="${iy}" stroke="${strk}" stroke-width=".9"/>`;
    // side rails
    s += `<line x1="${ix+iw*0.06}" y1="${iy}" x2="${ix+iw*0.06}" y2="${iy2}" stroke="${strk}" stroke-width=".9"/>`;
    s += `<line x1="${ix2-iw*0.06}" y1="${iy}" x2="${ix2-iw*0.06}" y2="${iy2}" stroke="${strk}" stroke-width=".9"/>`;
    const trays = 5;
    const trayH = ih/trays;
    for(let i=0;i<trays;i++){
      const ty0 = iy + i*trayH + 1.5;
      const ty1 = iy + (i+1)*trayH - 1;
      const tx0 = ix + iw*0.1, tx1 = ix2 - iw*0.1;
      // tray outline
      s += `<rect x="${tx0}" y="${ty0}" width="${tx1-tx0}" height="${ty1-ty0}" fill="none" stroke="${strk}" stroke-width=".55" rx=".8"/>`;
      // wire bottom hatch
      const wires = Math.max(4, Math.floor((tx1-tx0)/6));
      for(let j=1;j<wires;j++){
        const xj = tx0 + (tx1-tx0)*j/wires;
        s += `<line x1="${xj}" y1="${ty0+1}" x2="${xj}" y2="${ty1-.5}" stroke="${strk}" stroke-width=".3" opacity=".55"/>`;
      }
    }
  }
  else if(variant==='pranie-rejs'){
    // Laundry basket: frame + soft fabric bag inside (slight sag), pull handle
    s += `<rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" fill="none" stroke="${strk}" stroke-width="1" rx="1.5"/>`;
    // fabric bag — slight inward curve at top + sagging bottom
    const bx0 = ix+2.5, bx1 = ix2-2.5, by0 = iy+2.5, by1 = iy2-1.5;
    s += `<path d="M${bx0} ${by0} Q ${(bx0+bx1)/2} ${by0+2} ${bx1} ${by0} L ${bx1-1} ${by1} Q ${(bx0+bx1)/2} ${by1+2} ${bx0+1} ${by1} Z"
            fill="${shade(hi,-0.04)}" stroke="${shade(strk,0.25)}" stroke-width=".4" opacity=".85"/>`;
    // weft/warp texture
    const rows = Math.max(2, Math.floor(ih/9));
    for(let i=1;i<rows;i++){
      const ry = by0 + (by1-by0)*i/rows;
      s += `<line x1="${bx0+1}" y1="${ry}" x2="${bx1-1}" y2="${ry}" stroke="${shade(strk,0.4)}" stroke-width=".25" opacity=".5"/>`;
    }
    // top draw-cord
    s += `<line x1="${bx0+iw*0.15}" y1="${by0-1}" x2="${bx1-iw*0.15}" y2="${by0-1}" stroke="${strk}" stroke-width=".55"/>`;
    // pull handle (front)
    s += `<rect x="${(ix+ix2)/2-iw*0.12}" y="${iy2-2.5}" width="${iw*0.24}" height="2" fill="${fill}" stroke="${strk}" stroke-width=".3" rx=".8"/>`;
  }
  else if(variant==='azurowy-gtv'){
    // Perforated sheet basket: solid panel + dot grid
    s += `<rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" fill="${shade(fill,-0.08)}" stroke="${strk}" stroke-width=".9" rx="1.5"/>`;
    // perforations
    const cols = Math.max(6, Math.floor(iw/5));
    const rows = Math.max(3, Math.floor(ih/5));
    const pX = iw/(cols+1), pY = ih/(rows+1);
    for(let r=1;r<=rows;r++){
      for(let c=1;c<=cols;c++){
        s += `<circle cx="${ix+c*pX}" cy="${iy+r*pY}" r=".7" fill="${shade(strk,-0.2)}" opacity=".75"/>`;
      }
    }
    // top edge highlight
    s += `<line x1="${ix+2}" y1="${iy+1}" x2="${ix2-2}" y2="${iy+1}" stroke="${hi}" stroke-width=".5" opacity=".55"/>`;
    // pull tab
    s += `<rect x="${(ix+ix2)/2-iw*0.1}" y="${iy2-2}" width="${iw*0.2}" height="1.5" fill="${shade(strk,-0.2)}" rx=".6"/>`;
  }
  else if(variant==='buty-gtv'){
    // Shoe rack: 3 tilted shelves, side rails
    s += `<line x1="${ix+1}" y1="${iy}" x2="${ix+1}" y2="${iy2}" stroke="${strk}" stroke-width=".8"/>`;
    s += `<line x1="${ix2-1}" y1="${iy}" x2="${ix2-1}" y2="${iy2}" stroke="${strk}" stroke-width=".8"/>`;
    const shelves = ih > 50 ? 3 : 2;
    for(let i=0;i<shelves;i++){
      const sy = iy + ih*(i+0.5)/shelves;
      // tilted shelf: lower at front (right side here is "front")
      const tilt = Math.min(5, ih*0.04);
      s += `<line x1="${ix+2}" y1="${sy-tilt}" x2="${ix2-2}" y2="${sy+tilt}" stroke="${strk}" stroke-width="1.1"/>`;
      // lip at front edge
      s += `<line x1="${ix2-2}" y1="${sy+tilt}" x2="${ix2-2}" y2="${sy+tilt-3}" stroke="${strk}" stroke-width=".7"/>`;
      // little shoe silhouette hint
      if(iw>60){
        s += `<ellipse cx="${(ix+ix2)/2}" cy="${sy+tilt*0.3-1}" rx="${iw*0.22}" ry="1.5" fill="${shade(darkCorpus,0.1)}" opacity=".4"/>`;
      }
    }
  }
  else if(variant==='organizer-elite'){
    // Divided organizer: framed grid (3 cols × rows depending on height)
    const cols = iw>140 ? 4 : 3;
    const rows = ih>60 ? 2 : 1;
    s += `<rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" fill="${shade(fill,-0.1)}" stroke="${strk}" stroke-width="1"/>`;
    // inner felt-tone fill
    s += `<rect x="${ix+1.5}" y="${iy+1.5}" width="${iw-3}" height="${ih-3}" fill="${shade('#2a2620',0.1)}" opacity=".55"/>`;
    for(let c=1;c<cols;c++){
      const xc = ix + iw*c/cols;
      s += `<line x1="${xc}" y1="${iy+1.5}" x2="${xc}" y2="${iy2-1.5}" stroke="${strk}" stroke-width=".7"/>`;
    }
    for(let r=1;r<rows;r++){
      const yr = iy + ih*r/rows;
      s += `<line x1="${ix+1.5}" y1="${yr}" x2="${ix2-1.5}" y2="${yr}" stroke="${strk}" stroke-width=".7"/>`;
    }
    // tiny accent items (jewelry/watch hint) in some cells
    if(iw>60){
      const cellW = iw/cols, cellH = ih/rows;
      for(let r=0;r<rows;r++){
        for(let c=0;c<cols;c++){
          if((r*cols+c)%3===0){
            s += `<circle cx="${ix+cellW*(c+0.5)}" cy="${iy+cellH*(r+0.5)}" r="${Math.min(cellW,cellH)*0.18}" fill="none" stroke="${hi}" stroke-width=".35" opacity=".6"/>`;
          }
        }
      }
    }
  }
  else if(variant==='spodnie-elite'){
    // Trouser rack: pull-out frame + 5–6 horizontal rails, draped silhouettes
    s += `<rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" fill="none" stroke="${strk}" stroke-width=".9" rx="1"/>`;
    const rails = Math.max(4, Math.min(7, Math.floor(ih/9)));
    for(let i=0;i<rails;i++){
      const ry = iy + ih*(i+0.5)/rails;
      s += `<line x1="${ix+3}" y1="${ry}" x2="${ix2-3}" y2="${ry}" stroke="${strk}" stroke-width="1"/>`;
      // small draped fabric hint
      s += `<path d="M${ix+iw*0.15} ${ry+.5} q ${iw*0.1} 2 ${iw*0.2} 0 q ${iw*0.1} 2 ${iw*0.2} 0 q ${iw*0.1} 2 ${iw*0.2} 0"
              fill="none" stroke="${shade(darkCorpus,0.15)}" stroke-width=".35" opacity=".55"/>`;
    }
    // pull-out indicator arrow
    s += `<path d="M${ix2-6} ${iy+ih/2-2} l 4 2 l -4 2" fill="none" stroke="${strk}" stroke-width=".55" opacity=".7"/>`;
  }
  else if(variant==='simpla-rejs'){
    // Wire drawer (REJS Simpla): low frame + wire grid + horizontal handle bar at front
    s += `<rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" fill="none" stroke="${strk}" stroke-width="1" rx="1"/>`;
    // diagonal cross-wire pattern (light)
    const cols = Math.max(5, Math.floor(iw/8));
    for(let i=1;i<cols;i++){
      const xi = ix + iw*i/cols;
      s += `<line x1="${xi}" y1="${iy+1.5}" x2="${xi}" y2="${iy2-1.5}" stroke="${strk}" stroke-width=".4" opacity=".7"/>`;
    }
    // horizontal mid-wire
    s += `<line x1="${ix+1}" y1="${(iy+iy2)/2}" x2="${ix2-1}" y2="${(iy+iy2)/2}" stroke="${strk}" stroke-width=".45"/>`;
    // front handle bar (suggested by a slightly thicker line on top edge)
    s += `<line x1="${ix+iw*0.2}" y1="${iy+.4}" x2="${ix2-iw*0.2}" y2="${iy+.4}" stroke="${strk}" stroke-width="1.4"/>`;
    // slide rail hints (left+right)
    s += `<line x1="${ix-1.5}" y1="${(iy+iy2)/2}" x2="${ix+1}" y2="${(iy+iy2)/2}" stroke="${strk}" stroke-width=".5" opacity=".7"/>`;
    s += `<line x1="${ix2-1}" y1="${(iy+iy2)/2}" x2="${ix2+1.5}" y2="${(iy+iy2)/2}" stroke="${strk}" stroke-width=".5" opacity=".7"/>`;
  }
  else {
    // fallback — generic wire basket
    s += `<rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" fill="none" stroke="${strk}" stroke-width=".9"/>`;
    const n = Math.max(4, Math.floor(iw/8));
    for(let i=1;i<n;i++){
      const xi = ix + iw*i/n;
      s += `<line x1="${xi}" y1="${iy+1}" x2="${xi}" y2="${iy2-1}" stroke="${strk}" stroke-width=".4" opacity=".65"/>`;
    }
  }
  s += bottomLine;
  return s;
}
function dimLabel(x1,y1,x2,y2,txt,dir){
  const col='#6a6a62';
  if(dir==='h'){
    return `
      <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width=".8"/>
      <line x1="${x1}" y1="${y1-4}" x2="${x1}" y2="${y1+4}" stroke="${col}" stroke-width=".8"/>
      <line x1="${x2}" y1="${y2-4}" x2="${x2}" y2="${y2+4}" stroke="${col}" stroke-width=".8"/>
      <rect x="${(x1+x2)/2-30}" y="${y1-7}" width="60" height="14" fill="#ede7d6"/>
      <text x="${(x1+x2)/2}" y="${y1+3}" font-family="JetBrains Mono" font-size="10" fill="${col}" text-anchor="middle">${txt}</text>
    `;
  } else {
    return `
      <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width=".8"/>
      <line x1="${x1-4}" y1="${y1}" x2="${x1+4}" y2="${y1}" stroke="${col}" stroke-width=".8"/>
      <line x1="${x2-4}" y1="${y2}" x2="${x2+4}" y2="${y2}" stroke="${col}" stroke-width=".8"/>
      <rect x="${x1-30}" y="${(y1+y2)/2-7}" width="30" height="14" fill="#ede7d6"/>
      <text x="${x1-15}" y="${(y1+y2)/2+3}" font-family="JetBrains Mono" font-size="10" fill="${col}" text-anchor="middle">${txt}</text>
    `;
  }
}

// ────────────────────────────────────────────────────────────
//  FILE UPLOAD — załączniki klienta
// ────────────────────────────────────────────────────────────
window.__attachments = window.__attachments || [];
const MAX_FILES = 5;
const MAX_TOTAL_BYTES = 10 * 1024 * 1024;

function fmtBytes(n){
  if(n < 1024) return n + ' B';
  if(n < 1024*1024) return (n/1024).toFixed(1) + ' kB';
  return (n/1024/1024).toFixed(2) + ' MB';
}

function renderFileList(){
  const list = document.getElementById('fileList');
  if(!list) return;
  list.innerHTML = window.__attachments.map((f,i)=>`
    <div class="file-item">
      <svg class="file-item-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M9 1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V5z M9 1v4h4" stroke-linejoin="round"/></svg>
      <span class="file-item-name" title="${f.name}">${f.name}</span>
      <span class="file-item-size mono">${fmtBytes(f.size)}</span>
      <button class="file-item-remove" data-i="${i}" type="button" title="Usuń">×</button>
    </div>
  `).join('');
  list.querySelectorAll('.file-item-remove').forEach(b=>{
    b.onclick = ()=>{
      window.__attachments.splice(+b.dataset.i, 1);
      renderFileList();
    };
  });
}

function addFiles(files){
  const arr = Array.from(files || []);
  const allowed = /\.(pdf|jpe?g|png|dxf|dwg|webp|gif|heic|heif)$/i;
  for(const f of arr){
    if(window.__attachments.length >= MAX_FILES){ toast('Maks. '+MAX_FILES+' plików'); break; }
    if(!allowed.test(f.name)){ toast('Niedozwolony format: '+f.name); continue; }
    const total = window.__attachments.reduce((a,x)=>a+x.size,0) + f.size;
    if(total > MAX_TOTAL_BYTES){ toast('Łączny rozmiar przekracza 10 MB'); break; }
    window.__attachments.push(f);
  }
  renderFileList();
}

// ────────────────────────────────────────────────────────────
//  SZKICOWNIK WNĘKI — siatka + obrys, wynik jako PNG do maila
// ────────────────────────────────────────────────────────────
window.__sketch = window.__sketch || { pts: [], closed: false, gridMm: 100, dataUrl: null };

function initSketch(){
  const modal = document.getElementById('sketchModal');
  const canvas = document.getElementById('sketchCanvas');
  if(!modal || !canvas || modal._bound) return;
  modal._bound = true;
  const ctx = canvas.getContext('2d');
  const GRID = 40; // px kratki na canvasie
  const S = window.__sketch;

  function draw(){
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,W,H);
    // siatka
    ctx.strokeStyle = '#e6e0d0'; ctx.lineWidth = 1;
    for(let x=0;x<=W;x+=GRID){ ctx.beginPath(); ctx.moveTo(x+.5,0); ctx.lineTo(x+.5,H); ctx.stroke(); }
    for(let y=0;y<=H;y+=GRID){ ctx.beginPath(); ctx.moveTo(0,y+.5); ctx.lineTo(W,y+.5); ctx.stroke(); }
    // grubsze linie co 5 kratek
    ctx.strokeStyle = '#d4cbb4'; ctx.lineWidth = 1.4;
    for(let x=0;x<=W;x+=GRID*5){ ctx.beginPath(); ctx.moveTo(x+.5,0); ctx.lineTo(x+.5,H); ctx.stroke(); }
    for(let y=0;y<=H;y+=GRID*5){ ctx.beginPath(); ctx.moveTo(0,y+.5); ctx.lineTo(W,y+.5); ctx.stroke(); }
    // podłoga
    ctx.strokeStyle = '#b8915a'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(0,H-GRID+.5); ctx.lineTo(W,H-GRID+.5); ctx.stroke();
    ctx.fillStyle = '#b8915a'; ctx.font = '13px monospace';
    ctx.fillText('podłoga', 8, H-GRID-8);

    if(!S.pts.length) return;
    // wypełnienie
    ctx.beginPath();
    S.pts.forEach((p,i)=> i===0 ? ctx.moveTo(p.x,p.y) : ctx.lineTo(p.x,p.y));
    if(S.closed) ctx.closePath();
    if(S.closed){ ctx.fillStyle = 'rgba(184,145,90,0.16)'; ctx.fill(); }
    ctx.strokeStyle = '#1a1a17'; ctx.lineWidth = 2.4; ctx.stroke();
    // punkty + wymiary odcinków
    S.pts.forEach((p,i)=>{
      ctx.beginPath(); ctx.arc(p.x,p.y,5,0,Math.PI*2);
      ctx.fillStyle = i===0 ? '#a8552f' : '#1a1a17'; ctx.fill();
      ctx.strokeStyle='#fff'; ctx.lineWidth=1.5; ctx.stroke();
    });
    const segs = S.closed ? S.pts.length : S.pts.length - 1;
    ctx.font = '12px monospace'; ctx.fillStyle = '#6a6a62';
    for(let i=0;i<segs;i++){
      const a = S.pts[i], b = S.pts[(i+1)%S.pts.length];
      const dx = Math.abs(b.x-a.x), dy = Math.abs(b.y-a.y);
      const mm = Math.round((Math.hypot(dx,dy)/GRID) * S.gridMm);
      if(mm < 30) continue;
      const mx = (a.x+b.x)/2, my = (a.y+b.y)/2;
      const label = `${mm} mm`;
      const tw = ctx.measureText(label).width;
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      ctx.fillRect(mx-tw/2-3, my-14, tw+6, 15);
      ctx.fillStyle = '#6a6a62';
      ctx.fillText(label, mx-tw/2, my-3);
    }
  }

  function pos(e){
    const r = canvas.getBoundingClientRect();
    const t = (e.touches && e.touches[0]) || e;
    const sx = canvas.width / r.width, sy = canvas.height / r.height;
    const x = (t.clientX - r.left) * sx, y = (t.clientY - r.top) * sy;
    return { x: Math.round(x/GRID)*GRID, y: Math.round(y/GRID)*GRID };
  }

  function addPoint(e){
    e.preventDefault();
    if(S.closed) return;
    const p = pos(e);
    if(S.pts.length >= 3){
      const f = S.pts[0];
      if(Math.hypot(p.x-f.x, p.y-f.y) < GRID*0.75){ S.closed = true; draw(); return; }
    }
    if(S.pts.length){
      const l = S.pts[S.pts.length-1];
      if(l.x===p.x && l.y===p.y) return;
    }
    S.pts.push(p);
    draw();
  }

  canvas.addEventListener('click', addPoint);
  canvas.addEventListener('touchstart', addPoint, {passive:false});

  document.getElementById('skUndo').onclick = ()=>{ if(S.closed){ S.closed=false; } else { S.pts.pop(); } draw(); };
  document.getElementById('skClose2').onclick = ()=>{ if(S.pts.length>=3){ S.closed=true; draw(); } else toast('Potrzebne min. 3 punkty'); };
  document.getElementById('skClear').onclick = ()=>{ S.pts=[]; S.closed=false; draw(); };
  document.getElementById('skGridMm').addEventListener('input', e=>{
    S.gridMm = Math.max(10, Number(e.target.value)||100); draw();
  });

  function openModal(){
    modal.classList.add('show');
    document.getElementById('skGridMm').value = S.gridMm;
    draw();
  }
  function closeModal(){ modal.classList.remove('show'); }

  document.getElementById('sketchOpen').onclick = openModal;
  document.getElementById('sketchClose').onclick = closeModal;
  document.getElementById('skCancel').onclick = closeModal;
  modal.addEventListener('click', e=>{ if(e.target===modal) closeModal(); });

  document.getElementById('skSave').onclick = ()=>{
    if(S.pts.length < 3){ toast('Narysuj obrys — min. 3 punkty'); return; }
    if(!S.closed) S.closed = true;
    draw();
    S.dataUrl = canvas.toDataURL('image/png');
    const prev = document.getElementById('sketchPreview');
    const thumb = document.getElementById('sketchThumb');
    if(thumb) thumb.src = S.dataUrl;
    if(prev) prev.hidden = false;
    closeModal();
    toast('Szkic zapisany — dołączymy go do zapytania');
    saveState();
  };

  const clearBtn = document.getElementById('sketchClear');
  if(clearBtn) clearBtn.onclick = ()=>{
    S.pts=[]; S.closed=false; S.dataUrl=null;
    const prev = document.getElementById('sketchPreview');
    if(prev) prev.hidden = true;
    draw();
  };
}

function initFileUpload(){
  const drop = document.getElementById('fileDrop');
  const input = document.getElementById('leadFiles');
  if(!drop || !input || drop._bound) return;
  drop._bound = true;
  input.addEventListener('change', e=>{ addFiles(e.target.files); input.value=''; });
  ['dragenter','dragover'].forEach(ev=>drop.addEventListener(ev, e=>{ e.preventDefault(); drop.classList.add('dragover'); }));
  ['dragleave','drop'].forEach(ev=>drop.addEventListener(ev, e=>{ e.preventDefault(); drop.classList.remove('dragover'); }));
  drop.addEventListener('drop', e=>{ addFiles(e.dataTransfer.files); });
  renderFileList();
}

// ────────────────────────────────────────────────────────────
//  FULL ORDER SPEC — używane do payload e-maila
// ────────────────────────────────────────────────────────────
// ── Lista akcesoriów z cenami (do maila) ────────────────────
function buildAccessoryList(){
  const rows = [];
  const push = (name, brand, qty, unit, total) => {
    rows.push({name, brand: brand||'', qty, unit: unit||0, total: Math.round(total)});
  };
  const agg = {};
  STATE.sections.forEach(s=>{
    s.items.forEach(it=>{
      const t = ITEM_TYPES[it.type]; if(!t) return;
      let nm = t.name, brand = '', price = t.price || 0;
      if(it.variant && t.variants){
        const v = t.variants.find(vv=>vv.id===it.variant);
        if(v){ nm = `${t.name} — ${v.name}`; brand = v.brand||''; price = v.price||0; }
      } else if(it.type==='szuflady'){
        const cnt = (it.opts && it.opts.count) || 4;
        nm = `Zestaw szuflad (${cnt} szt.)`; price = 80*cnt;
      }
      if(it.frameColor) nm += ` · ${it.frameColor}`;
      if(price <= 0) return;
      const key = nm + '|' + brand + '|' + price;
      if(!agg[key]) agg[key] = {nm, brand, price, qty:0};
      agg[key].qty++;
    });
  });
  Object.values(agg).forEach(a=> push(a.nm, a.brand, a.qty, a.price, a.qty * a.price));

  if(STATE.frontMode === 'hinged'){
    const hinge = HINGES.find(x=>x.id===STATE.hinges) || HINGES[0];
    let n = 0;
    STATE.sections.forEach((s,si)=>{
      frontLeaves(si).forEach(lf=>{ n += hingeCount(lf.h); });
    });
    if(n) push(`Zawiasy — ${hinge.name}`, hinge.brand, n, hinge.price||0, n * (hinge.price||0));

    const handle = HANDLES.find(h=>h.id===STATE.handle) || HANDLES[0];
    if(handle){
      let per = handle.price || 0;
      let nm = handle.name;
      if(handle.colors){
        const c = handle.colors.find(c=>c.id===STATE.handleColor) || handle.colors[0];
        if(c){
          per += (c.price||0);
          const cd = (typeof HANDLE_COLORS!=='undefined') && HANDLE_COLORS[c.id];
          if(cd) nm += ` · ${cd.name.toLowerCase()}`;
        }
      }
      const cnt = STATE.sectionFronts.filter(Boolean).length;
      if(cnt) push(`Uchwyty — ${nm}`, handle.brand, cnt, per, cnt * per);
    }
  }

  if(STATE.frontMode === 'sliding'){
    const prof = SLIDING_PROFILES.find(p=>p.id===STATE.slidingProfile) || SLIDING_PROFILES[0];
    const panels = Math.min(4, Math.max(2, STATE.sections.length));
    const col = (SLIDING_COLORS.find(c=>c.id===STATE.slidingProfileColor)||SLIDING_COLORS[0]);
    push(`System przesuwny — ${prof.name} · ${col.name.toLowerCase()}`, prof.brand, panels, prof.price||0, panels*(prof.price||0));
    if(prof.fillable && typeof SLIDING_FILLS !== 'undefined'){
      const doors_m2 = buildCutList().frontsSqm;
      if(prof.divisible){
        const sp = STATE.slidingSplits || {count:2, fills:['plyta','plyta']};
        const arr = sp.fills.slice(0, sp.count);
        const per = doors_m2 / Math.max(1, arr.length);
        const cnt = {};
        arr.forEach(fid=>{ cnt[fid] = (cnt[fid]||0)+1; });
        Object.entries(cnt).forEach(([fid,k])=>{
          const f = SLIDING_FILLS.find(x=>x.id===fid);
          if(f && f.price) push(`Wypełnienie — ${f.name}`, '', `${(per*k).toFixed(2)} m²`, f.price, per*k*f.price);
        });
      } else {
        const f = SLIDING_FILLS.find(x=>x.id===STATE.slidingFill);
        if(f && f.price) push(`Wypełnienie — ${f.name}`, '', `${doors_m2.toFixed(2)} m²`, f.price, doors_m2*f.price);
      }
    }
  }

  if(STATE.base === 'nozki' && typeof LEGS !== 'undefined'){
    const leg = LEGS.find(l=>l.id===STATE.leg);
    if(leg){
      const cd = (typeof LEG_COLORS!=='undefined') && LEG_COLORS[STATE.legColor];
      push(`Nóżki — ${leg.brand} H${leg.h}${cd?` · ${cd.name.toLowerCase()}`:''}`, leg.brand, 4, leg.price||0, 4*(leg.price||0));
    }
  } else if(STATE.base === 'cokol'){
    push('Cokoł 100 mm (montaż)', '', 1, 25, 25);
  } else if(STATE.base === 'wiszacy'){
    push('Zawieszenie na stelażu', '', 1, 25, 25);
  }

  if(STATE.accessories.oswietlenie){
    const mb = cabinetW()/1000;
    const per = PRICING.lightingPerM || 0;
    push('Oświetlenie LED w profilu', 'GTV', `${mb.toFixed(2)} mb`, per, mb*per);
  }

  const sum = rows.reduce((a,r)=>a+r.total, 0);
  return { rows, sum };
}

function accessoryTableHTML(){
  const { rows, sum } = buildAccessoryList();
  if(!rows.length) return '';
  const fmt = n => new Intl.NumberFormat('pl-PL').format(n) + ' zł';
  const body = rows.map(r=>`
    <tr>
      <td style="padding:6px 10px;border:1px solid #d9d3c4">${r.name}${r.brand?` <span style="color:#6a6a62;font-size:11px">· ${r.brand}</span>`:''}</td>
      <td style="padding:6px 10px;border:1px solid #d9d3c4;text-align:center;font-family:'JetBrains Mono',monospace;white-space:nowrap">${r.qty}</td>
      <td style="padding:6px 10px;border:1px solid #d9d3c4;text-align:right;font-family:'JetBrains Mono',monospace;white-space:nowrap">${typeof r.unit==='number'?fmt(r.unit):r.unit}</td>
      <td style="padding:6px 10px;border:1px solid #d9d3c4;text-align:right;font-family:'JetBrains Mono',monospace;white-space:nowrap">${fmt(r.total)}</td>
    </tr>`).join('');
  return `
  <table style="width:100%;border-collapse:collapse;font-family:Inter,sans-serif;font-size:12.5px;margin:6px 0 4px">
    <thead>
      <tr style="background:#f5f1e8">
        <th style="padding:6px 10px;border:1px solid #d9d3c4;text-align:left;font-weight:500">Pozycja</th>
        <th style="padding:6px 10px;border:1px solid #d9d3c4;text-align:center;font-weight:500">Ilość</th>
        <th style="padding:6px 10px;border:1px solid #d9d3c4;text-align:right;font-weight:500">Cena jedn.</th>
        <th style="padding:6px 10px;border:1px solid #d9d3c4;text-align:right;font-weight:500">Wartość</th>
      </tr>
    </thead>
    <tbody>${body}</tbody>
    <tfoot>
      <tr style="background:#ede7d6">
        <td colspan="3" style="padding:7px 10px;border:1px solid #d9d3c4;font-weight:500">Akcesoria razem</td>
        <td style="padding:7px 10px;border:1px solid #d9d3c4;text-align:right;font-family:'JetBrains Mono',monospace;font-weight:600">${fmt(sum)}</td>
      </tr>
    </tfoot>
  </table>`;
}

function buildOrderSpec(refNo){
  const pb = priceBreakdown();
  const {w,h,d} = STATE.dim;
  const matC = MATERIALS.find(m=>m.id===STATE.material) || MATERIALS[0];
  const matF = STATE.splitFront ? (MATERIALS.find(m=>m.id===STATE.materialFront)||matC) : matC;
  const baseTxt = (()=>{
    if(STATE.base==='cokol') return 'Cokoł 100 mm';
    if(STATE.base==='podloga') return 'Bezpośrednio na podłodze';
    if(STATE.base==='wiszacy') return 'Wiszący (na stelażu)';
    if(STATE.base==='nozki' && typeof LEGS!=='undefined'){
      const l = LEGS.find(x=>x.id===STATE.leg) || LEGS[0];
      if(!l) return 'Nóżki';
      const c = (l.colors && (typeof LEG_COLORS!=='undefined') && LEG_COLORS[STATE.legColor]);
      return `Nóżki ${l.brand} (H${l.h} mm)${c?', '+LEG_COLORS[STATE.legColor].name.toLowerCase():''}`;
    }
    return '—';
  })();
  const hinge = HINGES.find(x=>x.id===STATE.hinges) || HINGES[0];
  const handle = HANDLES.find(x=>x.id===STATE.handle) || HANDLES[0];
  const handleColorName = (handle.colors && (typeof HANDLE_COLORS!=='undefined') && HANDLE_COLORS[STATE.handleColor])
    ? HANDLE_COLORS[STATE.handleColor].name : '';
  const sliding = SLIDING_PROFILES.find(p=>p.id===STATE.slidingProfile) || SLIDING_PROFILES[0];
  const slidingCol = SLIDING_COLORS.find(c=>c.id===STATE.slidingProfileColor) || SLIDING_COLORS[0];

  const sections = STATE.sections.map((s,i)=>{
    const items = s.items.map(it=>{
      const t = ITEM_TYPES[it.type]; if(!t) return null;
      const v = (it.variant && t.variants) ? t.variants.find(x=>x.id===it.variant) : null;
      let line = `${t.name}: ${it.h} mm`;
      if(v) line += ` — ${v.name}`;
      if(it.frameColor) line += ` (${it.frameColor})`;
      if(it.internal) line += ' [wewnętrzna]';
      return line;
    }).filter(Boolean);
    const front = STATE.frontMode==='sliding' ? null : STATE.sectionFronts[i];
    return {
      idx: i+1, w: s.w,
      lift: s.lift ? `${s.lift} mm nad podłogą` : null,
      front: STATE.frontMode==='sliding' ? '—' : (front?'z frontem':'otwarta'),
      items
    };
  });

  return {
    ref: refNo,
    timestamp: new Date().toISOString(),
    customer: {
      name: STATE.lead.name || '',
      email: STATE.lead.email || '',
      phone: STATE.lead.phone || '',
      city: STATE.lead.city || '',
      notes: STATE.lead.notes || '',
    },
    furniture: {
      type: STATE.typeName || STATE.type,
      dimensions_mm: { w: cabinetW(), h: cabinetH(), d },
      niche_mm: { w: STATE.dim.w, h: STATE.dim.h, d },
      notch: (STATE.notch && STATE.notch.on)
        ? `${STATE.notch.side==='left'?'Lewa':'Prawa'} ściana, od ${STATE.notch.from==='top'?'góry':'dołu'} — ${STATE.notch.w} × ${STATE.notch.h} × głęb. ${STATE.notch.d||150} mm`
        : '—',
      slope: (STATE.slope && STATE.slope.on)
        ? `Sufit opada w ${STATE.slope.side==='right'?'prawo':'lewo'} — ${cabinetH()} mm → ${STATE.slope.hLow} mm${(STATE.slope.flat>0)?`, prosty sufit ${STATE.slope.flat} mm`:' (skos od krawędzi)'}`
        : '—',
      uneven_walls: !!STATE.uneven,
      base: baseTxt,
      sections_count: STATE.sections.length,
      band: STATE.band ? `Przelotowa półka ${STATE.band.position==='top'?'górna':'dolna'} ${STATE.band.h} mm — sekcje ${STATE.band.from+1}–${STATE.band.to+1}` : '—',
      blenda: (()=>{
        const b = STATE.blenda||{};
        const parts = [];
        if(b.left)  parts.push(`lewa ${b.left} mm`);
        if(b.right) parts.push(`prawa ${b.right} mm`);
        if(b.top)   parts.push(`górna ${b.top} mm`);
        return parts.length ? parts.join(', ') : '—';
      })(),
      sections,
    },
    materials: {
      corpus: { name: matC.name, code: matC.code, price_per_sqm: matC.price },
      fronts: STATE.splitFront
        ? { name: matF.name, code: matF.code, price_per_sqm: matF.price }
        : 'same as corpus',
    },
    fronts: STATE.frontMode==='sliding' ? {
      mode: 'Drzwi przesuwne',
      system: sliding.name + (sliding.brand?` (${sliding.brand})`:''),
      color: slidingCol.name,
      fill: sliding.divisible
        ? `Podział na ${STATE.slidingSplits.count} pasy: ${STATE.slidingSplits.fills.slice(0,STATE.slidingSplits.count).map(fid=>(SLIDING_FILLS.find(f=>f.id===fid)||{}).name||fid).join(' / ')}`
        : (sliding.fillable ? (SLIDING_FILLS.find(f=>f.id===STATE.slidingFill)||{}).name : 'Płyta (bezramowy)'),
    } : {
      mode: 'Fronty uchylne (zawiasy)',
      hinges: hinge.name + (hinge.brand?` (${hinge.brand})`:''),
      handle: handle.name + (handle.brand?` (${handle.brand})`:''),
      handle_color: handleColorName,
    },
    accessories: {
      lighting_led: !!STATE.accessories.oswietlenie,
    },
    pricing: {
      material: pb.materialCost,
      cutting: pb.cuttingCost,
      edging: pb.edgingCost,
      labor: pb.laborCost,
      design: pb.designCost,
      back: pb.backCost,
      sections_inserts: pb.accCost,
      accessories_list: buildAccessoryList().rows,
      mdf_m2: pb.mdf_m2 ? Number(pb.mdf_m2.toFixed(2)) : 0,
      mdf_cost: pb.mdfCost || 0,
      fronts_material: mdfOn() ? mdfLabel() : 'płyta',
      hardware: pb.hardwareCost,
      total_gross: pb.total,
      total_net: pb.netto,
      vat_rate: pb.vat,
      board_m2: Number(pb.board_m2.toFixed(2)),
      waste_pct: Math.round(pb.waste*100),
      sheets: pb.nest ? pb.nest.groups.map(g=>({decor:`${g.name} ${g.code}`, sheets:g.sheets, usage_pct:Math.round(g.usage*100), grain:g.grain})) : [],
      warnings: validateProject().map(o=>o.msg),
    },
    production: {
      pieces_count: pb.cut.pieceCount,
      cuts_count: pb.cut.cutsCount,
      cutting_mb: pb.cut.cutMb,
      edging_mb: pb.cut.edgeMb,
      piece_list: pb.cut.pieces,
    },
    consents: {
      rodo: !!STATE.lead.consent,
      regulations: !!STATE.lead.regulations,
    },
  };
}

function buildSpecHTML(refNo){
  const s = buildOrderSpec(refNo);
  const TR = (k,v) => `<tr><td style="padding:7px 12px;background:#f5f1e8;border:1px solid #d9d3c4;font-weight:500;width:35%">${k}</td><td style="padding:7px 12px;border:1px solid #d9d3c4">${v}</td></tr>`;
  const sections = s.furniture.sections.map(sec=>`
    <div style="margin-bottom:14px;padding:10px 14px;background:#fafaf6;border-left:3px solid #b8915a">
      <div style="font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:.06em;color:#6a6a62;margin-bottom:6px">
        SEKCJA ${sec.idx} · ${sec.w} mm · ${sec.front}${sec.lift?` · <strong style="color:#a8552f">${sec.lift}</strong>`:''}
      </div>
      <ul style="margin:0;padding-left:20px;color:#1a1a17;font-size:13px;line-height:1.6">
        ${sec.items.map(i=>`<li>${i}</li>`).join('')}
      </ul>
    </div>`).join('');
  const corpusName = `${s.materials.corpus.name} (kod ${s.materials.corpus.code})`;
  const frontsName = s.materials.fronts === 'same as corpus' ? '— ten sam co korpus —'
    : `${s.materials.fronts.name} (kod ${s.materials.fronts.code})`;
  const fr = s.fronts;
  const frBlock = fr.mode === 'Drzwi przesuwne'
    ? TR('System frontów', fr.mode) + TR('Profil', fr.system) + TR('Kolor profilu', fr.color) + TR('Wypełnienie', fr.fill)
    : TR('System frontów', fr.mode) + TR('Zawiasy', fr.hinges) + TR('Uchwyty', fr.handle + (fr.handle_color?` — ${fr.handle_color.toLowerCase()}`:''));
  const fmtZL = n => new Intl.NumberFormat('pl-PL').format(n) + ' zł';
  const p = s.pricing;
  return `
<table style="width:100%;max-width:720px;border-collapse:collapse;font-family:Inter,sans-serif;font-size:13px;color:#1a1a17">
  <tr><td colspan="2" style="padding:14px 0">
    <h2 style="margin:0;font-family:'Instrument Serif',serif;font-weight:400;font-size:22px">Nowe zamówienie — ${s.ref}</h2>
    <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#6a6a62;margin-top:4px">${new Date(s.timestamp).toLocaleString('pl-PL')}</div>
  </td></tr>

  <tr><td colspan="2"><h3 style="margin:14px 0 6px;font-family:'Instrument Serif',serif;font-weight:400;font-size:17px;border-bottom:1px solid #d9d3c4;padding-bottom:4px">Klient</h3></td></tr>
  ${TR('Imię i nazwisko', s.customer.name)}
  ${window.__projLink ? TR('Projekt w konfiguratorze', '<a href="'+window.__projLink+'">Otwórz projekt</a>') : ''}
  ${TR('E-mail', s.customer.email ? `<a href="mailto:${s.customer.email}">${s.customer.email}</a>` : '—')}
  ${TR('Telefon', s.customer.phone ? `<a href="tel:${s.customer.phone.replace(/\s/g,'')}">${s.customer.phone}</a>` : '—')}
  ${TR('Lokalizacja', s.customer.city || '—')}
  ${TR('Uwagi klienta', s.customer.notes ? s.customer.notes.replace(/\n/g,'<br>') : '—')}

  <tr><td colspan="2"><h3 style="margin:14px 0 6px;font-family:'Instrument Serif',serif;font-weight:400;font-size:17px;border-bottom:1px solid #d9d3c4;padding-bottom:4px">Mebel</h3></td></tr>
  ${TR('Typ zabudowy', s.furniture.type)}
  ${TR('Wymiary wnęki (szer × wys × głęb)', `${s.furniture.niche_mm.w} × ${s.furniture.niche_mm.h} × ${s.furniture.niche_mm.d} mm`)}
  ${TR('Wymiary korpusu (szer × wys × głęb)', `<strong>${s.furniture.dimensions_mm.w} × ${s.furniture.dimensions_mm.h} × ${s.furniture.dimensions_mm.d} mm</strong>`)}
  ${s.furniture.uneven_walls ? TR('Ściany', '<strong style="color:#a8552f">krzywe — wymaga kontaktu</strong>') : ''}
  ${TR('Osadzenie', s.furniture.base)}
  ${TR('Liczba sekcji', s.furniture.sections_count)}
  ${s.furniture.slope && s.furniture.slope !== '—' ? TR('Skośny sufit', `<strong style="color:#a8552f">${s.furniture.slope}</strong>`) : ''}
  ${s.furniture.notch && s.furniture.notch !== '—' ? TR('Uskok / komin', `<strong style="color:#a8552f">${s.furniture.notch}</strong>`) : ''}
  ${(window.__sketch && window.__sketch.dataUrl) ? TR('Szkic wnęki', `<strong style="color:#a8552f">TAK — w załączniku (${s.ref}-szkic-wneki.png)</strong>`) : ''}
  ${s.furniture.band && s.furniture.band !== '—' ? TR('Przelotowa półka', s.furniture.band) : ''}
  ${s.furniture.blenda && s.furniture.blenda !== '—' ? TR('Blendy maskujące', s.furniture.blenda) : ''}
  ${TR('Dekor korpusu', corpusName)}
  ${(typeof mdfOn==='function' && mdfOn()) ? TR('Fronty', '<strong>'+mdfLabel()+'</strong> — '+(s.pricing.mdf_m2||0).toFixed(2).replace('.',',')+' m² × 450 zł/m²<br><span style="color:#a8552f">Realizacja +1 tydzień</span>') : TR('Dekor frontów', frontsName)}
  ${frBlock}
  ${TR('Oświetlenie LED', s.accessories.lighting_led ? 'TAK' : 'NIE')}

  <tr><td colspan="2"><h3 style="margin:14px 0 6px;font-family:'Instrument Serif',serif;font-weight:400;font-size:17px;border-bottom:1px solid #d9d3c4;padding-bottom:4px">Układ sekcji</h3></td></tr>
  <tr><td colspan="2" style="padding:8px 0">${sections}</td></tr>

  <tr><td colspan="2"><h3 style="margin:14px 0 6px;font-family:'Instrument Serif',serif;font-weight:400;font-size:17px;border-bottom:1px solid #d9d3c4;padding-bottom:4px">Akcesoria i okucia</h3></td></tr>
  <tr><td colspan="2">${accessoryTableHTML()}</td></tr>

  <tr><td colspan="2"><h3 style="margin:14px 0 6px;font-family:'Instrument Serif',serif;font-weight:400;font-size:17px;border-bottom:1px solid #d9d3c4;padding-bottom:4px">Kosztorys (orientacyjnie)</h3></td></tr>
  ${TR('Materiał', fmtZL(p.material + p.cutting + p.edging + p.labor + (p.back||0)))}
  ${p.design ? TR('Projekt', fmtZL(p.design)) : ''}
  ${TR('Akcesoria', fmtZL(p.sections_inserts + p.hardware))}
  ${TR('Zużycie płyty', p.board_m2.toFixed(2).replace('.',',') + ' m²')}
  ${(p.sheets&&p.sheets.length) ? TR('Arkusze (rozkrój)', p.sheets.map(g=>g.decor+': <strong>'+g.sheets+' ark.</strong> · wykorzystanie '+g.usage_pct+'%'+(g.grain?' · słoje pilnowane':'')).join('<br>')) : ''}
  ${(p.warnings&&p.warnings.length) ? TR('Uwagi do projektu', '<span style="color:#a8552f">'+p.warnings.join('<br>')+'</span>') : ''}

  <tr><td colspan="2"><h3 style="margin:14px 0 6px;font-family:'Instrument Serif',serif;font-weight:400;font-size:17px;border-bottom:1px solid #d9d3c4;padding-bottom:4px">Produkcja</h3></td></tr>
  ${TR('Liczba formatek', s.production.pieces_count + ' szt.')}
  ${TR('Liczba cięć (szac.)', s.production.cuts_count + ' szt.')}
  ${TR('Cięcie łącznie', String(s.production.cutting_mb).replace('.',',') + ' mb')}
  ${TR('Obrzeże łącznie', String(s.production.edging_mb).replace('.',',') + ' mb')}
  <tr><td colspan="2" style="padding:8px 0">
    <table style="width:100%;border-collapse:collapse;font-size:12px">
      <thead><tr>
        <th style="padding:6px 10px;background:#ede7d6;border:1px solid #d9d3c4;text-align:left;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.06em;text-transform:uppercase">Element</th>
        <th style="padding:6px 10px;background:#ede7d6;border:1px solid #d9d3c4;text-align:right;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.06em;text-transform:uppercase">Wymiar (mm)</th>
        <th style="padding:6px 10px;background:#ede7d6;border:1px solid #d9d3c4;text-align:right;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.06em;text-transform:uppercase">Szt.</th>
      </tr></thead>
      <tbody>
        ${s.production.piece_list.map(pc=>`<tr>
          <td style="padding:5px 10px;border:1px solid #d9d3c4">${pc.name}</td>
          <td style="padding:5px 10px;border:1px solid #d9d3c4;text-align:right;font-family:'JetBrains Mono',monospace">${pc.w} × ${pc.h}</td>
          <td style="padding:5px 10px;border:1px solid #d9d3c4;text-align:right;font-family:'JetBrains Mono',monospace">${pc.qty}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </td></tr>

  <tr><td style="padding:10px 12px;background:#1a1a17;color:#f5f1e8;font-weight:500">CENA NETTO</td><td style="padding:10px 12px;background:#1a1a17;color:#f5f1e8;font-family:'JetBrains Mono',monospace">${fmtZL(p.total_net)}</td></tr>
  <tr><td style="padding:10px 12px;background:#1a1a17;color:#b8915a;font-weight:500">CENA BRUTTO (VAT ${Math.round(p.vat_rate*100)}%)</td><td style="padding:10px 12px;background:#1a1a17;color:#b8915a;font-family:'JetBrains Mono',monospace;font-size:16px">${fmtZL(p.total_gross)}</td></tr>

  <tr><td colspan="2" style="padding-top:14px">
    <div style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.06em;color:#6a6a62">
      Zgody: RODO ${s.consents.rodo?'✓':'✗'} · Regulamin ${s.consents.regulations?'✓':'✗'}
    </div>
    <div style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.06em;color:#6a6a62;margin-top:4px">
      Wiadomość wygenerowana automatycznie przez konfigurator zabudujto.pl
    </div>
  </td></tr>
</table>`;
}

window.ZTOrder = { buildSpec: buildOrderSpec, buildHTML: buildSpecHTML };

// ── PREVIEW → PNG (do załączania w mailu) ──────────────────
async function renderViewToPNG(view, scale){
  scale = scale || 2;
  const svg = document.getElementById('cabinetSvg');
  if(!svg) return null;
  const oldView = STATE.previewView;
  if(view && view !== oldView){
    STATE.previewView = view;
    renderPreview();
  }
  // poczekaj na font load + jedna ramka
  if(document.fonts && document.fonts.ready) { try{ await document.fonts.ready; }catch(e){} }
  await new Promise(r=>requestAnimationFrame(r));

  // Wymiary z viewBox lub atrybutów
  const vb = svg.viewBox && svg.viewBox.baseVal;
  const W = (vb && vb.width)  || parseFloat(svg.getAttribute('width'))  || 600;
  const H = (vb && vb.height) || parseFloat(svg.getAttribute('height')) || 700;

  // klonujemy SVG i ustawiamy explicit width/height — żeby renderer canvas wiedział
  const clone = svg.cloneNode(true);
  clone.setAttribute('xmlns','http://www.w3.org/2000/svg');
  clone.setAttribute('width', W);
  clone.setAttribute('height', H);
  if(!clone.getAttribute('viewBox')) clone.setAttribute('viewBox', `0 0 ${W} ${H}`);

  const xml = new XMLSerializer().serializeToString(clone);
  const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
  const img = new Image();
  await new Promise((res, rej)=>{ img.onload = res; img.onerror = rej; img.src = dataUrl; });

  const canvas = document.createElement('canvas');
  canvas.width  = Math.round(W * scale);
  canvas.height = Math.round(H * scale);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f5f1e8';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // przywróć widok użytkownika
  if(view && view !== oldView){
    STATE.previewView = oldView;
    renderPreview();
  }
  return new Promise(res => canvas.toBlob(b => res(b), 'image/png'));
}

// ────────────────────────────────────────────────────────────
//  SUBMIT — wysyłka do /api/send (multipart/form-data)
// ────────────────────────────────────────────────────────────
async function submitOrder(){
  const ref = 'ZT-2026-' + String(Math.floor(Math.random()*90000)+10000);
  const spec = buildOrderSpec(ref);
  try{ window.__projLink = location.origin + location.pathname + '#p=' + await encodeProject(); }catch(e){ window.__projLink = ''; }
  const html = buildSpecHTML(ref);
  const fd = new FormData();
  fd.append('ref', ref);
  fd.append('payload', JSON.stringify(spec));
  fd.append('html', html);
  fd.append('email', spec.customer.email || '');
  fd.append('phone', spec.customer.phone || '');
  fd.append('name', spec.customer.name || '');
  try{ const code = await encodeProject(); spec.project_link = location.origin + location.pathname + '#p=' + code; fd.set('payload', JSON.stringify(spec)); }catch(e){}
  fd.append('subject', `Nowe zamówienie ${ref} — ${spec.furniture.type}, ${spec.furniture.dimensions_mm.w}×${spec.furniture.dimensions_mm.h}×${spec.furniture.dimensions_mm.d} mm`);
  (window.__attachments||[]).forEach((f,i)=> fd.append('files', f, f.name));
  // doczep podgląd mebla — widok frontu i widok otwarty
  try {
    var docImgs = window.__docImgs = {};
    const pngFront = await renderViewToPNG('front');
    if(pngFront){ fd.append('files', pngFront, `${ref}-preview-front.png`); docImgs.front = pngFront; }
    const pngOpen = await renderViewToPNG('open');
    if(pngOpen){ fd.append('files', pngOpen, `${ref}-preview-open.png`); docImgs.open = pngOpen; }
    // render 3D
    if(window.ZT3D){
      const prevView = STATE.previewView;
      const prevFronts = window.__v3dShowFronts;
      STATE.previewView = '3d';
      applyViewMode();
      await new Promise(r=>setTimeout(r, 700));
      // 1) izometryk z frontami — "jak będzie wyglądać"
      window.__v3dShowFronts = true;
      window.ZT3D.update();
      await new Promise(r=>setTimeout(r, 350));
      const pngIsoFront = await window.ZT3D.toIsoPNG();
      if(pngIsoFront){ fd.append('files', pngIsoFront, `${ref}-3d-front-izo.png`); docImgs.iso = pngIsoFront; }
      // 2) izometryk bez frontów — układ wnętrza
      window.__v3dShowFronts = false;
      window.ZT3D.update();
      await new Promise(r=>setTimeout(r, 350));
      const pngIsoOpen = await window.ZT3D.toIsoPNG();
      if(pngIsoOpen){ fd.append('files', pngIsoOpen, `${ref}-3d-wnetrze-izo.png`); docImgs.isoOpen = pngIsoOpen; }
      // 3) perspektywa
      const png3d = await window.ZT3D.toPNG();
      if(png3d) fd.append('files', png3d, `${ref}-3d-perspektywa.png`);
      window.__v3dShowFronts = prevFronts;
      STATE.previewView = prevView;
      applyViewMode();
      renderPreview();
    }
    // szkic wnęki narysowany przez klienta
    const sk = window.__sketch;
    if(sk && sk.dataUrl){
      const blob = await (await fetch(sk.dataUrl)).blob();
      fd.append('files', blob, `${ref}-szkic-wneki.png`);
    }
  } catch(e) {
    console.warn('Preview render failed (ignoring):', e);
  }

  // dokumenty: instrukcja montażu (dla Ciebie — wysyłasz z zamówieniem) + potwierdzenie dla klienta
  try{
    const toURL = b => new Promise(r=>{ const fr = new FileReader(); fr.onload = ()=>r(fr.result); fr.onerror = ()=>r(null); fr.readAsDataURL(b); });
    const src = window.__docImgs || {}, imgs = {};
    for(const k of Object.keys(src)) imgs[k] = await toURL(src[k]);
    if(window.ZTDocs){
      const instr = window.ZTDocs.buildInstructionHTML(ref, imgs);
      fd.append('files', new Blob([instr], {type:'text/html'}), `${ref}-instrukcja-montazu.html`);
      window.__confirmHTML = window.ZTDocs.buildConfirmationHTML(ref, imgs);
    }
  }catch(e){ console.warn('Docs build failed (ignoring):', e); }

  const btn = document.getElementById('btnNext');
  const lbl = document.getElementById('btnNextLabel');
  const prevLbl = lbl ? lbl.textContent : '';
  if(btn){ btn.disabled = true; if(lbl) lbl.textContent = 'Wysyłanie…'; }

  try{
    const res = await fetch('/api/send', { method:'POST', body: fd });
    if(!res.ok){ throw new Error('HTTP '+res.status); }
    // success
    document.getElementById('successRef').textContent = ref;
    document.getElementById('success').classList.add('show');
    window.__attachments = [];
    try{ localStorage.removeItem(STORAGE_KEY); }catch(e){}
  }catch(err){
    toast('Nie udało się wysłać. Spróbuj ponownie lub napisz na kontakt@zabudujto.pl');
    console.error('Submit error:', err);
  }finally{
    if(btn){ btn.disabled = false; if(lbl) lbl.textContent = prevLbl; }
  }
}

// ────────────────────────────────────────────────────────────
//  SUMMARY
// ────────────────────────────────────────────────────────────
function renderSummary(){
  const {w,h,d} = STATE.dim;
  const frontMode = STATE.frontMode==='sliding' ? 'Drzwi przesuwne' : 'Fronty uchylne';
  const handleDef = HANDLES.find(h=>h.id===STATE.handle) || HANDLES[0];
  const matC = MATERIALS.find(m=>m.id===STATE.material) || MATERIALS[0];
  const matF = STATE.splitFront ? (MATERIALS.find(m=>m.id===STATE.materialFront)||matC) : matC;
  const accActive = STATE.accessories.oswietlenie ? 'LED w profilu (GTV)' : '—';
  const baseTxt = (()=>{
    if(STATE.base==='cokol') return 'Na cokole 100 mm';
    if(STATE.base==='podloga') return 'Bezpośrednio na podłodze';
    if(STATE.base==='wiszacy') return 'Wiszący (na stelażu)';
    if(STATE.base==='nozki' && typeof LEGS!=='undefined'){
      const l = LEGS.find(x=>x.id===STATE.leg) || LEGS[0];
      if(!l) return 'Na nóżkach';
      const colTxt = (l.colors && l.colors.length>1 && typeof LEG_COLORS!=='undefined' && LEG_COLORS[STATE.legColor])
        ? `, ${LEG_COLORS[STATE.legColor].name.toLowerCase()}`
        : (l.colors && l.colors[0] && typeof LEG_COLORS!=='undefined' && LEG_COLORS[l.colors[0]] ? `, ${LEG_COLORS[l.colors[0]].name.toLowerCase()}` : '');
      return `${l.brand} — H${l.h} mm${colTxt}`;
    }
    return '—';
  })();

  // ── per-section block
  const sectionsHtml = STATE.sections.map((s,i)=>{
    const front = STATE.frontMode==='sliding' ? null : STATE.sectionFronts[i];
    const items = s.items.map(it=>{
      const t = ITEM_TYPES[it.type]; if(!t) return null;
      const v = (it.variant && t.variants) ? t.variants.find(x=>x.id===it.variant) : null;
      return `<li><span class="ss-it-name">${t.name}${v?` <span class="ss-it-var">${v.name}</span>`:''}${it.type==='szuflada' && it.internal?` <span class="ss-it-var">wewn.</span>`:''}</span><span class="ss-it-h mono">${it.h} mm</span></li>`;
    }).filter(Boolean).join('');
    const frontBadge = STATE.frontMode==='sliding'
      ? ''
      : `<span class="ss-front-badge ${front?'on':'off'}">${front?'z frontem':'otwarta'}</span>`;
    return `
      <div class="ss-sec">
        <div class="ss-sec-head">
          <span class="ss-sec-idx mono">S${i+1}</span>
          <span class="ss-sec-w mono">${s.w} mm</span>
          ${s.lift?`<span class="ss-sec-w mono" style="color:var(--clay)">↑${s.lift} mm</span>`:''}
          ${frontBadge}
        </div>
        <ul class="ss-items">${items}</ul>
      </div>`;
  }).join('');

  // ── fronts detail
  let frontsBlock = '';
  if(STATE.frontMode==='hinged'){
    const hinge = HINGES.find(h=>h.id===STATE.hinges) || HINGES[0];
    frontsBlock = `
      <div class="ss-kv"><span class="ss-k">System</span><span class="ss-v">${frontMode}</span></div>
      <div class="ss-kv"><span class="ss-k">Zawiasy</span><span class="ss-v">${hinge.name}${hinge.brand?` <span class="ss-sub">· ${hinge.brand}</span>`:''}</span></div>`;
  } else {
    const prof = SLIDING_PROFILES.find(p=>p.id===STATE.slidingProfile) || SLIDING_PROFILES[0];
    const hw = SLIDING_COLORS.find(c=>c.id===STATE.slidingProfileColor) || SLIDING_COLORS[0];
    // wypełnienie (jeśli ramowy)
    let fillTxt = '';
    if(prof.divisible){
      const sp = STATE.slidingSplits || {count:2, fills:['plyta','plyta']};
      const names = sp.fills.slice(0,sp.count).map(fid=>{
        const f = (typeof SLIDING_FILLS!=='undefined') ? SLIDING_FILLS.find(x=>x.id===fid) : null;
        return f ? f.name.toLowerCase() : fid;
      });
      fillTxt = `${sp.count} pasy: ${names.join(' / ')}`;
    } else if(prof.fillable){
      const f = (typeof SLIDING_FILLS!=='undefined') ? SLIDING_FILLS.find(x=>x.id===STATE.slidingFill) : null;
      fillTxt = f ? f.name : '—';
    } else {
      fillTxt = 'tylko płyta';
    }
    frontsBlock = `
      <div class="ss-kv"><span class="ss-k">System</span><span class="ss-v">${frontMode}</span></div>
      <div class="ss-kv"><span class="ss-k">Profil</span><span class="ss-v">${prof.name}${prof.brand?` <span class="ss-sub">· ${prof.brand}</span>`:''}</span></div>
      <div class="ss-kv"><span class="ss-k">Kolor profilu</span><span class="ss-v"><span class="ss-hw-dot" style="background:linear-gradient(135deg,${hw.sample} 0%,${hw.edge} 100%)"></span>${hw.name}</span></div>
      <div class="ss-kv"><span class="ss-k">Wypełnienie</span><span class="ss-v">${fillTxt}</span></div>`;
  }

  // ── material chip
  const matChip = (m)=>{
    const sw = m.image
      ? `<img src="${m.image}" alt=""/>`
      : `<span style="background:${m.color||'#cdc6b4'};width:100%;height:100%;display:block"></span>`;
    return `<span class="ss-mat-chip"><span class="ss-mat-sw">${sw}</span><span class="ss-mat-txt"><span class="ss-mat-name">${m.name}</span><span class="ss-mat-code mono">${m.code}</span></span></span>`;
  };
  const mdfRow = mdfOn() ? '<div class="ss-kv"><span class="ss-k">Fronty</span><span class="ss-v"><span class="ss-hw-dot" style="background:'+mdfInfo().hex+'"></span>'+mdfLabel()+' <span class="ss-sub">· +1 tydzień realizacji</span></span></div>' : '';
  const materialBlock = mdfOn()
    ? '<div class="ss-kv"><span class="ss-k">Korpus</span><span class="ss-v">'+matChip(matC)+'</span></div>'+mdfRow
    : STATE.splitFront
    ? `<div class="ss-kv"><span class="ss-k">Korpus</span><span class="ss-v">${matChip(matC)}</span></div>
       <div class="ss-kv"><span class="ss-k">Fronty</span><span class="ss-v">${matChip(matF)}</span></div>`
    : `<div class="ss-kv"><span class="ss-k">Dekor</span><span class="ss-v">${matChip(matC)}</span></div>`;

  const pb = priceBreakdown();
  const price = pb.total;
  document.getElementById('sumCard').innerHTML = `
    <div class="ss-grid">
      <div class="ss-block">
        <div class="ss-block-h">Mebel</div>
        <div class="ss-kv"><span class="ss-k">Typ</span><span class="ss-v">${STATE.typeName}</span></div>
        <div class="ss-kv"><span class="ss-k">Wnęka</span><span class="ss-v mono">${STATE.dim.w} × ${STATE.dim.h} × ${d} mm</span></div>
        <div class="ss-kv"><span class="ss-k">Korpus mebla</span><span class="ss-v mono">${cabinetW()} × ${cabinetH()} × ${d} mm</span></div>
        ${(STATE.slope&&STATE.slope.on)?`<div class="ss-kv"><span class="ss-k">Skośny sufit</span><span class="ss-v" style="color:var(--clay)">opada w ${STATE.slope.side==='right'?'prawo':'lewo'} · ${cabinetH()} → ${STATE.slope.hLow} mm${(STATE.slope.flat>0)?` · prosty ${STATE.slope.flat} mm`:''}</span></div>`:''}
        ${(STATE.notch&&STATE.notch.on)?`<div class="ss-kv"><span class="ss-k">Uskok / komin</span><span class="ss-v" style="color:var(--clay)">${STATE.notch.side==='left'?'lewa':'prawa'} ściana, od ${STATE.notch.from==='top'?'góry':'dołu'} · ${STATE.notch.w} × ${STATE.notch.h} × gł. ${STATE.notch.d||150} mm</span></div>`:''}
        <div class="ss-kv"><span class="ss-k">Osadzenie</span><span class="ss-v">${baseTxt}</span></div>
        ${STATE.band ? `<div class="ss-kv"><span class="ss-k">Przelotowa półka</span><span class="ss-v">${STATE.band.position==='top'?'Górna':'Dolna'} ${STATE.band.h} mm · sekcje ${STATE.band.from+1}–${STATE.band.to+1}</span></div>` : ''}
        ${(()=>{const b=STATE.blenda||{};const p=[];if(b.left)p.push(`lewa ${b.left}`);if(b.right)p.push(`prawa ${b.right}`);if(b.top)p.push(`górna ${b.top}`);return p.length?`<div class="ss-kv"><span class="ss-k">Blendy</span><span class="ss-v">${p.join(' · ')} mm</span></div>`:'';})()}
        ${STATE.uneven ? `<div class="ss-kv"><span class="ss-k">Ściany</span><span class="ss-v" style="color:var(--clay)">krzywe — kontakt techniczny</span></div>` : ''}
      </div>

      <div class="ss-block">
        <div class="ss-block-h">Fronty i okucia</div>
        ${frontsBlock}
        ${STATE.frontMode==='sliding' ? '' : `<div class="ss-kv"><span class="ss-k">Uchwyty</span><span class="ss-v">${handleDef.name}${(handleDef.colors && typeof HANDLE_COLORS!=='undefined' && HANDLE_COLORS[STATE.handleColor])?` — ${HANDLE_COLORS[STATE.handleColor].name.toLowerCase()}`:''}${handleDef.brand?` <span class="ss-sub">· ${handleDef.brand}</span>`:''}</span></div>`}
        <div class="ss-kv"><span class="ss-k">Oświetlenie</span><span class="ss-v">${accActive}</span></div>
      </div>

      <div class="ss-block">
        <div class="ss-block-h">Dekor płyty</div>
        ${materialBlock}
      </div>

      <div class="ss-block ss-sections-block">
        <div class="ss-block-h">Sekcje <span class="ss-block-h-n mono">${STATE.sections.length}</span></div>
        <div class="ss-sections">${sectionsHtml}</div>
      </div>

      <div class="ss-block ss-price-block">
        <div class="ss-block-h">Kosztorys (orientacyjnie)</div>
        <div class="ss-kv"><span class="ss-k">Materiał</span><span class="ss-v mono">${fmtPrice(pb.materialCost + pb.cuttingCost + pb.edgingCost + pb.laborCost + pb.backCost)}</span></div>
        ${pb.designCost ? `<div class="ss-kv"><span class="ss-k">Projekt</span><span class="ss-v mono">${fmtPrice(pb.designCost)}</span></div>` : ''}
        <div class="ss-kv"><span class="ss-k">Akcesoria</span><span class="ss-v mono">${fmtPrice(pb.accCost + pb.hardwareCost)}</span></div>
      </div>
    </div>

    <div class="sum-total">
      <div class="sum-vat-line"><span>Netto (bez VAT)</span><span class="mono">${fmtPrice(pb.netto)}</span></div>
      <div class="sum-brutto-line"><span class="k">Cena brutto (z VAT ${Math.round(pb.vat*100)}%)</span><span class="v">${fmtPrice(price)}</span></div>
    </div>
  `;
}

// ────────────────────────────────────────────────────────────
//  PRICE bar
// ────────────────────────────────────────────────────────────
function updatePrice(){
  const el = document.getElementById('priceTotal');
  el.classList.add('updating');
  const p = computePrice();
  setTimeout(()=>{
    el.innerHTML = fmtPrice(p) + ' <em>brutto</em>';
    el.classList.remove('updating');
  },120);
}

// ────────────────────────────────────────────────────────────
//  TOAST
// ────────────────────────────────────────────────────────────
let toastTimer;
function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>t.classList.remove('show'), 2600);
}

// ────────────────────────────────────────────────────────────
//  INIT + BINDINGS
// ────────────────────────────────────────────────────────────
function init(){
  STATE = loadState();
  renderStepper();
  renderTypes();
  bindDimensions();
  showStep(STATE.step);
  renderPreview();
  updatePrice();

  // preview tabs
  document.querySelectorAll('.prev-tab').forEach(t=>{
    t.classList.toggle('on', t.dataset.view===STATE.previewView);
    t.addEventListener('click',()=>{
      document.querySelectorAll('.prev-tab').forEach(x=>x.classList.remove('on'));
      t.classList.add('on');
      STATE.previewView = t.dataset.view;
      renderPreview(); saveState();
    });
  });
  // widok ustawia renderPreview() → applyViewMode(); nie wołamy tu drugi raz
  // przełączniki widoku 3D
  const v3f = document.getElementById('v3dFronts');
  if(v3f) v3f.addEventListener('click',()=>{
    const on = window.__v3dShowFronts !== true;
    window.__v3dShowFronts = on;
    v3f.classList.toggle('on', on);
    v3f.textContent = on ? 'Ukryj fronty' : 'Pokaż fronty';
    // fronty ON → blokada w izometryku; fronty OFF → swobodny obrót wnętrza
    if(window.ZT3D){
      window.ZT3D.update();
      window.ZT3D.setIso(on);
    }
    const hint = document.querySelector('.view3d-hint');
    if(hint) hint.textContent = on
      ? 'Widok izometryczny — obrót zablokowany'
      : 'Przeciągnij, aby obrócić · kółko = zoom';
  });

  // lead
  const leadKeys = ['name','email','phone','city','notes'];
  leadKeys.forEach(k=>{
    const id = 'lead'+k[0].toUpperCase()+k.slice(1);
    const el = document.getElementById(id);
    if(!el) return;
    el.value = STATE.lead[k] || '';
    el.addEventListener('input',()=>{ STATE.lead[k] = el.value; saveState(); });
  });
  initFileUpload();
  initSketch();
  const cons = document.getElementById('leadConsent');
  cons.checked = !!STATE.lead.consent;
  cons.addEventListener('change',()=>{ STATE.lead.consent = cons.checked; saveState(); });
  const reg = document.getElementById('leadRegulations');
  if(reg){
    reg.checked = !!STATE.lead.regulations;
    reg.addEventListener('change',()=>{ STATE.lead.regulations = reg.checked; saveState(); });
  }

  // lighting
  const lt = document.querySelector('.acc-row[data-acc="oswietlenie"]');
  if(STATE.accessories.oswietlenie) lt.classList.add('on');
  lt.addEventListener('click',()=>{
    STATE.accessories.oswietlenie = !STATE.accessories.oswietlenie;
    lt.classList.toggle('on');
    updatePrice(); saveState();
  });

  // back / next
  document.getElementById('btnBack').addEventListener('click',()=>goToStep(STATE.step-1));
  document.getElementById('btnNext').addEventListener('click',()=>{
    if(STATE.step===2){
      if(!STATE.dim.w||!STATE.dim.h||!STATE.dim.d){ toast('Uzupełnij wszystkie wymiary'); return; }
    }
    if(STATE.step===3){
      const sum = STATE.sections.reduce((a,s)=>a+s.w,0);
      if(Math.abs(sum-usableInternalW())>20){ toast('Suma szerokości sekcji nie zgadza się z użyteczną szerokością wnętrza'); return; }
    }
    if(STATE.step===5){
      if(!STATE.lead.name){ toast('Podaj imię i nazwisko'); return; }
      if(!STATE.lead.email && !STATE.lead.phone){ toast('Podaj e-mail lub telefon'); return; }
      if(!STATE.lead.consent){ toast('Zaznacz zgodę RODO'); return; }
      if(!STATE.lead.regulations){ toast('Zaakceptuj Regulamin i Politykę prywatności'); return; }
      submitOrder();
      return;
    }
    goToStep(STATE.step+1);
  });

  // add section
  document.getElementById('addSection').addEventListener('click',()=>{
    if(STATE.sections.length>=8){ toast('Maks. 8 sekcji'); return; }
    STATE.sections.push({w:300, items:[
      {type:'polka',h:400},{type:'polka',h:400},{type:'polka',h:400},{type:'polka',h:400},{type:'polka',h:400}
    ]});
    STATE.sectionFronts.push(true);
    balanceSectionWidths();
    renderSections(); renderPreview(); updatePrice(); saveState();
  });

  renderLegPicker();
  bindBaseCards();

  document.getElementById('resetBtn').addEventListener('click',()=>{
    if(confirm('Zacząć od nowa? Stracisz obecne wybory.')){
      try{ localStorage.removeItem(STORAGE_KEY); }catch(e){}
      location.reload();
    }
  });

  // URL preset (?typ=…)
  const params = new URLSearchParams(location.search);
  if(params.get('typ')){
    const t = params.get('typ');
    if(TYPES.find(x=>x.id===t)){
      const card = document.querySelectorAll('.type-card')[TYPES.findIndex(x=>x.id===t)];
      if(card) card.click();
    }
  }
}
function bindBaseCards(){
  document.querySelectorAll('.base-card').forEach(c=>{
    c.classList.toggle('sel', c.dataset.base===STATE.base);
    c.addEventListener('click',()=>{
      if(c.hidden) return;
      STATE.base = c.dataset.base;
      document.querySelectorAll('.base-card').forEach(x=>x.classList.toggle('sel', x.dataset.base===STATE.base));
      renderLegPicker();
      renderSections(); renderPreview(); updatePrice(); saveState();
    });
  });
  syncBaseVisibility();
}
function syncBaseVisibility(){
  // wiszący tylko dla łazienki; podłoga ukryta dla łazienki
  const isBath = STATE.type==='lazienka';
  const podCard = document.querySelector('.base-card[data-base="podloga"]');
  const wisCard = document.querySelector('.base-card[data-base="wiszacy"]');
  if(podCard) podCard.hidden = isBath;
  if(wisCard) wisCard.hidden = !isBath;
  if(isBath && STATE.base==='podloga'){ STATE.base='wiszacy'; }
  if(!isBath && STATE.base==='wiszacy'){ STATE.base='podloga'; }
  document.querySelectorAll('.base-card').forEach(x=>x.classList.toggle('sel', x.dataset.base===STATE.base));
}
// ── Link do projektu — stan zapisany w samym adresie (#p=…) ──
async function b64urlFromBytes(bytes){
  let s = ''; const ch = 0x8000;
  for(let i=0;i<bytes.length;i+=ch) s += String.fromCharCode.apply(null, bytes.subarray(i,i+ch));
  return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function bytesFromB64url(str){
  const b = atob(str.replace(/-/g,'+').replace(/_/g,'/'));
  const out = new Uint8Array(b.length);
  for(let i=0;i<b.length;i++) out[i] = b.charCodeAt(i);
  return out;
}
async function encodeProject(){
  const snap = JSON.parse(JSON.stringify(STATE));
  snap.lead = {name:'',email:'',phone:'',city:'',notes:'',consent:false};   // bez danych osobowych
  const json = new TextEncoder().encode(JSON.stringify(snap));
  if(window.CompressionStream){
    const cs = new Blob([json]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    const buf = new Uint8Array(await new Response(cs).arrayBuffer());
    return 'z' + await b64urlFromBytes(buf);
  }
  return 'j' + await b64urlFromBytes(json);
}
async function decodeProject(code){
  const kind = code[0], bytes = bytesFromB64url(code.slice(1));
  let json;
  if(kind === 'z'){
    const ds = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    json = await new Response(ds).text();
  } else json = new TextDecoder().decode(bytes);
  return JSON.parse(json);
}
async function copyProjectLink(){
  try{
    const code = await encodeProject();
    const url = location.origin + location.pathname + '#p=' + code;
    try{ await navigator.clipboard.writeText(url); toast('Link do projektu skopiowany — otworzysz go na dowolnym urządzeniu'); }
    catch(e){ window.prompt('Skopiuj link do projektu:', url); }
    return url;
  }catch(e){ console.error(e); toast('Nie udało się utworzyć linku'); return null; }
}
async function bootstrap(){
  const m = location.hash.match(/^#p=([A-Za-z0-9_-]+)/);
  if(m){
    try{
      const st = await decodeProject(m[1]);
      if(st && st.dim){ localStorage.setItem(STORAGE_KEY, JSON.stringify(st)); }
    }catch(e){ console.error('Link projektu uszkodzony', e); }
    history.replaceState(null, '', location.pathname + location.search);
    setTimeout(()=>toast('Wczytano projekt z linku'), 600);
  }
  init();
  const lb = document.getElementById('linkBtn');
  if(lb) lb.addEventListener('click', copyProjectLink);
  const cp = document.getElementById('confirmPdfBtn');
  if(cp) cp.addEventListener('click', ()=>{ if(window.__confirmHTML && window.ZTDocs) window.ZTDocs.printDoc(window.__confirmHTML); });
}
document.addEventListener('DOMContentLoaded', bootstrap);
