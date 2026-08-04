// Cloudflare Pages Function — 跨设备同步中转
// KV 绑定名：studybench_sync（在 Cloudflare Pages 后台 Settings → Functions → KV namespace bindings 添加）
//
// GET  /api/sync?code=XXXX        -> { lm:number, data:object } 或 404
// POST /api/sync  body {code,lm,data} -> { ok:true, lm } 或 409（云端已有更新的数据）
//
// 设计要点：
//  - code 经 SHA-256 哈希后作为 KV key，避免明文 key 与特殊字符问题
//  - 采用 last-write-wins：推送时携带 lm（时间戳），云端仅在 incoming.lm > 已存 lm 时写入
//    若 incoming.lm <= 已存 lm 返回 409，提示客户端先拉取，避免用旧数据覆盖新数据
//  - 不存储任何登录态，谁持有 code 谁即可读写对应 vault（家庭共享同一份数据）

async function sha256Hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
  });
}

function validCode(code) {
  return typeof code === 'string' && code.length >= 4 && code.length <= 64;
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code') || '';
  if (!validCode(code)) return jsonResponse({ error: 'invalid code' }, 400);
  const key = await sha256Hex(code);
  const raw = await env.studybench_sync.get(key);
  if (!raw) return jsonResponse({ error: 'not found' }, 404);
  return new Response(raw, {
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
  });
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'bad json' }, 400);
  }
  const code = (body.code || '').toString();
  if (!validCode(code)) return jsonResponse({ error: 'invalid code' }, 400);
  const lm = Number(body.lm);
  if (!Number.isFinite(lm)) return jsonResponse({ error: 'invalid lm' }, 400);
  const data = body.data;
  if (!data || typeof data !== 'object') return jsonResponse({ error: 'invalid data' }, 400);

  const key = await sha256Hex(code);
  const kv = env.studybench_sync;
  const existing = await kv.get(key);
  if (existing) {
    try {
      const ex = JSON.parse(existing);
      if (ex.lm && lm <= ex.lm) {
        return jsonResponse({ error: 'conflict', remote: ex }, 409);
      }
    } catch { /* 损坏数据则直接覆盖 */ }
  }
  await kv.put(key, JSON.stringify({ lm, data }));
  return jsonResponse({ ok: true, lm }, 200);
}
