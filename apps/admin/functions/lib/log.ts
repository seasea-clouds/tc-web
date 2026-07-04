/**
 * Log helper — write operation logs
 */

interface LogData {
  adminId: string;
  adminName: string;
  action: string;
  targetType: string;
  targetId: string;
  targetSummary: string;
  detail?: string;
  ip?: string;
}

export async function createLog(db: any, data: LogData): Promise<void> {
  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO admin_logs (id, admin_id, admin_name, action, target_type, target_id, target_summary, detail, ip)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      data.adminId,
      data.adminName,
      data.action,
      data.targetType,
      data.targetId,
      data.targetSummary,
      data.detail || null,
      data.ip || null,
    )
    .run();
}
