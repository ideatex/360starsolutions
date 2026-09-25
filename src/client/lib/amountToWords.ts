/**
 * Converts a numeric amount into standard Indian currency words (Lakhs, Crores, Rupees).
 * Example: 100000 => "One Lakh Rupees Only"
 * Example: 150000 => "One Lakh Fifty Thousand Rupees Only"
 */
export function amountToWords(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return '';
  const num = Math.floor(Number(amount));
  if (isNaN(num) || num <= 0) return '';
  if (num === 0) return 'Zero Rupees Only';

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertTwoDigits(n: number): string {
    if (n < 20) return ones[n];
    const unit = n % 10;
    return tens[Math.floor(n / 10)] + (unit > 0 ? ' ' + ones[unit] : '');
  }

  function convertThreeDigits(n: number): string {
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    let res = '';
    if (hundred > 0) res += ones[hundred] + ' Hundred';
    if (rest > 0) res += (res ? ' ' : '') + convertTwoDigits(rest);
    return res;
  }

  let crore = Math.floor(num / 10000000);
  let remainder = num % 10000000;
  const lakh = Math.floor(remainder / 100000);
  remainder = remainder % 100000;
  const thousand = Math.floor(remainder / 1000);
  remainder = remainder % 1000;
  const hundred = remainder;

  const parts: string[] = [];
  if (crore > 0) {
    parts.push(crore >= 100 ? convertThreeDigits(crore) + ' Crore' : convertTwoDigits(crore) + ' Crore');
  }
  if (lakh > 0) {
    parts.push(convertTwoDigits(lakh) + ' Lakh');
  }
  if (thousand > 0) {
    parts.push(convertTwoDigits(thousand) + ' Thousand');
  }
  if (hundred > 0) {
    parts.push(convertThreeDigits(hundred));
  }

  return parts.filter(Boolean).join(' ') + ' Rupees Only';
}
