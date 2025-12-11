'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Header from './Header';
import StatCard from './StatCard';
import ChartCard from './ChartCard';
import { formatCurrency, getMonthFromInvoice } from '@/lib/utils';

interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  partnerId: string | null;
  partnerName: string | null;
}

interface Payment {
  id: string;
  partnerId: string;
  playerName: string;
  amount: number;
  totalPlayerAmount: number;
  invoiceCode: string;
  dealType?: string | null;
}

interface PartnerDashboardProps {
  user: User;
}

export default function PartnerDashboard({ user }: PartnerDashboardProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [monthFilter, setMonthFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [playerFilter, setPlayerFilter] = useState('');

  // Fetch payments
  const fetchPayments = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/payments');
      if (res.ok) {
        setPayments(await res.json());
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // Total spent
  const totalSpent = payments.reduce((sum, p) => sum + p.amount, 0);

  // Available months and years for filters
  const availableMonthsAndYears = useMemo(() => {
    const months = new Set<string>();
    const years = new Set<string>();
    payments.forEach((p) => {
      const { month, fiscalYear } = getMonthFromInvoice(p.invoiceCode);
      if (month && month !== 'Unknown') months.add(month);
      if (fiscalYear) years.add(fiscalYear);
    });
    const monthOrder = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    return {
      months: monthOrder.filter((m) => months.has(m)),
      years: [...years].sort(),
    };
  }, [payments]);

  // Filtered payments
  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      if (playerFilter && !payment.playerName.toLowerCase().includes(playerFilter.toLowerCase())) return false;
      if (monthFilter !== 'all') {
        const { month } = getMonthFromInvoice(payment.invoiceCode);
        if (month !== monthFilter) return false;
      }
      if (yearFilter !== 'all') {
        const { fiscalYear } = getMonthFromInvoice(payment.invoiceCode);
        if (fiscalYear !== yearFilter) return false;
      }
      return true;
    });
  }, [payments, playerFilter, monthFilter, yearFilter]);

  // Chart data
  const chartData = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dataByYearMonth: Record<string, { key: string; label: string; amount: number }> = {};

    payments.forEach((p) => {
      const { fiscalYear, monthNum } = getMonthFromInvoice(p.invoiceCode);
      if (!fiscalYear || !monthNum) return;
      const key = `${fiscalYear}-${String(monthNum).padStart(2, '0')}`;
      if (!dataByYearMonth[key]) {
        dataByYearMonth[key] = {
          key,
          label: `${monthNames[monthNum - 1]} FY${fiscalYear}`,
          amount: 0,
        };
      }
      dataByYearMonth[key].amount += p.amount;
    });

    return Object.values(dataByYearMonth).sort((a, b) => a.key.localeCompare(b.key));
  }, [payments]);

  // Clear filters
  const clearFilters = () => {
    setPlayerFilter('');
    setMonthFilter('all');
    setYearFilter('all');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100">
        <Header
          userName={user.name || 'Partner'}
          badge={{ text: user.partnerName || 'Partner', type: 'partner' }}
        />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="spinner w-8 h-8"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <Header
        userName={user.name || 'Partner'}
        badge={{ text: user.partnerName || 'Partner', type: 'partner' }}
      />

      <main className="max-w-6xl mx-auto p-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Your Dashboard</h1>

        <div className="max-w-xs mb-8">
          <StatCard label="Total Spent" value={formatCurrency(totalSpent)} valueColor="text-green-600" />
        </div>

        {/* Monthly Spend Chart */}
        <ChartCard title="Monthly Spend" data={chartData} barColor="#059669" height={280} />

        <h2 className="text-lg font-semibold text-slate-900 mb-4">Payment History</h2>

        {/* Filters */}
        <div className="filters-row">
          <input
            type="text"
            value={playerFilter}
            onChange={(e) => setPlayerFilter(e.target.value)}
            className="filter-input"
            placeholder="Search player..."
          />
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Months</option>
            {availableMonthsAndYears.months.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Years</option>
            {availableMonthsAndYears.years.map((y) => (
              <option key={y} value={y}>FY{y}</option>
            ))}
          </select>
          {(playerFilter || monthFilter !== 'all' || yearFilter !== 'all') && (
            <button onClick={clearFilters} className="btn btn-secondary">
              Clear Filters
            </button>
          )}
        </div>

        {/* Filter Summary */}
        <div className="total-summary">
          <span className="total-label">
            {(playerFilter || monthFilter !== 'all' || yearFilter !== 'all')
              ? `Filtered Total (${filteredPayments.length} payments):`
              : `Total (${filteredPayments.length} payments):`}
          </span>
          <span className="total-value">
            {formatCurrency(filteredPayments.reduce((sum, p) => sum + p.amount, 0))}
          </span>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Player</th>
                <th>Deal Invoice Amount</th>
                <th>Total Player Amount</th>
                <th>Month</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((payment) => {
                const { month, year } = getMonthFromInvoice(payment.invoiceCode);
                return (
                  <tr key={payment.id}>
                    <td>{payment.playerName}</td>
                    <td>{formatCurrency(payment.amount)}</td>
                    <td>{formatCurrency(payment.totalPlayerAmount)}</td>
                    <td>{month} {year}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredPayments.length === 0 && (
            <div className="empty-state">
              {payments.length === 0 ? 'No payments found.' : 'No payments match the selected filters.'}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
