const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game State
let gameState = 'START'; // START, PLAYING, WON, PROPOSAL, END
let score = 0;
const WIN_SCORE = 15; // Hearts needed to fill the meter
let player;
let hearts = [];
let particles = []; // For effects
let animationId;
let loveMeter = document.getElementById('love-fill');

// DOM Elements
const startScreen = document.getElementById('start-screen');
const proposalScreen = document.getElementById('proposal-screen');
const celebrationScreen = document.getElementById('celebration-screen');
const startBtn = document.getElementById('start-btn');
const yesBtn = document.getElementById('yes-btn');
const noBtn = document.getElementById('no-btn');

// Resize Handling
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (player) {
        player.recalculateDimensions();
    }
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => {
    setTimeout(resize, 100);
});

// Player Object
class Player {
    constructor() {
        this.recalculateDimensions();
        this.x = canvas.width / 2 - this.w / 2;
        this.speed = 10;
        this.dx = 0;
    }

    recalculateDimensions() {
        // Dynamically scale player basket size relative to screen width
        this.w = Math.min(100, Math.max(65, canvas.width * 0.18));
        this.h = this.w * 0.8;
        this.y = canvas.height - Math.max(70, canvas.height * 0.12);
        
        // Keep within horizontal canvas bounds
        if (this.x !== undefined) {
            if (this.x < 0) this.x = 0;
            if (this.x + this.w > canvas.width) this.x = canvas.width - this.w;
        }
    }

    draw() {
        // Draw cute basket
        ctx.fillStyle = '#ff4d6d';
        
        // Simple semi-circle basket
        ctx.beginPath();
        ctx.arc(this.x + this.w / 2, this.y, this.w / 2, 0, Math.PI, false);
        ctx.fill();
        
        // Handle
        ctx.beginPath();
        ctx.strokeStyle = '#c9184a';
        ctx.lineWidth = Math.max(3, this.w * 0.05);
        ctx.arc(this.x + this.w / 2, this.y - 10, this.w / 2, Math.PI, 0, false);
        ctx.stroke();
    }

    update() {
        this.x += this.dx;
        
        // Boundaries
        if (this.x < 0) this.x = 0;
        if (this.x + this.w > canvas.width) this.x = canvas.width - this.w;
    }
}

// Heart Object
class Heart {
    constructor() {
        const minSize = Math.max(18, canvas.width * 0.04);
        const maxSize = Math.min(40, canvas.width * 0.08);
        this.size = Math.random() * (maxSize - minSize) + minSize; // Responsive size
        this.x = Math.random() * Math.max(10, canvas.width - this.size);
        this.y = -this.size;
        this.speed = Math.random() * 3 + 2; // 2-5 speed
        this.color = `hsl(${Math.random() * 20 + 340}, 100%, 60%)`; // Pinkish/Red variations
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        let topCurveHeight = this.size * 0.3;
        ctx.moveTo(this.x, this.y + topCurveHeight);
        // top left curve
        ctx.bezierCurveTo(
            this.x, this.y, 
            this.x - this.size / 2, this.y, 
            this.x - this.size / 2, this.y + topCurveHeight
        );
        // bottom left curve
        ctx.bezierCurveTo(
            this.x - this.size / 2, this.y + (this.size + topCurveHeight) / 2, 
            this.x, this.y + (this.size + topCurveHeight) / 2, 
            this.x, this.y + this.size
        );
        // bottom right curve
        ctx.bezierCurveTo(
            this.x, this.y + (this.size + topCurveHeight) / 2, 
            this.x + this.size / 2, this.y + (this.size + topCurveHeight) / 2, 
            this.x + this.size / 2, this.y + topCurveHeight
        );
        // top right curve
        ctx.bezierCurveTo(
            this.x + this.size / 2, this.y, 
            this.x, this.y, 
            this.x, this.y + topCurveHeight
        );
        ctx.fill();
    }

    update() {
        this.y += this.speed;
    }
}

