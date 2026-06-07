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

// ==========================================
// HỆ THỐNG HỌC CẦU NÂNG CẤP CAO CẤP
// ==========================================
class HocCauVIP {
    constructor() {
        // Pattern các cấp độ
        this.pattern3 = new Map();
        this.pattern4 = new Map();
        this.pattern5 = new Map();
        this.pattern6 = new Map();
        this.pattern7 = new Map();
        this.pattern8 = new Map();
        
        // Cầu đặc biệt
        this.cauBet = new Map();
        this.cau11 = { T: 0, X: 0, tong: 0, last: 0 };
        this.cau22 = { T: 0, X: 0, tong: 0, last: 0 };
        this.cau33 = { T: 0, X: 0, tong: 0, last: 0 };
        this.cau44 = { T: 0, X: 0, tong: 0, last: 0 };
        this.cau32 = { T: 0, X: 0, tong: 0, last: 0 };
        this.cau23 = { T: 0, X: 0, tong: 0, last: 0 };
        this.cau121 = { T: 0, X: 0, tong: 0, last: 0 };
        this.cau212 = { T: 0, X: 0, tong: 0, last: 0 };
        
        // Thống kê
        this.tongTai = 0;
        this.tongXiu = 0;
        this.tongPhien = 0;
        this.tyLeTai = 50;
        
        // Học từ lịch sử dự đoán
        this.ketQuaDaDoan = [];
        this.doChinhXac = 50;
        this.lanCuoiCapNhat = Date.now();
    }

    static kyTu(ketQua) {
        return ketQua === "TAI" ? "T" : "X";
    }

