import { SKILL_LETTERS } from '../game/data/letters.js'

// Leyenda de habilidades por letra, colapsable.

export function SkillLegend() {
  return (
    <details className="skill-legend">
      <summary>Habilidades de letras</summary>
      <ul>
        {SKILL_LETTERS.map((skill) => (
          <li key={skill.value}>
            <span className="skill-letter">{skill.value}</span>
            <span className="skill-name">{skill.effectName}:</span> {skill.effectDesc}
            <span className="skill-points"> ({skill.points} pts)</span>
          </li>
        ))}
      </ul>
      <p className="legend-states">
        Estados: <span className="state-locked">🔒 bloqueada</span> ·{' '}
        <span className="state-poisoned">☠ envenenada</span> ·{' '}
        <span className="state-cursed">✦ maldita</span>
      </p>
    </details>
  )
}
