import { NextResponse } from 'next/server';
import { parsePolicy } from '@/lib/policy/qwen';

interface PolicyRequestBody {
  text?: unknown;
}

export async function POST(request: Request): Promise<NextResponse> {
  let body: PolicyRequestBody = {};
  try {
    body = (await request.json()) as PolicyRequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  if (typeof body.text !== 'string' || body.text.trim().length === 0) {
    return NextResponse.json({ error: 'Field "text" is required.' }, { status: 422 });
  }
  if (body.text.length > 2000) {
    return NextResponse.json({ error: 'Policy text exceeds 2000 characters.' }, { status: 422 });
  }
  try {
    const result = await parsePolicy(body.text);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Policy compilation failed.' },
      { status: 502 },
    );
  }
}
