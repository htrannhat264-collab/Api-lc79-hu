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

// ==========================================
// HỆ THỐNG HỌC CẦU TỰ ĐỘNG
// ==========================================
class HocCau {
    constructor() {
        this.cau5Phien = new Map();     // Pattern 5 phiên
        this.cau6Phien = new Map();     // Pattern 6 phiên
        this.cau7Phien = new Map();     // Pattern 7 phiên
        this.cauDacBiet = new Map();    // Cầu đặc biệt (bệt, 1-1, 2-2)
        this.tongPhienDaHoc = 0;
    }

    // Chuyển đổi TAI/XIU thành ký tự
    static chuyenKyTu(ketQua) {
        return ketQua === "TAI" ? "T" : "X";
    }

    // Học từ lịch sử
    hocTuLichSu(lichSu) {
        if (!lichSu || lichSu.length < 10) return;
        
        const ketQuaStr = lichSu.map(h => HocCau.chuyenKyTu(h.resultTruyenThong));
        
        // Học pattern 5 phiên
        for (let i = 0; i <= ketQuaStr.length - 6; i++) {
            const pattern = ketQuaStr.slice(i, i + 5).join('');
            const ketQuaTiep = ketQuaStr[i + 5];
            
            if (!this.cau5Phien.has(pattern)) {
                this.cau5Phien.set(pattern, { T: 0, X: 0, tong: 0 });
            }
            const data = this.cau5Phien.get(pattern);
            if (ketQuaTiep === 'T') data.T++;
            else data.X++;
            data.tong++;
        }
        
        // Học pattern 6 phiên
        for (let i = 0; i <= ketQuaStr.length - 7; i++) {
            const pattern = ketQuaStr.slice(i, i + 6).join('');
            const ketQuaTiep = ketQuaStr[i + 6];
            
            if (!this.cau6Phien.has(pattern)) {
                this.cau6Phien.set(pattern, { T: 0, X: 0, tong: 0 });
            }
            const data = this.cau6Phien.get(pattern);
            if (ketQuaTiep === 'T') data.T++;
            else data.X++;
            data.tong++;
        }
        
        // Học pattern 7 phiên
        for (let i = 0; i <= ketQuaStr.length - 8; i++) {
            const pattern = ketQuaStr.slice(i, i + 7).join('');
            const ketQuaTiep = ketQuaStr[i + 7];
            
            if (!this.cau7Phien.has(pattern)) {
                this.cau7Phien.set(pattern, { T: 0, X: 0, tong: 0 });
            }
            const data = this.cau7Phien.get(pattern);
            if (ketQuaTiep === 'T') data.T++;
            else data.X++;
            data.tong++;
        }
        
        // Học cầu đặc biệt
        this._hocCauDacBiet(ketQuaStr);
        
        this.tongPhienDaHoc = lichSu.length;
        console.log(`📚 Đã học ${this.cau5Phien.size} pattern 5P, ${this.cau6Phien.size} pattern 6P, ${this.cau7Phien.size} pattern 7P`);
    }
    
    // Học cầu đặc biệt
    _hocCauDacBiet(ketQuaStr) {
        // Bệt
        let bet = 1;
        for (let i = 1; i < ketQuaStr.length; i++) {
            if (ketQuaStr[i] === ketQuaStr[0]) bet++;
            else break;
        }
        if (bet >= 3) {
            const key = `BET_${bet}`;
            if (!this.cauDacBiet.has(key)) {
                this.cauDacBiet.set(key, { T: 0, X: 0, tong: 0 });
            }
            const data = this.cauDacBiet.get(key);
            const next = ketQuaStr[bet];
            if (next === 'T') data.T++;
            else if (next === 'X') data.X++;
            data.tong++;
        }
        
        // Cầu 1-1
        let cau11 = true;
        for (let i = 1; i < Math.min(8, ketQuaStr.length); i++) {
            if (ketQuaStr[i] === ketQuaStr[i-1]) { cau11 = false; break; }
        }
        if (cau11 && ketQuaStr.length >= 6) {
            const key = `CAU11_${Math.min(6, ketQuaStr.length)}`;
            if (!this.cauDacBiet.has(key)) {
                this.cauDacBiet.set(key, { T: 0, X: 0, tong: 0 });
            }
            const data = this.cauDacBiet.get(key);
            const next = ketQuaStr[Math.min(6, ketQuaStr.length)];
            if (next === 'T') data.T++;
            else if (next === 'X') data.X++;
            data.tong++;
        }
        
        // Cầu 2-2
        if (ketQuaStr.length >= 8) {
            const cau22 = (ketQuaStr[0] === ketQuaStr[1] && ketQuaStr[2] === ketQuaStr[3] && 
                           ketQuaStr[4] === ketQuaStr[5] && ketQuaStr[6] === ketQuaStr[7] &&
                           ketQuaStr[0] !== ketQuaStr[2] && ketQuaStr[2] !== ketQuaStr[4]);
            if (cau22) {
                const key = `CAU22_4`;
                if (!this.cauDacBiet.has(key)) {
                    this.cauDacBiet.set(key, { T: 0, X: 0, tong: 0 });
                }
                const data = this.cauDacBiet.get(key);
                const next = ketQuaStr[8];
                if (next === 'T') data.T++;
                else if (next === 'X') data.X++;
                data.tong++;
            }
        }
    }
    
