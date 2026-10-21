import * as Dialog from '@radix-ui/react-dialog';
import { X, LoaderCircle, AlertCircle, Check } from 'lucide-react';
import type { ReactNode } from 'react';

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  className = '',
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className={`dialog-content ${className}`}>
          <div className="dialog-heading">
            <div>
              <Dialog.Title>{title}</Dialog.Title>
              {description && <Dialog.Description>{description}</Dialog.Description>}
              {!description && <Dialog.Description className="sr-only">{title}</Dialog.Description>}
            </div>
            <Dialog.Close className="icon-button close-button" aria-label="关闭">
              <X size={19} />
            </Dialog.Close>
          </div>
          <div className="dialog-body">{children}</div>
          {footer && <div className="dialog-footer">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={`switch ${checked ? 'is-on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}

export function Spinner({ label = '正在加载' }: { label?: string }) {
  return (
    <span className="loading-inline" role="status">
      <LoaderCircle size={18} className="spin" />
      <span>{label}</span>
    </span>
  );
}

export function Notice({ children, danger = false }: { children: ReactNode; danger?: boolean }) {
  return (
    <div className={`inline-notice ${danger ? 'danger' : ''}`} role={danger ? 'alert' : 'status'}>
      <AlertCircle size={17} />
      <span>{children}</span>
    </div>
  );
}

export function Toast({
  message,
  error,
  onClose,
}: {
  message: string;
  error: boolean;
  onClose: () => void;
}) {
  return (
    <div className={`toast ${error ? 'error' : ''}`} role={error ? 'alert' : 'status'}>
      {error ? <AlertCircle size={19} /> : <Check size={19} />}
      <span>{message}</span>
      <button className="icon-button" aria-label="关闭通知" onClick={onClose}>
        <X size={16} />
      </button>
    </div>
  );
}
