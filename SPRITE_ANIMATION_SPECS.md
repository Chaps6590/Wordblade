# Sprite Animation Specs

Referencia para generar nuevas animaciones de heroes en Wordblade.

## Formato Base

- Tipo: sprite sheet horizontal.
- Archivo: PNG con fondo transparente.
- Tamano total de la hoja: `3072x512 px`.
- Cantidad de frames: `6`.
- Tamano de cada frame: `512x512 px`.
- Distribucion: una sola fila horizontal.

```txt
[512x512][512x512][512x512][512x512][512x512][512x512]
Total: 3072x512
```

## Cortes De Frame

Cada frame ocupa `512 px` de ancho. Los cortes en X son:

```txt
Frame 1: x=0
Frame 2: x=512
Frame 3: x=1024
Frame 4: x=1536
Frame 5: x=2048
Frame 6: x=2560
```

## Margenes Y Posicion

- Centro del personaje: cerca de `x=256`.
- Linea de pies/base: cerca de `y=479`.
- Margen inferior recomendado: `24 a 32 px`.
- Margen lateral minimo recomendado: `40 a 90 px`.
- Margen superior minimo recomendado: `20 px` para ataques grandes.
- El personaje no debe tocar los bordes del frame.
- Mantener escala, centro y linea de pies estables entre frames.
- Dejar aire suficiente para arcos de espada, impactos, alas, escudos o poses de derrota.

## Medidas De Referencia Del Arte Actual

```txt
Idle / defensa normal: 320-340 px de ancho, 337-431 px de alto
Ataques grandes:       420-443 px de ancho, hasta 468 px de alto
Hit / defeat:          334-340 px de ancho, 383-396 px de alto
```

## Naming Y Ubicacion

Guardar las animaciones en:

```txt
frontend/public/characters/heroes/<hero-slug>/animations/
```

Usar nombres en minuscula, ASCII y kebab-case:

```txt
idle-guard.png
idle-wing-ready.png
idle-sharpen.png
attack-slash.png
attack-lunge.png
hit.png
defeat.png
```

## Prompt Base Para Generar

```txt
Horizontal sprite sheet, transparent background, 6 frames, each frame exactly 512x512 px, total image 3072x512 px. Keep the character centered in each frame, feet/baseline aligned around y=479, no body parts touching the frame edges, consistent scale across frames.
```

## Configuracion En El Juego

Cada animacion debe registrarse con esta estructura en `frontend/src/game/data/heroes.js`:

```js
{
  sheet: '/characters/heroes/<hero-slug>/animations/<animation-name>.png',
  frameWidth: 512,
  frameHeight: 512,
  frames: 6,
  frameRate: 8,
  repeat: -1,
  yoyo: true
}
```

Valores habituales:

```txt
Idle:    frameRate 4-8, repeat -1, yoyo true
Attack:  frameRate 14, repeat 0
Hit:     frameRate 12, repeat 0
Defeat:  frameRate 9, repeat 0, holdLastFrame true
```

## Secuencia Suave Para Idle Base

La hoja sigue teniendo `6` frames fisicos. La pausa suave se configura en metadata:

```js
{
  frameRate: 7,
  frameDurationMs: 140,
  frameSequence: [0, 0, 1, 2, 3, 4, 5, 5, 4, 3, 2, 1],
  repeat: -1
}
```

Equivale visualmente a:

```txt
1 -> 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 6 -> 5 -> 4 -> 3 -> 2 -> repetir
```

Con `frameDurationMs: 140`, los frames normales duran cerca de `140 ms` y los extremos duran cerca de `280 ms` porque se repiten.

## Checklist

- La hoja mide exactamente `3072x512 px`.
- Cada frame mide exactamente `512x512 px`.
- Hay `6` frames en una sola fila horizontal.
- El fondo es transparente.
- El personaje esta centrado cerca de `x=256`.
- Los pies/base quedan cerca de `y=479`.
- Ninguna parte toca los bordes.
- La escala del personaje se mantiene igual en todos los frames.
- La animacion se ve bien en la pantalla `/frames`.
