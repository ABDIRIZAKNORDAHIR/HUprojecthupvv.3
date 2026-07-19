/** Translate common T-SQL patterns to cloud-friendly SQL dialects. */

function translateStringConcatPostgres(sql) {
  let q = sql;
  const re = /([a-zA-Z_][\w.]*|\([^)]+\))\s+\+\s+'([^']*)'\s+\+\s+([a-zA-Z_][\w.]*|\([^)]+\))/;
  let prev;
  do {
    prev = q;
    q = q.replace(re, "$1 || '$2' || $3");
  } while (prev !== q);
  return q;
}

/**
 * MySQL uses CONCAT(); || is logical OR unless PIPES_AS_CONCAT is on.
 * Merge T-SQL `a + 'x' + b` chains into a single CONCAT(...) — never nest as CONCATCONCAT.
 */
function translateStringConcatMySQL(sql) {
  let q = sql;
  const atom = String.raw`(?:CONCAT\([^()]*\)|[a-zA-Z_][\w]*\.[a-zA-Z_][\w]*|[a-zA-Z_][\w]*)`;
  const triple = new RegExp(`(${atom})\\s*\\+\\s*'([^']*)'\\s*\\+\\s*(${atom})`, 'g');

  const mergeArgs = (expr) =>
    expr.startsWith('CONCAT(') && expr.endsWith(')') ? expr.slice(7, -1) : expr;

  let prev;
  do {
    prev = q;
    q = q.replace(triple, (_, a, str, b) => {
      if (a === 'CONCAT' || b === 'CONCAT') return `${a} + '${str}' + ${b}`;
      return `CONCAT(${mergeArgs(a)}, '${str}', ${mergeArgs(b)})`;
    });
  } while (q !== prev);

  // Trailing CONCAT(...) + 'str' or CONCAT(...) + ident
  const trailStr = /(CONCAT\([^()]*\))\s*\+\s*'([^']*)'/g;
  do {
    prev = q;
    q = q.replace(trailStr, (_, c, str) => `CONCAT(${mergeArgs(c)}, '${str}')`);
  } while (q !== prev);

  const trailId = new RegExp(`(CONCAT\\([^()]*\\))\\s*\\+\\s*(${atom})`, 'g');
  do {
    prev = q;
    q = q.replace(trailId, (_, c, id) => {
      if (id === 'CONCAT') return `${c} + ${id}`;
      return `CONCAT(${mergeArgs(c)}, ${mergeArgs(id)})`;
    });
  } while (q !== prev);

  return q;
}

function translateTop(sql) {
  let q = sql;
  const re = /\bSELECT\s+TOP\s+(\d+)\s+/gi;
  let match;
  const replacements = [];

  while ((match = re.exec(sql)) !== null) {
    replacements.push({ index: match.index, len: match[0].length, n: match[1] });
  }

  if (!replacements.length) return q;

  for (let i = replacements.length - 1; i >= 0; i--) {
    const { index, len, n } = replacements[i];
    const before = q.slice(0, index);
    const after = q.slice(index + len);

    let depth = 0;
    let end = 0;
    for (let j = 0; j < after.length; j++) {
      if (after[j] === '(') depth++;
      if (after[j] === ')') {
        if (depth === 0) {
          end = j;
          break;
        }
        depth--;
      }
    }

    const body = end ? after.slice(0, end) : after;
    const tail = end ? after.slice(end) : '';

    if (/\bLIMIT\s+\d+/i.test(body)) {
      q = before + 'SELECT ' + after;
      continue;
    }

    let newBody = body;
    const orderMatch = body.match(/\bORDER BY\b[\s\S]*$/i);
    if (orderMatch) {
      const orderIdx = body.lastIndexOf(orderMatch[0]);
      newBody = body.slice(0, orderIdx + orderMatch[0].length) + ` LIMIT ${n}` + body.slice(orderIdx + orderMatch[0].length);
    } else {
      newBody = body.trimEnd() + ` LIMIT ${n}`;
    }

    q = before + 'SELECT ' + newBody + tail;
  }

  return q;
}

