import fs from "fs";

const MEMORY_FILE = "./memory.json";

// Load memory file
export function loadMemory() {
  if (!fs.existsSync(MEMORY_FILE)) {
    fs.writeFileSync(MEMORY_FILE, JSON.stringify({}, null, 2));
  }

  const raw = fs.readFileSync(MEMORY_FILE, "utf-8");
  return JSON.parse(raw);
}

// Save memory file
export function saveMemory(memory) {
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2));
}

// Get streamer memory object
export function getStreamerMemory(streamerName) {
  const memory = loadMemory();

  if (!memory[streamerName]) {
    memory[streamerName] = {
      viewers: {},
      lastMessages: [],
    };

    saveMemory(memory);
  }

  return memory[streamerName];
}

// Save viewer info
export function updateViewer(streamerName, viewerName, message) {
  const memory = loadMemory();

  if (!memory[streamerName]) {
    memory[streamerName] = { viewers: {}, lastMessages: [] };
  }

  if (!memory[streamerName].viewers[viewerName]) {
    memory[streamerName].viewers[viewerName] = {
      name: viewerName,
      messages: [],
      firstSeen: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
    };
  }

  const viewer = memory[streamerName].viewers[viewerName];

  viewer.lastSeen = new Date().toISOString();
  viewer.messages.push({
    text: message,
    time: new Date().toISOString(),
  });

  // Keep viewer messages limited
  if (viewer.messages.length > 20) {
    viewer.messages = viewer.messages.slice(-20);
  }

  // Keep global lastMessages limited
  memory[streamerName].lastMessages.push({
    viewer: viewerName,
    text: message,
    time: new Date().toISOString(),
  });

  if (memory[streamerName].lastMessages.length > 30) {
    memory[streamerName].lastMessages =
      memory[streamerName].lastMessages.slice(-30);
  }

  saveMemory(memory);
}

// Build memory summary string for AI
export function buildMemoryPrompt(streamerName, viewerName) {
  const memory = loadMemory();
  const streamer = memory[streamerName];

  if (!streamer) return "No memory yet.";

  const viewer = streamer.viewers[viewerName];

  if (!viewer) return `This is a new viewer named ${viewerName}.`;

  const recent = viewer.messages
    .slice(-5)
    .map((m) => `- ${m.text}`)
    .join("\n");

  return `
Viewer: ${viewerName}
First Seen: ${viewer.firstSeen}
Last Seen: ${viewer.lastSeen}

Recent Messages:
${recent}
  `.trim();
}
