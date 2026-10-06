# BlindPay

BlindPay is a secure escrow and payment-orchestration platform for managing transactions that move through trusted providers before final settlement.

It is designed for operational teams that need more than a payment list: BlindPay keeps the **order, escrow balance, provider chain, transaction approvals, risk decisions, disputes, KYC reviews, notifications, and audit history** connected.

> **Important:** BlindPay is an application foundation/prototype for escrow orchestration. It does not independently connect to MTN Mobile Money, Airtel Money, banks, or other payment rails until those provider integrations are implemented and their webhooks are connected to the settlement RPCs.

## What BlindPay does

A typical BlindPay order follows this lifecycle:

```text
Customer creates order
        │
        ▼
Waiting for deposit
        │
        ▼
Deposit received
        │
        ▼
Funds locked in escrow
        │
        ▼
Provider stage 1
        │
        ▼
Admin approval
        │
        ▼
Provider stage 2
        │
        ▼
Admin approval
        │
        ▼
... more stages ...
        │
        ▼
Final provider stage completed
        │
        ▼
Order completed
```

Every important state change is recorded in the audit log.

## Main modules

### Dashboard
The dashboard gives operations staff a real-time overview of:

- Active orders
- Pending transaction approvals
- Funds currently held in escrow
- Open disputes
- Recent transactions
- Order pipeline
- Risk activity

### Orders
Orders contain:

- Customer details
- Amount and currency
- Deposit method
- Provider chain
- Current stage
- Risk score and flags
- Freeze status
- Deposit reference
- Complete transaction timeline

Admins can create orders, inspect an order, simulate/record a deposit, initiate the next provider transfer, freeze/unfreeze an order, and review risk information.

### Wallets
Wallets represent the accounting accounts used by the escrow system:

- Escrow master wallet
- Provider wallets
- Customer refund wallet

Each wallet tracks:

- Available balance
- Locked balance
- Total received
- Total sent
- Currency
- Status
- Payout method/details

Wallets can be frozen by an administrator.

### Transactions
Transactions represent movement of money:

- Deposit
- Internal transfer
- Payout
- Refund
- Reversal

Pending internal transfers require administrator approval.

Approval is handled by a Supabase database function so the following operations happen atomically:

1. Validate the transaction.
2. Validate the order and wallet state.
3. Lock the relevant rows.
4. Debit the source wallet.
5. Credit the destination wallet.
6. Account for the fee.
7. Mark the transaction completed.
8. Advance the order's provider stage.
9. Complete the order after the final stage.
10. Write an audit entry.

This prevents the browser from performing a sequence of independently successful balance updates.

### Risk engine
BlindPay calculates a risk score from transaction/order signals and exposes risk flags to operations staff.

The risk engine is intended to be extended with production rules such as:

- Velocity checks
- Customer history
- Amount thresholds
- Device/IP intelligence
- KYC status
- Provider risk
- Repeated failed payments
- Suspicious transaction patterns

### Disputes
Disputes provide a workflow for:

- Opening a dispute
- Recording a reason/category
- Adding evidence
- Reviewing the case
- Resolving by refund, release, or partial settlement
- Recording resolution notes

### KYC
The KYC module supports:

- Identity information
- ID document uploads
- Selfie/liveness evidence
- Automated pre-checks
- Manual administrator review
- Verification/rejection
- Risk level
- Admin notes

For production, KYC files should normally be stored in a **private Supabase Storage bucket** with signed URLs rather than public URLs.

### Notifications
BlindPay has a notification center with:

- Order updates
- Payment events
- KYC events
- Disputes
- Risk alerts
- System notifications

Supabase Realtime is used so new notifications can appear without manually refreshing the page.

### Audit log
The audit log records important operational events, including:

- Order creation
- Deposit receipt
- Transfer initiation
- Transfer approval/rejection
- Wallet freeze/unfreeze
- Transaction reversal
- Dispute events
- Risk events
- Administrative actions

The audit trail is intentionally separate from the business data so operators can investigate what happened and when.

## Technology

BlindPay currently uses:

- React 18
- Vite
- React Router
- Tailwind CSS
- Radix UI components
- Lucide icons
- TanStack Query
- Supabase Auth
- Supabase Postgres
- Supabase Realtime
- Supabase Storage
- Recharts
- Sonner notifications

## Authentication

BlindPay uses Supabase email/password authentication.

There is **no public self-registration** in the application.

The intended provisioning flow is:

1. An administrator creates a user in Supabase Authentication.
2. A matching row is created in `public.profiles`.
3. The profile receives a role:
   - `admin`
   - `provider`
   - `customer`
   - `system`
4. The user signs in through `/login`.
5. BlindPay loads the profile and applies the user's role.
6. Suspended/disabled accounts are denied access.

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a local `.env` file from `.env.example`.

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

Do not put a Supabase service-role key in a `VITE_*` variable. Anything exposed through Vite is available to the browser.

### 3. Configure Supabase

Open your Supabase project and run:

```text
supabase/schema.sql
```

The SQL creates the core BlindPay tables, indexes, triggers, RLS policies, and atomic escrow transaction functions.

The important database functions are:

- `record_order_deposit`
- `approve_transaction`
- `reject_transaction`
- `is_admin`

### 4. Create the first administrator

Create a user in:

```text
Supabase Dashboard
→ Authentication
→ Users
→ Add user
```

Then create the matching profile:

```sql
insert into public.profiles (id, email, full_name, role)
select id, email, 'BlindPay Administrator', 'admin'
from auth.users
where email = 'YOUR_ADMIN_EMAIL';
```

Replace the email with the actual administrator email.

