const express = require("express");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;
const URL_TX = "https://wtx.tele68.com/v1/tx/sessions";
const URL_MD5 = "https://wtxmd52.tele68.com/v1/txmd5/sessions";

const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "application/json, text/plain, */*",
    "Referer": "https://tele68.com/",
    "Origin": "https://tele68.com"
};

const http = axios.create({ timeout: 10000, headers: HEADERS });

// ============================================================
// ========== PHẦN 1: HÀM TIỆN ÍCH ==========
// ============================================================

function opp(c) {
    return c === "TAI" ? "XIU" : "TAI";
}

function getStreak(arr) {
    if (!arr.length) return [0, null];
    let s = 1;
    const last = arr[arr.length - 1];
    for (let i = arr.length - 2; i >= 0; i--) {
        if (arr[i] === last) s++;
        else break;
    }
    return [s, last];
}

function getMaxStreak(arr) {
    if (!arr.length) return 0;
    let max = 1, cur = 1;
    for (let i = 1; i < arr.length; i++) {
        if (arr[i] === arr[i-1]) {
            cur++;
            max = Math.max(max, cur);
        } else cur = 1;
    }
    return max;
}

// ============================================================
// ========== PHẦN 2: CÁC BỘ PHÁT HIỆN CẦU ==========
// ============================================================

// 1. BỆT (3 cấp độ)
function detectBet(res) {
    const [streak, last] = getStreak(res);
    if (streak >= 8) return { has: true, pred: opp(last), conf: 98, type: `BỆT ${streak} (SIÊU ĐẢO)` };
    if (streak === 7) return { has: true, pred: opp(last), conf: 95, type: `BỆT 7 (ĐẢO CỰC MẠNH)` };
    if (streak === 6) return { has: true, pred: opp(last), conf: 90, type: `BỆT 6 (ĐẢO RẤT MẠNH)` };
    if (streak === 5) return { has: true, pred: opp(last), conf: 85, type: `BỆT 5 (ĐẢO MẠNH)` };
    if (streak === 4) return { has: true, pred: opp(last), conf: 78, type: `BỆT 4 (ĐẢO)` };
    if (streak === 3) return { has: true, pred: last, conf: 65, type: `BỆT 3 (THEO CẦU)` };
    return { has: false };
}

// 2. CẦU 1-1 (T X T X T X...)
function detectCau11(res) {
    if (res.length < 6) return { has: false };
    let len = 1;
    for (let i = 1; i < Math.min(res.length, 15); i++) {
        if (res[i] === res[i-1]) break;
        len = i + 1;
    }
    if (len < 5) return { has: false };
    let conf = 70;
    if (len >= 12) conf = 92;
    else if (len >= 10) conf = 88;
    else if (len >= 8) conf = 84;
    else if (len >= 6) conf = 78;
    return { has: true, pred: opp(res[0]), conf, type: `CẦU 1-1 (${len} PHIÊN)` };
}

// 3. CẦU 2-2 (TT XX TT XX...)
function detectCau22(res) {
    if (res.length < 8) return { has: false };
    let pairs = 0;
    let ok = true;
    for (let i = 0; i < Math.min(res.length, 16); i += 2) {
        if (i + 1 >= res.length) break;
        if (res[i] !== res[i+1]) { ok = false; break; }
        if (i + 2 < res.length && res[i] === res[i+2]) { ok = false; break; }
        pairs++;
    }
    if (!ok || pairs < 3) return { has: false };
    let conf = 78;
    if (pairs >= 6) conf = 94;
    else if (pairs >= 5) conf = 90;
    else if (pairs >= 4) conf = 86;
    return { has: true, pred: opp(res[pairs * 2 - 2]), conf, type: `CẦU 2-2 (${pairs} CẶP)` };
}

// 4. CẦU 3-2 (TTT XX)
function detectCau32(res) {
    if (res.length < 10) return { has: false };
    const p5 = res.slice(0, 5);
    const str = p5.map(r => r === "TAI" ? "T" : "X").join('');
    if (str === "TTTXX") return { has: true, pred: "XIU", conf: 86, type: "CẦU 3-2 (3T-2X)" };
    if (str === "XXXTT") return { has: true, pred: "TAI", conf: 86, type: "CẦU 3-2 (3X-2T)" };
    return { has: false };
}

