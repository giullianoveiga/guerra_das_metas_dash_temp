import { NextRequest, NextResponse } from 'next/server';
import { DbService } from '@/lib/db/db-service';
import { requireSettingsWriteAccess } from '@/lib/api/auth';

export async function POST(req: NextRequest) {
  try {
    const unauthorized = requireSettingsWriteAccess(req);
    if (unauthorized) return unauthorized;

    await DbService.deleteAllData();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API Error (clear settings):', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}
