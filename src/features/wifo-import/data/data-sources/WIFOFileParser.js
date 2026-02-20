/**
 * Data Source: WIFOFileParser
 * Parses WIFO Excel/CSV files into import records
 */

import { WIFOImportRecord } from '../../domain/entities/WIFOImportRecord.js';
import { WIFOFileFormatError, WIFOParseError } from '../../domain/exceptions/WIFOImportError.js';

// Expected WIFO column headers
const WIFO_COLUMNS = [
  'Datum',
  'Vertrag',
  'Sparte',
  'Kunde Name',
  'Kunde Vorname',
  'Kunde Geburtsdatum',
  'Firma',
  'VP Name',
  'VP Vorname',
  'VP Geburtsdatum',
  'Kfz',
  'AP-VM',
  'Art',
  'Gesellschaft',
  'Tarif',
  'Basis',
  'Satz',
  'Brutto',
  'Stornoreserve',
  'RB',
  'Netto',
  'Vertrag ID',
  'Lauf',
  'Erstelldatum',
];

export class WIFOFileParser {
  #xlsxLib;

  constructor() {
    this.#xlsxLib = null;
  }

  /**
   * Load XLSX library dynamically
   * @returns {Promise<Object>}
   */
  async #loadXLSX() {
    if (this.#xlsxLib) {
      return this.#xlsxLib;
    }

    // Check if XLSX is available globally (CDN loaded)
    if (typeof XLSX !== 'undefined') {
      this.#xlsxLib = XLSX;
      return this.#xlsxLib;
    }

