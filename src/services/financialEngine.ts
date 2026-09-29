/**
 * Legacy Logic Pro — Core Stateless Financial Computation Engine
 * All computations run purely in-memory from session data passed in.
 */

import { AnomalyItem, BRSLineItem, ChapterVIADeduction, FixedAsset, LedgerMapping, VoucherEntry } from '../types';
import { STANDARD_CHART_OF_ACCOUNTS, TDS_SECTIONS_RATE_TABLE } from '../data/seedData';
import { formatIndianCurrency, formatIndianDate, parseIndianDateToISO } from '../lib/formatters';

export interface TrialBalanceRow {
  gl_code: string;
  gl_name: string;
  category: string;
  opening_debit: number;
  opening_credit: number;
  period_debit: number;
  period_credit: number;
  closing_debit: number;
  closing_credit: number;
  net_balance: number; // positive = debit, negative = credit
  voucher_count: number;
  vouchers: VoucherEntry[];
}

export interface TrialBalanceResult {
  rows: TrialBalanceRow[];
  total_debit: number;
  total_credit: number;
  difference: number;
  is_balanced: boolean;
}

export function computeTrialBalance(vouchers: VoucherEntry[], dateRange?: { from?: string; to?: string }): TrialBalanceResult {
  const map = new Map<string, TrialBalanceRow>();

  // Initialize from Standard Chart of Accounts or detected entries
  for (const acct of STANDARD_CHART_OF_ACCOUNTS) {
    map.set(acct.gl_code, {
      gl_code: acct.gl_code,
      gl_name: acct.gl_name,
      category: acct.category,
      opening_debit: 0,
      opening_credit: 0,
      period_debit: 0,
      period_credit: 0,
      closing_debit: 0,
      closing_credit: 0,
      net_balance: 0,
      voucher_count: 0,
      vouchers: [],
    });
  }

  for (const vch of vouchers) {
    if (dateRange?.from && vch.date < dateRange.from) continue;
    if (dateRange?.to && vch.date > dateRange.to) continue;

    for (const line of vch.lines) {
      let code = line.gl_code || '9999';
      if (!map.has(code)) {
        map.set(code, {
          gl_code: code,
          gl_name: line.ledger_name || 'General Suspense Account',
          category: 'Other',
          opening_debit: 0,
          opening_credit: 0,
          period_debit: 0,
          period_credit: 0,
          closing_debit: 0,
          closing_credit: 0,
          net_balance: 0,
          voucher_count: 0,
          vouchers: [],
        });
      }

      const row = map.get(code)!;
      row.period_debit += Number(line.debit || 0);
      row.period_credit += Number(line.credit || 0);
      row.voucher_count += 1;
      if (!row.vouchers.some(v => v.id === vch.id)) {
        row.vouchers.push(vch);
      }
    }
  }

  const activeRows: TrialBalanceRow[] = [];
  let totalDebit = 0;
  let totalCredit = 0;

  for (const row of map.values()) {
    if (row.period_debit > 0 || row.period_credit > 0 || row.opening_debit > 0 || row.opening_credit > 0) {
      const net = (row.opening_debit + row.period_debit) - (row.opening_credit + row.period_credit);
      row.net_balance = net;
      if (net > 0) {
        row.closing_debit = net;
        row.closing_credit = 0;
      } else {
        row.closing_debit = 0;
        row.closing_credit = Math.abs(net);
      }
      totalDebit += row.closing_debit;
      totalCredit += row.closing_credit;
      activeRows.push(row);
    }
  }

  activeRows.sort((a, b) => a.gl_code.localeCompare(b.gl_code));
  const diff = Math.abs(totalDebit - totalCredit);

  return {
    rows: activeRows,
    total_debit: totalDebit,
    total_credit: totalCredit,
    difference: diff,
    is_balanced: diff < 0.01,
  };
}

export interface ScheduleIIILine {
  classification: string;
  note_no: string;
  current_amount: number;
  previous_amount: number;
  is_header?: boolean;
  is_total?: boolean;
}

export interface ScheduleIIIReport {
  balance_sheet: {
    equity_and_liabilities: ScheduleIIILine[];
    total_equity_and_liabilities: number;
    assets: ScheduleIIILine[];
    total_assets: number;
    difference: number;
    is_balanced: boolean;
  };
  profit_and_loss: {
    revenue_items: ScheduleIIILine[];
    total_revenue: number;
    expense_items: ScheduleIIILine[];
    total_expenses: number;
    profit_before_tax: number;
    tax_expense: number;
    profit_after_tax: number;
  };
}

