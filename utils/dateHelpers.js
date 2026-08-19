
// utils/dateHelpers.js
// Local-date (server/WAT) helpers — NEVER use .toISOString() for date-key
// logic. toISOString() converts to UTC first, which shifts the calendar
// day during the WAT 00:00-00:59 window (UTC 23:00-23:59 previous day).
// See PROJECT_BRIEF.md §2 "Date/timezone handling in queries and stats".

// 'YYYY-MM-DD' for a given Date, using its local (server/WAT) fields.
function toLocalDateStr(d) {
    const y   = d.getFullYear();
    const m   = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

// 'YYYY-MM' for a given Date, using its local (server/WAT) fields.
function toLocalYearMonthStr(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
}

// 'YYYY-MM-DD' for right now.
function todayLocalStr() {
    return toLocalDateStr(new Date());
}

// 'YYYY-MM-DD' for N days from now (N may be negative).
function addDaysLocalStr(n) {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return toLocalDateStr(d);
}

// Confirmed 2026-08-07: the ~1.56 million rows in care_billing_bill_item
// spanning 2017-2025 are genuine historical data migrated from the
// system this app replaced, not live pharmacy activity — the `livrer`
// field was never reliably maintained during that migration (594,592
// rows show status='paid' AND livrer=0, which would mean paid
// medication sitting undispensed for years, not realistic for actual
// hospital operations). Every "pending dispense" query needs this
// cutoff, or it silently tries to treat 8 years of stale historical
// rows as actionable — this affected the real dispensing queue itself,
// not just the dashboard. Confirmed fair cutoff with the project owner:
// only bills dated 2026 or later are eligible to be counted/shown as
// pending.
const PHARMACY_PENDING_CUTOFF_DATE = '2026-01-01';

module.exports = { toLocalDateStr, toLocalYearMonthStr, todayLocalStr, addDaysLocalStr, PHARMACY_PENDING_CUTOFF_DATE };
