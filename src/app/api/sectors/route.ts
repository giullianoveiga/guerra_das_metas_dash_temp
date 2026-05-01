import { NextResponse } from 'next/server';
import * as sqlite from '@/lib/db/sqlite';

export async function GET() {
  try {
    const sectors = sqlite.getAllSectors();
    return NextResponse.json({ sectors });
  } catch (error: any) {
    console.error('API Error (list sectors):', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
