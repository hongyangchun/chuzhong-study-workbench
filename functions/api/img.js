// Cloudflare Pages Function — 错题题目截图（云端 KV 存储）
// KV 绑定名：studybench_sync（与 /api/sync 同一 namespace）
//
// GET    /api/img?code=XXXX&id=YYYY        -> { data: base64 } 或 404
// POST   /api/img   body {code,id,data}    -> { ok:true } 或 400
// DELETE /api/img?code=XXXX&id=YYYY        -> { ok:true }
//
// key 方案： img:<codeHash>:<id>
//  - code 经 SHA-256 哈希，避免明文与特殊字符
//  - 图片 base64 只存云端，本地 localStorage 仅存 id（保持 5MB 不被图片挤占）
//  - 同一同步码（家庭）共享同一批图片，跨设备可拉取

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

function validId(id) {
  return typeof id === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(id);
}

async function makeKey(code, id) {
  return 'img:' + (await sha256Hex(code)) + ':' + id;
}

function kvGuard(env) {
  const kv = env.studybench_sync;
  if (kv) return { kv };
  return {
    err: jsonResponse({
      error: 'kv_not_bound',
      hint: 'Cloudflare Pages 后台未找到名为 studybench_sync 的 KV 绑定。请前往 项目设置 → Functions → KV namespace bindings，添加一个 Variable name 为 studybench_sync 的绑定。',
      availableBindings: Object.keys(env)
    }, 503)
  };
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code') || '';
  const id = url.searchParams.get('id') || '';
  if (!validCode(code) || !validId(id)) return jsonResponse({ error: 'invalid params' }, 400);
  const g = kvGuard(env);
  if (g.err) return g.err;
  const raw = await g.kv.get(await makeKey(code, id));
  if (!raw) return jsonResponse({ error: 'not found' }, 404);
  return jsonResponse({ data: raw }, 200);
}

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return jsonResponse({ error: 'bad json' }, 400); }
  const code = (body.code || '').toString();
  const id = (body.id || '').toString();
  const data = (body.data || '').toString();
  if (!validCode(code) || !validId(id)) return jsonResponse({ error: 'invalid params' }, 400);
  if (!data || data.length > 3000000) return jsonResponse({ error: 'invalid data' }, 400);
  const g = kvGuard(env);
  if (g.err) return g.err;
  await g.kv.put(await makeKey(code, id), data);
  return jsonResponse({ ok: true }, 200);
}

export async function onRequestDelete({ request, env }) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code') || '';
  const id = url.searchParams.get('id') || '';
  if (!validCode(code) || !validId(id)) return jsonResponse({ error: 'invalid params' }, 400);
  const g = kvGuard(env);
  if (g.err) return g.err;
  await g.kv.delete(await makeKey(code, id));
  return jsonResponse({ ok: true }, 200);
}
