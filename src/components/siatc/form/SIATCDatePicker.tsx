import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { cn } from '../../../utils/cn';
import { SIATC_THEME } from '../../../utils/siatc-theme';

export interface SIATCDatePickerProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const SIATCDatePicker = forwardRef<HTMLInputElement, SIATCDatePickerProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <input
        type="date"
        ref={ref}
        className={cn(
          SIATC_THEME.COMPONENTS.INPUT,
          "[&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60 hover:[&::-webkit-calendar-picker-indicator]:opacity-100",
          error && "border-rose-500 focus:ring-rose-500/20 focus:border-rose-500",
          className
        )}
        {...props}
      />
    );
  }
);
SIATCDatePicker.displayName = 'SIATCDatePicker';
