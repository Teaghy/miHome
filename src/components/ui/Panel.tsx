import type { ReactNode } from 'react';
import { ArrowUpRight, Cable, Plus } from 'lucide-react';

export function Panel({
  title,
  eyebrow,
  action,
  children,
  className = '',
}: {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-heading">
        <div>
          {eyebrow && <span className="panel-eyebrow">{eyebrow}</span>}
          <h2>{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
export function PanelLink({
  onClick,
  label = '查看全部',
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button className="panel-link" onClick={onClick}>
      {label}
      <ArrowUpRight size={15} />
    </button>
  );
}
export function PageHeading({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
export function AddButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button className="button primary" onClick={onClick} disabled={disabled}>
      <Plus size={17} />
      {children}
    </button>
  );
}
export function ServiceEmpty({
  title = '等待接入家庭数据',
  description = '接入对应设备或服务后，这里的状态将自动更新。',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="service-empty">
      <Cable size={30} strokeWidth={1.3} />
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
