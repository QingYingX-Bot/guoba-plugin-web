export interface AnsiTextSegment {
  style: Record<string, string>;
  text: string;
}

const SGR_PATTERN = /\u001B\[([\d;]*)m/g;

const ANSI_COLORS = [
  '#111827',
  '#ef4444',
  '#22c55e',
  '#eab308',
  '#3b82f6',
  '#d946ef',
  '#06b6d4',
  '#e5e7eb',
];

const ANSI_BRIGHT_COLORS = [
  '#6b7280',
  '#f87171',
  '#4ade80',
  '#facc15',
  '#60a5fa',
  '#e879f9',
  '#22d3ee',
  '#ffffff',
];

export function parseAnsiText(value: string): AnsiTextSegment[] {
  const source = String(value || '');
  const segments: AnsiTextSegment[] = [];
  const style: Record<string, string> = {};
  let lastIndex = 0;

  for (const match of source.matchAll(SGR_PATTERN)) {
    const index = match.index ?? 0;
    appendSegment(segments, source.slice(lastIndex, index), style);
    applyCodes(style, parseCodes(match[1] || '0'));
    lastIndex = index + match[0].length;
  }

  appendSegment(segments, source.slice(lastIndex), style);
  return segments.length > 0 ? segments : [{ style: {}, text: source }];
}

function appendSegment(
  segments: AnsiTextSegment[],
  text: string,
  style: Record<string, string>,
) {
  if (!text) {
    return;
  }
  segments.push({ style: { ...style }, text });
}

function parseCodes(value: string) {
  const codes = value.split(';').map(code => Number.parseInt(code, 10));
  return codes.every(Number.isFinite) ? codes : [0];
}

function applyCodes(style: Record<string, string>, codes: number[]) {
  for (let index = 0; index < codes.length; index += 1) {
    const code = codes[index] ?? 0;
    if (code === 0) {
      clearStyle(style);
    } else if (code === 1) {
      style.fontWeight = '700';
    } else if (code === 2) {
      style.opacity = '0.76';
    } else if (code === 3) {
      style.fontStyle = 'italic';
    } else if (code === 4) {
      style.textDecoration = 'underline';
    } else if (code === 22) {
      delete style.fontWeight;
      delete style.opacity;
    } else if (code === 23) {
      delete style.fontStyle;
    } else if (code === 24) {
      delete style.textDecoration;
    } else if (code === 39) {
      delete style.color;
    } else if (code === 49) {
      delete style.backgroundColor;
    } else if (isBasicColor(code)) {
      style.color = getBasicColor(code);
    } else if (isBasicBackground(code)) {
      style.backgroundColor = getBasicBackground(code);
    } else if (code === 38 || code === 48) {
      index = applyExtendedColor(style, codes, index, code === 48);
    }
  }
}

function clearStyle(style: Record<string, string>) {
  for (const key of Object.keys(style)) {
    delete style[key];
  }
}

function isBasicColor(code: number) {
  return (code >= 30 && code <= 37) || (code >= 90 && code <= 97);
}

function isBasicBackground(code: number) {
  return (code >= 40 && code <= 47) || (code >= 100 && code <= 107);
}

function getBasicColor(code: number) {
  return code >= 90
    ? getColor(ANSI_BRIGHT_COLORS, code - 90)
    : getColor(ANSI_COLORS, code - 30);
}

function getBasicBackground(code: number) {
  return code >= 100
    ? getColor(ANSI_BRIGHT_COLORS, code - 100)
    : getColor(ANSI_COLORS, code - 40);
}

function applyExtendedColor(
  style: Record<string, string>,
  codes: number[],
  index: number,
  background: boolean,
) {
  const mode = codes[index + 1];
  const key: 'backgroundColor' | 'color' = background ? 'backgroundColor' : 'color';
  if (mode === 5) {
    style[key] = ansi256ToColor(codes[index + 2] ?? 7);
    return index + 2;
  }
  if (mode === 2) {
    const r = clampRgb(codes[index + 2] ?? 255);
    const g = clampRgb(codes[index + 3] ?? 255);
    const b = clampRgb(codes[index + 4] ?? 255);
    style[key] = `rgb(${r}, ${g}, ${b})`;
    return index + 4;
  }
  return index;
}

function ansi256ToColor(code: number) {
  const value = Math.max(0, Math.min(255, code));
  if (value < 8) {
    return getColor(ANSI_COLORS, value);
  }
  if (value < 16) {
    return getColor(ANSI_BRIGHT_COLORS, value - 8);
  }
  if (value >= 232) {
    const gray = 8 + (value - 232) * 10;
    return `rgb(${gray}, ${gray}, ${gray})`;
  }
  const offset = value - 16;
  const r = colorCubeValue(Math.floor(offset / 36));
  const g = colorCubeValue(Math.floor((offset % 36) / 6));
  const b = colorCubeValue(offset % 6);
  return `rgb(${r}, ${g}, ${b})`;
}

function colorCubeValue(value: number) {
  return value === 0 ? 0 : value * 40 + 55;
}

function getColor(colors: string[], index: number) {
  return colors[index] ?? '#e5e7eb';
}

function clampRgb(value: number) {
  return Math.max(0, Math.min(255, value));
}
