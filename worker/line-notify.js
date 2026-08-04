/* ──────────────────────────────────────────────────────────────
   Cloudflare Worker — แจ้งเตือนออเดอร์ใหม่เข้ากลุ่มไลน์แอดมิน

   วิธีทำงาน
     customer.html เขียนออเดอร์ลง Firestore แล้วส่ง { docId, idToken } มาที่นี่
     Worker เอา idToken ไปอ่านเอกสารจาก Firestore จริง ๆ ก่อน
     ถ้าอ่านไม่ได้ = ไม่มีออเดอร์นั้นจริง → ไม่ส่งอะไรทั้งนั้น (กันคนยิงมั่ว)

   ตั้งค่า (Workers → Settings → Variables):
     LINE_TOKEN          = Channel access token จาก LINE Developers   [Secret]
     LINE_TO             = groupId หรือ userId ปลายทาง                [Secret]
     FIREBASE_PROJECT_ID = project id ของ Firebase
     ADMIN_URL           = ลิงก์หน้า admin เช่น https://user.github.io/repo/admin.html
     ALLOWED_ORIGIN      = โดเมนหน้าเว็บ เช่น https://user.github.io  ("*" = ทุกที่)
   ────────────────────────────────────────────────────────────── */

export default {
    async fetch(request, env) {
        const origin = env.ALLOWED_ORIGIN || "*";
        const cors = {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
        };
        if (request.method === "OPTIONS") return new Response(null, { headers: cors });
        if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: cors });

        try {
            const { docId, idToken } = JSON.parse(await request.text());
            if (!docId || !idToken) return json({ ok: false, error: "missing docId/idToken" }, 400, cors);

            // อ่านเอกสารด้วยสิทธิ์ของผู้ส่งเอง — ถ้าไม่ใช่เจ้าของจะโดน rules ปฏิเสธ
            const url = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/orders/${encodeURIComponent(docId)}`;
            const res = await fetch(url, { headers: { Authorization: `Bearer ${idToken}` } });
            if (!res.ok) return json({ ok: false, error: "order not found or not allowed" }, 403, cors);

            const order = decodeDoc(await res.json());
            const text = formatMessage(order, docId, env.ADMIN_URL);

            const line = await fetch("https://api.line.me/v2/bot/message/push", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.LINE_TOKEN}` },
                body: JSON.stringify({ to: env.LINE_TO, messages: [{ type: "text", text }] })
            });
            if (!line.ok) return json({ ok: false, error: "line error: " + (await line.text()) }, 502, cors);

            return json({ ok: true }, 200, cors);
        } catch (e) {
            return json({ ok: false, error: String(e) }, 500, cors);
        }
    }
};

const json = (obj, status, cors) =>
    new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } });

// แปลงรูปแบบ Firestore REST → object ธรรมดา
function decodeDoc(doc) {
    const val = (v) => {
        if (v == null) return null;
        if ("stringValue" in v) return v.stringValue;
        if ("integerValue" in v) return Number(v.integerValue);
        if ("doubleValue" in v) return Number(v.doubleValue);
        if ("booleanValue" in v) return v.booleanValue;
        if ("timestampValue" in v) return v.timestampValue;
        if ("nullValue" in v) return null;
        if ("arrayValue" in v) return (v.arrayValue.values || []).map(val);
        if ("mapValue" in v) {
            const o = {};
            for (const [k, x] of Object.entries(v.mapValue.fields || {})) o[k] = val(x);
            return o;
        }
        return null;
    };
    const out = {};
    for (const [k, v] of Object.entries(doc.fields || {})) out[k] = val(v);
    return out;
}

function formatMessage(o, docId, adminUrl) {
    const items = (o.items || []).map(i => `  • ${i.qty}× ${i.name}${i.variant ? ` (${i.variant})` : ""}${i.size ? ` [${i.size}]` : ""}`).join("\n");
    const lines = [
        "📮 ออเดอร์ใหม่จากลูกค้า",
        `เลขอ้างอิง: ${o.no || docId}`,
        "",
        `👤 ${o.customerName}`,
        `📞 ${o.phone}`,
        `📍 ${o.address}`,
        "",
        `📦 ${Number(o.weight).toFixed(2)} กก. · ${o.width}×${o.length}×${o.height} ซม.`,
        o.isCod ? `💰 COD ${Number(o.amount).toLocaleString()} บาท` : "💵 ไม่ใช่ COD"
    ];
    if (items) lines.push("", "สินค้า:", items);
    if (o.note) lines.push("", `📝 ${o.note}`);
    if (adminUrl) lines.push("", `ตรวจ/แก้ไข: ${adminUrl}`);
    return lines.join("\n");
}
