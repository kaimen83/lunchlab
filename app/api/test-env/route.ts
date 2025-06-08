import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    hasCronSecret: !!process.env.CRON_SECRET,
    cronSecretLength: process.env.CRON_SECRET?.length || 0,
    // 보안상 실제 값은 노출하지 않음
    cronSecretPreview: process.env.CRON_SECRET ? 
      `${process.env.CRON_SECRET.substring(0, 8)}...` : 
      'undefined'
  });
} 