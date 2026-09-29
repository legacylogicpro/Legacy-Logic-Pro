/**
 * Shared Indian Currency and Date Formatting Utilities
 * Standardized across Legacy Logic Pro (No one-off implementations permitted)
 */

/**
 * Formats a number using the Indian Numbering System (lakhs & crores)
 * Examples:
 * 1234 -> ₹1,234.00
 * 123456 -> ₹1,23,456.00
 * 12345678 -> ₹1,23,45,678.00
 * -5000 -> -₹5,000.00 or (₹5,000.00) depending on format
 */
export function formatIndianCurrency(amount: number | null | undefined, options?: { showParenForNegative?: boolean; compact?: boolean }): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '₹0.00';
  }

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  if (options?.compact) {
    if (absAmount >= 10000000) {
      return `${isNegative ? '-' : ''}₹${(absAmount / 10000000).toFixed(2)} Cr`;
    }
    if (absAmount >= 100000) {
      return `${isNegative ? '-' : ''}₹${(absAmount / 100000).toFixed(2)} L`;
    }
    if (absAmount >= 1000) {
      return `${isNegative ? '-' : ''}₹${(absAmount / 1000).toFixed(1)} K`;
    }
  }

  // Format integer part with Indian comma placement
  const fixedStr = absAmount.toFixed(2);
  const [intPart, decPart] = fixedStr.split('.');

  let formattedInt = '';
  if (intPart.length <= 3) {
    formattedInt = intPart;
  } else {
    const lastThree = intPart.substring(intPart.length - 3);
    const otherNumbers = intPart.substring(0, intPart.length - 3);
    const withCommas = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    formattedInt = `${withCommas},${lastThree}`;
  }

  const result = `₹${formattedInt}.${decPart}`;

  if (isNegative) {
    if (options?.showParenForNegative) {
      return `(${result})`;
    }
    return `-${result}`;
  }

  return result;
}

/**
 * Cleanly parse Indian formatted currency strings into numeric values
 * Strips ₹ symbols, commas, and handles parenthesized negatives like "(1,25,000.00)"
 */
export function parseIndianAmount(value: any): number {
  if (typeof value === 'number') {
    return isNaN(value) ? 0 : value;
  }
  if (!value) return 0;

  let str = String(value).trim();
  // Check for NaN or nan
  if (str.toLowerCase() === 'nan' || str.toLowerCase() === 'none' || str.toLowerCase() === 'null') {
    return 0;
  }

  let isNegative = false;
  if (str.startsWith('(') && str.endsWith(')')) {
    isNegative = true;
    str = str.substring(1, str.length - 1);
  } else if (str.startsWith('-')) {
    isNegative = true;
    str = str.substring(1);
  }

  // Strip currency symbols, spaces, commas
  str = str.replace(/[₹\s,]/g, '');
  const parsed = parseFloat(str);
  if (isNaN(parsed)) return 0;
  return isNegative ? -parsed : parsed;
}

/**
 * Formats an ISO date string (YYYY-MM-DD) into Indian standard DD/MM/YYYY
 */
export function formatIndianDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Parses various Indian date formats (DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, YYYY-MM-DD, DD-MMM-YYYY)
 * Normalizes to standard ISO 8601 (YYYY-MM-DD)
 */
export function parseIndianDateToISO(val: any): string {
  if (!val) return '';
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? '' : val.toISOString().split('T')[0];
  }
  const str = String(val).trim();
  if (!str || str.toLowerCase() === 'nan' || str.toLowerCase() === 'none') return '';

  // Standard YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const partsMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (partsMatch) {
    const day = partsMatch[1].padStart(2, '0');
    const month = partsMatch[2].padStart(2, '0');
    const year = partsMatch[3];
    return `${year}-${month}-${day}`;
  }

  // DD-MMM-YYYY (e.g. 15-Aug-2024, 15-AUG-24)
  const monthNames: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
  };
  const mmmMatch = str.match(/^(\d{1,2})[\/\-\.]([a-zA-Z]{3})[\/\-\.](\d{2,4})$/);
  if (mmmMatch) {
    const day = mmmMatch[1].padStart(2, '0');
    const mStr = mmmMatch[2].toLowerCase();
    const month = monthNames[mStr] || '01';
    let year = mmmMatch[3];
    if (year.length === 2) {
      year = `20${year}`;
    }
    return `${year}-${month}-${day}`;
  }

  // Fallback try standard Date
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }

  return '';
}
