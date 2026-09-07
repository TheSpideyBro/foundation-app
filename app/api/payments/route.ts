import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
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

    // Validation
    if (!member_id) return NextResponse.json({ error: 'Member is required' }, { status: 400 });
    const extraAmount = Number(extra_amount || 0);
    if (!Number.isFinite(extraAmount) || extraAmount < 0) return NextResponse.json({ error: 'Extra Amount cannot be negative' }, { status: 400 });
    if (!amount || amount <= 0) return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 });
    if (!date) return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    if (!method) return NextResponse.json({ error: 'Method is required' }, { status: 400 });
    if (!coverage_start_month || !coverage_end_month) {
      return NextResponse.json({ error: 'Coverage month range is required' }, { status: 400 });
    }
    if (coverage_start_month > coverage_end_month) {
      return NextResponse.json({ error: 'Coverage start month must be before end month' }, { status: 400 });
    }
    if (!collected_by) return NextResponse.json({ error: 'Collector is required' }, { status: 400 });

    // Validate pledge change if provided
    if (pledge_change_amount !== undefined && pledge_change_amount !== null) {
      if (pledge_change_amount <= 0) {
        return NextResponse.json({ error: 'Pledge amount must be positive' }, { status: 400 });
      }
      if (!pledge_effective_month) {
        return NextResponse.json({ error: 'Pledge effective month is required when changing pledge' }, { status: 400 });
      }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabaseServiceKey = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseServiceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const cookieStore = await cookies();
    const tokenCookie = cookieStore.getAll().find((c) => /^sb-.*-auth-token$/.test(c.name));
    const rawToken = tokenCookie?.value || '';
    let accessToken = rawToken;
    if (rawToken.startsWith('base64-')) {
      try {
        const json = Buffer.from(rawToken.slice(7), 'base64url').toString('utf8');
        const parsed = JSON.parse(json);
        accessToken = typeof parsed?.access_token === 'string' ? parsed.access_token : '';
      } catch {
        accessToken = '';
      }
    }

    // Auth client (to check user role)
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });

    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: userData } = await authClient.from('users').select('role').eq('id', user.id).single();
    if (userData?.role !== 'admin' && userData?.role !== 'treasurer') {
      return NextResponse.json({ error: 'Only staff can create payments' }, { status: 403 });
    }

    // Service role client for RPC calls
    const adminClient = createClient(supabaseUrl, supabaseServiceKey!);

    // Validate member exists
    const { data: member } = await adminClient
      .from('members')
      .select('id')
      .eq('id', member_id)
      .single();
    if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

    // Validate collector exists
    const { data: collector } = await adminClient
      .from('users')
      .select('id')
      .eq('id', collected_by)
      .single();
    if (!collector) return NextResponse.json({ error: 'Collector not found' }, { status: 404 });

    // Call the atomic RPC function
    const { data, error } = await adminClient.rpc('save_payment_entry', {
      p_member_id: member_id,
      p_amount: amount,
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

    if (error) {
      console.error('[save_payment_entry] RPC error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data) return NextResponse.json({ error: 'Payment creation failed' }, { status: 500 });

    return NextResponse.json({ success: true, payment_id: data });
  } catch (err: any) {
    console.error('[save_payment_entry] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    const {
      payment_id,
      amount,
      coverage_start_month,
      coverage_end_month,
      note,
    } = body as {
      payment_id: string;
      amount: number;
      coverage_start_month: string;
      coverage_end_month: string;
      note?: string;
    };

    if (!payment_id) return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 });
    if (!amount || amount <= 0) return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 });
    if (!coverage_start_month || !coverage_end_month) {
      return NextResponse.json({ error: 'Coverage month range is required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabaseServiceKey = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseServiceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const cookieStore = await cookies();
    const tokenCookie = cookieStore.getAll().find((c) => /^sb-.*-auth-token$/.test(c.name));
    const rawToken = tokenCookie?.value || '';
    let accessToken = rawToken;
    if (rawToken.startsWith('base64-')) {
      try {
        const json = Buffer.from(rawToken.slice(7), 'base64url').toString('utf8');
        const parsed = JSON.parse(json);
        accessToken = typeof parsed?.access_token === 'string' ? parsed.access_token : '';
      } catch {
        accessToken = '';
      }
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });

    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: userData } = await authClient.from('users').select('role').eq('id', user.id).single();
    if (userData?.role !== 'admin' && userData?.role !== 'treasurer') {
      return NextResponse.json({ error: 'Only staff can edit payments' }, { status: 403 });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey!);

    // Validate payment exists and belongs to a valid member
    const { data: donation } = await adminClient
      .from('donations')
      .select('id, member_id')
      .eq('id', payment_id)
      .single();
    if (!donation) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });

    // Call the reallocation RPC
    const { error } = await adminClient.rpc('reallocate_payment', {
      p_payment_id: payment_id,
      p_amount: amount,
      p_coverage_start: coverage_start_month,
      p_coverage_end: coverage_end_month,
      p_note: note || null,
    });

    if (error) {
      console.error('[reallocate_payment] RPC error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, payment_id });
  } catch (err: any) {
    console.error('[reallocate_payment] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