// 5. CẦU 3-3 (TTT XXX)
function detectCau33(res) {
    if (res.length < 12) return { has: false };
    const p6 = res.slice(0, 6);
    const str = p6.map(r => r === "TAI" ? "T" : "X").join('');
    if (str === "TTTXXX") return { has: true, pred: "TAI", conf: 90, type: "CẦU 3-3 (3T-3X)" };
    if (str === "XXXTTT") return { has: true, pred: "XIU", conf: 90, type: "CẦU 3-3 (3X-3T)" };
    return { has: false };
}

// 6. CẦU 1-2-1 (T X X T)
function detectCau121(res) {
    if (res.length < 6) return { has: false };
    const p5 = res.slice(0, 5);
    if (p5[0] === p5[2] && p5[0] === p5[4] && p5[1] === p5[3] && p5[0] !== p5[1]) {
        return { has: true, pred: opp(p5[0]), conf: 80, type: "CẦU 1-2-1" };
    }
    return { has: false };
}

// 7. CẦU 2-1-2 (TT X TT)
function detectCau212(res) {
    if (res.length < 7) return { has: false };
    const p6 = res.slice(0, 6);
    if (p6[0] === p6[1] && p6[3] === p6[4] && p6[0] !== p6[2] && p6[2] === p6[5] && p6[0] !== p6[3]) {
        return { has: true, pred: opp(p6[3]), conf: 82, type: "CẦU 2-1-2" };
    }
    return { has: false };
}

// 8. CẦU CHỮ A (T X T X X T)
function detectCauChuA(res) {
    if (res.length < 8) return { has: false };
    const p7 = res.slice(0, 7);
    if (p7[0] === p7[2] && p7[0] === p7[4] && p7[0] === p7[6] &&
        p7[1] === p7[3] && p7[1] === p7[5] && p7[0] !== p7[1]) {
        return { has: true, pred: opp(p7[0]), conf: 84, type: "CẦU CHỮ A" };
    }
    return { has: false };
}

// 9. CHU KỲ LẶP LẠI
function detectCycle(res) {
    if (res.length < 20) return { has: false };
    const str = res.map(r => r === "TAI" ? "T" : "X").join('');
    for (let len = 2; len <= 7; len++) {
        let ok = true;
        for (let i = 0; i < str.length - len; i++) {
            if (str[i] !== str[i + len]) { ok = false; break; }
        }
        if (ok && str.length >= len * 2) {
            const pos = str.length % len;
            const pred = str[pos] === "T" ? "TAI" : "XIU";
            return { has: true, pred, conf: 78, type: `CHU KỲ ${len}` };
        }
    }
    return { has: false };
}

// 10. CẦU 4-4 (TTTT XXXX)
function detectCau44(res) {
    if (res.length < 16) return { has: false };
    let ok = true;
    for (let i = 0; i < 8; i++) {
        if (i < 4 && res[i] !== res[0]) { ok = false; break; }
        if (i >= 4 && i < 8 && res[i] !== res[4]) { ok = false; break; }
    }
    if (ok && res[0] !== res[4]) {
        return { has: true, pred: opp(res[0]), conf: 88, type: "CẦU 4-4" };
    }
    return { has: false };
}

// 11. CẦU XOẮN ỐC (T X X T X X...)
function detectCauXoanOc(res) {
    if (res.length < 9) return { has: false };
    let ok = true;
    for (let i = 0; i < 6; i++) {
        if (i % 3 === 0 && res[i] !== res[0]) { ok = false; break; }
        if (i % 3 === 1 && res[i] !== res[1]) { ok = false; break; }
        if (i % 3 === 2 && res[i] !== res[2]) { ok = false; break; }
    }
    if (ok && res[0] !== res[1] && res[1] !== res[2]) {
        return { has: true, pred: res[0] === "TAI" ? "XIU" : "TAI", conf: 82, type: "CẦU XOẮN ỐC" };
    }
    return { has: false };
}

// ============================================================
// ========== PHẦN 3: PHÂN TÍCH THỐNG KÊ ==========
// ============================================================

