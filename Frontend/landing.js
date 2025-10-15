let onPasskeyConfirmed = null;

function showPasskeyPrompt(callback) {
    onPasskeyConfirmed = callback;
    document.getElementById("passkeyInput").value = "";
    document.getElementById("passkeyOverlay").style.display = "flex";
    document.getElementById("passkeyInput").focus();
}

function confirmPasskey() {
    const input = document.getElementById("passkeyInput").value;
    if (onPasskeyConfirmed) {
        onPasskeyConfirmed(input);
    }
    document.getElementById("passkeyOverlay").style.display = "none";
}

const passkeyInput = document.getElementById("passkeyInput");

if (passkeyInput) {
    passkeyInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            confirmPasskey();
        }
    });
}

function cancelPasskey() {
    document.getElementById("passkeyOverlay").style.display = "none";
}

async function isControllerLocked() {
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
    localStorage.clear();
    const loadingOverlay = document.getElementById("loading-overlay");
    loadingOverlay.classList.add("visible"); // Show overlay

    try {
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
    } catch (err) {
        console.error("Error in goToNickname:", err);
    } finally {
        loadingOverlay.classList.remove("visible"); // Hide overlay
    }
}

async function goToController() {
    const loadingOverlay = document.getElementById("loading-overlay");
    loadingOverlay.classList.add("visible");

    try {
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

    } catch (err) {
        console.error("Error in goToController:", err);
    } finally {
        loadingOverlay.classList.remove("visible"); // Hide overlay
    }
}

function goToQR() {
    window.location.href = "/qr";
}

function goToAdmin() {
    const correctPasskey = "silk";

    showPasskeyPrompt((entered) => {
        if (entered === correctPasskey) {
            sessionStorage.setItem("adminAccess", "true");
            window.location.href = "/admin";
        } else {
            alert("❌ Incorrect passkey.");
        }
    });
}

window.addEventListener("DOMContentLoaded", () => {
    const loadingOverlay = document.getElementById("loading-overlay");
    if (loadingOverlay) {
        loadingOverlay.classList.remove("visible");
    }
});
