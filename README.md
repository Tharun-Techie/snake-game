# Snake Game 🐍 — React (Vanilla Vite)

React 19 + Vite + Canvas 2D. 20×20 grid, 600×600 canvas, wall-loop mode.

## Run Locally
```bash
npm install
npm run dev
# → http://localhost:5173
```
Build: `npm run build` → `npm run preview`

## Controls
- **Arrow / WASD**: Move (180° reverse blocked)
- **Space**: Pause / Resume
- **R / Start Button**: Restart
- Mobile D-pad + wall loop (wrap-around), death only on self-collision

## Structure
```
snake-game/
├─ index.html          # Vite entry
├─ vite.config.ts      # @vitejs/plugin-react
├─ package.json        # react, react-dom, vite
├─ public/
└─ src/
   ├─ main.tsx         # ReactDOM.createRoot
   ├─ App.tsx          # game component (hooks + canvas)
   ├─ App.css          # neon blue theme
   └─ index.css        # minimal root styles
```

## Architecture (React Vanilla)

**Stack:** Vanilla React (no state lib) + Canvas 2D. Hooks hold mutable game refs to avoid stale closures.

```
[Input: key / click] → nextDirRef
        ↓
   [tick @ speedRef (110→50ms)] → snakeRef / foodRef / scoreRef → [draw(canvasRef)]
        ↓                          ↑ wrap (x+GRID)%GRID
     self-collision → gameOver → overlay (React state)
```

**State vs Refs (`src/App.tsx`):**
- `GRID=20`, `CANVAS_SIZE=600`, `TILE=30`
- Refs (mutable): `snakeRef[{x,y}]`, `dirRef`, `nextDirRef`, `foodRef`, `speedRef`, `loopRef`, `scoreRef/highScoreRef/isPausedRef/isGameOverRef`
- State (render): `score`, `highScore(localStorage:snakeHighScore)`, `isPaused`, `isGameOver`, `showOverlay`
- `draw()` reads refs + `dirRef` for eyes, draws grid/food/snake/pause directly to canvas

**Loop `tick()`:**
1. `dir = nextDir`
2. `head = snake[0]+dir` → wrap `head.x=(head.x+GRID)%GRID`
3. `snake.some(head)` → `gameOver()` if self-hit
4. `unshift(head)` → if `head==food`: `+10`, persist highScore, `speed-=8` per 50pts (re-interval), `placeFood()` else `pop()`
5. `draw()`

**Lifecycle:**
- `useEffect` mount: `init()` + `keydown` listener + interval; cleanup on unmount
- `init()`: reset refs/state, `placeFood()`, `setInterval(tick, speed)`
- `setDir(x,y)` blocks reverse (checks `dirRef` & `nextDirRef`)
- `togglePause()` flips `isPaused` + forces `draw()`

**Render:** Canvas 600px (`max-width:92vw`), overlay is React conditional, not canvas text.

**Previous Vanilla:** vanilla implementation archived locally (not tracked)
