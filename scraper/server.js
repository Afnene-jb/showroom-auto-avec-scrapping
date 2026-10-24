const http = require('http');
const cheerio = require('cheerio');

const SITE = 'https://www.automobile.tn';
const BADGES = /^(Nouveau Prix|Nouveau|Promo|Disponible|Offre exclusive|Offre Flash|Madness Deals)\s+/i;

const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, ''); // "Mercedes-Benz" -> "mercedesbenz"
const abs = (u) => (u ? new URL(u, SITE).href : '');

// tous les morceaux de texte d'un élément, séparés par un espace
const textOf = ($, el) => $(el).find('*').addBack().contents()
  .filter((_, n) => n.type === 'text').map((_, n) => n.data.trim()).get()
  .filter(Boolean).join(' ').replace(/\s+/g, ' ');

// Le site écrit parfois le nom deux fois ("Skoda Slavia Skoda Slavia") : on le garde une seule fois
function cleanName(text) {
  const w = text.split('à partir de')[0].trim().replace(BADGES, '').split(' ');
  for (let k = Math.floor(w.length / 2); k >= 1; k--) {
    const first = w.slice(0, w.length - k).join(' ');
    if (first.endsWith(w.slice(-k).join(' '))) return first;
  }
  return w.join(' ');
}

// Page d'accueil : voitures neuves + liste des marques
function parseHome(html) {
  const $ = cheerio.load(html);
  const brands = {}; // slug -> { name, logo }
  const cars = [];
  $('a[href*="/fr/neuf/"]').each((_, a) => {
    const link = abs($(a).attr('href'));
    const parts = new URL(link).pathname.split('/'); // ['', 'fr', 'neuf', marque, modèle...]
    const img = $(a).find('img').first();
    if (parts.length === 4) { // lien d'une marque : /fr/neuf/audi
      if (img.length) brands[parts[3]] = { name: img.attr('alt') || parts[3], logo: abs(img.attr('src')) };
      return;
    }
    const text = textOf($, a);
    const price = text.match(/à partir de\s*([\d\s.]+?)\s*DT/i);
    if (!price || cars.some((c) => c.link === link)) return;
    cars.push({
      type: 'Neuf', name: cleanName(text), price: price[1].trim() + ' DT', info: 'À partir de',
      image: abs(img.attr('data-src') || img.attr('src')), link, brand: parts[3],
    });
  });
  cars.forEach((c) => { c.image = c.image || (brands[c.brand] || {}).logo || ''; });
  return { cars, brands };
}

// Page d'annonces d'occasion
function parseUsed(html) {
  const $ = cheerio.load(html);
  const total = +(($.text().match(/Afficher\s+(\d+)\s+annonces/) || [])[1] || 0);
  const cars = [];
  $('a').each((_, a) => {
    const link = abs($(a).attr('href'));
    if (!/\/fr\/occasion\/(s=[^/]*\/)?[^/]+\/[^/]+\/\d+$/.test(link) || cars.some((c) => c.link === link)) return;
    // la carte = le plus petit parent du lien qui contient un titre h2
    let card = $(a).parent();
    while (card.length && !card.find('h2').length) card = card.parent();
    if (card.find('h2').length !== 1) return;

    const li = card.find('li').map((_, x) => $(x).text().replace(/\s+/g, ' ').trim()).get();
    const prices = [...textOf($, card).matchAll(/(\d[\d\s]*)DT/g)];
    const img = card.find('img').first();
    cars.push({
      type: 'Occasion', name: card.find('h2').text().trim(),
      price: prices.length ? prices[prices.length - 1][1].trim() + ' DT' : '',
      info: [li[0], li[1], li[5], li[2]].filter(Boolean).join(' • '), // km, année, énergie, boîte
      image: abs(img.attr('data-src') || img.attr('src')), link,
    });
  });
  return { total, cars };
}

const cache = new Map(); // 10 min de cache : on ne sollicite pas le site à chaque recherche
async function get(url) {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.time < 10 * 60 * 1000) return hit.html;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html = await res.text();
  cache.set(url, { time: Date.now(), html });
  return html;
}

async function usedCars(base, maxPages) {
  const first = parseUsed(await get(`${base}/1`));
  if (!first.cars.length) return [];
  const pages = Math.min(maxPages, Math.ceil(first.total / first.cars.length));
  const others = await Promise.all(
    Array.from({ length: pages - 1 }, (_, i) => get(`${base}/${i + 2}`).then(parseUsed)));
  return [first, ...others].flatMap((p) => p.cars);
}

// q = "audi", "audi q5", "clio"... (vide = un aperçu de tout)
async function search(q) {
  const words = q.split(/\s+/).map(norm).filter(Boolean);
  const match = (name) => words.every((w) => norm(name).includes(w));
  const home = parseHome(await get(`${SITE}/fr`));
  const neuf = home.cars.filter((c) => match(c.name));

  // marques dont on va chercher les occasions
  let slugs = [];
  if (words.length) {
    slugs = Object.keys(home.brands).filter((s) => norm(home.brands[s].name).startsWith(words[0]));
    if (!slugs.length) slugs = [...new Set(neuf.map((c) => c.brand))];
    if (!slugs.length) slugs = [q.trim().split(/\s+/)[0].toLowerCase()];
  }
  const bases = words.length
    ? slugs.slice(0, 2).map((s) => `${SITE}/fr/occasion/s=brand!:${s}`)
    : [`${SITE}/fr/occasion/s=`];
  const used = (await Promise.all(bases.map((b) => usedCars(b, words.length ? 8 : 3).catch(() => []))))
    .flat().filter((c) => match(c.name));
  return [...neuf, ...used];
}

if (require.main === module) {
  http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    try {
      const q = new URL(req.url, 'http://localhost').searchParams.get('q') || '';
      res.end(JSON.stringify(await search(q)));
    } catch (e) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: e.message }));
    }
  }).listen(3000, () => console.log('Scraper prêt : http://localhost:3000?q=audi'));
}

module.exports = { parseHome, parseUsed, search };
