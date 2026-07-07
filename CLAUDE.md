# Wordblade — Frontend (contexto para Claude Code)

RPG de combate por palabras. El jugador forma palabras en español con una grilla
de 16 letras para atacar enemigos; ciertas letras activan habilidades (curar,
escudo, veneno, rayo, sangrado…) y los enemigos bloquean, maldicen, envenenan o
devoran letras. Hay modo **Aventura** (PvE por turnos) y modo **Multiplayer**
(duelo 1v1 en tiempo real).

> Filosofía del proyecto: "Primero mecánica divertida. Después arte, historia y expansión."

## Stack

- **Vite 8** + **React 19** (UI) — menús, grilla, input, barras de vida, timer, log.
- **Phaser 3.90** — solo render y animaciones de la batalla (placeholders geométricos + sprites PNG).
- **Zustand 5** — estado global de la batalla (`src/game/state/useBattleStore.js`).
- **react-router-dom 7** — ruteo de navegador (SPA).
- **socket.io-client 4** — duelos multiplayer.
- **vite-plugin-pwa** — instalable en Android sobre HTTPS.
- Linter: **oxlint** (`npm run lint`).

Node `^20.19 || >=22.12`.

## Comandos

```bash
npm install
npm run dev      # Vite, puerto 5173. Proxya /api y /socket.io a localhost:3001
npm run build    # genera dist/ con .env.production (VITE_API_URL apunta a la API)
npm run lint     # oxlint
npm run preview
```

## Arquitectura y flujo

React lleva la UI y el estado; Phaser solo anima. **Se comunican por eventos**:
la lógica emite `battle-event` en `src/game/phaser/eventBus.js` y la escena de
Phaser (`scenes/BattleScene.js`) los anima. Phaser nunca muta el estado del juego.

El motor de batalla (`src/game/core/`) son **funciones puras** que reciben un
`battleState`, lo procesan y devuelven una lista de `events` (para el log de React
y las animaciones de Phaser). El store clona el estado (`structuredClone`), corre
el motor sobre el clon y publica el resultado.

```
Usuario escribe/toca letras
   → useBattleStore.submitWord()
   → validateWordHybrid() (valida ortografía por API)
   → playWord(draft, word, validation)   [battleEngine.js]
       → calculateDamage + applyLetterEffects   (ataque de Kael)
       → checkBattleEnd
       → runEnemyPhase (reacciones + estados + enemyTurn)   [enemyAI.js]
       → advanceTurn
   → set({ battle: draft })
   → eventBus.emit('battle-event', …) por cada evento → Phaser anima
```

### Estructura de carpetas

- `src/app/` — `App.jsx` (rutas protegidas + auth), `routes.jsx`.
- `src/auth/` — `AuthContext` (sesión con token Bearer en localStorage), `useAuth`.
- `src/pages/` — `LoginPage`, `MainMenu`, `ScenarioSelect`, `BattlePage`, `ResultPage`, `MultiplayerPage`.
- `src/components/` — HUD, grilla (`BattleBoardPanel`, `LetterTile`), `WordInput`, `HealthBar`, `TimerBar`, `BattleLog`, `SkillLegend`, paneles colapsables, botón PWA.
- `src/game/core/` — **motor** (ver abajo).
- `src/game/data/` — datos del juego (letras, enemigos, escenarios, héroes, diccionario).
- `src/game/state/useBattleStore.js` — store Zustand de la batalla.
- `src/game/phaser/` — `PhaserGame.jsx`, `eventBus.js`, `scenes/` (Boot, Battle), `effects/` (slash, screenShake, damageText).
- `src/services/` — `api.js` (cliente REST), `duelSocket.js` (Socket.IO).
- `src/styles/` — CSS (global, menu, battle).

### El motor (`src/game/core/`)

| Archivo | Responsabilidad |
| --- | --- |
| `battleEngine.js` | Orquesta el turno completo. `createBattleState`, `playWord`, `swapLetterRack`, `tickTime`. |
| `damageCalculator.js` | Daño físico: puntos por letra + bonus por longitud + crítico (usar TODAS las letras = ×1.5) − reducción por letras malditas (×0.7 c/u). `attackTier`: 10+ especial, 12+ definitivo. |
| `letterEffects.js` | Efectos de letras y estados (sangrado/veneno/quemadura). `EFFECT_VALUES` tiene todos los números. |
| `enemyAI.js` | IA del enemigo: interpreta las `abilities` de `enemies.js`. Reacciones a la palabra, turno de habilidades, ataque, fases de jefe. |
| `turnManager.js` | Reposición de la grilla, tick de bloqueos, `checkBattleEnd`, avance entre encuentros. |
| `wordValidator.js` | Validación de palabras. `validateWordHybrid` (async, con API), `validateWord` (sync, solo tests). |

