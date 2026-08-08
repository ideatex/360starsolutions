"use client";

export interface ExportColumn {
  header: string;
  key: string;
  formatter?: (val: any, row: any) => string | number;
}

export interface SummaryField {
  label: string;
  value: string | number;
}

/**
 * Trigger download of CSV file from array of objects
 */
export function exportToCSV(
  filename: string,
  columns: ExportColumn[],
  data: any[]
) {
  const headers = columns.map((col) => col.header);
  
  const rows = data.map((row) =>
    columns.map((col) => {
      let val = row[col.key];
      if (col.formatter) {
        val = col.formatter(val, row);
      }
      if (val === null || val === undefined) val = '';
      const stringVal = String(val);
      // Escape double quotes by doubling them, wrap in quotes if contains comma, newline, or quote
      if (/[",\n\r]/.test(stringVal)) {
        return `"${stringVal.replace(/"/g, '""')}"`;
      }
      return stringVal;
    })
  );

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  const timestamp = new Date().toISOString().split('T')[0];
  const fullFilename = filename.endsWith('.csv') ? filename : `${filename}_${timestamp}.csv`;
  
  link.setAttribute('href', url);
  link.setAttribute('download', fullFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Trigger clean, printable PDF report view/download from array of objects
 */
export function exportToPDF(
  filename: string,
  title: string,
  subtitle: string,
  columns: ExportColumn[],
  data: any[],
  summaries?: SummaryField[]
) {
  const timestamp = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const tableHeadersHtml = columns
    .map((col) => `<th style="padding: 10px 12px; text-align: left; background-color: #0F172A; color: #FFFFFF; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #334155;">${col.header}</th>`)
    .join('');

  const tableRowsHtml = data
    .map((row, idx) => {
      const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
      const cells = columns
        .map((col) => {
          let val = row[col.key];
          if (col.formatter) {
            val = col.formatter(val, row);
          }
          if (val === null || val === undefined) val = '-';
          return `<td style="padding: 9px 12px; font-size: 11px; color: #1E293B; border-bottom: 1px solid #E2E8F0;">${String(val)}</td>`;
        })
        .join('');
      return `<tr style="background-color: ${bg};">${cells}</tr>`;
    })
    .join('');

  const summaryHtml = summaries && summaries.length > 0
    ? `<div style="display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 24px; padding: 16px; background-color: #F1F5F9; border-radius: 8px; border: 1px solid #CBD5E1;">
        ${summaries
          .map(
            (s) =>
              `<div><span style="font-size: 10px; text-transform: uppercase; color: #64748B; font-weight: bold; display: block;">${s.label}</span><span style="font-size: 16px; font-weight: 800; color: #0F172A;">${s.value}</span></div>`
          )
          .join('')}
       </div>`
    : '';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 15mm;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0F172A;
            margin: 0;
            padding: 20px;
            background: #FFFFFF;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 3px solid #12639A;
            padding-bottom: 16px;
            margin-bottom: 20px;
          }
          .brand {
            font-size: 22px;
            font-weight: 900;
            letter-spacing: -0.5px;
            color: #0F172A;
          }
          .brand span {
            color: #12639A;
          }
          .title {
            font-size: 18px;
            font-weight: 800;
            margin-top: 4px;
            color: #1E293B;
          }
          .subtitle {
            font-size: 12px;
            color: #64748B;
            margin-top: 2px;
          }
          .meta {
            text-align: right;
            font-size: 11px;
            color: #64748B;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }
          .footer {
            margin-top: 30px;
            padding-top: 12px;
            border-top: 1px solid #E2E8F0;
            font-size: 10px;
            color: #94A3B8;
            display: flex;
            justify-content: space-between;
          }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 16px; display: flex; justify-content: flex-end; gap: 10px;">
          <button onclick="window.print()" style="padding: 8px 16px; background-color: #10B981; color: #FFFFFF; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">Print / Save as PDF</button>
          <button onclick="window.close()" style="padding: 8px 16px; background-color: #64748B; color: #FFFFFF; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">Close</button>
        </div>

        <div class="header">
          <div>
            <div class="brand">360 <span>STAR</span> SOLUTIONS</div>
            <div class="title">${title}</div>
            <div class="subtitle">${subtitle}</div>
          </div>
          <div class="meta">
            <div><strong>Generated:</strong> ${timestamp}</div>
            <div><strong>Total Records:</strong> ${data.length}</div>
          </div>
        </div>

        ${summaryHtml}

        <table>
          <thead>
            <tr>${tableHeadersHtml}</tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>

        <div class="footer">
          <div>Confidential - 360 Star Solutions Enterprise Portal</div>
          <div>Page 1 of 1</div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }
}
