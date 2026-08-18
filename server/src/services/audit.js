import { query } from '../db.js';

function safeMetadata(metadata) {
  if (!metadata) return null;
  const blocked = new Set(['password', 'newPassword', 'currentPassword', 'token', 'code']);
  const entries = Object.entries(metadata)
    .filter(([key]) => !blocked.has(key))
    .slice(0, 30);
  return JSON.stringify(Object.fromEntries(entries)).slice(0, 8000);
}

export async function writeAuditLog({
  req,
  actorUserId,
  action,
  entityType = null,
  entityId = null,
  metadata = null,
}) {
  try {
    await query(
      `INSERT INTO AuditLogs
       (ActorUserId, Action, EntityType, EntityId, MetadataJson, IpAddress)
       VALUES (@actorUserId, @action, @entityType, @entityId, @metadata, @ip)`,
      {
        actorUserId: actorUserId || null,
        action,
        entityType,
        entityId: entityId == null ? null : String(entityId),
        metadata: safeMetadata(metadata),
        ip: String(req?.ip || req?.socket?.remoteAddress || '').slice(0, 64) || null,
      }
    );
  } catch (error) {
    console.warn('[Audit] Failed to persist event:', action, error.message);
  }
}
