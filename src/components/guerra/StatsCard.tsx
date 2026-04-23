'use client';

import React from 'react';
import { cn, getProgressColor } from '@/lib/guerra-utils';

interface StatsCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  progress?: number;
  variant?: 'default' | 'secondary' | 'tertiary' | 'primary-container';
  className?: string;
}

export function StatsCard({ 
  label, 
  value, 
  subValue, 
  progress, 
  variant = 'default',
  className 
}: StatsCardProps) {
  const variants = {
    default: 'bg-muted/30 border-none',
    secondary: 'bg-muted/30 border-l-4 border-secondary',
    tertiary: 'bg-muted/30 border-l-4 border-accent',
    'primary-container': 'bg-primary/10 border-none',
  };

  const textColors = {
    default: 'text-foreground',
    secondary: 'text-secondary',
    tertiary: 'text-accent',
    'primary-container': 'text-primary',
  };

  // Lógica para ajustar o tamanho da fonte dinamicamente baseado no comprimento do texto
  const getValueFontSize = (val: string | number) => {
    const length = String(val).length;
    if (length > 15) return 'text-lg md:text-xl';
    if (length > 12) return 'text-xl md:text-2xl';
    if (length > 10) return 'text-2xl md:text-3xl';
    return 'text-4xl';
  };

  return (
    <div className={cn("p-6 flex flex-col gap-4 relative overflow-hidden group min-h-[140px] justify-center", variants[variant], className)}>
      <span className={cn("font-label text-[10px] uppercase tracking-widest", variant === 'primary-container' ? 'text-primary/70' : 'text-foreground/60')}>
        {label}
      </span>
      <span className={cn(
        "font-headline font-bold leading-none transition-all duration-300", 
        getValueFontSize(value),
        textColors[variant]
      )}>
        {value}
      </span>
      {subValue && (
        <span className={cn("text-[10px] font-label uppercase", variant === 'secondary' ? 'text-secondary' : 'text-foreground/60')}>
          {subValue}
        </span>
      )}
      {progress !== undefined && (
        <div className="h-1 bg-muted w-full mt-2">
          <div 
            className={cn("h-full transition-all duration-1000", getProgressColor(progress))}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
