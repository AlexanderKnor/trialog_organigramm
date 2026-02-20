/**
 * Domain Service: PdfGeneratorService
 * Generates PDF billing reports using jsPDF
 *
 * Uses A4 landscape orientation for better table display.
 * No text truncation - all information is displayed in full.
 */

import { Logger } from '../../../../core/utils/logger.js';
import { roundCurrency } from '../../../../core/utils/index.js';
import { LINE_ITEM_SOURCES } from '../entities/ReportLineItem.js';

const PDF_CONFIG = {
  // A4 Landscape dimensions
  pageWidth: 297,
  pageHeight: 210,
  margin: {
    top: 15,
    bottom: 15,
    left: 15,
    right: 15,
  },
  fontSize: {
    title: 16,
    sectionTitle: 11,
    normal: 9,
    small: 7.5,
    tableHeader: 8,
    tableBody: 7.5,
  },
  lineHeight: 4.5,
  rowPadding: 2,
  colors: {
    primary: [16, 39, 76],
    secondary: [100, 100, 100],
    accent: [42, 82, 152],
    lightGray: [248, 249, 250],
    borderGray: [220, 220, 220],
    black: [30, 30, 30],
    white: [255, 255, 255],
    headerBg: [16, 39, 76],
    alternateRow: [252, 252, 253],
  },
};

export class PdfGeneratorService {
  #doc;
  #currentY;
  #pageNumber;
  #contentWidth;

  constructor() {
    this.#doc = null;
    this.#currentY = PDF_CONFIG.margin.top;
    this.#pageNumber = 1;
    this.#contentWidth = PDF_CONFIG.pageWidth - PDF_CONFIG.margin.left - PDF_CONFIG.margin.right;
  }

  async generatePdf(report) {
    Logger.log('Generating PDF for report:', report.metadata.reportNumber);

    if (typeof window.jspdf === 'undefined') {
      throw new Error('jsPDF library not loaded. Please ensure jsPDF CDN is included.');
    }

    const { jsPDF } = window.jspdf;
    this.#doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    this.#currentY = PDF_CONFIG.margin.top;
    this.#pageNumber = 1;
    this.#contentWidth = PDF_CONFIG.pageWidth - PDF_CONFIG.margin.left - PDF_CONFIG.margin.right;

    this.#renderHeader(report);
    this.#renderEmployeeAndPeriodSection(report.employeeDetails, report.period);

    if (report.hasOwnRevenue) {
      this.#renderRevenueTable(
        'Eigene Umsätze',
        report.ownLineItems,
        report.ownSummary,
        LINE_ITEM_SOURCES.OWN
      );
    }

