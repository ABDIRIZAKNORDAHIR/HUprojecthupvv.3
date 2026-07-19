import {
  HU_BRAND_GREEN,
  HU_BRAND_NAVY,
  APP_BRAND_NAME,
  UNIVERSITY_NAME,
  HU_LOGO_URL,
} from '../config/appImages';
import { svgBarChart, svgPieChart, svgLineChart, excelBarCell, type ChartLineSeries } from './exportChartsSvg';

function escCell(v: unknown): string {
  const s = String(v ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export interface ReportSection {
  sheetName: string;
  headers: string[];
  rows: unknown[][];
}

export interface ExportChartBlock {
  title: string;
  subtitle?: string;
  type: 'bar' | 'pie' | 'line';
  barData?: Array<{ label: string; value: number; color?: string }>;
  lineSeries?: ChartLineSeries[];
}

export interface ExportReportMeta {
  subtitle?: string;
  teacherName?: string;
  organization?: string;
  logoUrl?: string;
  primaryColor?: string;
  navyColor?: string;
  charts?: ExportChartBlock[];
  reportType?: 'teacher' | 'admin' | 'general';
}

const EXCEL_STYLES = `
  <Style ss:ID="Default"><Alignment ss:Vertical="Center"/></Style>
  <Style ss:ID="BrandTitle">
    <Font ss:Bold="1" ss:Size="18" ss:Color="#0F2D5C"/>
    <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="BrandSub">
    <Font ss:Size="11" ss:Color="#16A34A" ss:Bold="1"/>
  </Style>
  <Style ss:ID="Meta">
    <Font ss:Size="10" ss:Color="#64748B"/>
  </Style>
  <Style ss:ID="Header">
    <Font ss:Bold="1" ss:Color="#FFFFFF" ss:Size="11"/>
    <Interior ss:Color="#0F2D5C" ss:Pattern="Solid"/>
    <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
    <Borders>
      <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#16A34A"/>
    </Borders>
  </Style>
  <Style ss:ID="Cell">
    <Font ss:Size="10" ss:Color="#1E293B"/>
    <Borders>
      <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
      <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    </Borders>
  </Style>
  <Style ss:ID="CellAlt">
    <Font ss:Size="10" ss:Color="#1E293B"/>
    <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
    <Borders>
      <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    </Borders>
  </Style>
  <Style ss:ID="MetricValue">
    <Font ss:Bold="1" ss:Size="12" ss:Color="#16A34A"/>
  </Style>
`;

export function exportToExcel(
  filename: string,
  headers: string[],
  rows: unknown[][],
  sheetName = 'Report',
  meta?: ExportReportMeta
) {
  exportMultiSheetExcel(filename, [{ sheetName, headers, rows }], meta);
}

export function exportMultiSheetExcel(
  filename: string,
  sections: ReportSection[],
  meta?: ExportReportMeta
) {
  const org = meta?.organization ?? UNIVERSITY_NAME;
  const generated = new Date().toLocaleString();
  const teacher = meta?.teacherName ?? '';

  const coverRows = [
    { style: 'BrandTitle', cells: [APP_BRAND_NAME] },
    { style: 'BrandSub', cells: [`${org} · Teacher Analytics Report`] },
    { style: 'Meta', cells: [meta?.subtitle ?? 'Project review & AI statistics'] },
    ...(teacher ? [{ style: 'Meta', cells: [`Prepared for: ${teacher}`] }] : []),
    { style: 'Meta', cells: [`Generated: ${generated}`] },
    { style: 'Meta', cells: [''] },
  ];

  const coverSheet = `<Worksheet ss:Name="Cover">
    <Table>
      ${coverRows.map(r =>
        `<Row ss:Height="22"><Cell ss:StyleID="${r.style}"><Data ss:Type="String">${escXml(String(r.cells[0]))}</Data></Cell></Row>`
      ).join('')}
    </Table>
  </Worksheet>`;

  let chartsSheet = '';
  if (meta?.charts?.length) {
    const chartRows: string[] = [];
    chartRows.push(`<Row><Cell ss:StyleID="BrandSub"><Data ss:Type="String">Visual Summary (chart data)</Data></Cell></Row>`);
    for (const chart of meta.charts) {
      chartRows.push(`<Row><Cell ss:StyleID="Meta"><Data ss:Type="String">${escXml(chart.title)}</Data></Cell></Row>`);
      if (chart.type === 'bar' || chart.type === 'pie') {
        const data = chart.barData ?? [];
        const max = Math.max(1, ...data.map(d => d.value));
        chartRows.push(`<Row><Cell ss:StyleID="Header"><Data ss:Type="String">Category</Data></Cell><Cell ss:StyleID="Header"><Data ss:Type="String">Count</Data></Cell><Cell ss:StyleID="Header"><Data ss:Type="String">Chart</Data></Cell></Row>`);
        data.forEach((d, i) => {
          const st = i % 2 ? 'CellAlt' : 'Cell';
          chartRows.push(`<Row>
            <Cell ss:StyleID="${st}"><Data ss:Type="String">${escXml(d.label)}</Data></Cell>
            <Cell ss:StyleID="${st}"><Data ss:Type="Number">${d.value}</Data></Cell>
            <Cell ss:StyleID="${st}"><Data ss:Type="String">${escXml(excelBarCell(d.value, max))}</Data></Cell>
          </Row>`);
        });
      }
      chartRows.push(`<Row><Cell><Data ss:Type="String"></Data></Cell></Row>`);
    }
    chartsSheet = `<Worksheet ss:Name="Charts"><Table>${chartRows.join('')}</Table></Worksheet>`;
  }

  const dataSheets = sections.map(({ sheetName, headers, rows }) => {
    const headerRow = headers.map(h =>
      `<Cell ss:StyleID="Header"><Data ss:Type="String">${escXml(h)}</Data></Cell>`
    ).join('');
    const dataRows = rows.map((row, ri) => {
      const st = ri % 2 ? 'CellAlt' : 'Cell';
      return `<Row>${row.map(c => {
        const num = typeof c === 'number' ? c : parseFloat(String(c));
        const isNum = typeof c === 'number' || (String(c).match(/^\d+(\.\d+)?$/) && sheetName === 'Statistics');
        return isNum && !Number.isNaN(num) && String(c).length < 8
          ? `<Cell ss:StyleID="${st}"><Data ss:Type="Number">${num}</Data></Cell>`
          : `<Cell ss:StyleID="${st}"><Data ss:Type="String">${escXml(String(c ?? ''))}</Data></Cell>`;
      }).join('')}</Row>`;
    }).join('');
    const safeName = escXml(sheetName.slice(0, 31));
    return `<Worksheet ss:Name="${safeName}"><Table><Row>${headerRow}</Row>${dataRows}</Table></Worksheet>`;
  }).join('');

  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Author>${escXml(APP_BRAND_NAME)}</Author>
  <Company>${escXml(org)}</Company>
  <Title>${escXml(meta?.subtitle ?? 'Teacher Report')}</Title>
</DocumentProperties>
<Styles>${EXCEL_STYLES}</Styles>
${coverSheet}
${chartsSheet}
${dataSheets}
</Workbook>`;

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
  downloadBlob(blob, filename.endsWith('.xls') ? filename : `${filename}.xls`);
}

export function exportToPdf(
  title: string,
  headers: string[],
  rows: unknown[][],
  filename: string,
  meta?: ExportReportMeta
) {
  exportMultiSectionPdf(title, [{ sheetName: title, headers, rows }], filename, meta);
}

export function exportMultiSectionPdf(
  title: string,
  sections: ReportSection[],
  filename: string,
  meta?: ExportReportMeta
) {
  const navy = meta?.navyColor ?? HU_BRAND_NAVY;
  const green = meta?.primaryColor ?? HU_BRAND_GREEN;
  const org = meta?.organization ?? UNIVERSITY_NAME;
  const logo = meta?.logoUrl ?? resolveLogoUrl();
  const generated = new Date().toLocaleString();
  const teacher = meta?.teacherName ?? '';

  const chartsHtml = (meta?.charts ?? []).map(chart => {
    let svg = '';
    if (chart.type === 'bar' && chart.barData) {
      svg = svgBarChart(chart.barData, { title: chart.title, width: 360, height: 200 });
    } else if (chart.type === 'pie' && chart.barData) {
      svg = svgPieChart(chart.barData, { title: chart.title, width: 360, height: 200 });
    } else if (chart.type === 'line' && chart.lineSeries) {
      svg = svgLineChart(chart.lineSeries, { title: chart.title, width: 360, height: 200 });
    }
    return `<div class="chart-card">
      ${chart.subtitle ? `<p class="chart-sub">${escHtml(chart.subtitle)}</p>` : ''}
      ${svg}
    </div>`;
  }).join('');

  const chartsGrid = chartsHtml
    ? `<section class="charts-section"><h2>Analytics Overview</h2><div class="charts-grid">${chartsHtml}</div></section>`
    : '';

  const tablesHtml = sections.map(section => {
    const tableHead = section.headers.map(h => `<th>${escHtml(h)}</th>`).join('');
    const tableBody = section.rows.map((row, ri) =>
      `<tr class="${ri % 2 ? 'alt' : ''}">${row.map(c => `<td>${escHtml(String(c ?? ''))}</td>`).join('')}</tr>`
    ).join('');
    return `<section class="table-section">
      <h2>${escHtml(section.sheetName)}</h2>
      <table><thead><tr>${tableHead}</tr></thead><tbody>${tableBody}</tbody></table>
    </section>`;
  }).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escHtml(title)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, Arial, sans-serif; margin: 0; color: #1e293b; background: #fff; }
  .cover {
    background: linear-gradient(135deg, ${green} 0%, ${navy} 100%);
    color: #fff; padding: 28px 32px; display: flex; align-items: center; gap: 20px;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .cover img { width: 72px; height: 72px; object-fit: contain; background: #fff; border-radius: 12px; padding: 6px; }
  .cover h1 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.02em; }
  .cover .tag { font-size: 11px; opacity: 0.9; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.08em; }
  .cover .meta { font-size: 12px; opacity: 0.85; margin-top: 8px; line-height: 1.5; }
  .content { padding: 24px 32px 32px; }
  h2 { font-size: 14px; font-weight: 800; color: ${navy}; margin: 0 0 12px; padding-bottom: 6px; border-bottom: 2px solid ${green}; }
  .charts-section { margin-bottom: 28px; page-break-inside: avoid; }
  .charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .chart-card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; background: #fafafa; page-break-inside: avoid; }
  .chart-sub { font-size: 10px; color: #64748b; margin: 0 0 8px; }
  .chart-card svg { width: 100%; height: auto; display: block; }
  .table-section { margin-bottom: 24px; page-break-inside: avoid; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  th, td { border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; }
  th { background: ${navy}; color: #fff; font-weight: 700; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  tr.alt td { background: #f8fafc; }
  .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 9px; color: #94a3b8; text-align: center; }
  @media print {
    body { padding: 0; }
    .cover { padding: 20px 24px; }
    .content { padding: 16px 24px; }
    .charts-grid { grid-template-columns: 1fr 1fr; }
    h2 { page-break-after: avoid; }
  }
</style></head><body>
<header class="cover">
  <img src="${escHtml(logo)}" alt="Hormuud ProjectHub" onerror="this.style.display='none'"/>
  <div>
    <div class="tag">${escHtml(org)}</div>
    <h1>${escHtml(title)}</h1>
    <div class="meta">
      ${teacher ? `<div><strong>Teacher:</strong> ${escHtml(teacher)}</div>` : ''}
      <div><strong>Generated:</strong> ${escHtml(generated)}</div>
      ${meta?.subtitle ? `<div>${escHtml(meta.subtitle)}</div>` : ''}
    </div>
  </div>
</header>
<div class="content">
${chartsGrid}
${tablesHtml}
<div class="footer">${escHtml(APP_BRAND_NAME)} · ${escHtml(org)} · Confidential academic report</div>
</div>
<script>window.onload=function(){setTimeout(function(){window.print();},400);}</script>
</body></html>`;

  const w = window.open('', '_blank');
  if (!w) {
    alert('Please allow pop-ups to export PDF, then choose Print → Save as PDF.');
    return;
  }
  w.document.write(html);
  w.document.close();
  w.document.title = filename.replace('.pdf', '');
}

function resolveLogoUrl(): string {
  try {
    if (typeof window !== 'undefined') {
      const base = HU_LOGO_URL.startsWith('http') ? HU_LOGO_URL : new URL(HU_LOGO_URL, window.location.href).href;
      return base;
    }
  } catch { /* ignore */ }
  return HU_LOGO_URL;
}

function escXml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const ADMIN_BADGE_TITLE = 'University Admin';
export const ADMIN_BADGE_SUBTITLE = 'Remote Admin';
