import React from 'react';
import { Label } from './Label';

interface StatCardProps {
  label: string;
  value: string;
  tone?: 'neutral' | 'good' | 'bad' | 'brand';
  subtext?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  tone = 'neutral',
  subtext,
}) => {
  const getTextColor = () => {
    switch (tone) {
      case 'good':
        return 'var(--color-success)';
      case 'bad':
        return 'var(--color-danger)';
      case 'brand':
        return 'var(--color-marigold)';
      default:
        return 'var(--color-tx1)';
    }
  };

  return (
    <div className="bg-surface border border-line rounded-md p-3">
      <Label>{label}</Label>
      <div
        className="font-mono text-mono-l font-bold"
        style={{ color: getTextColor() }}
      >
        {value}
      </div>
      {subtext && <div className="text-body-s text-tx2 mt-0.5">{subtext}</div>}
    </div>
  );
};
