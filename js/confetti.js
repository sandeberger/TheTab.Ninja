/**
 * confetti.js - Confetti animation for the support button
 * Creates particle-based confetti effects.
 */

// Start confetti animation
function startConfetti(options = {}) {
    const { particleCount = 100, duration = 300, origin = { x: 0.5, y: 0.6 } } = options;

    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '9999';
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    for (let i = 0; i < particleCount; i++) {
        particles.push(createParticle(origin, canvas.width, canvas.height));
    }

    let startTime = null;

    function animate(timestamp) {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const maxFactor = 2;
        const factor = 1 + (maxFactor - 1) * (1 - elapsed / duration);

        particles.forEach(p => {
            p.x += p.vx * factor;
            p.y += p.vy * factor;
            p.vy += 0.05;
            p.rotation += p.rotationSpeed;
            p.opacity = Math.max(0, p.opacity - 0.005);

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.opacity})`;
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            ctx.restore();
        });

        if (elapsed < duration) {
            requestAnimationFrame(animate);
        } else {
            if (canvas.parentNode) {
                canvas.parentNode.removeChild(canvas);
            }
        }
    }

    requestAnimationFrame(animate);
}

// Create a single confetti particle
function createParticle(origin, width, height) {
    const x = origin.x * width;
    const y = origin.y * height;
    const angle = Math.random() * 2 * Math.PI;
    const speed = Math.random() * 4 + 2;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    const size = Math.random() * 8 + 4;
    const colors = [
        { r: 239, g: 71, b: 111 },
        { r: 255, g: 209, b: 102 },
        { r: 6,   g: 214, b: 160 },
        { r: 17,  g: 138, b: 178 }
    ];
    const color = colors[Math.floor(Math.random() * colors.length)];

    return {
        x: x,
        y: y,
        vx: vx,
        vy: vy,
        size: size,
        rotation: Math.random() * 2 * Math.PI,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
        color: color,
        opacity: 1
    };
}
