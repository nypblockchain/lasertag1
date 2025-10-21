const canvas = document.getElementById("starfield");

if (canvas) {
    const ctx = canvas.getContext("2d");

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    // Background stars for depth
    const stars = Array.from({ length: 150 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 1.1 + 0.2,
        alpha: Math.random(),
        twinkleSpeed: 0.004 + Math.random() * 0.008
    }));

    // Shooting stars
    const shootingStars = [];
    let nextShootingStarTime = 0;

    function spawnShootingStar() {
        // ? Start near top-left corner with small random offsets
        const startX = Math.random() * (canvas.width * 0.25);
        const startY = Math.random() * (canvas.height * 0.25);

        // Length & speed of streaks
        const length = 180 + Math.random() * 180;
        const speed = 8 + Math.random() * 5;

        shootingStars.push({
            x: startX,
            y: startY,
            length,
            speed,
            // Move diagonally (top-left ? bottom-right)
            angle: Math.PI / 4 + (Math.random() * 0.1 - 0.05),
            opacity: 1,
            hueShift: Math.random() * 40 // subtle pink-violet variance
        });
    }

    function draw() {
        ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // ? Background twinkles
        for (const s of stars) {
            s.alpha += s.twinkleSpeed * (Math.random() > 0.5 ? 1 : -1);
            if (s.alpha < 0) s.alpha = 0;
            if (s.alpha > 1) s.alpha = 1;

            ctx.beginPath();
            ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 180, 255, ${s.alpha})`;
            ctx.fill();
        }

        // ?? Shooting stars
        for (let i = shootingStars.length - 1; i >= 0; i--) {
            const s = shootingStars[i];
            const tailX = s.x - Math.cos(s.angle) * s.length;
            const tailY = s.y - Math.sin(s.angle) * s.length;

            const grad = ctx.createLinearGradient(s.x, s.y, tailX, tailY);
            grad.addColorStop(0, `hsla(${300 + s.hueShift}, 100%, 85%, ${s.opacity})`);
            grad.addColorStop(0.5, `hsla(${290 + s.hueShift}, 100%, 70%, ${s.opacity * 0.6})`);
            grad.addColorStop(1, "rgba(255, 255, 255, 0)");

            ctx.strokeStyle = grad;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(s.x, s.y);
            ctx.lineTo(tailX, tailY);
            ctx.stroke();

            // Movement & fading
            s.x += Math.cos(s.angle) * s.speed;
            s.y += Math.sin(s.angle) * s.speed;
            s.opacity -= 0.015;

            // Remove faded stars
            if (s.opacity <= 0) shootingStars.splice(i, 1);
        }

        // Spawn every 1.5–3s
        if (Date.now() > nextShootingStarTime) {
            spawnShootingStar();
            nextShootingStarTime = Date.now() + 1500 + Math.random() * 1500;
        }

        requestAnimationFrame(draw);
    }

    draw();
}
