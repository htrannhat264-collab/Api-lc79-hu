const express = require("express");
const axios = require("axios");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const URL_TRUYEN_THONG = "https://wtx.tele68.com/v1/tx/sessions";
const URL_MD5 = "https://wtxmd52.tele68.com/v1/txmd5/sessions";

const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "application/json, text/plain, */*",
    "Referer": "https://tele68.com/",
    "Origin": "https://tele68.com",
    "Connection": "keep-alive"
};

const http = axios.create({ timeout: 10000, headers: HEADERS });

let historyNormal = [];
let historyMd5 = [];
let predictionsNormal = [];
let predictionsMd5 = [];

// ========== MARKOV CHAIN SIÊU CẤP ==========
class MarkovXucXac123 {
    constructor(bac = 3) {
        this.bac = Math.min(4, Math.max(1, bac));
        this.transitions = new Map();
        this.history = [];
        this.maxHistory = 80;
        this.totalPredictions = 0;
        this.correctPredictions = 0;
    }

    static chuyenLoai(diem) {
        if (diem === 1 || diem === 2) return 1;
        if (diem === 3 || diem === 4) return 2;
        return 3;
    }

    themDuLieu(daySo) {
        const filtered = daySo.map(x => MarkovXucXac123.chuyenLoai(x));
        this.history.push(...filtered);
        if (this.history.length > this.maxHistory) {
            this.history = this.history.slice(-this.maxHistory);
        }
        this._xayDungMaTran();
    }

    _xayDungMaTran() {
        this.transitions.clear();
        const len = this.history.length;
        if (len < this.bac + 1) return;

        for (let i = this.bac; i < len; i++) {
            for (let b = 1; b <= this.bac; b++) {
                const state = [];
                for (let j = b - 1; j >= 0; j--) {
                    state.push(this.history[i - j]);
                }
                const stateKey = state.join(',');
                const nextVal = this.history[i];
                
                if (!this.transitions.has(stateKey)) {
                    this.transitions.set(stateKey, new Map());
                }
                const nextMap = this.transitions.get(stateKey);
                nextMap.set(nextVal, (nextMap.get(nextVal) || 0) + 1);
            }
        }
    }

    _layStateHienTai() {
        if (this.history.length < 1) return null;
        const results = [];
        for (let b = 1; b <= this.bac; b++) {
            if (this.history.length >= b) {
                const state = [];
                for (let j = b - 1; j >= 0; j--) {
                    state.push(this.history[this.history.length - 1 - j]);
                }
                results.push({ bac: b, key: state.join(',') });
            }
        }
        return results;
    }

    duDoan() {
        if (this.history.length < 3) {
            return this._duDoanTheoXuatHuong();
        }

        const states = this._layStateHienTai();
        const diem = { 1: 0, 2: 0, 3: 0 };
        let tongDiem = 0;

        for (let i = states.length - 1; i >= 0; i--) {
            const s = states[i];
            const nextMap = this.transitions.get(s.key);
            if (nextMap && nextMap.size > 0) {
                const heSo = Math.pow(2, s.bac);
                for (let [val, count] of nextMap.entries()) {
                    diem[val] += count * heSo;
                    tongDiem += count * heSo;
                }
                break;
            }
        }

        if (tongDiem === 0) {
            return this._duDoanTheoXuatHuong();
        }

        let rand = Math.random() * tongDiem;
        let cum = 0;
        for (let val of [1, 2, 3]) {
            cum += diem[val];
            if (rand <= cum) return val;
        }
        return 2;
    }

    _duDoanTheoXuatHuong() {
        if (this.history.length === 0) return 2;
        const dem = { 1: 0, 2: 0, 3: 0 };
        this.history.forEach(v => dem[v]++);
        let maxVal = 2, maxCount = 0;
        for (let val of [1, 2, 3]) {
            if (dem[val] > maxCount) {
                maxCount = dem[val];
                maxVal = val;
            }
        }
        return maxVal;
    }

    ghiNhanKetQua(duDoan, thucTe) {
        if (duDoan === thucTe) this.correctPredictions++;
        this.totalPredictions++;
    }

