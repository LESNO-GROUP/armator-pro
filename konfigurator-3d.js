// ZabudujTO — wizualizacja 3D (three.js)
// Buduje bryłę mebla z aktualnego STATE: korpus, przegrody, półki, szuflady,
// drążki, kosze, siedzisko, pralka, skos, uskok, blendy, cokół/nóżki.
(function(){
  let THREE, renderer, scene, camera, isoCam, useIso = false, controls, root, raf, hostEl, ready = false, loading = false;

  const MM = 0.001; // mm → metry
  const T = 18;     // grubość płyty mm
  let lastSize = null;

  function hexOf(mat, fallback){
    if(mat && mat.color) return mat.color;
    return fallback || '#cdc6b4';
  }

  async function load(){
    if(ready || loading) return ready;
    loading = true;
    try{
      const mod = await import('https://unpkg.com/three@0.160.0/build/three.module.js');
      THREE = mod;
      ready = true;
    }catch(e){
      console.error('three.js load failed', e);
      ready = false;
    }
    loading = false;
    return ready;
  }

  // Prosta kontrola orbity (bez zależności od OrbitControls/import-map)
  function makeOrbit(cam, dom){
    const st = {
      target: new THREE.Vector3(0,1,0),
      dist: 4, theta: 0.7, phi: 1.15,
      minDist: 1.2, maxDist: 14,
      damp: 0.12, tTheta: 0.7, tPhi: 1.15, tDist: 4,
      dragging: false, lx: 0, ly: 0,
    };
    function apply(){
      const s = Math.max(0.05, Math.min(Math.PI*0.52, st.phi));
      cam.position.set(
        st.target.x + st.dist * Math.sin(s) * Math.sin(st.theta),
        st.target.y + st.dist * Math.cos(s),
        st.target.z + st.dist * Math.sin(s) * Math.cos(st.theta)
      );
      cam.lookAt(st.target);
    }
    function down(e){
      st.dragging = true;
      const t = (e.touches && e.touches[0]) || e;
      st.lx = t.clientX; st.ly = t.clientY;
      dom.style.cursor = 'grabbing';
    }
    function move(e){
      if(!st.dragging) return;
      e.preventDefault();
      const t = (e.touches && e.touches[0]) || e;
      const dx = t.clientX - st.lx, dy = t.clientY - st.ly;
      st.lx = t.clientX; st.ly = t.clientY;
      st.tTheta -= dx * 0.006;
      st.tPhi = Math.max(0.12, Math.min(Math.PI*0.52, st.tPhi - dy * 0.006));
    }
    function up(){ st.dragging = false; dom.style.cursor = 'grab'; }
    function wheel(e){
      e.preventDefault();
      st.tDist = Math.max(st.minDist, Math.min(st.maxDist, st.tDist * (1 + Math.sign(e.deltaY) * 0.1)));
    }
    dom.style.cursor = 'grab';
    dom.addEventListener('mousedown', down);
    dom.addEventListener('touchstart', down, {passive:true});
    window.addEventListener('mousemove', move, {passive:false});
    window.addEventListener('touchmove', move, {passive:false});
    window.addEventListener('mouseup', up);
    window.addEventListener('touchend', up);
    dom.addEventListener('wheel', wheel, {passive:false});
    return {
      state: st,
      update(){
        st.theta += (st.tTheta - st.theta) * st.damp;
        st.phi   += (st.tPhi   - st.phi)   * st.damp;
        st.dist  += (st.tDist  - st.dist)  * st.damp;
        apply();
      },
      set(target, dist, theta, phi){
        st.target.copy(target);
        st.tDist = st.dist = dist;
        if(theta !== undefined){ st.tTheta = st.theta = theta; }
        if(phi   !== undefined){ st.tPhi   = st.phi   = phi;   }
        apply();
      }
    };
  }

  function disposeScene(){
    if(!root) return;
    root.traverse(o=>{
      if(o.geometry) o.geometry.dispose();
      if(o.material){
        if(Array.isArray(o.material)) o.material.forEach(m=>m.dispose());
        else o.material.dispose();
      }
    });
    scene.remove(root);
    root = null;
  }

  function box(w,h,d,x,y,z,mat){
    const g = new THREE.BoxGeometry(w*MM, h*MM, d*MM);
    const m = new THREE.Mesh(g, mat);
    m.position.set(x*MM, y*MM, z*MM);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }

  function build(S){
    const W = S.cabW, H = S.cabH, D = S.dim.d;
    const g = new THREE.Group();

    const corpusMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(S.corpusColor), roughness:.72, metalness:.02 });
    const frontMat  = new THREE.MeshStandardMaterial({ color: new THREE.Color(S.frontColor),  roughness:(S.frontRough ?? .62), metalness:.03 });
    const metalMat  = new THREE.MeshStandardMaterial({ color: 0xb9b9b3, roughness:.32, metalness:.85 });
    const darkMat   = new THREE.MeshStandardMaterial({ color: 0x2c2c28, roughness:.55, metalness:.15 });
    const mirrorMat = new THREE.MeshStandardMaterial({ color: 0xcdd5d9, roughness:.08, metalness:.9 });
    const glassMat  = new THREE.MeshStandardMaterial({ color: 0xdde4e7, roughness:.15, metalness:.2, transparent:true, opacity:.45 });

    const base = S.baseOffset;              // wysokość cokołu/nóżek
    const cx0 = -W/2;                        // lewa krawędź korpusu

    // ── cokół / nóżki
    if(base > 0){
      if(S.base === 'nozki'){
        const n = W <= 1200 ? 2 : (W <= 1800 ? 3 : 4);
        for(let i=0;i<n;i++){
          const t = n===1 ? .5 : i/(n-1);
          const lx = cx0 + 80 + t*(W-160);
          g.add(box(45, base, 45, lx, base/2, 0, darkMat));
        }
      } else if(S.base === 'cokol'){
        g.add(box(W-40, base, D-60, 0, base/2, 0, darkMat));
      }
    }

    // ── boki skrajne korpusu + wieniec górny / plecy
    const hL = S.hAt(0), hR = S.hAt(W);
    const slopeOn = Math.abs(hL - hR) > 5;
    const hdfMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(S.corpusColor).multiplyScalar(.82), roughness:.85 });
    if(slopeOn){
      // plecy jako wielokąt pod skosem (shape w XY, extrude w Z)
      const bs = new THREE.Shape();
      bs.moveTo(cx0*MM, 0);
      bs.lineTo(cx0*MM, hL*MM);
      bs.lineTo((cx0+W)*MM, hR*MM);
      bs.lineTo((cx0+W)*MM, 0);
      bs.closePath();
      const bMesh = new THREE.Mesh(
        new THREE.ExtrudeGeometry(bs, { depth: 4*MM, bevelEnabled:false }),
        hdfMat
      );
      bMesh.position.set(0, base*MM, (-D/2)*MM);
      bMesh.receiveShadow = true;
      g.add(bMesh);
    } else {
      g.add(box(W, hL, 4, 0, base + hL/2, -D/2 + 2, hdfMat));
    }
    // wieniec dolny — per szafka (rysowany w pętli sekcji)
    const hTopAvg = (hL + hR)/2;

    // ── sekcje
    let x = cx0 + T;
    S.sections.forEach((sec, si)=>{
      const secW = sec.w;
      const secTop = S.secTop[si];          // wysokość korpusu w tej sekcji (mm)
      const liftMm = sec.lift || 0;
      const notchH = sec.notchCut || 0;
      const bandH  = sec.bandCut || 0;
      const bandTop = sec.bandTop;

      // boki tej szafki — każda sekcja ma własne dwie płyty (widoczna podwójna płyta między szafkami)
      g.add(box(T, secTop, D, x - T/2, base + secTop/2, 0, corpusMat));
      g.add(box(T, secTop, D, x + secW + T/2, base + secTop/2, 0, corpusMat));
      // wieniec dolny tej szafki
      g.add(box(secW, T, D, x + secW/2, base + T/2, 0, corpusMat));
      // wieniec górny tej szafki — podąża za łamaną sufitu przy skosie
      if(slopeOn){
        const ha = S.hAt(x - cx0), hb = S.hAt(x + secW - cx0);
        const dx = secW * MM, dy = (hb - ha) * MM;
        const len = Math.hypot(dx, dy);
        const tp = new THREE.Mesh(new THREE.BoxGeometry(len, T*MM, D*MM), corpusMat);
        tp.rotation.z = Math.atan2(dy, dx);
        tp.position.set((x + secW/2)*MM, (base + (ha + hb)/2 - T/2)*MM, 0);
        tp.castShadow = true; tp.receiveShadow = true;
        g.add(tp);
      } else {
        g.add(box(secW, T, D, x + secW/2, base + secTop - T/2, 0, corpusMat));
      }
      // podział na dół + nadstawkę — podwójny wieniec na styku
      if(sec.parts && sec.parts.length > 1 && !(sec.split && sec.split.joints.some(j=>j.afterIdx>=0))){
        let cum = 0;
        for(let p=0;p<sec.parts.length-1;p++){
          cum += sec.parts[p];
          g.add(box(secW, T, D, x + secW/2, base + cum - T/2, 0, corpusMat));
          g.add(box(secW, T, D, x + secW/2, base + cum + T/2, 0, corpusMat));
        }
      }

      // dolna granica wnętrza sekcji (z liftem + uskokiem od dołu)
      let yBot = base + T + liftMm + (notchH && sec.notchFrom==='bottom' ? notchH : 0);
      let yTop = base + secTop - T - (bandH && bandTop ? bandH : 0) - (notchH && sec.notchFrom==='top' ? notchH : 0);
      // dno podniesionej sekcji
      if(liftMm > 0) g.add(box(secW, T, D, x + secW/2, yBot - T/2, 0, corpusMat));

      // elementy wnętrza — items[0] to GÓRA sekcji (jak w podglądzie 2D),
      // więc stackujemy od góry w dół
      let accTop = 0;
      const dInner = D - 20;
      sec.items.forEach((it, idx)=>{
        const ih = Number(it.h) || 0;
        const jt = (sec.split && sec.split.joints) ? sec.split.joints.find(j=>j.afterIdx===idx) : null;
        const rsh = (it.type==='drazek' && typeof rodShelves==='function') ? rodShelves(sec, idx) : null;
        if(rsh && rsh.above){ g.add(box(secW - 4, T, dInner, x + secW/2, yTop - accTop - T/2, 0, corpusMat)); accTop += T; }
        const yTo = yTop - accTop;        // górna krawędź pola (światło)
        accTop += ih;
        // półka zajmuje dodatkowo 18 mm płyty pod światłem — tak jak budżetuje
        // normalizeShelfHeights() (it.h = światło, płyta liczona osobno)
        if(it.type === 'polka' || (rsh && rsh.below)) accTop += T;
        const yFrom = yTop - accTop;      // dolna krawędź pola (spód płyty)
        const cxs = x + secW/2;
        if(it.type === 'polka'){
          if(!(jt && jt.replaces)) g.add(box(secW - 4, T, dInner, cxs, yFrom + T/2, 0, corpusMat));
          if(it.variant === 'przegroda'){
            g.add(box(T, ih - T, dInner - 20, cxs, yFrom + T + (ih-T)/2, 0, corpusMat));
          }
        } else if(it.type === 'drazek'){
          const r = 14;
          const geo = new THREE.CylinderGeometry(r*MM, r*MM, (secW-30)*MM, 14);
          const rod = new THREE.Mesh(geo, metalMat);
          rod.rotation.z = Math.PI/2;
          rod.position.set(cxs*MM, (yTo - 100)*MM, 0);
          g.add(rod);
          // wsporniki + ubrania na wieszakach
          g.add(box(20, 40, 30, x + 12, yTo - 100, 0, metalMat));
          g.add(box(20, 40, 30, x + secW - 12, yTo - 100, 0, metalMat));
          const fab = new THREE.MeshStandardMaterial({ color:0x9a9488, roughness:.95 });
          const gn = Math.max(2, Math.min(8, Math.floor(secW/90)));
          for(let k=0;k<gn;k++){
            const gx = x + 40 + (secW-80)*(k+.5)/gn;
            const len = Math.max(120, Math.min(ih - 130, ih*(k%3===1 ? 0.62 : (k%3===2 ? 0.8 : 0.7))));
            g.add(box(14, len, Math.min(440, dInner - 80), gx, yTo - 110 - len/2, 0, fab));
          }
          if(rsh && rsh.below && !(jt && jt.replaces)) g.add(box(secW - 4, T, dInner, cxs, yFrom + T/2, 0, corpusMat));
        } else if(it.type === 'szuflada' || it.type === 'szuflady'){
          const cnt = it.type === 'szuflady' ? ((it.opts && it.opts.count) || 4) : 1;
          const dh = ih / cnt;
          for(let k=0;k<cnt;k++){
            g.add(box(secW - 8, dh - 6, 22, cxs, yFrom + dh*k + dh/2, D/2 - 12, frontMat));
          }
        } else if(it.type === 'kosz'){
          g.add(box(secW - 14, ih - 10, dInner - 30, cxs, yFrom + ih/2, 0, metalMat));
        } else if(it.type === 'siedzisko'){
          g.add(box(secW - 4, 24, dInner, cxs, yFrom + 12, 0, corpusMat));
        } else if(it.type === 'pralka'){
          g.add(box(secW - 30, ih - 20, dInner - 40, cxs, yFrom + ih/2, -20, new THREE.MeshStandardMaterial({ color:0xf2f2ee, roughness:.4, metalness:.1 })));
          const dr = new THREE.Mesh(new THREE.CylinderGeometry((Math.min(secW,ih)*0.28)*MM, (Math.min(secW,ih)*0.28)*MM, 20*MM, 24), darkMat);
          dr.rotation.x = Math.PI/2;
          dr.position.set(cxs*MM, (yFrom + ih/2)*MM, (D/2 - 60)*MM);
          g.add(dr);
        }
        // styk dół/nadstawka — podwójny wieniec pod tym polem
        if(jt){
          const jTop = yTo - ih;
          accTop = (yTop - jTop) + 36;
          g.add(box(secW, T, D, cxs, jTop - T/2, 0, corpusMat));
          g.add(box(secW, T, D, cxs, jTop - 3*T/2, 0, corpusMat));
        }
      });

      // przelotowa półka (band)
      if(bandH){
        const by = bandTop ? (base + secTop - T - bandH) : (base + T + bandH);
        g.add(box(secW, T, dInner, x + secW/2, by, 0, corpusMat));
      }

      // fronty uchylne — rysowane zamknięte (domyślnie ukryte, żeby było widoczne wnętrze)
      if(S.frontMode === 'hinged' && S.sectionFronts[si] && S.showFronts){
        const fh = yTop - yBot;
        const lvs = (sec.leaves && sec.leaves.length) ? sec.leaves : (fh > 40 ? [{f0:0, f1:1}] : []);
        lvs.forEach((lf, li)=>{
          const lt = yTop - lf.f0*fh - (lf.f0>0?1.5:0);
          const lb = yTop - lf.f1*fh + (lf.f1<1?1.5:0);
          const lh = lt - lb;
          if(lh < 40) return;
          const leaf = box(secW - 4, lh, T, x + secW/2, lb + lh/2, D/2 + T/2, frontMat);
          leaf.name = 'front-'+si+'-'+li;
          g.add(leaf);
          g.add(box(18, Math.min(120, lh*0.4), 18, x + secW - 45, lb + lh*0.5, D/2 + T + 9, darkMat));
        });
      }

      x += secW + 2*T + 1;   // +1 mm luzu montażowego
    });

    // drzwi przesuwne
    if(S.frontMode === 'sliding' && S.showFronts){
      const panels = Math.min(4, Math.max(2, S.sections.length));
      const pw = W / panels;
      const fillMat = S.slidingFill === 'lustro' ? mirrorMat : (S.slidingFill === 'szklo' ? glassMat : frontMat);
      for(let i=0;i<panels;i++){
        const px = cx0 + i*pw + pw/2;
        const z = D/2 + (i%2 ? 30 : 12);
        g.add(box(pw - 8, hTopAvg - 20, 18, px, base + hTopAvg/2, z, fillMat));
        // rama profilu
        g.add(box(pw - 8, 26, 22, px, base + 20, z, metalMat));
        g.add(box(pw - 8, 26, 22, px, base + hTopAvg - 30, z, metalMat));
      }
    }

    // blendy — pełna wysokość wnęki, boczne przycięte do profilu skosu
    if(S.blenda){
      const bl = S.blenda;
      const nicheH = S.dim.h;
      // wysokość sufitu przy krawędzi (mm od podłogi)
      const ceilAt = (xLocal) => base + S.hAt(Math.max(0, Math.min(W, xLocal)));
      if(bl.left > 0){
        const hh = (typeof sideBlendaH==='function') ? Math.max(...sideBlendaH('left')) : Math.min(nicheH, ceilAt(0));
        // blenda zachodzi na bok korpusu (T), żeby nie zostawiać szczeliny w płaszczyźnie frontu
        g.add(box(bl.left + T, hh, T, cx0 - bl.left/2 + T/2, hh/2, D/2 + T/2, frontMat));
      }
      if(bl.right > 0){
        const hh = (typeof sideBlendaH==='function') ? Math.max(...sideBlendaH('right')) : Math.min(nicheH, ceilAt(W));
        g.add(box(bl.right + T, hh, T, cx0 + W + bl.right/2 - T/2, hh/2, D/2 + T/2, frontMat));
      }
      if(bl.top > 0){
        // górna blenda podąża za łamaną sufitu (shape w XY, extrude w Z)
        const xa = cx0 - (bl.left||0), xb = cx0 + W + (bl.right||0);
        const yAt = (xm) => ceilAt(xm - cx0) * MM;
        const sh = new THREE.Shape();
        const pts = [];
        pts.push({x: xa, y: yAt(xa)});
        let px = cx0 + T;
        S.sections.forEach(sec=>{ pts.push({x: px, y: yAt(px)}); px += sec.w + T; });
        pts.push({x: xb, y: yAt(xb)});
        // górna krawędź po łamanej sufitu
        sh.moveTo(pts[0].x*MM, pts[0].y);
        pts.forEach(p=> sh.lineTo(p.x*MM, p.y));
        // dolna krawędź — ta sama łamana obniżona o wysokość blendy (stała szerokość pasa)
        for(let i=pts.length-1;i>=0;i--) sh.lineTo(pts[i].x*MM, pts[i].y - bl.top*MM);
        sh.closePath();
        const m = new THREE.Mesh(
          new THREE.ExtrudeGeometry(sh, { depth: T*MM, bevelEnabled:false }),
          frontMat
        );
        m.position.set(0, 0, (D/2)*MM);
        m.castShadow = true; m.receiveShadow = true;
        g.add(m);
      }
    }

    // maskownica pod skosem — trójkąty nad frontami zasłonięte
    if(slopeOn && S.showFronts){
      let mx = cx0 + T;
      S.sections.forEach((sec, si)=>{
        const ha = S.hAt(mx - cx0), hb = S.hAt(mx + sec.w - cx0);
        const top = S.secTop[si];
        // trójkąt między poziomym górnym krańcem sekcji i skośnym sufitem
        const hi = Math.max(ha, hb), lo = Math.min(ha, hb);
        if(hi - lo > 8){
          const sh = new THREE.Shape();
          const x0m = (mx - T/2)*MM, x1m = (mx + sec.w + T/2)*MM;
          // dolna krawędź obniżona o grubość wieńca — zasłania szczelinę pod maskownicą
          const yb = (base + lo - T)*MM;
          sh.moveTo(x0m, yb);
          sh.lineTo(x0m, (base + ha)*MM);
          sh.lineTo(x1m, (base + hb)*MM);
          sh.lineTo(x1m, yb);
          sh.closePath();
          const m = new THREE.Mesh(
            new THREE.ExtrudeGeometry(sh, { depth: T*MM, bevelEnabled:false }),
            frontMat
          );
          m.position.set(0, 0, (D/2)*MM);
          m.castShadow = true; m.receiveShadow = true;
          g.add(m);
        }
        mx += sec.w + 2*T + 1;
      });
    }

    return g;
  }

  // Zbiera dane z STATE do prostego opisu bryły
  function snapshot(){
    const S = (typeof STATE !== 'undefined') ? STATE : window.STATE;
    if(!S) throw new Error('STATE unavailable');
    const W = (typeof cabinetW === 'function') ? cabinetW() : S.dim.w;
    const H = (typeof cabinetH === 'function') ? cabinetH() : S.dim.h;
    const base = (typeof baseOffset === 'function') ? baseOffset() : 0;
    const MAT = (typeof MATERIALS !== 'undefined') ? MATERIALS : (window.MATERIALS || []);
    const mc = MAT.find(m=>m.id===S.material) || MAT[0] || {};
    const mf = S.splitFront ? (MAT.find(m=>m.id===S.materialFront) || mc) : mc;
    const secTop = S.sections.map((_,si)=> (typeof sectionCabinetH === 'function') ? sectionCabinetH(si) : H);
    const sections = S.sections.map((sec,si)=>({
      w: sec.w,
      lift: sec.lift || 0,
      items: sec.items,
      notchCut: (typeof notchAffects === 'function' && notchAffects(si) && S.notch) ? S.notch.h : 0,
      notchFrom: S.notch ? S.notch.from : 'bottom',
      bandCut: (typeof bandSpans === 'function' && bandSpans(si) && S.band) ? S.band.h : 0,
      bandTop: S.band ? S.band.position === 'top' : false,
      parts: (typeof sectionParts === 'function') ? sectionParts(si) : null,
      split: (typeof sectionSplitPlan === 'function') ? sectionSplitPlan(si) : null,
      leaves: (typeof frontLeaves === 'function') ? frontLeaves(si) : null,
    }));
    return {
      dim: S.dim, cabW: W, cabH: H, baseOffset: base, base: S.base,
      corpusColor: hexOf(mc, '#cdc6b4'),
      frontColor: (typeof mdfOn==='function' && mdfOn()) ? mdfInfo().hex : hexOf(mf, '#cdc6b4'),
      frontRough: (typeof mdfOn==='function' && mdfOn()) ? ({mat:.78, polmat:.45, polysk:.14}[(S.mdf||{}).finish] ?? .62) : .62,
      sections, secTop, sectionFronts: S.sectionFronts, frontMode: S.frontMode,
      slidingFill: S.slidingFill, blenda: S.blenda,
      showFronts: window.__v3dShowFronts === true,
      hAt: (x)=> ((typeof cabinetHAt === 'function') ? cabinetHAt(x) : H) - base,
    };
  }

  // czy użytkownik nadal jest w widoku 3D (chroni przed wyścigiem async show())
  let forceRender = false;
  function isStill3D(){
    const S = (typeof STATE !== 'undefined') ? STATE : window.STATE;
    return !S || S.previewView === '3d' || forceRender;
  }

  function fit(){
    if(!renderer || !hostEl) return;
    const r = hostEl.getBoundingClientRect();
    const w = Math.max(120, Math.round(r.width) || hostEl.clientWidth || 600);
    const h = Math.max(120, Math.round(r.height) || hostEl.clientHeight || 600);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if(isoCam){
      const aspect = w / h;
      const fr = isoCam.userData.frustum || 2.4;
      isoCam.left = -fr * aspect; isoCam.right = fr * aspect;
      isoCam.top = fr; isoCam.bottom = -fr;
      isoCam.updateProjectionMatrix();
    }
  }

  // Ustawia kamerę izometryczną (bez obrotu) — klasyczny widok 3/4 od przodu
  function setIsoCamera(size){
    if(!isoCam) return;
    const maxDim = Math.max(size.x, size.y, size.z);
    const fr = maxDim * 0.72 + 0.35;
    isoCam.userData.frustum = fr;
    const dist = maxDim * 3 + 2;
    // kierunek izometryczny: prawo-góra-przód
    isoCam.position.set(dist * 0.55, dist * 0.48, dist * 0.78);
    isoCam.lookAt(0, size.y * 0.46, 0);
    fit();
  }

  async function show(){
    try{
      if(!(await load())) return false;
      if(!isStill3D()) return false;
      hostEl = document.getElementById('view3d');
      if(!hostEl) return false;
      // widocznością hosta zarządza applyViewMode() — show() jej nie zmienia
    if(!renderer){
      renderer = new THREE.WebGLRenderer({ antialias:true, alpha:false, preserveDrawingBuffer:true });
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      hostEl.appendChild(renderer.domElement);

      scene = new THREE.Scene();
      scene.background = new THREE.Color(0xede7d6);

      camera = new THREE.PerspectiveCamera(38, 1, 0.05, 60);
      camera.position.set(2.6, 1.9, 3.6);
      isoCam = new THREE.OrthographicCamera(-2.4, 2.4, 2.4, -2.4, 0.05, 80);
      isoCam.userData.frustum = 2.4;

      controls = makeOrbit(camera, renderer.domElement);

      scene.add(new THREE.HemisphereLight(0xffffff, 0xd9d3c4, 0.72));
      const key = new THREE.DirectionalLight(0xffffff, 1.15);
      key.position.set(3.2, 4.6, 3.4);
      key.castShadow = true;
      key.shadow.mapSize.set(1024,1024);
      key.shadow.camera.left = -4; key.shadow.camera.right = 4;
      key.shadow.camera.top = 4; key.shadow.camera.bottom = -4;
      scene.add(key);
      const fill = new THREE.DirectionalLight(0xffffff, 0.35);
      fill.position.set(-3, 2, -2);
      scene.add(fill);

      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(24, 24),
        new THREE.MeshStandardMaterial({ color: 0xe2dbc8, roughness:.95 })
      );
      floor.rotation.x = -Math.PI/2;
      floor.receiveShadow = true;
      scene.add(floor);

      window.addEventListener('resize', fit);
      if(window.ResizeObserver){
        try{ new ResizeObserver(()=>fit()).observe(hostEl); }catch(e){}
      }
      (function loop(){ raf = requestAnimationFrame(loop); if(controls && !useIso) controls.update(); if(renderer) renderer.render(scene, useIso ? isoCam : camera); })();
    }

    update();
    fit();
    if(!isStill3D()) return false;
    requestAnimationFrame(()=>{ fit(); });
    setTimeout(fit, 120);
    return true;
    }catch(e){
      console.error('3D show failed', e);
      return false;
    }
  }

  function update(){
    if(!ready || !scene) return;
    try{
      disposeScene();
      const S = snapshot();
      root = build(S);
      const bb = new THREE.Box3().setFromObject(root);
      const size = bb.getSize(new THREE.Vector3());
      const ctr = bb.getCenter(new THREE.Vector3());
      root.position.x -= ctr.x;
      root.position.z -= ctr.z;
      scene.add(root);
      if(controls){
        const dist = Math.max(size.x, size.y) * 1.75 + 0.9;
        controls.set(new THREE.Vector3(0, size.y * 0.45, 0), dist, 0.72, 1.16);
      }
      setIsoCamera(size);
      lastSize = size.clone();
    }catch(e){
      console.error('3D update failed', e);
    }
  }

  function hide(){ /* renderer zostaje, host ukryty przez CSS */ }

  async function toPNG(){
    try{
      forceRender = true;
      if(!(await show())){ forceRender = false; return null; }
      fit();
      await new Promise(r=>requestAnimationFrame(()=>r()));
      fit();
      renderer.render(scene, useIso ? isoCam : camera);
      const blob = await new Promise(res=>{
        try{ renderer.domElement.toBlob(b=>res(b), 'image/png'); }
        catch(e){ res(null); }
      });
      forceRender = false;
      return blob;
    }catch(e){
      forceRender = false;
      console.error('3D toPNG failed', e);
      return null;
    }
  }

  window.ZT3D = { show, hide, update, toPNG, isReady: ()=>ready,
    setIso(v){
      useIso = !!v;
      if(renderer && renderer.domElement) renderer.domElement.style.cursor = useIso ? 'default' : 'grab';
      if(lastSize) setIsoCamera(lastSize);
      fit();
    },
    isIso(){ return useIso; },
    debug(){
      if(!root) return {root:false};
      let fronts=0, total=0;
      root.traverse(o=>{ total++; if(o.name && o.name.startsWith('front-')) fronts++; });
      return {total, fronts, iso:useIso};
    },
    async toIsoPNG(){
      const prev = useIso;
      this.setIso(true);
      const blob = await toPNG();
      this.setIso(prev);
      return blob;
    }
  };
})();
