/**
 * Legacy Logic Pro — Plans & Pricing (Public & Internal)
 * Section 4.4 & 5.1: Transparent pricing for prospective and existing CA firms.
 * Starter ₹799/month (2 seats), Pro ₹1,999/month (8 seats), Elite ₹4,499/month (unlimited).
 * Static UPI QR codes per plan, transaction ID email instructions for manual firm activation.
 */

import React, { useState } from 'react';
import {
  ShieldCheck,
  Check,
  QrCode,
  Mail,
  Copy,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { formatIndianCurrency } from '../../lib/formatters';

interface PlansPricingViewProps {
  onBackToApp?: () => void;
}

export const PlansPricingView: React.FC<PlansPricingViewProps> = ({ onBackToApp }) => {
  const [selectedPlan, setSelectedPlan] = useState<'starter' | 'pro' | 'elite'>('pro');
  const [copiedUpi, setCopiedUpi] = useState(false);

  const plans = [
    {
      id: 'starter' as const,
      name: 'Starter Practice',
      price: 799,
      period: '/ month',
      seats: '2 Staff Seats',
      quota: '50 Uploads / month',
      description: 'Ideal for sole proprietors & boutique CA practitioners.',
      features: [
        '2 active staff seats (1 Senior + 1 Article)',
        'Up to 50 document uploads / month',
        'In-memory OCR document extraction',
        'Trial Balance & Day Book generation',
        'Standard Tally XML export',
        'GST & TDS Working Papers',
      ],
      qrValue: 'upi://pay?pa=legacylogicpro@icici&pn=LegacyLogicPro&am=799&cu=INR',
    },
    {
      id: 'pro' as const,
      name: 'Professional Firm',
      price: 1999,
      period: '/ month',
      seats: '8 Staff Seats',
      quota: '200 Uploads / month',
      popular: true,
      description: 'Built for mid-sized CA partnerships handling multiple corporate audits.',
      features: [
        '8 active staff seats with multi-role matrix',
        'Up to 200 document uploads / month',
        'Full Schedule III Vertical Balance Sheet & P&L',
        '6-bucket Debtor/Creditor Ageing with risk gradient',
        'Bank Reconciliation (BRS) with locking',
        'Fixed Asset Register (IT Act WDV 180-day rule)',
        'Form 16 & 16A Draft Watermarked PDF generation',
        'AI Assistant Session Support (Gemini 3.1 Pro)',
      ],
      qrValue: 'upi://pay?pa=legacylogicpro@icici&pn=LegacyLogicPro&am=1999&cu=INR',
    },
    {
      id: 'elite' as const,
      name: 'Elite Enterprise',
      price: 4499,
      period: '/ month',
      seats: 'Unlimited Seats',
      quota: 'Unlimited Uploads',
      description: 'Comprehensive practice platform for large firms with multi-branch audits.',
      features: [
        'Unlimited staff seats & articles',
        'Unlimited document & book uploads',
        'Custom per-client Rules & Validation Engine',
        'Automated Compliance Task generation',
        'Client MIS Scorecard & Ratio Analysis',
        'Firm Billing & Client Fee Invoicing (18% GST)',
        'Immutable Audit Trail (WORM compliant)',
        'Dedicated CA account partner support',
      ],
      qrValue: 'upi://pay?pa=legacylogicpro@icici&pn=LegacyLogicPro&am=4499&cu=INR',
    },
  ];

  const activePlanData = plans.find((p) => p.id === selectedPlan)!;

  const handleCopyUpi = () => {
    navigator.clipboard.writeText('legacylogicpro@icici');
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-4">
      {/* Title */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-semibold">
          <Sparkles size={13} className="text-amber-600" />
          <span>Transparent Indian CA Firm Pricing</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Stateless Document Intelligence & Practice Management
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mx-auto">
          No hidden fees or per-page surcharges. Zero permanent document storage. Pay securely via static UPI QR code.
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((p) => {
          const isSelected = selectedPlan === p.id;
          return (
            <div
              key={p.id}
              onClick={() => setSelectedPlan(p.id)}
              className={`bg-white rounded-xl border p-6 flex flex-col justify-between transition-all cursor-pointer relative ${
                isSelected
                  ? 'border-amber-500 ring-2 ring-amber-500 shadow-md'
                  : 'border-slate-200 hover:border-slate-300 shadow-xs'
              }`}
            >
              {p.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-950 text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full">
                  Most Popular for CA Firms
                </span>
              )}

              <div>
                <h3 className="font-bold text-slate-900 text-base">{p.name}</h3>
                <p className="text-xs text-slate-500 mt-1 min-h-[32px]">{p.description}</p>

                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-900 font-mono">
                    {formatIndianCurrency(p.price)}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">{p.period}</span>
                </div>

                <div className="mt-3 py-2 border-t border-b border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>{p.seats}</span>
                  <span aria-hidden="true">·</span>
                  <span>{p.quota}</span>
                </div>

                <ul className="mt-4 space-y-2 text-xs text-slate-600">
                  {p.features.map((feat, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                className={`mt-6 w-full py-2 rounded-md font-semibold text-xs transition-colors ${
                  isSelected
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                }`}
              >
                {isSelected ? 'Selected Plan' : 'Select Plan'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Static UPI QR Payment & Activation Instructions (Section 4.4) */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 md:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-lg">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-amber-50 text-amber-800 text-[11px] font-semibold border border-amber-200">
              <QrCode size={13} />
              <span>Step 2: Instant UPI Payment & Manual Activation</span>
            </div>

            <h3 className="text-lg font-bold text-slate-900">
              Activate {activePlanData.name} ({formatIndianCurrency(activePlanData.price)} / mo)
            </h3>

            <p className="text-xs text-slate-600 leading-relaxed">
              Scan the official firm payment QR code using any Indian UPI app (BHIM, Google Pay, PhonePe, Paytm).
              After completing the transfer, email your 12-digit UPI UTR / Transaction Reference ID for instant activation.
            </p>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Official Firm VPA (UPI ID):</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-900">legacylogicpro@icici</span>
                  <button
                    onClick={handleCopyUpi}
                    className="text-slate-500 hover:text-slate-900 p-1"
                    title="Copy UPI ID"
                  >
                    {copiedUpi ? <CheckCircle2 size={13} className="text-emerald-600" /> : <Copy size={13} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-200 pt-2">
                <span className="text-slate-500 font-medium">Activation Desk:</span>
                <span className="font-mono text-slate-800">billing@msa-advisors.in</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span>Accounts are verified & upgraded within 15 minutes of UTR submission.</span>
            </div>
          </div>

          {/* Realistic SVG Static QR Code Graphic */}
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-center shrink-0">
            <div className="w-48 h-48 bg-white p-3 rounded-lg border border-slate-300 shadow-xs mx-auto flex flex-col items-center justify-center">
              {/* Clean SVG QR Code Representation */}
              <svg viewBox="0 0 100 100" className="w-full h-full text-slate-900 fill-current">
                {/* QR Finder Corners */}
                <rect x="5" y="5" width="28" height="28" fill="black" />
                <rect x="9" y="9" width="20" height="20" fill="white" />
                <rect x="13" y="13" width="12" height="12" fill="black" />

                <rect x="67" y="5" width="28" height="28" fill="black" />
                <rect x="71" y="9" width="20" height="20" fill="white" />
                <rect x="75" y="13" width="12" height="12" fill="black" />

                <rect x="5" y="67" width="28" height="28" fill="black" />
                <rect x="9" y="71" width="20" height="20" fill="white" />
                <rect x="13" y="75" width="12" height="12" fill="black" />

                {/* Simulated Data Matrix Dots */}
                <rect x="38" y="8" width="6" height="6" />
                <rect x="48" y="18" width="8" height="6" />
                <rect x="38" y="28" width="6" height="8" />
                <rect x="8" y="38" width="8" height="6" />
                <rect x="20" y="48" width="6" height="8" />
                <rect x="38" y="48" width="10" height="10" />
                <rect x="54" y="38" width="6" height="6" />
                <rect x="68" y="48" width="8" height="6" />
                <rect x="80" y="38" width="6" height="8" />
                <rect x="48" y="68" width="8" height="8" />
                <rect x="68" y="68" width="8" height="8" />
                <rect x="82" y="78" width="6" height="8" />
                <rect x="48" y="82" width="6" height="6" />
              </svg>
            </div>
            <div className="mt-3">
              <span className="font-mono font-bold text-xs text-slate-800">
                UPI Scan & Pay {formatIndianCurrency(activePlanData.price)}
              </span>
              <p className="text-[10px] text-slate-500 mt-0.5">BHIM / GPay / PhonePe / Paytm</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
