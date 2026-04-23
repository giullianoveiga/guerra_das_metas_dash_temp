import { NextRequest, NextResponse } from 'next/server';
import { DbService } from '@/lib/db/db-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { year, month, data } = body;

    if (!year || !month || !data || !Array.isArray(data)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Dados inválidos' 
      }, { status: 400 });
    }

    // Para cada item de dados, salvar no banco
    for (const item of data) {
      const { sectorId, goalValue, realizedValue } = item;
      
      if (sectorId && (goalValue > 0 || realizedValue > 0)) {
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
      error: error.message 
    }, { status: 500 });
  }
}