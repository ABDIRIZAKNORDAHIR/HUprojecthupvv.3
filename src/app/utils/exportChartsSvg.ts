/** Inline SVG charts for professional PDF / print exports */

export interface ChartBarItem {
  label: string;
  value: number;
  color?: string;
}

export interface ChartLineSeries {
  key: string;
  label: string;
  color: string;
  points: Array<{ x: string; y: number }>;
}

const DEFAULT_COLORS = ['#16A34A', '#2563EB', '#0F2D5C', '#EAB308', '#EF4444', '#7C3AED'];

export function svgBarChart(
  data: ChartBarItem[],
  opts: { width?: number; height?: number; title?: string } = {}
): string {
  const W = opts.width ?? 420;
  const H = opts.height ?? 220;
  const pad = { t: 28, r: 16, b: 48, l: 36 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const max = Math.max(1, ...data.map(d => d.value));
  const barW = Math.min(56, (innerW / Math.max(data.length, 1)) * 0.62);
  const gap = (innerW - barW * data.length) / (data.length + 1);

  const bars = data.map((d, i) => {
    const h = (d.value / max) * innerH;
    const x = pad.l + gap + i * (barW + gap);
    const y = pad.t + innerH - h;
    const color = d.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length];
    return `
      <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" rx="4" fill="${color}"/>
      <text x="${(x + barW / 2).toFixed(1)}" y="${(pad.t + innerH + 16).toFixed(1)}" text-anchor="middle" font-size="10" fill="#475569">${escSvg(d.label)}</text>
      <text x="${(x + barW / 2).toFixed(1)}" y="${(y - 6).toFixed(1)}" text-anchor="middle" font-size="10" font-weight="600" fill="#0F2D5C">${d.value}</text>`;
  }).join('');

  const title = opts.title
    ? `<text x="${W / 2}" y="18" text-anchor="middle" font-size="12" font-weight="700" fill="#0F2D5C">${escSvg(opts.title)}</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    ${title}
    <line x1="${pad.l}" y1="${pad.t + innerH}" x2="${W - pad.r}" y2="${pad.t + innerH}" stroke="#E2E8F0" stroke-width="1"/>
    ${bars}
  </svg>`;
}

export function svgPieChart(
  data: ChartBarItem[],
  opts: { width?: number; height?: number; title?: string } = {}
): string {
  const filtered = data.filter(d => d.value > 0);
  const W = opts.width ?? 420;
  const H = opts.height ?? 220;
  const cx = W / 2;
  const cy = H / 2 + 8;
  const r = Math.min(W, H) * 0.32;
  const total = filtered.reduce((s, d) => s + d.value, 0) || 1;
  let angle = -Math.PI / 2;

  const slices = filtered.map((d, i) => {
    const slice = (d.value / total) * Math.PI * 2;
    const x1 = cx + r * Math.cos(angle);
    const y1 = cy + r * Math.sin(angle);
    angle += slice;
    const x2 = cx + r * Math.cos(angle);
    const y2 = cy + r * Math.sin(angle);
    const large = slice > Math.PI ? 1 : 0;
    const color = d.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length];
    return `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z" fill="${color}"/>`;
  }).join('');

  const legend = filtered.map((d, i) => {
    const color = d.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length];
    const ly = 24 + i * 16;
    return `<rect x="12" y="${ly - 9}" width="10" height="10" rx="2" fill="${color}"/>
      <text x="28" y="${ly}" font-size="10" fill="#334155">${escSvg(d.label)}: ${d.value}</text>`;
  }).join('');

  const title = opts.title
    ? `<text x="${W / 2}" y="14" text-anchor="middle" font-size="12" font-weight="700" fill="#0F2D5C">${escSvg(opts.title)}</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    ${title}
    ${slices}
    ${legend}
  </svg>`;
}

export function svgLineChart(
  series: ChartLineSeries[],
  opts: { width?: number; height?: number; title?: string } = {}
): string {
  const W = opts.width ?? 420;
  const H = opts.height ?? 220;
  const pad = { t: 28, r: 16, b: 40, l: 36 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const allY = series.flatMap(s => s.points.map(p => p.y));
  const maxY = Math.max(1, ...allY);
  const labels = series[0]?.points.map(p => p.x) ?? [];
  const n = Math.max(labels.length, 1);

  const paths = series.map(s => {
    const pts = s.points.map((p, i) => {
      const x = pad.l + (i / Math.max(n - 1, 1)) * innerW;
      const y = pad.t + innerH - (p.y / maxY) * innerH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    return `<polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="2.5" stroke-linejoin="round"/>`;
  }).join('');

  const legend = series.map((s, i) =>
    `<circle cx="${W - 120 + i * 58}" cy="14" r="4" fill="${s.color}"/>
     <text x="${W - 112 + i * 58}" y="17" font-size="9" fill="#475569">${escSvg(s.label)}</text>`
  ).join('');

  const xLabels = labels.map((lab, i) => {
    const x = pad.l + (i / Math.max(n - 1, 1)) * innerW;
    return `<text x="${x.toFixed(1)}" y="${(H - 8).toFixed(1)}" text-anchor="middle" font-size="8" fill="#94A3B8">${escSvg(lab)}</text>`;
  }).join('');

  const title = opts.title
    ? `<text x="${pad.l}" y="18" font-size="12" font-weight="700" fill="#0F2D5C">${escSvg(opts.title)}</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    ${title}
    ${legend}
    <line x1="${pad.l}" y1="${pad.t + innerH}" x2="${W - pad.r}" y2="${pad.t + innerH}" stroke="#E2E8F0"/>
    ${paths}
    ${xLabels}
  </svg>`;
}

/** Mini bar in Excel cell using block characters */
export function excelBarCell(value: number, max: number, width = 12): string {
  const filled = Math.round((value / Math.max(max, 1)) * width);
  return '█'.repeat(filled) + '░'.repeat(Math.max(0, width - filled));
}

function escSvg(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
