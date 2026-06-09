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
// ========== THUẬT TOÁN CỰC MẠNH ==========
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

// 1. BỆT - CẤP ĐỘ 3 ĐẾN 10+
function detectBet(res) {
    const [streak, last] = getStreak(res);
    if (streak >= 8) return { has: true, pred: opp(last), conf: 96, type: `BỆT ${streak} (SIÊU ĐẢO)` };
    if (streak === 7) return { has: true, pred: opp(last), conf: 92, type: `BỆT 7 (ĐẢO CỰC MẠNH)` };
    if (streak === 6) return { has: true, pred: opp(last), conf: 88, type: `BỆT 6 (ĐẢO RẤT MẠNH)` };
    if (streak === 5) return { has: true, pred: opp(last), conf: 82, type: `BỆT 5 (ĐẢO MẠNH)` };
    if (streak === 4) return { has: true, pred: opp(last), conf: 74, type: `BỆT 4 (ĐẢO)` };
    if (streak === 3) return { has: true, pred: last, conf: 64, type: `BỆT 3 (THEO CẦU)` };
    return { has: false };
}

// 2. CẦU 1-1 (T X T X T X...)
function detectCau11(res) {
    if (res.length < 6) return { has: false };
    let len = 1;
    for (let i = 1; i < Math.min(res.length, 14); i++) {
        if (res[i] === res[i-1]) break;
        len = i + 1;
    }
    if (len < 5) return { has: false };
    let conf = 68;
    if (len >= 10) conf = 88;
    else if (len >= 8) conf = 84;
    else if (len >= 6) conf = 78;
    return { has: true, pred: opp(res[0]), conf, type: `CẦU 1-1 (${len} PHIÊN)` };
}

// 3. CẦU 2-2 (TT XX TT XX...)
function detectCau22(res) {
    if (res.length < 8) return { has: false };
    let pairs = 0;
    let ok = true;
    for (let i = 0; i < 8; i += 2) {
        if (res[i] !== res[i+1]) { ok = false; break; }
        if (i + 2 < 8 && res[i] === res[i+2]) { ok = false; break; }
        pairs++;
    }
    if (!ok || pairs < 3) return { has: false };
    let conf = 76;
    if (pairs >= 5) conf = 90;
    else if (pairs >= 4) conf = 86;
    return { has: true, pred: opp(res[6]), conf, type: `CẦU 2-2 (${pairs} CẶP)` };
}

// 4. CẦU 3-2 (TTT XX)
function detectCau32(res) {
    if (res.length < 10) return { has: false };
    const p5 = res.slice(0, 5);
    const str = p5.map(r => r === "TAI" ? "T" : "X").join('');
    if (str === "TTTXX") return { has: true, pred: "XIU", conf: 84, type: "CẦU 3-2 (3T-2X)" };
    if (str === "XXXTT") return { has: true, pred: "TAI", conf: 84, type: "CẦU 3-2 (3X-2T)" };
    return { has: false };
}

// 5. CẦU 3-3 (TTT XXX)
function detectCau33(res) {
    if (res.length < 12) return { has: false };
    const p6 = res.slice(0, 6);
    const str = p6.map(r => r === "TAI" ? "T" : "X").join('');
    if (str === "TTTXXX") return { has: true, pred: "TAI", conf: 88, type: "CẦU 3-3 (3T-3X)" };
    if (str === "XXXTTT") return { has: true, pred: "XIU", conf: 88, type: "CẦU 3-3 (3X-3T)" };
    return { has: false };
}

// 6. CẦU 1-2-1 (T X X T)
function detectCau121(res) {
    if (res.length < 6) return { has: false };
    const p5 = res.slice(0, 5);
    if (p5[0] === p5[2] && p5[0] === p5[4] && p5[1] === p5[3] && p5[0] !== p5[1]) {
        return { has: true, pred: opp(p5[0]), conf: 78, type: "CẦU 1-2-1" };
    }
    return { has: false };
}

// 7. CẦU 2-1-2 (TT X TT)
function detectCau212(res) {
    if (res.length < 7) return { has: false };
    const p6 = res.slice(0, 6);
    if (p6[0] === p6[1] && p6[3] === p6[4] && p6[0] !== p6[2] && p6[2] === p6[5] && p6[0] !== p6[3]) {
        return { has: true, pred: opp(p6[3]), conf: 80, type: "CẦU 2-1-2" };
    }
    return { has: false };
}

