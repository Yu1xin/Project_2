import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
// 假设你已经有了 safeMean, computeMultipleRegression 等函数，从原来的 route.ts 复制过来

export async function POST(req: NextRequest) {
  try {
    const { variables } = await req.json();
    if (!Array.isArray(variables) || variables.length === 0) {
      return NextResponse.json({ error: '缺少 variables 参数' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // 这里重复查询数据（或优化成从缓存拿，但简单起见重复一次）
    const [captionsRes, responsesRes, modelsRes, flavorsRes] = await Promise.all([
      // ... 同原来的查询 ...
    ]);

    // ... 同原来的数据合并逻辑，得到 mergedRows ...

    // 过滤有效数据
    const validRows = mergedRows.filter(r =>
      Number.isFinite(r.like_count) &&
      Number.isFinite(r.caption_char_len) &&
      Number.isFinite(r.caption_word_count) &&
      (variables.includes('proc_time') ? r.processing_time_seconds != null && Number.isFinite(r.processing_time_seconds) : true)
    );

    const y = validRows.map(r => r.like_count);

    const xMatrix = validRows.map(r => {
      const row: number[] = [];
      if (variables.includes('char_len')) row.push(r.caption_char_len);
      if (variables.includes('word_count')) row.push(r.caption_word_count);
      if (variables.includes('proc_time')) row.push(r.processing_time_seconds!);
      return row;
    });

    const result = computeMultipleRegression(y, xMatrix);

    return NextResponse.json({
      coefficients: result.coefficients,
      r2: result.r2,
      n: result.n,
      selected: variables,
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}