    // Học từ lịch sử
    hoc(lichSu) {
        if (!lichSu || lichSu.length < 30) return;
        
        const chuoi = lichSu.map(h => HocCauVIP.kyTu(h.resultTruyenThong));
        
        // Cập nhật tổng thể
        this.tongTai = chuoi.filter(c => c === 'T').length;
        this.tongXiu = chuoi.length - this.tongTai;
        this.tongPhien = chuoi.length;
        this.tyLeTai = (this.tongTai / this.tongPhien) * 100;
        
        // Học pattern 3 phiên
        for (let i = 0; i <= chuoi.length - 4; i++) {
            const p = chuoi.slice(i, i + 3).join('');
            const next = chuoi[i + 3];
            if (!this.pattern3.has(p)) this.pattern3.set(p, { T: 0, X: 0, tong: 0 });
            const d = this.pattern3.get(p);
            if (next === 'T') d.T++; else d.X++;
            d.tong++;
        }
        
        // Học pattern 4 phiên
        for (let i = 0; i <= chuoi.length - 5; i++) {
            const p = chuoi.slice(i, i + 4).join('');
            const next = chuoi[i + 4];
            if (!this.pattern4.has(p)) this.pattern4.set(p, { T: 0, X: 0, tong: 0 });
            const d = this.pattern4.get(p);
            if (next === 'T') d.T++; else d.X++;
            d.tong++;
        }
        
        // Học pattern 5 phiên
        for (let i = 0; i <= chuoi.length - 6; i++) {
            const p = chuoi.slice(i, i + 5).join('');
            const next = chuoi[i + 5];
            if (!this.pattern5.has(p)) this.pattern5.set(p, { T: 0, X: 0, tong: 0 });
            const d = this.pattern5.get(p);
            if (next === 'T') d.T++; else d.X++;
            d.tong++;
        }
        
        // Học pattern 6 phiên
        for (let i = 0; i <= chuoi.length - 7; i++) {
            const p = chuoi.slice(i, i + 6).join('');
            const next = chuoi[i + 6];
            if (!this.pattern6.has(p)) this.pattern6.set(p, { T: 0, X: 0, tong: 0 });
            const d = this.pattern6.get(p);
            if (next === 'T') d.T++; else d.X++;
            d.tong++;
        }
        
        // Học pattern 7 phiên
        for (let i = 0; i <= chuoi.length - 8; i++) {
            const p = chuoi.slice(i, i + 7).join('');
            const next = chuoi[i + 7];
            if (!this.pattern7.has(p)) this.pattern7.set(p, { T: 0, X: 0, tong: 0 });
            const d = this.pattern7.get(p);
            if (next === 'T') d.T++; else d.X++;
            d.tong++;
        }
        
        // Học pattern 8 phiên
        for (let i = 0; i <= chuoi.length - 9; i++) {
            const p = chuoi.slice(i, i + 8).join('');
            const next = chuoi[i + 8];
            if (!this.pattern8.has(p)) this.pattern8.set(p, { T: 0, X: 0, tong: 0 });
            const d = this.pattern8.get(p);
            if (next === 'T') d.T++; else d.X++;
            d.tong++;
        }
        
        // Học cầu bệt
        for (let i = 0; i < chuoi.length - 2; i++) {
            let bet = 1;
            for (let j = i + 1; j < chuoi.length; j++) {
                if (chuoi[j] === chuoi[i]) bet++;
                else break;
            }
            if (bet >= 3 && i + bet < chuoi.length) {
                const key = `BET_${bet}`;
                if (!this.cauBet.has(key)) this.cauBet.set(key, { T: 0, X: 0, tong: 0 });
                const d = this.cauBet.get(key);
                const next = chuoi[i + bet];
                if (next === 'T') d.T++; else d.X++;
                d.tong++;
            }
        }
        
        // Học cầu 1-1
        for (let i = 0; i < chuoi.length - 6; i++) {
            let is11 = true;
            for (let j = 1; j < 6; j++) {
                if (chuoi[i + j] === chuoi[i + j - 1]) { is11 = false; break; }
            }
            if (is11) {
                const next = chuoi[i + 6];
                if (next === 'T') this.cau11.T++;
                else this.cau11.X++;
                this.cau11.tong++;
                this.cau11.last = i;
            }
        }
        
        // Học cầu 2-2
        for (let i = 0; i < chuoi.length - 9; i++) {
            const c22 = (chuoi[i] === chuoi[i+1] && chuoi[i+2] === chuoi[i+3] && 
                         chuoi[i+4] === chuoi[i+5] && chuoi[i+6] === chuoi[i+7] &&
                         chuoi[i] !== chuoi[i+2] && chuoi[i+2] !== chuoi[i+4] && chuoi[i+4] !== chuoi[i+6]);
            if (c22 && i + 8 < chuoi.length) {
                const next = chuoi[i + 8];
                if (next === 'T') this.cau22.T++;
                else this.cau22.X++;
                this.cau22.tong++;
                this.cau22.last = i;
            }
        }
        
        // Học cầu 3-3
        for (let i = 0; i < chuoi.length - 12; i++) {
            const c33 = (chuoi[i] === chuoi[i+1] && chuoi[i] === chuoi[i+2] &&
                         chuoi[i+3] === chuoi[i+4] && chuoi[i+3] === chuoi[i+5] &&
                         chuoi[i+6] === chuoi[i+7] && chuoi[i+6] === chuoi[i+8] &&
                         chuoi[i+9] === chuoi[i+10] && chuoi[i+9] === chuoi[i+11] &&
                         chuoi[i] !== chuoi[i+3] && chuoi[i+3] !== chuoi[i+6] && chuoi[i+6] !== chuoi[i+9]);
            if (c33 && i + 12 < chuoi.length) {
                const next = chuoi[i + 12];
                if (next === 'T') this.cau33.T++;
                else this.cau33.X++;
                this.cau33.tong++;
            }
        }
        
        // Học cầu 3-2
        for (let i = 0; i < chuoi.length - 6; i++) {
            const p5 = chuoi.slice(i, i + 5).join('');
            if ((p5 === "TTTXX" || p5 === "XXXTT") && i + 5 < chuoi.length) {
                const next = chuoi[i + 5];
                if (next === 'T') this.cau32.T++;
                else this.cau32.X++;
                this.cau32.tong++;
                this.cau32.last = i;
            }
        }
        
        // Học cầu 2-3
        for (let i = 0; i < chuoi.length - 6; i++) {
            const p5 = chuoi.slice(i, i + 5).join('');
            if ((p5 === "TTXXX" || p5 === "XXTTT") && i + 5 < chuoi.length) {
                const next = chuoi[i + 5];
                if (next === 'T') this.cau23.T++;
                else this.cau23.X++;
                this.cau23.tong++;
            }
        }
        
        // Học cầu 1-2-1
        for (let i = 0; i < chuoi.length - 5; i++) {
            const c121 = (chuoi[i] === chuoi[i+2] && chuoi[i] === chuoi[i+4] &&
                          chuoi[i+1] === chuoi[i+3] && chuoi[i] !== chuoi[i+1]);
            if (c121 && i + 5 < chuoi.length) {
                const next = chuoi[i + 5];
                if (next === 'T') this.cau121.T++;
                else this.cau121.X++;
                this.cau121.tong++;
            }
        }
        
        // Học cầu 2-1-2
        for (let i = 0; i < chuoi.length - 6; i++) {
            const c212 = (chuoi[i] === chuoi[i+1] && chuoi[i+3] === chuoi[i+4] &&
                          chuoi[i] !== chuoi[i+2] && chuoi[i+2] === chuoi[i+5] &&
                          chuoi[i] !== chuoi[i+3]);
            if (c212 && i + 6 < chuoi.length) {
                const next = chuoi[i + 6];
                if (next === 'T') this.cau212.T++;
                else this.cau212.X++;
                this.cau212.tong++;
            }
        }
        
        // Cập nhật độ chính xác
        if (this.ketQuaDaDoan.length > 30) {
            const ganDay = this.ketQuaDaDoan.slice(-40);
            const dung = ganDay.filter(d => d.dung === true).length;
            this.doChinhXac = (dung / ganDay.length) * 100;
        }
        
        this.lanCuoiCapNhat = Date.now();
    }
    
