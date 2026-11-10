import { Workbook } from 'exceljs';
import { attachCharts, type SheetChart } from './reports.charts.js';
import type {
  DashboardSnapshot,
  ReportAttentionRecord,
  ReportDayCategoryRecord,
  ReportLossRecord,
  ReportPeriodRecord,
  ReportStockSummaryRecord,
  ReportSummaryRecord,
} from './reports.types.js';

interface Column {
  header: string;
  key: string;
  width: number;
  money?: boolean;
  whole?: boolean;
}

export async function buildDashboardWorkbook(snapshot: DashboardSnapshot, from?: Date, to?: Date): Promise<Buffer> {
  const workbook = new Workbook();
  workbook.creator = 'ShopCart';
  workbook.created = new Date();
  const charts: SheetChart[] = [];

  addTable(workbook, 'Resumen', [
    { header: 'Concepto', key: 'label', width: 32 },
    { header: 'Valor', key: 'value', width: 22 },
  ], summaryRows(snapshot, from, to));

  const dayRows = addTable(workbook, 'Ventas por dia', periodColumns(), snapshot.salesByDay.map(periodRow));
  addSeriesChart(charts, 'Ventas por dia', 'Ventas por día', 'line', dayRows, 1, [3], true);

  const weekRows = addTable(workbook, 'Ventas por semana', periodColumns(), snapshot.salesByWeek.map(periodRow));
  addSeriesChart(charts, 'Ventas por semana', 'Ventas por semana', 'line', weekRows, 1, [3], true);

  const monthRows = addTable(workbook, 'Ventas por mes', periodColumns(), snapshot.salesByMonth.map(periodRow));
  addSeriesChart(charts, 'Ventas por mes', 'Ventas por mes', 'line', monthRows, 1, [3], true);

  const categoryRows = addTable(workbook, 'Categorias', [
    { header: 'Categoria', key: 'category', width: 28 },
    { header: 'Unidades', key: 'units', width: 14, whole: true },
    { header: 'Ventas', key: 'sales', width: 16, money: true },
  ], snapshot.salesByCategory.map((item) => ({
    category: item.Categoria,
    units: amount(item.Unidades),
    sales: amount(item.Ventas),
  } satisfies Row)));
  addSeriesChart(charts, 'Categorias', 'Ventas por categoría', 'pie', categoryRows, 1, [3], true);

  addDayCategorySheet(workbook, snapshot.salesByDayCategory, charts);

  const productRows = addTable(workbook, 'Top productos', [
    { header: 'SKU', key: 'sku', width: 18 },
    { header: 'Producto', key: 'name', width: 36 },
    { header: 'Unidades', key: 'units', width: 14, whole: true },
    { header: 'Ventas', key: 'sales', width: 16, money: true },
  ], snapshot.topProducts.map((item) => ({
    sku: item.SKUSnapshot,
    name: item.NombreSnapshot,
    units: amount(item.Unidades),
    sales: amount(item.Ventas),
  } satisfies Row)));
  addSeriesChart(charts, 'Top productos', 'Top de productos', 'bar', productRows, 2, [4], true);

  const statusRows = addTable(workbook, 'Estados', [
    { header: 'Estado', key: 'status', width: 20 },
    { header: 'Pedidos', key: 'count', width: 14, whole: true },
  ], snapshot.statuses.map((item) => ({
    status: item.Estado,
    count: amount(item.Cantidad),
  } satisfies Row)));
  addSeriesChart(charts, 'Estados', 'Estados de los pedidos', 'pie', statusRows, 1, [2], false);

  addTable(workbook, 'Existencia baja', [
    { header: 'SKU', key: 'sku', width: 18 },
    { header: 'Producto', key: 'product', width: 36 },
    { header: 'Existencia', key: 'stock', width: 14, whole: true },
  ], snapshot.lowStockItems.map((item) => ({
    sku: item.SKU,
    product: item.Producto,
    stock: amount(item.Existencia),
  } satisfies Row)));

  const body = Buffer.from(await workbook.xlsx.writeBuffer());
  return attachCharts(body, charts);
}

