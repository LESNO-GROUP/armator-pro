// ────────────────────────────────────────────────────────────
//  DATA · ZabudujTO Konfigurator
//  To swap placeholders for real Kronospan photos later:
//  each MATERIAL can take an `image` URL — if present, the
//  renderer uses it instead of the generated SVG swatch.
// ────────────────────────────────────────────────────────────

// ── TYPES — photo renders
const TYPE_RENDERS = {
  szafa:     `<img src="assets/types/szafa.png"     alt="Szafa wnękowa" loading="lazy"/>`,
  garderoba: `<img src="assets/types/garderoba.png" alt="Garderoba"     loading="lazy"/>`,
  regal:     `<img src="assets/types/regal.png"     alt="Regał"         loading="lazy"/>`,
  lazienka:  `<img src="assets/types/lazienka.png"  alt="Łazienka"      loading="lazy"/>`,
};

const TYPES = [
  {id:'szafa', name:'Szafa wnękowa', num:'01'},
  {id:'garderoba', name:'Garderoba', num:'02'},
  {id:'regal', name:'Regał / biblioteczka', num:'03'},
  {id:'lazienka', name:'Zabudowa łazienkowa', num:'04'},
];

// ── ITEM TYPES (step 3)
// `variants` — when present, clicking the item in the section opens a chooser
const ITEM_TYPES = {
  'polka':   {name:'Półka',                price:0,   icon:'shelf',      defaultH:300, variants:[
    {id:'zwykla',     name:'Półka zwykła',          price:0,  desc:'Pełna deska na całą szerokość sekcji'},
    {id:'przegroda',  name:'Półka z przegródką',     price:19, desc:'Podzielona pionowo na środku — część lewa i prawa'},
  ]},
  'drazek':  {name:'Drążek',               price:49,  icon:'rod',        defaultH:1000, variants:[
    {id:'prosty-owal',    name:'Prosty owalny',           price:19,  desc:'Stalowy profil 30×15 mm, chromowany', image:'assets/akcesoria/rod-prosty-owal.png'},
    {id:'prosty-fi25-chrom', name:'Prosty okrągły Ø25',   price:19,  desc:'Drążek okrągły Ø25 mm, chromowany',   image:'assets/akcesoria/rod-fi25-chrom.png'},
    {id:'prosty-fi25-czarny',name:'Prosty okrągły Ø25 czarny', price:25, desc:'Drążek okrągły Ø25 mm, czerń matowa', image:'assets/akcesoria/rod-fi25-czarny.png'},
    {id:'pantograf',      name:'Pantograf',               price:179, desc:'Wysuwny — sekcja 545–1200 mm', brand:'GTV', minSecW:545, maxSecW:1200, image:'assets/akcesoria/rod-pantograf.png'},
  ], note:'Wysokość elementu = strefa wieszania pod drążkiem (krótkie ubrania ok. 900 mm, długie ok. 1500 mm). Wysokość = od półki nad drążkiem do półki pod nim; drążek wisi 100 mm pod półką. Półki nad i pod dodawane zawsze, chyba że drążek jest na samej górze lub na dole. Maks. szerokość drążka 1300 mm.'},
  'szuflada':{name:'Szuflada',             price:140, icon:'drawer',     defaultH:180, variants:[
    {id:'standard',  name:'Standard z domykiem',     price:129, desc:'Prowadnice kulkowe z hamulcem (soft-close)'},
    {id:'modernbox', name:'ModernBox',               price:175, desc:'Metalowe boki, biel/antracyt', brand:'GTV', frameColors:['antracyt','bialy'], image:'assets/akcesoria/modernbox.png', minSecW:100, maxSecW:1000, minD:350},
    {id:'axispro',   name:'AXIS PRO',                price:175, desc:'Cienkościenna, premium, pełny wysuw', brand:'GTV', frameColors:['antracyt','bialy','chrom'], image:'assets/akcesoria/axispro.png', minSecW:100, maxSecW:1000, minD:350},
    {id:'puro',      name:'Puro',                    price:399, desc:'Smukłe boki, push-to-open', brand:'REJS', frameColors:['antracyt','bialy'], image:'assets/akcesoria/puro.png', minSecW:150, maxSecW:1000, widthStep:{base:150, step:100, tol:20}, minD:500, fixedH:70},
    {id:'organizer', name:'Z organizerem',           price:225, desc:'Wkład na akcesoria / biżuterię'},
  ], hasInternalToggle:true},
  'kosz':    {name:'Kosz / cargo',         price:160, icon:'basket',     defaultH:140, variants:[
    {id:'druciany-ikea', name:'Kosz druciany',         price:99, desc:'Druciany wysuwny, klasyczny', brand:'IKEA',      frameColors:['chrom','antracyt','bialy'], image:'assets/akcesoria/druciany-ikea.png', widthBands:[[460,470],[710,720],[960,970]], minD:350, minH:170},
    {id:'cargo-spizar',  name:'Cargo spiżarniane',     price:199, desc:'Pełny wysuw, 5 koszyków',    brand:'GTV',       frameColors:['chrom','antracyt'],          image:'assets/akcesoria/cargo-spizar.png',  minSecW:130, maxSecW:600, minD:500, fixedH:550},
    {id:'pranie-rejs',   name:'Kosz na pranie',        price:249, desc:'Z workiem zdejmowanym',     brand:'REJS',      frameColors:['chrom','antracyt'],          image:'assets/akcesoria/pranie-rejs.png',   minSecW:264, maxSecW:600, minD:310, fixedH:600},
    {id:'azurowy-gtv',   name:'Kosz ażurowy',          price:175, desc:'Ażurowa wkładka',           brand:'GTV',       frameColors:['chrom','antracyt'],          image:'assets/akcesoria/azurowy-gtv.png',   widthBands:[[560,568],[660,668],[760,768],[860,868]], minD:460, fixedH:230},
    {id:'buty-gtv',      name:'Szuflada na buty',      price:175, desc:'Uchylna półka, do 6 par',   brand:'GTV',       frameColors:['chrom','antracyt'],          image:'assets/akcesoria/buty-gtv.png',      widthBands:[[560,568],[660,668],[760,768],[860,868]], minD:460, fixedH:230},
    {id:'organizer-elite',name:'Organizer Elite',      price:375, desc:'Wkład akcesoria / biżuteria',brand:'GTV Elite', frameColors:['antracyt','chrom'],          image:'assets/akcesoria/organizer-elite.png',widthBands:[[560,618],[660,718],[760,818],[860,918]], minD:483, fixedH:60},
    {id:'spodnie-elite', name:'Wieszak na spodnie',    price:149, desc:'Wysuwny, ramiona z aksamitem',brand:'GTV Elite',frameColors:['antracyt','chrom'],          image:'assets/akcesoria/spodnie-elite.png', widthBands:[[560,618],[660,718],[760,818],[860,918]], minD:483, fixedH:60},
    {id:'simpla-rejs',   name:'Szuflada druciana',     price:99, desc:'Simpla — druciana z domykiem',brand:'REJS',    frameColors:['chrom','antracyt','bialy'],  image:'assets/akcesoria/simpla-rejs.png',   widthBands:[[332,348],[432,448],[532,548]], minD:485, fixedH:200},
  ]},
  'siedzisko':{name:'Siedzisko', price:89, icon:'seat', defaultH:450, onlyTypes:['szafa','garderoba'],
    note:'Wysokość standardowa 450 mm. Nad siedziskiem wymagane min. 1200 mm wolnej przestrzeni. Wersja tapicerowana — wyceniana indywidualnie.'},
  'pralka': {name:'Miejsce na pralkę', price:0, icon:'washer', defaultH:880, onlyTypes:['lazienka'], atFloor:true, minSecW:620,
    note:'Wnęka na pralkę — zawsze przy podłodze. Standardowa pralka: 600×850 mm, zalecana sekcja min. 620 mm i wnęka 880 mm wysokości.'},
  'otwarta': {name:'Przestrzeń otwarta',   price:0,   icon:'open',       defaultH:300},
};

