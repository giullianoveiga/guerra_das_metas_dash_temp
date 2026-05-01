import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { DbService } from '@/lib/db/db-service';
import { requireSettingsWriteAccess } from '@/lib/api/auth';

const SaveSettingsSchema = z.object({
  year: z.number().int().min(2020).max(2030),
  month: z.number().int().min(1).max(12),
  data: z.array(z.object({
    sectorId: z.number().int().positive(),
    goalValue: z.number().min(0),
    realizedValue: z.number().min(0)
  })).min(1)
});

export async function POST(req: NextRequest) {
  try {
    const unauthorized = requireSettingsWriteAccess(req);
    if (unauthorized) return unauthorized;

    const body = await req.json();
    
    const validationResult = SaveSettingsSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({ 
        success: false, 
        error: 'Dados inválidos',
        details: validationResult.error.errors
      }, { status: 400 });
    }

    const { year, month, data } = validationResult.data;

    // Para cada item de dados, salvar no banco
    for (const item of data) {
      const { sectorId, goalValue, realizedValue } = item;
      
      if (goalValue > 0 || realizedValue > 0) {
        // Pegar o primeiro sub-setor do setor (simplificação)
        const subsectors = await DbService.getSubsectorsBySector(sectorId);
        
        if (subsectors && subsectors.length > 0) {
          const subsector = subsectors[0] as any;
          await DbService.upsertPerformanceData(
            sectorId,
            subsector.subsector_id,
            year,
            month,
            goalValue,
            realizedValue
          );
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API Error (save settings):', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}
