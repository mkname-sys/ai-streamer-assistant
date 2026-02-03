const socket = io();
const messageEl = document.getElementById("overlay-message");

const userId = window.location.pathname.split("/").pop();

socket.emit("register", userId);

socket.on("overlay-message", (msg) => {
  messageEl.textContent = msg;
  messageEl.classList.add("show");

  clearTimeout(window.hideTimer);
  window.hideTimer = setTimeout(() => {
    messageEl.classList.remove("show");
  }, 5000);
});