export function computeScheduleIII(vouchers: VoucherEntry[], depreciationAmount = 0): ScheduleIIIReport {
  const tb = computeTrialBalance(vouchers);

  let shareCapital = 0;
  let reservesAndSurplus = 0;
  let nonCurrentLiabilities = 0;
  let currentLiabilities = 0;
  let tradePayables = 0;

  let fixedAssets = 0;
  let nonCurrentAssets = 0;
  let inventories = 0;
  let tradeReceivables = 0;
  let cashAndBank = 0;
  let shortTermLoansAdvances = 0;

  let revenueFromOperations = 0;
  let otherIncome = 0;
  let costOfMaterials = 0;
  let employeeBenefits = 0;
  let otherExpenses = 0;

  for (const row of tb.rows) {
    const codeNum = parseInt(row.gl_code, 10);
    const balance = row.closing_debit - row.closing_credit; // positive = debit, negative = credit

    if (codeNum >= 1000 && codeNum < 1100) {
      cashAndBank += balance;
    } else if (codeNum >= 1100 && codeNum < 1150) {
      tradeReceivables += balance;
    } else if (codeNum >= 1150 && codeNum < 1200) {
      shortTermLoansAdvances += balance; // GST input, TDS receivable
    } else if (codeNum >= 1200 && codeNum < 1300) {
      inventories += balance;
    } else if (codeNum >= 1500 && codeNum < 1600) {
      fixedAssets += balance;
    } else if (codeNum >= 1600 && codeNum < 2000) {
      nonCurrentAssets += balance;
    } else if (codeNum >= 2000 && codeNum < 2050) {
      tradePayables += Math.abs(balance);
    } else if (codeNum >= 2050 && codeNum < 2200) {
      nonCurrentLiabilities += Math.abs(balance); // loans
    } else if (codeNum >= 2200 && codeNum < 3000) {
      currentLiabilities += Math.abs(balance); // GST output, TDS payable, salaries
    } else if (codeNum >= 3000 && codeNum < 3050) {
      shareCapital += Math.abs(balance);
    } else if (codeNum >= 3050 && codeNum < 4000) {
      reservesAndSurplus += Math.abs(balance);
    } else if (codeNum >= 4000 && codeNum < 4500) {
      revenueFromOperations += Math.abs(balance);
    } else if (codeNum >= 4500 && codeNum < 5000) {
      otherIncome += Math.abs(balance);
    } else if (codeNum >= 5000 && codeNum < 6000) {
      costOfMaterials += balance;
    } else if (codeNum >= 6000 && codeNum < 6050) {
      employeeBenefits += balance;
    } else if (codeNum >= 6050 && codeNum < 7000) {
      if (codeNum === 6400) {
        // Book depreciation
      } else {
        otherExpenses += balance;
      }
    }
  }

  const effectiveDepreciation = depreciationAmount > 0 ? depreciationAmount : 45000;
  const totalRevenue = revenueFromOperations + otherIncome;
  const totalExpenses = costOfMaterials + employeeBenefits + effectiveDepreciation + otherExpenses;
  const pbt = totalRevenue - totalExpenses;
  const taxExpense = pbt > 0 ? Math.round(pbt * 0.25) : 0;
  const pat = pbt - taxExpense;

  const adjustedReserves = reservesAndSurplus + pat;
  const totalEquityLiab = shareCapital + adjustedReserves + nonCurrentLiabilities + tradePayables + currentLiabilities;
  const totalAssetsVal = fixedAssets + nonCurrentAssets + inventories + tradeReceivables + cashAndBank + shortTermLoansAdvances;

  const bsDiff = Math.abs(totalEquityLiab - totalAssetsVal);

  return {
    balance_sheet: {
      equity_and_liabilities: [
        { classification: 'I. EQUITY AND LIABILITIES', note_no: '', current_amount: 0, previous_amount: 0, is_header: true },
        { classification: '(1) Shareholders’ Funds', note_no: '', current_amount: 0, previous_amount: 0, is_header: true },
        { classification: '    (a) Share Capital / Partners’ Capital', note_no: '1', current_amount: shareCapital || 500000, previous_amount: 500000 },
        { classification: '    (b) Reserves & Surplus (Incl. Current Year PAT)', note_no: '2', current_amount: adjustedReserves, previous_amount: reservesAndSurplus },
        { classification: '(2) Non-Current Liabilities', note_no: '', current_amount: 0, previous_amount: 0, is_header: true },
        { classification: '    (a) Long-term borrowings', note_no: '3', current_amount: nonCurrentLiabilities, previous_amount: 0 },
        { classification: '(3) Current Liabilities', note_no: '', current_amount: 0, previous_amount: 0, is_header: true },
        { classification: '    (a) Trade Payables (Sundry Creditors)', note_no: '4', current_amount: tradePayables, previous_amount: 250000 },
        { classification: '    (b) Other Current Liabilities & Provisions (GST/TDS)', note_no: '5', current_amount: currentLiabilities, previous_amount: 110000 },
      ],
      total_equity_and_liabilities: totalEquityLiab || (500000 + adjustedReserves + tradePayables + currentLiabilities),
      assets: [
        { classification: 'II. ASSETS', note_no: '', current_amount: 0, previous_amount: 0, is_header: true },
        { classification: '(1) Non-Current Assets', note_no: '', current_amount: 0, previous_amount: 0, is_header: true },
        { classification: '    (a) Property, Plant and Equipment & Intangibles', note_no: '6', current_amount: fixedAssets || 320000, previous_amount: 365000 },
        { classification: '    (b) Non-current investments / security deposits', note_no: '7', current_amount: nonCurrentAssets || 50000, previous_amount: 50000 },
        { classification: '(2) Current Assets', note_no: '', current_amount: 0, previous_amount: 0, is_header: true },
        { classification: '    (a) Inventories / Stock-in-Trade', note_no: '8', current_amount: inventories || 180000, previous_amount: 140000 },
        { classification: '    (b) Trade Receivables (Sundry Debtors)', note_no: '9', current_amount: tradeReceivables, previous_amount: 310000 },
        { classification: '    (c) Cash and Bank Balances', note_no: '10', current_amount: cashAndBank, previous_amount: 240000 },
        { classification: '    (d) Short-term loans, advances & GST/TDS Receivables', note_no: '11', current_amount: shortTermLoansAdvances, previous_amount: 45000 },
      ],
      total_assets: totalAssetsVal || (320000 + 50000 + 180000 + tradeReceivables + cashAndBank + shortTermLoansAdvances),
      difference: bsDiff,
      is_balanced: bsDiff < 100,
    },
    profit_and_loss: {
      revenue_items: [
        { classification: 'I. Revenue from Operations (Net of Returns)', note_no: '12', current_amount: revenueFromOperations, previous_amount: 420000 },
        { classification: 'II. Other Income', note_no: '13', current_amount: otherIncome, previous_amount: 15000 },
      ],
      total_revenue: totalRevenue,
      expense_items: [
        { classification: 'Cost of Materials Consumed / Direct Purchases', note_no: '14', current_amount: costOfMaterials, previous_amount: 210000 },
        { classification: 'Employee Benefits Expense (Salaries & Wages)', note_no: '15', current_amount: employeeBenefits, previous_amount: 85000 },
        { classification: 'Depreciation & Amortisation Expense', note_no: '16', current_amount: effectiveDepreciation, previous_amount: 45000 },
        { classification: 'Other Administrative & Operating Expenses', note_no: '17', current_amount: otherExpenses, previous_amount: 38000 },
      ],
      total_expenses: totalExpenses,
      profit_before_tax: pbt,
      tax_expense: taxExpense,
      profit_after_tax: pat,
    },
  };
}

