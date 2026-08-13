export const normalizeUsername = (raw: string): string => {
  if (!raw) return "@user";

  let username = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  username = username.replace(/[^a-zA-Z0-9 _]/g, "");

  username = username.replace(/\s+/g, "_");

  username = username.toLowerCase();

  if (!username.startsWith("@")) {
    username = "@" + username;
  }

  return username;
};
