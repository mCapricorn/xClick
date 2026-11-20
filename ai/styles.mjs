export const styleLanguages = ['en', 'zh-Hans', 'zh-Hant', 'de', 'it', 'ja', 'ko', 'fr'];

export const styleLabels = {
  minimal: ['Minimal', '极简', '極簡', 'In wenigen Worten', 'In poche parole', 'ひとこと', '한마디', 'En quelques mots'],
  concise: ['Concise', '简洁', '簡潔', 'Knapp', 'Sintetico', '簡潔', '간결하게', 'Concis'],
  conversational: ['Conversational', '聊天口吻', '聊天口吻', 'Im Gesprächston', 'Colloquiale', '会話調', '대화하듯', 'Ton de conversation'],
  vivid: ['Vivid', '生动', '生動', 'Bildhaft', 'Espressivo', '表現豊か', '생생하게', 'Expressif'],
  enthusiastic: ['Chatty & enthusiastic', '热情健谈', '熱情健談', 'Begeistert und gesprächig', 'Entusiasta e loquace', '熱のこもったおしゃべり', '열정적인 수다', 'Bavard et enthousiaste'],
  curious: ['Curious', '好奇追问', '好奇追問', 'Neugierig', 'Curioso', '好奇心たっぷり', '궁금해서 묻기', 'Curieux'],
  dryHumor: ['Dry humor', '冷幽默', '冷幽默', 'Trockener Humor', 'Umorismo secco', '淡々としたユーモア', '담담한 유머', 'Humour pince-sans-rire'],
  supportive: ['Supportive', '暖心鼓励', '暖心鼓勵', 'Ermutigend', 'Incoraggiante', '温かい応援', '따뜻한 응원', 'Encourageant'],
  askGrok: ['Ask Grok', '与 Grok 互动', '與 Grok 互動', 'Grok fragen', 'Chiedi a Grok', 'Grok に聞く', 'Grok에게 묻기', 'Demander à Grok'],
};
export const defaultStyles = ['minimal', 'concise', 'conversational', 'vivid', 'enthusiastic'];
export const styleIds = Object.keys(styleLabels);

export const styleLimits = { count: 16, name: 48, prompt: 800, sample: 1200 };

export function customDefinitions(value) {
  if (!Array.isArray(value)) return [];
  const definitions = new Map();
  for (const entry of value) {
    if (!entry || typeof entry.id !== 'string' || !/^custom-[a-z0-9-]{1,48}$/.test(entry.id) || definitions.has(entry.id)) continue;
    const name = typeof entry.name === 'string' && entry.name.trim();
    const prompt = typeof entry.prompt === 'string' && entry.prompt.trim();
    if (name && name.length <= styleLimits.name && prompt && prompt.length <= styleLimits.prompt) {
      definitions.set(entry.id, { id: entry.id, name, prompt });
      if (definitions.size === styleLimits.count) break;
    }
  }
  return [...definitions.values()];
}

export function selectedStyles(value, custom) {
  const valid = Array.isArray(value) ? [...styleIds, ...customDefinitions(custom).map(style => style.id)].filter(id => value.includes(id)) : [];
  return valid.length ? valid : [...defaultStyles];
}

export function composerLabels(language, custom) {
  const index = Math.max(0, styleLanguages.indexOf(language));
  return Object.fromEntries([...styleIds.map(id => [id, styleLabels[id][index]]),
    ...customDefinitions(custom).map(({ id, name }) => [id, name])]);
}
