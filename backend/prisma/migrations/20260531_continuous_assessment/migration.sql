DO $$ BEGIN
  CREATE TYPE "AssessmentApprovalStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ResultPublicationState" AS ENUM ('DRAFT', 'PUBLISHED', 'UNPUBLISHED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "continuous_assessments" (
  "id" TEXT PRIMARY KEY,
  "academicSession" TEXT NOT NULL,
  "sessionId" TEXT,
  "term" TEXT NOT NULL,
  "termId" TEXT,
  "classId" TEXT NOT NULL,
  "className" TEXT NOT NULL,
  "arm" TEXT,
  "section" TEXT,
  "subject" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "studentName" TEXT NOT NULL,
  "ca1" DOUBLE PRECISION,
  "ca2" DOUBLE PRECISION,
  "ca3" DOUBLE PRECISION,
  "examScore" DOUBLE PRECISION,
  "totalScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalMax" DOUBLE PRECISION NOT NULL DEFAULT 100,
  "grade" TEXT,
  "teacherRemark" TEXT,
  "positionInSubject" INTEGER,
  "classAverage" DOUBLE PRECISION,
  "firstTermAverage" DOUBLE PRECISION,
  "secondTermAverage" DOUBLE PRECISION,
  "annualCumulativeAverage" DOUBLE PRECISION,
  "approvalStatus" "AssessmentApprovalStatus" NOT NULL DEFAULT 'DRAFT',
  "isLocked" BOOLEAN NOT NULL DEFAULT false,
  "isPublished" BOOLEAN NOT NULL DEFAULT false,
  "ca1Source" TEXT NOT NULL DEFAULT 'MANUAL',
  "ca2Source" TEXT NOT NULL DEFAULT 'MANUAL',
  "ca3Source" TEXT NOT NULL DEFAULT 'MANUAL',
  "ca2SourceRecordId" TEXT,
  "ca3SourceRecordId" TEXT,
  "settingsSnapshot" JSONB,
  "correctionNote" TEXT,
  "createdBy" TEXT,
  "createdByName" TEXT,
  "updatedBy" TEXT,
  "updatedByName" TEXT,
  "submittedBy" TEXT,
  "submittedAt" TIMESTAMP(3),
  "approvedBy" TEXT,
  "approvedByName" TEXT,
  "approvedAt" TIMESTAMP(3),
  "rejectedBy" TEXT,
  "rejectedAt" TIMESTAMP(3),
  "unlockedBy" TEXT,
  "unlockedAt" TIMESTAMP(3),
  "publishedBy" TEXT,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "continuous_assessments_unique_student_subject_term"
  ON "continuous_assessments" ("studentId", "subject", "classId", "academicSession", "term");
CREATE INDEX IF NOT EXISTS "continuous_assessments_class_term_subject_idx"
  ON "continuous_assessments" ("classId", "academicSession", "term", "subject");
CREATE INDEX IF NOT EXISTS "continuous_assessments_status_publish_idx"
  ON "continuous_assessments" ("approvalStatus", "isPublished");

CREATE TABLE IF NOT EXISTS "assessment_settings" (
  "id" TEXT PRIMARY KEY,
  "classId" TEXT,
  "className" TEXT,
  "classLevel" TEXT,
  "ca1Max" DOUBLE PRECISION NOT NULL DEFAULT 10,
  "ca2Max" DOUBLE PRECISION NOT NULL DEFAULT 10,
  "ca3Max" DOUBLE PRECISION NOT NULL DEFAULT 10,
  "examMax" DOUBLE PRECISION NOT NULL DEFAULT 70,
  "totalMax" DOUBLE PRECISION NOT NULL DEFAULT 100,
  "carryForwardMode" TEXT NOT NULL DEFAULT 'SCALED_TERM_TOTAL',
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdBy" TEXT,
  "updatedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "assessment_settings_class_level_idx"
  ON "assessment_settings" ("classId", "classLevel");

CREATE TABLE IF NOT EXISTS "grading_scales" (
  "id" TEXT PRIMARY KEY,
  "grade" TEXT NOT NULL,
  "minScore" DOUBLE PRECISION NOT NULL,
  "maxScore" DOUBLE PRECISION NOT NULL,
  "remark" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "grading_scales_active_range_idx"
  ON "grading_scales" ("isActive", "minScore", "maxScore");

CREATE TABLE IF NOT EXISTS "result_approvals" (
  "id" TEXT PRIMARY KEY,
  "resultType" TEXT NOT NULL,
  "referenceId" TEXT NOT NULL,
  "approvalStatus" TEXT NOT NULL,
  "notes" TEXT,
  "approvedBy" TEXT,
  "approvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "result_approvals_reference_idx"
  ON "result_approvals" ("resultType", "referenceId");
CREATE INDEX IF NOT EXISTS "result_approvals_status_idx"
  ON "result_approvals" ("approvalStatus");

CREATE TABLE IF NOT EXISTS "result_publication_status" (
  "id" TEXT PRIMARY KEY,
  "classId" TEXT NOT NULL,
  "className" TEXT,
  "sessionId" TEXT,
  "sessionName" TEXT NOT NULL,
  "termId" TEXT,
  "termName" TEXT NOT NULL,
  "status" "ResultPublicationState" NOT NULL DEFAULT 'DRAFT',
  "isPublished" BOOLEAN NOT NULL DEFAULT false,
  "publishedBy" TEXT,
  "publishedByName" TEXT,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "result_publication_status_unique_class_term"
  ON "result_publication_status" ("classId", "sessionName", "termName");
CREATE INDEX IF NOT EXISTS "result_publication_status_state_idx"
  ON "result_publication_status" ("status", "isPublished");
