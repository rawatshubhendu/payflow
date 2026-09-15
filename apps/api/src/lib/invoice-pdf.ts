import PDFDocument from 'pdfkit';
import type { IBusiness } from '../models/Business.js';
import type { ICustomer } from '../models/Customer.js';
import type { IInvoice } from '../models/Invoice.js';

function chunksFromDocument(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}

function money(amount: number): string {
  return `Rs ${new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)}`;
}

function formatDate(date: Date | null): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

const PAGE_WIDTH = 595.28;
const MARGIN = 48;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

type TaxBreakdown = { label: string; amount: number };

function taxLines(invoice: IInvoice): TaxBreakdown[] {
  if (invoice.taxType === 'CGST_SGST') {
    const cgst = Math.round((invoice.taxAmount / 2 + Number.EPSILON) * 100) / 100;
    const sgst = Math.round((invoice.taxAmount - cgst + Number.EPSILON) * 100) / 100;
    return [
      { label: `CGST (${invoice.taxRate / 2}%)`, amount: cgst },
      { label: `SGST (${invoice.taxRate / 2}%)`, amount: sgst },
    ];
  }
  if (invoice.taxType === 'IGST') {
    return [{ label: `IGST (${invoice.taxRate}%)`, amount: invoice.taxAmount }];
  }
  return [];
}

function drawHeader(doc: PDFKit.PDFDocument, business: IBusiness, invoice: IInvoice, customer: ICustomer): void {
  doc.font('Helvetica-Bold').fontSize(22).fillColor('#111827').text(business.name, MARGIN, MARGIN, { continued: false });
  doc.font('Helvetica-Bold').fontSize(20).fillColor('#111827').text('INVOICE', MARGIN, MARGIN, { align: 'right' });

  const detailsY = MARGIN + 34;
  const rightLabels = [
    ['Invoice Number', invoice.invoiceNumber],
    ['Status', invoice.status === 'OVERDUE' ? 'OVERDUE' : invoice.status],
    ['Issue Date', formatDate(invoice.issueDate)],
    ['Due Date', formatDate(invoice.dueDate)],
  ] as const;
  rightLabels.forEach(([label, value], index) => {
    const y = detailsY + index * 16;
    doc.font('Helvetica').fontSize(9).fillColor('#6b7280').text(label, PAGE_WIDTH - MARGIN - 140, y, { width: 60, align: 'left' });
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#111827').text(value, PAGE_WIDTH - MARGIN - 80, y, { width: 80, align: 'right' });
  });

  const fromY = MARGIN + 34 + rightLabels.length * 16 + 8;
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#6b7280').text('FROM', MARGIN, fromY);
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#111827').text(business.name, MARGIN, fromY + 14);
  doc.font('Helvetica').fontSize(9).fillColor('#374151');
  const lines = [
    business.address,
    business.email ? `Email: ${business.email}` : '',
    business.phone ? `Phone: ${business.phone}` : '',
  ].filter((line): line is string => Boolean(line));
  lines.forEach((line, index) => doc.text(line, MARGIN, fromY + 28 + index * 12));

  const toX = PAGE_WIDTH - MARGIN - 200;
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#6b7280').text('TO', toX, fromY, { width: 200, align: 'left' });
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#111827').text(customer.name, toX, fromY + 14, { width: 200 });
  doc.font('Helvetica').fontSize(9).fillColor('#374151');
  const customerLines = [
    customer.company,
    customer.email ? `Email: ${customer.email}` : '',
    customer.phone ? `Phone: ${customer.phone}` : '',
  ].filter((line): line is string => Boolean(line));
  customerLines.forEach((line, index) => doc.text(line, toX, fromY + 28 + index * 12, { width: 200 }));
}