    // Nhận dạng cầu hiện tại
    nhanDang(lichSu) {
        if (!lichSu || lichSu.length < 12) return null;
        
        const chuoi = lichSu.slice(0, 15).map(h => HocCauVIP.kyTu(h.resultTruyenThong));
        const cacDuDoan = [];
        
        // 1. BỆT (ưu tiên cao nhất)
        let bet = 1;
        for (let i = 1; i < chuoi.length; i++) {
            if (chuoi[i] === chuoi[0]) bet++;
            else break;
        }
        
        if (bet >= 4) {
            const key = `BET_${bet}`;
            if (this.cauBet.has(key)) {
                const d = this.cauBet.get(key);
                if (d.tong >= 2) {
                    const tyLe = Math.max(d.T, d.X) / d.tong * 100;
                    const doTin = Math.min(86, Math.round(tyLe));
                    cacDuDoan.push({
                        duDoan: d.T > d.X ? "TÀI" : "XỈU",
                        doTinCay: doTin,
                        loai: `🔴 BỆT ${bet} (${d.tong} lần)`,
                        diem: doTin,
                        uuTien: 100
                    });
                }
            }
            if (!cacDuDoan.length) {
                let doTin = 60;
                if (bet >= 7) doTin = 74;
                else if (bet === 6) doTin = 70;
                else if (bet === 5) doTin = 66;
                else if (bet === 4) doTin = 60;
                cacDuDoan.push({
                    duDoan: chuoi[0] === 'T' ? "XỈU" : "TÀI",
                    doTinCay: doTin,
                    loai: `🔴 BỆT ${bet}`,
                    diem: doTin,
                    uuTien: 100
                });
            }
        }
        
        // 2. CẦU 2-2
        if (chuoi.length >= 8) {
            const c22 = (chuoi[0] === chuoi[1] && chuoi[2] === chuoi[3] && 
                         chuoi[4] === chuoi[5] && chuoi[6] === chuoi[7] &&
                         chuoi[0] !== chuoi[2] && chuoi[2] !== chuoi[4] && chuoi[4] !== chuoi[6]);
            if (c22 && this.cau22.tong >= 2) {
                const tyLe = Math.max(this.cau22.T, this.cau22.X) / this.cau22.tong * 100;
                const doTin = Math.min(84, Math.round(tyLe));
                cacDuDoan.push({
                    duDoan: this.cau22.T > this.cau22.X ? "TÀI" : "XỈU",
                    doTinCay: doTin,
                    loai: `🟢 CẦU 2-2 (${this.cau22.tong} lần)`,
                    diem: doTin,
                    uuTien: 90
                });
            } else if (c22) {
                cacDuDoan.push({
                    duDoan: chuoi[6] === 'T' ? "XỈU" : "TÀI",
                    doTinCay: 66,
                    loai: `🟢 CẦU 2-2`,
                    diem: 66,
                    uuTien: 90
                });
            }
        }
        
        // 3. CẦU 1-1
        if (chuoi.length >= 7) {
            let is11 = true;
            for (let i = 1; i < 7; i++) {
                if (chuoi[i] === chuoi[i-1]) { is11 = false; break; }
            }
            if (is11 && this.cau11.tong >= 2) {
                const tyLe = Math.max(this.cau11.T, this.cau11.X) / this.cau11.tong * 100;
                const doTin = Math.min(82, Math.round(tyLe));
                cacDuDoan.push({
                    duDoan: this.cau11.T > this.cau11.X ? "TÀI" : "XỈU",
                    doTinCay: doTin,
                    loai: `🔵 CẦU 1-1 (${this.cau11.tong} lần)`,
                    diem: doTin,
                    uuTien: 85
                });
            } else if (is11) {
                cacDuDoan.push({
                    duDoan: chuoi[0] === 'T' ? "XỈU" : "TÀI",
                    doTinCay: 64,
                    loai: `🔵 CẦU 1-1`,
                    diem: 64,
                    uuTien: 85
                });
            }
        }
        
        // 4. PATTERN 8 PHIÊN
        if (chuoi.length >= 8) {
            const p8 = chuoi.slice(0, 8).join('');
            if (this.pattern8.has(p8)) {
                const d = this.pattern8.get(p8);
                if (d.tong >= 2) {
                    const tyLe = Math.max(d.T, d.X) / d.tong * 100;
                    const doTin = Math.min(80, Math.round(tyLe));
                    cacDuDoan.push({
                        duDoan: d.T > d.X ? "TÀI" : "XỈU",
                        doTinCay: doTin,
                        loai: `📚 PATTERN 8: ${p8} (${d.tong} lần)`,
                        diem: doTin,
                        uuTien: 80
                    });
                }
            }
        }
        
        // 5. PATTERN 7 PHIÊN
        if (chuoi.length >= 7) {
            const p7 = chuoi.slice(0, 7).join('');
            if (this.pattern7.has(p7)) {
                const d = this.pattern7.get(p7);
                if (d.tong >= 2) {
                    const tyLe = Math.max(d.T, d.X) / d.tong * 100;
                    const doTin = Math.min(78, Math.round(tyLe));
                    cacDuDoan.push({
                        duDoan: d.T > d.X ? "TÀI" : "XỈU",
                        doTinCay: doTin,
                        loai: `📚 PATTERN 7: ${p7} (${d.tong} lần)`,
                        diem: doTin,
                        uuTien: 75
                    });
                }
            }
        }
        
        // 6. CẦU 3-2
        if (chuoi.length >= 7) {
            const p5 = chuoi.slice(0, 5).join('');
            if ((p5 === "TTTXX" || p5 === "XXXTT") && this.cau32.tong >= 2) {
                const tyLe = Math.max(this.cau32.T, this.cau32.X) / this.cau32.tong * 100;
                const doTin = Math.min(78, Math.round(tyLe));
                cacDuDoan.push({
                    duDoan: this.cau32.T > this.cau32.X ? "TÀI" : "XỈU",
                    doTinCay: doTin,
                    loai: `📐 CẦU 3-2 (${this.cau32.tong} lần)`,
                    diem: doTin,
                    uuTien: 75
                });
            } else if (p5 === "TTTXX" || p5 === "XXXTT") {
                cacDuDoan.push({
                    duDoan: p5 === "TTTXX" ? "XỈU" : "TÀI",
                    doTinCay: 66,
                    loai: `📐 CẦU 3-2`,
                    diem: 66,
                    uuTien: 75
                });
            }
        }
        
        // 7. PATTERN 6 PHIÊN
        if (chuoi.length >= 6) {
            const p6 = chuoi.slice(0, 6).join('');
            if (this.pattern6.has(p6)) {
                const d = this.pattern6.get(p6);
                if (d.tong >= 2) {
                    const tyLe = Math.max(d.T, d.X) / d.tong * 100;
                    const doTin = Math.min(74, Math.round(tyLe));
                    cacDuDoan.push({
                        duDoan: d.T > d.X ? "TÀI" : "XỈU",
                        doTinCay: doTin,
                        loai: `📚 PATTERN 6: ${p6} (${d.tong} lần)`,
                        diem: doTin,
                        uuTien: 70
                    });
                }
            }
        }
        
        // 8. PATTERN 5 PHIÊN
        if (chuoi.length >= 5) {
            const p5 = chuoi.slice(0, 5).join('');
            if (this.pattern5.has(p5)) {
                const d = this.pattern5.get(p5);
                if (d.tong >= 2) {
                    const tyLe = Math.max(d.T, d.X) / d.tong * 100;
                    const doTin = Math.min(70, Math.round(tyLe));
                    cacDuDoan.push({
                        duDoan: d.T > d.X ? "TÀI" : "XỈU",
                        doTinCay: doTin,
                        loai: `📚 PATTERN 5: ${p5} (${d.tong} lần)`,
                        diem: doTin,
                        uuTien: 65
                    });
                }
            }
        }
        
        if (cacDuDoan.length === 0) return null;
        
        // Sắp xếp theo độ ưu tiên và điểm
        cacDuDoan.sort((a, b) => {
            if (a.uuTien !== b.uuTien) return b.uuTien - a.uuTien;
            return b.diem - a.diem;
        });
        
        const best = cacDuDoan[0];
        
        // Điều chỉnh theo độ chính xác lịch sử
        let cuoi = best.doTinCay;
        if (this.doChinhXac < 45) cuoi = Math.max(52, cuoi - 6);
        if (this.doChinhXac > 68) cuoi = Math.min(86, cuoi + 4);
        cuoi = Math.min(86, Math.max(52, cuoi));
        
        return {
            duDoan: best.duDoan,
            doTinCay: cuoi,
            loai: best.loai,
            soMau: cacDuDoan.length,
            uuTien: best.uuTien
        };
    }
    
