-- CreateEnum
CREATE TYPE "FinanceApprovalStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "FinanceStudentProfile" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "studentType" TEXT NOT NULL DEFAULT 'REGULAR',
    "canStudentView" BOOLEAN NOT NULL DEFAULT true,
    "canParentView" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceStudentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceFeeStructure" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "session" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "studentType" TEXT NOT NULL DEFAULT 'REGULAR',
    "title" TEXT,
    "description" TEXT,
    "status" "FinanceApprovalStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "submittedById" TEXT,
    "submittedByName" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "approvedByName" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectedById" TEXT,
    "rejectedByName" TEXT,
    "rejectionReason" TEXT,
    "createdById" TEXT,
    "createdByName" TEXT,
    "updatedById" TEXT,
    "updatedByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceFeeStructure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceFeeComponent" (
    "id" TEXT NOT NULL,
    "feeStructureId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "amount" INTEGER NOT NULL,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "visibleToStudent" BOOLEAN NOT NULL DEFAULT true,
    "visibleToParent" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceFeeComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceFeeApproval" (
    "id" TEXT NOT NULL,
    "feeStructureId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "status" "FinanceApprovalStatus" NOT NULL,
    "notes" TEXT,
    "actorId" TEXT,
    "actorName" TEXT,
    "actorRole" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinanceFeeApproval_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FinanceStudentProfile_studentId_key" ON "FinanceStudentProfile"("studentId");

-- CreateIndex
CREATE INDEX "FinanceFeeStructure_classId_session_term_studentType_status_idx" ON "FinanceFeeStructure"("classId", "session", "term", "studentType", "status");

-- CreateIndex
CREATE INDEX "FinanceFeeStructure_session_term_status_idx" ON "FinanceFeeStructure"("session", "term", "status");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceFeeComponent_feeStructureId_code_key" ON "FinanceFeeComponent"("feeStructureId", "code");

-- CreateIndex
CREATE INDEX "FinanceFeeComponent_feeStructureId_sortOrder_idx" ON "FinanceFeeComponent"("feeStructureId", "sortOrder");

-- CreateIndex
CREATE INDEX "FinanceFeeApproval_feeStructureId_createdAt_idx" ON "FinanceFeeApproval"("feeStructureId", "createdAt");

-- AddForeignKey
ALTER TABLE "FinanceStudentProfile" ADD CONSTRAINT "FinanceStudentProfile_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceFeeStructure" ADD CONSTRAINT "FinanceFeeStructure_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceFeeComponent" ADD CONSTRAINT "FinanceFeeComponent_feeStructureId_fkey" FOREIGN KEY ("feeStructureId") REFERENCES "FinanceFeeStructure"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceFeeApproval" ADD CONSTRAINT "FinanceFeeApproval_feeStructureId_fkey" FOREIGN KEY ("feeStructureId") REFERENCES "FinanceFeeStructure"("id") ON DELETE CASCADE ON UPDATE CASCADE;