    phanTich() {
        if (this.history.length < 8) {
            return {
                prediction: "TÀI",
                confidenceTai: 55,
                confidenceXiu: 45,
                reason: `Cần thêm ${8 - this.history.length} phiên`,
                duDoanSo: 3,
                doOnDinh: "THẤP"
            };
        }

        const duDoanSo = this.duDoan();
        const prediction = (duDoanSo === 1 || duDoanSo === 3) ? "TÀI" : "XỈU";
        
        const recent = this.history.slice(-10);
        const recentDem = { 1: 0, 2: 0, 3: 0 };
        recent.forEach(v => recentDem[v]++);
        
        let confidence = 65;
        if (recentDem[duDoanSo] >= 5) confidence += 20;
        else if (recentDem[duDoanSo] >= 3) confidence += 10;
        else if (recentDem[duDoanSo] === 0) confidence -= 15;
        
        if (this.history.length > 40) confidence += 10;
        if (this.totalPredictions > 10) {
            const tyLeDung = (this.correctPredictions / this.totalPredictions) * 100;
            confidence = confidence * (0.7 + tyLeDung / 100);
        }
        confidence = Math.min(96, Math.max(45, confidence));
        
        let confidenceTai = (duDoanSo === 1 || duDoanSo === 3) ? confidence : 100 - confidence;
        let confidenceXiu = (duDoanSo === 2) ? confidence : 100 - confidence;
        
        const total = confidenceTai + confidenceXiu;
        if (total !== 100) {
            confidenceTai = Math.round(confidenceTai * 100 / total);
            confidenceXiu = 100 - confidenceTai;
        }
        
        let pattern = "";
        if (this.history.length >= 3) {
            const last3 = this.history.slice(-3);
            if (last3[0] === last3[1] && last3[1] === last3[2]) pattern = "📌 CẦU BA THÔNG";
            else if (last3[0] !== last3[1] && last3[1] !== last3[2] && last3[0] !== last3[2]) pattern = "🔄 CẦU LỆCH";
            else pattern = "⚖️ CẦU BÌNH THƯỜNG";
        }
        
        return {
            prediction: prediction,
            confidenceTai: confidenceTai,
            confidenceXiu: confidenceXiu,
            reason: `🎲 Markov bậc ${this.bac} | ${this.history.length} phiên | Pattern: ${pattern}`,
            duDoanSo: duDoanSo,
            pattern: pattern,
            doOnDinh: confidence > 75 ? "CAO" : (confidence > 55 ? "TRUNG BÌNH" : "THẤP")
        };
    }
}

// ========== PHÂN TÍCH CẦU ĐẶC BIỆT ==========
function phanTichCauDacBiet(history) {
    if (!history || history.length < 8) return null;
    
    const results = history.slice(0, 10).map(h => h.resultTruyenThong);
    
    // Bệt
    let bet = 1;
    for (let i = 1; i < results.length; i++) {
        if (results[i] === results[0]) bet++;
        else break;
    }
    
    if (bet >= 6) {
        const duDoan = results[0] === "TAI" ? "XỈU" : "TÀI";
        return { prediction: duDoan, confidence: 96, reason: `🔴 BỆT ${bet} PHIÊN - CHẮC CHẮN ĐẢO` };
    }
    if (bet === 5) {
        const duDoan = results[0] === "TAI" ? "XỈU" : "TÀI";
        return { prediction: duDoan, confidence: 92, reason: `🔴 BỆT 5 PHIÊN - ĐẢO RẤT CHẮC` };
    }
    if (bet === 4) {
        const duDoan = results[0] === "TAI" ? "XỈU" : "TÀI";
        return { prediction: duDoan, confidence: 86, reason: `🟡 BỆT 4 PHIÊN - ĐẢO` };
    }
    
    // Cầu 2-2
    if (results.length >= 8) {
        const cau22 = (results[0] === results[1] && results[2] === results[3] && results[4] === results[5] && results[6] === results[7] &&
                       results[0] !== results[2] && results[2] !== results[4]);
        if (cau22) {
            const duDoan = results[6] === "TAI" ? "XỈU" : "TÀI";
            return { prediction: duDoan, confidence: 90, reason: `🟢 CẦU 2-2 (4 CẶP)` };
        }
    }
    
    return null;
}

