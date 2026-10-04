import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { jsonError, requireUser } from "@/lib/api";
import { ZONE_LABELS, recommendedAction } from "@/lib/inventory-rules";
import { GRADE_LABELS, PROJECT_TYPE_LABELS, STATUS_LABELS, formatPi, inspectionTag } from "@/lib/projects";

type Params = { params: Promise<{ id: string }> };

// Planilha provisória do inventário — será trocada pelo modelo da ERGA (Fase 6).
export async function GET(_request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const project = await prisma.project.findUnique({
    where: { id: (await params).id },
    include: {
      equipment: {
        orderBy: { item: "asc" },
        include: { area: true, _count: { select: { photos: true } } },
      },
    },
  });
  if (!project) return jsonError("Projeto não encontrado.", 404);

  const wb = new ExcelJS.Workbook();
  wb.creator = "Inspeção Ex · ERGA Engenharia";
  wb.created = new Date();

  const info: [string, string][] = [
    ["Projeto", `${formatPi(project.pi)} — ${project.title}`],
    ["Cliente", project.clientName],
    ["Tipo", `${PROJECT_TYPE_LABELS[project.type]}${project.grade ? ` · ${GRADE_LABELS[project.grade]}` : ""}`],
    ["Etapa", STATUS_LABELS[project.status]],
    ["Local", project.location ?? ""],
    ["Responsável técnico", [project.technicalLead, project.crea && `CREA ${project.crea}`, project.technicalLeadCert].filter(Boolean).join(" · ")],
  ];

  const sheet = wb.addWorksheet("Inventário", { views: [{ state: "frozen", ySplit: info.length + 2 }] });
  info.forEach(([k, v]) => {
    const row = sheet.addRow([k, v]);
    row.getCell(1).font = { bold: true };
  });
  sheet.addRow([]);

  const header = sheet.addRow([
    "Item", "Etiqueta", "Ambiente", "Zona", "Equipamento", "TAG (cliente)", "Qtd.", "Ex?", "Ação recomendada", "Observação", "Fotos",
  ]);
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF16405F" } };
    cell.alignment = { vertical: "middle", wrapText: true };
  });

  for (const eq of project.equipment) {
    const row = sheet.addRow([
      eq.item,
      inspectionTag(project.pi, eq.item),
      eq.area.name,
      ZONE_LABELS[eq.area.zone],
      eq.name,
      eq.clientTag ?? "",
      eq.quantity,
      eq.isEx ? "Ex" : "Não Ex",
      recommendedAction(eq.isEx),
      eq.notes ?? "",
      eq._count.photos,
    ]);
    if (!eq.isEx) row.getCell(8).font = { bold: true, color: { argb: "FFB42318" } };
    row.alignment = { vertical: "top", wrapText: true };
  }
  [6, 22, 26, 14, 26, 16, 7, 9, 30, 40, 7].forEach((w, i) => (sheet.getColumn(i + 1).width = w));

  // Plano de ação: resumo por ação e ambiente.
  const plan = wb.addWorksheet("Plano de ação");
  const planHeader = plan.addRow(["Ação recomendada", "Ambiente", "Zona", "Equipamentos", "Qtd. total"]);
  planHeader.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF16405F" } };
  });
  const groups = new Map<string, { action: string; area: string; zone: string; names: string[]; qty: number }>();
  for (const eq of project.equipment) {
    const key = `${eq.isEx}|${eq.areaId}`;
    const g = groups.get(key) ?? { action: recommendedAction(eq.isEx), area: eq.area.name, zone: ZONE_LABELS[eq.area.zone], names: [], qty: 0 };
    g.names.push(`${eq.item} · ${eq.name}`);
    g.qty += eq.quantity;
    groups.set(key, g);
  }
  [...groups.values()]
    .sort((a, b) => a.action.localeCompare(b.action) || a.area.localeCompare(b.area))
    .forEach((g) => (plan.addRow([g.action, g.area, g.zone, g.names.join("\n"), g.qty]).alignment = { vertical: "top", wrapText: true }));
  [34, 26, 16, 50, 10].forEach((w, i) => (plan.getColumn(i + 1).width = w));

  const buffer = await wb.xlsx.writeBuffer();
  const filename = `${formatPi(project.pi)}-inventario.xlsx`;
  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
