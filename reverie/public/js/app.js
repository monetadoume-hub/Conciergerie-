// Code de la page Rêverie (s'exécute dans le navigateur).
// Il n'y a AUCUNE clé secrète ici : la recherche sur mesure passe par notre
// serveur (/api/destinations), qui est le seul à connaître la clé.
import {ENVIES,TRANSPORTS,LODGINGS,MONTHS,LIMITES} from "./donnees.js";

const AVATARS=["🙂","😄","🧒","👧","👦","🧑"];

const S={mode:"sejour",people:[{name:"Moi",tags:new Set(),text:""}],adults:2,children:0,nights:5,budget:800,from:"Paris",month:"",transports:new Set(),lodgings:new Set()};
const $=s=>document.querySelector(s);
const esc=v=>String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const eur=n=>Math.round(n).toLocaleString("fr-FR")+" €";

/* ---------- Build UI ---------- */
const mSel=$("#month");MONTHS.forEach(m=>{const o=document.createElement("option");o.value=m;o.textContent=m[0].toUpperCase()+m.slice(1);mSel.append(o)});
function chip(item,on,onClick){const b=document.createElement("button");b.type="button";b.className="chip";b.setAttribute("aria-pressed",on?"true":"false");b.innerHTML='<span class="e" aria-hidden="true">'+item.e+'</span>'+esc(item.t);b.onclick=()=>{onClick();b.setAttribute("aria-pressed",b.getAttribute("aria-pressed")==="true"?"false":"true");updateScene()};return b}
function fillChips(el,list,set){list.forEach(it=>el.append(chip(it,set.has(it.id),()=>{set.has(it.id)?set.delete(it.id):set.add(it.id)})))}
fillChips($("#transports"),TRANSPORTS,S.transports);
fillChips($("#lodgings"),LODGINGS,S.lodgings);

function renderPeople(){
  const box=$("#people");box.innerHTML="";
  S.people.forEach((p,i)=>{
    const card=document.createElement("div");card.className="person";
    card.innerHTML='<div class="person-head"><span class="avatar" aria-hidden="true">'+AVATARS[i%AVATARS.length]+'</span><input aria-label="Prénom du voyageur" value="'+esc(p.name)+'" maxlength="24">'+(S.people.length>1?'<button type="button" class="x">Retirer</button>':'')+'</div><div class="chips"></div><textarea class="dream" rows="2" maxlength="220" placeholder="Son rêve en une phrase : « un vrai château de conte de fées avec des passages secrets »"></textarea>';
    card.querySelector("input").oninput=e=>{p.name=e.target.value};
    const x=card.querySelector(".x");if(x)x.onclick=()=>{S.people.splice(i,1);renderPeople();updateScene()};
    fillChips(card.querySelector(".chips"),ENVIES,p.tags);
    const ta=card.querySelector("textarea");ta.value=p.text;ta.oninput=e=>{p.text=e.target.value;updateScene()};
    box.append(card);
  });
  $("#addPerson").hidden=S.people.length>=6;
}
$("#addPerson").onclick=()=>{S.people.push({name:"Voyageur "+(S.people.length+1),tags:new Set(),text:""});renderPeople();const ins=document.querySelectorAll(".person-head input");ins[ins.length-1].focus();ins[ins.length-1].select()};
renderPeople();

document.querySelectorAll(".seg button").forEach(b=>b.onclick=()=>{S.mode=b.dataset.mode;document.querySelectorAll(".seg button").forEach(x=>x.setAttribute("aria-pressed",x===b?"true":"false"));updateScene()});
const LIM=LIMITES;
document.querySelectorAll("[data-step]").forEach(b=>b.onclick=()=>{const k=b.dataset.step;S[k]=Math.min(LIM[k][1],Math.max(LIM[k][0],S[k]+Number(b.dataset.d)));$("#"+k).textContent=S[k];updateBudget()});
$("#budget").oninput=e=>{S.budget=Number(e.target.value);updateBudget()};
$("#from").oninput=e=>{S.from=e.target.value};
mSel.onchange=e=>{S.month=e.target.value};
function nPers(){return S.adults+S.children}
function updateBudget(){$("#budgetOut").textContent=eur(S.budget);const n=nPers();$("#budgetFor").textContent="pour "+n+" personne"+(n>1?"s":"")+" · "+eur(S.budget/n)+" chacun"}
updateBudget();

