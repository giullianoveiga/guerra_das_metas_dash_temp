import { NextRequest, NextResponse } from 'next/server';
import { requireSettingsWriteAccess } from '@/lib/api/auth';
import { DbService } from '@/lib/db/db-service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());

    console.log('[API] GET indicators year/month:', year, month);

    const data = await DbService.getAllSectorIndicators(year, month);

    console.log('[API] GET returning:', data.length, 'setores');
    if (data.length > 0) {
      console.log('[API] GET first sector:', data[0].sectorName, 'avg:', data[0].average, 'indicators:', data[0].indicators.length);
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('API Error (get indicators):', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const unauthorized = requireSettingsWriteAccess(req);
    if (unauthorized) return unauthorized;

    const body = await req.json();
    
    console.log('[API] POST body:', JSON.stringify(body, null, 2));
    
    const { year, month, sectors } = body;

    console.log('[API] POST received:', { year, month, sectorsCount: sectors?.length });

    for (const sector of sectors) {
      const { sectorId, indicators, hasAtendimento, atendimento } = sector;
      
      console.log('[API] Salvando setor:', sectorId, 'indicators:', indicators?.length, 'atendimento:', atendimento);
      
      await DbService.saveSectorIndicators(sectorId, year, month, indicators, hasAtendimento || false);
    }

    await DbService.getMonthlyRanking(year, month);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API Error (save indicators):', error);
    console.error('Stack:', error.stack);
    return NextResponse.json({ 
      success: false, 
      error: 'Erro interno do servidor: ' + error.message
    }, { status: 500 });
  }
}