// Tần suất nhiều khung
function freqAnalysis(res) {
    const results = [];
    if (res.length >= 10) {
        const last10 = res.slice(0, 10);
        const t = last10.filter(r => r === "TAI").length;
        if (t >= 8) results.push({ pred: "XIU", conf: 76, type: "LỆCH TÀI 10P" });
        else if (t <= 2) results.push({ pred: "TAI", conf: 76, type: "LỆCH XỈU 10P" });
        else if (t >= 7) results.push({ pred: "XIU", conf: 68, type: "HƠI LỆCH TÀI 10P" });
        else if (t <= 3) results.push({ pred: "TAI", conf: 68, type: "HƠI LỆCH XỈU 10P" });
    }
    if (res.length >= 15) {
        const last15 = res.slice(0, 15);
        const t = last15.filter(r => r === "TAI").length;
        if (t >= 11) results.push({ pred: "XIU", conf: 80, type: "LỆCH TÀI 15P" });
        else if (t <= 4) results.push({ pred: "TAI", conf: 80, type: "LỆCH XỈU 15P" });
        else if (t >= 9) results.push({ pred: "XIU", conf: 70, type: "HƠI LỆCH TÀI 15P" });
        else if (t <= 6) results.push({ pred: "TAI", conf: 70, type: "HƠI LỆCH XỈU 15P" });
    }
    if (res.length >= 20) {
        const last20 = res.slice(0, 20);
        const t = last20.filter(r => r === "TAI").length;
        if (t >= 14) results.push({ pred: "XIU", conf: 82, type: "LỆCH TÀI 20P" });
        else if (t <= 6) results.push({ pred: "TAI", conf: 82, type: "LỆCH XỈU 20P" });
    }
    if (res.length >= 30) {
        const last30 = res.slice(0, 30);
        const t = last30.filter(r => r === "TAI").length;
        if (t >= 22) results.push({ pred: "XIU", conf: 85, type: "LỆCH TÀI 30P" });
        else if (t <= 8) results.push({ pred: "TAI", conf: 85, type: "LỆCH XỈU 30P" });
    }
    return results;
}

// Xu hướng theo khung
function trendAnalysis(res) {
    const results = [];
    if (res.length >= 5) {
        const last5 = res.slice(0, 5);
        const t = last5.filter(r => r === "TAI").length;
        if (t >= 4) results.push({ pred: "XIU", conf: 70, type: "XU HƯỚNG TÀI 5P" });
        else if (t <= 1) results.push({ pred: "TAI", conf: 70, type: "XU HƯỚNG XỈU 5P" });
        else if (t === 3) results.push({ pred: "TAI", conf: 60, type: "NHẸ TÀI 5P" });
        else if (t === 2) results.push({ pred: "XIU", conf: 60, type: "NHẸ XỈU 5P" });
    }
    if (res.length >= 7) {
        const last7 = res.slice(0, 7);
        const t = last7.filter(r => r === "TAI").length;
        if (t >= 5) results.push({ pred: "XIU", conf: 72, type: "XU HƯỚNG TÀI 7P" });
        else if (t <= 2) results.push({ pred: "TAI", conf: 72, type: "XU HƯỚNG XỈU 7P" });
    }
    return results;
}

// Lệch pha
function lechPhaAnalysis(res, khung = 15) {
    if (res.length < khung) return null;
    const last = res.slice(0, khung);
    const t = last.filter(r => r === "TAI").length;
    const x = khung - t;
    const chenh = Math.abs(t - x);
    if (chenh < 4) return null;
    let conf = 70;
    if (chenh >= 8) conf = 84;
    else if (chenh >= 6) conf = 78;
    const pred = t > x ? "XIU" : "TAI";
    return { pred, conf, type: `LỆCH PHA ${chenh} (${t}T-${x}X)` };
}

// ============================================================
// ========== PHẦN 4: PATTERN MATCHING (HỌC TỪ LỊCH SỬ) ==========
// ============================================================

