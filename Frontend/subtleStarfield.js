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
        const startX = Math.random() *(canvas.width * 0.8;
        const startY = Math.random() * (canvas.height * 0.1);

        const length = 180 + Math.random() * 180;
        const speed = 8 + Math.random() * 5;

        const hueValue = 210 + Math.random() * 90;

        shootingStars.push({
            x: startX,
            y: startY,
            length,
            speed,
            angle: Math.PI / 4 + (Math.random() * 0.2 - 0.1),
            opacity: 1,
            hue: hueValue,
            lightness: 60 + Math.random() * 20
        });
    }

    function draw() {
        ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        for (const s of stars) {
            s.alpha += s.twinkleSpeed * (Math.random() > 0.5 ? 1 : -1);
            s.alpha = Math.min(1, Math.max(0, s.alpha));
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 180, 255, ${s.alpha})`;
            ctx.fill();
        }

        for (let i = shootingStars.length - 1; i >= 0; i--) {
            const s = shootingStars[i];
            const tailX = s.x - Math.cos(s.angle) * s.length;
            const tailY = s.y - Math.sin(s.angle) * s.length;

            const brightnessBoost = Math.min(30, (s.y / canvas.height) * 30);
            const grad = ctx.createLinearGradient(s.x, s.y, tailX, tailY);
            grad.addColorStop(0, `hsla(${s.hue}, 100%, ${s.lightness + brightnessBoost}%, ${s.opacity})`);
            grad.addColorStop(0.5, `hsla(${s.hue - 10}, 100%, ${s.lightness - 10 + brightnessBoost}%, ${s.opacity * 0.6})`);
            grad.addColorStop(1, "rgba(255,255,255,0)");

            ctx.strokeStyle = grad;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(s.x, s.y);
            ctx.lineTo(tailX, tailY);
            ctx.stroke();

            s.x += Math.cos(s.angle) * s.speed;
            s.y += Math.sin(s.angle) * s.speed;
            s.opacity -= 0.015;

            if (s.opacity <= 0) shootingStars.splice(i, 1);
        }

        if (Date.now() > nextShootingStarTime) {
            spawnShootingStar();
            nextShootingStarTime = Date.now() + 1500 + Math.random() * 1500;
        }

        requestAnimationFrame(draw);
    }

    draw();
}
