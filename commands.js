const cooldowns = {};

export function isModOrBroadcaster(tags, channelName) {
  const user = tags.username?.toLowerCase();
  const channel = channelName.toLowerCase();

  if (user === channel) return true; // broadcaster
  if (tags.mod) return true;
  if (tags.badges && tags.badges.broadcaster === "1") return true;
  if (tags.badges && tags.badges.moderator === "1") return true;

  return false;
}

export function isOnCooldown(channel, command, seconds = 5) {
  const key = `${channel}_${command}`;
  const now = Date.now();

  if (!cooldowns[key]) {
    cooldowns[key] = now;
    return false;
  }

  const diff = (now - cooldowns[key]) / 1000;

  if (diff < seconds) {
    return true;
  }

  cooldowns[key] = now;
  return false;
}
