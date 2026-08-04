/* ──────────────────────────────────────────────────────────────
   order-core.js — ตรรกะกลางที่ customer.html / admin.html ใช้ร่วมกัน
   ต้องโหลด postal-db.js ก่อนไฟล์นี้
   ────────────────────────────────────────────────────────────── */
(function (global) {
    "use strict";

    const POSTAL_DB = global.POSTAL_DB || {};
    const ALL_PROVINCES = (() => {
        const s = new Set();
        Object.values(POSTAL_DB).forEach(v => { if (v.p) s.add(v.p); });
        return Array.from(s).sort((a, b) => a.localeCompare(b, 'th'));
    })();

    const CUSTOM = "__custom__";
    const DEFAULT_PARCEL = { weight: 0.5, width: 25, length: 32, height: 5 };
    const ITEM_TYPE = "เสื้อผ้า";
    // ค่าที่ Flash ยอมรับ (ตาม dropdown ในไฟล์เทมเพลต)
    const ITEM_TYPES = ["ต้นไม้","เอกสาร","ผลไม้","อาหารแห้ง","ของใช้","อุปกรณ์ไอที","เสื้อผ้า","สื่อบันเทิง","อะไหล่ยนต์","รองเท้า/กระเป๋า","เครื่องสำอางค์","เฟอร์นิเจอร์","อื่นๆ","เครื่องดนตรี","อุปกรณ์การแพทย์"];
    const PRODUCT_TYPES = ["Standard","Bulky","On-time delivery","Fruit parcel","Tree","Happy Return","Happy Return Bulky"];

    const num = (v, d) => { const n = parseFloat(v); return isNaN(n) ? d : n; };
    const orEmpty = (v) => (v === undefined || v === null ? "" : v);

    // ── Headers ───────────────────────────────────────────────────
    // Flash ไม่ใช่ COD (order_template_noncod_nonreceipt.xlsx — 19 คอลัมน์)
    const FLASH_HEADERS = [
        "Customer_order_number\n(เลขออเดอร์ของลูกค้า)",
        "*Consignee_name\n(ชื่อผู้รับ)",
        "*Address\n(ทิ่อยู่)",
        "*Postal_code\n(รหัสไปรษณีย์)",
        "*Phone_number\n(เบอร์โทรศัพท์)",
        "Phone_number2\n(เบอร์โทรศัพท์)",
        "Item_type\n(ประเภทสินค้า)",
        "*Weight_kg\n(น้ำหนัก)",
        "*Length\n(ยาว)",
        "*Width\n(กว้าง)",
        "*Height\n(สูง)",
        "Flash_care",
        "Flash_care_plus",
        "Declared_value\n(มูลค่าสินค้าที่ระบุโดยลูกค้า)",
        "Box_shield",
        "*Product_type         (ประเภทสินค้า）",
        "Remark1\n(หมายเหตุ1)",
        "Remark2\n(หมายเหตุ2)",
        "Remark3\n(หมายเหตุ3)"
    ];
    // Flash COD (order_template_cod_nonreceipt.xlsx — 25 คอลัมน์)
    const FLASH_COD_HEADERS = [
        "Customer_order_number\n(เลขออเดอร์ของลูกค้า)",
        "*Consignee_name\n(ชื่อผู้รับ)",
        "*Address\n(ทิ่อยู่)",
        "*Postal_code\n(รหัสไปรษณีย์)",
        "*Phone_number\n(เบอร์โทรศัพท์)",
        "Phone_number2\n(เบอร์โทรศัพท์)",
        "COD\n(ยอดเรียกเก็บ)",
        "Item description1(Name|Size/Weight|color|quantity)",
        "Item description2(Name|Size/Weight|color|quantity)",
        "Item description3(Name|Size/Weight|color|quantity)",
        "Item description4(Name|Size/Weight|color|quantity)",
        "Item description5(Name|Size/Weight|color|quantity)",
        "Item_type\n(ประเภทสินค้า)",
        "*Weight_kg\n(น้ำหนัก)",
        "*Length\n(ยาว)",
        "*Width\n(กว้าง)",
        "*Height\n(สูง)",
        "Flash_care",
        "Flash_care_plus",
        "Declared_value\n(มูลค่าสินค้าที่ระบุโดยลูกค้า)",
        "Box_shield",
        "*Product_type         (ประเภทสินค้า）",
        "Remark1\n(หมายเหตุ1)",
        "Remark2\n(หมายเหตุ2)",
        "Remark3\n(หมายเหตุ3)"
    ];
    const JT_HEADERS = [
        "ชื่อสกุลผู้รับ",
        "เบอร์โทรศัพท์มือถือผู้รับ",
        "จังหวัดผู้รับ",
        "เขตอำเภอผู้รับ",
        "ตำบลปลายทาง",
        "รหัสไปรษณีย์ปลายทาง",
        "ที่อยู่ผู้รับ",
        "รายละเอียดพัสดุ",
        "ประเภทพัสดุ",
        "น้ำหนักพัสดุ(kg)",
        "ยาว(ซม.)",
        "กว้าง(ซม.)",
        "สูง(ซม.)",
        "จำนวนเงินที่ชำระปลายทาง (COD)",
        "บริการSuper"
    ];
    const H_COD = FLASH_COD_HEADERS[6];
    const H_WEIGHT = FLASH_HEADERS[7];

    const FLASH_COLWIDTHS = [80, 300, 200, 450, 100, 130, 130, 120, 100, 80, 80, 80, 100, 110, 130, 100, 150, 800, 150, 150];
    const FLASH_COD_COLWIDTHS = [80, 300, 200, 450, 100, 130, 130, 110, 220, 220, 220, 220, 220, 120, 100, 80, 80, 80, 100, 110, 130, 100, 150, 800, 150, 150];
    const JT_COLWIDTHS = [80, 200, 150, 150, 180, 150, 130, 350, 350, 100, 110, 80, 80, 80, 130, 100];

    // ── ที่อยู่ ───────────────────────────────────────────────────
    const composeAddress = (p) => {
        const line = String(p.addrLine || "").replace(/[\r\n]+/g, " ").replace(/\s{2,}/g, " ").trim();
        const isBkk = p.province === "กรุงเทพมหานคร";
        const sub = p.subdistrict ? (isBkk ? `แขวง${p.subdistrict}` : `ตำบล${p.subdistrict}`) : "";
        const dist = p.district
            ? (isBkk ? (p.district.startsWith("เขต") ? p.district : `เขต${p.district}`) : `อำเภอ${p.district.replace(/^อำเภอ/, "")}`)
            : "";
        const prov = p.province ? (isBkk ? "กรุงเทพมหานคร" : `จังหวัด${p.province}`) : "";
        return [line, sub, dist, prov, p.postal].filter(Boolean).join(" ").replace(/\s{2,}/g, " ").trim();
    };

    const parseThaiAddress = (addr) => {
        addr = String(addr || "");
        const postal = (addr.match(/\d{5}/) || [""])[0];
        let province = "", district = "", subdistrict = "";

        const provMatch = addr.match(/(?:จังหวัด|จ\.)\s*([\u0E00-\u0E7F]+)/);
        if (provMatch) province = provMatch[1].trim();
        else {
            const bkk = addr.match(/(กรุงเทพ(?:มหานคร)?|กทม\.?)/);
            if (bkk) province = "กรุงเทพมหานคร";
        }

        let distMatch = addr.match(/(?:^|\s)(?:อำเภอ|อ\.)\s*([\u0E00-\u0E7F]+)/);
        if (!distMatch) {
            distMatch = addr.match(/(?:^|\s)เขต([\u0E00-\u0E7F]+)/);
            if (distMatch) district = "เขต" + distMatch[1].trim();
        } else {
            district = distMatch[1].trim();
            if (province === "กรุงเทพมหานคร" && !district.startsWith("เขต")) district = "เขต" + district;
        }

        let subMatch = addr.match(/(?:^|\s)(?:ตำบล|ต\.)\s*([\u0E00-\u0E7F]+)/);
        if (!subMatch) subMatch = addr.match(/(?:^|\s)แขวง([\u0E00-\u0E7F]+)/);
        if (subMatch) subdistrict = subMatch[1].trim();

        const entry = postal && POSTAL_DB[postal];
        if (entry) {
            if (!province) province = entry.p || "";
            if (!district && entry.d && entry.d.length > 0) {
                const matched = entry.d.find(d => addr.includes(d));
                district = matched || entry.d[0];
                if (province === "กรุงเทพมหานคร" && !district.startsWith("เขต")) district = "เขต" + district;
            }
            if (!subdistrict && entry.s && entry.s.length > 0) {
                const matched = entry.s.find(s => addr.includes(s));
                subdistrict = matched || entry.s[0];
            }
        }
        return { province, district, subdistrict, postal };
    };

    // แยกที่อยู่รวมกลับเป็นช่อง ๆ (ใช้ตอนวางข้อความ/แก้ออเดอร์เก่า)
    const splitAddress = (fullAddr) => {
        const p = parseThaiAddress(fullAddr);
        const line = String(fullAddr || "")
            .replace(/(?:ตำบล|ต\.|แขวง)\s*[\u0E00-\u0E7F]+/g, "")
            .replace(/(?:อำเภอ|อ\.|เขต)\s*[\u0E00-\u0E7F]+/g, "")
            .replace(/(?:จังหวัด|จ\.)\s*[\u0E00-\u0E7F]+/g, "")
            .replace(/(กรุงเทพ(?:มหานคร)?|กทม\.?)/g, "")
            .replace(/\d{5}/g, "")
            .replace(/\s*,\s*/g, " ").replace(/\s{2,}/g, " ").trim();
        return { postal: p.postal, province: p.province, district: String(p.district).replace(/^เขต/, ""), subdistrict: p.subdistrict, addrLine: line };
    };

    // แยกชื่อ/เบอร์/ที่อยู่ จากข้อความที่วางมาทั้งก้อน
    const parsePastedText = (text) => {
        text = String(text || "").trim();
        if (!text) return null;
        let phone = "";
        const lines = [];
        text.split(/[\r\n]+/).forEach(line => {
            let rest = line;
            if (!phone) {
                const cands = line.match(/0[\d\-. ]{7,12}\d/g) || [];
                for (const c of cands) {
                    const digits = c.replace(/\D/g, "");
                    if (digits.length === 9 || digits.length === 10) { phone = digits; rest = line.replace(c, " "); break; }
                }
            }
            rest = rest.replace(/(?:เบอร์(?:โทร)?|โทรศัพท์|โทร|tel)\s*\.?\s*:?\s*/gi, " ").replace(/\s{2,}/g, " ").trim();
            if (rest) lines.push(rest);
        });

        let name = "", addrLines = [];
        lines.forEach(l => {
            const cleaned = l.replace(/^(?:ชื่อ|ชื่อผู้รับ|ผู้รับ|name)\s*:?\s*/i, "").trim();
            const isAddr = /\d{5}/.test(l) || /(บ้านเลขที่|หมู่|ซอย|ถนน|ตำบล|ต\.|อำเภอ|อ\.|จังหวัด|จ\.|แขวง|เขต|กรุงเทพ|กทม)/.test(l);
            if (!name && !isAddr && cleaned) name = cleaned;
            else if (cleaned) addrLines.push(cleaned.replace(/^(?:ที่อยู่|address)\s*:?\s*/i, "").trim());
        });
        if (!name && addrLines.length > 1) name = addrLines.shift();

        const full = addrLines.join(" ").replace(/\s{2,}/g, " ").trim();
        return Object.assign({ name, phone }, splitAddress(full));
    };

    // ── แปลงออเดอร์ → แถวของเทมเพลตขนส่ง ─────────────────────────
    const colorAbbr = {
        "ขาว":"ขาว","แดง":"แดง","ดำ":"ดำ","คาราเมล":"ครม","น้ำตาล":"นต","กรม":"ก",
        "กาแฟ":"กฟ","ชานม":"ชน","น้ำตาลเข้ม":"นตข","กากี":"กากี","ครีม":"ค","เทา":"ท",
        "น้ำตาลอ่อน":"นตอ","ขาว & กากี":"ข&ก","ดำ & กากี":"ด&ก","ดำ & ขาว":"ด&ข",
        "ดำ & ส้ม":"ด&ส","ส้มอิฐ":"สอ","โกโก้":"กก","ลาเต้":"ลต","เขียว":"เขียว",
        "ชมพู":"ชพ","เบจ":"เบจ","ฟ้า":"ฟ้า","เหลืองมัสตาร์ด":"หล","ม่วง":"ม่วง",
        "ขาวนวล":"ขาว","Moonless Night (ด้ายดำ)":"ดำ","Moonlit Night (ด้ายขาว)":"ขาว",
        "เขียวขี้ม้า":"ขขม","เทาเข้ม":"ทข","เทาอ่อน":"ทอ","เหลือง":"หล","เขียวเข้ม":"ขม",
        "ม่วงเข้ม":"มข","ม่วงอ่อน":"มอ","เหลืองอ่อน":"หลอ","แดงไวน์":"แดง","เทาดำ":"ทด",
        "ชมพูนู้ด":"ชพ","โอวัลติน":"อวต","มะกอก":"มก","เลม่อน":"ลม","ชาโคล":"ชค","เทาฟ้า":"ทฟ"
    };
    const abbrevColor = (v) => colorAbbr[v] || v;

    const cleanAddressForFlash = (addr) => {
        if (/อำเภอเมือง|อ\.เมือง/.test(addr)) {
            return addr
                .replace(/ตำบล\s*/g,"").replace(/ต\.\s*/g,"")
                .replace(/อำเภอ\s*/g,"").replace(/อ\.\s*/g,"")
                .replace(/จังหวัด\s*/g,"").replace(/จ\.\s*/g,"")
                .replace(/\s{2,}/g," ").trim();
        }
        return addr;
    };

    const buildRowsForCarrier = (orderList, carrierKey) => {
        return (orderList || []).map(order => {
            const items = (order.items || []).filter(i => String(i.name).trim() !== "");
            const pkg = {
                weight: num(order.weight, DEFAULT_PARCEL.weight),
                width: num(order.width, DEFAULT_PARCEL.width),
                length: num(order.length, DEFAULT_PARCEL.length),
                height: num(order.height, DEFAULT_PARCEL.height),
                productType: order.productType || "Standard"
            };
            const exportWeight = pkg.weight.toFixed(2);

            const buildOrderParts = (useAbbr) => items.map(i => {
                const code = String(i.name).substring(0, 3).trim();
                const v = i.variant ? `-${useAbbr ? abbrevColor(i.variant) : i.variant}` : "";
                return `${i.qty} = ${code}${v}`;
            });
            let orderInfoStr = items.length ? `${order.no} | ${buildOrderParts(false).join(" | ")}` : String(order.no);
            if (orderInfoStr.length > 64) orderInfoStr = `${order.no} | ${buildOrderParts(true).join(" | ")}`;
            if (orderInfoStr.length > 64) orderInfoStr = orderInfoStr.substring(0, 64);

            const remarkFull = items.map(i => `จำนวน ${i.qty} ชิ้น | ${i.name}${i.variant ? ` (${i.variant})` : ""}`).join(", ");
            const codInt = order.isCod ? Math.round(parseFloat(order.amount) || 0) : 0;
            const address = String(order.address || "");
            const postalCode = (address.match(/\d{5}$/) || [""])[0];

            if (carrierKey === "jt") {
                const J = JT_HEADERS;
                const parsed = parseThaiAddress(address);
                const strippedAddr = address
                    .replace(/[\t\r\n]+/g, " ")
                    .replace(/(?:ตำบล|ต\.|แขวง)\s*[\u0E00-\u0E7F]+/g, "")
                    .replace(/(?:อำเภอ|อ\.|เขต)\s*[\u0E00-\u0E7F]+/g, "")
                    .replace(/(?:จังหวัด|จ\.)\s*[\u0E00-\u0E7F]+/g, "")
                    .replace(/(กรุงเทพ(?:มหานคร)?|กทม\.?)/g, "")
                    .replace(/\d{5}/g, "")
                    .replace(/เขต(?![\u0E00-\u0E7F])/g, "")
                    .replace(/\s{2,}/g, " ")
                    .replace(/\s*,\s*/g, " ")
                    .trim();
                return {
                    [J[0]]: `${order.no} ${order.customerName}`,
                    [J[1]]: order.phone,
                    [J[2]]: parsed.province,
                    [J[3]]: parsed.district,
                    [J[4]]: parsed.subdistrict,
                    [J[5]]: parsed.postal || postalCode,
                    [J[6]]: `${strippedAddr} (${orderInfoStr})`,
                    [J[7]]: "เครื่องแต่งกาย",
                    [J[8]]: "ซองพัสดุ",
                    [J[9]]: exportWeight,
                    [J[10]]: pkg.length,
                    [J[11]]: pkg.width,
                    [J[12]]: pkg.height,
                    [J[13]]: codInt || "",
                    [J[14]]: "ไม่"
                };
            }

            // Flash — สร้างด้วยคีย์ของเทมเพลต COD (ครอบคลุมทั้ง 2 แบบ)
            const H = FLASH_COD_HEADERS;
            const desc = items.slice(0, 5).map(i =>
                [String(i.name).trim(), String(i.size || "").trim(), String(i.variant || "").trim(), parseInt(i.qty) || 1].join("|")
            );
            return {
                [H[0]]: "",
                [H[1]]: `${order.no} ${order.customerName}`,
                [H[2]]: cleanAddressForFlash(address),
                [H[3]]: postalCode,
                [H[4]]: order.phone,
                [H[5]]: "",
                [H[6]]: codInt || "",
                [H[7]]: desc[0] || "",
                [H[8]]: desc[1] || "",
                [H[9]]: desc[2] || "",
                [H[10]]: desc[3] || "",
                [H[11]]: desc[4] || "",
                [H[12]]: order.itemType || ITEM_TYPE,
                [H[13]]: exportWeight,
                [H[14]]: pkg.length,
                [H[15]]: pkg.width,
                [H[16]]: pkg.height,
                [H[17]]: "N",
                [H[18]]: "N",
                [H[19]]: codInt || "",
                [H[20]]: "N",
                [H[21]]: pkg.productType,
                [H[22]]: remarkFull,
                [H[23]]: "",
                [H[24]]: ""
            };
        });
    };

    const isCodRow = (r) => String(r[H_COD] || "").trim() !== "";

    // ── ตรวจแถวตามกฎของเทมเพลต ───────────────────────────────────
    const validateRow = (row, carrierKey) => {
        const issues = [];
        const HEADERS = carrierKey === "jt" ? JT_HEADERS : FLASH_HEADERS;
        const phone = String(row[HEADERS[carrierKey === "jt" ? 1 : 4]] || "").replace(/\D/g, "");
        if (phone.length < 9) issues.push("เบอร์โทรไม่ครบ");

        if (carrierKey === "jt") {
            if (!row[HEADERS[2]]) issues.push("ไม่มีจังหวัด");
            if (!row[HEADERS[3]]) issues.push("ไม่มีเขต/อำเภอ");
            if (!row[HEADERS[4]]) issues.push("ไม่มีตำบล/แขวง");
            if (!/^\d{5}$/.test(String(row[HEADERS[5]] || ""))) issues.push("รหัสไปรษณีย์ไม่ถูกต้อง");
        } else {
            if (!/^\d{5}$/.test(String(row[HEADERS[3]] || ""))) issues.push("รหัสไปรษณีย์ไม่ถูกต้อง");
            if (!row[HEADERS[2]]) issues.push("ไม่มีที่อยู่");

            const w = parseFloat(row[H_WEIGHT]);
            if (!(w >= 0.01 && w <= 50)) issues.push("น้ำหนักต้องอยู่ระหว่าง 0.01–50 กก.");
            const L = parseFloat(row[FLASH_COD_HEADERS[14]]), W = parseFloat(row[FLASH_COD_HEADERS[15]]), Hh = parseFloat(row[FLASH_COD_HEADERS[16]]);
            if ([L, W, Hh].some(v => !(v > 0) || v > 100 || !Number.isInteger(v))) issues.push("ขนาดต้องเป็นจำนวนเต็ม ไม่เกินด้านละ 100 ซม.");
            else if (L + W + Hh > 280) issues.push("ยาว+กว้าง+สูง รวมเกิน 280 ซม.");

            const cod = String(row[H_COD] || "").trim();
            if (cod) {
                const c = parseFloat(cod);
                if (!(c >= 1 && c <= 50000) || !Number.isInteger(c)) issues.push("ยอด COD ต้องเป็นจำนวนเต็ม 1–50,000");
                if (!String(row[FLASH_COD_HEADERS[7]] || "").trim()) issues.push("ออเดอร์ COD ต้องมีรายละเอียดสินค้า");
            }
        }
        return issues;
    };

    // ── ตรวจฟอร์มก่อนบันทึก ──────────────────────────────────────
    const MISSING_LABELS = {
        customerName: "ชื่อผู้รับ", phone: "เบอร์โทร (9–10 หลัก)", postal: "รหัสไปรษณีย์",
        province: "จังหวัด", district: "อำเภอ/เขต", subdistrict: "ตำบล/แขวง",
        addrLine: "ที่อยู่ (บ้านเลขที่ หมู่ ซอย ถนน)", weight: "น้ำหนักพัสดุ",
        width: "ความกว้าง", length: "ความยาว", height: "ความสูง",
        amount: "ยอดเก็บเงินปลายทาง (COD)", items: "รายการสินค้า (COD)"
    };
    const getMissing = (form) => ({
        customerName: !String(form.customerName || "").trim(),
        phone: String(form.phone || "").replace(/\D/g, "").length < 9,
        postal: !/^\d{5}$/.test(form.postal || ""),
        province: !String(form.province || "").trim(),
        district: !String(form.district || "").trim(),
        subdistrict: !String(form.subdistrict || "").trim(),
        addrLine: !String(form.addrLine || "").trim(),
        weight: !(parseFloat(form.weight) > 0),
        width: !(parseFloat(form.width) > 0),
        length: !(parseFloat(form.length) > 0),
        height: !(parseFloat(form.height) > 0),
        amount: !!form.isCod && !(parseFloat(form.amount) > 0),
        items: !!form.isCod && (form.items || []).filter(i => String(i.name).trim() !== "").length === 0
    });
    const missingLabelsOf = (missing) => Object.keys(MISSING_LABELS).filter(k => missing[k]).map(k => MISSING_LABELS[k]);

    // ฟอร์ม → object ที่จะเก็บลงฐานข้อมูล
    const formToOrder = (form) => {
        const parts = {
            postal: form.postal,
            province: String(form.province).trim(),
            district: String(form.district).trim(),
            subdistrict: String(form.subdistrict).trim(),
            addrLine: String(form.addrLine).replace(/[\r\n]+/g, " ").replace(/\s{2,}/g, " ").trim()
        };
        return Object.assign({
            no: String(form.no || "").trim(),
            customerName: String(form.customerName).trim(),
            phone: String(form.phone).replace(/[^\d]/g, ""),
            address: composeAddress(parts),
            weight: num(form.weight, DEFAULT_PARCEL.weight),
            width: num(form.width, DEFAULT_PARCEL.width),
            length: num(form.length, DEFAULT_PARCEL.length),
            height: num(form.height, DEFAULT_PARCEL.height),
            itemType: form.itemType || ITEM_TYPE,
            productType: form.productType || "Standard",
            isCod: !!form.isCod,
            amount: form.isCod ? (parseFloat(form.amount) || 0) : 0,
            note: String(form.note || "").trim(),
            items: (form.items || []).filter(i => String(i.name).trim() !== "").map(i => ({
                name: String(i.name).trim(),
                variant: String(i.variant || "").trim(),
                size: String(i.size || "").trim(),
                qty: parseInt(i.qty) || 1
            }))
        }, parts);
    };

    // order (จากฐานข้อมูล) → ฟอร์ม
    const orderToForm = (o) => {
        const parts = o.addrLine !== undefined ? o : splitAddress(o.address || "");
        const entry = POSTAL_DB[parts.postal];
        return {
            no: o.no || "", customerName: o.customerName || "", phone: o.phone || "",
            postal: parts.postal || "", province: parts.province || "",
            district: parts.district || "", subdistrict: parts.subdistrict || "",
            addrLine: parts.addrLine || "",
            customDistrict: !!(parts.district && (!entry || !(entry.d || []).includes(parts.district))),
            customSubdistrict: !!(parts.subdistrict && (!entry || !(entry.s || []).includes(parts.subdistrict))),
            weight: orEmpty(o.weight), width: orEmpty(o.width), length: orEmpty(o.length), height: orEmpty(o.height),
            itemType: o.itemType || ITEM_TYPE, productType: o.productType || "Standard",
            isCod: !!o.isCod, amount: o.isCod ? (o.amount || "") : "",
            note: o.note || "",
            items: (o.items && o.items.length) ? o.items.map(i => ({ name: i.name, variant: i.variant || "", size: i.size || "", qty: i.qty })) : [{ name: "", variant: "", size: "", qty: 1 }]
        };
    };

    const emptyForm = () => ({
        no: "", customerName: "", phone: "",
        postal: "", province: "", district: "", subdistrict: "", addrLine: "",
        customDistrict: false, customSubdistrict: false,
        weight: "", width: "", length: "", height: "",
        itemType: ITEM_TYPE, productType: "Standard",
        isCod: false, amount: "", note: "",
        items: [{ name: "", variant: "", size: "", qty: 1 }]
    });

    // ── เขียนไฟล์ Excel ───────────────────────────────────────────
    const writeExcel = (rows, headers, sheetName, filePrefix) => {
        const XLSX = global.XLSX;
        const picked = rows.map(r => {
            const o = {};
            headers.forEach(h => { o[h] = (r[h] !== undefined && r[h] !== null) ? r[h] : ""; });
            return o;
        });
        const ws = XLSX.utils.json_to_sheet(picked, { header: headers });
        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const addr = XLSX.utils.encode_col(C) + "1";
            if (ws[addr]) ws[addr].t = 's';
        }
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        XLSX.writeFile(wb, `${filePrefix}_${Date.now()}.xlsx`, { bookSST: true, type: 'binary' });
    };

    // ดาวน์โหลดตามขนส่ง (Flash แยก COD / ไม่ใช่ COD เป็น 2 ไฟล์)
    const downloadRows = (rows, carrier) => {
        if (!rows.length) return { files: 0 };
        if (carrier === "jt") {
            writeExcel(rows, JT_HEADERS, "导入-V20211028", "JT_Order_Template");
            return { files: 1, cod: 0, non: rows.length };
        }
        const cod = rows.filter(isCodRow);
        const non = rows.filter(r => !isCodRow(r));
        if (cod.length) writeExcel(cod, FLASH_COD_HEADERS, "Order Template", "Flash_COD");
        if (non.length) {
            if (cod.length) setTimeout(() => writeExcel(non, FLASH_HEADERS, "Order Template", "Flash_nonCOD"), 400);
            else writeExcel(non, FLASH_HEADERS, "Order Template", "Flash_nonCOD");
        }
        return { files: (cod.length ? 1 : 0) + (non.length ? 1 : 0), cod: cod.length, non: non.length };
    };

    global.OrderCore = {
        POSTAL_DB, ALL_PROVINCES, CUSTOM, DEFAULT_PARCEL, ITEM_TYPE, ITEM_TYPES, PRODUCT_TYPES,
        FLASH_HEADERS, FLASH_COD_HEADERS, JT_HEADERS, H_COD, H_WEIGHT,
        FLASH_COLWIDTHS, FLASH_COD_COLWIDTHS, JT_COLWIDTHS,
        num, orEmpty, composeAddress, parseThaiAddress, splitAddress, parsePastedText,
        buildRowsForCarrier, isCodRow, validateRow,
        MISSING_LABELS, getMissing, missingLabelsOf,
        formToOrder, orderToForm, emptyForm,
        writeExcel, downloadRows
    };
})(window);
