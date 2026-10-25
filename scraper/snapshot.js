// À lancer sur VOTRE PC : npm run snapshot
// Il enregistre un instantané des voitures d'automobile.tn dans public/data/automobile-tn.json.
// L'application les lit ensuite directement : aucun serveur n'est nécessaire (GitHub Pages suffit).
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const OUT = path.join(__dirname, '..', 'public', 'data');
const SITE = 'https://www.automobile.tn';
const HEADERS = { 'User-Agent': 'ShowroomAutoProjetEtudiant/1.0 (projet universitaire)' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const save = (file, data) => fs.writeFileSync(path.join(OUT, file), JSON.stringify(data));

/* ---------- automobile.tn : lecture lente, en respectant robots.txt ---------- */

const abs = (u) => (u ? new URL(u, SITE).href : '');
const textOf = ($, el) => $(el).find('*').addBack().contents()
  .filter((_, n) => n.type === 'text').map((_, n) => n.data.trim()).get()
  .filter(Boolean).join(' ').replace(/\s+/g, ' ');

const BADGES = /^(Nouveau Prix|Nouveau|Promo|Disponible|Offre exclusive|Offre Flash|Madness Deals)\s+/i;
function cleanName(text) { // le site écrit parfois le nom deux fois
  const w = text.split('à partir de')[0].trim().replace(BADGES, '').split(' ');
  for (let k = Math.floor(w.length / 2); k >= 1; k--) {
    const first = w.slice(0, w.length - k).join(' ');
    if (first.endsWith(w.slice(-k).join(' '))) return first;
  }
  return w.join(' ');
}

function parseHome(html) {
  const $ = cheerio.load(html);
  const logos = {};
  const cars = [];
  $('a[href*="/fr/neuf/"]').each((_, a) => {
    const link = abs($(a).attr('href'));
    const parts = new URL(link).pathname.split('/');
    const img = $(a).find('img').first();
    if (parts.length === 4) { if (img.length) logos[parts[3]] = abs(img.attr('src')); return; }
    const text = textOf($, a);
    const price = text.match(/à partir de\s*([\d\s.]+?)\s*DT/i);
    if (!price || cars.some((c) => c.link === link)) return;
    cars.push({ type: 'Neuf', name: cleanName(text), price: price[1].trim() + ' DT', info: 'À partir de',
      image: abs(img.attr('data-src') || img.attr('src')) || logos[parts[3]] || '', link, brand: parts[3] });
  });
  cars.forEach((c) => { c.image = c.image || logos[c.brand] || ''; delete c.brand; });
  return cars;
}

function parseUsed(html) {
  const $ = cheerio.load(html);
  const cars = [];
  $('a').each((_, a) => {
    const link = abs($(a).attr('href'));
    if (!/\/fr\/occasion\/(s=[^/]*\/)?[^/]+\/[^/]+\/\d+$/.test(link) || cars.some((c) => c.link === link)) return;
    let card = $(a).parent();
    while (card.length && !card.find('h2').length) card = card.parent();
    if (card.find('h2').length !== 1) return;
    const li = card.find('li').map((_, x) => $(x).text().replace(/\s+/g, ' ').trim()).get();
    const prices = [...textOf($, card).matchAll(/(\d[\d\s]*)DT/g)];
    const img = card.find('img').first();
    cars.push({ type: 'Occasion', name: card.find('h2').text().trim(),
      price: prices.length ? prices[prices.length - 1][1].trim() + ' DT' : '',
      info: [li[0], li[1], li[5], li[2]].filter(Boolean).join(' • '),
      image: abs(img.attr('data-src') || img.attr('src')), link });
  });
  return cars;
}

async function loadRobots() { // les chemins interdits aux robots par le site
  const res = await fetch(`${SITE}/robots.txt`, { headers: HEADERS });
  const rules = [];
  if (!res.ok) return rules;
  let applies = false;
  (await res.text()).split('\n').forEach((line) => {
    const [k, ...v] = line.split('#')[0].split(':');
    const key = k.trim().toLowerCase(), val = v.join(':').trim();
    if (key === 'user-agent') applies = val === '*';
    else if (key === 'disallow' && applies && val) rules.push(val);
  });
  return rules;
}

async function scrapeAutomobileTn() {
  const rules = await loadRobots();
  const fetchPage = async (url) => {
    if (rules.some((r) => new URL(url).pathname.startsWith(r))) { console.log('  interdit par robots.txt, ignoré :', url); return null; }
    await sleep(2000); // une page toutes les 2 secondes, pas plus
    const res = await fetch(url, { headers: HEADERS });
    const html = await res.text();
    if (!res.ok || html.includes('Just a moment')) {
      throw new Error(`Le site refuse l'accès automatique (code ${res.status}). On s'arrête : ne pas insister.`);
    }
    return html;
  };

  const html = await fetchPage(`${SITE}/fr`);
  if (!html) return [];
  const cars = parseHome(html);
  console.log('  automobile.tn :', cars.length, 'voitures neuves');
  if (!cars.length) {
    fs.writeFileSync(path.join(__dirname, 'debug-home.html'), html);
    console.log('  Aucune voiture reconnue : la page a été enregistrée dans scraper/debug-home.html');
  }
  for (let page = 1; page <= 3; page++) { // quelques pages d'annonces d'occasion
    const used = await fetchPage(`${SITE}/fr/occasion/s=/${page}`);
    if (!used) break;
    const found = parseUsed(used);
    console.log('  automobile.tn : page', page, '->', found.length, 'annonces');
    cars.push(...found);
  }
  return cars;
}

/* ---------- Lancement ---------- */
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  console.log('Lecture de automobile.tn (une page toutes les 2 secondes)...');
  try {
    const cars = await scrapeAutomobileTn();
    if (cars.length) { save('automobile-tn.json', cars); console.log('->', cars.length, 'voitures enregistrées dans public/data/automobile-tn.json'); }
  } catch (e) { console.log('Fichier non mis à jour :', e.message); }
  console.log('Terminé. Faites ensuite : git add . / git commit / git push');
})();
