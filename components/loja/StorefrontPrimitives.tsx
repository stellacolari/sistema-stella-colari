import type { ReactNode } from "react";

type StorePageHeaderProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  aside?: ReactNode;
  children?: ReactNode;
};

export function StorePageHeader({
  eyebrow,
  title,
  description,
  aside,
  children,
}: StorePageHeaderProps) {
  return (
    <header className="store-page-header">
      <div className="store-page-header__inner">
        <div
          className={`store-page-header__grid ${
            aside ? "store-page-header__grid--aside" : ""
          }`.trim()}
        >
          <div className="store-page-header__copy">
            {eyebrow ? (
              <p className="store-eyebrow">{eyebrow}</p>
            ) : null}
            <h1 className="store-page-title">{title}</h1>
            {description ? (
              <p className="store-page-lead">{description}</p>
            ) : null}
          </div>
          {aside ? <div className="store-page-header__aside">{aside}</div> : null}
        </div>
        {children}
      </div>
    </header>
  );
}

type StoreSectionHeaderProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  className?: string;
};

export function StoreSectionHeader({
  eyebrow,
  title,
  description,
  className = "",
}: StoreSectionHeaderProps) {
  return (
    <header className={`store-section-header ${className}`.trim()}>
      {eyebrow ? <p className="store-eyebrow">{eyebrow}</p> : null}
      <h2 className="store-section-title">{title}</h2>
      {description ? (
        <p className="store-section-lead">{description}</p>
      ) : null}
    </header>
  );
}

type StoreEmptyStateProps = {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  busy?: boolean;
};

export function StoreEmptyState({
  icon,
  title,
  description,
  action,
  busy = false,
}: StoreEmptyStateProps) {
  return (
    <section
      className="store-empty-state"
      aria-busy={busy || undefined}
      aria-live={busy ? "polite" : undefined}
    >
      {icon ? <div className="store-empty-state__icon">{icon}</div> : null}
      <h2 className="store-empty-state__title">{title}</h2>
      {description ? (
        <p className="store-empty-state__description">{description}</p>
      ) : null}
      {action ? <div className="store-empty-state__action">{action}</div> : null}
    </section>
  );
}
