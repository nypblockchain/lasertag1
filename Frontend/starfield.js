const canvas = document.getElementById('starfield');

if (canvas) {
    const ctx = canvas.getContext('2d');

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const numStars = 300;
    const stars = [];

    for (let i = 0; i < numStars; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            z: Math.random() * canvas.width,
        });
    }

    function drawStars() {
        ctx.fillStyle = "black";
        ctx.fillReact(0, 0, canvas.width, canvas.height);

        for (let i = 0; i < numStars; i++) {
            const s = stars[i];
            s.z -= 2;
            if (s.z <= 0) s.z = canvas.width;

            const k = 128.0 / s.z;
            const px = s.x * k + canvas.width / 2;
            const py = s.y * k + canvas.height / 2;

            if (px >= 0 && px <= canvas.width && py >= 0 && py <= canvas.height) {
                const size = (1 - s.z / canvas.width) * 2;
                ctx.fillStyle = "white";
                ctx.fillRect(px, py, size, size);
            }
        }

        requestAnimationFrame(drawStars);
    }

    drawStars();
}