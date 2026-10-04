import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, requireUser } from "@/lib/api";
import { areaSchema } from "@/lib/validation";
import { editableProject } from "@/lib/inventory";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const { id } = await params;
  const target = await editableProject(id);
  if (target.error) return target.error;

  const parsed = await parseBody(request, areaSchema);
  if (parsed.error) return parsed.error;

  const area = await prisma.area.create({ data: { ...parsed.data, projectId: id } });
  return NextResponse.json(area, { status: 201 });
}