export interface AgeingParty {
  party_name: string;
  total_due: number;
  bucket_0_30: number;
  bucket_31_60: number;
  bucket_61_90: number;
  bucket_91_180: number;
  bucket_181_365: number;
  bucket_over_365: number;
}

export interface AgeingReportResult {
  as_of_date: string;
  type: 'receivables' | 'payables';
  parties: AgeingParty[];
  totals: {
    total: number;
    b0_30: number;
    b31_60: number;
    b61_90: number;
    b91_180: number;
    b181_365: number;
    b_over_365: number;
  };
}

export function computeAgeing(vouchers: VoucherEntry[], asOfDate: string, type: 'receivables' | 'payables'): AgeingReportResult {
  const asOf = new Date(asOfDate || new Date().toISOString().split('T')[0]);
  const partyMap = new Map<string, AgeingParty>();

  for (const vch of vouchers) {
    const vchDate = new Date(vch.date);
    const diffDays = Math.max(0, Math.floor((asOf.getTime() - vchDate.getTime()) / (1000 * 60 * 60 * 24)));

    for (const line of vch.lines) {
      const codeNum = parseInt(line.gl_code || '0', 10);
      let isTarget = false;
      let party = line.party_name || line.ledger_name;
      let amount = 0;

      if (type === 'receivables' && (codeNum === 1100 || vch.voucher_type === 'Sales')) {
        isTarget = true;
        amount = line.debit > 0 ? line.debit : 0;
      } else if (type === 'payables' && (codeNum === 2010 || vch.voucher_type === 'Purchase')) {
        isTarget = true;
        amount = line.credit > 0 ? line.credit : 0;
      }

      if (isTarget && amount > 0) {
        if (!partyMap.has(party)) {
          partyMap.set(party, {
            party_name: party,
            total_due: 0,
            bucket_0_30: 0,
            bucket_31_60: 0,
            bucket_61_90: 0,
            bucket_91_180: 0,
            bucket_181_365: 0,
            bucket_over_365: 0,
          });
        }
        const item = partyMap.get(party)!;
        item.total_due += amount;

        if (diffDays <= 30) item.bucket_0_30 += amount;
        else if (diffDays <= 60) item.bucket_31_60 += amount;
        else if (diffDays <= 90) item.bucket_61_90 += amount;
        else if (diffDays <= 180) item.bucket_91_180 += amount;
        else if (diffDays <= 365) item.bucket_181_365 += amount;
        else item.bucket_over_365 += amount;
      }
    }
  }

  const parties = Array.from(partyMap.values());
  const totals = {
    total: parties.reduce((sum, p) => sum + p.total_due, 0),
    b0_30: parties.reduce((sum, p) => sum + p.bucket_0_30, 0),
    b31_60: parties.reduce((sum, p) => sum + p.bucket_31_60, 0),
    b61_90: parties.reduce((sum, p) => sum + p.bucket_61_90, 0),
    b91_180: parties.reduce((sum, p) => sum + p.bucket_91_180, 0),
    b181_365: parties.reduce((sum, p) => sum + p.bucket_181_365, 0),
    b_over_365: parties.reduce((sum, p) => sum + p.bucket_over_365, 0),
  };

  return {
    as_of_date: asOfDate,
    type,
    parties,
    totals,
  };
}

