/* ──────────────────────────────────────────────────────────────
   app-config.js — ค่าตั้งต้นของระบบ (แก้ไฟล์นี้ไฟล์เดียว)

   ⚠️ ค่าใน firebase ไม่ใช่ความลับ ฝังในหน้าเว็บได้ตามปกติ
      ความปลอดภัยจริงอยู่ที่ firestore.rules
   ⚠️ ห้ามใส่ LINE Channel access token ในไฟล์นี้เด็ดขาด
      token ต้องอยู่ใน Cloudflare Worker เท่านั้น
   ────────────────────────────────────────────────────────────── */
window.APP_CONFIG = {
    // ชื่อร้าน (โชว์หัวหน้าฟอร์มลูกค้า)
    shopName: "LAMANGSTORE",

    // จาก Firebase Console → Project settings → Your apps → Web app
    firebase: {
        apiKey: "AIzaSyDo3Q0FIkMr8-_roykT2sSxgDN143vRxXE",
        authDomain: "page365-to-flash.firebaseapp.com",
        projectId: "page365-to-flash",
        storageBucket: "page365-to-flash.firebasestorage.app",
        messagingSenderId: "317953803558",
        appId: "1:317953803558:web:ae82c34cb82ebdb549ade7",
        measurementId: "G-8PW32J7MM5"
    },

    // URL ของ Cloudflare Worker ที่ยิงแจ้งเตือน LINE
    // เว้นว่างไว้ = ไม่ส่งแจ้งเตือน (ระบบอื่นยังทำงานปกติ)
    lineWorkerUrl: "",

    // อีเมลแอดมิน — ใช้แค่ซ่อน/แสดงปุ่มในหน้าเว็บ
    // สิทธิ์จริงบังคับที่ firestore.rules (ต้องใส่อีเมลชุดเดียวกันที่นั่นด้วย)
    adminEmails: [
        "biiigooo76@gmail.com",
        "lamsanggroup@gmail.com",
        "fangtunyaluk09@gmail.com"
    ]
};
