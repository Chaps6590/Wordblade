# Wordblade

Combate RPG por palabras. El jugador forma palabras con las letras disponibles para atacar enemigos; algunas letras activan habilidades (curar, escudo, veneno, rayo...) y los enemigos pueden bloquear, maldecir o envenenar letras.

> “Primero mecánica divertida. Después arte, historia y expansión.”

Vite + React + Phaser 3 + PWA. El backend (resultados y validación de palabras) vive en [Wordblade-api](https://github.com/Chaps6590/Wordblade-api).

## Arquitectura

- **React** maneja la UI: menú, letras, input, vida, timer y log.
- **Phaser** solo renderiza y anima la batalla (placeholders geométricos por ahora).
- La lógica vive en `src/game/core/` (motor, validador, daño, efectos, IA, turnos).
- Los datos están en `src/game/data/` (letras, enemigos, escenarios, diccionario).
- El estado global de batalla está en `src/game/state/useBattleStore.js` (Zustand).
- React y Phaser se comunican por eventos (`src/game/phaser/eventBus.js`): la lógica emite, Phaser anima.

## Cómo correr

```bash
pnpm install
pnpm dev   # puerto 5173
```

En dev, Vite proxya `/api` a `http://localhost:3001` (el backend). El juego funciona igual con el backend apagado: valida solo con el diccionario local y no guarda resultados.

## Validación de palabras

En dos pasos (`validateWordHybrid` en `src/game/core/wordValidator.js`):

1. **Diccionario del juego** (`src/game/data/dictionary-es.js`): si la palabra está, se acepta directo, sin red.
2. **LanguageTool** (vía `POST /api/words/check` del backend): si no está en el diccionario, se consulta la ortografía. Distingue *mal escrita* (muestra sugerencias en el log) de *bien escrita pero no aceptada en el juego*.

## Escenarios

1. **Claro del Bosque** (fácil, 90s) — Garrapata Exploradora
2. **Bosque Maldito** (media, 75s) — Garrapata Chamán (bloquea y maldice letras)
3. **Templo de la Reina Garrapata** (alta, 60s) — jefa con 3 fases

## Producción

El juego vive en **https://wordblade.chapstech.com** y la API en **https://wordblade-api.chapstech.com**.

```bash
pnpm build   # genera dist/ usando .env.production (VITE_API_URL apunta a la API)
```

`dist/` se sirve como estático. Como el router usa rutas de navegador (`/battle/...`), el servidor debe devolver `index.html` para cualquier ruta. Ejemplo con nginx:

```nginx
server {
  server_name wordblade.chapstech.com;
  root /var/www/wordblade/dist;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

Dos cosas a tener en cuenta:

- La PWA solo se puede instalar sobre **HTTPS** (el service worker no corre en http).
- El backend debe tener `CORS_ORIGIN=https://wordblade.chapstech.com` en su `.env` para aceptar las llamadas del juego.

## Próximos pasos

Sprites y animaciones finales, sonidos, diccionario más grande, progresión, ranking, modo inglés y PWA instalable en Android (el manifest ya está configurado con `vite-plugin-pwa`).
