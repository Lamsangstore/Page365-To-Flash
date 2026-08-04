# ติดตั้งระบบ (ลูกค้ากรอกเอง → แจ้งไลน์ → แอดมินแก้ + Download)

เว็บฝากไว้ที่ **GitHub Pages** เหมือนเดิม Firebase ใช้เป็นแค่ฐานข้อมูล + ระบบล็อกอิน

```
ลูกค้า → customer.html ──(เขียน)──→ Firestore ──(แอดมินแก้/ดาวน์โหลด)──→ admin.html
              └──(แจ้ง)──→ Cloudflare Worker ──→ LINE กลุ่มแอดมิน
```

| ไฟล์ | หน้าที่ |
|---|---|
| `customer.html` | ฟอร์มให้ลูกค้ากรอก (ลิงก์นี้ส่งให้ลูกค้า) |
| `admin.html` | แอดมินล็อกอิน → ตรวจ/แก้ไข → Download Excel |
| `manual.html` | โหมดออฟไลน์เดิม (ไม่ต้องต่อเน็ต) — ยังใช้ได้ปกติ |
| `index.html` | โหมดอัปโหลดไฟล์ Page365 เดิม |
| `app-config.js` | **ไฟล์เดียวที่ต้องแก้** |
| `order-core.js` | ตรรกะกลาง (ที่อยู่ / เทมเพลต Flash-J&T / ตรวจข้อมูล) |
| `firestore.rules` | กติกาความปลอดภัย — ต้องเอาไปวางใน Firebase |
| `worker/line-notify.js` | โค้ด Cloudflare Worker ยิง LINE |

---

## 1. Firebase (ฟรี ไม่ต้องผูกบัตร)