function patternMatch(res, len) {
    if (res.length < len + 2) return null;
    const pattern = res.slice(0, len);
    let cnt = { TAI: 0, XIU: 0 };
    for (let i = 0; i <= res.length - len - 1; i++) {
        let match = true;
        for (let j = 0; j < len; j++) {
            if (res[i + j] !== pattern[j]) { match = false; break; }
        }
        if (match) cnt[res[i + len]]++;
    }
    const total = cnt.TAI + cnt.XIU;
    if (total < 2) return null;
    const best = cnt.TAI > cnt.XIU ? "TAI" : "XIU";
    const ratio = Math.max(cnt.TAI, cnt.XIU) / total;
    const conf = Math.min(86, 55 + ratio * 35);
    return { pred: best, conf, type: `PATTERN ${len} (${total} lần)` };
}

// ============================================================
// ========== PHẦN 5: PHÂN TÍCH ĐIỂM SỐ ==========
// ============================================================

function pointAnalysis(history) {
    const points = history.slice(0, 15).map(h => h.point).filter(p => p);
    if (points.length < 8) return null;
    const avg = points.reduce((a, b) => a + b, 0) / points.length;
    const last3Avg = points.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
    const trend = last3Avg - avg;
    
    if (avg > 12.5) return { pred: "XIU", conf: 66, type: `ĐIỂM CAO (TB ${avg.toFixed(1)})` };
    if (avg < 8.5) return { pred: "TAI", conf: 66, type: `ĐIỂM THẤP (TB ${avg.toFixed(1)})` };
    if (trend > 1.5) return { pred: "XIU", conf: 62, type: "ĐIỂM ĐANG TĂNG" };
    if (trend < -1.5) return { pred: "TAI", conf: 62, type: "ĐIỂM ĐANG GIẢM" };
    return null;
}

// ============================================================
// ========== PHẦN 6: TỔNG HỢP DỰ ĐOÁN ==========
// ============================================================

function predict(history) {
    const results = history.map(h => h.resultTruyenThong);
    if (results.length < 5) return { pred: "TAI", conf: 55, type: "CHƯA ĐỦ DỮ LIỆU" };

    const votes = [];

    // 1. CÁC LOẠI CẦU (TRỌNG SỐ CAO)
    const detectors = [
        detectBet, detectCau11, detectCau22, detectCau32, detectCau33,
        detectCau121, detectCau212, detectCauChuA, detectCycle, detectCau44, detectCauXoanOc
    ];
    for (const detector of detectors) {
        const d = detector(results);
        if (d.has) votes.push({ pred: d.pred, weight: d.conf, type: d.type });
    }

    // 2. THỐNG KÊ
    const freq = freqAnalysis(results);
    for (const f of freq) votes.push({ pred: f.pred, weight: f.conf * 0.75, type: f.type });

    const trend = trendAnalysis(results);
    for (const t of trend) votes.push({ pred: t.pred, weight: t.conf * 0.7, type: t.type });

    const lech = lechPhaAnalysis(results, 15);
    if (lech) votes.push({ pred: lech.pred, weight: lech.conf * 0.8, type: lech.type });

    // 3. PATTERN
    for (let len = 3; len <= 6; len++) {
        const p = patternMatch(results, len);
        if (p) votes.push({ pred: p.pred, weight: p.conf * (0.7 + len * 0.03), type: p.type });
    }

    // 4. ĐIỂM SỐ
    const point = pointAnalysis(history);
    if (point) votes.push({ pred: point.pred, weight: point.conf * 0.6, type: point.type });

    if (votes.length === 0) return { pred: opp(results[0]), conf: 60, type: "ĐẢO CẦU" };

    let totalTai = 0, totalXiu = 0, bestVote = null, maxWeight = 0;
    for (const v of votes) {
        if (v.pred === "TAI") totalTai += v.weight;
        else totalXiu += v.weight;
        if (v.weight > maxWeight) {
            maxWeight = v.weight;
            bestVote = v;
        }
    }

    const total = totalTai + totalXiu;
    const final = totalTai > totalXiu ? "TAI" : "XIU";
    let conf = Math.floor((final === "TAI" ? totalTai : totalXiu) / total * 100);
    conf = Math.min(96, Math.max(58, conf));

    // Điều chỉnh độ tin cậy dựa trên số lượng tín hiệu
    if (votes.length >= 5) conf = Math.min(96, conf + 3);
    if (votes.length >= 8) conf = Math.min(96, conf + 2);

    return {
        pred: final,
        conf,
        type: bestVote ? bestVote.type : "TỔNG HỢP",
        soTinHieu: votes.length
    };
}

