import { NextRequest, NextResponse } from 'next/server';
import { DbService } from '@/lib/db/db-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const data = await DbService.getSectorDetails(id);
    if (!data) {
      return NextResponse.json({ error: 'Setor não encontrado' }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (error: any) {
    console.error(`API Error (sector ${id}):`, error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