### 5. Create an escrow wallet

Before recording a deposit, create at least one active wallet with:

```text
provider_type = escrow_master
currency = UGX
status = active
```

For additional currencies, create one escrow master wallet for each currency.

### 6. Create provider wallets

Create provider wallets with:

```text
provider_type = provider
status = active
```

The provider chain on an order is made from these wallet IDs.

## Running locally

Development:

```bash
npm run dev
```

Production build:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

Lint:

```bash
npm run lint
```

Type checking:

```bash
npm run typecheck
```

## Production payment integrations

The current **Simulate Deposit** action is intentionally a development/testing mechanism.

For a real payment deployment, replace the simulation with a backend/webhook flow:

```text
Payment provider
      │
      │ webhook
      ▼
BlindPay server/edge function
      │
      ├── verify webhook signature
      ├── prevent duplicate processing
      ├── validate amount/currency/reference
      ├── locate order
      └── call record_order_deposit(...)
```

The same principle should be used for real provider payouts:

```text
BlindPay approved transaction
      │
      ▼
Payment adapter
      │
      ├── MTN Mobile Money
      ├── Airtel Money
      ├── Bank
      └── Other provider
```

A provider webhook should then update the transaction only after the external provider confirms the result.

## Security notes

BlindPay handles financial information, so production deployment should include additional controls.

### Never expose secrets

Do not commit:

- Supabase service-role keys
- Payment-provider API secrets
- Webhook signing secrets
- Private signing keys
- Vercel/OIDC tokens
- Database passwords

Only the Supabase URL and anonymous browser key belong in Vite client environment variables.

### RLS

Supabase Row Level Security is enabled by the supplied schema.

Administrators receive operational access while customers/providers receive scoped access.

Review and test these policies against your exact business rules before production.

### KYC documents

Do not use public storage for identity documents in production.

Use:

- Private Storage bucket
- Signed URLs
- Short expiration times
- Strict storage policies
- Access logging

### Financial operations

Never trust the browser to decide balances.

The browser should request an operation; the database/backend should:

- validate permissions
- lock relevant records
- validate balances
- perform the ledger update
- write the audit event
- commit everything atomically

BlindPay's transfer approval RPC follows this pattern.

## Suggested production architecture

```text
                     ┌─────────────────────┐
                     │      BlindPay UI    │
                     │ React + Vite        │
                     └──────────┬──────────┘
                                │
                         Supabase Auth
                                │
                                ▼
                     ┌─────────────────────┐
                     │    Supabase RLS     │
                     └──────────┬──────────┘
                                │
                 ┌──────────────┼──────────────┐
                 ▼              ▼              ▼
             Orders         Wallets       Transactions
                 │              │              │
                 └──────────────┼──────────────┘
                                ▼
                     Atomic database RPCs
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
               Audit Logs             Notifications
                                            │
                                        Realtime
                                            │
                                            ▼
                                        Operators

Payment providers
       │
       ▼
Webhook/Edge Functions
       │
       ▼
Atomic settlement RPCs
```

## Folder structure

```text
blindpay/
├── entities/                  # Domain/entity definitions
├── public/                    # Static assets
├── src/
│   ├── api/                   # API-related code
│   ├── components/
│   │   ├── dashboard/
│   │   ├── notifications/
│   │   ├── orders/
│   │   ├── transactions/
│   │   └── ui/
│   ├── lib/
│   │   ├── AuthContext.jsx
│   │   ├── feeEngine.js
│   │   ├── riskEngine.js
│   │   ├── helpers.js
│   │   └── supabaseClient.js
│   └── pages/
│       ├── Login.jsx
│       ├── Dashboard.jsx
│       ├── Orders.jsx
│       ├── Transactions.jsx
│       ├── Wallets.jsx
│       ├── Disputes.jsx
│       ├── KYC.jsx
│       ├── Analytics.jsx
│       ├── AuditLog.jsx
│       ├── AdminPanel.jsx
│       ├── CustomerPortal.jsx
│       └── ProviderPortal.jsx
├── supabase/
│   └── schema.sql             # Database schema, RLS and RPCs
├── .env.example
├── package.json
└── README.md
```

## Current status

### Implemented

- Supabase authentication
- Protected routes
- Role-aware admin access
- Login screen
- Orders
- Provider chains
- Escrow wallets
- Transaction workflow
- Atomic transfer approval
- Atomic deposit recording
- Fee calculation
- Risk scoring
- Disputes
- KYC workflow
- Notifications
- Realtime notifications
- Audit log
- Analytics
- CSV/PDF reporting components
- Inactivity lock

### Production integrations still required

BlindPay should not be described as a live payment processor until these are connected and tested:

- MTN Mobile Money API
- Airtel Money API
- Bank payment rails
- Payout APIs
- Signed payment webhooks
- Webhook idempotency
- Production KYC provider
- Production identity/liveness verification
- Email/SMS/WhatsApp notifications
- Reconciliation jobs
- Automated settlement monitoring
- Financial ledger reconciliation
- Backup/restore procedures
- Monitoring and alerting
- Penetration/security testing

## Important financial design principle

BlindPay should be treated as a **ledger and orchestration system**, not simply a CRUD dashboard.

For every movement of money, the system should be able to answer:

1. Where did the money come from?
2. Where did it go?
3. Which order caused the movement?
4. Which provider stage was involved?
5. What fees were charged?
6. Who approved it?
7. When was it approved?
8. What was the previous state?
9. What is the current state?
10. Can the movement be reconciled against the external payment provider?

That auditability is the core purpose of BlindPay.

## License

Add the project's intended license here before public distribution.
