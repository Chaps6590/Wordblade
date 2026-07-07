export function CollapsibleBattlePanel({ className = '', title, children, defaultOpen = false }) {
  return (
    <details className={`collapsible-battle-panel ${className}`} open={defaultOpen}>
      <summary>{title}</summary>
      <div className="collapsible-battle-panel__content">
        {children}
      </div>
    </details>
  )
}