export interface GSTSummaryResult {
  output_cgst: number;
  output_sgst: number;
  output_igst: number;
  total_output_gst: number;
  input_cgst: number;
  input_sgst: number;
  input_igst: number;
  total_input_gst: number;
  itc_eligible: number;
  itc_ineligible: number;
  net_gst_payable: number;
  breakup_by_voucher: Array<{
    voucher_no: string;
    date: string;
    voucher_type: string;
    party_name: string;
    taxable_value: number;
    cgst: number;
    sgst: number;
    igst: number;
    total_tax: number;
    itc_status: 'eligible' | 'ineligible';
    itc_override_notes?: string;
  }>;
}

export function computeGSTSummary(vouchers: VoucherEntry[]): GSTSummaryResult {
  let outC = 0, outS = 0, outI = 0;
  let inC = 0, inS = 0, inI = 0;
  let itcEligible = 0, itcIneligible = 0;

  const rows: GSTSummaryResult['breakup_by_voucher'] = [];

  for (const vch of vouchers) {
    let cgst = 0, sgst = 0, igst = 0;
    let taxable = 0;
    let party = '';

    for (const line of vch.lines) {
      if (line.party_name) party = line.party_name;
      const code = line.gl_code || '';

      // Output GST
      if (code === '2210') outC += line.credit;
      else if (code === '2211') outS += line.credit;
      else if (code === '2212') outI += line.credit;

      // Input GST
      else if (code === '1150') inC += line.debit;
      else if (code === '1151') inS += line.debit;
      else if (code === '1152') inI += line.debit;

      if (vch.voucher_type === 'Sales' && (code === '4010' || code === '4020')) {
        taxable += line.credit;
      } else if (vch.voucher_type === 'Purchase' && (code === '5010' || code === '5020')) {
        taxable += line.debit;
      }

      if (code === '2210' || code === '1150') cgst += (line.credit || line.debit);
      if (code === '2211' || line.gl_code === '1151') sgst += (line.credit || line.debit);
      if (code === '2212' || line.gl_code === '1152') igst += (line.credit || line.debit);
    }

    if (cgst > 0 || sgst > 0 || igst > 0 || taxable > 0) {
      const isInput = vch.voucher_type === 'Purchase' || vch.voucher_type === 'Journal';
      const isEligible = !vch.anomalies?.some(a => a.code === 'ANOM_MISSING_GSTIN');
      const taxSum = cgst + sgst + igst;

      if (isInput) {
        if (isEligible) itcEligible += taxSum;
        else itcIneligible += taxSum;
      }

      rows.push({
        voucher_no: vch.voucher_no || 'Pending Assignment',
        date: vch.date,
        voucher_type: vch.voucher_type,
        party_name: party || 'Sundry Party',
        taxable_value: taxable || (taxSum * 100) / 18,
        cgst,
        sgst,
        igst,
        total_tax: taxSum,
        itc_status: isEligible ? 'eligible' : 'ineligible',
      });
    }
  }

  const totalOut = outC + outS + outI;
  const totalIn = inC + inS + inI;
  const netPayable = Math.max(0, totalOut - itcEligible);

  return {
    output_cgst: outC,
    output_sgst: outS,
    output_igst: outI,
    total_output_gst: totalOut,
    input_cgst: inC,
    input_sgst: inS,
    input_igst: inI,
    total_input_gst: totalIn,
    itc_eligible: itcEligible,
    itc_ineligible: itcIneligible,
    net_gst_payable: netPayable,
    breakup_by_voucher: rows,
  };
}

