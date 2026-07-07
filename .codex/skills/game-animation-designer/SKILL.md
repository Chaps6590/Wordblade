---
name: game-animation-designer
description: Design, implement, and polish character/gameplay animations for Wordblade or similar Phaser/React games. Use when Codex needs to improve idle, attack, hit, menu, sprite-sheet, tween, VFX, timing, or game-feel animation using existing character art or generated/derived sprites.
---

# Game Animation Designer

## Workflow

1. Inspect the actual render path first: asset metadata, preload keys, scene creation, CSS menu art, and event-driven combat animation.
2. Preserve the current art direction. Derive frames from existing character art when matching style matters more than inventing a new pose.
3. Prefer layered polish:
   - Sprite-sheet frames for pose/readability changes.
   - Phaser tweens for breathing, anticipation, recoil, return-to-idle, and screen-space motion.
   - Lightweight VFX for blade glints, hit flashes, slash arcs, and impact feedback.
4. Keep animation state explicit. Name actions as `character-action`, for example `kael-idle` and `kael-attack`.
5. Provide fallbacks. Menus and scenes should still render the static portrait when a hero has no animation metadata.
6. Validate with a production build and, when possible, a browser screenshot or canvas check.

## Timing Defaults

- Idle: 4-6 frames, 5-8 fps, yoyo/repeat when the engine supports it.
- Attack: 3-5 frames, 10-16 fps, with anticipation, contact, and recovery.
- Hit reaction: 120-220 ms, small displacement, tint/flash, no long lockout.
- Menu idle: slower than combat, 3-5 seconds per loop, with reduced-motion fallback.

## Wordblade Conventions

- Store public character animation assets under `public/characters/heroes/animations/`.
- Add animation metadata to `src/game/data/heroes.js` beside each hero.
- In Phaser, load animated heroes with `this.load.spritesheet(...)` and create animations once with `this.anims.exists(...)` guards.
- In React menus, use a component fallback so animated and static heroes share the same callsite.
- Do not replace original portraits unless the user explicitly asks; keep generated frames as sibling assets.

## Sprite Derivation Notes

- For a single painted pose, use subtle transforms: vertical breathing, tiny torso scale changes, sword glint, stance angle, and forward lean.
- Avoid extreme warps that bend armor, faces, or weapons visibly.
- If exact limb motion is required, use an image-generation/editing workflow or a layered rig instead of over-warping a flat PNG.