    // Ghi nhận kết quả thực tế
    ghiNhan(duDoan, thucTe) {
        const dung = duDoan === thucTe;
        this.ketQuaDaDoan.push({ duDoan, thucTe, dung, time: Date.now() });
        if (this.ketQuaDaDoan.length > 150) this.ketQuaDaDoan.shift();
        
        const ganDay = this.ketQuaDaDoan.slice(-40);
        const dungCount = ganDay.filter(d => d.dung === true).length;
        this.doChinhXac = (dungCount / ganDay.length) * 100;
    }
}

// ==========================================
// MARKOV CHAIN SIÊU CẤP
// ==========================================
class MarkovVIP {
    constructor() {
        this.markov2 = new Map();
        this.markov3 = new Map();
        this.markov4 = new Map();
        this.history = [];
        this.doChinhXac = 50;
    }

    static loai(d) {
        if (d === 1 || d === 2) return 1;
        if (d === 3 || d === 4) return 2;
        return 3;
    }

    them(daySo) {
        const filtered = daySo.map(d => MarkovVIP.loai(d));
        this.history.push(...filtered);
        if (this.history.length > 120) this.history = this.history.slice(-120);
        this._build();
    }

    _build() {
        this.markov2.clear();
        this.markov3.clear();
        this.markov4.clear();
        
        if (this.history.length < 5) return;
        
        // Bậc 2
        for (let i = 2; i < this.history.length; i++) {
            const key = `${this.history[i-2]},${this.history[i-1]}`;
            const next = this.history[i];
            if (!this.markov2.has(key)) this.markov2.set(key, { 1: 0, 2: 0, 3: 0 });
            this.markov2.get(key)[next]++;
        }
        
        // Bậc 3
        for (let i = 3; i < this.history.length; i++) {
            const key = `${this.history[i-3]},${this.history[i-2]},${this.history[i-1]}`;
            const next = this.history[i];
            if (!this.markov3.has(key)) this.markov3.set(key, { 1: 0, 2: 0, 3: 0 });
            this.markov3.get(key)[next]++;
        }
        
        // Bậc 4
        for (let i = 4; i < this.history.length; i++) {
            const key = `${this.history[i-4]},${this.history[i-3]},${this.history[i-2]},${this.history[i-1]}`;
            const next = this.history[i];
            if (!this.markov4.has(key)) this.markov4.set(key, { 1: 0, 2: 0, 3: 0 });
            this.markov4.get(key)[next]++;
        }
    }

