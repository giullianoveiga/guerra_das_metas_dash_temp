import { NextRequest, NextResponse } from 'next/server';
import { DbService } from '@/lib/db/db-service';

export async function POST(req: NextRequest) {
  try {
    await DbService.deleteAllData();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API Error (clear settings):', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}