export function reportFileName(from?: Date, to?: Date): string {
  const start = from ? from.toISOString().slice(0, 10) : 'inicio';
  const end = to ? to.toISOString().slice(0, 10) : 'hoy';
  return `shopcart-reporte-${start}_${end}.xlsx`;
}

type Row = Record<string, string | number>;

function addDayCategorySheet(workbook: Workbook, records: ReportDayCategoryRecord[], charts: SheetChart[]): void {
  const name = 'Dia por categoria';
  const detailRows = addTable(workbook, name, [
    { header: 'Periodo', key: 'period', width: 16 },
    { header: 'Categoria', key: 'category', width: 28 },
    { header: 'Unidades', key: 'units', width: 14, whole: true },
    { header: 'Ventas', key: 'sales', width: 16, money: true },
  ], records.map((item) => ({
    period: text(item.Periodo),
    category: item.Categoria,
    units: amount(item.Unidades),
    sales: amount(item.Ventas),
  } satisfies Row)));

  const sheet = workbook.getWorksheet(name);
  if (!sheet) return;

  const totals = new Map<string, number>();
  const sales = new Map<string, number>();
  const daySet = new Set<string>();
  for (const item of records) {
    const day = text(item.Periodo);
    daySet.add(day);
    totals.set(item.Categoria, (totals.get(item.Categoria) ?? 0) + amount(item.Ventas));
    const key = `${day}|${item.Categoria}`;
    sales.set(key, (sales.get(key) ?? 0) + amount(item.Ventas));
  }

  const categories = [...totals.keys()].sort((left, right) => {
    const delta = (totals.get(right) ?? 0) - (totals.get(left) ?? 0);
    return delta === 0 ? left.localeCompare(right, 'es') : delta;
  });
  const days = [...daySet].sort();
  const startColumn = 6;
  const periodHeader = sheet.getCell(1, startColumn);
  periodHeader.value = 'Periodo';
  periodHeader.font = { bold: true };
  sheet.getColumn(startColumn).width = 16;

  categories.forEach((category, index) => {
    const column = startColumn + 1 + index;
    const cell = sheet.getCell(1, column);
    cell.value = category;
    cell.font = { bold: true };
    sheet.getColumn(column).width = Math.min(28, Math.max(14, category.length + 2));
    sheet.getColumn(column).numFmt = '#,##0.00';
  });

  days.forEach((day, index) => {
    const row = index + 2;
    sheet.getCell(row, startColumn).value = day;
    categories.forEach((category, categoryIndex) => {
      const cell = sheet.getCell(row, startColumn + 1 + categoryIndex);
      cell.value = sales.get(`${day}|${category}`) ?? 0;
      cell.numFmt = '#,##0.00';
    });
  });

  addSeriesChart(
    charts,
    name,
    'Ventas por día y categoría',
    'stackedCol',
    days.length,
    startColumn,
    categories.map((_, index) => startColumn + 1 + index),
    true,
    Math.max(detailRows, days.length),
  );
}

function addSeriesChart(
  charts: SheetChart[],
  sheetName: string,
  title: string,
  kind: SheetChart['kind'],
  dataRows: number,
  categoryColumn: number,
  valueColumns: number[],
  money: boolean,
  occupiedRows = dataRows,
): void {
  if (dataRows < 1 || valueColumns.length === 0) return;
  const last = dataRows + 1;
  const fromRow = occupiedRows + 2;
  charts.push({
    sheetName,
    title,
    kind,
    categories: cellRange(sheetName, categoryColumn, 2, last),
    series: valueColumns.map((column) => ({
      nameCell: cellRef(sheetName, column, 1),
      values: cellRange(sheetName, column, 2, last),
    })),
    fromRow,
    toRow: fromRow + (kind === 'bar' ? Math.max(16, dataRows + 6) : 16),
    toCol: Math.max(10, valueColumns.length + 4),
    money,
  });
}

