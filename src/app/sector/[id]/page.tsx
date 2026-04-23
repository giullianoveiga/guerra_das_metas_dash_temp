import { SectorDetail } from "@/components/guerra/SectorDetail";
import { Suspense } from 'react';
import { GuerraLayoutWrapper } from '@/components/guerra/GuerraLayoutWrapper';

export default async function SectorDetailPage({ 
    params 
  }: { 
    params: Promise<{ id: string }> 
  }) {
    const { id } = await params;

    return (
        <GuerraLayoutWrapper>
            <Suspense fallback={<div className="flex items-center justify-center h-full">Carregando dados táticos...</div>}>
                {id ? (
                    <SectorDetail sectorId={id} />
                ) : (
                    <div className="h-screen bg-gray-900 text-white flex items-center justify-center">
                        <p>ID do setor não encontrado na URL.</p>
                    </div>
                )}
            </Suspense>
        </GuerraLayoutWrapper>
    );
}
