"""
Legacy Logic Pro — FastAPI Application Entry Point
Section 3.3: Strict CORS configuration (explicit origins, credentials=True, explicit methods & headers).
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings

app = FastAPI(
    title="Legacy Logic Pro API",
    description="Stateless document intelligence and practice management platform for Chartered Accountant firms in India",
    version="1.0.0"
)

# Section 3.3: Strict CORS discipline (No wildcard with credentials=True)
allowed_origins = settings.allowed_origins
if not allowed_origins:
    allowed_origins = ["http://localhost:3000", "http://127.0.0.1:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=[
        "Authorization",
        "Content-Type",
        "X-Workspace-Id",
        "Accept",
        "Origin",
        "X-Requested-With",
    ],
)

@app.get("/health", tags=["Health"])
async def health_check():
    """Unauthenticated health probe for Railway and container readiness checks."""
    return {
        "status": "healthy",
        "service": "Legacy Logic Pro Backend",
        "version": "1.0.0",
        "environment": settings.environment
    }

# Include API Routers
# (routers are registered for all modular functional domains)
from routers import (
    clients_router,
    documents_router,
    vouchers_router,
    reports_router,
    gst_router,
    tds_router,
    depreciation_router,
    brs_router,
    tasks_router,
    billing_router,
    rules_router,
    audit_router,
    ai_router
)

app.include_router(clients_router.router, prefix="/api/clients", tags=["Clients"])
app.include_router(documents_router.router, prefix="/api/documents", tags=["Documents"])
app.include_router(vouchers_router.router, prefix="/api/vouchers", tags=["Vouchers"])
app.include_router(reports_router.router, prefix="/api/reports", tags=["Reports"])
app.include_router(gst_router.router, prefix="/api/gst", tags=["GST"])
app.include_router(tds_router.router, prefix="/api/tds", tags=["TDS"])
app.include_router(depreciation_router.router, prefix="/api/depreciation", tags=["Depreciation"])
app.include_router(brs_router.router, prefix="/api/brs", tags=["Bank Reconciliation"])
app.include_router(tasks_router.router, prefix="/api/tasks", tags=["Practice Tasks"])
app.include_router(billing_router.router, prefix="/api/billing", tags=["Firm Billing"])
app.include_router(rules_router.router, prefix="/api/rules", tags=["Rules Engine"])
app.include_router(audit_router.router, prefix="/api/audit", tags=["Audit Trail"])
app.include_router(ai_router.router, prefix="/api/ai", tags=["AI Assistant"])
