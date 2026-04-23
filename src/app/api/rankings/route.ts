import { NextRequest, NextResponse } from 'next/server';
import { DbService } from '@/lib/db/db-service';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'monthly';
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
  const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));

  try {
    if (type === 'annual') {
      const data = await DbService.getAnnualRanking(year);
      return NextResponse.json(data);
    } else {
      const data = await DbService.getMonthlyRanking(year, month);
      return NextResponse.json(data);
    }
  } catch (error: any) {
    console.error('API Error (rankings):', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