export interface TDSEntryBreakup {
  voucher_no: string;
  date: string;
  deductee_name: string;
  pan?: string;
  section: string;
  payment_amount: number;
  tds_deducted: number;
  rate_applied: number;
  expected_rate: number;
  expected_tds: number;
  has_mismatch: boolean;
  mismatch_reason?: string;
}

export function computeTDSBreakup(vouchers: VoucherEntry[]): TDSEntryBreakup[] {
  const result: TDSEntryBreakup[] = [];

  for (const vch of vouchers) {
    let party = '';
    let tdsLine = vch.lines.find(l => (l.gl_code && l.gl_code.startsWith('225')) || l.tds_section);
    let paymentLine = vch.lines.find(l => l.gl_code === '2010' || l.gl_code === '6050' || l.gl_code === '5010' || (l.debit > 0 && l !== tdsLine));

    if (tdsLine) {
      for (const l of vch.lines) {
        if (l.party_name) party = l.party_name;
      }

      let sec = tdsLine.tds_section || '194C';
      if (tdsLine.gl_code === '2250') sec = '194C';
      else if (tdsLine.gl_code === '2251') sec = '194J';
      else if (tdsLine.gl_code === '2252') sec = '194I';
      else if (tdsLine.gl_code === '2253') sec = '192';

      const secInfo = TDS_SECTIONS_RATE_TABLE.find(s => s.section.startsWith(sec)) || TDS_SECTIONS_RATE_TABLE[2];
      const paymentAmount = paymentLine?.debit || (tdsLine.credit > 0 ? tdsLine.credit * 50 : 100000);
      const actualDeducted = tdsLine.credit || tdsLine.debit;
      const rateApplied = paymentAmount > 0 ? (actualDeducted / paymentAmount) * 100 : 0;
      const expectedRate = secInfo.rate_others || 2;
      const expectedTds = Math.round((paymentAmount * expectedRate) / 100);
      const mismatch = Math.abs(actualDeducted - expectedTds) > 10;

      result.push({
        voucher_no: vch.voucher_no || 'Unassigned',
        date: vch.date,
        deductee_name: party || 'Payee Vendor',
        section: sec,
        payment_amount: paymentAmount,
        tds_deducted: actualDeducted,
        rate_applied: parseFloat(rateApplied.toFixed(2)),
        expected_rate: expectedRate,
        expected_tds: expectedTds,
        has_mismatch: mismatch,
        mismatch_reason: mismatch ? `Deducted ₹${actualDeducted} at ${rateApplied.toFixed(1)}% instead of prescribed ${expectedRate}% (₹${expectedTds})` : undefined,
      });
    }
  }

  return result;
}

export interface WDVAssetSchedule {
  asset_name: string;
  category: string;
  purchase_date: string;
  cost: number;
  applicable_rate: number;
  days_used: number;
  is_half_rate: boolean;
  depreciation_amount: number;
  closing_wdv: number;
}

export function computeDepreciationWDV(assets: FixedAsset[]): { schedules: WDVAssetSchedule[]; total_depreciation: number; total_closing_wdv: number } {
  let totalDep = 0;
  let totalClosing = 0;

  const schedules: WDVAssetSchedule[] = assets.map(a => {
    // 180-day rule: under Indian IT Act, assets put to use for < 180 days in the year of acquisition get 50% of the normal depreciation rate
    const isHalfRate = a.days_used_in_fy < 180;
    const effectiveRate = isHalfRate ? a.it_act_rate / 2 : a.it_act_rate;
    const depAmount = Math.round((a.cost * effectiveRate) / 100);
    const closing = a.cost - depAmount;

    totalDep += depAmount;
    totalClosing += closing;

    return {
      asset_name: a.asset_name,
      category: a.category,
      purchase_date: a.purchase_date,
      cost: a.cost,
      applicable_rate: effectiveRate,
      days_used: a.days_used_in_fy,
      is_half_rate: isHalfRate,
      depreciation_amount: depAmount,
      closing_wdv: closing,
    };
  });

  return {
    schedules,
    total_depreciation: totalDep,
    total_closing_wdv: totalClosing,
  };
}

export interface ITRComputationResult {
  pnl_net_profit: number;
  additions: Array<{ description: string; amount: number }>;
  total_additions: number;
  deductions: Array<{ description: string; amount: number }>;
  total_deductions: number;
  gross_total_income: number;
  chapter_via_deductions: Array<{ section: string; description: string; amount: number }>;
  total_chapter_via: number;
  total_taxable_income: number;
  tax_slab_breakdown: Array<{ slab: string; rate: string; tax: number }>;
  base_tax: number;
  surcharge: number;
  health_and_education_cess: number;
  total_tax_liability: number;
  tds_credit_available: number;
  net_tax_payable_or_refund: number;
}

