import { SKILL_LETTERS } from '../game/data/letters.js'

// Leyenda de habilidades por letra.

export function SkillLegend() {
  return (
    <div className="skill-legend">
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
      <p className="legend-bonuses">Colores: azul +3 · violeta +5 · dorado +8 de daño</p>
    </div>
  )
}
