// Format currency with cents
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Parse invoice code for month information
export function getMonthFromInvoice(invoiceCode: string): {
  month: string;
  year: string;
  monthNum: number;
  fiscalYear: string;
} {
  const monthMap: Record<string, { month: string; monthNum: number }> = {
    JAN: { month: 'January', monthNum: 1 },
    FEB: { month: 'February', monthNum: 2 },
    MAR: { month: 'March', monthNum: 3 },
    APR: { month: 'April', monthNum: 4 },
    MAY: { month: 'May', monthNum: 5 },
    JUN: { month: 'June', monthNum: 6 },
    JUL: { month: 'July', monthNum: 7 },
    AUG: { month: 'August', monthNum: 8 },
    SEP: { month: 'September', monthNum: 9 },
    OCT: { month: 'October', monthNum: 10 },
    NOV: { month: 'November', monthNum: 11 },
    DEC: { month: 'December', monthNum: 12 },
  };

  const parts = invoiceCode.split('-');
  if (parts.length >= 3) {
    const fiscalYear = parts[0];
    const monthCode = parts[parts.length - 1].toUpperCase();
    const monthInfo = monthMap[monthCode];
    if (monthInfo) {
      return {
        month: monthInfo.month,
        year: `FY${fiscalYear}`,
        monthNum: monthInfo.monthNum,
        fiscalYear: fiscalYear,
      };
    }
  }
  return { month: 'Unknown', year: '', monthNum: 0, fiscalYear: '' };
}

// Class names utility
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
