export function convertToCSV(data: any[]): string {
  if (data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map(row => 
    headers.map(header => {
      let val = row[header];
      if (val instanceof Date) {
        return val.toISOString();
      }
      if (typeof val === 'object' && val !== null) {
        val = JSON.stringify(val);
      }
      const strVal = String(val ?? '');
      return `"${strVal.replace(/"/g, '""')}"`;
    }).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}
