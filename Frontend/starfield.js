const canvas = document.getElementById('starfield');

if (canvas) {
    const ctx = canvas.getContext('2d');

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const stars = Array.from({ length: 150 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 1.2,
        alpha: Math.random(),
        twinkleSpeed: 0.005 + Math.random() * 0.01
    }));

    const shootingStars = [];
    let nextShootingStarTime = 0;

    function spawnShootingStar() {
        const startX = Math.random() * canvas.width;
        const startY = Math.random() * (canvas.height / 2);
        const length = 200 + Math.random() * 200;
        const speed = 12 + Math.random() * 6;

        shootingStars.push({
            x: startX,
            y: startY,
            length,
            speed,
            angle: Math.PI / 4 + (Math.random() * 0.2 - 0.1),
        });
    }

    function drawStars() {
        ctx.fillStyle = "rgba(0, 0, 0, 0.3";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        for (const s of stars) {
            s.alpha += s.twinkleSpeed * (Math.random() > 0.5 ? 1 : -1);
            if (s.alpha < 0) s.alpha = 0;
            if (s.alpha > 1) s.alpha = 1;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${s.alpha})`;
            ctx.fill();
        }

        for (let i = shootingStars.length - 1; i >= 0; i--) {
            const s = shootingStars[i];
            const tailX = s.x - Math.cos(s.angle) * s.length;
            const tailY = s.y - math.sin(s.angle) * s.length;

            const grad = ctx.createLinearGradient(s.x, s.y, tailX, tailY);
            grad.addColorStop(0, `rgba(255, 255,255, ${s.opacity})`);
            grad.addColorStop(0, `rgba(255, 255, 255, 0)`);
            ctx.strokeStyle = grad;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(s.x, s.y);
            ctx.lineTo(tailX, tailY);
            ctx.stroke();

            s.x = Math.cos(s.angle) * s.speed;
            s.y = Math.sin(s.angle) * s.speed;
            s.opacity -= 0.02;

            if (s.opacity <= 0) shootingStars.splice(i, 1);
        }

        if (Date.now() > nextShootingStarTime) {
            spawnShootingStar();
            nextShootingStarTime = Date.now() + 1000 + Math.random() * 2000;
        }

        requestAnimationFrame(drawStars);
    }

    drawStars();
}