// ── LEGS — wybór nóżek meblowych (gdy base==='nozki')
const LEGS = [
  {id:'gtv-dak27', name:'Noga kwadratowa H100', brand:'GTV DAK27', h:100, price:9, desc:'Profil kwadratowy 40×40 mm, regulacja ±15 mm',
    image:'assets/akcesoria/leg-gtv-dak27.png', colors:['czarna','chrom']},
  {id:'gtv-dap77', name:'Noga cylindryczna H100', brand:'GTV DAP77', h:100, price:5, desc:'Cylindryczna Ø40 mm, regulacja ±15 mm',
    image:'assets/akcesoria/leg-gtv-dap77.png', colors:['aluminium']},
  {id:'atm-dn701', name:'Noga ATM H120', brand:'ATM DN-701', h:120, price:9, desc:'Tworzywo z metalową stopką, regulacja ±10 mm',
    image:'assets/akcesoria/leg-atm-dn70.png'},
  {id:'dn-709',    name:'Nóżka meblowa H150', brand:'DN-709', h:150, price:10, desc:'Klasyczna nóżka cokołowa, regulacja ±15 mm',
    image:'assets/akcesoria/leg-dn-709.png'},
];

const LEG_COLORS = {
  czarna:    {name:'Czarna',    swatch:'#1a1a17', stroke:'#000'},
  chrom:     {name:'Chrom',     swatch:'#cdcdc8', stroke:'#7c7d7a'},
  aluminium: {name:'Aluminium', swatch:'#bcbcb6', stroke:'#8a8a83'},
};

