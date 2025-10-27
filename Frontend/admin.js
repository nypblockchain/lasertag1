let onPasskeyConfirmed = null;

function closeModal() {
    const box = document.getElementById("passkeyBox");
    box.classList.add("fade-out");

    setTimeout(() => {
        document.getElementById("passkeyOverlay").style.display = "none";
        box.classList.remove("fade-out");
        document.getElementById("maskedPasskey").value = "";
    }, 300);
}

function confirmPasskey() {
    const passkey = document.getElementById("maskedPasskey").value;

    if (onPasskeyConfirmed && passkey) {
        onPasskeyConfirmed(passkey);
    }

    closeModal();
}

function cancelPasskey() {
    closeModal();
}

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
    onPasskeyConfirmed = async (passkey) => {
        showLoading();

        try {
            const res = await fetch("/api/clear-nicknames", {
                method: POST,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ passkey })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                alert(data.message || "All nicknames cleared");
            } else {
                alert(data.message || "Failed to clear nicknames in Firestore.");
            }
        } catch (err) {
            console.error("Error clearing nicknames: ", err);
            alert("Something went wrong while clearing nicknames in Firestore.");
        } finally {
            hideLoading();
        }
    };

    document.getElementById("passkeyOverlay").style.display = "flex";
}

 async function clearLeaderboard() {
     onPasskeyConfirmed = async (passkey) => {
         showLoading();

         try {
             const res = await fetch("/api/clear-nicknames", {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ passkey, mode: "winners" })
             });

             const data = await res.json();

             if (res.ok && data.success) {
                 alert(data.message);
             } else {
                 alert(data.error || "Failed to clear leaderboard.");
             }
         } catch (err) {
             console.error("Error clearing leaderboard: ", err);
             alert("Something went wrong while clearing the leaderboard.");
         }
         finally {
             hideLoading();
         }
    };
    document.getElementById("passkeyOverlay").style.display = "flex";
}

async function lockController() {
    showLoading();
    try {
        const res = await fetch("/api/reset", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lockState: true })
        });

        const data = await res.json();
        if (data.success) {
            alert("Controller locked.");
        }
        else {
            alert("Failed to lock controller.");
        }
    }
    catch (err) {
        console.error("Something went wrong with locking controller", err);
        alert("Error locking controller.");
    }
    finally {
        hideLoading();
    }
}

async function unlockController() {
    showLoading();
    try {
        const res = await fetch("/api/reset", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lockState: false })
        });

        const data = await res.json();
        if (data.success) {
            alert("Controller unlocked.");
        } else {
            alert("Failed to unlock controller.");
        }
    }
    catch (err) {
        console.error("Error unlocking controller", err);
        alert("Error unlocking controller.")
    }
    finally {
        hideLoading();
    }
}

async function resetMaze() {
    showLoading();
    try {
        const res = await fetch("/api/reset", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({})
        });

        if (!res.ok) {
            const text = await res.text();
            console.error("Reset failed:", res.status, text);
            alert("Reset failed. Check console for details.");
            return;
        }

        const data = await res.json();
        console.log(data.message || "Maze reset");

        if (data.success) {
            alert("Maze has been reset.")
        } else {
            alert("Failed to reset maze.")
        }

        await fetchMazeAndPlayers();
    } catch (err) {
        console.error("Maze reset failed:", err)
    } finally {
        hideLoading();
    }
}

function showLoading() {
    const loadingOverlay = document.getElementById("loading-overlay");
    if (loadingOverlay) {
        loadingOverlay.classList.add("visible");
    }
}

function hideLoading() {
    const loadingOverlay = document.getElementById("loading-overlay");
    if (loadingOverlay) {
        loadingOverlay.classList.remove("visible");
    }
}

window.addEventListener("DOMContentLoaded", () => {
    const loadingOverlay = document.getElementById("loading-overlay");
    if (loadingOverlay) {
        loadingOverlay.classList.remove("visible");
    }
});

if (sessionStorage.getItem("adminAccess") !== "true") {
    alert("Access denied. Redirecting...");
    window.location.href = "/landing";
}