import { strToU8, zipSync } from 'fflate';

/**
 * Minimal .xlsx writer with native Excel charts (bar/column) — SheetJS community edition cannot write charts.
 * Cells are inline strings or numbers; charts read their data from sheet ranges (with a cache, so viewers that do
 * not recalculate still draw them).
 */

export type CellValue = string | number | boolean | null | undefined;

export interface Cell {
  v: CellValue;
  /** Style id from STYLES below. */
  s?: StyleId;
}

export type StyleId = 'title' | 'subtitle' | 'header' | 'bold' | 'kpi' | 'percent' | 'muted';

const STYLE_INDEX: Record<StyleId, number> = {
  title: 1,
  subtitle: 2,
  header: 3,
  bold: 4,
  kpi: 5,
  percent: 6,
  muted: 7
};

export interface ChartSeries {
  name: string;
  color: string; // hex without '#'
  /** Column (0-based) of the values in the data sheet; row range comes from the chart. */
  valuesCol: number;
  /** null = empty cell (no bar, no label). */
  values: (number | null)[];
}

export interface ChartSpec {
  title: string;
  /** 'bar' = horizontal bars, 'col' = vertical columns. */
  dir: 'bar' | 'col';
  /** Sheet with the data and its rows (0-based, inclusive) and the categories column. */
  dataSheet: string;
  firstRow: number;
  lastRow: number;
  categoriesCol: number;
  categories: string[];
  series: ChartSeries[];
  /** Position on the sheet where the chart is drawn (0-based cells). */
  from: { col: number; row: number };
  to: { col: number; row: number };
  /** 100 = series drawn on top of each other (one visible bar per category). */
  overlap?: number;
}

