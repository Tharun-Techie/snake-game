const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('highScore');
const overlay = document.getElementById('overlay');
const overlayText = document.getElementById('overlayText');
const overlaySub = document.getElementById('overlaySub');

const GRID = 20;
const TILE = canvas.width / GRID; // 20
let snake, food, dir, nextDir, score, highScore, loop, speed, isPaused, isGameOver;

highScore = localStorage.getItem('snakeHighScore') || 0;
highScoreEl.textContent = highScore;

function init() {
  snake = [{x:10, y:10}];
  dir = {x:1, y:0};
  nextDir = {x:1, y:0};
  score = 0;
  speed = 110;
  isPaused = false;
  isGameOver = false;
  scoreEl.textContent = score;
  overlay.classList.add('hidden');
  placeFood();
  if(loop) clearInterval(loop);
  loop = setInterval(tick, speed);
  draw();
}

function placeFood() {
  let pos;
  do {
    pos = {x: Math.floor(Math.random()*GRID), y: Math.floor(Math.random()*GRID)};
  } while(snake.some(s => s.x===pos.x && s.y===pos.y));
  food = pos;
}

function tick() {
  if(isPaused || isGameOver) return;
  dir = nextDir;
  let head = {x: snake[0].x + dir.x, y: snake[0].y + dir.y};

  // wall loop (wrap around) - no wall death
  head.x = (head.x + GRID) % GRID;
  head.y = (head.y + GRID) % GRID;

  // self collision - only death condition
  if(snake.some(s => s.x===head.x && s.y===head.y)) return gameOver();

  snake.unshift(head);

  if(head.x === food.x && head.y === food.y){
    score += 10;
    scoreEl.textContent = score;
    if(score > highScore){
      highScore = score;
      highScoreEl.textContent = highScore;
      localStorage.setItem('snakeHighScore', highScore);
    }
    // speed up every 50 points
    if(score % 50 === 0 && speed > 50){
      speed -= 8;
      clearInterval(loop);
      loop = setInterval(tick, speed);
    }
    placeFood();
  } else {
    snake.pop();
  }
  draw();
}

function draw() {
  // background
  ctx.fillStyle = '#0f2e1f';
  ctx.fillRect(0,0,canvas.width, canvas.height);

  // grid faint
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  for(let i=0;i<GRID;i++){
    ctx.beginPath(); ctx.moveTo(i*TILE,0); ctx.lineTo(i*TILE, canvas.height); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,i*TILE); ctx.lineTo(canvas.width, i*TILE); ctx.stroke();
  }

  // food
  ctx.fillStyle = '#e74c3c';
  ctx.shadowColor = '#e74c3c';
  ctx.shadowBlur = 12;
  roundRect(food.x*TILE+2, food.y*TILE+2, TILE-4, TILE-4, 6);
  ctx.shadowBlur = 0;

  // snake
  snake.forEach((seg,i)=>{
    ctx.fillStyle = i===0 ? '#2ecc71' : '#27ae60';
    if(i===0){
      ctx.shadowColor = '#2ecc71';
      ctx.shadowBlur = 10;
    } else ctx.shadowBlur = 0;
    roundRect(seg.x*TILE+1, seg.y*TILE+1, TILE-2, TILE-2, 5);
    // eye for head
    if(i===0){
      ctx.fillStyle = '#0a1f14';
      const eyeOffset = 6;
      const cx = seg.x*TILE + TILE/2;
      const cy = seg.y*TILE + TILE/2;
      // simple eyes based on direction
      let ex1 = cx - 4, ey1 = cy - 3, ex2 = cx + 4, ey2 = cy - 3;
      if(dir.y !==0){ ex1=cx-3; ey1=cy-4; ex2=cx+3; ey2=cy-4; }
      ctx.beginPath(); ctx.arc(ex1,ey1,2,0,Math.PI*2); ctx.arc(ex2,ey2,2,0,Math.PI*2); ctx.fill();
    }
  });
  ctx.shadowBlur = 0;

  if(isPaused){
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0,0,canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 26px Segoe UI';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', canvas.width/2, canvas.height/2);
  }
}

function roundRect(x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.lineTo(x+w-r, y);
  ctx.quadraticCurveTo(x+w, y, x+w, y+r);
  ctx.lineTo(x+w, y+h-r);
  ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
  ctx.lineTo(x+r, y+h);
  ctx.quadraticCurveTo(x, y+h, x, y+h-r);
  ctx.lineTo(x, y+r);
  ctx.quadraticCurveTo(x, y, x+r, y);
  ctx.closePath();
  ctx.fill();
}

function gameOver(){
  isGameOver = true;
  clearInterval(loop);
  overlayText.textContent = 'Game Over!';
  overlaySub.textContent = `Score: ${score} • High Score: ${highScore}`;
  document.getElementById('overlayBtn').textContent = 'Play Again';
  overlay.classList.remove('hidden');
}

function setDir(x,y){
  // prevent reverse
  if(dir.x === -x && dir.y === -y) return;
  // also prevent queued reverse
  if(nextDir.x === -x && nextDir.y === -y) return;
  nextDir = {x,y};
}

document.addEventListener('keydown', e=>{
  const k = e.key.toLowerCase();
  if(k==='arrowup' || k==='w') setDir(0,-1);
  else if(k==='arrowdown' || k==='s') setDir(0,1);
  else if(k==='arrowleft' || k==='a') setDir(-1,0);
  else if(k==='arrowright' || k==='d') setDir(1,0);
  else if(k===' ') { e.preventDefault(); togglePause(); }
  else if(k==='r') init();
});

function togglePause(){
  if(isGameOver) return;
  isPaused = !isPaused;
  if(!isPaused) draw();
  else draw();
  document.getElementById('pauseBtn').textContent = isPaused ? 'Resume' : 'Pause';
}

document.getElementById('startBtn').addEventListener('click', init);
document.getElementById('pauseBtn').addEventListener('click', togglePause);
document.getElementById('overlayBtn').addEventListener('click', init);
document.querySelectorAll('.arrow').forEach(b=>{
  b.addEventListener('click', ()=>{
    const d = b.dataset.dir;
    if(d==='up') setDir(0,-1);
    if(d==='down') setDir(0,1);
    if(d==='left') setDir(-1,0);
    if(d==='right') setDir(1,0);
  });
});

// auto start
init();