// 8. CẦU CHỮ A (T X T X X T)
function detectCauChuA(res) {
    if (res.length < 8) return { has: false };
    const p7 = res.slice(0, 7);
    if (p7[0] === p7[2] && p7[0] === p7[4] && p7[0] === p7[6] &&
        p7[1] === p7[3] && p7[1] === p7[5] && p7[0] !== p7[1]) {
        return { has: true, pred: opp(p7[0]), conf: 82, type: "CẦU CHỮ A" };
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
            return { has: true, pred, conf: 76, type: `CHU KỲ ${len}` };
        }
    }
    return { has: false };
}

// 10. THỐNG KÊ TẦN SUẤT (KHUNG 10, 15, 20)
function freqAnalysis(res) {
    const results = [];
    if (res.length >= 10) {
        const last10 = res.slice(0, 10);
        const t = last10.filter(r => r === "TAI").length;
        if (t >= 8) results.push(["XIU", 74, "LỆCH TÀI 10P"]);
        else if (t <= 2) results.push(["TAI", 74, "LỆCH XỈU 10P"]);
        else if (t >= 7) results.push(["XIU", 66, "HƠI LỆCH TÀI 10P"]);
        else if (t <= 3) results.push(["TAI", 66, "HƠI LỆCH XỈU 10P"]);
    }
    if (res.length >= 15) {
        const last15 = res.slice(0, 15);
        const t = last15.filter(r => r === "TAI").length;
        if (t >= 11) results.push(["XIU", 78, "LỆCH TÀI 15P"]);
        else if (t <= 4) results.push(["TAI", 78, "LỆCH XỈU 15P"]);
        else if (t >= 9) results.push(["XIU", 68, "HƠI LỆCH TÀI 15P"]);
        else if (t <= 6) results.push(["TAI", 68, "HƠI LỆCH XỈU 15P"]);
    }
    if (res.length >= 20) {
        const last20 = res.slice(0, 20);
        const t = last20.filter(r => r === "TAI").length;
        if (t >= 14) results.push(["XIU", 80, "LỆCH TÀI 20P"]);
        else if (t <= 6) results.push(["TAI", 80, "LỆCH XỈU 20P"]);
    }
    return results;
}

// 11. XU HƯỚNG (5 PHIÊN GẦN NHẤT)
function trendAnalysis(res) {
    if (res.length < 5) return null;
    const last5 = res.slice(0, 5);
    const t = last5.filter(r => r === "TAI").length;
    if (t >= 4) return ["XIU", 68, "XU HƯỚNG TÀI 5P"];
    if (t <= 1) return ["TAI", 68, "XU HƯỚNG XỈU 5P"];
    if (t === 3) return ["TAI", 58, "NHẸ TÀI 5P"];
    if (t === 2) return ["XIU", 58, "NHẸ XỈU 5P"];
    return null;
}

// 12. PATTERN MATCHING (HỌC TỪ LỊCH SỬ)
function patternMatch(res, len) {
    if (res.length < len + 1) return null;
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
    const conf = Math.min(84, 55 + ratio * 30);
    return { pred: best, conf, type: `PATTERN ${len} (${total} lần)` };
}

// ============================================================
// ========== TỔNG HỢP DỰ ĐOÁN ==========
// ============================================================