export interface SheetSpec {
  name: string;
  rows: (Cell | CellValue)[][];
  colWidths?: number[];
  charts?: ChartSpec[];
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

export const colName = (i: number): string => {
  let n = i + 1;
  let s = '';
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

const ref = (sheet: string, col: number, r1: number, r2 = r1) =>
  `'${sheet.replace(/'/g, "''")}'!$${colName(col)}$${r1 + 1}${r2 !== r1 ? `:$${colName(col)}$${r2 + 1}` : ''}`;

function sheetXml(sheet: SheetSpec, drawingRel?: string): string {
  const cols = (sheet.colWidths || [])
    .map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`)
    .join('');
  const rows = sheet.rows
    .map((row, r) => {
      const cells = row
        .map((raw, c) => {
          const cell: Cell = raw !== null && typeof raw === 'object' ? (raw as Cell) : { v: raw as CellValue };
          if (cell.v === null || cell.v === undefined || cell.v === '') {
            return cell.s ? `<c r="${colName(c)}${r + 1}" s="${STYLE_INDEX[cell.s]}"/>` : '';
          }
          const s = cell.s ? ` s="${STYLE_INDEX[cell.s]}"` : '';
          if (typeof cell.v === 'boolean') {
            return `<c r="${colName(c)}${r + 1}"${s} t="b"><v>${cell.v ? 1 : 0}</v></c>`;
          }
          if (typeof cell.v === 'number' && Number.isFinite(cell.v)) {
            return `<c r="${colName(c)}${r + 1}"${s}><v>${cell.v}</v></c>`;
          }
          return `<c r="${colName(c)}${r + 1}"${s} t="inlineStr"><is><t xml:space="preserve">${esc(String(cell.v))}</t></is></c>`;
        })
        .join('');
      return `<row r="${r + 1}">${cells}</row>`;
    })
    .join('');
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<sheetViews><sheetView workbookViewId="0" showGridLines="${sheet.charts?.length ? 0 : 1}"/></sheetViews>` +
    (cols ? `<cols>${cols}</cols>` : '') +
    `<sheetData>${rows}</sheetData>` +
    (drawingRel ? `<drawing r:id="${drawingRel}"/>` : '') +
    `</worksheet>`
  );
}

function chartXml(c: ChartSpec): string {
  const cats = c.categories;
  const strCache = (values: string[]) =>
    `<c:strCache><c:ptCount val="${values.length}"/>${values.map((v, i) => `<c:pt idx="${i}"><c:v>${esc(v)}</c:v></c:pt>`).join('')}</c:strCache>`;
  const numCache = (values: (number | null)[]) =>
    `<c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="${values.length}"/>${values
      .map((v, i) => (v === null ? '' : `<c:pt idx="${i}"><c:v>${v}</c:v></c:pt>`))
      .join('')}</c:numCache>`;
  const series = c.series
    .map(
      (s, i) =>
        `<c:ser><c:idx val="${i}"/><c:order val="${i}"/>` +
        `<c:tx><c:v>${esc(s.name)}</c:v></c:tx>` +
        `<c:spPr><a:solidFill><a:srgbClr val="${s.color}"/></a:solidFill></c:spPr>` +
        `<c:invertIfNegative val="0"/>` +
        `<c:dLbls><c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr><c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="900"><a:solidFill><a:srgbClr val="334155"/></a:solidFill></a:defRPr></a:pPr><a:endParaRPr lang="pt-PT"/></a:p></c:txPr>` +
        `<c:showLegendKey val="0"/><c:showVal val="1"/><c:showCatName val="0"/><c:showSerName val="0"/><c:showPercent val="0"/><c:showBubbleSize val="0"/></c:dLbls>` +
        `<c:cat><c:strRef><c:f>${esc(ref(c.dataSheet, c.categoriesCol, c.firstRow, c.lastRow))}</c:f>${strCache(cats)}</c:strRef></c:cat>` +
        `<c:val><c:numRef><c:f>${esc(ref(c.dataSheet, s.valuesCol, c.firstRow, c.lastRow))}</c:f>${numCache(s.values)}</c:numRef></c:val>` +
        `</c:ser>`
    )
    .join('');
  const axisText = `<c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="900"><a:solidFill><a:srgbClr val="475569"/></a:solidFill></a:defRPr></a:pPr><a:endParaRPr lang="pt-PT"/></a:p></c:txPr>`;
  const horizontal = c.dir === 'bar';
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<c:roundedCorners val="0"/>` +
    `<c:chart>` +
    `<c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="1200" b="1"/></a:pPr><a:r><a:rPr lang="pt-PT" sz="1200" b="1"><a:solidFill><a:srgbClr val="0F172A"/></a:solidFill></a:rPr><a:t>${esc(c.title)}</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title>` +
    `<c:autoTitleDeleted val="0"/>` +
    `<c:plotArea><c:layout/>` +
    `<c:barChart><c:barDir val="${c.dir}"/><c:grouping val="clustered"/><c:varyColors val="0"/>${series}` +
    `<c:gapWidth val="${horizontal ? 60 : 80}"/>${c.overlap !== undefined ? `<c:overlap val="${c.overlap}"/>` : ''}` +
    `<c:axId val="1001"/><c:axId val="1002"/></c:barChart>` +
    `<c:catAx><c:axId val="1001"/><c:scaling><c:orientation val="${horizontal ? 'maxMin' : 'minMax'}"/></c:scaling><c:delete val="0"/>` +
    `<c:axPos val="${horizontal ? 'l' : 'b'}"/><c:numFmt formatCode="General" sourceLinked="0"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/>` +
    `<c:spPr><a:ln w="6350"><a:solidFill><a:srgbClr val="CBD5E1"/></a:solidFill></a:ln></c:spPr>${axisText}` +
    `<c:crossAx val="1002"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/><c:noMultiLvlLbl val="0"/></c:catAx>` +
    `<c:valAx><c:axId val="1002"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/>` +
    `<c:axPos val="${horizontal ? 'b' : 'l'}"/><c:majorGridlines><c:spPr><a:ln w="6350"><a:solidFill><a:srgbClr val="E2E8F0"/></a:solidFill></a:ln></c:spPr></c:majorGridlines>` +
    `<c:numFmt formatCode="General" sourceLinked="1"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/>` +
    `<c:spPr><a:ln><a:noFill/></a:ln></c:spPr>${axisText}` +
    `<c:crossAx val="1001"/><c:crosses val="${horizontal ? 'max' : 'autoZero'}"/><c:crossBetween val="between"/></c:valAx>` +
    `</c:plotArea>` +
    (c.series.length > 1 ? `<c:legend><c:legendPos val="t"/><c:overlay val="0"/>${axisText}</c:legend>` : '') +
    `<c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/></c:chart>` +
    `<c:spPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:ln w="9525"><a:solidFill><a:srgbClr val="E2E8F0"/></a:solidFill></a:ln></c:spPr>` +
    `</c:chartSpace>`
  );
}

function drawingXml(charts: ChartSpec[], firstChartRel: number): string {
  const anchors = charts
    .map(
      (c, i) =>
        `<xdr:twoCellAnchor editAs="oneCell">` +
        `<xdr:from><xdr:col>${c.from.col}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${c.from.row}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>` +
        `<xdr:to><xdr:col>${c.to.col}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${c.to.row}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>` +
        `<xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="${i + 2}" name="${esc(c.title)}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr>` +
        `<xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm>` +
        `<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" r:id="rId${firstChartRel + i}"/></a:graphicData></a:graphic>` +
        `</xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor>`
    )
    .join('');
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${anchors}</xdr:wsDr>`
  );
}

const STYLES_XML =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
  `<fonts count="6">` +
  `<font><sz val="11"/><color rgb="FF0F172A"/><name val="Calibri"/></font>` +
  `<font><b/><sz val="18"/><color rgb="FF0A192A"/><name val="Calibri"/></font>` +
  `<font><sz val="11"/><color rgb="FF00AADC"/><name val="Calibri"/></font>` +
  `<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>` +
  `<font><b/><sz val="11"/><color rgb="FF0F172A"/><name val="Calibri"/></font>` +
  `<font><sz val="10"/><color rgb="FF64748B"/><name val="Calibri"/></font>` +
  `</fonts>` +
  `<fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>` +
  `<fill><patternFill patternType="solid"><fgColor rgb="FF0A192A"/><bgColor indexed="64"/></patternFill></fill>` +
  `<fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/><bgColor indexed="64"/></patternFill></fill></fills>` +
  `<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>` +
  `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
  `<cellXfs count="8">` +
  `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
  `<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>` +
  `<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>` +
  `<xf numFmtId="0" fontId="3" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>` +
  `<xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1"/>` +
  `<xf numFmtId="0" fontId="4" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1"/>` +
  `<xf numFmtId="9" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>` +
  `<xf numFmtId="0" fontId="5" fillId="0" borderId="0" xfId="0" applyFont="1"/>` +
  `</cellXfs>` +
  `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>` +
  `</styleSheet>`;

/** Builds the .xlsx file (bytes). Sheet names must be unique and at most 31 characters. */
export function buildXlsx(sheets: SheetSpec[]): Uint8Array {
  const files: Record<string, Uint8Array> = {};
  const overrides: string[] = [];
  let drawingCount = 0;
  let chartCount = 0;

  sheets.forEach((sheet, i) => {
    const n = i + 1;
    let drawingRel: string | undefined;
    if (sheet.charts && sheet.charts.length > 0) {
      drawingCount++;
      drawingRel = 'rId1';
      const firstChart = chartCount + 1;
      files[`xl/worksheets/_rels/sheet${n}.xml.rels`] = strToU8(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${drawingCount}.xml"/></Relationships>`
      );
      files[`xl/drawings/drawing${drawingCount}.xml`] = strToU8(drawingXml(sheet.charts, 1));
      overrides.push(
        `<Override PartName="/xl/drawings/drawing${drawingCount}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`
      );
      files[`xl/drawings/_rels/drawing${drawingCount}.xml.rels`] = strToU8(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheet.charts
          .map(
            (_, ci) =>
              `<Relationship Id="rId${ci + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart${firstChart + ci}.xml"/>`
          )
          .join('')}</Relationships>`
      );
      sheet.charts.forEach((c) => {
        chartCount++;
        files[`xl/charts/chart${chartCount}.xml`] = strToU8(chartXml(c));
        overrides.push(
          `<Override PartName="/xl/charts/chart${chartCount}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>`
        );
      });
    }
    files[`xl/worksheets/sheet${n}.xml`] = strToU8(sheetXml(sheet, drawingRel));
    overrides.push(
      `<Override PartName="/xl/worksheets/sheet${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
    );
  });

  files['xl/workbook.xml'] = strToU8(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView activeTab="0"/></bookViews><sheets>${sheets
      .map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
      .join('')}</sheets></workbook>`
  );
  files['xl/_rels/workbook.xml.rels'] = strToU8(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets
      .map(
        (_, i) =>
          `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`
      )
      .join(
        ''
      )}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`
  );
  files['xl/styles.xml'] = strToU8(STYLES_XML);
  files['_rels/.rels'] = strToU8(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`
  );
  files['[Content_Types].xml'] = strToU8(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>` +
      `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
      `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
      `${overrides.join('')}</Types>`
  );
  return zipSync(files, { level: 6 });
}
