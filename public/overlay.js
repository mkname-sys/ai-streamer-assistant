const channel = window.location.pathname.split("/").pop(); // get channel from URL
const overlayEl = document.getElementById("overlayMessage");

// Connect to live updates SSE
const evtSource = new EventSource(`/api/live/${channel}`);
evtSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  overlayEl.textContent = data.overlay;
};