    if (report.hasHierarchyRevenue) {
      this.#renderRevenueTable(
        'Team-Umsätze (Hierarchie-Provision)',
        report.hierarchyLineItems,
        report.hierarchySummary,
        LINE_ITEM_SOURCES.HIERARCHY
      );
    }

    if (report.hasTipProviderRevenue) {
      this.#renderRevenueTable(
        'Tippgeber-Umsätze',
        report.tipProviderLineItems,
        report.tipProviderSummary,
        LINE_ITEM_SOURCES.TIP_PROVIDER
      );
    }

    this.#renderMissingSectionNotes(report);
    this.#renderTotalSummary(report);
    this.#renderPaymentInfo();
    this.#renderFooter(report);

    const blob = this.#doc.output('blob');
    const fileName = this.#generateFileName(report);

    Logger.log('PDF generated successfully:', fileName);

    return { blob, fileName };
  }

  downloadPdf(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  #generateFileName(report) {
    const employeeName = report.employeeDetails.name
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_äöüÄÖÜß]/g, '');
    const period = report.period.shortDisplayName.replace(/\//g, '-');
    return `Abrechnung_${employeeName}_${period}.pdf`;
  }

  #renderHeader(report) {
    const { colors, fontSize, margin } = PDF_CONFIG;

    // Header bar
    this.#doc.setFillColor(...colors.primary);
    this.#doc.rect(0, 0, PDF_CONFIG.pageWidth, 28, 'F');

    // Title
    this.#doc.setTextColor(...colors.white);
    this.#doc.setFontSize(fontSize.title);
    this.#doc.setFont('helvetica', 'bold');
    this.#doc.text('PROVISIONSABRECHNUNG', margin.left, 14);

    // Report info
    this.#doc.setFontSize(fontSize.small);
    this.#doc.setFont('helvetica', 'normal');
    this.#doc.text(`Berichtsnr: ${report.metadata.reportNumber}`, margin.left, 22);

    // Company info (right side)
    this.#doc.setFontSize(fontSize.normal);
    this.#doc.setFont('helvetica', 'bold');
    this.#doc.text('Trialog Makler Gruppe GmbH', PDF_CONFIG.pageWidth - margin.right, 12, { align: 'right' });
    this.#doc.setFontSize(fontSize.small);
    this.#doc.setFont('helvetica', 'normal');
    this.#doc.text(`Erstellt am: ${report.metadata.generatedAtFormatted}`, PDF_CONFIG.pageWidth - margin.right, 18, { align: 'right' });

    this.#currentY = 35;
    this.#doc.setTextColor(...colors.black);
  }

  #renderEmployeeAndPeriodSection(employeeDetails, period) {
    const { colors, fontSize, margin, lineHeight } = PDF_CONFIG;

    // Employee and period info in a horizontal layout
    const leftColX = margin.left;
    const midColX = margin.left + 90;
    const rightColX = margin.left + 180;

    // Background box
    this.#doc.setFillColor(...colors.lightGray);
    this.#doc.roundedRect(margin.left, this.#currentY - 2, this.#contentWidth, 28, 2, 2, 'F');

    const boxY = this.#currentY;

    // Left column: Recipient name and address
    this.#doc.setFontSize(fontSize.sectionTitle);
    this.#doc.setFont('helvetica', 'bold');
    this.#doc.setTextColor(...colors.primary);
    this.#doc.text('Zahlungsempfänger', leftColX + 4, boxY + 4);

    this.#doc.setFontSize(fontSize.normal);
    this.#doc.setFont('helvetica', 'bold');
    this.#doc.setTextColor(...colors.black);
    this.#doc.text(employeeDetails.name, leftColX + 4, boxY + 11);

    this.#doc.setFont('helvetica', 'normal');
    this.#doc.setFontSize(fontSize.small);
    let addressY = boxY + 16;
    if (employeeDetails.hasAddress) {
      const { street, cityLine } = employeeDetails.fullAddress;
      if (street) {
        this.#doc.text(street, leftColX + 4, addressY);
        addressY += 4;
      }
      if (cityLine) {
        this.#doc.text(cityLine, leftColX + 4, addressY);
      }
    }

    // Middle column: Tax info
    this.#doc.setFontSize(fontSize.sectionTitle);
    this.#doc.setFont('helvetica', 'bold');
    this.#doc.setTextColor(...colors.primary);
    this.#doc.text('Steuerdaten', midColX, boxY + 4);

    this.#doc.setFontSize(fontSize.small);
    this.#doc.setFont('helvetica', 'normal');
    this.#doc.setTextColor(...colors.black);
    let taxY = boxY + 11;
    if (employeeDetails.taxNumber) {
      this.#doc.text(`Steuernr: ${employeeDetails.taxNumber}`, midColX, taxY);
      taxY += 4;
    }
    if (employeeDetails.vatNumber) {
      this.#doc.text(`USt-IdNr: ${employeeDetails.vatNumber}`, midColX, taxY);
      taxY += 4;
    }
    if (employeeDetails.hasBankInfo) {
      this.#doc.text(`IBAN: ${employeeDetails.ibanFormatted}`, midColX, taxY);
    }

    // Right column: Period
    this.#doc.setFontSize(fontSize.sectionTitle);
    this.#doc.setFont('helvetica', 'bold');
    this.#doc.setTextColor(...colors.primary);
    this.#doc.text('Abrechnungszeitraum', rightColX, boxY + 4);

    this.#doc.setFontSize(fontSize.normal);
    this.#doc.setFont('helvetica', 'bold');
    this.#doc.setTextColor(...colors.accent);
    this.#doc.text(period.displayName, rightColX, boxY + 12);

    this.#doc.setFontSize(fontSize.small);
    this.#doc.setFont('helvetica', 'normal');
    this.#doc.setTextColor(...colors.secondary);
    this.#doc.text(`${period.startDate.toLocaleDateString('de-DE')} - ${period.endDate.toLocaleDateString('de-DE')}`, rightColX, boxY + 18);

    this.#currentY += 32;
    this.#doc.setTextColor(...colors.black);
  }

  #renderRevenueTable(title, lineItems, summary, source) {
    const { colors, fontSize, margin, lineHeight } = PDF_CONFIG;

    this.#checkPageBreak(50);

    // Section title
    this.#doc.setFontSize(fontSize.sectionTitle);
    this.#doc.setFont('helvetica', 'bold');
    this.#doc.setTextColor(...colors.primary);
    this.#doc.text(title.toUpperCase(), margin.left, this.#currentY);
    this.#currentY += lineHeight + 3;

    // Get column configuration
    const columns = this.#getColumnsForSource(source);
    const colWidths = this.#getColumnWidthsForSource(source);

    // Table header
    this.#doc.setFillColor(...colors.headerBg);
    this.#doc.rect(margin.left, this.#currentY - 4, this.#contentWidth, 8, 'F');

    this.#doc.setFontSize(fontSize.tableHeader);
    this.#doc.setFont('helvetica', 'bold');
    this.#doc.setTextColor(...colors.white);

    let x = margin.left;
    columns.forEach((col, i) => {
      const align = col.align || 'left';
      const cellPadding = 2;
      let textX;
      if (align === 'right') {
        textX = x + colWidths[i] - cellPadding;
      } else {
        textX = x + cellPadding;
      }
      this.#doc.text(col.header, textX, this.#currentY, { align });
      x += colWidths[i];
    });

    this.#currentY += 6;

    // Table body
    this.#doc.setFontSize(fontSize.tableBody);
    this.#doc.setTextColor(...colors.black);

    lineItems.forEach((item, index) => {
      const rowValues = this.#getRowValuesForSource(item, source);
      const rowHeight = this.#calculateRowHeight(rowValues, colWidths, columns);

      this.#checkPageBreak(rowHeight + 2);

      // Alternate row background
      if (index % 2 === 0) {
        this.#doc.setFillColor(...colors.alternateRow);
        this.#doc.rect(margin.left, this.#currentY - 3, this.#contentWidth, rowHeight, 'F');
      }

      // Draw cell contents
      x = margin.left;
      this.#doc.setFont('helvetica', 'normal');

      rowValues.forEach((value, i) => {
        const col = columns[i];
        const cellPadding = 2;
        const cellWidth = colWidths[i] - (cellPadding * 2);
        const align = col.align || 'left';

        // Calculate text position based on alignment
        let textX;
        if (align === 'right') {
          textX = x + colWidths[i] - cellPadding;
        } else {
          textX = x + cellPadding;
        }

        if (col.wrap && value && value.length > 0) {
          // Multi-line text - wrap within cell width
          const lines = this.#wrapText(value, cellWidth);
          lines.forEach((line, lineIdx) => {
            const lineY = this.#currentY + (lineIdx * 3.5);
            this.#doc.text(line, textX, lineY, { align });
          });
        } else {
          // Single line text - truncate if too long to prevent overlap
          const displayValue = this.#fitTextToWidth(value || '', cellWidth);
          this.#doc.text(displayValue, textX, this.#currentY, { align });
        }
        x += colWidths[i];
      });

      this.#currentY += rowHeight;
    });

    // Summary row
    this.#currentY += 2;
    this.#doc.setFillColor(...colors.primary);
    this.#doc.rect(margin.left, this.#currentY - 3, this.#contentWidth, 8, 'F');

    this.#doc.setFontSize(fontSize.small);
    this.#doc.setFont('helvetica', 'bold');
    this.#doc.setTextColor(...colors.white);

    // Summary: Entries | Umsatz Brutto | Provision Netto/MwSt/Brutto
    const summaryY = this.#currentY + 1;
    const provVat = summary.totalProvisionVat || 0;
    const provNetto = roundCurrency(summary.totalProvision - provVat);
    this.#doc.text(`${summary.entryCount} Einträge`, margin.left + 3, summaryY);
    this.#doc.text(`Umsatz Brutto: ${this.#formatCurrency(summary.totalGross)}`, margin.left + 40, summaryY);
    this.#doc.text(`Prov. Netto: ${this.#formatCurrency(provNetto)}`, margin.left + 110, summaryY);
    this.#doc.text(`Prov. MwSt: ${this.#formatCurrency(provVat)}`, margin.left + 170, summaryY);
    this.#doc.text(`Prov. Brutto: ${this.#formatCurrency(summary.totalProvision)}`, this.#contentWidth + margin.left - 3, summaryY, { align: 'right' });

    this.#currentY += 12;
    this.#doc.setTextColor(...colors.black);
  }

  #renderTotalSummary(report) {
    const { colors, fontSize, margin, lineHeight } = PDF_CONFIG;

    this.#checkPageBreak(90);

    // Section title
    this.#doc.setFontSize(fontSize.sectionTitle);
    this.#doc.setFont('helvetica', 'bold');
    this.#doc.setTextColor(...colors.primary);
    this.#doc.text('ZUSAMMENFASSUNG', margin.left, this.#currentY);
    this.#currentY += lineHeight + 3;

    const totalSummary = report.totalSummary;

    // Two-column layout: Left = Umsatz-Übersicht, Right = Provisions-Übersicht
    const leftBoxWidth = 130;
    const rightBoxWidth = 120;
    const gap = 10;
    const leftBoxX = margin.left;
    const rightBoxX = PDF_CONFIG.pageWidth - margin.right - rightBoxWidth;

    const leftBoxHeight = 32;

    // Left box: Umsatz-Übersicht (Netto, MwSt, Brutto)
    this.#doc.setFillColor(...colors.lightGray);
    this.#doc.roundedRect(leftBoxX, this.#currentY - 3, leftBoxWidth, leftBoxHeight, 2, 2, 'F');

    this.#doc.setFontSize(fontSize.small);
    this.#doc.setFont('helvetica', 'bold');
    this.#doc.setTextColor(...colors.primary);
    this.#doc.text('UMSATZ-ÜBERSICHT', leftBoxX + 5, this.#currentY + 3);

    this.#doc.setFont('helvetica', 'normal');
    this.#doc.setTextColor(...colors.black);
    const leftLabelX = leftBoxX + 5;
    const leftValueX = leftBoxX + leftBoxWidth - 5;
    let leftY = this.#currentY + 11;

    this.#doc.text('Netto gesamt:', leftLabelX, leftY);
    this.#doc.text(this.#formatCurrency(totalSummary.totalNet), leftValueX, leftY, { align: 'right' });
    leftY += 6;

    this.#doc.text('MwSt gesamt:', leftLabelX, leftY);
    this.#doc.text(this.#formatCurrency(totalSummary.totalVat), leftValueX, leftY, { align: 'right' });
    leftY += 6;

    this.#doc.setFont('helvetica', 'bold');
    this.#doc.text('Brutto gesamt:', leftLabelX, leftY);
    this.#doc.text(this.#formatCurrency(totalSummary.totalGross), leftValueX, leftY, { align: 'right' });

    // Right box: Provisions-Übersicht (with VAT breakdown)
    // Calculate right box height: header(8) + per-source rows(6 each) + separator(4) + subtotal rows(6×3) + total(8)
    let rightProvisionRows = 0;
    if (report.hasOwnRevenue) rightProvisionRows++;
    if (report.hasHierarchyRevenue) rightProvisionRows++;
    if (report.hasTipProviderRevenue) rightProvisionRows++;
    const rightBoxHeight = (rightProvisionRows * 6) + 8 + 4 + 24 + 8;

    this.#doc.setFillColor(...colors.lightGray);
    this.#doc.roundedRect(rightBoxX, this.#currentY - 3, rightBoxWidth, rightBoxHeight, 2, 2, 'F');

    this.#doc.setFontSize(fontSize.small);
    this.#doc.setFont('helvetica', 'bold');
    this.#doc.setTextColor(...colors.primary);
    this.#doc.text('PROVISIONS-ÜBERSICHT', rightBoxX + 5, this.#currentY + 3);

    this.#doc.setFontSize(fontSize.normal);
    this.#doc.setFont('helvetica', 'normal');
    this.#doc.setTextColor(...colors.black);

    const rightLabelX = rightBoxX + 5;
    const rightValueX = rightBoxX + rightBoxWidth - 5;
    let rightY = this.#currentY + 11;

    // Per-source provision (netto)
    if (report.hasOwnRevenue) {
      this.#doc.text('Eigene Umsätze:', rightLabelX, rightY);
      this.#doc.text(this.#formatCurrency(report.ownSummary.totalProvision), rightValueX, rightY, { align: 'right' });
      rightY += 6;
    }

    if (report.hasHierarchyRevenue) {
      this.#doc.text('Team-Provision:', rightLabelX, rightY);
      this.#doc.text(this.#formatCurrency(report.hierarchySummary.totalProvision), rightValueX, rightY, { align: 'right' });
      rightY += 6;
    }

    if (report.hasTipProviderRevenue) {
      this.#doc.text('Tippgeber-Provision:', rightLabelX, rightY);
      this.#doc.text(this.#formatCurrency(report.tipProviderSummary.totalProvision), rightValueX, rightY, { align: 'right' });
      rightY += 6;
    }

    // Separator line
    rightY += 1;
    this.#doc.setDrawColor(...colors.primary);
    this.#doc.setLineWidth(0.5);
    this.#doc.line(rightLabelX, rightY - 3, rightValueX, rightY - 3);

    // Provision totals with VAT breakdown (VAT is extracted, not added)
    // Inline calculation to avoid getter dependency issues
    const totalProv = report.totalProvision || 0;
    const totalProvVat = (report.ownSummary?.totalProvisionVat || 0)
      + (report.hierarchySummary?.totalProvisionVat || 0)
      + (report.tipProviderSummary?.totalProvisionVat || 0);
    const totalProvNetto = roundCurrency(totalProv - totalProvVat);
    const isSmallBusiness = report.employeeDetails?.isSmallBusiness ?? false;

    this.#doc.setFont('helvetica', 'bold');
    this.#doc.setFontSize(fontSize.sectionTitle);
    this.#doc.setTextColor(...colors.primary);
    this.#doc.text('GESAMTPROVISION:', rightLabelX, rightY + 2);
    this.#doc.setTextColor(...colors.accent);
    this.#doc.text(this.#formatCurrency(totalProv), rightValueX, rightY + 2, { align: 'right' });
    rightY += 8;

    this.#doc.setFontSize(fontSize.normal);
    this.#doc.setFont('helvetica', 'normal');
    this.#doc.setTextColor(...colors.black);

    if (!isSmallBusiness) {
      this.#doc.text('darin enth. Netto:', rightLabelX, rightY + 2);
      this.#doc.text(this.#formatCurrency(totalProvNetto), rightValueX, rightY + 2, { align: 'right' });
      rightY += 5;

      this.#doc.text('darin enth. 19% MwSt:', rightLabelX, rightY + 2);
      this.#doc.text(this.#formatCurrency(totalProvVat), rightValueX, rightY + 2, { align: 'right' });
    } else {
      this.#doc.setFont('helvetica', 'italic');
      this.#doc.setFontSize(fontSize.small);
      this.#doc.setTextColor(...colors.secondary);
      this.#doc.text('Gem. §19 UStG keine USt', rightLabelX, rightY + 2);
    }

    this.#currentY += Math.max(leftBoxHeight, rightBoxHeight) + 8;
    this.#doc.setLineWidth(0.2);
  }

  #renderMissingSectionNotes(report) {
    const notes = [];

    if (!report.hasOwnRevenue) {
      notes.push('Keine eigenen Umsätze im Abrechnungszeitraum vorhanden.');
    }

    if (!report.hasHierarchyRevenue) {
      notes.push('Keine Team-Umsätze im Abrechnungszeitraum vorhanden.');
    }

    if (!report.hasTipProviderRevenue) {
      notes.push('Keine Tippgeber-Umsätze im Abrechnungszeitraum vorhanden.');
    }

    if (notes.length === 0) return;

    const { colors, fontSize, margin, lineHeight } = PDF_CONFIG;
    const noteBlockHeight = 8 + (notes.length * lineHeight);

    this.#checkPageBreak(noteBlockHeight + 4);

    this.#doc.setFontSize(fontSize.small);
    this.#doc.setFont('helvetica', 'italic');
    this.#doc.setTextColor(...colors.secondary);

    notes.forEach((note) => {
      this.#doc.text(`Hinweis: ${note}`, margin.left, this.#currentY);
      this.#currentY += lineHeight;
    });

    this.#currentY += 4;
    this.#doc.setTextColor(...colors.black);
    this.#doc.setFont('helvetica', 'normal');
  }

  #renderPaymentInfo() {
    const { colors, fontSize, margin } = PDF_CONFIG;
    const blockHeight = 38;

    this.#checkPageBreak(blockHeight);

    // Subtle separator line
    this.#doc.setDrawColor(...colors.borderGray);
    this.#doc.setLineWidth(0.3);
    this.#doc.line(margin.left, this.#currentY, margin.left + this.#contentWidth, this.#currentY);
    this.#currentY += 6;

    // Section title
    this.#doc.setFontSize(fontSize.small);
    this.#doc.setFont('helvetica', 'bold');
    this.#doc.setTextColor(...colors.primary);
    this.#doc.text('ZAHLUNGSHINWEIS', margin.left, this.#currentY);
    this.#currentY += 5;

    // Payment instruction text
    this.#doc.setFontSize(fontSize.small);
    this.#doc.setFont('helvetica', 'normal');
    this.#doc.setTextColor(...colors.black);
    this.#doc.text(
      'Ein Sollsaldo ist innerhalb von 5 Tagen durch Überweisung über unser Konto zu entrichten:',
      margin.left,
      this.#currentY,
    );
    this.#currentY += 6;

    // Bank details
    this.#doc.setFont('helvetica', 'bold');
    this.#doc.text('Volksbank im Münsterland eG', margin.left, this.#currentY);
    this.#currentY += 5;

    this.#doc.setFont('helvetica', 'normal');
    this.#doc.text('IBAN:', margin.left, this.#currentY);
    this.#doc.setFont('helvetica', 'bold');
    this.#doc.text('DE17 4036 1906 5318 8510 00', margin.left + 14, this.#currentY);
    this.#currentY += 4;

    this.#doc.setFont('helvetica', 'normal');
    this.#doc.text('BIC:', margin.left, this.#currentY);
    this.#doc.setFont('helvetica', 'bold');
    this.#doc.text('GENODEM1IBB', margin.left + 14, this.#currentY);

    this.#currentY += 8;
    this.#doc.setFont('helvetica', 'normal');
  }

  #renderFooter(report) {
    const { colors, fontSize, margin } = PDF_CONFIG;
    const pageCount = this.#doc.internal.getNumberOfPages();

    for (let i = 1; i <= pageCount; i++) {
      this.#doc.setPage(i);

      this.#doc.setDrawColor(...colors.borderGray);
      this.#doc.line(
        margin.left,
        PDF_CONFIG.pageHeight - margin.bottom + 5,
        PDF_CONFIG.pageWidth - margin.right,
        PDF_CONFIG.pageHeight - margin.bottom + 5
      );

      this.#doc.setFontSize(fontSize.small);
      this.#doc.setFont('helvetica', 'normal');
      this.#doc.setTextColor(...colors.secondary);

      this.#doc.text(
        `Seite ${i} von ${pageCount}`,
        margin.left,
        PDF_CONFIG.pageHeight - margin.bottom + 12
      );

      this.#doc.text(
        `Generiert: ${report.metadata.generatedAtFormatted}`,
        PDF_CONFIG.pageWidth - margin.right,
        PDF_CONFIG.pageHeight - margin.bottom + 12,
        { align: 'right' }
      );
    }
  }

  #checkPageBreak(requiredSpace) {
    const { margin } = PDF_CONFIG;
    const availableSpace = PDF_CONFIG.pageHeight - margin.bottom - this.#currentY;

    if (availableSpace < requiredSpace) {
      this.#doc.addPage();
      this.#pageNumber++;
      this.#currentY = margin.top;
    }
  }

  #getColumnsForSource(source) {
    // Base columns for own revenues (expanded layout for landscape)
    // Total content width: 267mm - includes revenue Netto/MwSt/Brutto + provision Netto/MwSt/Brutto
    const baseColumns = [
      { header: 'Datum', key: 'date', align: 'left', wrap: false },
      { header: 'Kunde', key: 'customer', align: 'left', wrap: true },
      { header: 'Kategorie', key: 'category', align: 'left', wrap: false },
      { header: 'Produkt', key: 'product', align: 'left', wrap: true },
      { header: 'Anbieter', key: 'provider', align: 'left', wrap: true },
      { header: 'Netto', key: 'net', align: 'right', wrap: false },
      { header: 'MwSt', key: 'vat', align: 'right', wrap: false },
      { header: 'Brutto', key: 'gross', align: 'right', wrap: false },
      { header: 'Prov.%', key: 'percent', align: 'right', wrap: false },
      { header: 'Prov. Netto', key: 'provNet', align: 'right', wrap: false },
      { header: 'Prov. MwSt', key: 'provVat', align: 'right', wrap: false },
      { header: 'Prov. Brutto', key: 'provGross', align: 'right', wrap: false },
    ];

    if (source === LINE_ITEM_SOURCES.HIERARCHY || source === LINE_ITEM_SOURCES.TIP_PROVIDER) {
      return [
        { header: 'Datum', key: 'date', align: 'left', wrap: false },
        { header: 'Vertriebsp.', key: 'employee', align: 'left', wrap: true },
        { header: 'Kunde', key: 'customer', align: 'left', wrap: true },
        { header: 'Kategorie', key: 'category', align: 'left', wrap: false },
        { header: 'Produkt', key: 'product', align: 'left', wrap: true },
        { header: 'Netto', key: 'net', align: 'right', wrap: false },
        { header: 'MwSt', key: 'vat', align: 'right', wrap: false },
        { header: 'Brutto', key: 'gross', align: 'right', wrap: false },
        { header: 'Prov.%', key: 'percent', align: 'right', wrap: false },
        { header: 'Prov. Netto', key: 'provNet', align: 'right', wrap: false },
        { header: 'Prov. MwSt', key: 'provVat', align: 'right', wrap: false },
        { header: 'Prov. Brutto', key: 'provGross', align: 'right', wrap: false },
      ];
    }

    return baseColumns;
  }

  #getColumnWidthsForSource(source) {
    // Total content width: 267mm (A4 landscape 297mm minus 15mm margins on each side)
    // 12 columns with revenue Netto/MwSt/Brutto + provision Netto/MwSt/Brutto
    if (source === LINE_ITEM_SOURCES.HIERARCHY || source === LINE_ITEM_SOURCES.TIP_PROVIDER) {
      // 12 columns: Date(18) + Employee(28) + Customer(28) + Category(20) + Product(30) + Net(19) + MwSt(17) + Brutto(19) + %(13) + P.Netto(24) + P.MwSt(22) + P.Brutto(29) = 267
      return [18, 28, 28, 20, 30, 19, 17, 19, 13, 24, 22, 29];
    }
    // 12 columns: Date(18) + Customer(30) + Category(20) + Product(30) + Provider(22) + Net(19) + MwSt(17) + Brutto(19) + %(13) + P.Netto(24) + P.MwSt(22) + P.Brutto(33) = 267
    return [18, 30, 20, 30, 22, 19, 17, 19, 13, 24, 22, 33];
  }

  #getRowValuesForSource(item, source) {
    // Format date as full date (e.g., "01.12.2025")
    const formattedDate = this.#formatFullDate(item.date);

    if (source === LINE_ITEM_SOURCES.HIERARCHY || source === LINE_ITEM_SOURCES.TIP_PROVIDER) {
      return [
        formattedDate,
        item.subordinateName || 'Unbekannt',
        item.customerName || '',
        item.categoryDisplayName || '',
        item.productName || '',
        this.#formatCurrency(item.netAmount),
        this.#formatCurrency(item.vatAmount),
        this.#formatCurrency(item.grossAmount),
        this.#formatPercentage(item.provisionPercentage),
        this.#formatCurrency(item.provisionNetAmount),
        this.#formatCurrency(item.provisionVatAmount),
        this.#formatCurrency(item.provisionAmount),
      ];
    }

    // Own revenues: 12 columns with revenue Netto/MwSt/Brutto + provision Netto/MwSt/Brutto
    return [
      formattedDate,
      item.customerName || '',
      item.categoryDisplayName || '',
      item.productName || '',
      item.providerName || '',
      this.#formatCurrency(item.netAmount),
      this.#formatCurrency(item.vatAmount),
      this.#formatCurrency(item.grossAmount),
      this.#formatPercentage(item.provisionPercentage),
      this.#formatCurrency(item.provisionNetAmount),
      this.#formatCurrency(item.provisionVatAmount),
      this.#formatCurrency(item.provisionAmount),
    ];
  }

  #formatFullDate(date) {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  #formatPercentage(value) {
    if (value === null || value === undefined) return '';
    return `${Number(value).toFixed(1)} %`;
  }

  #formatCurrency(amount) {
    if (amount === null || amount === undefined) return '';
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  }

  #wrapText(text, maxWidthMm) {
    if (!text) return [''];

    // Use jsPDF's getTextWidth for accurate measurement
    const getTextWidth = (str) => {
      return this.#doc.getTextWidth(str);
    };

    // Check if text fits in one line
    if (getTextWidth(text) <= maxWidthMm) {
      return [text];
    }

    const lines = [];
    const words = text.split(/\s+/);
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (getTextWidth(testLine) <= maxWidthMm) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        // Handle very long words that don't fit
        if (getTextWidth(word) > maxWidthMm) {
          let remaining = word;
          while (getTextWidth(remaining) > maxWidthMm && remaining.length > 1) {
            // Find the maximum characters that fit
            let i = remaining.length - 1;
            while (i > 0 && getTextWidth(remaining.substring(0, i) + '-') > maxWidthMm) {
              i--;
            }
            if (i > 0) {
              lines.push(remaining.substring(0, i) + '-');
              remaining = remaining.substring(i);
            } else {
              // Can't fit even one character, just push it
              lines.push(remaining);
              remaining = '';
            }
          }
          currentLine = remaining;
        } else {
          currentLine = word;
        }
      }
    }

    if (currentLine) lines.push(currentLine);
    return lines.length > 0 ? lines : [''];
  }

  #fitTextToWidth(text, maxWidthMm) {
    if (!text) return '';

    // Use jsPDF's getTextWidth for accurate measurement
    const textWidth = this.#doc.getTextWidth(text);

    if (textWidth <= maxWidthMm) {
      return text;
    }

    // Text is too long, need to truncate
    // Binary search for the right length
    let low = 0;
    let high = text.length;
    const ellipsis = '...';
    const ellipsisWidth = this.#doc.getTextWidth(ellipsis);
    const targetWidth = maxWidthMm - ellipsisWidth;

    while (low < high) {
      const mid = Math.floor((low + high + 1) / 2);
      const testText = text.substring(0, mid);
      if (this.#doc.getTextWidth(testText) <= targetWidth) {
        low = mid;
      } else {
        high = mid - 1;
      }
    }

    return text.substring(0, low) + ellipsis;
  }

  #calculateRowHeight(values, colWidths, columns) {
    const baseRowHeight = 5;
    const lineSpacing = 3.5;
    let maxLines = 1;

    values.forEach((value, i) => {
      if (columns[i] && columns[i].wrap && value) {
        const cellPadding = 2;
        const cellWidth = colWidths[i] - (cellPadding * 2);
        const lines = this.#wrapText(value, cellWidth);
        maxLines = Math.max(maxLines, lines.length);
      }
    });

    return Math.max(baseRowHeight, maxLines * lineSpacing + 1.5);
  }
}
