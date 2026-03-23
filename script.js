const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// --- CONFIGURAÇÕES DE TELA E FÍSICA ---
let groundY;
let ninjaJumpStart = null; 

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    groundY = canvas.height - 200; 
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// --- FUNÇÕES DE CONTROLE UNIFICADAS ---
function iniciarCrescimento() {
    if (phase === "waiting") {
        phase = "stretching";
        document.getElementById("introduction").style.display = "none";
    }
}

function pararCrescimento() {
    if (phase === "stretching") {
        phase = "turning";
    }
}

// Eventos de Mouse (Desktop)
window.onmousedown = iniciarCrescimento;
window.onmouseup = pararCrescimento;

// Eventos de Toque (Mobile)
window.addEventListener("touchstart", function(e) {
    if (e.target.tagName === "CANVAS") {
        e.preventDefault(); // Impede o scroll da página enquanto joga
    }
    iniciarCrescimento();
}, { passive: false });

window.addEventListener("touchend", function(e) {
    pararCrescimento();
});

// --- ESTADO DO JOGO ---
let phase = "waiting"; 
let lastTimestamp = null;
let platforms = [];
let stick = {};
let score = 0;
let highScore = localStorage.getItem('stickHeroHighScore') || 0;

// Configurações do Ninja
const ninjaW = 20;
const ninjaH = 30;
let ninjaYOffset = 0; 
let ninjaRotation = 0; 
let isPerfect = false;

// Sistemas Visuais Procedurais
let ghosts = []; 
const maxGhosts = 12; 
let stars = []; 

initGame();

function initGame() {
    resetGame();
    updateUIScore();
    createStars();
    window.requestAnimationFrame(animate);
}

function resetGame() {
    score = 0; ninjaYOffset = 0; ninjaRotation = 0;
    ninjaJumpStart = null; isPerfect = false; ghosts = [];
    
    document.getElementById("introduction").style.display = "block";
    document.getElementById("restart").style.display = "none";
    document.getElementById("perfect").style.display = "none";
    
    platforms = [{ x: 50, w: 70 }]; 
    addPlatform();
    stick = { length: 0, angle: 0, heroX: 50 + 70 - 15 }; 
    phase = "waiting";
}

function updateUIScore() {
    document.getElementById("score").innerText = score;
    document.getElementById("best-score").innerText = "BEST: " + highScore;
}

function addPlatform() {
    const lastPlatform = platforms[platforms.length - 1];
    const x = lastPlatform.x + lastPlatform.w + 60 + Math.random() * 150;
    const w = 40 + Math.random() * 70;
    platforms.push({ x, w });
}

function createStars() {
    stars = [];
    for (let i = 0; i < 40; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * (groundY - 100),
            size: 0.5 + Math.random() * 1.5,
            blinkSpeed: 0.01 + Math.random() * 0.05
        });
    }
}

function animate(timestamp) {
    if (!lastTimestamp) lastTimestamp = timestamp;
    const elapsed = timestamp - lastTimestamp;

    if (phase === "stretching") {
        stick.length += elapsed / 1.5; 
    } 
    else if (phase === "turning") {
        stick.angle += elapsed / 100;
        if (stick.angle >= Math.PI / 2) {
            stick.angle = Math.PI / 2;
            const stickEnd = platforms[0].x + platforms[0].w + stick.length;
            const target = platforms[1];
            if (Math.abs(stickEnd - (target.x + target.w / 2)) < 5) {
                isPerfect = true;
                document.getElementById("perfect").style.display = "block";
            }
            phase = "walking";
        }
    }
    else if (phase === "walking") {
        stick.heroX += elapsed / 3.0; 

        if (isPerfect) {
            if (!ninjaJumpStart) ninjaJumpStart = timestamp;
            const progress = (timestamp - ninjaJumpStart) / 550; 
            
            if (progress <= 1) {
                ninjaRotation = progress * Math.PI * 2; 
                ninjaYOffset = -90 * Math.sin(progress * Math.PI); 
                ghosts.push({ x: stick.heroX, y: ninjaYOffset, rot: ninjaRotation });
            } else {
                ninjaRotation = 0; ninjaYOffset = 0; ninjaJumpStart = null; isPerfect = false; 
            }
        }

        if (ghosts.length > maxGhosts || !isPerfect) ghosts.shift();

        const stickEnd = platforms[0].x + platforms[0].w + stick.length;
        if (stick.heroX >= stickEnd - 10) {
            const target = platforms[1];
            if (stickEnd >= target.x && stickEnd <= (target.x + target.w)) {
                if (stick.heroX >= target.x + target.w - 15) {
                    ninjaRotation = 0; ninjaYOffset = 0; ghosts = [];
                    score += isPerfect ? 2 : 1;
                    updateUIScore(); addPlatform(); phase = "transitioning";
                }
            } else { phase = "falling"; }
        }
    }
    else if (phase === "transitioning") {
        const speed = Math.max(10, (platforms[1].x - 50) / 10);
        if (platforms[1].x > 50) {
            platforms.forEach(p => p.x -= speed);
            stick.heroX -= speed;
        } else {
            platforms.shift(); stick.length = 0; stick.angle = 0; phase = "waiting";
            document.getElementById("perfect").style.display = "none";
        }
    }
    else if (phase === "falling") {
        ninjaYOffset += elapsed / 1.5; 
        if (stick.angle < Math.PI * 0.8) stick.angle += elapsed / 70;
        if (ninjaYOffset > 500) {
            if (score > highScore) localStorage.setItem('stickHeroHighScore', score);
            document.getElementById("restart").style.display = "block";
            return; 
        }
    }

    draw(timestamp);
    lastTimestamp = timestamp;
    window.requestAnimationFrame(animate);
}

