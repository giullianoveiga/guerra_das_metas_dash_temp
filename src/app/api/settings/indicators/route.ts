import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { upsertSectorIndicators, getAllSectorIndicators } from '@/lib/db/sqlite';
import { requireSettingsWriteAccess } from '@/lib/api/auth';
import { DbService } from '@/lib/db/db-service';

const IndicatorSchema = z.object({
  name: z.string().min(1),
  goal: z.number().min(0),
  realized: z.union([z.string(), z.number()]).transform(val => String(val)),
  efficiency: z.string().default('')
});

const SectorIndicatorsSchema = z.object({
  sectorId: z.number().int().positive(),
  indicators: z.array(IndicatorSchema).min(1),
  hasAtendimento: z.boolean().optional(),
  atendimento: z.object({
    note: z.string().default(''),
    efficiency: z.string().default('')
  }).default({ note: '', efficiency: '' })
});

const SaveIndicatorsSchema = z.object({
  year: z.number().int().min(2020).max(2030),
  month: z.number().int().min(1).max(12),
  sectors: z.array(SectorIndicatorsSchema).min(1)
});

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
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const unauthorized = requireSettingsWriteAccess(req);
    if (unauthorized) return unauthorized;

    const body = await req.json();
    
    const validationResult = SaveIndicatorsSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({ 
        success: false, 
        error: 'Dados inválidos',
        details: validationResult.error.errors
      }, { status: 400 });
    }

    const { year, month, sectors } = validationResult.data;

    console.log('[API] POST received:', { year, month, sectorsCount: sectors?.length });

    const refDate = `${year}-${month.toString().padStart(2, '0')}-01`;

    // Salvar indicadores de cada setor diretamente no novo banco
    for (const sector of sectors) {
      const { sectorId, indicators, hasAtendimento, atendimento } = sector;
      
      console.log('[API] Salvando setor:', sectorId, 'indicators:', indicators?.length, 'atendimento:', atendimento);
      
      upsertSectorIndicators(sectorId, refDate, indicators, hasAtendimento || false, atendimento || { note: '', efficiency: '' });
    }

    await DbService.getMonthlyRanking(year, month);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API Error (save indicators):', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}
