/**
 * Domain Service: PdfGeneratorService
 * Generates PDF billing reports using jsPDF
 *
 * Uses A4 landscape orientation for better table display.
 * No text truncation - all information is displayed in full.
 */

import { Logger } from '../../../../core/utils/logger.js';
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

    this.#renderTotalSummary(report);
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

    // Summary with all totals: Entries | Netto | MwSt | Brutto | Provision
    const summaryY = this.#currentY + 1;
    this.#doc.text(`${summary.entryCount} Einträge`, margin.left + 3, summaryY);
    this.#doc.text(`Netto: ${this.#formatCurrency(summary.totalNet)}`, margin.left + 45, summaryY);
    this.#doc.text(`MwSt: ${this.#formatCurrency(summary.totalVat)}`, margin.left + 95, summaryY);
    this.#doc.text(`Brutto: ${this.#formatCurrency(summary.totalGross)}`, margin.left + 140, summaryY);
    this.#doc.text(`Provision: ${this.#formatCurrency(summary.totalProvision)}`, this.#contentWidth + margin.left - 3, summaryY, { align: 'right' });

    this.#currentY += 12;
    this.#doc.setTextColor(...colors.black);
  }

  #renderTotalSummary(report) {
    const { colors, fontSize, margin, lineHeight } = PDF_CONFIG;

    this.#checkPageBreak(70);

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

    // Calculate box heights
    let provisionRowCount = 0;
    if (report.hasOwnRevenue) provisionRowCount++;
    if (report.hasHierarchyRevenue) provisionRowCount++;
    if (report.hasTipProviderRevenue) provisionRowCount++;
    const rightBoxHeight = (provisionRowCount * 6) + 22;
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

    // Right box: Provisions-Übersicht
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

    // Total provision
    this.#doc.setFont('helvetica', 'bold');
    this.#doc.setFontSize(fontSize.sectionTitle);
    this.#doc.setTextColor(...colors.primary);
    this.#doc.text('GESAMTPROVISION:', rightLabelX, rightY + 2);
    this.#doc.setTextColor(...colors.accent);
    this.#doc.text(this.#formatCurrency(report.totalProvision), rightValueX, rightY + 2, { align: 'right' });

    this.#currentY += Math.max(leftBoxHeight, rightBoxHeight) + 8;
    this.#doc.setLineWidth(0.2);
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
    // Total content width: 267mm - includes Netto, MwSt, Brutto
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
      { header: 'Provision', key: 'provision', align: 'right', wrap: false },
    ];

    if (source === LINE_ITEM_SOURCES.HIERARCHY || source === LINE_ITEM_SOURCES.TIP_PROVIDER) {
      return [
        { header: 'Datum', key: 'date', align: 'left', wrap: false },
        { header: 'Vertriebspartner', key: 'employee', align: 'left', wrap: true },
        { header: 'Kunde', key: 'customer', align: 'left', wrap: true },
        { header: 'Kategorie', key: 'category', align: 'left', wrap: false },
        { header: 'Produkt', key: 'product', align: 'left', wrap: true },
        { header: 'Netto', key: 'net', align: 'right', wrap: false },
        { header: 'MwSt', key: 'vat', align: 'right', wrap: false },
        { header: 'Brutto', key: 'gross', align: 'right', wrap: false },
        { header: 'Prov.%', key: 'percent', align: 'right', wrap: false },
        { header: 'Provision', key: 'provision', align: 'right', wrap: false },
      ];
    }

    return baseColumns;
  }

  #getColumnWidthsForSource(source) {
    // Total content width: 267mm (A4 landscape 297mm minus 15mm margins on each side)
    // 10 columns with Netto, MwSt, Brutto
    if (source === LINE_ITEM_SOURCES.HIERARCHY || source === LINE_ITEM_SOURCES.TIP_PROVIDER) {
      // 10 columns: Date(20) + Employee(34) + Customer(37) + Category(26) + Product(46) + Net(22) + MwSt(20) + Brutto(24) + %(16) + Provision(22) = 267
      return [20, 34, 37, 26, 46, 22, 20, 24, 16, 22];
    }
    // 10 columns: Date(20) + Customer(38) + Category(26) + Product(44) + Provider(32) + Net(24) + MwSt(20) + Brutto(24) + %(15) + Provision(24) = 267
    return [20, 38, 26, 44, 32, 24, 20, 24, 15, 24];
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
        this.#formatCurrency(item.provisionAmount),
      ];
    }

    // Own revenues: 10 columns with Netto, MwSt, Brutto
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
