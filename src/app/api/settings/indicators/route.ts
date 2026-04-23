import { NextRequest, NextResponse } from 'next/server';
import { upsertSectorIndicators, getAllSectorIndicators } from '@/lib/db/indicators-db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());

    const refDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    console.log('[API] GET indicators refDate:', refDate);

    const data = getAllSectorIndicators(refDate);

    console.log('[API] GET returning:', data.length, 'setores');
    if (data.length > 0) {
      console.log('[API] GET first sector:', data[0].sectorName, 'avg:', data[0].average, 'indicators:', data[0].indicators.length);
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('API Error (get indicators):', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { year, month, sectors } = body;

    console.log('[API] POST received:', { year, month, sectorsCount: sectors?.length });

    if (!year || !month || !sectors || !Array.isArray(sectors)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Dados inválidos' 
      }, { status: 400 });
    }

    const refDate = `${year}-${month.toString().padStart(2, '0')}-01`;

    // Salvar indicadores de cada setor diretamente no novo banco
    for (const sector of sectors) {
      const { sectorId, indicators, hasAtendimento, atendimento } = sector;
      
      console.log('[API] Salvando setor:', sectorId, 'indicators:', indicators?.length, 'atendimento:', atendimento);
      
      if (sectorId && indicators && Array.isArray(indicators)) {
        upsertSectorIndicators(sectorId, refDate, indicators, hasAtendimento || false, atendimento || { note: '', efficiency: '' });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API Error (save indicators):', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}