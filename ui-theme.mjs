export const themeKeys = ['xc_theme', 'xc_theme_primary', 'xc_theme_accent'];
const palettes = {
  cyber: ['#00f6ff', '#ff2bd6'],
  aurora: ['#7bffd6', '#9a7bff'],
  sakura: ['#ff8fae', '#ffe178'],
  mono: ['#f5f5f5', '#929bab']
};
export const validHex = value => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);

export function applyPalette(theme, primary, accent) {
  const root = document.documentElement;
  const colors = theme === 'custom' && validHex(primary) && validHex(accent)
    ? [primary, accent] : (palettes[theme] || palettes.cyber);
  root.dataset.theme = theme;
  root.style.setProperty('--xp-primary', colors[0]);
  root.style.setProperty('--xp-accent', colors[1]);
}
