import JSZip from 'jszip';

export interface ChartSeries {
  nameCell: string;
  values: string;
}

export interface SheetChart {
  sheetName: string;
  title: string;
  kind: 'line' | 'col' | 'bar' | 'pie' | 'stackedCol';
  categories: string;
  series: ChartSeries[];
  fromRow: number;
  toRow: number;
  toCol: number;
  money: boolean;
}

const palette = ['055494', 'e22b23', '1f7a4d', 'e09f3e', '5c6bc0', '00838f', '8d6e63', '043e70', 'c2185b', '00796b'];

export async function attachCharts(xlsx: Buffer, charts: SheetChart[]): Promise<Buffer> {
  if (charts.length === 0) return xlsx;

  const zip = await JSZip.loadAsync(xlsx);
  const sheets = mapSheets(await readZip(zip, 'xl/workbook.xml'), await readZip(zip, 'xl/_rels/workbook.xml.rels'));
  let contentTypes = await readZip(zip, '[Content_Types].xml');

  for (const [index, chart] of charts.entries()) {
    const number = index + 1;
    const worksheet = sheets.get(chart.sheetName);
    if (!worksheet) throw new Error(`La hoja ${chart.sheetName} no está en el libro.`);

    const sheetFile = worksheet.split('/').pop() ?? '';
    const relPath = `xl/worksheets/_rels/${sheetFile}.rels`;
    const existingRels = zip.file(relPath) ? await readZip(zip, relPath) : null;
    const drawingId = nextRelationshipId(existingRels);

    zip.file(worksheet, addDrawing(await readZip(zip, worksheet), drawingId));
    zip.file(relPath, addRelationship(
      existingRels,
      drawingId,
      'http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing',
      `../drawings/drawing${number}.xml`,
    ));
    zip.file(`xl/drawings/drawing${number}.xml`, drawingXml(chart));
    zip.file(`xl/drawings/_rels/drawing${number}.xml.rels`, drawingRels(number));
    zip.file(`xl/charts/chart${number}.xml`, chartXml(chart));
    contentTypes = addOverride(contentTypes, `/xl/drawings/drawing${number}.xml`, 'application/vnd.openxmlformats-officedocument.drawing+xml');
    contentTypes = addOverride(contentTypes, `/xl/charts/chart${number}.xml`, 'application/vnd.openxmlformats-officedocument.drawingml.chart+xml');
  }

  zip.file('[Content_Types].xml', contentTypes);
  return Buffer.from(await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
}

function chartXml(chart: SheetChart): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <c:chart>
    ${titleXml(chart.title)}
    <c:autoTitleDeleted val="0"/>
    <c:plotArea>
      <c:layout/>
      ${plotXml(chart)}
    </c:plotArea>
    <c:legend>
      <c:legendPos val="b"/>
      <c:overlay val="0"/>
    </c:legend>
    <c:plotVisOnly val="1"/>
    <c:dispBlanksAs val="gap"/>
  </c:chart>
  <c:printSettings>
    <c:headerFooter/>
    <c:pageMargins b="0.75" l="0.7" r="0.7" t="0.75" header="0.3" footer="0.3"/>
    <c:pageSetup/>
  </c:printSettings>
</c:chartSpace>`;
}

function plotXml(chart: SheetChart): string {
  const series = chart.series.map((item, index) => seriesXml(chart, item, index)).join('');
  if (chart.kind === 'pie') {
    return `<c:pieChart><c:varyColors val="1"/>${series}<c:firstSliceAng val="0"/></c:pieChart>`;
  }
  if (chart.kind === 'line') {
    return `<c:lineChart><c:grouping val="standard"/><c:varyColors val="0"/>${series}<c:marker val="1"/><c:axId val="100"/><c:axId val="200"/></c:lineChart>${axesXml(chart, 'b', 'l')}`;
  }
  const direction = chart.kind === 'bar' ? 'bar' : 'col';
  const grouping = chart.kind === 'stackedCol' ? 'stacked' : 'clustered';
  const overlap = chart.kind === 'stackedCol' ? '<c:overlap val="100"/>' : '';
  const categoryPosition = chart.kind === 'bar' ? 'l' : 'b';
  const valuePosition = chart.kind === 'bar' ? 'b' : 'l';
  return `<c:barChart><c:barDir val="${direction}"/><c:grouping val="${grouping}"/><c:varyColors val="0"/>${series}<c:gapWidth val="80"/>${overlap}<c:axId val="100"/><c:axId val="200"/></c:barChart>${axesXml(chart, categoryPosition, valuePosition)}`;
}

function seriesXml(chart: SheetChart, series: ChartSeries, index: number): string {
  const color = seriesColor(chart.kind, index);
  const fill = color
    ? `<c:spPr><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:ln w="19050"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill></a:ln></c:spPr>`
    : '';
  const marker = chart.kind === 'line'
    ? `<c:marker><c:symbol val="circle"/><c:size val="6"/><c:spPr><a:solidFill><a:srgbClr val="055494"/></a:solidFill></c:spPr></c:marker>`
    : '';
  const smooth = chart.kind === 'line' ? '<c:smooth val="0"/>' : '';
  return `<c:ser><c:idx val="${index}"/><c:order val="${index}"/><c:tx><c:strRef><c:f>${xml(series.nameCell)}</c:f></c:strRef></c:tx>${fill}${marker}<c:cat><c:strRef><c:f>${xml(chart.categories)}</c:f></c:strRef></c:cat><c:val><c:numRef><c:f>${xml(series.values)}</c:f></c:numRef></c:val>${smooth}</c:ser>`;
}

function seriesColor(kind: SheetChart['kind'], index: number): string | null {
  if (kind === 'pie') return null;
  if (kind === 'stackedCol') return palette[index % palette.length] ?? '055494';
  return '055494';
}

function axesXml(chart: SheetChart, categoryPosition: 'b' | 'l', valuePosition: 'l' | 'b'): string {
  const format = chart.money ? '#,##0.00' : '#,##0';
  return `<c:catAx><c:axId val="100"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="${categoryPosition}"/><c:majorTickMark val="out"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:crossAx val="200"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/></c:catAx><c:valAx><c:axId val="200"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="${valuePosition}"/><c:majorGridlines/><c:numFmt formatCode="${format}" sourceLinked="0"/><c:majorTickMark val="out"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:crossAx val="100"/><c:crosses val="autoZero"/><c:crossBetween val="between"/></c:valAx>`;
}

function titleXml(title: string): string {
  return `<c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="1400" b="1"/></a:pPr><a:r><a:rPr lang="es-GT" sz="1400" b="1"/><a:t>${xml(title)}</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title>`;
}

function drawingXml(chart: SheetChart): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart">
  <xdr:twoCellAnchor>
    <xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${chart.fromRow}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>
    <xdr:to><xdr:col>${chart.toCol}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${chart.toRow}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>
    <xdr:graphicFrame macro="">
      <xdr:nvGraphicFramePr>
        <xdr:cNvPr id="2" name="${xml(chart.title)}"/>
        <xdr:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></xdr:cNvGraphicFramePr>
      </xdr:nvGraphicFramePr>
      <xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm>
      <a:graphic>
        <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart">
          <c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="rId1"/>
        </a:graphicData>
      </a:graphic>
    </xdr:graphicFrame>
    <xdr:clientData/>
  </xdr:twoCellAnchor>
</xdr:wsDr>`;
}

