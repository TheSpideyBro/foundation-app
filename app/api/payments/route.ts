import { createClient as createSupaClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server-auth';
import { isApproved, isFounder } from '@/lib/auth';

/** The only payment methods the app can produce (lib/supabase-client.ts). */
const PAYMENT_METHODS = ['cash', 'bkash', 'nagad', 'bank'] as const;

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/**
 * Both canonical engines must agree on a window: monthRange() in
 * lib/payment-ledger.ts truncates at 121 rows, the SQL engine does not, so a
 * longer window would be previewed one way and stored another (BUG-022).
 */
const MAX_COVERAGE_MONTHS = 120;

type Fail = { code: string; message: string; status: number };

const fail = ({ code, message, status }: Fail) =>
  NextResponse.json({ code, error: message }, { status });

/** Months in an inclusive YYYY-MM window; 0 when either side is malformed. */
function monthSpan(start: string, end: string): number {
  if (!MONTH_RE.test(start) || !MONTH_RE.test(end)) return 0;
  const [sy, sm] = start.split('-').map(Number);
  const [ey, em] = end.split('-').map(Number);
  return (ey - sy) * 12 + (em - sm) + 1;
}

function isRealDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/**
 * `date` may be at most one day ahead of the server clock: an operator in a
 * UTC+ timezone legitimately records "today" while the server still sees
 * yesterday, so a strict `<= today` would reject valid entries.
 */
function isTooFarInFuture(value: string): boolean {
  const limit = new Date();
  limit.setUTCDate(limit.getUTCDate() + 1);
  const max = limit.toISOString().slice(0, 10);
  return value > max;
}

const validateCoverage = (start: string, end: string): Fail | null => {
  if (!start || !end) {
    return { code: 'invalid_coverage', message: 'কভারেজের মাস নির্বাচন করুন', status: 400 };
  }
  if (monthSpan(start, end) === 0) {
    return { code: 'invalid_coverage', message: 'কভারেজের মাস সঠিক নয় (YYYY-MM)', status: 400 };
  }
  if (start > end) {
    return { code: 'invalid_coverage', message: 'কভারেজের শুরুর মাস শেষ মাসের আগে হতে পারে না', status: 400 };
  }
  if (monthSpan(start, end) > MAX_COVERAGE_MONTHS) {
    return {
      code: 'coverage_too_long',
      message: `কভারেজের মাসসংখ্যা ${MAX_COVERAGE_MONTHS} মাসের বেশি হতে পারে না`,
      status: 400,
    };
  }
  return null;
};

const validatePledgeChange = (
  amount: number | null | undefined,
  effectiveMonth: string | null | undefined,
  coverageStart: string,
): Fail | null => {
  if (amount === undefined || amount === null) return null;
  if (!Number.isFinite(amount) || amount <= 0) {
    return { code: 'invalid_pledge_amount', message: 'নতুন মাসিক অঙ্গীকার শূন্যের চেয়ে বেশি হতে হবে', status: 400 };
  }
  if (!effectiveMonth) {
    return { code: 'invalid_pledge_effective_month', message: 'অঙ্গীকারের কার্যকর মাস নির্বাচন করুন', status: 400 };
  }
  if (!MONTH_RE.test(effectiveMonth)) {
    return { code: 'invalid_pledge_effective_month', message: 'কার্যকর মাস সঠিক নয় (YYYY-MM)', status: 400 };
  }
  // A month before the window being paid would restate months that are
  // already reported (ledger, summary view, Reports) — BUG-023.
  if (coverageStart && effectiveMonth < coverageStart) {
    return {
      code: 'pledge_effective_before_coverage',
      message: 'অঙ্গীকারের কার্যকর মাস কভারেজের শুরুর মাসের আগে হতে পারে না',
      status: 400,
    };
  }
  return null;
};

/** Known SQL-side messages → stable code + Bengali text; null when unknown. */
const SQL_ERRORS: Record<string, { code: string; message: string }> = {
  'Payment amount must be positive': { code: 'invalid_amount', message: 'জমার পরিমাণ শূন্যের চেয়ে বেশি হতে হবে' },
  'Extra amount cannot be negative': { code: 'invalid_extra_amount', message: 'অতিরিক্ত জমা ঋণাত্মক হতে পারে না' },
  'Coverage month range is required': { code: 'invalid_coverage', message: 'কভারেজের মাস নির্বাচন করুন' },
  'Coverage months must be YYYY-MM': { code: 'invalid_coverage', message: 'কভারেজের মাস সঠিক নয় (YYYY-MM)' },
  'Coverage range must be between 1 and 120 months': {
    code: 'coverage_too_long',
    message: `কভারেজের মাসসংখ্যা ${MAX_COVERAGE_MONTHS} মাসের বেশি হতে পারে না`,
  },
  'Payment not found': { code: 'payment_not_found', message: 'জমাটি পাওয়া যায়নি' },
  'Pledge amount must be positive': { code: 'invalid_pledge_amount', message: 'নতুন মাসিক অঙ্গীকার শূন্যের চেয়ে বেশি হতে হবে' },
  'Pledge effective month is required': { code: 'invalid_pledge_effective_month', message: 'অঙ্গীকারের কার্যকর মাস নির্বাচন করুন' },
  'Pledge effective month must be YYYY-MM': { code: 'invalid_pledge_effective_month', message: 'কার্যকর মাস সঠিক নয় (YYYY-MM)' },
  'Pledge effective month cannot be before the coverage start month': {
    code: 'pledge_effective_before_coverage',
    message: 'অঙ্গীকারের কার্যকর মাস কভারেজের শুরুর মাসের আগে হতে পারে না',
  },
};

/**
 * Translate an RPC/DB failure into a safe response. Raw Postgres text stays
 * in the server log — constraint names and SQL fragments never reach the UI
 * (BUG-026).
 */
function sqlErrorResponse(stage: string, message: string | undefined, status = 400) {
  const raw = String(message ?? '');
  console.error(`[/api/payments] ${stage} error:`, raw);

  if (/duplicate key value/i.test(raw)) {
    return fail({
      code: 'duplicate_receipt',
      message: 'এই রসিদ নম্বর ইতিমধ্যে ব্যবহৃত হয়েছে — জমা তালিকা দেখে নিন',
      status: 409,
    });
  }
  const known = SQL_ERRORS[raw.trim()];
  if (known) return fail({ ...known, status });

  return fail({ code: 'internal', message: 'সেভ করতে সমস্যা হয়েছে — আবার চেষ্টা করুন', status: 500 });
}

function serviceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey =
    process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createSupaClient(supabaseUrl, supabaseServiceKey);
}