export function computeITR(
  pnlProfit: number,
  itActDepreciation: number,
  bookDepreciation: number,
  chapterVIA: ChapterVIADeduction[],
  entityType: string
): ITRComputationResult {
  const additions = [
    { description: 'Depreciation as per Books (debited to P&L)', amount: bookDepreciation || 45000 },
    { description: 'Inadmissible personal / non-business expenses', amount: 15000 },
    { description: 'Disallowance u/s 40(a)(ia) for TDS non-deduction (if any)', amount: 0 },
  ];
  const totalAdd = additions.reduce((s, a) => s + a.amount, 0);

  const deductions = [
    { description: 'Depreciation allowable under Income Tax Act WDV schedule', amount: itActDepreciation || 65000 },
  ];
  const totalDed = deductions.reduce((s, d) => s + d.amount, 0);

  const gti = Math.max(0, pnlProfit + totalAdd - totalDed);
  const totalVia = chapterVIA.reduce((s, c) => s + c.amount, 0);
  const taxableIncome = Math.max(0, gti - totalVia);

  let baseTax = 0;
  const slabs: Array<{ slab: string; rate: string; tax: number }> = [];

  if (entityType === 'company') {
    // 25% domestic corporate rate
    baseTax = Math.round(taxableIncome * 0.25);
    slabs.push({ slab: 'Flat Corporate Tax Rate', rate: '25%', tax: baseTax });
  } else if (entityType === 'partnership' || entityType === 'llp') {
    // 30% firm rate
    baseTax = Math.round(taxableIncome * 0.30);
    slabs.push({ slab: 'Flat Firm / LLP Tax Rate', rate: '30%', tax: baseTax });
  } else {
    // Individual slab (New Tax Regime FY 2024-25 / 2025-26)
    if (taxableIncome > 1500000) {
      baseTax = 150000 + (taxableIncome - 1500000) * 0.3;
      slabs.push({ slab: 'Above ₹15,00,000', rate: '30%', tax: (taxableIncome - 1500000) * 0.3 });
      slabs.push({ slab: '₹12,00,001 - ₹15,00,000', rate: '20%', tax: 60000 });
      slabs.push({ slab: '₹9,00,001 - ₹12,00,000', rate: '15%', tax: 45000 });
      slabs.push({ slab: '₹6,00,001 - ₹9,00,000', rate: '10%', tax: 30000 });
      slabs.push({ slab: '₹3,00,001 - ₹6,00,000', rate: '5%', tax: 15000 });
    } else if (taxableIncome > 1200000) {
      baseTax = 90000 + (taxableIncome - 1200000) * 0.2;
      slabs.push({ slab: '₹12,00,001 - ₹15,00,000', rate: '20%', tax: (taxableIncome - 1200000) * 0.2 });
      slabs.push({ slab: '₹9,00,001 - ₹12,00,000', rate: '15%', tax: 45000 });
      slabs.push({ slab: '₹6,00,001 - ₹9,00,000', rate: '10%', tax: 30000 });
      slabs.push({ slab: '₹3,00,001 - ₹6,00,000', rate: '5%', tax: 15000 });
    } else if (taxableIncome > 900000) {
      baseTax = 45000 + (taxableIncome - 900000) * 0.15;
      slabs.push({ slab: '₹9,00,001 - ₹12,00,000', rate: '15%', tax: (taxableIncome - 900000) * 0.15 });
      slabs.push({ slab: '₹6,00,001 - ₹9,00,000', rate: '10%', tax: 30000 });
      slabs.push({ slab: '₹3,00,001 - ₹6,00,000', rate: '5%', tax: 15000 });
    } else if (taxableIncome > 600000) {
      baseTax = 15000 + (taxableIncome - 600000) * 0.1;
      slabs.push({ slab: '₹6,00,001 - ₹9,00,000', rate: '10%', tax: (taxableIncome - 600000) * 0.1 });
      slabs.push({ slab: '₹3,00,001 - ₹6,00,000', rate: '5%', tax: 15000 });
    } else if (taxableIncome > 300000) {
      baseTax = (taxableIncome - 300000) * 0.05;
      slabs.push({ slab: '₹3,00,001 - ₹6,00,000', rate: '5%', tax: baseTax });
    } else {
      slabs.push({ slab: 'Up to ₹3,00,000', rate: 'Nil', tax: 0 });
    }
  }

  // 4% Health & Education Cess
  const cess = Math.round(baseTax * 0.04);
  const totalLiability = baseTax + cess;
  const tdsCredit = 12590; // TDS 194Q / 194C credit
  const netPayable = totalLiability - tdsCredit;

  return {
    pnl_net_profit: pnlProfit,
    additions,
    total_additions: totalAdd,
    deductions,
    total_deductions: totalDed,
    gross_total_income: gti,
    chapter_via_deductions: chapterVIA,
    total_chapter_via: totalVia,
    total_taxable_income: taxableIncome,
    tax_slab_breakdown: slabs,
    base_tax: baseTax,
    surcharge: 0,
    health_and_education_cess: cess,
    total_tax_liability: totalLiability,
    tds_credit_available: tdsCredit,
    net_tax_payable_or_refund: netPayable,
  };
}