function drawingRels(number: number): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart${number}.xml"/>
</Relationships>`;
}

function mapSheets(workbookXml: string, relsXml: string): Map<string, string> {
  const targets = new Map<string, string>();
  for (const block of relsXml.matchAll(/<Relationship\b([^>]*?)\/>/g)) {
    const attrs = block[1] ?? '';
    const id = attribute(attrs, 'Id');
    const target = attribute(attrs, 'Target');
    const type = attribute(attrs, 'Type');
    if (!id || !target || !type?.endsWith('/worksheet')) continue;
    const clean = decodeXml(target).replace(/^\//, '');
    targets.set(id, clean.startsWith('xl/') ? clean : `xl/${clean}`);
  }

  const sheets = new Map<string, string>();
  for (const block of workbookXml.matchAll(/<sheet\b([^>]*?)\/>/g)) {
    const attrs = block[1] ?? '';
    const name = attribute(attrs, 'name');
    const id = attribute(attrs, 'r:id');
    const path = name && id ? targets.get(id) : undefined;
    if (name && path) sheets.set(decodeXml(name), path);
  }
  return sheets;
}

function addDrawing(sheetXml: string, relationshipId: string): string {
  if (sheetXml.includes('<drawing ')) return sheetXml;
  const withNamespace = sheetXml.includes('xmlns:r=')
    ? sheetXml
    : sheetXml.replace('<worksheet ', '<worksheet xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ');
  const tag = `<drawing r:id="${relationshipId}"/>`;
  const legacyAt = withNamespace.indexOf('<legacyDrawing');
  if (legacyAt !== -1) return `${withNamespace.slice(0, legacyAt)}${tag}${withNamespace.slice(legacyAt)}`;
  return withNamespace.replace('</worksheet>', `${tag}</worksheet>`);
}

function addRelationship(existing: string | null, id: string, type: string, target: string): string {
  const line = `<Relationship Id="${id}" Type="${type}" Target="${target}"/>`;
  if (!existing) {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${line}
</Relationships>`;
  }
  return existing.replace('</Relationships>', `  ${line}\n</Relationships>`);
}

function nextRelationshipId(existing: string | null): string {
  if (!existing) return 'rId1';
  const numbers = [...existing.matchAll(/Id="rId(\d+)"/g)].map((match) => Number(match[1] ?? 0));
  return `rId${numbers.reduce((max, value) => Math.max(max, value), 0) + 1}`;
}

function addOverride(contentTypes: string, partName: string, contentType: string): string {
  if (contentTypes.includes(`PartName="${partName}"`)) return contentTypes;
  return contentTypes.replace('</Types>', `  <Override PartName="${partName}" ContentType="${contentType}"/>\n</Types>`);
}

async function readZip(zip: JSZip, path: string): Promise<string> {
  const file = zip.file(path);
  if (!file) throw new Error(`El libro no trae ${path}.`);
  return file.async('string');
}

function attribute(source: string, name: string): string | undefined {
  return new RegExp(`${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}="([^"]*)"`).exec(source)?.[1];
}

function decodeXml(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function xml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
