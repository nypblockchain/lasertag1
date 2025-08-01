function clearLocal() {
    localStorage.clear();
    alert("? localStorage cleared.");
}

async function clearFirestore() {
    const passkey = prompt("?? Enter admin passkey:");
    if (!passkey) return; // User cancelled prompt

    try {
        const res = await fetch("/api/clear-nicknames", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ passkey })
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

if (sessionStorage.getItem("adminAccess") !== "true") {
    alert("? Access denied. Redirecting...");
    window.location.href = "/landing.html";
}