function cellRef(sheetName: string, column: number, row: number): string {
  return `${quoteSheet(sheetName)}!$${columnLetter(column)}$${row}`;
}

function cellRange(sheetName: string, column: number, fromRow: number, toRow: number): string {
  const letter = columnLetter(column);
  return `${quoteSheet(sheetName)}!$${letter}$${fromRow}:$${letter}$${toRow}`;
}

function quoteSheet(name: string): string {
  return `'${name.replace(/'/g, "''")}'`;
}

function columnLetter(index: number): string {
  let value = index;
  let letters = '';
  while (value > 0) {
    const remainder = (value - 1) % 26;
    letters = String.fromCharCode(65 + remainder) + letters;
    value = Math.floor((value - 1) / 26);
  }
  return letters;
}

function periodColumns(): Column[] {
  return [
    { header: 'Periodo', key: 'period', width: 18 },
    { header: 'Pedidos', key: 'orders', width: 14, whole: true },
    { header: 'Ventas', key: 'sales', width: 16, money: true },
  ];
}

function periodRow(item: ReportPeriodRecord): Row {
  return {
    period: text(item.Periodo),
    orders: amount(item.Pedidos),
    sales: amount(item.Ventas),
  };
}

function summaryRows(snapshot: DashboardSnapshot, from?: Date, to?: Date): Row[] {
  const summary = snapshot.summary;
  const abandoned = snapshot.abandonedCarts;
  const attention = snapshot.attention;
  const losses = snapshot.losses;
  const lowStock = snapshot.lowStock;
  return [
    { label: 'Desde', value: from ? from.toISOString() : 'Ultimos 30 dias' },
    { label: 'Hasta', value: to ? to.toISOString() : 'Ahora' },
    { label: 'Pedidos entregados', value: readNumber(summary, 'Pedidos') },
    { label: 'Ventas netas', value: readNumber(summary, 'Ventas') },
    { label: 'Ticket promedio', value: readNumber(summary, 'TicketPromedio') },
    { label: 'Confirmados por atender', value: readNumber(attention, 'Confirmado') },
    { label: 'Preparando', value: readNumber(attention, 'Preparando') },
    { label: 'Despachados', value: readNumber(attention, 'Despachado') },
    { label: 'En ruta', value: readNumber(attention, 'EnRuta') },
    { label: 'Pedidos cancelados', value: readNumber(losses, 'PedidosCancelados') },
    { label: 'Monto cancelado', value: readNumber(losses, 'MontoCancelado') },
    { label: 'Monto devuelto', value: readNumber(losses, 'MontoDevuelto') },
    { label: 'Pedidos con devolucion', value: readNumber(losses, 'PedidosConDevolucion') },
    { label: 'Carritos abandonados', value: readNumber(abandoned, 'CarritosAbandonados') },
    { label: 'Minutos de abandono', value: readNumber(abandoned, 'MinutosSinActividad') },
    { label: 'Umbral de existencia baja', value: readNumber(lowStock, 'Umbral') },
    { label: 'Variantes con existencia baja', value: readNumber(lowStock, 'Variantes') },
  ];
}

function addTable(workbook: Workbook, name: string, columns: Column[], rows: Row[]): number {
  const sheet = workbook.addWorksheet(name);
  sheet.columns = columns.map(({ header, key, width }) => ({ header, key, width }));
  sheet.addRows(rows);
  const header = sheet.getRow(1);
  header.font = { bold: true };
  columns.forEach((column, index) => {
    if (column.money) sheet.getColumn(index + 1).numFmt = '#,##0.00';
    if (column.whole) sheet.getColumn(index + 1).numFmt = '#,##0';
  });
  return rows.length;
}

function readNumber(
  record: ReportSummaryRecord | ReportAttentionRecord | ReportLossRecord | ReportStockSummaryRecord | DashboardSnapshot['abandonedCarts'] | Record<string, never>,
  key: string,
): number {
  if (!(key in record)) return 0;
  return amount(Reflect.get(record, key) as number | string | null | undefined);
}

function amount(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function text(value: string | Date): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : value;
}