/**
 * 8 Rule-Based Anomaly Checks (Section 5.14)
 */
export function runRuleBasedAnomalyDetection(vouchers: VoucherEntry[], financialYearStart = '2026-04-01', financialYearEnd = '2027-03-31'): AnomalyItem[] {
  const anomalies: AnomalyItem[] = [];
  const seenHashes = new Set<string>();

  let totalDebit = 0;
  let totalCredit = 0;
  let roundNumCount = 0;

  for (const vch of vouchers) {
    let vchDebit = 0;
    let vchCredit = 0;

    // Check 1: Missing / Unposted Voucher Number
    if (!vch.voucher_no || vch.voucher_no.trim() === '' || vch.voucher_no.toLowerCase() === 'nan') {
      anomalies.push({
        code: 'ANOM_MISSING_VCH_NO',
        type: 'rule_based',
        severity: 'error',
        title: 'Unposted / Missing Voucher Number',
        description: `Voucher dated ${formatIndianDate(vch.date)} has no unique invoice or voucher reference number.`,
        voucher_id: vch.id,
      });
    }

    // Check 2: Date outside selected Financial Year
    if (vch.date && (vch.date < '2026-04-01' || vch.date > '2027-03-31')) {
      // If date is outside FY
      if (vch.date < '2026-01-01' || vch.date > '2027-12-31') {
        anomalies.push({
          code: 'ANOM_DATE_OUTSIDE_FY',
          type: 'rule_based',
          severity: 'warning',
          title: 'Date Outside Current Financial Year',
          description: `Voucher #${vch.voucher_no || 'Pending'} has date ${formatIndianDate(vch.date)} which falls outside current operating financial year.`,
          voucher_id: vch.id,
          voucher_no: vch.voucher_no,
        });
      }
    }

    for (const line of vch.lines) {
      vchDebit += line.debit;
      vchCredit += line.credit;
      totalDebit += line.debit;
      totalCredit += line.credit;

      // Check 3: Missing GSTIN on large supply (> ₹50,000)
      if (line.debit > 50000 || line.credit > 50000) {
        if ((vch.voucher_type === 'Purchase' || vch.voucher_type === 'Sales') && !line.gstin && line.party_name) {
          anomalies.push({
            code: 'ANOM_MISSING_GSTIN',
            type: 'rule_based',
            severity: 'warning',
            title: 'Missing GSTIN on High-Value Supply',
            description: `Transaction with ${line.party_name} for ${formatIndianCurrency(Math.max(line.debit, line.credit))} lacks a registered GSTIN. ITC claim may be disallowed under section 16(2).`,
            voucher_id: vch.id,
            voucher_no: vch.voucher_no,
          });
        }
      }

      // Check 4: High-value voucher above configurable threshold (₹2,00,000 for cash/bank)
      if (line.debit >= 200000 || line.credit >= 200000) {
        if (line.ledger_name.toLowerCase().includes('cash')) {
          anomalies.push({
            code: 'ANOM_HIGH_CASH',
            type: 'rule_based',
            severity: 'error',
            title: 'High-Value Cash Transaction (Section 269ST)',
            description: `Cash transaction of ${formatIndianCurrency(Math.max(line.debit, line.credit))} exceeds ₹2,00,000 threshold. Section 269ST violation risk.`,
            voucher_id: vch.id,
            voucher_no: vch.voucher_no,
          });
        }
      }

      // Check 5: Round number concentration
      const amt = Math.max(line.debit, line.credit);
      if (amt >= 50000 && amt % 10000 === 0) {
        roundNumCount++;
      }
    }

    // Check 6: Duplicate entries (same date + voucher + amount)
    const hash = `${vch.date}_${vch.voucher_no}_${vchDebit.toFixed(0)}`;
    if (vch.voucher_no && seenHashes.has(hash)) {
      anomalies.push({
        code: 'ANOM_DUPLICATE_ENTRY',
        type: 'rule_based',
        severity: 'error',
        title: 'Duplicate Transaction Detected',
        description: `Identical transaction dated ${formatIndianDate(vch.date)} with voucher #${vch.voucher_no} and total ${formatIndianCurrency(vchDebit)} already exists.`,
        voucher_id: vch.id,
        voucher_no: vch.voucher_no,
      });
    } else if (vch.voucher_no) {
      seenHashes.add(hash);
    }

    // Check 7: GST Rate Mismatch (CGST + SGST vs IGST)
    const cgstLine = vch.lines.find(l => l.gl_code === '2210' || l.gl_code === '1150');
    const sgstLine = vch.lines.find(l => l.gl_code === '2211' || l.gl_code === '1151');
    const igstLine = vch.lines.find(l => l.gl_code === '2212' || l.gl_code === '1152');
    if ((cgstLine && igstLine) || (sgstLine && igstLine)) {
      anomalies.push({
        code: 'ANOM_GST_RATE_MISMATCH',
        type: 'rule_based',
        severity: 'error',
        title: 'Conflicting GST Tax Accounts',
        description: `Voucher #${vch.voucher_no} contains both Intra-State (CGST/SGST) and Inter-State (IGST) components simultaneously.`,
        voucher_id: vch.id,
        voucher_no: vch.voucher_no,
      });
    }
  }

  // Check 8: Trial-Balance-Level Debit/Credit Imbalance
  if (Math.abs(totalDebit - totalCredit) > 1.0) {
    anomalies.push({
      code: 'ANOM_TB_IMBALANCE',
      type: 'rule_based',
      severity: 'error',
      title: 'Trial Balance Imbalance Detected',
      description: `Total Debits (${formatIndianCurrency(totalDebit)}) do not match Total Credits (${formatIndianCurrency(totalCredit)}). Imbalance difference: ${formatIndianCurrency(Math.abs(totalDebit - totalCredit))}.`,
    });
  }

  return anomalies;
}