// Particle Effect
class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 5 + 2;
        this.speedX = (Math.random() - 0.5) * 4;
        this.speedY = (Math.random() - 0.5) * 4;
        this.life = 100;
        this.color = `rgba(255, 255, 255, 0.8)`;
    }
    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life -= 2;
    }
    draw() {
        ctx.fillStyle = this.color;
        ctx.globalAlpha = Math.max(0, this.life / 100);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

// Input Handling
function handleInput(e) {
    if (!player || gameState !== 'PLAYING') return;
    
    let clientX;
    if (e.type === 'touchstart' || e.type === 'touchmove') {
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
        }
    } else if (e.type === 'mousemove') {
        clientX = e.clientX;
    }

    if (clientX !== undefined) {
        player.x = clientX - player.w / 2;
        // Keep within boundaries
        if (player.x < 0) player.x = 0;
        if (player.x + player.w > canvas.width) player.x = canvas.width - player.w;
    }
}

window.addEventListener('mousemove', handleInput);
window.addEventListener('touchstart', handleInput, { passive: true });
window.addEventListener('touchmove', handleInput, { passive: true });

// Game Functions
function spawnHeart() {
    if (Math.random() < 0.025) {
        hearts.push(new Heart());
    }
}

function updateGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas

    if (gameState === 'PLAYING') {
        player.update();
        player.draw();

        spawnHeart();

        hearts.forEach((heart, index) => {
            heart.update();
            heart.draw();

            // Collision Detection
            // Smooth hit area checking top/center of basket
            if (
                heart.y + heart.size >= player.y - 10 &&
                heart.y <= player.y + 20 &&
                heart.x + heart.size / 2 >= player.x - 10 &&
                heart.x - heart.size / 2 <= player.x + player.w + 10
            ) {
                // Catch!
                hearts.splice(index, 1);
                score++;
                createParticles(heart.x, heart.y);
                updateScore();
                
                if (score >= WIN_SCORE) {
                    triggerProposal();
                }
            } else if (heart.y > canvas.height + heart.size) {
                hearts.splice(index, 1); // Missed
            }
        });

        particles.forEach((p, idx) => {
            p.update();
            p.draw();
            if (p.life <= 0) particles.splice(idx, 1);
        });
    }

    animationId = requestAnimationFrame(updateGame);
}

function createParticles(x, y) {
    for (let i = 0; i < 6; i++) {
        particles.push(new Particle(x, y));
    }
}

function updateScore() {
    const percentage = Math.min(100, (score / WIN_SCORE) * 100);
    loveMeter.style.width = `${percentage}%`;
}

function triggerProposal() {
    gameState = 'PROPOSAL';
    setTimeout(() => {
        proposalScreen.classList.remove('hidden');
        proposalScreen.classList.add('active');
    }, 400);
}

function startGame() {
    resize();
    player = new Player();
    hearts = [];
    particles = [];
    score = 0;
    updateScore();
    gameState = 'PLAYING';
    
    startScreen.classList.remove('active');
    startScreen.classList.add('hidden');
    
    if (animationId) cancelAnimationFrame(animationId);
    updateGame();
}

// Event Listeners
startBtn.addEventListener('click', startGame);

yesBtn.addEventListener('click', () => {
    proposalScreen.classList.remove('active');
    proposalScreen.classList.add('hidden');
    celebrationScreen.classList.remove('hidden');
    celebrationScreen.classList.add('active');
    triggerConfetti();
});

// "No" button runs away within safe screen bounds
function moveNoButton(e) {
    if (e && e.cancelable) e.preventDefault();
    
    const margin = 20;
    const btnWidth = noBtn.offsetWidth || 80;
    const btnHeight = noBtn.offsetHeight || 40;
    
    const maxX = Math.max(margin, window.innerWidth - btnWidth - margin);
    const maxY = Math.max(margin, window.innerHeight - btnHeight - margin);
    
    const randomX = Math.floor(Math.random() * (maxX - margin)) + margin;
    const randomY = Math.floor(Math.random() * (maxY - margin)) + margin;
    
    noBtn.style.position = 'fixed';
    noBtn.style.left = `${randomX}px`;
    noBtn.style.top = `${randomY}px`;
    noBtn.style.zIndex = '30';
}

noBtn.addEventListener('mouseover', moveNoButton);
noBtn.addEventListener('touchstart', moveNoButton, { passive: false });

function triggerConfetti() {
    // Add extra celebration particles on victory
    for (let i = 0; i < 40; i++) {
        particles.push(new Particle(canvas.width / 2, canvas.height / 2));
    }
}

// Initialize
resize();