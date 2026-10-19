import Logger from "../logger.js";
import {
  openSqliteDatabase,
  getDatabasePath,
  sqliteDatabaseExists,
} from "./sqlite.js";

const MIGRATION_LOCK_ID = 1113150549;
const BATCH_SIZE = 200;
const MAX_INT4 = 2147483647;
const TABLES = [
  "users",
  "snippets",
  "categories",
  "snippet_categories",
  "fragments",
  "shared_snippets",
  "api_keys",
  "user_settings",
  "snippet_comments",
  "notifications",
];
const IDENTITY_TABLES = ["users", "snippets", "categories", "fragments", "api_keys", "snippet_comments", "notifications"];

function formatTimestamp(date) {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

function toTimestamp(value, fallback = null) {
  if (value === null || value === undefined) return fallback;

  const text = String(value).trim();
  if (!text) return fallback;

  let date;
  const match =
    /^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?))?\s*(Z|[+-]\d{2}:?\d{2})?$/i.exec(
      text
    );
  if (match) {
    const time = match[2] || "00:00:00";
    let zone = (match[3] || "Z").toUpperCase();
    if (/^[+-]\d{4}$/.test(zone)) {
      zone = `${zone.slice(0, 3)}:${zone.slice(3)}`;
    }
    date = new Date(`${match[1]}T${time}${zone}`);
  } else {
    date = new Date(text);
  }

  if (Number.isNaN(date.getTime())) return fallback;

  const year = date.getUTCFullYear();
  if (year < 1 || year > 9999) return fallback;

  return formatTimestamp(date);
}

function toFlag(value, fallback) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") {
    const text = value.trim().toLowerCase();
    if (text === "true" || text === "1") return 1;
    if (text === "false" || text === "0" || text === "") return 0;
    return fallback;
  }
  return Number(value) !== 0 ? 1 : 0;
}

function toText(value, fallback = null) {
  if (value === null || value === undefined) return fallback;
  if (Buffer.isBuffer(value)) return value.toString("utf8");
  return String(value);
}

