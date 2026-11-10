/** Eksport CSV dla Excela (separator „;”, BOM UTF-8). */

type Cell = string | number | null | undefined;

/**
 * Wartości zaczynające się od = + - @ (albo tabulatora/CR) arkusz potraktowałby jak formułę.
 * Poprzedzamy je apostrofem – ochrona przed wstrzyknięciem formuł (CSV injection).
 */
export function csvCell(value: Cell): string {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(header: string[], rows: Cell[][]): string {
  const lines = [header, ...rows].map((row) => row.map(csvCell).join(";"));
  return `﻿${lines.join("\r\n")}\r\n`;
}
