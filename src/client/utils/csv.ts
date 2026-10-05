/**
 * Safe CSV Exporter utility with CSV injection prevention (D.E.F.E.N.S.E)
 * Prevents Excel formula execution (=, +, -, @) and properly escapes double quotes.
 */
export function exportToCsv(
  filename: string,
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][]
): void {
  const sanitizeCell = (val: string | number | boolean | null | undefined): string => {
    if (val === null || val === undefined) return '""';
    let str = String(val);

    // CSV Injection sanitization:
    // If value begins with =, +, -, @, \t, or \r, prefix with single quote (')
    if (/^[=+\-@\t\r]/.test(str)) {
      str = `'${str}`;
    }

    // Escape double quotes by doubling them (" -> "")
    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
  };

  const headerRow = headers.map(sanitizeCell).join(',');
  const dataRows = rows.map((row) => row.map(sanitizeCell).join(','));

  // UTF-8 BOM (\uFEFF) ensures Excel opens Indonesian characters and emojis without corrupting
  const csvContent = '\uFEFF' + [headerRow, ...dataRows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