// ── FRAME COLORS — kolor stelaża akcesoriów (kosze, szuflady metalowe)
const FRAME_COLORS = {
  chrom:    {name:'Chrom',    swatch:'#cdcdc8', stroke:'#7c7d7a', highlight:'#f4f4f0'},
  antracyt: {name:'Antracyt', swatch:'#33363a', stroke:'#15171a', highlight:'#5a5e64'},
  bialy:    {name:'Biały',    swatch:'#ece9e0', stroke:'#a8a499', highlight:'#ffffff'},
};

// ── MATERIAL POOL — 82 decors
// Easy image swap: set `image:'url'` on any decor and it replaces the generated SVG swatch.
const MATERIALS = [
  {id:'k001', name:'Alby Blue', code:'5994', tone:'color', image:'assets/decors/alby-blue-5994.jpg', price:57.3},
  {id:'k002', name:'Aluminium Flash', code:'K522', tone:'stone', image:'assets/decors/aluminium-flash-k522.jpg', price:57.3},
  {id:'k003', name:'Antracyt', code:'0164', tone:'dark', image:'assets/decors/antracyt-0164.jpg', price:44.99},
  {id:'k004', name:'Arusha Wenge', code:'7648', tone:'wood', image:'assets/decors/arusha-wenge-7648.jpg', price:55.18},
  {id:'k005', name:'Bazalt', code:'0166', tone:'stone', image:'assets/decors/bazalt-0166.jpg', price:48.39},
  {id:'k006', name:'Beton Ciemny', code:'K352', tone:'stone', image:'assets/decors/beton-ciemny-k352.jpg', price:65.36},
  {id:'k007', name:'Beton Czarny', code:'K353', tone:'stone', image:'assets/decors/beton-czarny-k353.jpg', price:65.36},
  {id:'k008', name:'Beton Jasny', code:'K349', tone:'stone', image:'assets/decors/beton-jasny-k349.jpg', price:65.36},
  {id:'k009', name:'Beton', code:'K350', tone:'stone', image:'assets/decors/beton-k350.jpg', price:65.36},
  {id:'k010', name:'Beton Rdzawy', code:'K351', tone:'stone', image:'assets/decors/beton-rdzawy-k351.jpg', price:65.36},
  {id:'k011', name:'Beżowy', code:'0522', tone:'white', image:'assets/decors/bezowy-0522.jpg', price:48.39},
  {id:'k012', name:'Biały Brylantowy', code:'8681', tone:'white', image:'assets/decors/bialy-brylantowy-8681.jpg', price:41.81},
  {id:'k013', name:'Biel Alpejska', code:'8685', tone:'white', image:'assets/decors/biel-alpejska-8685.jpg', price:44.99},
  {id:'k014', name:'Blackwood Jęczmienny', code:'K021', tone:'wood', image:'assets/decors/blackwood-jeczmienny-k021.jpg', price:60.65},
  {id:'k015', name:'Blackwood Satynowy', code:'K022', tone:'wood', image:'assets/decors/blackwood-satynowy-k022.jpg', price:60.69},
  {id:'k016', name:'Brzoza', code:'1715', tone:'wood', image:'assets/decors/brzoza-1715.jpg', price:48.39},
  {id:'k017', name:'Buk Artisan Piaskowy', code:'K013', tone:'wood', image:'assets/decors/buk-artisan-piaskowy-k013.jpg', price:55.18},
  {id:'k018', name:'Buk Klasyczny', code:'0381', tone:'wood', image:'assets/decors/buk-klasyczny-0381.jpg', price:48.39},
  {id:'k019', name:'Błękitny Zmierzch', code:'K097', tone:'color', image:'assets/decors/blekitny-zmierzch-k097.jpg', price:57.3},
  {id:'k020', name:'Cappuccino', code:'0301', tone:'white', image:'assets/decors/cappuccino-0301.jpg', price:57.3},
  {id:'k021', name:'Carbon Marine Wood', code:'K016', tone:'wood', image:'assets/decors/carbon-marine-wood-k016.jpg', price:55.18},
  {id:'k022', name:'Ceramiczny', code:'K098', tone:'stone', image:'assets/decors/ceramiczny-k098.jpg', price:57.3},
  {id:'k023', name:'Ciemna Czekolada', code:'7181', tone:'dark', image:'assets/decors/ciemna-czekolada-7181.jpg', price:57.3},
  {id:'k024', name:'Ciemny Artwood', code:'K084', tone:'wood', image:'assets/decors/ciemny-artwood-k084.jpg', price:60.69},
  {id:'k025', name:'Ciemny Atelier', code:'4299', tone:'dark', image:'assets/decors/ciemny-atelier-4299.jpg', price:60.69},
  {id:'k026', name:'Ciemny Szmaragd', code:'K520', tone:'color', image:'assets/decors/ciemny-szmaragd-k520.jpg', price:57.3},
  {id:'k027', name:'Coco Bolo', code:'8995', tone:'wood', image:'assets/decors/coco-bolo-8995.jpg', price:55.18},
  {id:'k028', name:'Czarny', code:'0190', tone:'dark', image:'assets/decors/czarny-0190.jpg', price:40.53},
  {id:'k029', name:'Czerwień Chilli', code:'7113', tone:'color', image:'assets/decors/czerwien-chilli-7113.jpg', price:57.3},
  {id:'k030', name:'Czerwony Oxid', code:'9551', tone:'color', image:'assets/decors/czerwony-oxid-9551.jpg', price:57.3},
  {id:'k031', name:'Dymiona Zieleń', code:'K521', tone:'color', image:'assets/decors/dymiona-zielen-k521.jpg', price:57.3},
  {id:'k032', name:'Dąb Artisan', code:'5307', tone:'wood', image:'assets/decors/dab-artisan-5307.jpg', price:48.39},
  {id:'k033', name:'Dąb Barbera Piaskowy', code:'K543', tone:'wood', image:'assets/decors/dab-barbera-piaskowy-k543.jpg', price:60.69},
  {id:'k034', name:'Dąb Barokowy Ristretto', code:'K537', tone:'wood', image:'assets/decors/dab-barokowy-ristretto-k537.jpg', price:60.69},
  {id:'k035', name:'Dąb Barokowy Złoty', code:'K535', tone:'wood', image:'assets/decors/dab-barokowy-zloty-k535.jpg', price:60.69},
  {id:'k036', name:'Dąb Brązowy', code:'K090', tone:'wood', image:'assets/decors/dab-brazowy-k090.jpg', price:55.14},
  {id:'k037', name:'Dąb Burbon', code:'K082', tone:'wood', image:'assets/decors/dab-burbon-k082.jpg', price:55.18},
  {id:'k038', name:'Dąb Canella Naturalny', code:'K688', tone:'wood', image:'assets/decors/dab-canella-naturalny-k688.jpg', price:45.2},
  {id:'k039', name:'Dąb Castello Koniakowy', code:'K359', tone:'wood', image:'assets/decors/dab-castello-koniakowy-k359.jpg', price:60.69},
  {id:'k040', name:'Dąb Castello Miodowy', code:'K358', tone:'wood', image:'assets/decors/dab-castello-miodowy-k358.jpg', price:60.69},
  {id:'k041', name:'Dąb Castello Ristretto', code:'K357', tone:'wood', image:'assets/decors/dab-castello-ristretto-k357.jpg', price:60.69},
  {id:'k042', name:'Dąb Clubhouse Szary', code:'K079', tone:'wood', image:'assets/decors/dab-clubhouse-szary-k079.jpg', price:55.18},
  {id:'k043', name:'Dąb Coastland Biały', code:'K080', tone:'wood', image:'assets/decors/dab-coastland-bialy-k080.jpg', price:52.42},
  {id:'k044', name:'Dąb Coastland Szampański', code:'K081', tone:'wood', image:'assets/decors/dab-coastland-szampanski-k081.jpg', price:55.18},
  {id:'k045', name:'Dąb Craft Biały', code:'K001', tone:'wood', image:'assets/decors/dab-craft-bialy-k001.jpg', price:43.93},
  {id:'k046', name:'Dąb Craft Szary', code:'K002', tone:'wood', image:'assets/decors/dab-craft-szary-k002.jpg', price:43.93},
  {id:'k047', name:'Dąb Craft Tobacco', code:'K004', tone:'wood', image:'assets/decors/dab-craft-tobacco-k004.jpg', price:55.18},
  {id:'k048', name:'Dąb Craft Złoty', code:'K003', tone:'wood', image:'assets/decors/dab-craft-zloty-k003.jpg', price:40.11},
  {id:'k049', name:'Dąb Cremona Torro', code:'2738', tone:'wood', image:'assets/decors/dab-cremona-torro-2738.jpg', price:37.56},
  {id:'k050', name:'Dąb Elegance', code:'K107', tone:'wood', image:'assets/decors/dab-elegance-k107.jpg', price:60.65},
  {id:'k051', name:'Dąb Evoke Przybrzeżny', code:'K365', tone:'wood', image:'assets/decors/dab-evoke-przybrzezny-k365.jpg', price:40.11},
  {id:'k052', name:'Dąb Ferrara', code:'8921', tone:'wood', image:'assets/decors/dab-ferrara-8921.jpg', price:48.39},
  {id:'k053', name:'Dąb Grange Kolonialny', code:'K354', tone:'wood', image:'assets/decors/dab-grange-kolonialny-k354.jpg', price:60.69},
  {id:'k054', name:'Dąb Grange Platynowy', code:'K355', tone:'wood', image:'assets/decors/dab-grange-platynowy-k355.jpg', price:60.69},
  {id:'k055', name:'Dąb Harbor Vintage', code:'K360', tone:'wood', image:'assets/decors/dab-harbor-vintage-k360.jpg', price:60.69},
  {id:'k056', name:'Dąb Harbor Złoty', code:'K361', tone:'wood', image:'assets/decors/dab-harbor-zloty-k361.jpg', price:60.69},
  {id:'k057', name:'Dąb Kamienny', code:'5527', tone:'wood', image:'assets/decors/dab-kamienny-5527.jpg', price:60.69},
  {id:'k058', name:'Dąb Piaskowany', code:'K076', tone:'wood', image:'assets/decors/dab-piaskowany-k076.jpg', price:55.18},
  {id:'k059', name:'Dąb Silverjack Orzechowy', code:'K544', tone:'wood', image:'assets/decors/dab-silverjack-orzechowy-k544.jpg', price:60.69},
  {id:'k060', name:'Dąb Skalny Oregon', code:'5529', tone:'wood', image:'assets/decors/dab-skalny-oregon-5529.jpg', price:55.18},
  {id:'k061', name:'Dąb Truflowy', code:'5194', tone:'wood', image:'assets/decors/dab-truflowy-5194.jpg', price:48.39},
  {id:'k062', name:'Dąb Urban Kawowy', code:'K007', tone:'wood', image:'assets/decors/dab-urban-kawowy-k007.jpg', price:55.18},
  {id:'k063', name:'Dąb Urban Oyster', code:'K005', tone:'wood', image:'assets/decors/dab-urban-oyster-k005.jpg', price:55.18},
  {id:'k064', name:'Dąb Vintage Jasny', code:'3025', tone:'wood', image:'assets/decors/dab-vintage-jasny-3025.jpg', price:48.39},
  {id:'k065', name:'Dąb Wotan', code:'5402', tone:'wood', image:'assets/decors/dab-wotan-5402.jpg', price:48.39},
  {id:'k066', name:'Glina Szara', code:'K096', tone:'color', image:'assets/decors/glina-szara-k096.jpg', price:57.3},
  {id:'k067', name:'Grafit Szary', code:'0162', tone:'dark', image:'assets/decors/grafit-szary-0162.jpg', price:48.39},
  {id:'k068', name:'Granada Niebiańska', code:'K692', tone:'color', image:'assets/decors/granada-niebianska-k692.jpg', price:59.84},
  {id:'k069', name:'Granatowy', code:'8984', tone:'color', image:'assets/decors/granatowy-8984.jpg', price:57.3},
  {id:'k070', name:'Głębia Sahary', code:'K514', tone:'color', image:'assets/decors/glebia-sahary-k514.jpg', price:57.3},
  {id:'k071', name:'Jasny Artwood', code:'K083', tone:'wood', image:'assets/decors/jasny-artwood-k083.jpg', price:60.69},
  {id:'k072', name:'Jasny Atelier', code:'4298', tone:'color', image:'assets/decors/jasny-atelier-4298.jpg', price:60.69},
  {id:'k073', name:'Jasny Grafit', code:'0171', tone:'dark', image:'assets/decors/jasny-grafit-0171.jpg', price:48.39},
  {id:'k074', name:'Jasny Szary', code:'0112', tone:'color', image:'assets/decors/jasny-szary-0112.jpg', price:40.75},
  {id:'k075', name:'Jesion Surfside', code:'K524', tone:'wood', image:'assets/decors/jesion-surfside-k524.jpg', price:60.69},
  {id:'k076', name:'Juta Ciemna', code:'K542', tone:'dark', image:'assets/decors/juta-ciemna-k542.jpg', price:60.69},
  {id:'k077', name:'Juta Jasna', code:'K541', tone:'white', image:'assets/decors/juta-jasna-k541.jpg', price:60.69},
  {id:'k078', name:'Cotta Cremona Oak', code:'K2737', tone:'wood', image:'assets/decors/k2737-cotta-cremona-oak.jpg', price:68.99},
  {id:'k080', name:'Stone Beige', code:'K680', tone:'stone', image:'assets/decors/k680-stone-beige.jpg', price:46.26},
  {id:'k081', name:'Macadamia', code:'K681', tone:'white', image:'assets/decors/k681-macadamia.jpg', price:46.26},
  {id:'k082', name:'Alpaca', code:'K682', tone:'white', image:'assets/decors/k682-alpaca.jpg', price:46.26},
  {id:'k083', name:'Cajun', code:'K683', tone:'dark', image:'assets/decors/k683-cajun.jpg', price:46.26},
  {id:'k084', name:'Black Truffle', code:'K684', tone:'dark', image:'assets/decors/k684-black-truffle.jpg', price:46.26},
  {id:'k085', name:'Steel Blue', code:'K685', tone:'color', image:'assets/decors/k685-steel-blue.jpg', price:46.26},
  {id:'k086', name:'Powder Pink', code:'K686', tone:'white', image:'assets/decors/k686-powder-pink.jpg', price:46.26},
  {id:'k087', name:'Dark Forest', code:'K687', tone:'dark', image:'assets/decors/k687-dark-forest.jpg', price:46.26},
  {id:'k088', name:'Almond Granada', code:'K691', tone:'color', image:'assets/decors/k691-almond-granada.jpg', price:59.84},
  {id:'k089', name:'Bronze Granada', code:'K693', tone:'color', image:'assets/decors/k693-bronze-granada.jpg', price:59.84},
  {id:'k090', name:'Kaszmir', code:'5981', tone:'white', image:'assets/decors/kaszmir-5981.jpg', price:44.99},
  {id:'k091', name:'Klon', code:'0375', tone:'wood', image:'assets/decors/klon-0375.jpg', price:48.39},
  {id:'k092', name:'Kobalt Szary', code:'6299', tone:'dark', image:'assets/decors/kobalt-szary-6299.jpg', price:57.3},
  {id:'k093', name:'Kość Słoniowa', code:'0514', tone:'white', image:'assets/decors/kosc-sloniowa-0514.jpg', price:48.39},
  {id:'k094', name:'Latte', code:'7166', tone:'white', image:'assets/decors/latte-7166.jpg', price:57.3},
  {id:'k095', name:'Lazurowy Błękit', code:'K517', tone:'color', image:'assets/decors/lazurowy-blekit-k517.jpg', price:57.3},
  {id:'k096', name:'Macchiato', code:'8533', tone:'white', image:'assets/decors/macchiato-8533.jpg', price:48.39},
  {id:'k097', name:'Manhattan Szary', code:'0540', tone:'dark', image:'assets/decors/manhattan-szary-0540.jpg', price:48.39},
  {id:'k098', name:'Marshmallow', code:'K513', tone:'white', image:'assets/decors/marshmallow-k513.jpg', price:57.3},
  {id:'k099', name:'Migdałowy', code:'0564', tone:'white', image:'assets/decors/migdalowy-0564.jpg', price:46.05},
  {id:'k100', name:'Mouse Gray', code:'K519', tone:'color', image:'assets/decors/mouse-gray-k519.jpg', price:57.3},
  {id:'k101', name:'Muszla', code:'5982', tone:'white', image:'assets/decors/muszla-5982.jpg', price:48.39},
  {id:'k102', name:'Niebieski', code:'0125', tone:'color', image:'assets/decors/niebieski-0125.jpg', price:57.3},
  {id:'k103', name:'Olcha', code:'1912', tone:'wood', image:'assets/decors/olcha-1912.jpg', price:48.39},
  {id:'k104', name:'Orzech', code:'0729', tone:'wood', image:'assets/decors/orzech-0729.jpg', price:48.39},
  {id:'k105', name:'Orzech Alpejski', code:'9614', tone:'wood', image:'assets/decors/orzech-alpejski-9614.jpg', price:48.39},
  {id:'k106', name:'Orzech Rockford Jasny', code:'K085', tone:'wood', image:'assets/decors/orzech-rockford-jasny-k085.jpg', price:60.69},
  {id:'k107', name:'Orzech Rockford Naturalny', code:'K086', tone:'wood', image:'assets/decors/orzech-rockford-naturalny-k086.jpg', price:60.69},
  {id:'k108', name:'Orzech Select Ciemny', code:'K009', tone:'wood', image:'assets/decors/orzech-select-ciemny-k009.jpg', price:55.18},
  {id:'k109', name:'Orzech Select Jasny', code:'K008', tone:'wood', image:'assets/decors/orzech-select-jasny-k008.jpg', price:55.18},
  {id:'k110', name:'Pastelowy Zielony', code:'7063', tone:'color', image:'assets/decors/pastelowy-zielony-7063.jpg', price:57.3},
  {id:'k111', name:'Petrol', code:'0244', tone:'color', image:'assets/decors/petrol-0244.jpg', price:57.3},
  {id:'k112', name:'Piaskowy', code:'0515', tone:'white', image:'assets/decors/piaskowy-0515.jpg', price:48.39},
  {id:'k113', name:'Pikantna Czerwień', code:'K515', tone:'color', image:'assets/decors/pikantna-czerwien-k515.jpg', price:57.3},
  {id:'k114', name:'Pomarańczowy', code:'0132', tone:'color', image:'assets/decors/pomaranczowy-0132.jpg', price:57.3},
  {id:'k115', name:'Róż Naturalny', code:'K512', tone:'color', image:'assets/decors/roz-naturalny-k512.jpg', price:57.3},
  {id:'k116', name:'Sosna Loft Biała', code:'K010', tone:'wood', image:'assets/decors/sosna-loft-biala-k010.jpg', price:55.18},
  {id:'k117', name:'Surf Blue', code:'K518', tone:'color', image:'assets/decors/surf-blue-k518.jpg', price:57.3},
  {id:'k118', name:'Szary Chinchilla', code:'0197', tone:'dark', image:'assets/decors/szary-chinchilla-0197.jpg', price:48.39},
  {id:'k119', name:'Toffee', code:'K516', tone:'color', image:'assets/decors/toffee-k516.jpg', price:57.3},
  {id:'k120', name:'Vintage Marine Wood', code:'K015', tone:'wood', image:'assets/decors/vintage-marine-wood-k015.jpg', price:55.18},
  {id:'k121', name:'Wenge', code:'0854', tone:'wood', image:'assets/decors/wenge-0854.jpg', price:48.39},
  {id:'k122', name:'Wiąz Liberty Jasny', code:'K017', tone:'wood', image:'assets/decors/wiaz-liberty-jasny-k017.jpg', price:55.18},
  {id:'k123', name:'Wiśnia', code:'0344', tone:'wood', image:'assets/decors/wisnia-0344.jpg', price:58.39},
  {id:'k124', name:'Zieleń Mamba', code:'7190', tone:'color', image:'assets/decors/zielen-mamba-7190.jpg', price:57.3},
  {id:'k125', name:'Zielony Oxid', code:'9561', tone:'color', image:'assets/decors/zielony-oxid-9561.jpg', price:57.3},
  {id:'k126', name:'Łupek Arosa Ciemny', code:'K539', tone:'stone', image:'assets/decors/lupek-arosa-ciemny-k539.jpg', price:65.36},
  {id:'k127', name:'Łupek Arosa Jasny', code:'K538', tone:'stone', image:'assets/decors/lupek-arosa-jasny-k538.jpg', price:65.36},
  {id:'k128', name:'Żółty', code:'0134', tone:'color', image:'assets/decors/zolty-0134.jpg', price:57.3}
];