// ========== PHÂN TÍCH LỆCH PHA ==========
function phanTichLechPha(history) {
    if (!history || history.length < 15) return null;
    
    const last15 = history.slice(0, 15);
    const tai15 = last15.filter(h => h.resultTruyenThong === "TAI").length;
    
    if (tai15 >= 12) return { prediction: "XỈU", confidence: 88, reason: `📊 LỆCH TÀI CỰC ĐẠI (${tai15}T-${15-tai15}X)` };
    if (tai15 <= 3) return { prediction: "TÀI", confidence: 88, reason: `📊 LỆCH XỈU CỰC ĐẠI (${tai15}T-${15-tai15}X)` };
    
    return null;
}

// ========== TỔNG HỢP DỰ ĐOÁN ==========
function analyzeTrend(history) {
    if (!history || history.length === 0) {
        return { prediction: "TÀI", confidenceTai: 50, confidenceXiu: 50, reason: "Chưa có dữ liệu", duDoanSo: 3 };
    }
    
    // 1. Cầu đặc biệt (ưu tiên cao nhất)
    const cauDacBiet = phanTichCauDacBiet(history);
    if (cauDacBiet && cauDacBiet.confidence >= 86) {
        return {
            prediction: cauDacBiet.prediction,
            confidenceTai: cauDacBiet.prediction === "TÀI" ? cauDacBiet.confidence : 100 - cauDacBiet.confidence,
            confidenceXiu: cauDacBiet.prediction === "XỈU" ? cauDacBiet.confidence : 100 - cauDacBiet.confidence,
            reason: cauDacBiet.reason,
            duDoanSo: cauDacBiet.prediction === "TÀI" ? 3 : 2,
            doOnDinh: "CAO"
        };
    }
    
    // 2. Lệch pha
    const lechPha = phanTichLechPha(history);
    if (lechPha && lechPha.confidence >= 85) {
        return {
            prediction: lechPha.prediction,
            confidenceTai: lechPha.prediction === "TÀI" ? lechPha.confidence : 100 - lechPha.confidence,
            confidenceXiu: lechPha.prediction === "XỈU" ? lechPha.confidence : 100 - lechPha.confidence,
            reason: lechPha.reason,
            duDoanSo: lechPha.prediction === "TÀI" ? 3 : 2,
            doOnDinh: "CAO"
        };
    }
    
    // 3. Markov Chain
    const dice123 = [];
    for (let i = 0; i < Math.min(history.length, 50); i++) {
        const item = history[i];
        if (item && item.dices && item.dices.length === 3) {
            for (let d of item.dices) dice123.push(MarkovXucXac123.chuyenLoai(d));
        }
    }
    
    if (dice123.length >= 15) {
        const markov = new MarkovXucXac123(3);
        markov.themDuLieu(dice123);
        
        // Ghi nhận kết quả
        if (history.length >= 2 && predictionsNormal.length > 0) {
            const lastResult = history[0]?.resultTruyenThong === "TAI" ? "TÀI" : "XỈU";
            const lastPred = predictionsNormal[predictionsNormal.length - 1]?.du_doan;
            if (lastPred) markov.ghiNhanKetQua(lastPred === "TÀI" ? 3 : 2, lastResult === "TÀI" ? 3 : 2);
        }
        
        return markov.phanTich();
    }
    
    // 4. Fallback: theo tần suất 10 phiên
    const last10 = history.slice(0, 10);
    const tai10 = last10.filter(h => h.resultTruyenThong === "TAI").length;
    if (tai10 >= 7) {
        return { prediction: "XỈU", confidenceTai: 30, confidenceXiu: 82, reason: `📊 10P: ${tai10}T-${10-tai10}X`, duDoanSo: 2, doOnDinh: "TRUNG BÌNH" };
    }
    if (tai10 <= 3) {
        return { prediction: "TÀI", confidenceTai: 82, confidenceXiu: 30, reason: `📊 10P: ${tai10}T-${10-tai10}X`, duDoanSo: 3, doOnDinh: "TRUNG BÌNH" };
    }
    
    return { prediction: "TÀI", confidenceTai: 60, confidenceXiu: 55, reason: "⚖️ Dự đoán cơ bản", duDoanSo: 3, doOnDinh: "THẤP" };
}