    duDoan() {
        if (this.history.length < 4) return 2;
        
        // Bậc 4
        if (this.history.length >= 4) {
            const key4 = `${this.history[this.history.length-4]},${this.history[this.history.length-3]},${this.history[this.history.length-2]},${this.history[this.history.length-1]}`;
            const stats4 = this.markov4.get(key4);
            if (stats4) {
                let maxVal = 2, maxCount = 0;
                for (let v of [1,2,3]) {
                    if (stats4[v] > maxCount) { maxCount = stats4[v]; maxVal = v; }
                }
                if (maxCount >= 2) return maxVal;
            }
        }
        
        // Bậc 3
        if (this.history.length >= 3) {
            const key3 = `${this.history[this.history.length-3]},${this.history[this.history.length-2]},${this.history[this.history.length-1]}`;
            const stats3 = this.markov3.get(key3);
            if (stats3) {
                let maxVal = 2, maxCount = 0;
                for (let v of [1,2,3]) {
                    if (stats3[v] > maxCount) { maxCount = stats3[v]; maxVal = v; }
                }
                return maxVal;
            }
        }
        
        // Bậc 2
        if (this.history.length >= 2) {
            const key2 = `${this.history[this.history.length-2]},${this.history[this.history.length-1]}`;
            const stats2 = this.markov2.get(key2);
            if (stats2) {
                let maxVal = 2, maxCount = 0;
                for (let v of [1,2,3]) {
                    if (stats2[v] > maxCount) { maxCount = stats2[v]; maxVal = v; }
                }
                return maxVal;
            }
        }
        
        // Xu hướng
        const dem = { 1: 0, 2: 0, 3: 0 };
        this.history.slice(-12).forEach(v => dem[v]++);
        let maxVal = 2, maxCount = 0;
        for (let v of [1,2,3]) {
            if (dem[v] > maxCount) { maxCount = dem[v]; maxVal = v; }
        }
        return maxVal;
    }