function predict(history) {
    const results = history.map(h => h.resultTruyenThong);
    if (results.length < 5) return { pred: "TAI", conf: 55, type: "CHƯA ĐỦ DỮ LIỆU" };

    const votes = [];

    // 1. Các loại cầu (ưu tiên cao)
    const bet = detectBet(results);
    if (bet.has) votes.push({ pred: bet.pred, weight: bet.conf, type: bet.type });

    const cau11 = detectCau11(results);
    if (cau11.has) votes.push({ pred: cau11.pred, weight: cau11.conf, type: cau11.type });

    const cau22 = detectCau22(results);
    if (cau22.has) votes.push({ pred: cau22.pred, weight: cau22.conf, type: cau22.type });

    const cau32 = detectCau32(results);
    if (cau32.has) votes.push({ pred: cau32.pred, weight: cau32.conf, type: cau32.type });

    const cau33 = detectCau33(results);
    if (cau33.has) votes.push({ pred: cau33.pred, weight: cau33.conf, type: cau33.type });

    const cau121 = detectCau121(results);
    if (cau121.has) votes.push({ pred: cau121.pred, weight: cau121.conf, type: cau121.type });

    const cau212 = detectCau212(results);
    if (cau212.has) votes.push({ pred: cau212.pred, weight: cau212.conf, type: cau212.type });

    const chuA = detectCauChuA(results);
    if (chuA.has) votes.push({ pred: chuA.pred, weight: chuA.conf, type: chuA.type });

    const cycle = detectCycle(results);
    if (cycle.has) votes.push({ pred: cycle.pred, weight: cycle.conf, type: cycle.type });

    // 2. Thống kê
    const freq = freqAnalysis(results);
    for (const [p, w, t] of freq) {
        votes.push({ pred: p, weight: w * 0.75, type: t });
    }

    // 3. Xu hướng
    const trend = trendAnalysis(results);
    if (trend) votes.push({ pred: trend[0], weight: trend[1] * 0.7, type: trend[2] });

    // 4. Pattern matching
    const p3 = patternMatch(results, 3);
    if (p3) votes.push({ pred: p3.pred, weight: p3.conf * 0.7, type: p3.type });
    const p4 = patternMatch(results, 4);
    if (p4) votes.push({ pred: p4.pred, weight: p4.conf * 0.75, type: p4.type });
    const p5 = patternMatch(results, 5);
    if (p5) votes.push({ pred: p5.pred, weight: p5.conf * 0.8, type: p5.type });

    // 5. Điểm số (nếu có dữ liệu)
    const points = history.slice(0, 10).map(h => h.point).filter(p => p);
    if (points.length >= 5) {
        const avg = points.reduce((a, b) => a + b, 0) / points.length;
        if (avg > 12) votes.push({ pred: "XIU", weight: 62, type: "ĐIỂM CAO" });
        else if (avg < 9) votes.push({ pred: "TAI", weight: 62, type: "ĐIỂM THẤP" });
    }

    if (votes.length === 0) return { pred: results[0] === "TAI" ? "XIU" : "TAI", conf: 58, type: "ĐẢO CẦU" };

    let totalTai = 0, totalXiu = 0;
    for (const v of votes) {
        if (v.pred === "TAI") totalTai += v.weight;
        else totalXiu += v.weight;
    }

    const total = totalTai + totalXiu;
    const final = totalTai > totalXiu ? "TAI" : "XIU";
    let conf = Math.floor((final === "TAI" ? totalTai : totalXiu) / total * 100);
    conf = Math.min(96, Math.max(58, conf));

    const bestVote = votes.reduce((a, b) => a.weight > b.weight ? a : b, votes[0]);

    return { pred: final, conf, type: bestVote.type, votes: votes.length };
}

// ============================================================
// ========== API ==========
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

        res.json({
            phien: last.id,
            ket_qua: last.resultTruyenThong === "TAI" ? "Tài" : "Xỉu",
            xuc_xac: `${last.dices[0]} - ${last.dices[1]} - ${last.dices[2]}`,
            tong: last.point,
            du_doan: pred.pred === "TAI" ? "Tài" : "Xỉu",
            ti_le: `${pred.conf}%`,
            loai_cau: pred.type
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

        res.json({
            phien: last.id,
            ket_qua: last.resultTruyenThong === "TAI" ? "Tài" : "Xỉu",
            xuc_xac: `${last.dices[0]} - ${last.dices[1]} - ${last.dices[2]}`,
            tong: last.point,
            du_doan: pred.pred === "TAI" ? "Tài" : "Xỉu",
            ti_le: `${pred.conf}%`,
            loai_cau: pred.type
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/", (req, res) => {
    res.json({
        name: "🎲 LC79 - SIÊU THUẬT TOÁN TÀI XỈU 🎲",
        author: "@tranhoang2286",
        version: "2.0",
        thuat_toan: [
            "🔥 Bệt (3-4-5-6-7-8+) - Đảo cầu",
            "🟢 Cầu 1-1, 2-2, 3-2, 3-3",
            "🟣 Cầu 1-2-1, 2-1-2, Chữ A",
            "🔄 Chu kỳ lặp lại",
            "📊 Tần suất (10-15-20 phiên)",
            "📈 Xu hướng 5 phiên",
            "📚 Pattern matching (3-4-5 phiên)"
        ],
        endpoints: { "TX": "/api/taixiu", "MD5": "/api/taixiumd5" }
    });
});

app.listen(PORT, () => {
    console.log(`\n============================================================`);
    console.log(`🎲 LC79 API - SIÊU THUẬT TOÁN`);
    console.log(`============================================================`);
    console.log(`✅ TX: http://localhost:${PORT}/api/taixiu`);
    console.log(`✅ MD5: http://localhost:${PORT}/api/taixiumd5`);
    console.log(`============================================================\n`);
});