## Reglas de juego clave

- **Grilla de 16 letras.** Una palabra válida consume el tablero completo y se
  regenera con la siguiente palabra oculta del desafío (`refreshLetterRack`).
- **Palabra oculta:** cada tablero se arma alrededor de una palabra secreta.
  Descubrirla da +35 de daño (`HIDDEN_WORD_BONUS`).
- **Letras con habilidad** (ver `src/game/data/letters.js`): A cura, O escudo,
  E energía (a 5 → +10 daño), S ataque rápido, M golpe pesado, R sangrado,
  P veneno, F quemadura, T rompe defensa, Ñ daño ancestral (+12, ignora escudo),
  Z rayo (+15 mágico, ignora escudo).
- **Fichas de color** dan daño bonus: azul +3, violeta +5, oro +8.
- **Crítico:** usar todas las letras no bloqueadas de la grilla (×1.5).
- **Palabra inválida** → Kael pierde el turno y el enemigo actúa.
- **"Cambiar letras"** → regenera la grilla vía API pero cuesta el turno
  (solo si la API responde; si falla, no pasa nada).

## Escenario actual

Un solo escenario `forest_easy` (**Claro del Bosque**, 90s, 16 letras, palabras
de 8) con **3 encuentros encadenados**: Garrapata Exploradora → Araña del Bosque
→ Serpiente Gigante (jefe). Al derrotar un enemigo aparece el siguiente en la
misma batalla (`checkBattleEnd` → `enemySpawn`). Hay enemigos y jefes extra ya
definidos en `enemies.js` (Reina Garrapata con fases, Devorador de Letras, Escriba
Maldito, Araña del Silencio, Guardián del Códice, Plaga Rúnica) listos para nuevos
escenarios.

> Nota: el `README.md` menciona 3 escenarios separados; el código actual tiene 1
> escenario con 3 encuentros. Este `CLAUDE.md` refleja el código.

## Validación de palabras (importante)

`validateWordHybrid` en `wordValidator.js`:
1. **Estructura** (sin red): longitud ≥ 3, no repetida, letras disponibles/no bloqueadas.
2. **Palabras de confianza**: las que armaron el tablero (vienen de la API de desafíos) se aceptan sin consultar ortografía.
3. **Ortografía por API**: `POST /api/words/check` (LanguageTool vía backend). NO hay diccionario local; restaura tildes (CAMION → CAMIÓN).
4. **API caída** → `{ retryable: true }`: la palabra ni se acepta ni se rechaza y **el jugador NO pierde el turno**. Durante la validación el **timer se pausa** (`pending` en el store).

## Autenticación

Login con **código de acceso compartido** + nombre + raza (LOBO/TIGRE/AGUILA).
El backend devuelve un `token`; se guarda en `localStorage` (`wordblade-session`)
y se manda como `Authorization: Bearer`. Un 401 dispara `UNAUTHORIZED_EVENT` y
limpia la sesión. Rutas protegidas por `ProtectedRoute` en `App.jsx`.

## Multiplayer (duelos 1v1)

`MultiplayerPage.jsx` + `src/services/duelSocket.js` (Socket.IO, mismo token que
la API). Flujo por eventos: `duel:create` / `duel:join` (código de 5 chars) →
`duel:ready` → `duel:start` (grilla única generada por el server) → `duel:word`
(cada palabra válida daña al rival) → `duel:hit` / `duel:end`. La lógica y el
reloj viven en el server; el cliente solo reporta palabra + daño (ver la API).

## Producción

- Juego: **https://wordblade.chapstech.com** — API: **https://wordblade-api.chapstech.com**.
- `dist/` estático; el server debe hacer fallback a `index.html` (rutas de navegador).
- PWA solo se instala sobre **HTTPS** (service worker).
- El backend debe tener `CORS_ORIGIN` con el origen del juego.

## Convenciones

- Comentarios y textos de UI/log **en español**.
- El motor no depende de React/Phaser (usa `import.meta.env?.…` con `?.` para poder correr en Node).
- Mutar solo el `draft` clonado dentro del motor; publicar con `set()` en el store.
- Nombres de letras y palabras se normalizan con `normalizeChallengeWord` / `normalizeWord` (mayúsculas, tildes plegadas salvo Ñ).
```