/** OUTER/CROSS APPLY → LEFT/INNER JOIN LATERAL ... ON TRUE (MySQL 8.0.14+ / Postgres) */
function translateApply(sql) {
  return sql.replace(
    /\b(OUTER|CROSS)\s+APPLY\s*\(([\s\S]*?)\)\s+(\w+)/gi,
    (_, type, body, alias) => {
      const join = /^OUTER$/i.test(type) ? 'LEFT JOIN LATERAL' : 'INNER JOIN LATERAL';
      return `${join} (${body}) ${alias} ON TRUE`;
    }
  );
}

function translateOutputInserted(sql) {
  let q = sql;

  q = q.replace(
    /(UPDATE[\s\S]+?)\s+OUTPUT\s+INSERTED\.(\*|[\w.\s,]+?)\s+(WHERE[\s\S]+?)(;?\s*)$/i,
    (_, updatePart, cols, wherePart, tail) => {
      const returning = cols.trim() === '*' ? '*' : cols.replace(/\s*INSERTED\./g, '').trim();
      return `${updatePart} ${wherePart} RETURNING ${returning}${tail}`;
    }
  );

  q = q.replace(
    /(INSERT INTO[\s\S]+?)\s+OUTPUT\s+INSERTED\.(\*|[\w.\s,]+?)\s+(VALUES[\s\S]+)/i,
    (_, insertPart, cols, valuesPart) => {
      const returning = cols.trim() === '*' ? '*' : cols.replace(/\s*INSERTED\./g, '').trim();
      return `${insertPart} ${valuesPart.trim()} RETURNING ${returning}`;
    }
  );

  return q;
}

/** Strip T-SQL OUTPUT INSERTED — MySQL has no RETURNING; mysql.js refetches via insertId. */
export function stripOutputInsertedMySQL(sql) {
  let q = sql;

  q = q.replace(
    /(UPDATE[\s\S]+?)\s+OUTPUT\s+INSERTED\.(?:\*|[\w.\s,]+?)\s+(WHERE[\s\S]+?)(;?\s*)$/i,
    '$1 $2$3'
  );

  q = q.replace(
    /(INSERT\s+INTO[\s\S]+?)\s+OUTPUT\s+INSERTED\.(?:\*|[\w.\s,]+?)\s+(VALUES[\s\S]+)/i,
    '$1 $2'
  );

  return q;
}

export function detectOutputInserted(sql) {
  const insert = sql.match(
    /INSERT\s+INTO\s+`?(\w+)`?[\s\S]*?\bOUTPUT\s+INSERTED\.(\*|[\w.\s,]+?)(?=\s+VALUES\b)/i
  );
  if (insert) {
    return {
      kind: 'insert',
      table: insert[1],
      cols: insert[2].trim() === '*' ? '*' : insert[2].replace(/\s*INSERTED\./gi, '').split(',').map((c) => c.trim()).filter(Boolean),
    };
  }

  const update = sql.match(
    /UPDATE\s+`?(\w+)`?[\s\S]*?\bOUTPUT\s+INSERTED\.(\*|[\w.\s,]+?)\s+(WHERE[\s\S]+?)(?:;|$)/i
  );
  if (update) {
    return {
      kind: 'update',
      table: update[1],
      cols: update[2].trim() === '*' ? '*' : update[2].replace(/\s*INSERTED\./gi, '').split(',').map((c) => c.trim()).filter(Boolean),
      where: update[3],
    };
  }

  return null;
}

export const MYSQL_PRIMARY_KEYS = {
  Users: 'UserId',
  Settings: 'SettingKey',
  Projects: 'ProjectId',
  ProjectMembers: 'ProjectMemberId',
  ProjectInvitations: 'InvitationId',
  Submissions: 'SubmissionId',
  AIAnalyses: 'AnalysisId',
  Messages: 'MessageId',
  Notifications: 'NotificationId',
  Conversations: 'ConversationId',
  ConversationMembers: 'ConversationMemberId',
  ConversationMessages: 'ConversationMessageId',
  ProjectEvaluations: 'EvaluationId',
  DocumentAnalyses: 'DocumentAnalysisId',
  ProjectAIChatMessages: 'MessageId',
  ClassAssignments: 'AssignmentId',
  ClassAssignmentSubmissions: 'SubmissionId',
};

