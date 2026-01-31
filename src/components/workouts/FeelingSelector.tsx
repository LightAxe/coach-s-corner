import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

export const FEELING_OPTIONS = [
  { value: 'great', label: 'Great', emoji: '💪' },
  { value: 'strong', label: 'Strong', emoji: '😊' },
  { value: 'average', label: 'Average', emoji: '😐' },
  { value: 'tired', label: 'Tired', emoji: '😓' },
  { value: 'weak', label: 'Weak', emoji: '😫' },
] as const;

interface FeelingSelectorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function FeelingSelector({ value, onChange, className }: FeelingSelectorProps) {
  const isPresetValue = FEELING_OPTIONS.some(opt => opt.value === value);
  const selectedPreset = isPresetValue ? value : null;
  const customText = !isPresetValue ? value : '';

  const handlePresetClick = (presetValue: string) => {
    if (selectedPreset === presetValue) {
      // Deselect if clicking the same one
      onChange('');
    } else {
      onChange(presetValue);
    }
  };

  const handleCustomChange = (text: string) => {
    onChange(text);
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-wrap gap-2">
        {FEELING_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => handlePresetClick(option.value)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
              'border hover:border-primary/50',
              selectedPreset === option.value
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-muted/50 text-muted-foreground border-border'
            )}
          >
            <span>{option.emoji}</span>
            <span>{option.label}</span>
          </button>
        ))}
      </div>
      <Input
        placeholder="Or describe how you felt..."
        value={customText}
        onChange={(e) => handleCustomChange(e.target.value)}
        className="text-sm"
      />
    </div>
  );
}

// Helper to get display text for a feeling value
export function getFeelingDisplay(value: string): string {
  const preset = FEELING_OPTIONS.find(opt => opt.value === value);
  if (preset) {
    return `${preset.emoji} ${preset.label}`;
  }
  return value;
}