function draw(timestamp) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
    sky.addColorStop(0, "#2c3e50"); 
    sky.addColorStop(0.6, "#1a1a2e"); 
    sky.addColorStop(1, "#3d4e5f"); 
    ctx.fillStyle = sky; ctx.fillRect(0, 0, canvas.width, canvas.height);

    stars.forEach(s => {
        const opacity = 0.5 + Math.sin(timestamp * s.blinkSpeed) * 0.3;
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2); ctx.fill();
    });

    platforms.forEach(p => {
        ctx.fillStyle = "#111"; 
        ctx.fillRect(p.x, groundY, p.w, canvas.height - groundY);
        for (let y = groundY + 20; y < canvas.height - 20; y += 25) {
            for (let x = p.x + 8; x < p.x + p.w - 8; x += 18) {
                ctx.fillStyle = (Math.sin(x + y + timestamp/1000) > 0.6) ? "#f1c40f" : "#2c3e50";
                ctx.fillRect(x, y, 10, 12);
            }
        }
        ctx.fillStyle = "red"; ctx.fillRect(p.x + p.w / 2 - 2, groundY, 4, 4);
    });

    ctx.save();
    ctx.translate(platforms[0].x + platforms[0].w, groundY + (phase === "falling" ? ninjaYOffset : 0));
    ctx.rotate(stick.angle);
    ctx.lineWidth = 4; ctx.strokeStyle = "#d2dae2"; 
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -stick.length); ctx.stroke();
    ctx.restore();

    const nX = stick.heroX;
    const nY = (groundY - ninjaH) + ninjaYOffset;

    ghosts.forEach((g, i) => {
        ctx.save();
        ctx.translate(g.x + ninjaW/2, (groundY - ninjaH) + g.y + ninjaH/2);
        ctx.rotate(g.rot);
        ctx.fillStyle = `rgba(231, 76, 60, ${i / ghosts.length * 0.3})`;
        ctx.fillRect(-ninjaW/2, -ninjaH/2 + 5, ninjaW, ninjaH - 12);
        ctx.restore();
    });

    ctx.save();
    ctx.translate(nX + ninjaW/2, nY + ninjaH/2);
    if (phase === "walking" && !isPerfect) ctx.rotate(0.12);
    ctx.rotate(ninjaRotation);
    ctx.fillStyle = "black";
    ctx.fillRect(-ninjaW/2, -ninjaH/2 + 5, ninjaW, ninjaH - 12);
    ctx.beginPath(); ctx.arc(0, -ninjaH/2 + 3, 9, 0, Math.PI * 2); ctx.fill();
    const swing = Math.sin(timestamp / 100) * 6;
    ctx.fillStyle = "#e74c3c";
    ctx.beginPath(); ctx.moveTo(-2, -ninjaH/2); ctx.lineTo(-18, -ninjaH/2 + 2 + swing); ctx.lineTo(-14, -ninjaH/2 + 10 + swing); ctx.fill();
    ctx.fillStyle = "white"; ctx.fillRect(-4, -ninjaH/2 - 1, 3, 3); ctx.fillRect(1, -ninjaH/2 - 1, 3, 3);
    ctx.restore();

    if (ninjaRotation === 0 && ninjaYOffset === 0) {
        ctx.fillStyle = "black";
        const cycle = Math.sin(timestamp / 40) * 8;
        ctx.fillRect(nX + 2, nY + ninjaH - 5, 5, 8 + cycle);
        ctx.fillRect(nX + ninjaW - 7, nY + ninjaH - 5, 5, 8 - cycle);
    }
}

const restartBtn = document.getElementById("restart");
if(restartBtn) restartBtn.onclick = (e) => { e.stopPropagation(); initGame(); };estart");
if(restartBtn) restartBtn.onclick = (e) => { e.stopPropagation(); initGame(); };