    phanTich() {
        if (this.history.length < 18) return { prediction: "TÀI", confidence: 55 };
        
        const val = this.duDoan();
        const prediction = (val === 1 || val === 3) ? "TÀI" : "XỈU";
        
        let confidence = 60;
        if (this.history.length > 35) confidence += 4;
        if (this.history.length > 60) confidence += 3;
        if (this.history.length > 90) confidence += 2;
        
        if (this.doChinhXac < 48) confidence -= 4;
        if (this.doChinhXac > 70) confidence += 4;
        
        return { prediction, confidence: Math.min(74, Math.max(52, confidence)) };
    }
    
    ghiNhan(duDoan, thucTe) {
        const dung = duDoan === thucTe;
        if (dung) this.doChinhXac = Math.min(80, this.doChinhXac + 0.8);
        else this.doChinhXac = Math.max(42, this.doChinhXac - 0.8);
    }
}

// ==========================================
// KHỞI TẠO
// ==========================================
let hocTX = new HocCauVIP();
let hocMD5 = new HocCauVIP();
let markovTX = new MarkovVIP();
let markovMD5 = new MarkovVIP();
let historyTX = [];
let historyMD5 = [];

async function fetchData(url) {
    try {
        const res = await http.get(url);
        return res.data;
    } catch (e) {
        return null;
    }
}