/* ---------- Living scene ---------- */
const KW={plage:/plage|mer|sable|océan|ocean|baign|surf|île|ile|crique/i,chateaux:/ch[aâ]teau|princesse|chevalier|forteresse|conte|passages? secrets?/i,montagne:/montagne|rando|sommet|lac|alpes/i,nature:/nature|for[eê]t|cascade|animaux|parc naturel|camping/i,ville:/ville|shopping|capitale/i,culture:/mus[ée]e|histoire|art|monument|ruines/i,neige:/neige|ski|luge/i,parcs:/manège|manege|parc d'attraction|attractions|montagnes russes/i,gastronomie:/manger|cuisine|gastro|resto|tapas|vin/i};
function allTags(){const s=new Set();S.people.forEach(p=>{p.tags.forEach(t=>s.add(t));for(const k in KW)if(KW[k].test(p.text))s.add(k)});return s}
function updateScene(){
  const tags=allTags(),on=new Set();
  ENVIES.forEach(e=>{if(tags.has(e.id))e.l.forEach(l=>on.add(l))});
  if(S.mode==="roadtrip")on.add("road");
  if(S.transports.has("avion"))on.add("plane");
  if(S.transports.has("bateau")){on.add("sea");on.add("boat")}
  if(S.transports.has("voiture")||S.transports.has("covoiturage"))on.add("road");
  document.querySelectorAll("#scene .layer").forEach(g=>g.classList.toggle("on",on.has(g.dataset.l)));
  const names=ENVIES.filter(e=>tags.has(e.id)).map(e=>e.t.toLowerCase());
  $("#sceneCap").textContent=names.length?"Votre rêve : "+names.join(", ")+(S.mode==="roadtrip"?", en road trip.":"."):"Choisissez vos envies : votre paysage se dessine.";
}
updateScene();

/* ---------- Offline catalogue (fallback) ---------- */
const CAT=[
 {n:"Andalousie",c:"Espagne",tags:["plage","chateaux","culture","gastronomie","soleil","fete"],lod:55,day:28,tr:{avion:110,train:170,bus:85,covoiturage:75,voiture:120},hl:{plage:"Les plages de Cadix et de Tarifa",chateaux:"L'Alhambra de Grenade et l'Alcázar de Séville, de vrais palais de contes",culture:"Mosquée de Cordoue, vieux quartiers de Séville",gastronomie:"Tapas à Séville, à petits prix",soleil:"Plus de 300 jours de soleil par an",fete:"Soirées flamenco à Triana"},rt:[["Séville",2,"Alcázar et flamenco"],["Cordoue",1,"La Mezquita"],["Grenade",2,"L'Alhambra"],["Cadix",2,"Plages et vieille ville"]]},
 {n:"Vallée de la Loire",c:"France",tags:["chateaux","nature","gastronomie","culture","pascher"],lod:48,day:25,tr:{train:35,covoiturage:18,voiture:45,bus:20},hl:{chateaux:"Chambord, Chenonceau, Amboise : des châteaux à chaque virage",nature:"Balades à vélo le long de la Loire",gastronomie:"Rillettes, fromages de chèvre et vins de Loire",culture:"Le Clos Lucé de Léonard de Vinci",pascher:"Pas besoin d'avion : le train suffit"},rt:[["Blois",2,"Château royal"],["Chambord",1,"Le château des passages secrets"],["Amboise",2,"Clos Lucé"],["Chenonceau",1,"Le château sur l'eau"]]},
 {n:"Bretagne nord",c:"France",tags:["plage","chateaux","nature","gastronomie","pascher"],lod:52,day:26,tr:{train:45,covoiturage:25,voiture:60,bus:25},hl:{plage:"Plages de Saint-Malo et côte de Granit rose",chateaux:"Fort la Latte et les remparts de Saint-Malo",nature:"Sentier des douaniers",gastronomie:"Crêpes, galettes et fruits de mer",pascher:"Accessible en train ou covoiturage"},rt:[["Saint-Malo",2,"Remparts et plages"],["Cap Fréhel",1,"Fort la Latte"],["Perros-Guirec",2,"Granit rose"]]},
 {n:"Algarve",c:"Portugal",tags:["plage","detente","nature","soleil","gastronomie"],lod:58,day:27,tr:{avion:120,bus:110,voiture:160},hl:{plage:"Criques dorées de Lagos et Benagil",detente:"Petits villages blancs au calme",nature:"Falaises de Ponta da Piedade",soleil:"Soleil quasi garanti d'avril à octobre",gastronomie:"Poissons grillés et pastéis de nata"},rt:[["Faro",1,"Vieille ville"],["Benagil",1,"Grotte marine"],["Lagos",3,"Plages et falaises"],["Sagres",1,"Bout du monde"]]},
 {n:"Bavière",c:"Allemagne",tags:["chateaux","montagne","nature","neige","culture"],lod:70,day:32,tr:{train:110,avion:140,bus:70,covoiturage:65,voiture:110},hl:{chateaux:"Neuschwanstein, le château de conte de fées par excellence",montagne:"Les Alpes bavaroises et le Zugspitze",nature:"Lacs turquoise et forêts",neige:"Stations de ski en hiver",culture:"Munich et ses musées"},rt:[["Munich",2,"Vieille ville"],["Füssen",2,"Neuschwanstein"],["Garmisch",2,"Zugspitze"]]},
 {n:"Écosse",c:"Royaume-Uni",tags:["chateaux","nature","montagne","aventure","culture"],lod:85,day:35,tr:{avion:150,train:220,voiture:220},hl:{chateaux:"Édimbourg, Eilean Donan et des dizaines de forteresses",nature:"Highlands, lochs et île de Skye",montagne:"Ben Nevis",aventure:"Randonnées sauvages",culture:"Festivals d'Édimbourg"},rt:[["Édimbourg",2,"Château et vieille ville"],["Loch Ness",1,"Urquhart Castle"],["Skye",2,"Paysages sauvages"],["Glencoe",1,"Les Highlands"]]},
 {n:"Côte dalmate",c:"Croatie",tags:["plage","culture","detente","soleil","fete"],lod:62,day:30,tr:{avion:150,bus:140,voiture:200,bateau:60},hl:{plage:"Eaux cristallines autour de Split et Hvar",culture:"Remparts de Dubrovnik, palais de Dioclétien",detente:"Îles en ferry",soleil:"Été chaud et sec",fete:"Les nuits de Hvar"},rt:[["Split",2,"Palais de Dioclétien"],["Hvar",2,"Île et criques"],["Dubrovnik",2,"Les remparts"]]},
 {n:"Pays basque",c:"France / Espagne",tags:["plage","gastronomie","montagne","nature","fete"],lod:65,day:30,tr:{train:70,avion:90,covoiturage:45,voiture:90},hl:{plage:"Biarritz, Hendaye et le surf",gastronomie:"Pintxos à Saint-Sébastien",montagne:"La Rhune en petit train",nature:"Villages basques et collines vertes",fete:"Fêtes de Bayonne en été"},rt:[["Biarritz",2,"Surf et plages"],["Saint-Jean-de-Luz",1,"Port basque"],["Saint-Sébastien",2,"Pintxos"]]},
 {n:"Sicile",c:"Italie",tags:["plage","culture","gastronomie","soleil","aventure"],lod:55,day:28,tr:{avion:120,bateau:180,voiture:260},hl:{plage:"Plages de Cefalù et San Vito Lo Capo",culture:"Temples grecs d'Agrigente",gastronomie:"Cannoli, arancini et granita",soleil:"Le sud de l'Europe",aventure:"Randonnée sur l'Etna"},rt:[["Palerme",2,"Marchés et palais"],["Cefalù",1,"Plage et cathédrale"],["Agrigente",1,"Vallée des temples"],["Catane",2,"L'Etna"]]},
 {n:"Lisbonne et Sintra",c:"Portugal",tags:["ville","chateaux","plage","gastronomie","culture","fete"],lod:68,day:30,tr:{avion:110,bus:120},hl:{ville:"Tramways et miradouros de Lisbonne",chateaux:"Les palais colorés de Sintra, dignes d'un conte",plage:"Plages de Cascais",gastronomie:"Pastéis de Belém",culture:"Tour de Belém",fete:"Le Bairro Alto"},rt:[["Lisbonne",3,"Alfama et Belém"],["Sintra",1,"Palais de Pena"],["Cascais",1,"Plages"]]},
 {n:"Marrakech et Atlas",c:"Maroc",tags:["aventure","culture","soleil","montagne","pascher","gastronomie"],lod:40,day:22,tr:{avion:130},hl:{aventure:"Nuit sous tente dans le désert d'Agafay",culture:"Médina et jardins Majorelle",soleil:"Soleil toute l'année",montagne:"Villages berbères de l'Atlas",pascher:"Vie sur place très abordable",gastronomie:"Tajines et souks"},rt:[["Marrakech",3,"Médina et souks"],["Atlas",1,"Villages berbères"],["Agafay",1,"Nuit sous tente"]]},
 {n:"Corse",c:"France",tags:["plage","montagne","nature","aventure","soleil"],lod:75,day:32,tr:{avion:130,bateau:110,voiture:260},hl:{plage:"Palombaggia et Santa Giulia",montagne:"L'île de beauté et ses aiguilles de Bavella",nature:"Réserve de Scandola",aventure:"Canyoning et GR20",soleil:"Étés chauds"},rt:[["Ajaccio",1,"Ville natale de Napoléon"],["Calvi",2,"Citadelle et plage"],["Bonifacio",2,"Falaises"],["Porto-Vecchio",2,"Plages"]]},
 {n:"Costa Brava",c:"Espagne",tags:["plage","parcs","fete","soleil","chateaux","pascher"],lod:50,day:28,tr:{train:90,bus:50,covoiturage:45,voiture:80},hl:{plage:"Criques de Tossa de Mar",parcs:"Grand parc d'attractions près de Salou",fete:"Ambiance animée de Lloret",soleil:"Méditerranée",chateaux:"Château de Tossa et village médiéval",pascher:"Accessible en bus"},rt:[["Tossa de Mar",2,"Remparts et crique"],["Gérone",1,"Vieille ville"],["Salou",2,"Parc d'attractions"]]},
 {n:"Annecy et Alpes",c:"France",tags:["montagne","nature","detente","neige","aventure","chateaux"],lod:70,day:32,tr:{train:60,covoiturage:30,voiture:70,bus:30},hl:{montagne:"Les Aravis et le Semnoz",nature:"Le lac le plus pur d'Europe",detente:"Baignade dans le lac",neige:"Ski à La Clusaz",aventure:"Parapente et via ferrata",chateaux:"Château d'Annecy et de Menthon"},rt:[["Annecy",3,"Lac et vieille ville"],["La Clusaz",2,"Montagne"],["Chamonix",1,"Mont-Blanc"]]},
 {n:"Amsterdam et Pays-Bas",c:"Pays-Bas",tags:["ville","culture","nature","fete"],lod:95,day:38,tr:{train:70,bus:40,covoiturage:45,voiture:90},hl:{ville:"Canaux à vélo",culture:"Rijksmuseum et Van Gogh",nature:"Champs de tulipes au printemps",fete:"Vie nocturne animée"},rt:[["Amsterdam",3,"Canaux et musées"],["Keukenhof",1,"Tulipes"],["Utrecht",1,"Ville étudiante"]]},
 {n:"Crète",c:"Grèce",tags:["plage","culture","nature","soleil","detente","gastronomie"],lod:55,day:28,tr:{avion:170,bateau:300},hl:{plage:"Balos et Elafonissi au sable rose",culture:"Palais de Knossos",nature:"Gorges de Samaria",soleil:"Soleil jusqu'en octobre",detente:"Villages tranquilles",gastronomie:"Cuisine crétoise"},rt:[["Héraklion",2,"Knossos"],["Réthymnon",2,"Vieille ville"],["La Canée",2,"Balos et Elafonissi"]]}
];
function offlineSearch(){
  const tags=allTags(),n=nPers(),rooms=Math.max(1,Math.ceil(S.adults/2)),days=S.nights+1;
  const lods=S.lodgings.size?LODGINGS.filter(l=>S.lodgings.has(l.id)):LODGINGS.filter(l=>l.id==="hotes"||l.id==="hotel"||l.id==="habitant");
  const lod=lods.reduce((a,b)=>a.k<b.k?a:b);
  const res=[];
  CAT.forEach(d=>{
    const modes=Object.entries(d.tr).filter(([m])=>!S.transports.size||S.transports.has(m));
    if(!modes.length)return;
    const [mode,tp]=modes.reduce((a,b)=>a[1]<b[1]?a:b);
    const transport=["voiture"].includes(mode)?tp:tp*n;
    const heb=d.lod*lod.k*S.nights*rooms;
    const sur=d.day*days*(S.adults+S.children*.6);
    const total=transport+heb+sur;
    const hit=[...tags].filter(t=>d.tags.includes(t));
    let score=tags.size?Math.round(55+45*hit.length/tags.size):70;
    if(total>S.budget)score-=Math.min(40,Math.round((total-S.budget)/S.budget*60));
    if(tags.has("pascher")&&total<S.budget*.8)score+=5;
    const env=[];
    S.people.forEach(p=>{const pt=[...p.tags];for(const k in KW)if(KW[k].test(p.text)&&!pt.includes(k))pt.push(k);pt.forEach(t=>{const lab=(ENVIES.find(e=>e.id===t)||{}).t;env.push({qui:p.name||"Voyageur",envie:p.text&&KW[t]&&KW[t].test(p.text)?p.text:lab,reponse:d.hl[t]||"Pas le point fort de cette destination"})})});
    res.push({nom:d.n,pays:d.c,score:Math.max(5,Math.min(99,score)),accroche:"Coche "+hit.length+" envie"+(hit.length>1?"s":"")+" sur "+(tags.size||"vos")+" pour un budget "+(total<=S.budget?"tenu":"un peu plus élevé")+".",tags:d.tags,
      transport:{mode:(TRANSPORTS.find(t=>t.id===mode)||{}).t,detail:"Depuis la France, aller-retour",prix:transport},
      hebergement:{type:lod.t,detail:rooms+" chambre"+(rooms>1?"s":"")+", "+S.nights+" nuits",prix:heb},
      surPlace:sur,total:total,envies:env.slice(0,6),
      etapes:S.mode==="roadtrip"?d.rt.map(r=>({lieu:r[0],nuits:r[1],pourquoi:r[2]})):[],
      ville:d.rt[0][0],periode:"",astuce:""});
  });
  res.sort((a,b)=>b.score-a.score);
  return res.slice(0,4);
}

/* ---------- Recherche sur mesure (via notre serveur) ---------- */
// On envoie seulement les choix de l'utilisateur. C'est le serveur qui écrit
// la consigne pour Claude et qui détient la clé secrète.
function payload(){
  return {mode:S.mode,adults:S.adults,children:S.children,nights:S.nights,budget:S.budget,from:S.from,month:S.month,
    transports:[...S.transports],lodgings:[...S.lodgings],
    people:S.people.map(p=>({name:p.name,tags:[...p.tags],text:p.text}))};
}
async function askServer(signal){
  const res=await fetch("/api/destinations",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload()),signal});
  const out=await res.json().catch(()=>null);
  if(!res.ok){const e=new Error("api");e.code=(out&&out.code)||"server_error";throw e}
  return out;
}
function num(v){const n=Number(String(v).replace(/[^\d.,-]/g,"").replace(",","."));return isFinite(n)?n:0}
function normalize(d){
  const t={prix:num(d.transport&&d.transport.prix)},h={prix:num(d.hebergement&&d.hebergement.prix)},s=num(d.surPlace);
  return {nom:d.nom||"Destination",pays:d.pays||"",score:Math.max(0,Math.min(100,num(d.score)||70)),accroche:d.accroche||"",tags:Array.isArray(d.tags)?d.tags:[],
    transport:{mode:(d.transport&&d.transport.mode)||"",detail:(d.transport&&d.transport.detail)||"",prix:t.prix},
    hebergement:{type:(d.hebergement&&d.hebergement.type)||"",detail:(d.hebergement&&d.hebergement.detail)||"",prix:h.prix},
    surPlace:s,total:num(d.total)||t.prix+h.prix+s,envies:Array.isArray(d.envies)?d.envies.slice(0,8):[],etapes:Array.isArray(d.etapes)?d.etapes.slice(0,6):[],
    ville:d.ville||d.nom||"",periode:d.periode||"",astuce:d.astuce||""};
}

