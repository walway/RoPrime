import { getRobloxUserId } from "../profile/robloxUserId.js";

const FRIENDS_API = "https://friends.roblox.com/v1/users";
const HEADSHOT_API = "https://thumbnails.roblox.com/v1/users/avatar-headshot";

const STATUS_LABELS = {
  0: "Offline",
  1: "Online",
  2: "In Game",
  3: "In Studio",
};

export function getFriendStatusLabel(statusType) {
  return STATUS_LABELS[Number(statusType)] || "Offline";
}

export function isFriendOnline(statusType) {
  return Number(statusType) !== 0;
}

export async function fetchFriendsData(userId) {
  const id = Number(userId);
  if (!Number.isFinite(id) || id <= 0) return null;

  const friendsRes = await fetch(`${FRIENDS_API}/${id}/friends`, {
    credentials: "include",
  });
  if (!friendsRes.ok) return null;

  const friendsJson = await friendsRes.json();
  const friends = Array.isArray(friendsJson?.data) ? friendsJson.data : [];
  if (!friends.length) {
    return { friends: [], online: [], offline: [] };
  }

  const userIds = friends
    .map((friend) => Number(friend.id))
    .filter((uid) => Number.isFinite(uid) && uid > 0);

  const statusMap = new Map();
  if (userIds.length) {
    const statusesRes = await fetch(`${FRIENDS_API}/${id}/friends/statuses`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userIds }),
    });
    if (statusesRes.ok) {
      const statusesJson = await statusesRes.json();
      for (const entry of statusesJson?.data || []) {
        statusMap.set(Number(entry.id), Number(entry.statusType ?? 0));
      }
    }
  }

  const headshotMap = new Map();
  if (userIds.length) {
    const headshotRes = await fetch(
      `${HEADSHOT_API}?userIds=${userIds.join(",")}&size=420x420&format=Png&isCircular=false`,
      { credentials: "include" },
    );
    if (headshotRes.ok) {
      const headshotJson = await headshotRes.json();
      for (const entry of headshotJson?.data || []) {
        headshotMap.set(Number(entry.targetId), String(entry.imageUrl || ""));
      }
    }
  }

  const enriched = friends.map((friend) => {
    const friendId = Number(friend.id);
    const statusType = statusMap.get(friendId) ?? 0;
    return {
      id: friendId,
      name: String(friend.name || ""),
      displayName: String(friend.displayName || friend.name || "Friend"),
      statusType,
      statusLabel: getFriendStatusLabel(statusType),
      headshotUrl: headshotMap.get(friendId) || "",
      online: isFriendOnline(statusType),
    };
  });

  return {
    friends: enriched,
    online: enriched.filter((friend) => friend.online),
    offline: enriched.filter((friend) => !friend.online),
  };
}

export async function fetchCurrentUserFriends() {
  const userId = await getRobloxUserId();
  if (!userId) return null;
  return fetchFriendsData(userId);
}
