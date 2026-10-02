-- CreateEnum
CREATE TYPE "ProjectType" AS ENUM ('INVENTARIO', 'INSPECAO_EX');

-- CreateEnum
CREATE TYPE "InspectionGrade" AS ENUM ('VISUAL', 'APURADA', 'DETALHADA');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('RASCUNHO', 'EM_CAMPO', 'EM_REVISAO', 'APROVADO', 'EMITIDO');

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "pi" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "type" "ProjectType" NOT NULL,
    "grade" "InspectionGrade",
    "status" "ProjectStatus" NOT NULL DEFAULT 'RASCUNHO',
    "crmEmpresaId" TEXT,
    "clientName" TEXT NOT NULL,
    "location" TEXT,
    "technicalLead" TEXT,
    "crea" TEXT,
    "proposalNumber" TEXT,
    "contractNumber" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Project_pi_key" ON "Project"("pi");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX "Project_crmEmpresaId_idx" ON "Project"("crmEmpresaId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
