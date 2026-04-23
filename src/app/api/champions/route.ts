import { NextRequest, NextResponse } from 'next/server';
import { DbService } from '@/lib/db/db-service';

export async function GET() {
  try {
    const data = await DbService.getChampions();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('API Error (champions):', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
