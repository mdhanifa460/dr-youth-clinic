import type { ReactNode } from 'react';

// The one heading pattern for page sections: small eyebrow, serif title, short intro,
// and an optional action aligned to the right on larger screens.
export default function SectionHeader({ eyebrow, title, description, action, center = false, className = '' }: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  center?: boolean;
  className?: string;
}) {
  return (
    <div className={`mb-8 md:mb-12 flex flex-col gap-4 ${center ? 'items-center text-center' : 'md:flex-row md:items-end md:justify-between'} ${className}`}>
      <div className="max-w-2xl">
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h2 className="heading-section">{title}</h2>
        {description && <p className="mt-3 text-base leading-relaxed text-text-secondary">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
