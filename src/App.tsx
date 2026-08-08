import { useEffect, useRef, useState } from 'react'
import './App.css'

const GRID = 20
const CANVAS_SIZE = 600
const TILE = CANVAS_SIZE / GRID
const INITIAL_SPEED = 110

type Point = { x: number; y: number }
type Dir = Point
type FruitDef = { color: string; glow: string; name: string; points: number }
type Food = Point & FruitDef

const FRUITS: FruitDef[] = [
  { color: '#e74c3c', glow: '#ff7b7b', name: 'apple' , points: 10 }, // red
  { color: '#f1c40f', glow: '#ffe67a', name: 'banana', points: 10 }, // yellow
  { color: '#9b59b6', glow: '#d6a8ff', name: 'grape' , points: 10 }, // purple
  { color: '#e67e22', glow: '#ffb86a', name: 'orange', points: 10 }, // orange
  { color: '#3498db', glow: '#7ac0ff', name: 'berry' , points: 15 }, // blue - bonus
  { color: '#ff6b9d', glow: '#ff9ec1', name: 'cherry', points: 15 }, // pink - bonus
  { color: '#2ecc71', glow: '#7af0a8', name: 'kiwi'  , points: 10 }, // green
  { color: '#ffd700', glow: '#fff08a', name: 'star'  , points: 20 }, // gold - rare bonus
]

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const snakeRef = useRef<Point[]>([{ x: 10, y: 10 }])
  const dirRef = useRef<Dir>({ x: 1, y: 0 })
  const nextDirRef = useRef<Dir>({ x: 1, y: 0 })
  const foodRef = useRef<Food>({ x: 15, y: 10, color: '#e74c3c', glow: '#ff7b7b', name: 'apple', points: 10 })
  const snakeColorRef = useRef<string>('#0ea5e9')
  const snakeGlowRef = useRef<string>('#7dd3fc')
  const loopRef = useRef<number | null>(null)
  const speedRef = useRef<number>(INITIAL_SPEED)

  const [score, setScore] = useState<number>(0)
  const [highScore, setHighScore] = useState<number>(() => Number(localStorage.getItem('snakeHighScore') || 0))
  const [isPaused, setIsPaused] = useState<boolean>(false)
  const [isGameOver, setIsGameOver] = useState<boolean>(false)
  const [showOverlay, setShowOverlay] = useState<boolean>(false)
  const [overlayText, setOverlayText] = useState<string>('Game Over')

  const placeFood = (): void => {
    let pos: Point
    do {
      pos = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) }
    } while (snakeRef.current.some(s => s.x === pos.x && s.y === pos.y))
    // weighted: make gold rare (5% chance)
    let fruit: FruitDef
    if (Math.random() < 0.05) fruit = FRUITS[7] // gold star rare
    else fruit = FRUITS[Math.floor(Math.random() * (FRUITS.length - 1))]
    foodRef.current = { ...pos, ...fruit }
  }

  const draw = (): void => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const snake = snakeRef.current
    const food = foodRef.current
    const dir = dirRef.current

    ctx.fillStyle = '#0a1e3a'
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

    ctx.strokeStyle = 'rgba(255,255,255,0.04)'
    for (let i = 0; i < GRID; i++) {
      ctx.beginPath(); ctx.moveTo(i * TILE, 0); ctx.lineTo(i * TILE, CANVAS_SIZE); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, i * TILE); ctx.lineTo(CANVAS_SIZE, i * TILE); ctx.stroke()
    }

    // food - colorful with glow matching fruit
    ctx.fillStyle = food.color
    ctx.shadowColor = food.glow || food.color
    ctx.shadowBlur = food.points >= 20 ? 18 : food.points >= 15 ? 14 : 12
    roundRect(ctx, food.x * TILE + 2, food.y * TILE + 2, TILE - 4, TILE - 4, 8)
    // inner highlight for juicy look
    ctx.shadowBlur = 0
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    const hlSize = TILE * 0.22
    roundRect(ctx, food.x * TILE + 6, food.y * TILE + 6, hlSize, hlSize, 4)

    // snake - color follows last eaten fruit
    const headColor = snakeColorRef.current
    const bodyColor = darkenColor(headColor, 20)
    const glowColor = snakeGlowRef.current
    snake.forEach((seg, i) => {
      ctx.fillStyle = i === 0 ? headColor : bodyColor
      if (i === 0) { ctx.shadowColor = glowColor; ctx.shadowBlur = 10 } else ctx.shadowBlur = 0
      roundRect(ctx, seg.x * TILE + 1, seg.y * TILE + 1, TILE - 2, TILE - 2, 5)
      if (i === 0) {
        ctx.fillStyle = '#070f2a'
        const cx = seg.x * TILE + TILE / 2
        const cy = seg.y * TILE + TILE / 2
        let ex1 = cx - 4, ey1 = cy - 3, ex2 = cx + 4, ey2 = cy - 3
        if (dir.y !== 0) { ex1 = cx - 3; ey1 = cy - 4; ex2 = cx + 3; ey2 = cy - 4 }
        ctx.beginPath(); ctx.arc(ex1, ey1, 2, 0, Math.PI * 2); ctx.arc(ex2, ey2, 2, 0, Math.PI * 2); ctx.fill()
      }
    })
    ctx.shadowBlur = 0

    if (isPaused) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)'
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 26px Segoe UI'
      ctx.textAlign = 'center'
      ctx.fillText('PAUSED', CANVAS_SIZE / 2, CANVAS_SIZE / 2)
    }
  }

  const gameOver = (): void => {
    setIsGameOver(true)
    setShowOverlay(true)
    setOverlayText('Game Over!')
    if (loopRef.current !== null) clearInterval(loopRef.current)
  }

  const tick = (): void => {
    if (isPausedRef.current || isGameOverRef.current) return
    dirRef.current = { ...nextDirRef.current }
    let head: Point = { x: snakeRef.current[0].x + dirRef.current.x, y: snakeRef.current[0].y + dirRef.current.y }
    // wall loop - wrap around
    head.x = (head.x + GRID) % GRID
    head.y = (head.y + GRID) % GRID

    if (snakeRef.current.some(s => s.x === head.x && s.y === head.y)) {
      gameOver()
      return
    }
    snakeRef.current.unshift(head)
    if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
      const eaten = foodRef.current
      // snake adopts fruit color
      snakeColorRef.current = eaten.color
      snakeGlowRef.current = eaten.glow || eaten.color
      const newScore = scoreRef.current + (eaten.points || 10)
      scoreRef.current = newScore
      setScore(newScore)
      if (newScore > highScoreRef.current) {
        highScoreRef.current = newScore
        setHighScore(newScore)
        localStorage.setItem('snakeHighScore', String(newScore))
      }
      if (newScore % 50 === 0 && speedRef.current > 50) {
        speedRef.current -= 8
        if (loopRef.current !== null) clearInterval(loopRef.current)
        loopRef.current = window.setInterval(tick, speedRef.current)
      }
      placeFood()
    } else {
      snakeRef.current.pop()
    }
    draw()
  }

  // refs to avoid stale closure in tick
  const scoreRef = useRef<number>(score)
  const highScoreRef = useRef<number>(highScore)
  const isPausedRef = useRef<boolean>(isPaused)
  const isGameOverRef = useRef<boolean>(isGameOver)
  useEffect(() => { scoreRef.current = score }, [score])
  useEffect(() => { highScoreRef.current = highScore }, [highScore])
  useEffect(() => { isPausedRef.current = isPaused }, [isPaused])
  useEffect(() => { isGameOverRef.current = isGameOver }, [isGameOver])

  const init = (): void => {
    snakeRef.current = [{ x: 10, y: 10 }]
    dirRef.current = { x: 1, y: 0 }
    nextDirRef.current = { x: 1, y: 0 }
    snakeColorRef.current = '#0ea5e9'
    snakeGlowRef.current = '#7dd3fc'
    speedRef.current = INITIAL_SPEED
    scoreRef.current = 0
    setScore(0)
    setIsPaused(false)
    setIsGameOver(false)
    setShowOverlay(false)
    isPausedRef.current = false
    isGameOverRef.current = false
    placeFood()
    if (loopRef.current !== null) clearInterval(loopRef.current)
    loopRef.current = window.setInterval(tick, speedRef.current)
    // draw after state reset
    setTimeout(draw, 0)
  }

  const setDir = (x: number, y: number): void => {
    if (dirRef.current.x === -x && dirRef.current.y === -y) return
    if (nextDirRef.current.x === -x && nextDirRef.current.y === -y) return
    nextDirRef.current = { x, y }
  }

  const togglePause = (): void => {
    if (isGameOverRef.current) return
    setIsPaused(p => {
      const np = !p
      isPausedRef.current = np
      setTimeout(draw, 0)
      return np
    })
  }

  // keyboard + initial mount
  useEffect(() => {
    init()
    const handler = (e: KeyboardEvent): void => {
      const k = e.key.toLowerCase()
      if (k === 'arrowup' || k === 'w') setDir(0, -1)
      else if (k === 'arrowdown' || k === 's') setDir(0, 1)
      else if (k === 'arrowleft' || k === 'a') setDir(-1, 0)
      else if (k === 'arrowright' || k === 'd') setDir(1, 0)
      else if (k === ' ') { e.preventDefault(); togglePause() }
      else if (k === 'r') init()
    }
    window.addEventListener('keydown', handler)
    return () => {
      window.removeEventListener('keydown', handler)
      if (loopRef.current !== null) clearInterval(loopRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // redraw when pause toggles
  useEffect(() => { draw() }, [isPaused])

  return (
    <div className="container">
      <h1>🐍 SNAKE GAME <span className="badge">React</span></h1>
      <div className="score-board">
        <div>Score: <span>{score}</span></div>
        <div>High Score: <span>{highScore}</span></div>
      </div>

      <canvas ref={canvasRef} width={CANVAS_SIZE} height={CANVAS_SIZE} id="gameCanvas" />

      <div className="controls-info">
        <p>Use <b>Arrow Keys / WASD</b> to move • <b>SPACE</b> to Pause • <b>R</b> to Restart • Walls loop</p>
      </div>

      <div className="buttons">
        <button onClick={init}>Start / Restart</button>
        <button id="pauseBtn" onClick={togglePause}>{isPaused ? 'Resume' : 'Pause'}</button>
      </div>

      <div className="mobile-controls">
        <button className="arrow" onClick={() => setDir(0,-1)}>▲</button>
        <div className="row">
          <button className="arrow" onClick={() => setDir(-1,0)}>◀</button>
          <button className="arrow" onClick={() => setDir(0,1)}>▼</button>
          <button className="arrow" onClick={() => setDir(1,0)}>▶</button>
        </div>
      </div>

      {showOverlay && (
        <div className="overlay">
          <h2>{overlayText}</h2>
          <p>Score: {score} • High Score: {highScore}</p>
          <button onClick={init}>Play Again</button>
        </div>
      )}
    </div>
  )
}

function darkenColor(hex: string, amt = 20): string {
  // hex #rrggbb -> darker
  const num = parseInt(hex.replace('#',''),16)
  let r = (num >> 16) - amt, g = ((num >> 8) & 0xFF) - amt, b = (num & 0xFF) - amt
  r = Math.max(0, Math.min(255,r)); g = Math.max(0, Math.min(255,g)); b = Math.max(0, Math.min(255,b))
  return `rgb(${r},${g},${b})`
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
  ctx.fill()
}