    // Nhận dạng cầu hiện tại
    nhanDangCau(lichSu) {
        if (!lichSu || lichSu.length < 10) return null;
        
        const ketQuaStr = lichSu.slice(0, 10).map(h => HocCau.chuyenKyTu(h.resultTruyenThong));
        
        // 1. Kiểm tra cầu đặc biệt trước
        // Bệt
        let bet = 1;
        for (let i = 1; i < ketQuaStr.length; i++) {
            if (ketQuaStr[i] === ketQuaStr[0]) bet++;
            else break;
        }
        if (bet >= 3) {
            const key = `BET_${bet}`;
            if (this.cauDacBiet.has(key)) {
                const data = this.cauDacBiet.get(key);
                if (data.tong >= 2) {
                    const tyLeT = (data.T / data.tong) * 100;
                    const tyLeX = (data.X / data.tong) * 100;
                    const duDoan = tyLeT > tyLeX ? "TÀI" : "XỈU";
                    const doTinCay = Math.max(tyLeT, tyLeX);
                    const loai = `🔴 BỆT ${bet} PHIÊN (Học từ ${data.tong} lần, ${Math.round(doTinCay)}%)`;
                    return { duDoan, doTinCay: Math.min(96, doTinCay), loai, nguon: "CAU_DAC_BIET" };
                }
            }
        }
        
        // Cầu 2-2
        if (ketQuaStr.length >= 8) {
            const cau22 = (ketQuaStr[0] === ketQuaStr[1] && ketQuaStr[2] === ketQuaStr[3] && 
                           ketQuaStr[4] === ketQuaStr[5] && ketQuaStr[6] === ketQuaStr[7] &&
                           ketQuaStr[0] !== ketQuaStr[2] && ketQuaStr[2] !== ketQuaStr[4]);
            if (cau22) {
                const key = `CAU22_4`;
                if (this.cauDacBiet.has(key)) {
                    const data = this.cauDacBiet.get(key);
                    if (data.tong >= 2) {
                        const duDoan = data.T > data.X ? "TÀI" : "XỈU";
                        const doTinCay = (Math.max(data.T, data.X) / data.tong) * 100;
                        const loai = `🟢 CẦU 2-2 (Học từ ${data.tong} lần, ${Math.round(doTinCay)}%)`;
                        return { duDoan, doTinCay: Math.min(92, doTinCay), loai, nguon: "CAU_DAC_BIET" };
                    }
                }
            }
        }
        
        // 2. Tìm pattern 7 phiên
        if (ketQuaStr.length >= 7) {
            const pattern7 = ketQuaStr.slice(0, 7).join('');
            if (this.cau7Phien.has(pattern7)) {
                const data = this.cau7Phien.get(pattern7);
                if (data.tong >= 2) {
                    const tyLeT = (data.T / data.tong) * 100;
                    const tyLeX = (data.X / data.tong) * 100;
                    if (Math.max(tyLeT, tyLeX) >= 65) {
                        const duDoan = tyLeT > tyLeX ? "TÀI" : "XỈU";
                        const doTinCay = Math.max(tyLeT, tyLeX);
                        const loai = `📚 PATTERN 7P: ${pattern7} (${data.tong} lần, ${Math.round(doTinCay)}%)`;
                        return { duDoan, doTinCay: Math.min(90, doTinCay), loai, nguon: "PATTERN" };
                    }
                }
            }
        }
        
        // 3. Tìm pattern 6 phiên
        if (ketQuaStr.length >= 6) {
            const pattern6 = ketQuaStr.slice(0, 6).join('');
            if (this.cau6Phien.has(pattern6)) {
                const data = this.cau6Phien.get(pattern6);
                if (data.tong >= 2) {
                    const tyLeT = (data.T / data.tong) * 100;
                    const tyLeX = (data.X / data.tong) * 100;
                    if (Math.max(tyLeT, tyLeX) >= 65) {
                        const duDoan = tyLeT > tyLeX ? "TÀI" : "XỈU";
                        const doTinCay = Math.max(tyLeT, tyLeX);
                        const loai = `📚 PATTERN 6P: ${pattern6} (${data.tong} lần, ${Math.round(doTinCay)}%)`;
                        return { duDoan, doTinCay: Math.min(88, doTinCay), loai, nguon: "PATTERN" };
                    }
                }
            }
        }
        
        // 4. Tìm pattern 5 phiên
        if (ketQuaStr.length >= 5) {
            const pattern5 = ketQuaStr.slice(0, 5).join('');
            if (this.cau5Phien.has(pattern5)) {
                const data = this.cau5Phien.get(pattern5);
                if (data.tong >= 3) {
                    const tyLeT = (data.T / data.tong) * 100;
                    const tyLeX = (data.X / data.tong) * 100;
                    if (Math.max(tyLeT, tyLeX) >= 70) {
                        const duDoan = tyLeT > tyLeX ? "TÀI" : "XỈU";
                        const doTinCay = Math.max(tyLeT, tyLeX);
                        const loai = `📚 PATTERN 5P: ${pattern5} (${data.tong} lần, ${Math.round(doTinCay)}%)`;
                        return { duDoan, doTinCay: Math.min(86, doTinCay), loai, nguon: "PATTERN" };
                    }
                }
            }
        }
        
        return null;
    }
}

