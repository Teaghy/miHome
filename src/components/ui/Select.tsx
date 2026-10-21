import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';

type SelectProps = Omit<ComponentProps<typeof SelectPrimitive.Trigger>, 'value' | 'onChange'> & {
  value: string | number;
  onValueChange: (value: string) => void;
  children: ReactNode;
  name?: string;
};

// Prefix every value so the application's empty-string choice remains a real item.
const encodeValue = (value: string | number) => `value:${value}`;

export function Select({
  value,
  onValueChange,
  children,
  disabled,
  name,
  className = '',
  ...props
}: SelectProps) {
  return (
    <SelectPrimitive.Root
      value={encodeValue(value)}
      onValueChange={(next) => onValueChange(next.slice('value:'.length))}
      disabled={disabled}
      name={name}
    >
      <SelectPrimitive.Trigger className={`ui-select ${className}`} {...props}>
        <SelectPrimitive.Value />
        <SelectPrimitive.Icon className="ui-select-icon">
          <ChevronDown size={14} />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <div className="ui-select-portal">
          <SelectPrimitive.Content
            className="ui-select-content"
            position="popper"
            sideOffset={6}
            collisionPadding={12}
          >
            <SelectPrimitive.ScrollUpButton className="ui-select-scroll">
              <ChevronUp size={14} />
            </SelectPrimitive.ScrollUpButton>
            <SelectPrimitive.Viewport className="ui-select-viewport">
              {children}
            </SelectPrimitive.Viewport>
            <SelectPrimitive.ScrollDownButton className="ui-select-scroll">
              <ChevronDown size={14} />
            </SelectPrimitive.ScrollDownButton>
          </SelectPrimitive.Content>
        </div>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

export function SelectOption({
  value,
  children,
  ...props
}: Omit<ComponentProps<typeof SelectPrimitive.Item>, 'value'> & { value: string | number }) {
  return (
    <SelectPrimitive.Item value={encodeValue(value)} className="ui-select-option" {...props}>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="ui-select-check">
        <Check size={14} />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}
