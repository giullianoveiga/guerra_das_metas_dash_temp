import { NextResponse } from 'next/server';
import { DbService } from '@/lib/db/db-service';

export async function GET() {
  try {
    const sectors = await DbService.getAllSectors();
    return NextResponse.json({ sectors });
  } catch (error: any) {
    console.error('API Error (list sectors):', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
