type Theme = 'dark' | 'light';

// Reactive theme state (runes). The actual <html> class is set pre-paint by an
// inline script in app.html to avoid a flash; this store mirrors it and drives
// the toggle UI + persistence.
export const theme = $state<{ value: Theme }>({ value: 'dark' });

function apply(value: Theme) {
  const el = document.documentElement;
  el.classList.toggle('dark', value === 'dark');
  el.style.backgroundColor = value === 'dark' ? '#09090b' : '#ffffff';
}

export function initTheme() {
  const stored = (localStorage.getItem('theme') as Theme | null) ?? 'dark';
  theme.value = stored;
  apply(stored);
}

export function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark';
  localStorage.setItem('theme', theme.value);
  apply(theme.value);
}