function translateMergeSettings(sql, dialect = 'postgres') {
  if (!/MERGE\s+Settings/i.test(sql)) return sql;

  if (/UpdatedBy = @userId/i.test(sql)) {
    if (dialect === 'mysql') {
      return `INSERT INTO Settings (SettingKey, SettingValue, UpdatedBy)
        VALUES (@key, @value, @userId)
        ON DUPLICATE KEY UPDATE
          SettingValue = VALUES(SettingValue),
          UpdatedAt = NOW(),
          UpdatedBy = VALUES(UpdatedBy)`;
    }
    return `INSERT INTO Settings (SettingKey, SettingValue, UpdatedBy)
      VALUES (@key, @value, @userId)
      ON CONFLICT (SettingKey) DO UPDATE SET
        SettingValue = EXCLUDED.SettingValue,
        UpdatedAt = NOW(),
        UpdatedBy = EXCLUDED.UpdatedBy`;
  }

  if (dialect === 'mysql') {
    return `INSERT INTO Settings (SettingKey, SettingValue)
      VALUES (@key, @value)
      ON DUPLICATE KEY UPDATE
        SettingValue = VALUES(SettingValue)`;
  }

  return `INSERT INTO Settings (SettingKey, SettingValue)
    VALUES (@key, @value)
    ON CONFLICT (SettingKey) DO UPDATE SET SettingValue = EXCLUDED.SettingValue`;
}

export function translateForPostgres(sql) {
  let q = sql;

  q = translateMergeSettings(q, 'postgres');

  q = q.replace(
    /IF NOT EXISTS \(SELECT 1 FROM ConversationMembers WHERE ConversationId = @cid AND UserId = @uid\)\s+INSERT INTO ConversationMembers \(ConversationId, UserId\) VALUES \(@cid, @uid\)/gi,
    'INSERT INTO ConversationMembers (ConversationId, UserId) VALUES (@cid, @uid) ON CONFLICT (ConversationId, UserId) DO NOTHING'
  );

  q = q.replace(/\bdbo\./gi, '');
  q = translateStringConcatPostgres(q);
  q = q.replace(/\bSYSUTCDATETIME\(\)/gi, 'NOW()');
  q = q.replace(/DATEADD\(MINUTE,\s*-(\d+),\s*NOW\(\)\)/gi, (_, n) => `NOW() - INTERVAL '${n} minutes'`);
  q = q.replace(/DATEADD\(DAY,\s*-(\d+),\s*NOW\(\)\)/gi, (_, n) => `NOW() - INTERVAL '${n} days'`);
  q = translateApply(q);
  q = translateTop(q);
  q = translateOutputInserted(q);

  return q;
}

export function translateForMySQL(sql) {
  let q = sql;

  q = translateMergeSettings(q, 'mysql');

  q = q.replace(
    /IF NOT EXISTS \(SELECT 1 FROM ConversationMembers WHERE ConversationId = @cid AND UserId = @uid\)\s+INSERT INTO ConversationMembers \(ConversationId, UserId\) VALUES \(@cid, @uid\)/gi,
    'INSERT IGNORE INTO ConversationMembers (ConversationId, UserId) VALUES (@cid, @uid)'
  );

  q = q.replace(/\bdbo\./gi, '');
  q = translateStringConcatMySQL(q);
  q = q.replace(/\bSYSUTCDATETIME\(\)/gi, 'NOW()');
  q = q.replace(/DATEADD\(MINUTE,\s*-(\d+),\s*NOW\(\)\)/gi, (_, n) => `DATE_SUB(NOW(), INTERVAL ${n} MINUTE)`);
  q = q.replace(/DATEADD\(DAY,\s*-(\d+),\s*NOW\(\)\)/gi, (_, n) => `DATE_SUB(NOW(), INTERVAL ${n} DAY)`);
  q = q.replace(/\bISNULL\(/gi, 'IFNULL(');
  q = q.replace(/\bCONVERT\(/gi, 'CAST(');
  q = translateApply(q);
  q = translateTop(q);
  q = stripOutputInsertedMySQL(q);

  return q;
}

export function bindNamedParams(sql, params = {}) {
  const indexByKey = {};
  const values = [];
  const text = sql.replace(/@(\w+)/g, (_, key) => {
    if (!(key in params)) {
      throw new Error(`Missing SQL parameter @${key}`);
    }
    if (!(key in indexByKey)) {
      indexByKey[key] = values.length + 1;
      values.push(params[key]);
    }
    return `$${indexByKey[key]}`;
  });
  return { text, values };
}