    // Try dynamic import
    try {
      this.#xlsxLib = await import('xlsx');
      return this.#xlsxLib;
    } catch {
      throw new WIFOParseError(
        'XLSX-Bibliothek konnte nicht geladen werden. Bitte laden Sie die Seite neu.'
      );
    }
  }

  /**
   * Parse a file into WIFO import records
   * @param {File} file - The uploaded file
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<WIFOImportRecord[]>}
   */
  async parse(file, onProgress = null) {
    const extension = this.#getFileExtension(file.name);

    if (!['xlsx', 'xls', 'csv'].includes(extension)) {
      throw new WIFOFileFormatError(
        `Ungültiges Dateiformat: .${extension}. Erlaubt sind: .xlsx, .xls, .csv`,
        '.xlsx, .xls, .csv'
      );
    }

    // CSV: parse raw text to preserve German number format
    // SheetJS auto-detection mangles German decimals (e.g., "159,33" → 15933)
    if (extension === 'csv') {
      return this.#parseCSVFile(file, onProgress);
    }

    // Excel (.xlsx/.xls): use SheetJS which handles numeric cells correctly
    const XLSX = await this.#loadXLSX();

    // Read file content
    const arrayBuffer = await this.#readFileAsArrayBuffer(file);

    if (onProgress) {
      onProgress(10, 100, 'Datei wird gelesen...');
    }

    // Parse workbook
    let workbook;
    try {
      workbook = XLSX.read(arrayBuffer, { type: 'array' });
    } catch (error) {
      throw new WIFOParseError(`Datei konnte nicht gelesen werden: ${error.message}`);
    }

    if (onProgress) {
      onProgress(30, 100, 'Daten werden extrahiert...');
    }

    // Get the first sheet
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new WIFOFileFormatError('Die Datei enthält keine Arbeitsblätter');
    }

    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    if (data.length < 2) {
      throw new WIFOFileFormatError('Die Datei enthält keine Daten (nur Header oder leer)');
    }

    if (onProgress) {
      onProgress(50, 100, 'Spalten werden zugeordnet...');
    }

    // Build column map from header row
    const headerRow = data[0];
    const columnMap = this.#buildColumnMap(headerRow);

    // Validate required columns
    this.#validateColumns(columnMap);

    if (onProgress) {
      onProgress(60, 100, 'Datensätze werden verarbeitet...');
    }

    // Parse data rows into records
    const records = [];
    const totalRows = data.length - 1;

    for (let i = 1; i < data.length; i++) {
      const row = data[i];

      // Skip empty rows
      if (this.#isEmptyRow(row)) {
        continue;
      }

      const record = WIFOImportRecord.fromWIFORow(i, row, columnMap);
      records.push(record);

      if (onProgress && i % 50 === 0) {
        const progress = 60 + Math.floor((i / totalRows) * 40);
        onProgress(progress, 100, `Zeile ${i} von ${totalRows}...`);
      }
    }

    if (onProgress) {
      onProgress(100, 100, 'Fertig');
    }

    return records;
  }

  /**
   * Build column index map from header row
   * @param {Array} headerRow - The header row
   * @returns {Object} Map of column name to index
   */
  #buildColumnMap(headerRow) {
    const map = {};

    for (let i = 0; i < headerRow.length; i++) {
      const header = headerRow[i]?.toString().trim();
      if (header) {
        map[header] = i;
      }
    }

    return map;
  }

  /**
   * Validate that required columns are present
   * @param {Object} columnMap - The column map
   */
  #validateColumns(columnMap) {
    const requiredColumns = ['Netto', 'AP-VM', 'Sparte', 'Datum'];
    const missingColumns = [];

    for (const col of requiredColumns) {
      if (columnMap[col] === undefined) {
        missingColumns.push(col);
      }
    }

    if (missingColumns.length > 0) {
      throw new WIFOFileFormatError(
        `Pflicht-Spalten fehlen: ${missingColumns.join(', ')}`,
        requiredColumns.join(', ')
      );
    }
  }

  /**
   * Check if a row is empty
   * @param {Array} row - The row data
   * @returns {boolean}
   */
  #isEmptyRow(row) {
    if (!row || row.length === 0) {
      return true;
    }
    return row.every(
      (cell) => cell === null || cell === undefined || cell.toString().trim() === ''
    );
  }

  /**
   * Get file extension
   * @param {string} filename - The filename
   * @returns {string}
   */
  #getFileExtension(filename) {
    return filename.split('.').pop()?.toLowerCase() ?? '';
  }

  /**
   * Read file as ArrayBuffer
   * @param {File} file - The file to read
   * @returns {Promise<ArrayBuffer>}
   */
  #readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Datei konnte nicht gelesen werden'));
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Read file as text for CSV parsing
   * @param {File} file - The file to read
   * @returns {Promise<string>}
   */
  #readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Datei konnte nicht gelesen werden'));
      reader.readAsText(file, 'utf-8');
    });
  }

  /**
   * Parse CSV file with raw text to preserve German number format
   * @param {File} file - The CSV file
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<WIFOImportRecord[]>}
   */
  async #parseCSVFile(file, onProgress) {
    if (onProgress) {
      onProgress(10, 100, 'CSV-Datei wird gelesen...');
    }

    const text = await this.#readFileAsText(file);

    if (onProgress) {
      onProgress(30, 100, 'Daten werden extrahiert...');
    }

    const delimiter = this.#detectCSVDelimiter(text);
    const rows = this.#parseCSVText(text, delimiter);

    if (rows.length < 2) {
      throw new WIFOFileFormatError('Die Datei enthält keine Daten (nur Header oder leer)');
    }

    if (onProgress) {
      onProgress(50, 100, 'Spalten werden zugeordnet...');
    }

    const headerRow = rows[0];
    const columnMap = this.#buildColumnMap(headerRow);
    this.#validateColumns(columnMap);

    if (onProgress) {
      onProgress(60, 100, 'Datensätze werden verarbeitet...');
    }

    const records = [];
    const totalRows = rows.length - 1;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (this.#isEmptyRow(row)) {
        continue;
      }

      const record = WIFOImportRecord.fromWIFORow(i, row, columnMap);
      records.push(record);

      if (onProgress && i % 50 === 0) {
        const progress = 60 + Math.floor((i / totalRows) * 40);
        onProgress(progress, 100, `Zeile ${i} von ${totalRows}...`);
      }
    }

    if (onProgress) {
      onProgress(100, 100, 'Fertig');
    }

    return records;
  }

  /**
   * Auto-detect CSV delimiter (semicolon for German CSV, comma otherwise)
   * @param {string} text - CSV text content
   * @returns {string}
   */
  #detectCSVDelimiter(text) {
    const firstLine = text.split(/\r?\n/)[0] || '';
    const semicolons = (firstLine.match(/;/g) || []).length;
    const commas = (firstLine.match(/,/g) || []).length;
    // German CSVs typically use semicolons since comma is the decimal separator
    return semicolons >= commas ? ';' : ',';
  }

  /**
   * Parse CSV text into array of row arrays (preserves raw text values)
   * @param {string} text - CSV text content
   * @param {string} delimiter - Field delimiter
   * @returns {Array<Array<string>>}
   */
  #parseCSVText(text, delimiter) {
    const rows = [];
    let currentRow = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (inQuotes) {
        if (char === '"') {
          if (nextChar === '"') {
            currentField += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          currentField += char;
        }
      } else if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
        currentRow.push(currentField.trim());
        if (currentRow.length > 0) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
        if (char === '\r') i++;
      } else if (char === '\r') {
        currentRow.push(currentField.trim());
        if (currentRow.length > 0) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }

    // Handle last row (file may not end with newline)
    if (currentField || currentRow.length > 0) {
      currentRow.push(currentField.trim());
      if (currentRow.some((cell) => cell !== '')) {
        rows.push(currentRow);
      }
    }

    return rows;
  }

  /**
   * Get expected column headers
   * @returns {string[]}
   */
  static getExpectedColumns() {
    return [...WIFO_COLUMNS];
  }
}
