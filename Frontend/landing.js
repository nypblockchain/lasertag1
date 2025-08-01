function goToLeaderboard() {
    window.location.href = "/leaderboard";
}

function goToIndex() {
    window.location.href = "/index";
}

function goToNickname() {
    window.location.href = "/nickname";
}

function goToController() {
    const nickname = localStorage.getItem("nickname");
    const playerId = localStorage.getItem("playerId");
    if (nickname && playerId) {
        window.location.href = "/controller";
    } else {
        alert("?? You must register a nickname first!");
    }
}

function goToAdmin() {
    const correctPasskey = "noSignificance123";

    const entered = prompt("?? Enter admin passkey:");

    if (entered === correctPasskey) {
        sessionStorage.setItem("adminAccess", "true");
        window.location.href = "/admin";
    } else if (entered !== null) {
        alert("? Incorrect passkey.");
    }
}
