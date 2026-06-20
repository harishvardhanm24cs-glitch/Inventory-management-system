/**
 * rackHelper.js
 * Utility helper functions for dynamic, Excel-style rack coordinate and naming conversions.
 */

/**
 * Convert numeric row index (1-based) to Excel-style letters.
 * 1 -> A, 2 -> B, ..., 26 -> Z, 27 -> AA, 28 -> AB, etc.
 * @param {number} colIndex 
 * @returns {string}
 */
export function getExcelColumnName(colIndex) {
  let columnName = '';
  let temp = colIndex;
  while (temp > 0) {
    let modulo = (temp - 1) % 26;
    columnName = String.fromCharCode(65 + modulo) + columnName;
    temp = Math.floor((temp - modulo) / 26);
  }
  return columnName;
}

/**
 * Parse an Excel-style rack code (e.g. "AA12") into row letters and numeric column.
 * @param {string} code 
 * @returns {{ row: string, col: number }}
 */
export function parseRackCode(code) {
  if (!code) return { row: '', col: 0 };
  const match = code.trim().toUpperCase().match(/^([A-Z]+)(\d+)$/);
  if (!match) return { row: code, col: 0 };
  return { row: match[1], col: parseInt(match[2], 10) };
}

/**
 * Maps a flat sequential index to an Excel-style rack code based on the number of columns per row.
 * E.g., for colsPerRow = 4:
 * idx = 0 -> A1, idx = 3 -> A4, idx = 4 -> B1, idx = 104 -> AA1
 * @param {number} idx 
 * @param {number} colsPerRow 
 * @returns {string}
 */
export function indexToRackCode(idx, colsPerRow = 4) {
  const rowIdx = Math.floor(idx / colsPerRow) + 1; // 1-based index for getExcelColumnName
  const colIdx = (idx % colsPerRow) + 1;
  return `${getExcelColumnName(rowIdx)}${colIdx}`;
}

/**
 * Returns the next available rack code that does not exist in the list of existing rack codes.
 * Sequentially searches from index 0 upwards.
 * @param {string[]} existingRackCodes 
 * @param {number} colsPerRow 
 * @returns {string}
 */
export function getNextRackCode(existingRackCodes, colsPerRow = 4) {
  const existingSet = new Set((existingRackCodes || []).map(c => c.trim().toUpperCase()));
  let idx = 0;
  while (true) {
    const code = indexToRackCode(idx, colsPerRow);
    if (!existingSet.has(code)) {
      return code;
    }
    idx++;
  }
}