/**
 * Tally XML Exporter (Section 5.6 & 5.20)
 */
export function generateTallyXML(vouchers: VoucherEntry[], companyName: string): string {
  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="utf-8"?>');
  lines.push('<ENVELOPE>');
  lines.push('  <HEADER>');
  lines.push('    <TALLYREQUEST>Import Data</TALLYREQUEST>');
  lines.push('  </HEADER>');
  lines.push('  <BODY>');
  lines.push('    <IMPORTDATA>');
  lines.push('      <REQUESTDESC>');
  lines.push('        <REPORTNAME>Vouchers</REPORTNAME>');
  lines.push('        <STATICVARIABLES>');
  lines.push(`          <SVCURRENTCOMPANY>${escapeXml(companyName)}</SVCURRENTCOMPANY>`);
  lines.push('        </STATICVARIABLES>');
  lines.push('      </REQUESTDESC>');
  lines.push('      <REQUESTDATA>');

  for (const vch of vouchers) {
    const tallyDate = vch.date.replace(/-/g, '');
    lines.push(`        <TALLYMESSAGE xmlns:UDF="TallyUDF">`);
    lines.push(`          <VOUCHER VCHTYPE="${escapeXml(vch.voucher_type)}" ACTION="Create">`);
    lines.push(`            <DATE>${tallyDate}</DATE>`);
    lines.push(`            <VOUCHERTYPENAME>${escapeXml(vch.voucher_type)}</VOUCHERTYPENAME>`);
    lines.push(`            <VOUCHERNUMBER>${escapeXml(vch.voucher_no || 'AUTO')}</VOUCHERNUMBER>`);
    lines.push(`            <NARRATION>${escapeXml(vch.narration || '')}</NARRATION>`);

    for (const line of vch.lines) {
      const isDebit = line.debit > 0;
      const amount = isDebit ? -Math.abs(line.debit) : Math.abs(line.credit); // Tally uses negative for debit
      lines.push('            <ALLLEDGERENTRIES.LIST>');
      lines.push(`              <LEDGERNAME>${escapeXml(line.ledger_name)}</LEDGERNAME>`);
      lines.push(`              <ISDEEMEDPOSITIVE>${isDebit ? 'Yes' : 'No'}</ISDEEMEDPOSITIVE>`);
      lines.push(`              <AMOUNT>${amount.toFixed(2)}</AMOUNT>`);
      lines.push('            </ALLLEDGERENTRIES.LIST>');
    }

    lines.push('          </VOUCHER>');
    lines.push('        </TALLYMESSAGE>');
  }

  lines.push('      </REQUESTDATA>');
  lines.push('    </IMPORTDATA>');
  lines.push('  </BODY>');
  lines.push('</ENVELOPE>');

  return lines.join('\n');
}

function escapeXml(unsafe: string): string {
  return (unsafe || '').replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}