// ========== CÁC HÀM HỖ TRỢ ==========
function generateSeed(history, count = 8) {
    if (history.length < count) return null;
    const seedString = history.slice(0, count).map(item => item.dices ? item.dices.join('') : '').join('');
    if (!seedString) return null;
    return crypto.createHash('md5').update(seedString).digest('hex');
}

function randomDice(seed) {
    if (!seed) return [Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1];
    const hash = crypto.createHash('md5').update(seed).digest('hex');
    return [
        parseInt(hash.substring(0, 2), 16) % 6 + 1,
        parseInt(hash.substring(2, 4), 16) % 6 + 1,
        parseInt(hash.substring(4, 6), 16) % 6 + 1
    ];
}

function updatePrediction(storage, history) {
    if (history.length < 2) return;
    const latest = history[0];
    const existing = storage.find(p => p.phien === latest.id);
    if (existing) return;
    
    const ai = analyzeTrend(history);
    storage.push({
        phien: latest.id + 1,
        du_doan: ai.prediction,
        ket_qua: null,
        danh_gia: null,
        chi_tiet: ai
    });
    if (storage.length > 200) storage.shift();
}

function evaluate(storage, history) {
    storage.forEach(p => {
        if (p.ket_qua) return;
        const real = history.find(h => h.id === p.phien);
        if (!real) return;
        const result = real.resultTruyenThong === "TAI" ? "TÀI" : "XỈU";
        p.ket_qua = result;
        p.danh_gia = p.du_doan === result ? "✅ THẮNG" : "❌ THUA";
    });
}

function stats(storage) {
    const total = storage.length;
    const win = storage.filter(i => i.danh_gia === "✅ THẮNG").length;
    const lose = storage.filter(i => i.danh_gia === "❌ THUA").length;
    const rate = total === 0 ? 0 : (win / (win + lose)) * 100;
    return {
        tong_du_doan: total,
        tong_thang: win,
        tong_thua: lose,
        ti_le_chinh_xac: `${rate.toFixed(2)}%`,
        lich_su: storage.slice(-15).reverse()
    };
}

function formatData(raw, history, type) {
    const list = raw?.list;
    if (!list || list.length === 0) {
        return { error: "Không có dữ liệu", note: "API đang hoạt động bình thường, thử lại sau" };
    }
    
    const data = list[0];
    const ai = analyzeTrend(list);
    
    let tong = 0;
    let xuc_xac = [0, 0, 0];
    if (data.dices && data.dices.length === 3) {
        xuc_xac = data.dices;
        tong = data.dices.reduce((a, b) => a + b, 0);
    }

    const ketQua = data.resultTruyenThong === "TAI" ? "TÀI" : "XỈU";
    const coNenCuoc = ai.prediction === "TÀI" ? ai.confidenceTai >= 75 : ai.confidenceXiu >= 75;

    return {
        success: true,
        game: type,
        current: {
            phien: data.id,
            xuc_xac: `${xuc_xac[0]} - ${xuc_xac[1]} - ${xuc_xac[2]}`,
            tong: tong,
            ket_qua: ketQua
        },
        du_doan: {
            phien_tiep: data.id + 1,
            du_doan: ai.prediction,
            do_tin_cay: `${ai.prediction === "TÀI" ? ai.confidenceTai : ai.confidenceXiu}%`,
            ty_le_tai: `${ai.confidenceTai}%`,
            ty_le_xiu: `${ai.confidenceXiu}%`,
            co_nen_cuoc: coNenCuoc ? "✅✅✅ NÊN CƯỢC" : "⏸️ BỎ QUA",
            ly_do: ai.reason,
            do_on_dinh: ai.doOnDinh || "TRUNG BÌNH"
        },
        thong_ke: stats(type === "TX" ? predictionsNormal : predictionsMd5),
        timestamp: new Date().toISOString()
    };
}

