import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execFilePromise = promisify(execFile);

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // Fetch donation details
  const { data: donation, error } = await supabase
    .from('donations')
    .select('*, members(name)')
    .eq('id', id)
    .single();

  if (error || !donation) {
    return new NextResponse('Donation not found', { status: 404 });
  }

  // Security check: Admins can see all, members only their own
  const { data: userData } = await supabase
    .from('users')
    .select('role, member_id')
    .eq('id', user.id)
    .single();

  const isAdmin = userData?.role === 'admin' || userData?.role === 'treasurer';
  const isOwner = userData?.member_id === donation.member_id;
  
  if (!isAdmin && !isOwner) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  // Prepare temporary path for PDF
  const tempDir = path.join(process.cwd(), 'tmp');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
  const jpgPath = path.join(tempDir, `receipt_${id}.jpg`);

  const scriptPath = path.join(process.cwd(), 'scripts', 'receipt_generator.py');
  
  try {
    const args = [
      scriptPath,
      '--receipt', donation.receipt_no || 'N/A',
      '--name', donation.members?.name || 'Guest',
      '--amount', String(donation.amount),
      '--date', donation.date,
      '--method', donation.method || 'Cash',
      '--received', donation.received_by || 'Foundation',
      '--output', jpgPath
    ];
    await execFilePromise('python3', args);

    const jpgBuffer = fs.readFileSync(jpgPath);
    
    // Cleanup
    fs.unlinkSync(jpgPath);

    return new NextResponse(jpgBuffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Disposition': `attachment; filename="receipt_${donation.receipt_no || id}.jpg"`,
        'Content-Length': jpgBuffer.length.toString(),
      },
    });
  } catch (err) {
    console.error('Receipt Generation Error:', err);
    return new NextResponse('Error generating receipt', { status: 500 });
  }
}
