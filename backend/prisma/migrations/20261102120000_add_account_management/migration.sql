-- Account management from the admin panel (additive).
-- AlterTable
ALTER TABLE "admin_audit_logs" ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "created_by_id" TEXT,
ADD COLUMN     "deleted_by_id" TEXT;