async function fetchWithRetry(url, retry = 2) {
    try {
        const response = await http.get(url);
        return response;
    } catch (e) {
        if (retry > 0) {
            await new Promise(r => setTimeout(r, 1000));
            return fetchWithRetry(url, retry - 1);
        }
        throw e;
    }
}

async function poll() {
    try {
        const [normal, md5] = await Promise.all([
            fetchWithRetry(URL_TRUYEN_THONG),
            fetchWithRetry(URL_MD5)
        ]);
        
        if (normal?.data?.list) {
            historyNormal = normal.data.list;
            updatePrediction(predictionsNormal, historyNormal);
            evaluate(predictionsNormal, historyNormal);
        }
        
        if (md5?.data?.list) {
            historyMd5 = md5.data.list;
            updatePrediction(predictionsMd5, historyMd5);
            evaluate(predictionsMd5, historyMd5);
        }
        
        const txRate = stats(predictionsNormal).ti_le_chinh_xac;
        const md5Rate = stats(predictionsMd5).ti_le_chinh_xac;
        console.log(`🌊 Poll OK - ${new Date().toLocaleTimeString()} | TX: ${txRate} | MD5: ${md5Rate}`);
    } catch (e) {
        console.log("❌ Poll lỗi:", e.message);
    }
}

// ========== API ENDPOINTS ==========
app.get("/", (req, res) => {
    res.json({
        name: "🎲 LC79 - SIÊU THUẬT TOÁN MARKOV TÀI XỈU 🎲",
        author: "@tranhoang2286",
        version: "5.0",
        status: "🟢 ONLINE",
        thuat_toan: ["🔴 Bệt 4-5-6+", "🟢 Cầu 2-2", "📊 Lệch pha", "🎲 Markov Chain bậc 3"],
        quy_tac: "🎯 CHỈ CƯỢC KHI 'co_nen_cuoc' = '✅✅✅ NÊN CƯỢC'",
        endpoints: {
            "TX - Dự đoán": "GET /taixiu",
            "MD5 - Dự đoán": "GET /taixiumd5",
            "TX + MD5": "GET /all",
            "Thống kê TX": "GET /thongke",
            "Thống kê MD5": "GET /thongkemd5"
        }
    });
});

app.get("/taixiu", async (req, res) => {
    try {
        const r = await fetchWithRetry(URL_TRUYEN_THONG);
        res.json(formatData(r.data, historyNormal, "TX"));
    } catch (err) {
        res.status(500).json({ error: "Lỗi kết nối API TX", message: err.message });
    }
});

app.get("/taixiumd5", async (req, res) => {
    try {
        const r = await fetchWithRetry(URL_MD5);
        res.json(formatData(r.data, historyMd5, "MD5"));
    } catch (err) {
        res.status(500).json({ error: "Lỗi kết nối API MD5", message: err.message });
    }
});

app.get("/all", async (req, res) => {
    try {
        const [a, b] = await Promise.all([fetchWithRetry(URL_TRUYEN_THONG), fetchWithRetry(URL_MD5)]);
        res.json({
            taixiu: formatData(a.data, historyNormal, "TX"),
            taixiumd5: formatData(b.data, historyMd5, "MD5")
        });
    } catch (err) {
        res.status(500).json({ error: "Lỗi", message: err.message });
    }
});

app.get("/thongke", (req, res) => res.json(stats(predictionsNormal)));
app.get("/thongkemd5", (req, res) => res.json(stats(predictionsMd5)));

// Khởi động
poll();
setInterval(poll, 8000);

app.listen(PORT, () => {
    console.log(`\n============================================================`);
    console.log(`🎲 LC79 - SIÊU THUẬT TOÁN v5.0`);
    console.log(`============================================================`);
    console.log(`✅ TX: http://localhost:${PORT}/taixiu`);
    console.log(`✅ MD5: http://localhost:${PORT}/taixiumd5`);
    console.log(`🎯 CHỈ CƯỢC KHI "co_nen_cuoc" = "✅✅✅ NÊN CƯỢC"`);
    console.log(`============================================================\n`);
});
