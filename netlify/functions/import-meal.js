const MAX_RESPONSE_BYTES = 2_000_000;

const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json' }
});

const cleanText = (value) => String(value || '').replace(/\s+/g, ' ').trim();

const getRecipeNode = (value) => {
  if (!value) return null;
  if (Array.isArray(value)) {
    return value.find(getRecipeNode) || null;
  }
  if (typeof value !== 'object') return null;
  if (value['@type'] === 'Recipe' || (Array.isArray(value['@type']) && value['@type'].includes('Recipe'))) {
    return value;
  }
  return getRecipeNode(value['@graph']);
};

const parseJsonLd = (html) => {
  const scripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const match of scripts) {
    try {
      const recipe = getRecipeNode(JSON.parse(match[1].trim()));
      if (recipe) return recipe;
    } catch {
      // Ignore unrelated or malformed JSON-LD blocks.
    }
  }
  return null;
};

const formatInstructions = (instructions) => {
  const instructionList = Array.isArray(instructions) ? instructions : [instructions];
  return instructionList.map((instruction) => {
    if (typeof instruction === 'string') return cleanText(instruction);
    if (!instruction || typeof instruction !== 'object') return cleanText(instruction);
    const section = cleanText(instruction.name);
    const text = cleanText(instruction.text);
    return [section, text].filter(Boolean).join(': ');
  }).filter(Boolean).join('\n');
};

const UNICODE_FRACTIONS = {
  '½': '1/2',
  '⅓': '1/3',
  '⅔': '2/3',
  '¼': '1/4',
  '¾': '3/4',
  '⅕': '1/5',
  '⅖': '2/5',
  '⅗': '3/5',
  '⅘': '4/5',
  '⅙': '1/6',
  '⅚': '5/6',
  '⅛': '1/8',
  '⅜': '3/8',
  '⅝': '5/8',
  '⅞': '7/8'
};

const UNIT_ALIASES = {
  tsp: 'tsp',
  tsps: 'tsp',
  teaspoon: 'tsp',
  teaspoons: 'tsp',
  tbsp: 'Tbsp',
  tbsps: 'Tbsp',
  tablespoon: 'Tbsp',
  tablespoons: 'Tbsp',
  cup: 'cup',
  cups: 'cup',
  c: 'c',
  oz: 'oz',
  ounce: 'oz',
  ounces: 'oz',
  lb: 'lb',
  lbs: 'lb',
  pound: 'lb',
  pounds: 'lb',
  g: 'g',
  gram: 'g',
  grams: 'g',
  kg: 'kg',
  kilogram: 'kg',
  kilograms: 'kg',
  ml: 'ml',
  milliliter: 'ml',
  milliliters: 'ml',
  l: 'l',
  liter: 'l',
  liters: 'l',
  pint: 'pt',
  pints: 'pt',
  pt: 'pt',
  quart: 'qt',
  quarts: 'qt',
  qt: 'qt',
  clove: 'clove',
  cloves: 'clove',
  can: 'can',
  cans: 'can',
  bottle: 'bottle',
  bottles: 'bottle',
  jar: 'jar',
  jars: 'jar',
  slice: 'slice',
  slices: 'slice',
  piece: 'pc',
  pieces: 'pc',
  pc: 'pc',
  package: 'pkg',
  packages: 'pkg',
  pkg: 'pkg',
  bag: 'bag',
  bags: 'bag',
  box: 'box',
  boxes: 'box',
  pinch: 'pinch',
  pinches: 'pinch',
  dash: 'dash',
  dashes: 'dash',
  handful: 'handful',
  handfuls: 'handful',
  sprig: 'sprig',
  sprigs: 'sprig',
  stalk: 'stalk',
  stalks: 'stalk',
  head: 'head',
  heads: 'head',
  dozen: 'dozen',
  packet: 'packet',
  packets: 'packet',
  whole: 'whole'
};

const normalizeFractionText = (text) => Object.entries(UNICODE_FRACTIONS).reduce(
  (result, [symbol, fraction]) => result.replaceAll(symbol, ` ${fraction}`),
  text
).replace(/\s+/g, ' ').trim();

const parseIngredient = (ingredient) => {
  let remaining = normalizeFractionText(cleanText(ingredient));
  let amount = '';
  let unit = '';

  // Amounts are always taken from the beginning so values in the ingredient name are untouched.
  const amountMatch = remaining.match(/^(\d+(?:\.\d+)?(?:\s+\d+\/\d+|\/\d+)?|\d+\/\d+)(?=\s|$)/);
  if (amountMatch) {
    amount = amountMatch[1];
    remaining = remaining.slice(amountMatch[0].length).trim();
  }

  const unitMatch = remaining.match(/^([a-z]+)(?=\s|\.|,|$)/i);
  const normalizedUnit = unitMatch && UNIT_ALIASES[unitMatch[1].toLowerCase()];
  if (normalizedUnit) {
    unit = normalizedUnit;
    remaining = remaining.slice(unitMatch[0].length).replace(/^[.,]\s*/, '').trim();
  }

  return { amount, unit, name: remaining || cleanText(ingredient) };
};

export default async (request) => {
  if (request.method !== 'POST') return jsonResponse({ error: 'Use POST.' }, 405);

  let url;
  try {
    ({ url } = await request.json());
    const parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error('Only HTTP and HTTPS URLs are supported.');
    url = parsedUrl.toString();
  } catch (error) {
    return jsonResponse({ error: error.message || 'Enter a valid recipe URL.' }, 400);
  }

  try {
    const response = await fetch(url, { headers: { 'user-agent': 'MealMix recipe importer' } });
    if (!response.ok) return jsonResponse({ error: `The website returned HTTP ${response.status}.` }, 422);
    const html = await response.text();
    if (html.length > MAX_RESPONSE_BYTES) return jsonResponse({ error: 'That page is too large to import.' }, 422);

    const recipe = parseJsonLd(html);
    if (!recipe?.name || !recipe.recipeIngredient?.length) {
      return jsonResponse({ error: 'No complete Schema.org Recipe data was found on that page.' }, 422);
    }

    return jsonResponse({
      name: cleanText(recipe.name),
      recipeUrl: url,
      ingredients: recipe.recipeIngredient.map(parseIngredient),
      recipe: formatInstructions(recipe.recipeInstructions)
    });
  } catch (error) {
    console.error('Recipe import failed:', error);
    return jsonResponse({ error: 'The recipe page could not be reached.' }, 502);
  }
};