export async function POST(request: Request) {
  try {
    // Staff gate first: never validate or persist anything for a caller who
    // is not allowed to create payments.
    const auth = await requireAuth('staff');
    if (!auth.ok) return auth.response;

    const body = await request.json();

    const {
      member_id,
      amount,
      extra_amount,
      date,
      method,
      receipt_no,
      coverage_start_month,
      coverage_end_month,
      collected_by,
      note,
      pledge_change_amount,
      pledge_effective_month,
      pledge_change_note,
    } = body as {
      member_id: string;
      amount: number;
      extra_amount?: number;
      date: string;
      method: string;
      receipt_no?: string;
      coverage_start_month: string;
      coverage_end_month: string;
      collected_by: string;
      note?: string;
      pledge_change_amount?: number | null;
      pledge_effective_month?: string | null;
      pledge_change_note?: string;
    };

    if (!member_id) return fail({ code: 'invalid_member', message: 'সদস্য নির্বাচন করুন', status: 400 });

    const extraAmount = Number(extra_amount ?? 0);
    const regularAmount = Number(amount);
    if (!Number.isFinite(extraAmount) || extraAmount < 0) {
      return fail({ code: 'invalid_extra_amount', message: 'অতিরিক্ত জমা ঋণাত্মক হতে পারে না', status: 400 });
    }
    if (!Number.isFinite(regularAmount) || regularAmount <= 0) {
      return fail({ code: 'invalid_amount', message: 'জমার পরিমাণ শূন্যের চেয়ে বেশি হতে হবে', status: 400 });
    }

    if (!date || !isRealDate(date)) {
      return fail({ code: 'invalid_date', message: 'জমার তারিখ সঠিক নয়', status: 400 });
    }
    if (isTooFarInFuture(date)) {
      return fail({ code: 'future_date', message: 'জমার তারিখ ভবিষ্যতের হতে পারে না', status: 400 });
    }

    if (!method || !(PAYMENT_METHODS as readonly string[]).includes(method)) {
      return fail({ code: 'invalid_method', message: 'পেমেন্ট পদ্ধতি সঠিক নয়', status: 400 });
    }

    const coverageError = validateCoverage(coverage_start_month, coverage_end_month);
    if (coverageError) return fail(coverageError);

    if (receipt_no !== undefined && receipt_no !== null && receipt_no !== '') {
      if (receipt_no.length > 64 || /[\r\n\t]/.test(receipt_no)) {
        return fail({ code: 'invalid_receipt_no', message: 'রসিদ নম্বর সঠিক নয়', status: 400 });
      }
    }

    const pledgeError = validatePledgeChange(pledge_change_amount, pledge_effective_month, coverage_start_month);
    if (pledgeError) return fail(pledgeError);

    if (!collected_by) return fail({ code: 'invalid_collector', message: 'আদায়কারী নির্বাচন করুন', status: 400 });

    const adminClient = serviceClient();
    if (!adminClient) {
      return fail({ code: 'config', message: 'সার্ভার কনফিগারেশন সমস্যা', status: 500 });
    }

    const { data: member } = await adminClient
      .from('members')
      .select('id')
      .eq('id', member_id)
      .maybeSingle();
    if (!member) return fail({ code: 'invalid_member', message: 'সদস্য পাওয়া যায়নি', status: 404 });

    // The collector must be a real, approved staff account: the RPC runs as
    // service_role, so RLS would never catch a member's own UUID here (BUG-025).
    const { data: collector } = await adminClient
      .from('users')
      .select('id, role, is_approved, email')
      .eq('id', collected_by)
      .maybeSingle();
    if (!collector) return fail({ code: 'invalid_collector', message: 'আদায়কারী পাওয়া যায়নি', status: 404 });
    const collectorIsStaff =
      isApproved(collector.is_approved) &&
      (collector.role === 'admin' || collector.role === 'treasurer' || isFounder(collector.email));
    if (!collectorIsStaff) {
      return fail({ code: 'invalid_collector', message: 'আদায়কারীকে অনুমোদিত স্টাফ হতে হবে', status: 403 });
    }

    const { data, error } = await adminClient.rpc('save_payment_entry', {
      p_member_id: member_id,
      p_amount: regularAmount,
      p_extra_amount: extraAmount,
      p_date: date,
      p_method: method,
      p_receipt_no: receipt_no || null,
      p_coverage_start: coverage_start_month,
      p_coverage_end: coverage_end_month,
      p_collected_by: collected_by,
      p_note: note || null,
      p_pledge_change_amount: pledge_change_amount || null,
      p_pledge_effective_month: pledge_effective_month || null,
      p_pledge_change_note: pledge_change_note || null,
    });

    if (error) return sqlErrorResponse('save_payment_entry', error.message);
    if (!data) {
      return fail({ code: 'internal', message: 'জমা সংরক্ষণ ব্যর্থ হয়েছে — আবার চেষ্টা করুন', status: 500 });
    }

    return NextResponse.json({ success: true, payment_id: data, code: 'ok' });
  } catch (err: any) {
    console.error('[/api/payments] POST error:', err);
    const status = err?.name === 'SyntaxError' ? 400 : 500;
    return fail({
      code: status === 400 ? 'invalid_body' : 'internal',
      message: status === 400 ? 'অনুরোধের তথ্য সঠিক নয়' : 'সেভ করতে সমস্যা হয়েছে — আবার চেষ্টা করুন',
      status,
    });
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await requireAuth('staff');
    if (!auth.ok) return auth.response;

    const body = await request.json();

    const {
      payment_id,
      amount,
      extra_amount,
      coverage_start_month,
      coverage_end_month,
      note,
    } = body as {
      payment_id: string;
      amount: number;
      extra_amount?: number;
      coverage_start_month: string;
      coverage_end_month: string;
      note?: string;
    };

    if (!payment_id) return fail({ code: 'invalid_payment', message: 'জমার আইডি নেই', status: 400 });

    const regularAmount = Number(amount);
    const extraAmount = Number(extra_amount ?? 0);
    if (!Number.isFinite(regularAmount) || regularAmount <= 0) {
      return fail({ code: 'invalid_amount', message: 'জমার পরিমাণ শূন্যের চেয়ে বেশি হতে হবে', status: 400 });
    }
    if (!Number.isFinite(extraAmount) || extraAmount < 0) {
      return fail({ code: 'invalid_extra_amount', message: 'অতিরিক্ত জমা ঋণাত্মক হতে পারে না', status: 400 });
    }

    const coverageError = validateCoverage(coverage_start_month, coverage_end_month);
    if (coverageError) return fail(coverageError);

    const adminClient = serviceClient();
    if (!adminClient) {
      return fail({ code: 'config', message: 'সার্ভার কনফিগারেশন সমস্যা', status: 500 });
    }

    const { data: donation } = await adminClient
      .from('donations')
      .select('id, member_id, extra_amount')
      .eq('id', payment_id)
      .maybeSingle();
    if (!donation) return fail({ code: 'payment_not_found', message: 'জমাটি পাওয়া যায়নি', status: 404 });

    const { error } = await adminClient.rpc('reallocate_payment', {
      p_payment_id: payment_id,
      p_amount: regularAmount,
      p_extra_amount: extraAmount,
      p_coverage_start: coverage_start_month,
      p_coverage_end: coverage_end_month,
      p_note: note || null,
    });

    if (error) return sqlErrorResponse('reallocate_payment', error.message);

    return NextResponse.json({ success: true, payment_id, code: 'ok' });
  } catch (err: any) {
    console.error('[/api/payments] PUT error:', err);
    const status = err?.name === 'SyntaxError' ? 400 : 500;
    return fail({
      code: status === 400 ? 'invalid_body' : 'internal',
      message: status === 400 ? 'অনুরোধের তথ্য সঠিক নয়' : 'সেভ করতে সমস্যা হয়েছে — আবার চেষ্টা করুন',
      status,
    });
  }
}
