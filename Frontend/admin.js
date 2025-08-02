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
        try {
            const res = await fetch("/api/clear-nicknames", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ passkey, mode: "nicknames" }) // different mode!
            });

            const data = await res.json();

            if (res.ok && data.success) {
                alert(data.message);
            }
            else {
                alert(data.error || "Failed to clear nicknames in Firestore.");
            }
        }
        catch (err) {
            console.error("Error clearing nicknames: ", err);
            alert("Something went wrong while clearing nicknames in Firestore.");
        }
    };
    document.getElementById("passkeyOverlay").style.display = "flex";
}

 async function clearLeaderboard() {
    onPasskeyConfirmed = async (passkey) => {
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
    };
    document.getElementById("passkeyOverlay").style.display = "flex";
}

if (sessionStorage.getItem("adminAccess") !== "true") {
    alert("Access denied. Redirecting...");
    window.location.href = "/landing.html";
}