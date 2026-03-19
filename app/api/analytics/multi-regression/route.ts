// app/api/analytics/multi-regression/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { MergedRow } from '@/types/analytics';  // 只保留需要的类型

// 复制工具函数过来（从原来的 analytics/route.ts 复制）
function safeMean(arr: number[]) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function computeSimpleLinearRegression(points: { x: number; y: number }[]) {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: 0, r2: 0, n };
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const meanX = safeMean(xs);
  const meanY = safeMean(ys);
  let numerator = 0, denominator = 0;
  for (const p of points) {
    numerator += (p.x - meanX) * (p.y - meanY);
    denominator += (p.x - meanX) ** 2;
  }
  const slope = denominator === 0 ? 0 : numerator / denominator;
  const intercept = meanY - slope * meanX;
  let ssTot = 0, ssRes = 0;
  for (const p of points) {
    const yHat = intercept + slope * p.x;
    ssTot += (p.y - meanY) ** 2;
    ssRes += (p.y - yHat) ** 2;
  }
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
  return { slope, intercept, r2, n };
}

// 占位多元回归函数（后面可完善）
function computeMultipleRegression(y: number[], xMatrix: number[][]) {
  // 当前简单返回平均值 + 0 系数（避免报错）
  const n = y.length;
  const k = xMatrix[0]?.length || 0;
  return {
    coefficients: [safeMean(y), ...new Array(k).fill(0)],
    r2: 0,
    n
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { variables } = body;

    if (!Array.isArray(variables) || variables.length === 0) {
      return NextResponse.json({ error: '缺少或无效的 variables 参数' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const [
      captionsRes,
      responsesRes,
      modelsRes,
      flavorsRes
    ] = await Promise.all([
      supabase.from('captions').select('caption_request_id, like_count, content'),
      supabase.from('llm_model_responses').select('caption_request_id, processing_time_seconds, llm_model_id, humor_flavor_id'),
      supabase.from('llm_models').select('id, name'),
      supabase.from('humor_flavors').select('id, description')
    ]);

    if (captionsRes.error || responsesRes.error || modelsRes.error || flavorsRes.error) {
      return NextResponse.json(
        { error: captionsRes.error?.message || 'Database query failed' },
        { status: 500 }
      );
    }

    const captions = captionsRes.data ?? [];
    const responses = responsesRes.data ?? [];
    const models = modelsRes.data ?? [];
    const flavors = flavorsRes.data ?? [];

    const responseByCaptionRequestId = new Map<string, any>();
    for (const r of responses) {
      if (r.caption_request_id) responseByCaptionRequestId.set(r.caption_request_id, r);
    }

    const modelNameById = new Map<number, string>();
    for (const m of models) {
      if (m.id && m.name) modelNameById.set(m.id, m.name);
    }

    const flavorNameById = new Map<number, string>();
    for (const f of flavors) {
      if (f.id && f.description) flavorNameById.set(f.id, f.description);
    }

    const mergedRows: MergedRow[] = captions
      .map((c: any) => {
        const reqId = c.caption_request_id;
        const response = reqId ? responseByCaptionRequestId.get(reqId) : undefined;
        return {
          like_count: Number(c.like_count ?? 0),
          caption_char_len: (c.content ?? '').length,
          caption_word_count: (c.content ?? '').trim().split(/\s+/).filter(Boolean).length,
          processing_time_seconds:
            response?.processing_time_seconds != null
              ? Number(response.processing_time_seconds)
              : null,
          llm_model_name:
            response?.llm_model_id != null
              ? modelNameById.get(response.llm_model_id) ?? 'Unknown'
              : null,
          humor_flavor_name:
            response?.humor_flavor_id != null
              ? flavorNameById.get(response.humor_flavor_id) ?? 'Unknown'
              : null,
        };
      })
      .filter((row) => Number.isFinite(row.like_count) && Number.isFinite(row.caption_char_len));

    // 过滤有效行（根据选择的变量）
    const validRows = mergedRows.filter(r => {
      if (variables.includes('proc_time') && (r.processing_time_seconds == null || !Number.isFinite(r.processing_time_seconds))) {
        return false;
      }
      return true;
    });

    const y = validRows.map(r => r.like_count);

    const xMatrix = validRows.map(r => {
      const row: number[] = [];
      if (variables.includes('char_len')) row.push(r.caption_char_len);
      if (variables.includes('word_count')) row.push(r.caption_word_count);
      if (variables.includes('proc_time')) row.push(r.processing_time_seconds!);
      return row;
    });

    // 计算多元回归（当前是占位版）
    const result = computeMultipleRegression(y, xMatrix);

    return NextResponse.json({
      coefficients: result.coefficients,
      r2: result.r2,
      n: result.n,
      selected: variables
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}