// ── HINGES (uchylne) ────────────────────────────────────────
const HINGES = [
  {id:'standard', name:'Standardowe',         desc:'Zawiasy puszkowe bez hamulca',                  price:0,  brand:'GTV', image:'assets/akcesoria/hinge-standard.png'},
  {id:'soft',     name:'Cichy domyk',         desc:'Hamulec pneumatyczny — front zamyka się płynnie', price:5, brand:'GTV', image:'assets/akcesoria/hinge-soft.png'},
];

// ── SLIDING — systemy GTV, kolory profilu, wypełnienia ──────
//  fillable: true  → można wybrać płyta / lustro / szkło
//  divisible: true → podział poziomy na 2–3 pasy z różnymi wypełnieniami
const SLIDING_PROFILES = [
  {id:'caro',      name:'CARO 18/4',         desc:'Ramowy profil z uchwytem CARO, wkład 4 mm',                price:280, brand:'GTV CARO',    fillable:true,  divisible:false, image:'assets/akcesoria/sliding-caro.png'},
  {id:'nero',      name:'NERO 18/4',         desc:'Ramowy profil z uchwytem NERO, wkład 4 mm',                price:320, brand:'GTV NERO',    fillable:true,  divisible:false, image:'assets/akcesoria/sliding-nero.png'},
  {id:'novo',      name:'NOVO 10/4',         desc:'Smukły profil 10 mm z uchwytem NOVO, wkład 4 mm',          price:250, brand:'GTV NOVO',    fillable:true,  divisible:false, image:'assets/akcesoria/sliding-novo.png'},
  {id:'ergo',      name:'ERGO',              desc:'Ramowy z wpuszczanym uchwytem ERGO',                       price:310, brand:'GTV ERGO',    fillable:true,  divisible:false, image:'assets/akcesoria/sliding-ergo.png'},
  {id:'loca',      name:'LOCA',              desc:'Ramowy z wpuszczanym uchwytem LOCA',                       price:290, brand:'GTV LOCA',    fillable:true,  divisible:false, image:'assets/akcesoria/sliding-loca.png'},
  {id:'dzielony',  name:'Ramowy dzielony',   desc:'Podział poziomy na 2–3 pasy z różnymi wypełnieniami',      price:400, brand:'GTV',         fillable:true,  divisible:true},
  {id:'bezramowy', name:'Bezramowy',         desc:'Front bez ramki aluminiowej, krawędź ABS (tylko płyta)',   price:360, brand:'GTV',         fillable:false, divisible:false},
];