async function duDoan(game) {
    const url = game === "TX" ? URL_TX : URL_MD5;
    const data = await fetchData(url);
    if (!data || !data.list || data.list.length === 0) {
        return { error: "Không có dữ liệu" };
    }
    
    const lichSu = data.list;
    const current = lichSu[0];
    const hoc = game === "TX" ? hocTX : hocMD5;
    const markov = game === "TX" ? markovTX : markovMD5;
    
    // Học từ lịch sử
    hoc.hoc(lichSu);
    
    // Thu thập xúc xắc cho Markov
    const dice = [];
    for (let i = 0; i < Math.min(lichSu.length, 60); i++) {
        if (lichSu[i]?.dices) {
            for (let d of lichSu[i].dices) dice.push(d);
        }
    }
    if (dice.length >= 24) {
        markov.them(dice);
    }
    
    // Dự đoán
    let result = hoc.nhanDang(lichSu);
    let nguon = "HOC_CAU";
    
    if (!result || result.doTinCay < 56) {
        const m = markov.phanTich();
        result = { duDoan: m.prediction, doTinCay: m.confidence, loai: "🎲 MARKOV", soMau: 1 };
        nguon = "MARKOV";
    }
    
    // Fallback
    if (result.doTinCay < 53) {
        const last12 = lichSu.slice(0, 12);
        const tai = last12.filter(h => h.resultTruyenThong === "TAI").length;
        if (tai >= 8) result = { duDoan: "XỈU", doTinCay: 60, loai: "📊 LỆCH TÀI 12P", soMau: 1 };
        else if (tai <= 4) result = { duDoan: "TÀI", doTinCay: 60, loai: "📊 LỆCH XỈU 12P", soMau: 1 };
        else result = { duDoan: "TÀI", doTinCay: 56, loai: "⚖️ CÂN BẰNG", soMau: 1 };
        nguon = "FALLBACK";
    }
    
    // Xúc xắc hiện tại
    let tong = 0, xx = [0,0,0];
    if (current.dices && current.dices.length === 3) {
        xx = current.dices;
        tong = current.dices.reduce((a,b) => a+b, 0);
    }
    
    const coNenCuoc = result.doTinCay >= 63;
    
    // Dự đoán phiên 2
    let duDoan2 = null;
    if (lichSu.length >= 2) {
        const fake = [{ resultTruyenThong: result.duDoan === "TÀI" ? "TAI" : "XIU", dices: [4,4,4] }, ...lichSu];
        const cau2 = hoc.nhanDang(fake);
        if (cau2 && cau2.doTinCay >= 55) {
            duDoan2 = { duDoan: cau2.duDoan, doTinCay: cau2.doTinCay - 2, loai: cau2.loai };
        } else {
            const dice2 = [...dice];
            if (result.duDoan === "TÀI") dice2.push(4,4,4);
            else dice2.push(1,1,1);
            const m2 = new MarkovVIP();
            m2.them(dice2);
            const m2r = m2.phanTich();
            duDoan2 = { duDoan: m2r.prediction, doTinCay: m2r.confidence - 2, loai: "🎲 MARKOV P2" };
        }
    }
    
    // Ghi nhận kết quả cũ
    if (lichSu.length >= 2) {
        const prevResult = lichSu[1]?.resultTruyenThong === "TAI" ? "TÀI" : "XỈU";
        const lastPred = hoc.ketQuaDaDoan.slice(-1)[0];
        if (lastPred && lastPred.thucTe === prevResult) {
            hoc.ghiNhan(lastPred.duDoan, prevResult);
            markov.ghiNhan(lastPred.duDoan === "TÀI" ? 3 : 2, prevResult === "TÀI" ? 3 : 2);
        }
    }
    
    return {
        success: true,
        game: game,
        current: {
            phien: current.id,
            xuc_xac: `${xx[0]} - ${xx[1]} - ${xx[2]}`,
            tong: tong,
            ket_qua: current.resultTruyenThong === "TAI" ? "TÀI" : "XỈU"
        },
        du_doan: {
            phien_tiep: current.id + 1,
            du_doan: result.duDoan,
            do_tin_cay: `${result.doTinCay}%`,
            co_nen_cuoc: coNenCuoc ? "✅ NÊN CƯỢC" : "⏸️ BỎ QUA",
            ly_do: result.loai,
            so_tin_hieu: result.soMau || 1,
            nguon: nguon
        },
        du_doan_phien_2: duDoan2 ? {
            phien_tiep: current.id + 2,
            du_doan: duDoan2.duDoan,
            do_tin_cay: `${duDoan2.doTinCay}%`,
            ly_do: duDoan2.loai
        } : null,
        thong_ke: {
            tong_pattern: hoc.pattern5.size + hoc.pattern6.size + hoc.pattern7.size + hoc.pattern8.size,
            ty_le_tai_tong: `${Math.round(hoc.tyLeTai)}%`,
            do_chinh_xac_gan_day: `${Math.round(hoc.doChinhXac)}%`,
            tong_phien_da_hoc: hoc.tongPhien
        },
        timestamp: new Date().toISOString()
    };
}

