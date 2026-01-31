import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';

interface RPESliderProps {
  value: number | null;
  onChange: (value: number | null) => void;
  className?: string;
}

const RPE_LABELS: Record<number, string> = {
  1: 'Very Light',
  2: 'Light',
  3: 'Light',
  4: 'Moderate',
  5: 'Moderate',
  6: 'Moderate',
  7: 'Hard',
  8: 'Hard',
  9: 'Very Hard',
  10: 'Max Effort',
};

const RPE_COLORS: Record<number, string> = {
  1: 'bg-green-500',
  2: 'bg-green-500',
  3: 'bg-green-400',
  4: 'bg-yellow-400',
  5: 'bg-yellow-500',
  6: 'bg-orange-400',
  7: 'bg-orange-500',
  8: 'bg-red-400',
  9: 'bg-red-500',
  10: 'bg-red-600',
};

export function RPESlider({ value, onChange, className }: RPESliderProps) {
  const displayValue = value ?? 5;
  const label = RPE_LABELS[displayValue] || '';
  const colorClass = RPE_COLORS[displayValue] || 'bg-muted';

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg',
            colorClass
          )}>
            {value ?? '-'}
          </div>
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
        {value !== null && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        )}
      </div>
      
      <Slider
        value={[displayValue]}
        onValueChange={([newValue]) => onChange(newValue)}
        min={1}
        max={10}
        step={1}
        className="w-full"
      />
      
      <div className="flex justify-between text-xs text-muted-foreground px-1">
        <span>1 - Easy</span>
        <span>10 - Max</span>
      </div>
    </div>
  );
}