/* ---------- Results ---------- */
const WAIT=["On fouille les plages…","On visite les châteaux…","On compare trains, vols et covoiturages…","On vérifie que tout tient dans le budget…","On demande l'avis des enfants…"];
let ctl=null,waitTimer=null;
function showWaiting(){
  const r=$("#results");let i=0;
  r.innerHTML='<div class="block"><h2>Votre voyage se prépare</h2><div class="status"><div class="dots" aria-hidden="true"><i></i><i></i><i></i></div><span id="waitMsg">'+WAIT[0]+'</span><button type="button" class="stop" id="stop">Arrêter</button></div><p class="note">La recherche prend en général 20 à 60 secondes.</p></div>';
  $("#stop").onclick=()=>ctl&&ctl.abort();
  clearInterval(waitTimer);waitTimer=setInterval(()=>{i=(i+1)%WAIT.length;const m=$("#waitMsg");if(m)m.textContent=WAIT[i]},3200);
}
function miniScene(tags){
  const has=t=>tags.includes(t);
  const sea=has("plage")||has("detente"),mount=has("montagne")||has("neige")||has("aventure"),castle=has("chateaux")||has("culture"),city=has("ville")||has("fete"),wheel=has("parcs"),trees=has("nature");
  let s='<svg class="pic" viewBox="0 0 400 140" aria-hidden="true"><rect width="400" height="140" fill="var(--sky)"/><circle cx="350" cy="30" r="16" fill="#FFD84A"/>';
  if(mount)s+='<path d="M0 104 L80 40 L130 80 L190 30 L270 104 Z" fill="var(--mount)"/>'+(has("neige")?'<path d="M80 40 L68 52 L84 50 L92 56 Z M190 30 L176 44 L192 42 L202 48 Z" fill="#fff"/>':'');
  if(city)s+='<g fill="var(--stone2)"><rect x="30" y="62" width="22" height="44"/><rect x="56" y="50" width="18" height="56"/><rect x="78" y="72" width="26" height="34"/></g>';
  if(castle)s+='<g fill="var(--stone)"><rect x="230" y="64" width="70" height="42"/><rect x="222" y="52" width="16" height="54"/><rect x="292" y="52" width="16" height="54"/><rect x="256" y="46" width="18" height="60"/></g><g fill="#C9584A"><path d="M220 54 L230 36 L240 54 Z M290 54 L300 36 L310 54 Z M254 48 L265 24 L276 48 Z"/></g>';
  if(wheel)s+='<circle cx="350" cy="78" r="24" fill="none" stroke="#C9584A" stroke-width="3"/><path d="M326 78 H374 M350 54 V102" stroke="#C9584A" stroke-width="1.5"/>';
  s+='<path d="M0 104 Q100 96 200 104 T400 100 V140 H0 Z" fill="var(--grass)"/>';
  if(trees)s+='<g fill="var(--grass2)"><circle cx="160" cy="102" r="10"/><circle cx="176" cy="98" r="13"/><circle cx="192" cy="104" r="9"/></g>';
  if(sea)s+='<path d="M0 114 Q100 108 200 114 T400 112 V140 H0 Z" fill="var(--sand)"/><path d="M0 122 Q100 116 200 122 T400 120 V140 H0 Z" fill="var(--sea)"/>';
  return s+'</svg>';
}
function links(d){
  const q=encodeURIComponent(d.ville||d.nom),L=[];
  const wantsLod=id=>!S.lodgings.size||S.lodgings.has(id);
  if(wantsLod("hotel")||wantsLod("hotes")||wantsLod("resort")||wantsLod("gite"))L.push(['https://www.booking.com/searchresults.fr.html?ss='+q+'&group_adults='+S.adults+'&group_children='+S.children,"Hôtels & chambres d'hôtes"]);
  if(wantsLod("habitant")||wantsLod("gite"))L.push(['https://www.airbnb.fr/s/'+q+'/homes?adults='+S.adults+'&children='+S.children,"Chez l'habitant"]);
  const tm=(d.transport.mode||"").toLowerCase();
  if(/avion|vol/.test(tm))L.push(['https://www.google.com/travel/flights?q='+encodeURIComponent("vols "+(S.from||"Paris")+" "+(d.ville||d.nom)),"Voir les vols"]);
  if(/train/.test(tm))L.push(["https://www.thetrainline.com/fr","Voir les trains"]);
  if(/covoit/.test(tm))L.push(["https://www.blablacar.fr","Voir les covoiturages"]);
  if(/bus/.test(tm))L.push(["https://www.blablacar.fr/bus","Voir les bus"]);
  if(/bateau|ferry/.test(tm))L.push(["https://www.directferries.fr","Voir les ferries"]);
  return L.map((l,i)=>'<a class="'+(i===0?"main":"")+'" href="'+l[0]+'" target="_blank" rel="noopener">'+esc(l[1])+'</a>').join("");
}
function card(d){
  const within=d.total<=S.budget,diff=Math.abs(S.budget-d.total);
  const tot=Math.max(1,d.transport.prix+d.hebergement.prix+d.surPlace);
  const pc=v=>(v/tot*100).toFixed(1)+"%";
  let h='<article class="card">'+miniScene(d.tags.map(String))+'<div class="card-body"><div class="card-top"><div><h3>'+esc(d.nom)+'</h3><div class="country">'+esc(d.pays)+'</div></div><div class="match"><b>'+Math.round(d.score)+'%</b><span>d\'envies</span></div></div>';
  if(d.accroche)h+='<p class="pitch">'+esc(d.accroche)+'</p>';
  h+='<div class="price"><strong>'+eur(d.total)+'</strong>'+(within?'<span class="ok">'+eur(diff)+' sous votre budget</span>':'<span class="over">'+eur(diff)+' au-dessus du budget</span>')+'</div>';
  h+='<div class="bar" aria-hidden="true"><i style="width:'+pc(d.transport.prix)+';background:var(--sea)"></i><i style="width:'+pc(d.hebergement.prix)+';background:var(--yellow-deep)"></i><i style="width:'+pc(d.surPlace)+';background:var(--grass2)"></i></div>';
  h+='<div class="legend"><span style="--c:var(--sea)">Transport '+eur(d.transport.prix)+'</span><span style="--c:var(--yellow-deep)">Logement '+eur(d.hebergement.prix)+'</span><span style="--c:var(--grass2)">Sur place '+eur(d.surPlace)+'</span></div>';
  if(d.envies.length){h+='<div class="sub">Les envies de chacun</div><ul class="wishes">'+d.envies.map(e=>'<li><b>'+esc(e.qui)+(e.envie?' · '+esc(e.envie):'')+'</b>'+esc(e.reponse)+'</li>').join("")+'</ul>'}
  if(d.etapes.length){h+='<div class="sub">L\'itinéraire</div><ol class="route">'+d.etapes.map(e=>'<li><b>'+esc(e.lieu)+'</b>'+(num(e.nuits)?' · '+num(e.nuits)+' nuit'+(num(e.nuits)>1?'s':''):'')+(e.pourquoi?'<br>'+esc(e.pourquoi):'')+'</li>').join("")+'</ol>'}
  h+='<div class="facts"><div class="fact">Transport<b>'+esc(d.transport.mode||"—")+'</b>'+esc(d.transport.detail)+'</div><div class="fact">Logement<b>'+esc(d.hebergement.type||"—")+'</b>'+esc(d.hebergement.detail)+'</div>'+(d.periode?'<div class="fact">Meilleure période<b>'+esc(d.periode)+'</b></div>':'')+'</div>';
  if(d.astuce)h+='<p class="tip">Astuce : '+esc(d.astuce)+'</p>';
  h+='<div class="book">'+links(d)+'</div></div></article>';
  return h;
}
function showResults(list,source){
  clearInterval(waitTimer);
  const r=$("#results");
  if(!list.length){r.innerHTML='<div class="block"><div class="empty"><h2>Aucune destination ne colle</h2><p>Ajoutez un moyen de transport, augmentez un peu le budget ou retirez une envie, puis relancez la recherche.</p></div></div>';return}
  r.innerHTML='<div class="block"><h2>'+list.length+' voyages pour vous</h2><p class="hint">'+(source==="claude"?"Sélection sur mesure selon les envies de chacun.":"Sélection issue du catalogue Rêverie. Les prix sont des estimations.")+'</p>'+list.map(card).join("")+'</div>';
  r.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});
}
const ERR={no_key:"La recherche sur mesure n'est pas encore activée (clé API manquante sur le serveur). Voici notre sélection du catalogue.",rate_limited:"Beaucoup de recherches d'un coup. Voici notre sélection du catalogue ; réessayez dans une minute pour du sur-mesure.",invalid_request:"Certaines informations n'étaient pas valides. Voici notre sélection du catalogue.",refused:"La recherche sur mesure n'a pas pu répondre à cette demande. Voici notre sélection du catalogue.",invalid_json:"La réponse était incomplète. Voici notre sélection du catalogue ; relancez pour réessayer."};
$("#go").onclick=async()=>{
  const btn=$("#go");
  if(!allTags().size&&!S.people.some(p=>p.text.trim())){$("#results").innerHTML='<div class="block"><div class="empty"><h2>Dites-nous ce qui vous fait rêver</h2><p>Cochez au moins une envie (plage, châteaux, montagne…) ou écrivez un rêve en une phrase.</p></div></div>';$("#results").scrollIntoView();return}
  btn.disabled=true;btn.textContent="Recherche en cours…";
  try{
    showWaiting();ctl=new AbortController();
    const out=await askServer(ctl.signal);
    const list=(out&&Array.isArray(out.destinations)?out.destinations:Array.isArray(out)?out:[]).map(normalize);
    showResults(list.length?list:offlineSearch(),list.length?"claude":"offline");
  }catch(e){
    showResults(offlineSearch(),"offline");
    const msg=e&&e.name==="AbortError"?"Recherche arrêtée. Voici notre sélection du catalogue.":(ERR[e&&e.code]||"La recherche personnalisée n'a pas abouti. Voici notre sélection du catalogue.");
    const p=document.createElement("p");p.className="note";p.textContent=msg;const b=$("#results .block");if(b)b.insertBefore(p,b.children[2]||null);
  }finally{btn.disabled=false;btn.textContent="Trouver mon voyage";clearInterval(waitTimer)}
};