function drawItemsTable(doc: PDFKit.PDFDocument, invoice: IInvoice, startY: number): number {
  const columns = [
    { key: 'description', x: MARGIN, width: 240, header: 'DESCRIPTION' },
    { key: 'quantity', x: MARGIN + 240, width: 60, header: 'QTY' },
    { key: 'unitPrice', x: MARGIN + 300, width: 90, header: 'RATE' },
    { key: 'lineTotal', x: MARGIN + 390, width: 109, header: 'AMOUNT' },
  ] as const;

  const headerY = startY;
  doc.rect(MARGIN, headerY, CONTENT_WIDTH, 22).fill('#f3f4f6');
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#6b7280');
  for (const col of columns) {
    doc.text(col.header, col.x + 6, headerY + 7, {
      width: col.width - 12,
      align: col.key === 'description' ? 'left' : 'right',
    });
  }

  let y = headerY + 22;
  doc.font('Helvetica').fontSize(9).fillColor('#111827');
  invoice.items.forEach((item, index) => {
    if (index % 2 === 1) {
      doc.rect(MARGIN, y, CONTENT_WIDTH, 20).fill('#fafafa');
    }
    doc.fillColor('#111827');
    doc.text(String(item.description), MARGIN + 6, y + 5, { width: columns[0].width - 12 });
    doc.text(String(item.quantity), columns[1].x + 6, y + 5, { width: columns[1].width - 12, align: 'right' });
    doc.text(money(item.unitPrice), columns[2].x + 6, y + 5, { width: columns[2].width - 12, align: 'right' });
    doc.text(money(item.lineTotal), columns[3].x + 6, y + 5, { width: columns[3].width - 12, align: 'right' });
    y += 20;
  });

  doc.moveTo(MARGIN, y).lineTo(PAGE_WIDTH - MARGIN, y).strokeColor('#e5e7eb').lineWidth(1).stroke();
  return y + 4;
}

function drawTotals(doc: PDFKit.PDFDocument, invoice: IInvoice, startY: number): void {
  const blockX = PAGE_WIDTH - MARGIN - 240;
  const blockWidth = 240;
  const rows: Array<{ label: string; value: string; bold?: boolean; large?: boolean }> = [
    { label: 'Subtotal', value: money(invoice.subtotal) },
  ];
  if (invoice.discountAmount > 0) {
    rows.push({ label: 'Discount', value: `- ${money(invoice.discountAmount)}` });
  }
  rows.push({ label: 'Taxable Value', value: money(invoice.taxableAmount) });
  for (const line of taxLines(invoice)) {
    rows.push({ label: line.label, value: money(line.amount) });
  }
  rows.push({ label: 'Total', value: money(invoice.totalAmount), bold: true, large: true });

  let y = startY;
  for (const row of rows) {
    doc
      .font(row.bold ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(row.large ? 14 : 9)
      .fillColor(row.large ? '#111827' : '#6b7280')
      .text(row.label, blockX, y, { width: blockWidth - 90, align: 'left' });
    doc
      .font(row.bold ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(row.large ? 14 : 9)
      .fillColor(row.large ? '#111827' : '#111827')
      .text(row.value, blockX + blockWidth - 90, y, { width: 90, align: 'right' });
    y += row.large ? 22 : 15;
  }
}

function drawFooter(doc: PDFKit.PDFDocument, invoice: IInvoice): void {
  const { page } = doc;
  const footerY = page.height - 72;
  doc
    .moveTo(MARGIN, footerY)
    .lineTo(PAGE_WIDTH - MARGIN, footerY)
    .strokeColor('#e5e7eb')
    .lineWidth(1)
    .stroke();
  doc.font('Helvetica').fontSize(8.5).fillColor('#6b7280');
  doc.text(
    `Thank you for your business. Payment due by ${formatDate(invoice.dueDate)}.`,
    MARGIN,
    footerY + 10,
    { width: CONTENT_WIDTH, align: 'left' },
  );
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#4f46e5');
  doc.text(money(invoice.totalAmount), MARGIN, footerY + 10, { width: CONTENT_WIDTH, align: 'right' });
}

export async function generateInvoicePdf(input: {
  business: IBusiness;
  customer: ICustomer;
  invoice: IInvoice;
}): Promise<Buffer> {
  const { business, customer, invoice } = input;
  const doc = new PDFDocument({ size: 'A4', margin: MARGIN, autoFirstPage: true });
  doc.info.Title = `Invoice ${invoice.invoiceNumber}`;
  doc.info.Author = business.name;

  drawHeader(doc, business, invoice, customer);
  const tableY = MARGIN + 172;
  const totalsY = drawItemsTable(doc, invoice, tableY);
  drawTotals(doc, invoice, totalsY + 8);
  drawFooter(doc, invoice);

  doc.end();
  return chunksFromDocument(doc);
}