const SLIDING_COLORS = [
  {id:'aluminium', name:'Aluminium',     sample:'#bcbcb6', edge:'#8a8a83'},
  {id:'czarny',    name:'Czarny matowy', sample:'#1a1a17', edge:'#2c2c28'},
  {id:'bialy',     name:'Biały',         sample:'#f6f4ef', edge:'#9a9890'},
];

// Wypełnienia ramowych drzwi przesuwnych
const SLIDING_FILLS = [
  {id:'plyta',  name:'Płyta',  desc:'Płyta laminowana wg wybranego dekoru', price:0,   unit:'w cenie'},
  {id:'lustro', name:'Lustro', desc:'Lustro srebrne, krawędź szlifowana',   price:200, unit:'/ m²'},
  {id:'szklo',  name:'Szkło',  desc:'Szkło bezpieczne lacobel / piaskowane',price:180, unit:'/ m²'},
];

// ── HANDLE COLORS — palette swatches ─────────────────────────
const HANDLE_COLORS = {
  czarny:     {name:'Czarny',      swatch:'#1a1a17', stroke:'#000'},
  bialy:      {name:'Biały',       swatch:'#f6f4ef', stroke:'#9a9890'},
  mosiadz:    {name:'Mosiądz',     swatch:'#b89968', stroke:'#7d6839'},
  stal:       {name:'Stal',        swatch:'#b8b8b8', stroke:'#7a7a76'},
  zloty:      {name:'Złoty',       swatch:'#d4af37', stroke:'#8e7320'},
  inox:       {name:'Inox',        swatch:'#b9b9b3', stroke:'#7b7b76'},
  chrom:      {name:'Chrom',       swatch:'#cdcdc8', stroke:'#7c7d7a'},
  aluminium:  {name:'Aluminium',   swatch:'#bcbcb6', stroke:'#8a8a83'},
  srebrny:    {name:'Srebrny',     swatch:'#c8c8c4', stroke:'#83837e'},
  miedz:      {name:'Miedź',       swatch:'#b87333', stroke:'#7b4a16'},
  szampanski: {name:'Szampański',  swatch:'#c8a576', stroke:'#9b7b50'},
};