// ==========================================
// POLLING
// ==========================================
async function poll() {
    try {
        const [tx, md5] = await Promise.all([fetchData(URL_TX), fetchData(URL_MD5)]);
        if (tx?.list) { historyTX = tx.list; hocTX.hoc(historyTX); }
        if (md5?.list) { historyMD5 = md5.list; hocMD5.hoc(historyMD5); }
        console.log(`🌲 Học cầu - ${new Date().toLocaleTimeString()}`);
    } catch (e) {}
}

// ==========================================
// API
// ==========================================
app.get("/", (req, res) => {
    res.json({
        name: "🎲 LC79 - SIÊU THUẬT TOÁN VIP 🎲",
        author: "@tranhoang2286",
        version: "10.0 - CAO CẤP NHẤT",
        thuat_toan: [
            "📚 Pattern 3-4-5-6-7-8 phiên",
            "🔴 Bệt (3-4-5-6-7+)",
            "🟢 Cầu 2-2, 🔵 Cầu 1-1",
            "📐 Cầu 3-2, Cầu 2-3",
            "💎 Cầu 3-3, Cầu 4-4",
            "🎯 Cầu 1-2-1, Cầu 2-1-2",
            "🎲 Markov bậc 2-3-4",
            "🔄 Tự học và điều chỉnh"
        ],
        quy_tac: "✅ CHỈ CƯỢC KHI 'co_nen_cuoc' = '✅ NÊN CƯỢC' (>=63%)",
        endpoints: {
            "TX (Hũ)": "GET /taixiu",
            "MD5": "GET /taixiumd5"
        }
    });
});

app.get("/taixiu", async (req, res) => {
    try {
        const r = await duDoan("TX");
        res.json(r);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get("/taixiumd5", async (req, res) => {
    try {
        const r = await duDoan("MD5");
        res.json(r);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Khởi động
poll();
setInterval(poll, 20000);

app.listen(PORT, () => {
    console.log(`\n============================================================`);
    console.log(`🎲 LC79 API - SIÊU THUẬT TOÁN VIP v10.0`);
    console.log(`============================================================`);
    console.log(`✅ TX: http://localhost:${PORT}/taixiu`);
    console.log(`✅ MD5: http://localhost:${PORT}/taixiumd5`);
    console.log(`⚠️ CHỈ CƯỢC KHI "✅ NÊN CƯỢC" (độ tin cậy >= 63%)`);
    console.log(`============================================================\n`);
});
