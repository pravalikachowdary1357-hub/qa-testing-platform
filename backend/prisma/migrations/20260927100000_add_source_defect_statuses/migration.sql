-- Adds the defect lifecycle statuses from the TestSphere requirements:
-- New -> Assigned -> In Progress -> Fixed -> Ready for Retest -> Retested
-- -> Closed, plus Rejected / Duplicate / Deferred / Cannot Reproduce.
-- Purely additive: existing values (OPEN, IN_PROGRESS, RESOLVED, REOPENED,
-- CLOSED) and every existing defect row are left exactly as they are.
ALTER TYPE "DefectStatus" ADD VALUE IF NOT EXISTS 'NEW' BEFORE 'OPEN';
ALTER TYPE "DefectStatus" ADD VALUE IF NOT EXISTS 'ASSIGNED' BEFORE 'IN_PROGRESS';
ALTER TYPE "DefectStatus" ADD VALUE IF NOT EXISTS 'FIXED' BEFORE 'RESOLVED';
ALTER TYPE "DefectStatus" ADD VALUE IF NOT EXISTS 'READY_FOR_RETEST' BEFORE 'RESOLVED';
ALTER TYPE "DefectStatus" ADD VALUE IF NOT EXISTS 'RETESTED' BEFORE 'RESOLVED';
ALTER TYPE "DefectStatus" ADD VALUE IF NOT EXISTS 'REJECTED';
ALTER TYPE "DefectStatus" ADD VALUE IF NOT EXISTS 'DUPLICATE';
ALTER TYPE "DefectStatus" ADD VALUE IF NOT EXISTS 'DEFERRED';
ALTER TYPE "DefectStatus" ADD VALUE IF NOT EXISTS 'CANNOT_REPRODUCE';
