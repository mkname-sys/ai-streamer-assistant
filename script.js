const channelSelect = document.getElementById("channel");
const aiToggle = document.getElementById("ai");
const voiceToggle = document.getElementById("voice");

async function loadChannels() {
  const channels = await fetch("/api/channels").then(r => r.json());
  channelSelect.innerHTML = channels.map(c =>
    `<option value="${c}">${c}</option>`
  ).join("");
  loadSettings();
}

async function loadSettings() {
  const chan = channelSelect.value;
  const s = await fetch(`/api/settings/${chan}`).then(r => r.json());
  aiToggle.checked = s.ai;
  voiceToggle.checked = s.voice;
}

async function save() {
  const chan = channelSelect.value;
  await fetch(`/api/settings/${chan}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ai: aiToggle.checked,
      voice: voiceToggle.checked
    })
  });
}

channelSelect.onchange = loadSettings;
aiToggle.onchange = save;
voiceToggle.onchange = save;

loadChannels();