// ==========================================
// MARKOV CHAIN CHO XÚC XẮC
// ==========================================
class MarkovXucXac {
    constructor(bac = 3) {
        this.bac = bac;
        this.transitions = new Map();
        this.history = [];
        this.maxHistory = 60;
    }

    static chuyenLoai(diem) {
        if (diem === 1 || diem === 2) return 1;
        if (diem === 3 || diem === 4) return 2;
        return 3;
    }

    themDuLieu(daySo) {
        const filtered = daySo.map(x => MarkovXucXac.chuyenLoai(x));
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

    phanTich() {
        if (this.history.length < 8) {
            return { prediction: "TÀI", confidence: 55, duDoanSo: 3 };
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
        confidence = Math.min(94, Math.max(50, confidence));
        
        return { prediction, confidence, duDoanSo };
    }
}

// ==========================================
// KHỞI TẠO BỘ NHỚ
// ==========================================
let hocCauTX = new HocCau();
let hocCauMD5 = new HocCau();
let historyTX = [];
let historyMD5 = [];

// ==========================================
// LẤY DỮ LIỆU
// ==========================================
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

// ==========================================
// HÀM DỰ ĐOÁN CHÍNH
// ==========================================
async function duDoan(gameType) {
    const url = gameType === "TX" ? URL_TRUYEN_THONG : URL_MD5;
    const response = await fetchWithRetry(url);
    const data = response.data;
    
    if (!data || !data.list || data.list.length === 0) {
        return { error: "Không có dữ liệu" };
    }
    
    const lichSu = data.list;
    const current = lichSu[0];
    const hocCau = gameType === "TX" ? hocCauTX : hocCauMD5;
    
    // HỌC CẦU TỪ LỊCH SỬ
    hocCau.hocTuLichSu(lichSu);
    
    // 1. NHẬN DẠNG CẦU TỪ HỆ THỐNG HỌC
    const cauTuHoc = hocCau.nhanDangCau(lichSu);
    
    let duDoanObj = null;
    let nguon = "";
    
    if (cauTuHoc && cauTuHoc.doTinCay >= 70) {
        duDoanObj = cauTuHoc;
        nguon = cauTuHoc.nguon;
    } else {
        // 2. DÙNG MARKOV CHAIN TỪ XÚC XẮC
        const dice123 = [];
        for (let i = 0; i < Math.min(lichSu.length, 50); i++) {
            const item = lichSu[i];
            if (item && item.dices && item.dices.length === 3) {
                for (let d of item.dices) dice123.push(d);
            }
        }
        
        if (dice123.length >= 15) {
            const markov = new MarkovXucXac(3);
            markov.themDuLieu(dice123);
            const markovResult = markov.phanTich();
            duDoanObj = {
                duDoan: markovResult.prediction,
                doTinCay: markovResult.confidence,
                loai: `🎲 MARKOV (${markovResult.duDoanSo === 1 ? "1-2" : markovResult.duDoanSo === 2 ? "3-4" : "5-6"})`
            };
            nguon = "MARKOV";
        } else {
            // 3. FALLBACK: THEO TẦN SUẤT 10 PHIÊN
            const last10 = lichSu.slice(0, 10);
            const tai10 = last10.filter(h => h.resultTruyenThong === "TAI").length;
            if (tai10 >= 7) {
                duDoanObj = { duDoan: "XỈU", doTinCay: 75, loai: "📊 LỆCH TÀI 10P" };
            } else if (tai10 <= 3) {
                duDoanObj = { duDoan: "TÀI", doTinCay: 75, loai: "📊 LỆCH XỈU 10P" };
            } else {
                duDoanObj = { duDoan: "TÀI", doTinCay: 60, loai: "⚖️ CÂN BẰNG" };
            }
            nguon = "FALLBACK";
        }
    }
    
    // TÍNH TOÁN XÚC XẮC HIỆN TẠI
    let tong = 0;
    let xuc_xac = [0, 0, 0];
    if (current.dices && current.dices.length === 3) {
        xuc_xac = current.dices;
        tong = current.dices.reduce((a, b) => a + b, 0);
    }
    
    const coNenCuoc = duDoanObj.doTinCay >= 72;
    
    // DỰ ĐOÁN PHIÊN 2 (nếu có)
    let duDoan2 = null;
    if (lichSu.length >= 2) {
        const fakeLichSu = [{ resultTruyenThong: duDoanObj.duDoan === "TÀI" ? "TAI" : "XIU", dices: [4,4,4] }, ...lichSu];
        const cau2 = hocCau.nhanDangCau(fakeLichSu);
        if (cau2 && cau2.doTinCay >= 65) {
            duDoan2 = { duDoan: cau2.duDoan, doTinCay: cau2.doTinCay, loai: cau2.loai };
        } else {
            const dice123_2 = [];
            for (let i = 0; i < Math.min(fakeLichSu.length, 40); i++) {
                if (fakeLichSu[i]?.dices) {
                    for (let d of fakeLichSu[i].dices) dice123_2.push(d);
                }
            }
            if (dice123_2.length >= 15) {
                const markov2 = new MarkovXucXac(3);
                markov2.themDuLieu(dice123_2);
                const m2 = markov2.phanTich();
                duDoan2 = { duDoan: m2.prediction, doTinCay: m2.confidence - 5, loai: `🎲 MARKOV PHIÊN 2` };
            } else {
                duDoan2 = { duDoan: duDoanObj.duDoan === "TÀI" ? "XỈU" : "TÀI", doTinCay: 58, loai: "🔄 ĐẢO CẦU" };
            }
        }
    }
    
    return {
        success: true,
        game: gameType,
        current: {
            phien: current.id,
            xuc_xac: `${xuc_xac[0]} - ${xuc_xac[1]} - ${xuc_xac[2]}`,
            tong: tong,
            ket_qua: current.resultTruyenThong === "TAI" ? "TÀI" : "XỈU"
        },
        du_doan: {
            phien_tiep: current.id + 1,
            du_doan: duDoanObj.duDoan,
            do_tin_cay: `${Math.round(duDoanObj.doTinCay)}%`,
            co_nen_cuoc: coNenCuoc ? "✅✅✅ NÊN CƯỢC" : "⏸️ BỎ QUA",
            ly_do: duDoanObj.loai,
            nguon: nguon
        },
        du_doan_phien_2: duDoan2 ? {
            phien_tiep: current.id + 2,
            du_doan: duDoan2.duDoan,
            do_tin_cay: `${Math.round(duDoan2.doTinCay)}%`,
            ly_do: duDoan2.loai
        } : null,
        thong_ke_hoc_cau: {
            so_pattern_5p: hocCau.cau5Phien.size,
            so_pattern_6p: hocCau.cau6Phien.size,
            so_pattern_7p: hocCau.cau7Phien.size,
            so_cau_dac_biet: hocCau.cauDacBiet.size,
            tong_phien_da_hoc: hocCau.tongPhienDaHoc
        },
        timestamp: new Date().toISOString()
    };
}

// ==========================================
// POLLING HỌC CẦU TỰ ĐỘNG (KHÔNG LƯU ĐÚNG SAI)
// ==========================================
async function poll() {
    try {
        const [normal, md5] = await Promise.all([
            fetchWithRetry(URL_TRUYEN_THONG),
            fetchWithRetry(URL_MD5)
        ]);
        
        if (normal?.data?.list) {
            historyTX = normal.data.list;
            hocCauTX.hocTuLichSu(historyTX);
        }
        
        if (md5?.data?.list) {
            historyMD5 = md5.data.list;
            hocCauMD5.hocTuLichSu(historyMD5);
        }
        
        console.log(`🌊 Học cầu OK - ${new Date().toLocaleTimeString()} | TX: ${hocCauTX.cau5Phien.size} pattern | MD5: ${hocCauMD5.cau5Phien.size} pattern`);
    } catch (e) {
        console.log("❌ Học cầu lỗi:", e.message);
    }
}

// ==========================================
// API ENDPOINTS
// ==========================================

app.get("/", (req, res) => {
    res.json({
        name: "🎲 LC79 - HỆ THỐNG HỌC CẦU THÔNG MINH 🎲",
        author: "@tranhoang2286",
        version: "6.0",
        tinh_nang: [
            "📚 Học pattern 5-6-7 phiên từ lịch sử",
            "🔴 Học cầu bệt (3-4-5-6+)",
            "🟢 Học cầu 2-2",
            "🎲 Markov Chain xúc xắc",
            "❌ KHÔNG LƯU ĐÚNG SAI - CHỈ HỌC CẦU"
        ],
        quy_tac: "CHỈ CƯỢC KHI 'co_nen_cuoc' = '✅✅✅ NÊN CƯỢC' (độ tin cậy >= 72%)",
        endpoints: {
            "TX - Dự đoán": "GET /taixiu",
            "MD5 - Dự đoán": "GET /taixiumd5",
            "Xem cầu đã học (TX)": "GET /cau-hoc/tx",
            "Xem cầu đã học (MD5)": "GET /cau-hoc/md5"
        }
    });
});

app.get("/taixiu", async (req, res) => {
    try {
        const result = await duDoan("TX");
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/taixiumd5", async (req, res) => {
    try {
        const result = await duDoan("MD5");
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/cau-hoc/tx", (req, res) => {
    const patterns = Array.from(hocCauTX.cau5Phien.entries())
        .filter(([_, data]) => data.tong >= 2)
        .sort((a, b) => b[1].tong - a[1].tong)
        .slice(0, 30)
        .map(([pattern, data]) => ({
            pattern: pattern,
            tai: data.T,
            xiu: data.X,
            tong: data.tong,
            ty_le_tai: `${Math.round((data.T / data.tong) * 100)}%`
        }));
    
    const cauDacBiet = Array.from(hocCauTX.cauDacBiet.entries()).map(([key, data]) => ({
        loai_cau: key,
        tai: data.T,
        xiu: data.X,
        tong: data.tong,
        ty_le: `${Math.round((Math.max(data.T, data.X) / data.tong) * 100)}%`
    }));
    
    res.json({
        game: "TX",
        so_pattern_5p: hocCauTX.cau5Phien.size,
        so_pattern_6p: hocCauTX.cau6Phien.size,
        so_pattern_7p: hocCauTX.cau7Phien.size,
        so_cau_dac_biet: hocCauTX.cauDacBiet.size,
        top_patterns: patterns,
        cau_dac_biet: cauDacBiet
    });
});

app.get("/cau-hoc/md5", (req, res) => {
    const patterns = Array.from(hocCauMD5.cau5Phien.entries())
        .filter(([_, data]) => data.tong >= 2)
        .sort((a, b) => b[1].tong - a[1].tong)
        .slice(0, 30)
        .map(([pattern, data]) => ({
            pattern: pattern,
            tai: data.T,
            xiu: data.X,
            tong: data.tong,
            ty_le_tai: `${Math.round((data.T / data.tong) * 100)}%`
        }));
    
    res.json({
        game: "MD5",
        so_pattern_5p: hocCauMD5.cau5Phien.size,
        so_pattern_6p: hocCauMD5.cau6Phien.size,
        so_pattern_7p: hocCauMD5.cau7Phien.size,
        top_patterns: patterns
    });
});

// Khởi động
poll();
setInterval(poll, 10000);

app.listen(PORT, () => {
    console.log(`\n============================================================`);
    console.log(`🎲 LC79 - HỆ THỐNG HỌC CẦU THÔNG MINH v6.0`);
    console.log(`============================================================`);
    console.log(`✅ TX: http://localhost:${PORT}/taixiu`);
    console.log(`✅ MD5: http://localhost:${PORT}/taixiumd5`);
    console.log(`✅ Xem cầu đã học: http://localhost:${PORT}/cau-hoc/tx`);
    console.log(`🎯 CHỈ CƯỢC KHI "co_nen_cuoc" = "✅✅✅ NÊN CƯỢC"`);
    console.log(`❌ KHÔNG LƯU ĐÚNG SAI - CHỈ HỌC CẦU`);
    console.log(`============================================================\n`);
});
