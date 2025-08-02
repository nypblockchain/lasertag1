function clearLocal() {
    localStorage.clear();
    alert("? localStorage cleared.");
}

function openMaze() {
    window.location.href = '/index';
}

function openMainMenu() {
    sessionStorage.clear();
    window.location.href = '/landing';
}

async function clearFirestore() {
    const passkey = prompt("Enter admin passkey:");
    if (!passkey) return;

    try {
        const res = await fetch("/api/clear-nicknames", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ passkey, mode: "nicknames" })
        });

        const data = await res.json();

        if (res.ok && data.success) {
            alert("? Firestore nicknames cleared.");
        } else {
            alert(data.error || "? Failed to clear nicknames.");
        }
    } catch (err) {
        console.error("? Error clearing Firestore:", err);
        alert("? Something went wrong.");
    }
}

async function clearLeaderboard() {
    const passkey = prompt("Enter admin passkey: ");
    if (!passkey) return;

    try {
        const res = await fetch("/api/clear-nicknames", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ passkey, mode: "winners" })
        });

        const data = await res.json();

        if (res.ok && data.success) {
            alert(data.message);
        }
        else {
            alert(data.error || "Failed to clear leaderboard.");
        }
    }
    catch (err) {
        console.error("Error clearing leaderboard: ", err);
        alert("Something went wrong while clearing the leaderboard.");
    }
}

if (sessionStorage.getItem("adminAccess") !== "true") {
    alert("Access denied. Redirecting...");
    window.location.href = "/landing.html";
}