function toInteger(value, fallback) {
  const parsed = Math.trunc(Number(value));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readSource(sqlite) {
  const all = (table) => sqlite.prepare(`SELECT * FROM ${table}`).all();
  const sequences = new Map();

  try {
    for (const row of sqlite.prepare("SELECT name, seq FROM sqlite_sequence").all()) {
      sequences.set(row.name, row.seq);
    }
  } catch (error) {
    Logger.debug("No sqlite_sequence table found in the SQLite database");
  }

  return {
    users: all("users"),
    snippets: all("snippets"),
    categories: all("categories"),
    snippet_categories: all("snippet_categories"),
    fragments: all("fragments"),
    shared_snippets: all("shared_snippets"),
    api_keys: all("api_keys"),
    user_settings: all("user_settings"),
    snippet_comments: all("snippet_comments"),
    notifications: all("notifications"),
    sequences,
  };
}

function buildRows(source) {
  const now = new Date();
  const nowText = formatTimestamp(now);
  const recycleFallback = formatTimestamp(
    new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  );
  const skipped = {};
  const skip = (table) => {
    skipped[table] = (skipped[table] || 0) + 1;
  };

  const userIds = new Set(source.users.map((user) => user.id));
  const snippetIds = new Set(source.snippets.map((snippet) => snippet.id));
  let unownedSnippets = 0;

  const users = source.users.map((user) => {
    const username = toText(user.username, "");
    return [
      user.id,
      username,
      toText(user.username_normalized) ?? username.toLowerCase(),
      toText(user.password_hash, ""),
      toText(user.oidc_id),
      toText(user.oidc_provider),
      toText(user.email),
      toText(user.name),
      toTimestamp(user.created_at, nowText),
      toFlag(user.is_admin, 0),
      toTimestamp(user.last_login_at),
      toFlag(user.is_active, 1),
    ];
  });

  const snippets = source.snippets.map((snippet) => {
    let userId = snippet.user_id ?? null;
    if (userId !== null && !userIds.has(userId)) {
      userId = null;
      unownedSnippets++;
    }

    const hasExpiry =
      snippet.expiry_date !== null && snippet.expiry_date !== undefined;

    return [
      snippet.id,
      toText(snippet.title, ""),
      toText(snippet.description),
      toTimestamp(snippet.updated_at, nowText),
      hasExpiry ? toTimestamp(snippet.expiry_date, recycleFallback) : null,
      userId,
      toFlag(snippet.is_public, 0),
      toFlag(snippet.is_pinned, 0),
      toFlag(snippet.is_favorite, 0),
    ];
  });

  const categories = source.categories.map((category) => [
    category.id,
    toText(category.name, ""),
    toText(category.color, ""),
  ]);
  const categoryIds = new Set(source.categories.map((category) => category.id));
  const snippetCategories = source.snippet_categories.filter((link) => {
    if (!snippetIds.has(link.snippet_id) || !categoryIds.has(link.category_id)) {
      skip("snippet_categories");
      return false;
    }
    return true;
  }).map((link) => [link.snippet_id, link.category_id]);

  const fragments = [];
  for (const fragment of source.fragments) {
    if (!snippetIds.has(fragment.snippet_id)) {
      skip("fragments");
      continue;
    }
    fragments.push([
      fragment.id,
      fragment.snippet_id,
      toText(fragment.file_name, ""),
      toText(fragment.code, ""),
      toText(fragment.language, "plaintext"),
      toInteger(fragment.position, 0),
    ]);
  }

  const sharedSnippets = [];
  for (const share of source.shared_snippets) {
    if (!snippetIds.has(share.snippet_id)) {
      skip("shared_snippets");
      continue;
    }
    sharedSnippets.push([
      toText(share.id),
      share.snippet_id,
      toFlag(share.requires_auth, 0),
      toTimestamp(share.expires_at),
      toTimestamp(share.created_at, nowText),
    ]);
  }

  const apiKeys = [];
  for (const apiKey of source.api_keys) {
    if (!userIds.has(apiKey.user_id)) {
      skip("api_keys");
      continue;
    }
    apiKeys.push([
      apiKey.id,
      apiKey.user_id,
      toText(apiKey.key, ""),
      toText(apiKey.name, ""),
      toTimestamp(apiKey.created_at, nowText),
      toTimestamp(apiKey.last_used_at),
      toFlag(apiKey.is_active, 1),
    ]);
  }

  const userSettings = [];
  for (const settings of source.user_settings) {
    if (!userIds.has(settings.user_id)) {
      skip("user_settings");
      continue;
    }
    userSettings.push([
      settings.user_id,
      toText(settings.settings, "{}"),
      toTimestamp(settings.updated_at, nowText),
    ]);
  }

  const validCommentIds = new Set(source.snippet_comments
    .filter((comment) => snippetIds.has(comment.snippet_id) && userIds.has(comment.user_id))
    .map((comment) => comment.id));
  const snippetComments = [];
  for (const comment of source.snippet_comments) {
    if (!snippetIds.has(comment.snippet_id) || !userIds.has(comment.user_id)) {
      skip("snippet_comments");
      continue;
    }
    snippetComments.push([
      comment.id,
      comment.snippet_id,
      comment.user_id,
      comment.parent_comment_id && validCommentIds.has(comment.parent_comment_id) ? comment.parent_comment_id : null,
      toText(comment.content, ""),
      toTimestamp(comment.created_at, nowText),
      toTimestamp(comment.updated_at, nowText),
    ]);
  }

  const notifications = [];
  for (const notification of source.notifications) {
    if (!userIds.has(notification.recipient_user_id) || !userIds.has(notification.actor_user_id) ||
        !snippetIds.has(notification.snippet_id) || !validCommentIds.has(notification.comment_id)) {
      skip("notifications");
      continue;
    }
    notifications.push([
      notification.id,
      notification.recipient_user_id,
      notification.actor_user_id,
      notification.snippet_id,
      notification.comment_id,
      toText(notification.type, "comment"),
      toTimestamp(notification.created_at, nowText),
      toTimestamp(notification.read_at),
    ]);
  }

  return {
    skipped,
    unownedSnippets,
    tables: {
      users: {
        columns: [
          "id",
          "username",
          "username_normalized",
          "password_hash",
          "oidc_id",
          "oidc_provider",
          "email",
          "name",
          "created_at",
          "is_admin",
          "last_login_at",
          "is_active",
        ],
        rows: users,
      },
      snippets: {
        columns: [
          "id",
          "title",
          "description",
          "updated_at",
          "expiry_date",
          "user_id",
          "is_public",
          "is_pinned",
          "is_favorite",
        ],
        rows: snippets,
      },
      categories: { columns: ["id", "name", "color"], rows: categories },
      snippet_categories: { columns: ["snippet_id", "category_id"], rows: snippetCategories },
      fragments: {
        columns: ["id", "snippet_id", "file_name", "code", "language", "position"],
        rows: fragments,
      },
      shared_snippets: {
        columns: ["id", "snippet_id", "requires_auth", "expires_at", "created_at"],
        rows: sharedSnippets,
      },
      api_keys: {
        columns: [
          "id",
          "user_id",
          "key",
          "name",
          "created_at",
          "last_used_at",
          "is_active",
        ],
        rows: apiKeys,
      },
      user_settings: {
        columns: ["user_id", "settings", "updated_at"],
        rows: userSettings,
      },
      snippet_comments: {
        columns: ["id", "snippet_id", "user_id", "parent_comment_id", "content", "created_at", "updated_at"],
        rows: snippetComments,
      },
      notifications: {
        columns: ["id", "recipient_user_id", "actor_user_id", "snippet_id", "comment_id", "type", "created_at", "read_at"],
        rows: notifications,
      },
    },
  };
}

async function insertRows(tx, table, columns, rows) {
  const rowPlaceholders = `(${columns.map(() => "?").join(", ")})`;

  for (let start = 0; start < rows.length; start += BATCH_SIZE) {
    const batch = rows.slice(start, start + BATCH_SIZE);
    await tx.run(
      `INSERT INTO ${table} (${columns.join(", ")}) VALUES ${batch
        .map(() => rowPlaceholders)
        .join(", ")}`,
      batch.flat()
    );
  }
}

async function isPopulated(queryable) {
  const users = await queryable.get(
    "SELECT COUNT(*) AS count FROM users WHERE id != 0"
  );
  const snippets = await queryable.get("SELECT COUNT(*) AS count FROM snippets");
  return users.count > 0 || snippets.count > 0;
}

async function isPostgresPopulated(adapter) {
  return isPopulated(adapter);
}

async function migrateSqliteToPostgres(adapter, { force = false } = {}) {
  if (adapter.dialect.name !== "postgres") {
    throw new Error("The migration target must be a PostgreSQL database");
  }

  if (!sqliteDatabaseExists()) {
    throw new Error(`No SQLite database found at ${getDatabasePath()}`);
  }

  if (!force && (await isPopulated(adapter))) {
    Logger.info(
      "PostgreSQL already contains data, the SQLite import was skipped"
    );
    return { migrated: false };
  }

  Logger.info(`Migrating SQLite data from ${getDatabasePath()} to PostgreSQL...`);

  const sqlite = openSqliteDatabase();
  let prepared;
  let sequences;
  try {
    const source = readSource(sqlite);
    sequences = source.sequences;
    prepared = buildRows(source);
  } finally {
    sqlite.close();
  }

  const result = await adapter.transaction(async (tx) => {
    await tx.get("SELECT pg_advisory_xact_lock(?)", [MIGRATION_LOCK_ID]);

    if (!force && (await isPopulated(tx))) {
      return { migrated: false };
    }

    await tx.run(`TRUNCATE ${TABLES.join(", ")} RESTART IDENTITY`);

    const counts = {};
    for (const table of TABLES) {
      const { columns, rows } = prepared.tables[table];
      await insertRows(tx, table, columns, rows);

      const { count } = await tx.get(`SELECT COUNT(*) AS count FROM ${table}`);
      if (count !== rows.length) {
        throw new Error(
          `Row count mismatch for ${table}: expected ${rows.length}, found ${count}`
        );
      }
      counts[table] = count;
    }

    for (const table of IDENTITY_TABLES) {
      const { max } = await tx.get(
        `SELECT COALESCE(MAX(id), 0) AS max FROM ${table}`
      );
      const sequence = toInteger(sequences.get(table), 0);
      const next = Math.min(Math.max(max, sequence, 0) + 1, MAX_INT4);
      await tx.get(
        `SELECT setval(pg_get_serial_sequence('${table}', 'id'), ?, false)`,
        [next]
      );
    }

    return { migrated: true, counts };
  });

  if (!result.migrated) {
    Logger.info(
      "PostgreSQL already contains data, the SQLite import was skipped"
    );
    return result;
  }

  result.skipped = prepared.skipped;
  result.unownedSnippets = prepared.unownedSnippets;

  Logger.info(
    `SQLite to PostgreSQL migration complete: ${TABLES.map(
      (table) => `${result.counts[table]} ${table}`
    ).join(", ")}`
  );

  for (const [table, count] of Object.entries(prepared.skipped)) {
    Logger.warn(
      `Skipped ${count} orphaned row(s) in ${table} that referenced a missing parent record`
    );
  }
  if (prepared.unownedSnippets > 0) {
    Logger.warn(
      `${prepared.unownedSnippets} snippet(s) referenced a missing user and were imported without an owner`
    );
  }

  return result;
}

export { migrateSqliteToPostgres, isPostgresPopulated };