1. [console.firebase.google.com](https://console.firebase.google.com) → **Add project**
2. **Build → Firestore Database → Create database** → เลือก **Production mode** → region `asia-southeast1`
3. **Build → Authentication → Get started** → เปิด 2 อัน:
   - **Anonymous** (ให้ลูกค้าส่งฟอร์มได้โดยไม่ต้องล็อกอิน)
   - **Google** (สำหรับแอดมิน)
4. **Project settings (⚙️) → Your apps → Web `</>`** → ตั้งชื่อ → **คัดลอก `firebaseConfig`**
5. เอามาใส่ใน `app-config.js` พร้อมชื่อร้านและอีเมลแอดมิน

```js
window.APP_CONFIG = {
    shopName: "ชื่อร้านของคุณ",
    firebase: { apiKey: "...", authDomain: "...", projectId: "...", ... },
    lineWorkerUrl: "",              // ใส่ทีหลังในขั้นที่ 3
    adminEmails: ["you@gmail.com"]
};
```

6. **Firestore → Rules** → วางเนื้อหาจากไฟล์ `firestore.rules` → **แก้อีเมลใน `isAdmin()`** → **Publish**

> ⚠️ ถ้าไม่แก้อีเมลตรงนี้ แอดมินจะเข้าดูข้อมูลไม่ได้ (ขึ้น permission-denied)

---

## 2. GitHub Pages

1. push ไฟล์ทั้งหมดขึ้น repo
2. **Settings → Pages → Source: Deploy from a branch → main / (root)** → Save
3. ได้ลิงก์ `https://<username>.github.io/<repo>/`
   - ลูกค้า: `.../customer.html`
   - แอดมิน: `.../admin.html`
4. **สำคัญ** — Firebase Console → **Authentication → Settings → Authorized domains → Add domain** → ใส่ `<username>.github.io`

   ถ้าไม่ทำ ปุ่มล็อกอิน Google ในหน้า admin จะขึ้น `auth/unauthorized-domain`

> repo สาธารณะ = ใครก็เปิด `admin.html` ได้ แต่เข้าไม่ถึงข้อมูล เพราะ Firestore Rules บล็อกทุกอีเมลที่ไม่ได้อยู่ใน `isAdmin()`

---

## 3. LINE + Cloudflare Worker (ฟรี)

### 3.1 สร้าง LINE Official Account
1. [LINE Developers Console](https://developers.line.biz/console/) → **Create channel → Messaging API**
2. แท็บ **Messaging API** → **Issue** ปุ่ม *Channel access token (long-lived)* → คัดลอกเก็บไว้
3. ปิด *Auto-reply messages* / *Greeting messages* ได้ตามสะดวก
4. เชิญ OA เข้ากลุ่มไลน์แอดมิน

### 3.2 หา groupId
ตั้ง Webhook URL ชั่วคราวไว้ที่ [webhook.site](https://webhook.site) แล้วพิมพ์อะไรก็ได้ในกลุ่ม
จะเห็น JSON ที่มี `"source": { "type": "group", "groupId": "Cxxxxxxxx..." }` → คัดลอก `groupId`

> ส่งหาตัวเองแทนก็ได้ — ใช้ `userId` ของตัวเอง (หาได้จาก webhook เดียวกัน)

### 3.3 Deploy Worker
1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages → Create → Worker** → ตั้งชื่อ → Deploy
2. **Edit code** → ลบของเดิม → วางเนื้อหาไฟล์ `worker/line-notify.js` → **Deploy**
3. **Settings → Variables and Secrets** → เพิ่ม:

| ชื่อ | ค่า | ประเภท |
|---|---|---|
| `LINE_TOKEN` | Channel access token | Secret |
| `LINE_TO` | groupId / userId | Secret |
| `FIREBASE_PROJECT_ID` | project id ของ Firebase | Text |
| `ADMIN_URL` | `https://<username>.github.io/<repo>/admin.html` | Text |
| `ALLOWED_ORIGIN` | `https://<username>.github.io` | Text |

4. คัดลอก URL ของ Worker (`https://xxx.workers.dev`) ไปใส่ `lineWorkerUrl` ใน `app-config.js` → push ขึ้น GitHub อีกครั้ง

---

## 4. ทดสอบ

1. เปิด `customer.html` → กรอก 1 รายการ → กดส่ง → ต้องได้เลขอ้างอิง
2. กลุ่มไลน์ต้องเด้งข้อความสรุปออเดอร์ + ลิงก์หน้า admin
3. เปิด `admin.html` → ล็อกอิน Google → เห็นออเดอร์ในแท็บ **รอตรวจ**
4. กด **แก้ไข** → แก้ที่อยู่/น้ำหนัก → **บันทึก** (สถานะเปลี่ยนเป็น *ตรวจแล้ว*)
5. ติ๊กเลือก → เลือก ⚡Flash หรือ 🚚J&T → **Download Excel**
   - Flash จะได้ 2 ไฟล์ถ้ามีทั้ง COD และไม่ใช่ COD
6. ตอบ *ทำเครื่องหมายว่าส่งออกแล้ว* เพื่อกันส่งซ้ำ

---

## แก้ปัญหาที่เจอบ่อย

| อาการ | สาเหตุ / วิธีแก้ |
|---|---|
| `auth/unauthorized-domain` | ยังไม่ได้เพิ่ม `<username>.github.io` ใน Authorized domains (ขั้นที่ 2.4) |
| แอดมินเห็น *permission-denied* | อีเมลไม่ตรงกับใน `firestore.rules` → แก้แล้วกด **Publish** ใหม่ |
| ลูกค้าส่งไม่ได้ | ยังไม่ได้เปิด **Anonymous** ใน Authentication |
| ไลน์ไม่เด้ง | `lineWorkerUrl` ว่าง / ตัวแปรใน Worker ไม่ครบ / ยังไม่ได้เชิญ OA เข้ากลุ่ม |
| ส่งฟอร์มได้ แต่ Worker ตอบ 403 | ปกติ — แปลว่า Rules ทำงาน ตรวจว่า `FIREBASE_PROJECT_ID` ถูกต้อง |

## หมายเหตุ PDPA

ฟอร์มลูกค้ามีข้อความขอความยินยอมก่อนส่งแล้ว แนะนำให้ลบออเดอร์เก่าที่ส่งของเสร็จแล้วเป็นระยะ
(หน้า admin มีปุ่มลบรายตัว) เพื่อไม่เก็บข้อมูลส่วนบุคคลนานเกินจำเป็น
