// ZabudujTO — dokumenty: potwierdzenie dla klienta (PDF przez druk) + instrukcja montażu
(function(){
  const esc = s => String(s==null?'':s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const zl = n => new Intl.NumberFormat('pl-PL').format(Math.round(n||0)) + ' zł';
  const COMPANY = { name:'ZabudujTO', web:'zabudujto.pl', mail:'kontakt@zabudujto.pl' };

  const BASE_CSS = `
    @page{size:A4;margin:14mm}
    *{box-sizing:border-box}
    body{font-family:Inter,system-ui,sans-serif;color:#1a1a17;margin:0;font-size:11pt;line-height:1.5;background:#fff}
    .doc{max-width:186mm;margin:0 auto;padding:10mm 0}
    h1{font-family:'Instrument Serif',Georgia,serif;font-weight:400;font-size:26pt;margin:0 0 2mm;line-height:1.05}
    h1 em{color:#b8915a}
    h2{font-family:'Instrument Serif',Georgia,serif;font-weight:400;font-size:16pt;margin:8mm 0 3mm;padding-bottom:1.5mm;border-bottom:1px solid #d9d3c4;break-after:avoid}
    h3{font-size:11pt;margin:4mm 0 1.5mm;break-after:avoid}
    .mono{font-family:'JetBrains Mono',ui-monospace,monospace}
    .head{display:flex;justify-content:space-between;align-items:flex-start;gap:8mm;padding-bottom:4mm;border-bottom:2px solid #1a1a17}
    .brand{font-family:'Instrument Serif',Georgia,serif;font-size:18pt}
    .meta{text-align:right;font-size:9pt;color:#6a6a62}
    .meta strong{color:#1a1a17;font-size:11pt}
    table{width:100%;border-collapse:collapse;font-size:9.5pt;margin:2mm 0}
    th,td{padding:1.6mm 2.2mm;border-bottom:1px solid #e6e0d0;text-align:left;vertical-align:top}
    th{font-family:'JetBrains Mono',monospace;font-size:7.5pt;letter-spacing:.06em;text-transform:uppercase;color:#6a6a62;font-weight:500;background:#f5f1e8}
    td.n{text-align:right;white-space:nowrap;font-family:'JetBrains Mono',monospace}
    .kv td:first-child{color:#6a6a62;width:38%}
    .imgs{display:grid;grid-template-columns:1fr 1fr;gap:4mm;margin:2mm 0}
    .imgs figure{margin:0;border:1px solid #e6e0d0;padding:2mm;break-inside:avoid}
    .imgs img{width:100%;height:auto;display:block}
    .imgs figcaption{font-size:8pt;color:#6a6a62;margin-top:1mm;font-family:'JetBrains Mono',monospace}
    .total{display:flex;justify-content:space-between;align-items:baseline;background:#1a1a17;color:#f5f1e8;padding:3mm 4mm;margin-top:3mm}
    .total .v{font-family:'Instrument Serif',Georgia,serif;font-size:18pt;color:#b8915a}
    .note{font-size:8.5pt;color:#6a6a62;margin-top:2mm}
    .warn{background:#f3ecd9;padding:2.5mm 3.5mm;font-size:9pt;margin:2mm 0;break-inside:avoid}
    .step{display:grid;grid-template-columns:10mm 1fr;gap:3mm;margin:3mm 0;break-inside:avoid}
    .step-n{width:9mm;height:9mm;border-radius:50%;background:#1a1a17;color:#f5f1e8;display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-size:10pt}
    .step p{margin:0 0 1.5mm}
    .step ul{margin:0 0 1mm;padding-left:5mm}
    .tools{columns:2;column-gap:8mm;padding-left:5mm;margin:1mm 0}
    .foot{margin-top:8mm;padding-top:3mm;border-top:1px solid #d9d3c4;font-size:8.5pt;color:#6a6a62;display:flex;justify-content:space-between}
    .pb{break-before:page}
    @media screen{body{background:#ede7d6}.doc{background:#fff;padding:12mm;margin:8mm auto;box-shadow:0 8px 30px rgba(0,0,0,.08)}}
  `;
  const FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com"/><link href="https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet"/>';

  function header(title, ref){
    const d = new Date().toLocaleDateString('pl-PL', {day:'2-digit', month:'long', year:'numeric'});
    return `<div class="head"><div><div class="brand">${COMPANY.name}</div><div class="note" style="margin:0">${COMPANY.web} · ${COMPANY.mail}</div></div>
      <div class="meta">${esc(title)}<br><strong class="mono">${esc(ref)}</strong><br>${d}</div></div>`;
  }
  function footer(ref){
    return `<div class="foot"><span>${COMPANY.name} · ${COMPANY.web}</span><span class="mono">${esc(ref)}</span></div>`;
  }
  function imgsBlock(imgs, keys){
    const lbl = {front:'Widok z frontami', open:'Wnętrze', iso:'Widok 3D', isoOpen:'Wnętrze 3D'};
    const fig = keys.filter(k=>imgs && imgs[k]).map(k=>`<figure><img src="${imgs[k]}" alt=""/><figcaption>${lbl[k]}</figcaption></figure>`).join('');
    return fig ? `<div class="imgs">${fig}</div>` : '';
  }

  // ── POTWIERDZENIE DLA KLIENTA ─────────────────────────────
  function buildConfirmationHTML(ref, imgs){
    const s = buildOrderSpec(ref);
    const f = s.furniture, p = s.pricing;
    const secs = f.sections.map(sec=>`<tr><td class="mono">S${sec.idx}</td><td class="n">${sec.w} mm</td><td>${esc(sec.front)}</td><td>${sec.items.map(esc).join('<br>')}</td></tr>`).join('');
    const acc = (p.accessories_list||[]).map(r=>`<tr><td>${esc(r.name)}${r.brand?` <span style="color:#6a6a62">· ${esc(r.brand)}</span>`:''}</td><td class="n">${r.qty}</td></tr>`).join('');
    const fr = s.fronts;
    const frontTxt = fr.mode === 'Drzwi przesuwne'
      ? `${esc(fr.mode)} — ${esc(fr.system)}, ${esc(fr.color)}, wypełnienie: ${esc(fr.fill)}`
      : `${esc(fr.mode)} — ${esc(fr.hinges)}; uchwyty: ${esc(fr.handle)}${fr.handle_color?' ('+esc(fr.handle_color)+')':''}`;
    const mat = (typeof mdfOn==='function' && mdfOn()) ? `Korpus: ${esc(s.materials.corpus.name)} ${esc(s.materials.corpus.code)}<br>Fronty: ${esc(mdfLabel())}`
      : `Korpus: ${esc(s.materials.corpus.name)} ${esc(s.materials.corpus.code)}<br>Fronty: ${s.materials.fronts==='same as corpus' ? 'jak korpus' : esc(s.materials.fronts.name+' '+s.materials.fronts.code)}`;
    const extras = [f.slope && f.slope!=='—' ? 'Skos: '+esc(f.slope) : '', f.notch && f.notch!=='—' ? 'Uskok: '+esc(f.notch) : '', f.band && f.band!=='—' ? 'Półka przelotowa: '+esc(f.band) : '', f.blenda && f.blenda!=='—' ? 'Blendy: '+esc(f.blenda) : ''].filter(Boolean).join('<br>');
    return `<!DOCTYPE html><html lang="pl"><head><meta charset="UTF-8"/><title>Potwierdzenie ${esc(ref)}</title>${FONTS}<style>${BASE_CSS}</style></head><body><div class="doc">
      ${header('Potwierdzenie zgłoszenia', ref)}
      <h1 style="margin-top:6mm">Twój projekt <em>dotarł do nas.</em></h1>
      <p>Dziękujemy, ${esc(s.customer.name||'')}. Sprawdzimy projekt i w ciągu <strong>48 godzin</strong> wyślemy finalną wycenę na ${esc(s.customer.email || s.customer.phone || 'podany kontakt')}. Poniżej podsumowanie tego, co zaprojektowałeś.</p>
      ${imgsBlock(imgs, ['front','iso'])}
      <h2>Mebel</h2>
      <table class="kv">
        <tr><td>Typ zabudowy</td><td>${esc(f.type)}</td></tr>
        <tr><td>Wymiary wnęki</td><td class="mono">${f.niche_mm ? `${f.niche_mm.w} × ${f.niche_mm.h} × ${f.niche_mm.d} mm` : `${f.dimensions_mm.w} × ${f.dimensions_mm.h} × ${f.dimensions_mm.d} mm`}</td></tr>
        <tr><td>Osadzenie</td><td>${esc(f.base)}</td></tr>
        <tr><td>Materiał</td><td>${mat}</td></tr>
        <tr><td>Fronty</td><td>${frontTxt}</td></tr>
        ${extras ? `<tr><td>Wnęka / dodatki</td><td>${extras}</td></tr>` : ''}
        <tr><td>Oświetlenie LED</td><td>${s.accessories.lighting_led?'tak':'nie'}</td></tr>
      </table>
      <h2>Układ sekcji</h2>
      <table><thead><tr><th>Sekcja</th><th>Szer.</th><th>Front</th><th>Wyposażenie</th></tr></thead><tbody>${secs}</tbody></table>
      ${acc ? `<h2>Akcesoria i okucia</h2><table><thead><tr><th>Pozycja</th><th style="text-align:right">Ilość</th></tr></thead><tbody>${acc}</tbody></table>` : ''}
      <div class="total"><span>Cena orientacyjna brutto</span><span class="v">${zl(p.total_gross)}</span></div>
      <p class="note">Cena orientacyjna z konfiguratora (netto ${zl(p.total_net)}, VAT ${Math.round((p.vat_rate||0.23)*100)}%). Wiążąca cena zostanie potwierdzona po weryfikacji projektu. Transport wyceniany osobno.</p>
      <h2>Kontakt</h2>
      <p>Pytania do zgłoszenia <span class="mono">${esc(ref)}</span>: <strong>${COMPANY.mail}</strong> · ${COMPANY.web}</p>
      ${footer(ref)}
    </div></body></html>`;
  }

  // ── INSTRUKCJA MONTAŻU ─────────────────────────────────────
  function buildInstructionHTML(ref, imgs){
    const s = buildOrderSpec(ref);
    const f = s.furniture;
    const cut = buildCutList();
    const secs = STATE.sections;
    const has = type => secs.some(sec=>sec.items.some(it=>it.type===type));
    const hasVariant = (type, v) => secs.some(sec=>sec.items.some(it=>it.type===type && it.variant===v));
    const hinged = STATE.frontMode === 'hinged' && STATE.sectionFronts.some(Boolean);
    const sliding = STATE.frontMode === 'sliding';
    const bl = STATE.blenda || {};
    const anyBl = bl.left || bl.right || bl.top;
    const parts = secs.map((_,i)=> (typeof sectionParts==='function') ? sectionParts(i) : [0]);
    const anySplit = parts.some(p=>p.length>1);

    // oznaczenia formatek
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let li = 0;
    const pieceRows = cut.pieces.map(p=>{
      const code = (letters[Math.floor(li/9)] || 'Z') + ((li%9)+1); li++;
      return `<tr><td class="mono"><strong>${code}</strong></td><td>${esc(p.name)}</td><td class="n">${p.w} × ${p.h}</td><td class="n">${p.qty}</td></tr>`;
    }).join('');

    const steps = [];
    const step = (title, body) => steps.push({title, body});

    step('Przygotowanie i oznaczenie formatek', `<p>Rozpakuj formatki na czystej, miękkiej powierzchni (karton, koc), żeby nie porysować okleiny. Sprawdź liczbę sztuk z tabelą na końcu instrukcji.</p>
      <ul><li>Oznacz każdą formatkę ołówkiem lub taśmą malarską <strong>na krawędzi, która będzie niewidoczna</strong> (tył lub spód) — kodem z tabeli.</li>
      <li>Rozłóż elementy szafkami: ${secs.map((s,i)=>`S${i+1}`).join(', ')}.</li>
      <li>Łączniki i okucia znajdziesz w zestawie — posegreguj je przed montażem.</li></ul>`);

    step('Skręcanie korpusów szafek', `<p>Każda sekcja to <strong>osobna szafka</strong> z własnymi bokami. Skręcaj je pojedynczo, na leżąco (plecami do góry).</p>
      <ul><li>Połącz <strong>wieniec dolny</strong> z oboma bokami, potem <strong>wieniec górny</strong>. Wieńce wchodzą między boki.</li>
      <li>Użyj łączników z zestawu — dokręcaj z wyczuciem, bez wkrętarki na pełnej mocy.</li>
      <li>Sprawdź kąt prosty: przekątne korpusu muszą być równe (± 2 mm).</li></ul>
      ${anySplit ? `<div class="warn">Szafki wyższe niż 2 m składają się z <strong>dołu i nadstawki</strong> — skręć obie części osobno, a po postawieniu połącz je przez wieńce (łączniki z zestawu).</div>` : ''}`);

    step('Plecy HDF', `<ul><li>Przy każdej szafce przyłóż plecy HDF do tylnej krawędzi, wyrównaj do jednego narożnika.</li>
      <li>Przybij gwoździkami lub przykręć co ok. 15 cm, zaczynając od narożników. Plecy usztywniają szafkę — po ich montażu korpus musi być prostokątny.</li></ul>`);

    if(STATE.base === 'cokol') step('Cokół', `<ul><li>Zmontuj ramę cokołu i ustaw ją w miejscu zabudowy. Wypoziomuj podkładkami — <strong>poziom cokołu decyduje o równych frontach</strong>.</li><li>Listwę frontową cokołu montujesz na końcu (krok „Blendy i cokół").</li></ul>`);
    if(STATE.base === 'nozki') step('Nóżki', `<ul><li>Przykręć nóżki do spodu każdej szafki (po 4 sztuki, ok. 50–80 mm od krawędzi).</li><li>Po ustawieniu wyreguluj wysokość nóżek, aż szafki będą w poziomie.</li></ul>`);

    step('Ustawienie we wnęce i łączenie szafek', `<ul><li>Postaw szafki w kolejności ${secs.map((s,i)=>`S${i+1}`).join(' → ')}, od lewej.</li>
      <li>Między szafkami zostaw ok. <strong>1 mm luzu</strong>; wyrównaj przednie krawędzie i górę.</li>
      <li>Skręć sąsiednie boki ze sobą 3–4 łącznikami na wysokość (z zestawu).</li>
      <li><strong>Przykręć zabudowę do ściany</strong> kątownikami lub kołkami — zawsze, zwłaszcza w wysokich szafkach.</li>
      ${STATE.base==='wiszacy' ? '<li>Szafki wiszące montuj na listwie lub zawieszkach przykręconych do ściany nośnej — sprawdź poziom przed dokręceniem.</li>' : ''}
      ${(STATE.slope&&STATE.slope.on) ? '<li>Przy skosie zacznij od szafki przy wyższej ścianie — szafki pod skosem mają różne wysokości (sprawdź kody).</li>' : ''}</ul>`);

    if(has('polka')) step('Półki i podpórki', `<ul><li>Wkręć podpórki półek w otwory na odpowiedniej wysokości (wymiary z projektu poniżej).</li>
      <li>Połóż półki${hasVariant('polka','przegroda') ? '; przy półkach z przegródką najpierw wstaw pionową przegródkę i przykręć ją od spodu półki' : ''}.</li></ul>`);
    if(has('drazek')) step('Drążki', `<ul><li>Przykręć wsporniki drążka do boków szafki, ok. 5–6 cm od wieńca/półki nad drążkiem.</li><li>Załóż drążek i zablokuj go we wspornikach.${hasVariant('drazek','pantograf') ? ' Pantograf montuj według instrukcji producenta (GTV) — mocowanie do boków.' : ''}</li></ul>`);
    if(has('szuflada') || has('szuflady')) step('Szuflady i prowadnice', `<ul><li>Przykręć prowadnice do boków szafki — obie <strong>dokładnie na tej samej wysokości</strong> (użyj poziomicy lub wzornika).</li>
      <li>Złóż skrzynki szuflad według instrukcji producenta systemu, wsuń na prowadnice.</li><li>Fronty szuflad wyreguluj na końcu, razem z pozostałymi frontami.</li></ul>`);
    if(has('kosz') || has('pralka') || has('siedzisko')) step('Kosze, cargo i elementy specjalne', `<ul>${has('kosz')?'<li>Kosze i cargo montuj na prowadnicach według instrukcji producenta (GTV/REJS) dołączonej do akcesoriów.</li>':''}${has('siedzisko')?'<li>Siedzisko: przykręć płytę siedziska do boków od spodu, pod nim zamontuj półki lub szuflady z projektu.</li>':''}${has('pralka')?'<li>Miejsce na pralkę zostaje otwarte od dołu — sprawdź dostęp do zaworu i odpływu przed montażem półki nad pralką.</li>':''}</ul>`);
    if(STATE.accessories && STATE.accessories.oswietlenie) step('Oświetlenie LED', `<ul><li>Wklej profile LED przed montażem frontów, przewody poprowadź za plecami.</li><li>Podłączenie zasilacza do sieci zleć elektrykowi.</li></ul>`);

    if(hinged) step('Fronty i zawiasy', `<ul><li>Wciśnij puszki zawiasów w otwory frontów (fronty mają nawierty), przykręć prowadniki do boków szafek.</li>
      <li>Zawieś fronty na prowadnikach (zatrzask).</li>
      <li><strong>Regulacja:</strong> trzy śruby w zawiasie — góra/dół, lewo/prawo, głębokość. Ustaw równe szczeliny ok. 2–3 mm między frontami.</li>
      <li>Na koniec przykręć uchwyty (${esc(s.fronts.handle||'z projektu')}).</li></ul>`);
    if(sliding) step('Drzwi przesuwne', `<ul><li>Przykręć tor górny do wieńca lub sufitu, tor dolny do wieńca dolnego — tory muszą być <strong>równoległe i w jednej osi</strong>.</li>
      <li>Złóż skrzydła (profile + wkład) według instrukcji systemu ${esc(s.fronts.system||'')}, załóż wózki.</li>
      <li>Wstaw drzwi najpierw w tor górny, potem opuść na dolny. Wyreguluj wózki, aż drzwi przylegają równo do ścian.</li></ul>`);

    if(anyBl || STATE.base==='cokol') step('Blendy i cokół', `<ul>${anyBl?'<li>Blendy dopasuj do ściany (przy krzywych ścianach przytnij lub zeszlifuj krawędź od strony ściany) i przykręć do boków szafek od środka.</li>':''}${(STATE.slope&&STATE.slope.on&&anyBl)?'<li>Blendy pod skosem mają skośną górną krawędź — sprawdź kierunek przed montażem.</li>':''}${STATE.base==='cokol'?'<li>Listwę cokołu przykręć do ramy cokołu, cofniętą względem frontów.</li>':''}</ul>`);

    step('Kontrola końcowa', `<ul><li>Sprawdź, czy wszystkie fronty i szuflady otwierają się bez ocierania.</li><li>Dokręć łączniki po kilku dniach użytkowania (płyta „siada").</li><li>Usuń folie ochronne i przetrzyj okleinę wilgotną szmatką.</li></ul>`);

    const tools = ['Wkrętarka z kompletem bitów (PH2, PZ2, imbus)','Śrubokręt krzyżakowy','Poziomica (min. 60 cm)','Miarka zwijana','Ołówek i taśma malarska','Młotek (do pleców HDF)','Wiertarka udarowa + wiertła do ściany (kotwienie)','Kątownik stolarski','Druga osoba do pomocy przy wysokich elementach'];

    const secTable = secs.map((sec,i)=>`<tr><td class="mono">S${i+1}</td><td class="n">${sec.w} mm</td><td>${sec.items.map(it=>{ const t=ITEM_TYPES[it.type]; const v=(it.variant&&t&&t.variants)?t.variants.find(x=>x.id===it.variant):null; return esc((t?t.name:it.type)+(v?' — '+v.name:'')+' · '+it.h+' mm'); }).join('<br>')}</td></tr>`).join('');

    return `<!DOCTYPE html><html lang="pl"><head><meta charset="UTF-8"/><title>Instrukcja montażu ${esc(ref)}</title>${FONTS}<style>${BASE_CSS}</style></head><body><div class="doc">
      ${header('Instrukcja montażu', ref)}
      <h1 style="margin-top:6mm">Instrukcja <em>montażu.</em></h1>
      <p>${esc(f.type)} · wnęka <span class="mono">${f.niche_mm ? `${f.niche_mm.w} × ${f.niche_mm.h} × ${f.niche_mm.d}` : ''} mm</span> · ${secs.length} ${secs.length===1?'szafka':(secs.length<5?'szafki':'szafek')}. Czas montażu: ok. ${Math.max(3, secs.length*2)}–${Math.max(5, secs.length*3)} h dla dwóch osób.</p>
      ${imgsBlock(imgs, ['front','open'])}
      <h2>Narzędzia</h2>
      <ul class="tools">${tools.map(t=>`<li>${t}</li>`).join('')}</ul>
      <p class="note">Łączniki i okucia do montażu są dołączone do zestawu.</p>
      <div class="warn"><strong>Bezpieczeństwo:</strong> wysokie szafki zawsze przykręcaj do ściany. Montuj we dwie osoby. Nie stawaj na półkach ani szufladach.</div>
      <h2>Montaż krok po kroku</h2>
      ${steps.map((st,i)=>`<div class="step"><div class="step-n">${i+1}</div><div><h3>${st.title}</h3>${st.body}</div></div>`).join('')}
      <h2 class="pb">Układ wnętrza</h2>
      ${imgsBlock(imgs, ['isoOpen','iso'])}
      <table><thead><tr><th>Szafka</th><th>Szer. wnętrza</th><th>Wyposażenie (od góry)</th></tr></thead><tbody>${secTable}</tbody></table>
      <h2>Lista formatek i oznaczenia</h2>
      <p class="note">Oznacz każdą formatkę kodem z pierwszej kolumny przed rozpoczęciem montażu.</p>
      <table><thead><tr><th>Kod</th><th>Element</th><th style="text-align:right">Wymiar [mm]</th><th style="text-align:right">Szt.</th></tr></thead><tbody>${pieceRows}</tbody></table>
      ${footer(ref)}
    </div></body></html>`;
  }

  function printDoc(html){
    const w = window.open('', '_blank');
    if(!w){ alert('Zezwól na wyskakujące okna, żeby pobrać PDF.'); return; }
    w.document.open(); w.document.write(html); w.document.close();
    const go = ()=>{ try{ w.focus(); w.print(); }catch(e){} };
    if(w.document.readyState === 'complete') setTimeout(go, 600);
    else w.addEventListener('load', ()=>setTimeout(go, 400));
  }

  window.ZTDocs = { buildConfirmationHTML, buildInstructionHTML, printDoc };
})();
