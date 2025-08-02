async function isControllerLocked {
    try {
        const res = await fetch("/api/get-nicknames");
        const data = await res.json();
        return data.locked;
    }
    catch (err) {
        console.error("Failed to fetch lock state", err);
        return false;
    }
}

function goToLeaderboard() {
    window.location.href = "/leaderboard";
}

function goToIndex() {
    window.location.href = "/index";
}

async function goToNickname() {
    const locked = await isControllerLocked();

    if (locked) {
        const password = prompt(" Controller is locked. Enter password:");
        const res = await fetch("/api/reset", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: password })
        });

        const data = await res.json();
        if (!data.valid) {
            alert("Incorrect password");
            return;
        }
    }

    window.location.href = "/nickname";
}

async function goToController() {
    const locked = await isControllerLocked();

    if (locked) {
        const password = prompt(" Controller is locked. Enter password:");
        const res = await fetch("/api/reset", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: password })
        });

        const data = await res.json();
        if (!data.valid) {
            alert("Incorrect password");
            return;
        }
    }
    
    const nickname = localStorage.getItem("nickname");
    const playerId = localStorage.getItem("playerId");
    if (nickname && playerId) {
        window.location.href = "/controller";
    } else {
        alert("You must register a nickname first!");
    }
}

function goToAdmin() {
    const correctPasskey = "noid";

    const entered = prompt("?? Enter admin passkey:");

    if (entered === correctPasskey) {
        sessionStorage.setItem("adminAccess", "true");
        window.location.href = "/admin";
    } else if (entered !== null) {
        alert("? Incorrect passkey.");
    }
}
