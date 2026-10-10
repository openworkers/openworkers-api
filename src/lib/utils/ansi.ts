// Minimal ANSI SGR parser for worker log lines. Produces plain-text segments
// with styles instead of HTML, so the page never needs {@html} on user output.

export interface AnsiStyle {
  fg?: string;
  bg?: string;
  bold?: boolean;
  dim?: boolean;
  italic?: boolean;
  underline?: boolean;
}

export interface AnsiSegment extends AnsiStyle {
  text: string;
}

// Mid-tone palette that stays readable on both the light and dark themes.
const BASE_COLORS = [
  '#6b7280', // black (rendered grey, black would vanish on dark)
  '#ef4444', // red
  '#22c55e', // green
  '#eab308', // yellow
  '#3b82f6', // blue
  '#d946ef', // magenta
  '#06b6d4', // cyan
  '#9ca3af' // white (rendered light grey, white would vanish on light)
];

const BRIGHT_COLORS = ['#9ca3af', '#f87171', '#4ade80', '#facc15', '#60a5fa', '#e879f9', '#22d3ee', '#d1d5db'];

function color256(n: number | undefined): string | undefined {
  if (n === undefined || !Number.isInteger(n) || n < 0 || n > 255) return undefined;
  if (n < 8) return BASE_COLORS[n];
  if (n < 16) return BRIGHT_COLORS[n - 8];

  if (n < 232) {
    const i = n - 16;
    const level = (v: number) => (v === 0 ? 0 : 55 + v * 40);
    return `rgb(${level(Math.floor(i / 36))}, ${level(Math.floor(i / 6) % 6)}, ${level(i % 6)})`;
  }

  const grey = 8 + (n - 232) * 10;
  return `rgb(${grey}, ${grey}, ${grey})`;
}

/** Reads an extended color (38/48 ;5;n or ;2;r;g;b) starting at codes[i]. */
function extendedColor(codes: number[], i: number): { color?: string; consumed: number } {
  if (codes[i + 1] === 5) {
    return { color: color256(codes[i + 2]), consumed: 2 };
  }

  if (codes[i + 1] === 2) {
    const [r, g, b] = codes.slice(i + 2, i + 5);
    const valid = [r, g, b].every((v) => v !== undefined && Number.isInteger(v) && v >= 0 && v <= 255);
    return { color: valid ? `rgb(${r}, ${g}, ${b})` : undefined, consumed: 4 };
  }

  return { consumed: 0 };
}

function applySgr(style: AnsiStyle, params: string): AnsiStyle {
  const codes = params === '' ? [0] : params.split(';').map((p) => (p === '' ? 0 : Number(p)));
  const next = { ...style };

  for (let i = 0; i < codes.length; i++) {
    const code = codes[i] ?? 0;

    if (code === 0) {
      for (const key of Object.keys(next)) delete next[key as keyof AnsiStyle];
    } else if (code === 1) next.bold = true;
    else if (code === 2) next.dim = true;
    else if (code === 3) next.italic = true;
    else if (code === 4) next.underline = true;
    else if (code === 22) next.bold = next.dim = undefined;
    else if (code === 23) next.italic = undefined;
    else if (code === 24) next.underline = undefined;
    else if (code >= 30 && code <= 37) next.fg = BASE_COLORS[code - 30];
    else if (code === 39) next.fg = undefined;
    else if (code >= 40 && code <= 47) next.bg = BASE_COLORS[code - 40];
    else if (code === 49) next.bg = undefined;
    else if (code >= 90 && code <= 97) next.fg = BRIGHT_COLORS[code - 90];
    else if (code >= 100 && code <= 107) next.bg = BRIGHT_COLORS[code - 100];
    else if (code === 38 || code === 48) {
      const { color, consumed } = extendedColor(codes, i);
      if (code === 38) next.fg = color;
      else next.bg = color;
      i += consumed;
    }
  }

  return next;
}

// CSI sequences (SGR or cursor/erase controls) and OSC sequences (titles, links).
const ESCAPE_RE = /\x1b\[([0-9;?]*)([A-Za-z])|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g;

export function parseAnsi(input: string): AnsiSegment[] {
  const segments: AnsiSegment[] = [];
  let style: AnsiStyle = {};
  let last = 0;

  const push = (text: string) => {
    if (text) segments.push({ ...style, text });
  };

  for (const match of input.matchAll(ESCAPE_RE)) {
    push(input.slice(last, match.index));
    last = match.index + match[0].length;

    // Only SGR ("m") changes styling; every other sequence is dropped.
    if (match[2] === 'm') {
      style = applySgr(style, match[1] ?? '');
    }
  }

  push(input.slice(last));

  return segments;
}

/** Text with every escape sequence removed (for search and copy). */
export function stripAnsi(input: string): string {
  return input.replace(ESCAPE_RE, '');
}