// ── HANDLES ────────────────────────────────────────────────
//  Tip-on blokuje cichy domyk zawiasów; logika w app.js.
const HANDLES = [
  {id:'tipon',        group:'integralne', name:'Tip-on / push-to-open', brand:'GTV',
    desc:'Otwarcie przez lekkie naciśnięcie. Wymaga zawiasów bez hamulca.',
    price:29, unit:'/ front'},

  {id:'galka-spot',   group:'galki',      name:'Gałka GTV SPOT', brand:'GTV',
    desc:'Gałka meblowa SPOT, mocowanie 1 wkręt',
    price:0, unit:'/ szt.', image:'assets/akcesoria/handle-spot.png',
    colors:[
      {id:'czarny',  price:0},
      {id:'bialy',   price:6},
      {id:'mosiadz', price:8},
      {id:'stal',    price:6},
      {id:'zloty',   price:10},
    ]},

  {id:'galka-atm',    group:'galki',      name:'Gałka ATM GM-315', brand:'ATM',
    desc:'Gałka meblowa GM-315, czarna',
    price:12, unit:'/ szt.', image:'assets/akcesoria/handle-atm-gm315.png',
    colors:[{id:'czarny', price:7}]},

  {id:'uchwyt-hexa-160', group:'krawedz', name:'GTV HEXA 160 mm', brand:'GTV',
    desc:'Uchwyt krawędziowy frezowany, rozstaw 160 mm',
    price:42, unit:'/ szt.', image:'assets/akcesoria/handle-hexa-160.png',
    colors:[
      {id:'czarny',    price:10},
      {id:'inox',      price:0},
      {id:'chrom',     price:0},
      {id:'aluminium', price:0},
      {id:'bialy',     price:0},
      {id:'zloty',     price:6},
    ]},

  {id:'uchwyt-bagio-128', group:'relingi', name:'GTV BAGIO 128 mm', brand:'GTV',
    desc:'Uchwyt prosty, rozstaw 128 mm',
    price:28, unit:'/ szt.', image:'assets/akcesoria/handle-bagio-128.png',
    colors:[
      {id:'czarny',     price:15},
      {id:'inox',       price:0},
      {id:'mosiadz',    price:6},
      {id:'srebrny',    price:0},
      {id:'miedz',      price:6},
      {id:'szampanski', price:4},
    ]},

  {id:'uchwyt-bagio-192', group:'relingi', name:'GTV BAGIO 192 mm', brand:'GTV',
    desc:'Uchwyt prosty, rozstaw 192 mm',
    price:34, unit:'/ szt.', image:'assets/akcesoria/handle-bagio-192.png',
    colors:[
      {id:'czarny',     price:20},
      {id:'inox',       price:0},
      {id:'mosiadz',    price:6},
      {id:'srebrny',    price:0},
      {id:'miedz',      price:6},
      {id:'szampanski', price:4},
    ]},
];

// ── PRICING
const PRICING = {
  // Material handled per-decor (cena Kronospan zł/m² na pozycji)
  hdfPerSqm:       22,        // zł / m² pleców HDF 3 mm
  laborPerSqm:     50,        // zł / m² zużytej płyty (z odpadem)
  cuttingPerMb:   2.5,        // zł / mb cięcia
  edgingPerMb:      5,        // zł / mb obrzeża + oklejania
  cuttingPerSqm:    5,        // ~mb cięcia na m² płyty (heurystyka)
  edgingPerSqm:     4,        // ~mb obrzeża na m² płyty (heurystyka)
  designFee:      500,        // zł / projekt (ryczałt)
  backPanel:        0,        // zł / mebel — plecy: materiał HDF liczony przez hdfPerSqm (ryczałt wyłączony)
  vat:           0.23,        // 23%
  // Odpad płyty wg liczby arkuszy (sheet 2800×2070 ≈ 5.796 m²)
  sheetSqm:     5.796,
  wasteRules: [
    {maxSheets: Infinity, rate: 0},
  ],
  lightingPerM: 100,
  minOrder:     250,
};