// ============================================================
// ========== PHẦN 7: API ==========
// ============================================================

async function fetchData(url) {
    try {
        const res = await http.get(url);
        return res.data;
    } catch (e) {
        return null;
    }
}

app.get("/api/taixiu", async (req, res) => {
    try {
        const data = await fetchData(URL_TX);
        if (!data?.list?.length) return res.status(500).json({ error: "Lỗi dữ liệu" });

        const last = data.list[0];
        const pred = predict(data.list);
        const [streak, _] = getStreak(data.list.map(h => h.resultTruyenThong));

        res.json({
            phien_hien_tai: last.id,
            ket_qua_hien_tai: last.resultTruyenThong === "TAI" ? "Tài" : "Xỉu",
            xuc_xac: `${last.dices[0]} - ${last.dices[1]} - ${last.dices[2]}`,
            tong: last.point,
            dang_bet: streak >= 2 ? `${streak} phiên ${last.resultTruyenThong === "TAI" ? "Tài" : "Xỉu"}` : "không",
            du_doan: {
                phien: last.id + 1,
                du_doan: pred.pred === "TAI" ? "Tài" : "Xỉu",
                ti_le: `${pred.conf}%`,
                loai_cau: pred.type,
                so_tin_hieu: pred.soTinHieu
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/api/taixiumd5", async (req, res) => {
    try {
        const data = await fetchData(URL_MD5);
        if (!data?.list?.length) return res.status(500).json({ error: "Lỗi dữ liệu" });

        const last = data.list[0];
        const pred = predict(data.list);
        const [streak, _] = getStreak(data.list.map(h => h.resultTruyenThong));

        res.json({
            phien_hien_tai: last.id,
            ket_qua_hien_tai: last.resultTruyenThong === "TAI" ? "Tài" : "Xỉu",
            xuc_xac: `${last.dices[0]} - ${last.dices[1]} - ${last.dices[2]}`,
            tong: last.point,
            dang_bet: streak >= 2 ? `${streak} phiên ${last.resultTruyenThong === "TAI" ? "Tài" : "Xỉu"}` : "không",
            du_doan: {
                phien: last.id + 1,
                du_doan: pred.pred === "TAI" ? "Tài" : "Xỉu",
                ti_le: `${pred.conf}%`,
                loai_cau: pred.type,
                so_tin_hieu: pred.soTinHieu
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/", (req, res) => {
    res.json({
        name: "🎲 LC79 - SIÊU THUẬT TOÁN TÀI XỈU 🎲",
        author: "@tranhoang2286",
        version: "5.0 - ULTIMATE",
        thuat_toan: [
            "🔴 BỆT (3-4-5-6-7-8+) - Đảo cầu khi bệt dài",
            "🟢 CẦU 1-1, 2-2, 3-2, 3-3, 4-4",
            "🟣 CẦU 1-2-1, 2-1-2, CHỮ A, XOẮN ỐC",
            "🔄 CHU KỲ LẶP LẠI",
            "📊 TẦN SUẤT (10-15-20-30 phiên)",
            "📈 XU HƯỚNG (5-7 phiên)",
            "📐 LỆCH PHA",
            "📚 PATTERN MATCHING (3-4-5-6 phiên)",
            "🎯 PHÂN TÍCH ĐIỂM SỐ"
        ],
        endpoints: { "TX": "/api/taixiu", "MD5": "/api/taixiumd5" }
    });
});

app.listen(PORT, () => {
    console.log(`\n============================================================`);
    console.log(`🎲 LC79 API - SIÊU THUẬT TOÁN v5.0`);
    console.log(`============================================================`);
    console.log(`✅ TX: http://localhost:${PORT}/api/taixiu`);
    console.log(`✅ MD5: http://localhost:${PORT}/api/taixiumd5`);
    console.log(`🎯 15+ THUẬT TOÁN - BỎ PHIẾU TRỌNG SỐ`);
    console.log(`============================================================\n`);
});
