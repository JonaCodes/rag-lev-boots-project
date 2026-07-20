// Shared by config.cjs (required directly by sequelize-cli) and database.ts
// (required via createRequire, since this project runs as ESM). Keeping this
// logic in exactly one place avoids the three copies that used to exist here,
// in config.cjs, and in test-encode-password.ts drifting out of sync.
function encodePasswordInUrl(url) {
  if (!url) return url;
  try {
    const protocolIndex = url.indexOf('://');
    if (protocolIndex === -1) return url;
    const protocol = url.substring(0, protocolIndex);
    const rest = url.substring(protocolIndex + 3);

    const atIndex = rest.lastIndexOf('@');
    if (atIndex === -1) return url;
    const authority = rest.substring(0, atIndex);
    const hostAndDb = rest.substring(atIndex + 1);

    const colonIndex = authority.indexOf(':');
    if (colonIndex === -1) return url;
    const username = authority.substring(0, colonIndex);
    const password = authority.substring(colonIndex + 1);

    const encodedPassword = encodeURIComponent(decodeURIComponent(password));
    return `${protocol}://${username}:${encodedPassword}@${hostAndDb}`;
  } catch (e) {
    return url;
  }
}

module.exports = { encodePasswordInUrl };
