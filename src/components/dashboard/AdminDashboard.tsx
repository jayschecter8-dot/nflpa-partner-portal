'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Header from './Header';
import StatCard from './StatCard';
import ChartCard from './ChartCard';
import { formatCurrency, getMonthFromInvoice } from '@/lib/utils';
import * as XLSX from 'xlsx';

interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  isAdmin: boolean;
  isFullAdmin: boolean;
}

interface Partner {
  id: string;
  name: string;
  contractTotal: number;
  isFlexFund: boolean;
  totalSpent?: number;
}

interface Contact {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  isFullAdmin: boolean;
  partnerId: string | null;
  partner?: { name: string } | null;
}

interface Payment {
  id: string;
  partnerId: string;
  partner?: { id: string; name: string };
  playerName: string;
  amount: number;
  totalPlayerAmount: number;
  invoiceCode: string;
  dealType?: string | null;
  dealDetail?: string | null;
  batchName?: string | null;
  dealId?: string | null;
}

interface AdminDashboardProps {
  user: User;
}

export default function AdminDashboard({ user }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [partners, setPartners] = useState<Partner[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [showAddPartner, setShowAddPartner] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [showAddAdmin, setShowAddAdmin] = useState(false);

  // Forms
  const [newPartner, setNewPartner] = useState({ name: '', contractTotal: '', isFlexFund: false });
  const [newContact, setNewContact] = useState({ name: '', email: '', password: '', partnerId: '' });
  const [newAdmin, setNewAdmin] = useState({ name: '', email: '', password: '' });

  // Upload
  const [uploadMessage, setUploadMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Filters
  const [partnerFilter, setPartnerFilter] = useState('all');
  const [playerFilter, setPlayerFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');

  // Partner detail
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);

  // Fetch data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [partnersRes, contactsRes, paymentsRes] = await Promise.all([
        fetch('/api/partners'),
        fetch('/api/contacts'),
        fetch('/api/payments'),
      ]);

      if (partnersRes.ok) setPartners(await partnersRes.json());
      if (contactsRes.ok) setContacts(await contactsRes.json());
      if (paymentsRes.ok) setPayments(await paymentsRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculated values
  const totalSpent = payments.reduce((sum, p) => sum + p.amount, 0);
  const playerGuarantee = 30439528.20;
  const remaining = playerGuarantee - totalSpent;

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
      if (partnerFilter !== 'all' && payment.partnerId !== partnerFilter) return false;
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
  }, [payments, partnerFilter, playerFilter, monthFilter, yearFilter]);

  // Chart data - Monthly spend
  const monthlyChartData = useMemo(() => {
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

  // Chart data - Spend by partner
  const partnerChartData = useMemo(() => {
    return partners
      .map((partner) => {
        const spent = payments
          .filter((p) => p.partnerId === partner.id)
          .reduce((sum, p) => sum + p.amount, 0);
        return { label: partner.name, amount: spent };
      })
      .filter((p) => p.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [partners, payments]);

  // Handlers
  const handleAddPartner = async () => {
    if (!newPartner.name) return;
    try {
      const res = await fetch('/api/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPartner.name,
          contractTotal: newPartner.isFlexFund ? 0 : parseFloat(newPartner.contractTotal) || 0,
          isFlexFund: newPartner.isFlexFund,
        }),
      });
      if (res.ok) {
        setNewPartner({ name: '', contractTotal: '', isFlexFund: false });
        setShowAddPartner(false);
        fetchData();
      }
    } catch (error) {
      console.error('Error adding partner:', error);
    }
  };

  const handleAddContact = async () => {
    if (!newContact.name || !newContact.email || !newContact.password || !newContact.partnerId) return;
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newContact.name,
          email: newContact.email,
          password: newContact.password,
          partnerId: newContact.partnerId,
        }),
      });
      if (res.ok) {
        setNewContact({ name: '', email: '', password: '', partnerId: '' });
        setShowAddContact(false);
        fetchData();
      }
    } catch (error) {
      console.error('Error adding contact:', error);
    }
  };

  const handleAddAdmin = async () => {
    if (!newAdmin.name || !newAdmin.email || !newAdmin.password) return;
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newAdmin.name,
          email: newAdmin.email,
          password: newAdmin.password,
          isAdmin: true,
          isFullAdmin: false,
        }),
      });
      if (res.ok) {
        setNewAdmin({ name: '', email: '', password: '' });
        setShowAddAdmin(false);
        fetchData();
      }
    } catch (error) {
      console.error('Error adding admin:', error);
    }
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadMessage('');

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);

      const newPayments: Omit<Payment, 'id'>[] = [];
      let sheetsProcessed = 0;
      const sheetsWithData: string[] = [];

      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const allData = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1 });

        if (allData.length < 2) continue;

        let headerRowIndex = 0;
        let headerRow = allData[0];
        let headers = headerRow ? headerRow.map((h) => (h ? String(h).toLowerCase().trim() : '')) : [];

        const hasRequiredHeaders = (hdrs: string[]) => {
          if (!hdrs || !Array.isArray(hdrs)) return false;
          const hasCompany = hdrs.some((h) => h && (h.includes('company') || h.includes('partner')));
          const hasPlayer = hdrs.some((h) => h && h.includes('player'));
          const hasAmount = hdrs.some((h) => h && h.includes('amount'));
          return hasCompany && hasPlayer && hasAmount;
        };

        if (!hasRequiredHeaders(headers) && allData.length > 1) {
          headerRowIndex = 1;
          headerRow = allData[1];
          headers = headerRow ? headerRow.map((h) => (h ? String(h).toLowerCase().trim() : '')) : [];
        }

        if (!headerRow || !hasRequiredHeaders(headers)) continue;

        const findColumnIndex = (keywords: string[]) => {
          return headers.findIndex((h) => {
            if (!h || typeof h !== 'string') return false;
            return keywords.some((k) => h.includes(k));
          });
        };

        const partnerIdx = findColumnIndex(['company name', 'company', 'partner']);
        const playerIdx = findColumnIndex(['player name', 'player']);
        const amountIdx = findColumnIndex(['deal invoice amount', 'invoice amount', 'amount']);
        const totalPlayerIdx = findColumnIndex(['total player amount', 'total player']);
        const invoiceIdx = findColumnIndex(['invoice number', 'invoice']);
        const dealTypeIdx = findColumnIndex(['deal type']);
        const dealDetailIdx = findColumnIndex(['deal detail']);
        const batchNameIdx = findColumnIndex(['batch name', 'batch']);
        const dealIdIdx = findColumnIndex(['deal id', 'deal_id']);

        if (partnerIdx === -1 || playerIdx === -1 || amountIdx === -1) continue;

        sheetsProcessed++;
        let sheetPaymentCount = 0;
        let lastCompanyName = '';

        for (let i = headerRowIndex + 1; i < allData.length; i++) {
          const row = allData[i];
          if (!row || row.length === 0) continue;

          const playerName = String(row[playerIdx] || '').trim();
          if (playerName.toLowerCase().includes('total')) continue;

          let partnerName = String(row[partnerIdx] || '').trim();
          if (partnerName) {
            lastCompanyName = partnerName;
          } else {
            partnerName = lastCompanyName;
          }

          const amountRaw = row[amountIdx];
          const totalPlayerRaw = totalPlayerIdx !== -1 ? row[totalPlayerIdx] : null;
          const invoiceCode = invoiceIdx !== -1 ? String(row[invoiceIdx] || '').trim() : '';
          const dealType = dealTypeIdx !== -1 ? String(row[dealTypeIdx] || '').trim() : null;
          const dealDetail = dealDetailIdx !== -1 ? String(row[dealDetailIdx] || '').trim() : null;
          const batchName = batchNameIdx !== -1 ? String(row[batchNameIdx] || '').trim() : null;
          const dealId = dealIdIdx !== -1 ? String(row[dealIdIdx] || '').trim() : null;

          const amount = typeof amountRaw === 'number'
            ? amountRaw
            : parseFloat(String(amountRaw).replace(/[$,]/g, ''));
          const totalPlayerAmount = typeof totalPlayerRaw === 'number'
            ? totalPlayerRaw
            : parseFloat(String(totalPlayerRaw).replace(/[$,]/g, ''));

          const partner = partners.find((p) => {
            const pName = p.name.toLowerCase().trim();
            const searchName = partnerName.toLowerCase().trim();
            if (pName === searchName) return true;
            if (pName.includes(searchName) || searchName.includes(pName)) return true;
            return false;
          });

          if (partner && playerName && !isNaN(amount) && amount > 0) {
            newPayments.push({
              partnerId: partner.id,
              playerName,
              amount,
              totalPlayerAmount: totalPlayerAmount || 0,
              invoiceCode,
              dealType,
              dealDetail,
              batchName,
              dealId,
            });
            sheetPaymentCount++;
          }
        }

        if (sheetPaymentCount > 0) {
          sheetsWithData.push(`${sheetName} (${sheetPaymentCount})`);
        }
      }

      if (newPayments.length > 0) {
        const res = await fetch('/api/payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newPayments),
        });
        if (res.ok) {
          setUploadMessage(
            `Success! Loaded ${newPayments.length} payments from ${sheetsProcessed} sheet(s): ${sheetsWithData.join(', ')}`
          );
          fetchData();
        } else {
          setUploadMessage('Error saving payments to database');
        }
      } else {
        setUploadMessage('No valid payments found. Make sure partner names match.');
      }

      e.target.value = '';
    } catch (err) {
      setUploadMessage('Error reading file: ' + (err as Error).message);
    }

    setIsUploading(false);
  };

  // Clear filters
  const clearFilters = () => {
    setPartnerFilter('all');
    setPlayerFilter('');
    setMonthFilter('all');
    setYearFilter('all');
  };

  // Partner detail data
  const getPartnerDetailData = () => {
    if (!selectedPartnerId) return null;

    const selectedPartner = partners.find((p) => p.id === selectedPartnerId);
    const allPartnerPayments = payments.filter((p) => p.partnerId === selectedPartnerId);

    const availableYears = [
      ...new Set(
        allPartnerPayments
          .map((p) => getMonthFromInvoice(p.invoiceCode).fiscalYear)
          .filter(Boolean)
      ),
    ].sort().reverse();

    const monthOrder = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const availableMonths = [
      ...new Set(
        allPartnerPayments
          .map((p) => getMonthFromInvoice(p.invoiceCode).month)
          .filter((m) => m && m !== 'Unknown')
      ),
    ];
    availableMonths.sort((a, b) => monthOrder.indexOf(a) - monthOrder.indexOf(b));

    const filteredPartnerPayments = allPartnerPayments.filter((payment) => {
      const { month, fiscalYear } = getMonthFromInvoice(payment.invoiceCode);
      if (yearFilter !== 'all' && fiscalYear !== yearFilter) return false;
      if (monthFilter !== 'all' && month !== monthFilter) return false;
      return true;
    });

    const totalSpentAll = allPartnerPayments.reduce((sum, p) => sum + p.amount, 0);
    const uniqueDealIds = new Set(allPartnerPayments.map((p) => p.dealId).filter(Boolean));

    // Chart data
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dataByYearMonth: Record<string, { fiscalYear: string; monthNum: number; month: string; amount: number }> = {};
    allPartnerPayments.forEach((p) => {
      const { fiscalYear, monthNum } = getMonthFromInvoice(p.invoiceCode);
      if (!fiscalYear) return;
      const key = `${fiscalYear}-${monthNum}`;
      if (!dataByYearMonth[key]) {
        dataByYearMonth[key] = { fiscalYear, monthNum, month: monthNames[monthNum - 1], amount: 0 };
      }
      dataByYearMonth[key].amount += p.amount;
    });
    const chartData = Object.values(dataByYearMonth).sort((a, b) => {
      if (a.fiscalYear !== b.fiscalYear) return a.fiscalYear.localeCompare(b.fiscalYear);
      return a.monthNum - b.monthNum;
    });

    return {
      selectedPartner,
      allPartnerPayments,
      filteredPartnerPayments,
      availableYears,
      availableMonths,
      totalSpentAll,
      playerDealsCount: uniqueDealIds.size,
      chartData: chartData.map((d) => ({ label: `${d.month} FY${d.fiscalYear}`, amount: d.amount })),
    };
  };

  const partnerDetail = getPartnerDetailData();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100">
        <Header
          userName={user.name || 'Admin'}
          badge={{ text: user.isFullAdmin ? 'Full Admin' : 'Admin Viewer', type: 'admin' }}
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
        userName={user.name || 'Admin'}
        badge={{ text: user.isFullAdmin ? 'Full Admin' : 'Admin Viewer', type: 'admin' }}
      />

      <div className="flex min-h-[calc(100vh-64px)]">
        {/* Sidebar */}
        <nav className="w-52 bg-white border-r border-slate-200 py-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`nav-button ${activeTab === 'overview' ? 'active' : ''}`}
          >
            Overview
          </button>
          <button
            onClick={() => { setActiveTab('partners'); setSelectedPartnerId(null); }}
            className={`nav-button ${activeTab === 'partners' ? 'active' : ''}`}
          >
            Partners
          </button>
          <button
            onClick={() => setActiveTab('contacts')}
            className={`nav-button ${activeTab === 'contacts' ? 'active' : ''}`}
          >
            Contacts
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`nav-button ${activeTab === 'payments' ? 'active' : ''}`}
          >
            Payments
          </button>
          {user.isFullAdmin && (
            <button
              onClick={() => setActiveTab('upload')}
              className={`nav-button ${activeTab === 'upload' ? 'active' : ''}`}
            >
              Upload Data
            </button>
          )}
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-8 overflow-auto">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="animate-fadeIn">
              <h1 className="text-2xl font-bold text-slate-900 mb-6">Dashboard Overview</h1>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                <StatCard label="36% Player Guarantee" value={formatCurrency(playerGuarantee)} />
                <StatCard label="Total Spent" value={formatCurrency(totalSpent)} valueColor="text-green-600" />
                <StatCard
                  label="Remaining"
                  value={formatCurrency(remaining)}
                  valueColor={remaining > 0 ? 'text-green-600' : 'text-red-600'}
                />
                <StatCard label="Active Partners" value={String(partners.length)} />
              </div>

              <ChartCard title="Monthly Spend (All Partners)" data={monthlyChartData} barColor="#C9243F" />

              {partnerChartData.length > 0 && (
                <ChartCard
                  title="Spend by Partner (To Date)"
                  data={partnerChartData}
                  barColor="#2563eb"
                  layout="vertical"
                  height={Math.max(300, partners.length * 40)}
                />
              )}
            </div>
          )}

          {/* Partners Tab */}
          {activeTab === 'partners' && (
            <div className="animate-fadeIn">
              {selectedPartnerId && partnerDetail ? (
                <div>
                  <button
                    onClick={() => { setSelectedPartnerId(null); setYearFilter('all'); setMonthFilter('all'); }}
                    className="text-slate-500 hover:text-slate-700 mb-4"
                  >
                    ← Back to Partners
                  </button>
                  <h1 className="text-2xl font-bold text-slate-900 mb-2">{partnerDetail.selectedPartner?.name}</h1>
                  {partnerDetail.selectedPartner?.isFlexFund && (
                    <span className="badge badge-purple mb-4 inline-block">Flex Fund</span>
                  )}

                  <div className="grid grid-cols-2 gap-5 mb-8 max-w-md">
                    <StatCard label="Total Spent" value={formatCurrency(partnerDetail.totalSpentAll)} valueColor="text-green-600" />
                    <StatCard label="Player Deals" value={String(partnerDetail.playerDealsCount)} />
                  </div>

                  <ChartCard title="Monthly Spend" data={partnerDetail.chartData} barColor="#C9243F" height={250} />

                  <div className="filters-row">
                    <select
                      value={yearFilter}
                      onChange={(e) => setYearFilter(e.target.value)}
                      className="filter-select"
                    >
                      <option value="all">All Years</option>
                      {partnerDetail.availableYears.map((y) => (
                        <option key={y} value={y}>FY{y}</option>
                      ))}
                    </select>
                    <select
                      value={monthFilter}
                      onChange={(e) => setMonthFilter(e.target.value)}
                      className="filter-select"
                    >
                      <option value="all">All Months</option>
                      {partnerDetail.availableMonths.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    {(yearFilter !== 'all' || monthFilter !== 'all') && (
                      <button
                        onClick={() => { setYearFilter('all'); setMonthFilter('all'); }}
                        className="btn btn-secondary"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Player</th>
                          <th>Amount</th>
                          <th>Invoice</th>
                          <th>Deal Type</th>
                          <th>Month</th>
                        </tr>
                      </thead>
                      <tbody>
                        {partnerDetail.filteredPartnerPayments.map((payment) => {
                          const { month, year } = getMonthFromInvoice(payment.invoiceCode);
                          return (
                            <tr key={payment.id}>
                              <td>{payment.playerName}</td>
                              <td>{formatCurrency(payment.amount)}</td>
                              <td>{payment.invoiceCode}</td>
                              <td>{payment.dealType || '-'}</td>
                              <td>{month} {year}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {partnerDetail.filteredPartnerPayments.length === 0 && (
                      <div className="empty-state">No payments found.</div>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-slate-900">Partners</h1>
                    <button onClick={() => setShowAddPartner(true)} className="btn btn-primary">
                      + Add Partner
                    </button>
                  </div>

                  {showAddPartner && (
                    <div className="card mb-6">
                      <h3 className="font-semibold mb-4">Add Partner</h3>
                      <div className="flex flex-wrap gap-3 items-center">
                        <input
                          type="text"
                          value={newPartner.name}
                          onChange={(e) => setNewPartner({ ...newPartner, name: e.target.value })}
                          className="input w-48"
                          placeholder="Partner name"
                        />
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={newPartner.isFlexFund}
                            onChange={(e) => setNewPartner({ ...newPartner, isFlexFund: e.target.checked, contractTotal: '' })}
                            className="w-4 h-4"
                          />
                          Flex Fund
                        </label>
                        {!newPartner.isFlexFund && (
                          <input
                            type="number"
                            value={newPartner.contractTotal}
                            onChange={(e) => setNewPartner({ ...newPartner, contractTotal: e.target.value })}
                            className="input w-40"
                            placeholder="Contract total"
                          />
                        )}
                        <button onClick={handleAddPartner} className="btn btn-primary">Add</button>
                        <button onClick={() => setShowAddPartner(false)} className="btn btn-secondary">Cancel</button>
                      </div>
                    </div>
                  )}

                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Partner Name</th>
                          <th>Fund Type</th>
                          <th>Total Spent</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...partners].sort((a, b) => a.name.localeCompare(b.name)).map((partner) => (
                          <tr key={partner.id}>
                            <td>
                              <button
                                onClick={() => setSelectedPartnerId(partner.id)}
                                className="text-blue-600 font-semibold hover:underline"
                              >
                                {partner.name}
                              </button>
                            </td>
                            <td>
                              {partner.isFlexFund ? (
                                <span className="badge badge-purple">Flex Fund</span>
                              ) : (
                                formatCurrency(partner.contractTotal)
                              )}
                            </td>
                            <td>{formatCurrency(partner.totalSpent || 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {partners.length === 0 && (
                      <div className="empty-state">No partners yet. Add one to get started.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Contacts Tab */}
          {activeTab === 'contacts' && (
            <div className="animate-fadeIn">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-900">Contacts</h1>
                <div className="flex gap-3">
                  {user.isFullAdmin && (
                    <button onClick={() => setShowAddAdmin(true)} className="btn btn-outline">
                      + Add Admin Viewer
                    </button>
                  )}
                  <button onClick={() => setShowAddContact(true)} className="btn btn-primary">
                    + Add Partner Contact
                  </button>
                </div>
              </div>

              {showAddAdmin && user.isFullAdmin && (
                <div className="card mb-6">
                  <h3 className="font-semibold mb-2">Add Admin Viewer</h3>
                  <p className="text-sm text-slate-500 mb-4">Can view all data but cannot upload.</p>
                  <div className="flex flex-wrap gap-3 items-center">
                    <input
                      type="text"
                      value={newAdmin.name}
                      onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
                      className="input w-40"
                      placeholder="Name"
                    />
                    <input
                      type="email"
                      value={newAdmin.email}
                      onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                      className="input w-48"
                      placeholder="Email"
                    />
                    <input
                      type="text"
                      value={newAdmin.password}
                      onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                      className="input w-40"
                      placeholder="Password"
                    />
                    <button onClick={handleAddAdmin} className="btn btn-primary">Add</button>
                    <button onClick={() => setShowAddAdmin(false)} className="btn btn-secondary">Cancel</button>
                  </div>
                </div>
              )}

              {showAddContact && (
                <div className="card mb-6">
                  <h3 className="font-semibold mb-4">Add Partner Contact</h3>
                  <div className="flex flex-wrap gap-3 items-center">
                    <input
                      type="text"
                      value={newContact.name}
                      onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                      className="input w-40"
                      placeholder="Name"
                    />
                    <input
                      type="email"
                      value={newContact.email}
                      onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                      className="input w-48"
                      placeholder="Email"
                    />
                    <input
                      type="text"
                      value={newContact.password}
                      onChange={(e) => setNewContact({ ...newContact, password: e.target.value })}
                      className="input w-40"
                      placeholder="Password"
                    />
                    <select
                      value={newContact.partnerId}
                      onChange={(e) => setNewContact({ ...newContact, partnerId: e.target.value })}
                      className="input w-48"
                    >
                      <option value="">Select Partner</option>
                      {partners.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <button onClick={handleAddContact} className="btn btn-primary">Add</button>
                    <button onClick={() => setShowAddContact(false)} className="btn btn-secondary">Cancel</button>
                  </div>
                </div>
              )}

              <h2 className="text-lg font-semibold text-slate-900 mb-4">Admin Users</h2>
              <div className="table-wrapper mb-8">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contacts.filter((c) => c.isAdmin).map((contact) => (
                      <tr key={contact.id}>
                        <td>{contact.name}</td>
                        <td>{contact.email}</td>
                        <td>
                          <span className={contact.isFullAdmin ? 'badge badge-primary' : 'badge badge-blue'}>
                            {contact.isFullAdmin ? 'Full Admin' : 'Viewer'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h2 className="text-lg font-semibold text-slate-900 mb-4">Partner Contacts</h2>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Partner</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contacts.filter((c) => !c.isAdmin).map((contact) => (
                      <tr key={contact.id}>
                        <td>{contact.name}</td>
                        <td>{contact.email}</td>
                        <td>{contact.partner?.name || 'Unknown'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {contacts.filter((c) => !c.isAdmin).length === 0 && (
                  <div className="empty-state">No partner contacts yet.</div>
                )}
              </div>
            </div>
          )}

          {/* Payments Tab */}
          {activeTab === 'payments' && (
            <div className="animate-fadeIn">
              <h1 className="text-2xl font-bold text-slate-900 mb-6">All Payments</h1>

              <div className="filters-row">
                <select
                  value={partnerFilter}
                  onChange={(e) => setPartnerFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Partners</option>
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
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
                {(partnerFilter !== 'all' || playerFilter || monthFilter !== 'all' || yearFilter !== 'all') && (
                  <button onClick={clearFilters} className="btn btn-secondary">
                    Clear Filters
                  </button>
                )}
              </div>

              <div className="total-summary">
                <span className="total-label">
                  {(partnerFilter !== 'all' || playerFilter || monthFilter !== 'all' || yearFilter !== 'all')
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
                      <th>Partner</th>
                      <th>Player</th>
                      <th>Amount</th>
                      <th>Total Player Amt</th>
                      <th>Invoice</th>
                      <th>Batch Name</th>
                      <th>Deal Type</th>
                      <th>Month</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map((payment) => {
                      const { month, year } = getMonthFromInvoice(payment.invoiceCode);
                      return (
                        <tr key={payment.id}>
                          <td>{payment.partner?.name || 'Unknown'}</td>
                          <td>{payment.playerName}</td>
                          <td>{formatCurrency(payment.amount)}</td>
                          <td>{formatCurrency(payment.totalPlayerAmount)}</td>
                          <td>{payment.invoiceCode}</td>
                          <td>
                            {payment.batchName || <span className="text-red-600 font-semibold">N/A</span>}
                          </td>
                          <td>{payment.dealType || '-'}</td>
                          <td>{month} {year}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filteredPayments.length === 0 && (
                  <div className="empty-state">No payments found.</div>
                )}
              </div>
            </div>
          )}

          {/* Upload Tab */}
          {activeTab === 'upload' && user.isFullAdmin && (
            <div className="animate-fadeIn">
              <h1 className="text-2xl font-bold text-slate-900 mb-6">Upload Data</h1>
              <div className="card max-w-xl">
                <p className="mb-2">Upload your Excel file (.xlsx) with payment data.</p>
                <p className="text-sm text-slate-500 mb-5">
                  Required columns: Company Name, Player Name, Deal Invoice Amount
                </p>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleExcelUpload}
                  disabled={isUploading}
                  className="text-sm"
                />
                {uploadMessage && (
                  <div className={`mt-4 p-3 rounded-lg text-sm ${
                    uploadMessage.includes('Success')
                      ? 'bg-green-50 text-green-700'
                      : 'bg-red-50 text-red-700'
                  }`}>
                    {uploadMessage}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
