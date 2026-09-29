"""
Legacy Logic Pro — Pydantic v2 Models & Schemas
Section 3.1: Matched field-for-field with frontend types (casing, names, optionality).
"""

from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field


# Client Schemas
class ClientCreate(BaseModel):
    name: str
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    entity_type: Literal['individual', 'proprietorship', 'partnership', 'llp', 'company']
    gstin: Optional[str] = None
    pan: str


class ClientResponse(BaseModel):
    id: str
    workspace_id: str
    name: str
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    entity_type: Literal['individual', 'proprietorship', 'partnership', 'llp', 'company']
    gstin: Optional[str] = None
    pan: str
    created_at: str


# Voucher Schemas
class VoucherLineSchema(BaseModel):
    id: str
    ledger_id: str
    ledger_name: str
    gl_code: Optional[str] = None
    debit: float = 0.0
    credit: float = 0.0
    party_name: Optional[str] = None
    gstin: Optional[str] = None
    gst_rate: Optional[float] = None
    tds_section: Optional[str] = None


class AnomalyItemSchema(BaseModel):
    code: str
    type: Literal['rule_based', 'ai_assisted']
    severity: Literal['warning', 'error']
    title: str
    description: str
    voucher_id: Optional[str] = None
    voucher_no: Optional[str] = None


class VoucherEntrySchema(BaseModel):
    id: str
    voucher_no: str
    voucher_type: Literal['Payment', 'Receipt', 'Journal', 'Sales', 'Purchase', 'Contra']
    date: str
    narration: str
    source: Literal['uploaded_ocr', 'manual'] = 'uploaded_ocr'
    is_reviewed: Optional[bool] = False
    reviewer_name: Optional[str] = None
    review_notes: Optional[str] = None
    reviewed_at: Optional[str] = None
    lines: List[VoucherLineSchema]
    raw_text: Optional[str] = None
    anomalies: Optional[List[AnomalyItemSchema]] = None


# Financial Stateless Compute Request
class FinancialSessionRequest(BaseModel):
    vouchers: List[VoucherEntrySchema]
    date_from: Optional[str] = None
    date_to: Optional[str] = None


# Practice Task Schemas
class PracticeTaskCreate(BaseModel):
    client_id: str
    title: str
    description: Optional[str] = None
    assignee_id: Optional[str] = None
    assignee_name: Optional[str] = None
    due_date: str
    status: Literal['pending', 'in_progress', 'done', 'overdue'] = 'pending'
    compliance_type: Optional[str] = None


class PracticeTaskResponse(BaseModel):
    id: str
    workspace_id: str
    client_id: str
    client_name: Optional[str] = None
    title: str
    description: Optional[str] = None
    assignee_id: Optional[str] = None
    assignee_name: Optional[str] = None
    due_date: str
    status: Literal['pending', 'in_progress', 'done', 'overdue']
    compliance_type: Optional[str] = None
    created_at: str


# Firm Billing Schemas
class InvoiceItemSchema(BaseModel):
    id: str
    description: str
    quantity: int = 1
    unit_price: float = 0.0
    is_taxable: bool = True
    amount: float = 0.0


class InvoiceCreate(BaseModel):
    client_id: str
    client_name: str
    issue_date: str
    due_date: str
    status: Literal['draft', 'sent', 'paid', 'overdue', 'cancelled'] = 'draft'
    subtotal: float
    gst_amount: float
    total_amount: float
    items: List[InvoiceItemSchema]


class InvoiceResponse(BaseModel):
    id: str
    workspace_id: str
    invoice_number: str
    client_id: str
    client_name: str
    issue_date: str
    due_date: str
    status: Literal['draft', 'sent', 'paid', 'overdue', 'cancelled']
    subtotal: float
    gst_amount: float
    total_amount: float
    items: List[InvoiceItemSchema]
    created_at: str


# Fixed Asset Schema
class FixedAssetCreate(BaseModel):
    client_id: str
    asset_name: str
    category: str
    purchase_date: str
    cost: float
    it_act_rate: float
    days_used_in_fy: int = 365


# BRS Schemas
class BRSLineItemSchema(BaseModel):
    id: str
    category: Literal['cheque_issued_not_presented', 'cheque_deposited_not_cleared', 'bank_charges_not_recorded', 'interest_not_recorded', 'other']
    description: str
    amount: float
    is_addition: bool


class BRSFinalizeRequest(BaseModel):
    client_id: str
    bank_ledger_id: str
    bank_ledger_name: str
    as_of_date: str
    book_balance: float
    bank_statement_balance: float
    unreconciled_difference: float
    items: List[BRSLineItemSchema]


# AI Query Request
class AIQueryRequest(BaseModel):
    query: str
    sessionData: Dict[str, Any]
    enableAI: bool
    workspaceId: str


class AIQueryResponse(BaseModel):
    answer: str
    thinkingSummary: Optional[str] = None
    advisory: str
    modelUsed: str = "gemini-3.1-pro-preview"
