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
// ========== PHẦN 1: CÁC HÀM TIỆN ÍCH CƠ BẢN ==========
// ============================================================

// Hàm lấy kết quả đối lập (Tài -> Xỉu, Xỉu -> Tài)
function opp(cuu) {
    if (cuu === "TAI") return "XIU";
    if (cuu === "XIU") return "TAI";
    return "TAI";
}

// Hàm chuyển đổi TAI/XIU thành T/X cho dễ nhìn
function toSymbol(kq) {
    return kq === "TAI" ? "T" : "X";
}

// Hàm chuyển đổi ngược lại
function fromSymbol(sym) {
    return sym === "T" ? "TAI" : "XIU";
}

// Hàm tính tỷ lệ phần trăm
function tyLePhanTram(so, tong) {
    if (tong === 0) return 0;
    return Math.round((so / tong) * 100);
}

// ============================================================
// ========== PHẦN 2: PHÂN TÍCH CHUỖI CƠ BẢN ==========
// ============================================================

// 2.1 Lấy độ dài chuỗi bệt từ cuối lên
function get_streak(res) {
    if (!res || res.length === 0) return [0, null];
    let streak = 1;
    const lastValue = res[res.length - 1];
    for (let i = res.length - 2; i >= 0; i--) {
        if (res[i] === lastValue) streak++;
        else break;
    }
    return [streak, lastValue];
}

// 2.2 Lấy độ dài chuỗi bệt từ đầu xuống
function get_streak_from_start(res) {
    if (!res || res.length === 0) return [0, null];
    let streak = 1;
    const firstValue = res[0];
    for (let i = 1; i < res.length; i++) {
        if (res[i] === firstValue) streak++;
        else break;
    }
    return [streak, firstValue];
}

// 2.3 Lấy chuỗi bệt dài nhất trong lịch sử
function get_max_streak(res) {
    if (!res || res.length === 0) return 0;
    let maxStreak = 1;
    let currentStreak = 1;
    for (let i = 1; i < res.length; i++) {
        if (res[i] === res[i-1]) {
            currentStreak++;
            maxStreak = Math.max(maxStreak, currentStreak);
        } else {
            currentStreak = 1;
        }
    }
    return maxStreak;
}

// ============================================================
// ========== PHẦN 3: PHÁT HIỆN CÁC LOẠI CẦU ==========
// ============================================================

// 3.1 PHÁT HIỆN CẦU BỆT (CHUỖI LIÊN TIẾP)
function phatHienCauBet(res) {
    const [streak, cur] = get_streak(res);
    
    if (streak >= 7) {
        return {
            coCau: true,
            loaiCau: "BỆT SIÊU DÀI",
            capDo: 1,
            doDai: streak,
            giaTriHienTai: cur,
            duDoan: opp(cur),
            doTinCay: 85,
            giaiThich: `Phát hiện chuỗi ${streak} phiên ${cur === "TAI" ? "TÀI" : "XỈU"} liên tiếp. Đây là bệt rất dài, xác suất đảo cầu cực cao.`,
            khuyenNghi: "ĐẢO CẦU - CƯỢC CỬA NGƯỢC LẠI"
        };
    }
    
    if (streak >= 5) {
        return {
            coCau: true,
            loaiCau: "BỆT DÀI",
            capDo: 2,
            doDai: streak,
            giaTriHienTai: cur,
            duDoan: opp(cur),
            doTinCay: 78,
            giaiThich: `Phát hiện chuỗi ${streak} phiên ${cur === "TAI" ? "TÀI" : "XỈU"} liên tiếp. Bệt khá dài, khả năng đảo cầu cao.`,
            khuyenNghi: "ĐẢO CẦU - CƯỢC CỬA NGƯỢC LẠI"
        };
    }
    
    if (streak >= 4) {
        return {
            coCau: true,
            loaiCau: "BỆT TRUNG BÌNH",
            capDo: 3,
            doDai: streak,
            giaTriHienTai: cur,
            duDoan: opp(cur),
            doTinCay: 68,
            giaiThich: `Phát hiện chuỗi ${streak} phiên ${cur === "TAI" ? "TÀI" : "XỈU"} liên tiếp. Bệt trung bình, có thể đảo cầu.`,
            khuyenNghi: "CÓ THỂ ĐẢO - CÂN NHẮC CƯỢC CỬA NGƯỢC"
        };
    }
    
    if (streak >= 3) {
        return {
            coCau: true,
            loaiCau: "BỆT NGẮN",
            capDo: 4,
            doDai: streak,
            giaTriHienTai: cur,
            duDoan: cur,
            doTinCay: 58,
            giaiThich: `Phát hiện chuỗi ${streak} phiên ${cur === "TAI" ? "TÀI" : "XỈU"} liên tiếp. Bệt ngắn, có thể theo tiếp hoặc đảo.`,
            khuyenNghi: "THEO CẦU - CƯỢC THEO XU HƯỚNG HIỆN TẠI"
        };
    }
    
    return { coCau: false };
}

// 3.2 PHÁT HIỆN CẦU 1-1 (TÀI XỈU ĐAN XEN)
function phatHienCau11(res) {
    if (res.length < 6) return { coCau: false };
    
    let doDai = 1;
    let isCau11 = true;
    
    for (let i = 1; i < Math.min(res.length, 15); i++) {
        if (res[i] === res[i-1]) {
            isCau11 = false;
            break;
        }
        doDai = i + 1;
    }
    
    if (!isCau11 || doDai < 5) return { coCau: false };
    
    const duDoan = opp(res[0]);
    let doTinCay = 0;
    let khuyenNghi = "";
    
    if (doDai >= 10) {
        doTinCay = 86;
        khuyenNghi = "CẦU 1-1 RẤT DÀI - THEO CẦU MẠNH";
    } else if (doDai >= 8) {
        doTinCay = 82;
        khuyenNghi = "CẦU 1-1 DÀI - THEO CẦU";
    } else if (doDai >= 6) {
        doTinCay = 76;
        khuyenNghi = "CẦU 1-1 ĐANG CHẠY - THEO CẦU";
    } else {
        doTinCay = 68;
        khuyenNghi = "CẦU 1-1 MỚI HÌNH THÀNH - THEO NHẸ";
    }
    
    return {
        coCau: true,
        loaiCau: "CẦU 1-1",
        capDo: 5,
        doDai: doDai,
        duDoan: duDoan,
        doTinCay: doTinCay,
        giaiThich: `Phát hiện cầu đan xen Tài-Xỉu kéo dài ${doDai} phiên: ${res.slice(0, doDai).map(r => r === "TAI" ? "T" : "X").join('-')}. Cầu đang chạy ổn định.`,
        khuyenNghi: khuyenNghi
    };
}

// 3.3 PHÁT HIỆN CẦU 2-2 (CẶP ĐÔI)
function phatHienCau22(res) {
    if (res.length < 8) return { coCau: false };
    
    let soCap = 0;
    let isCau22 = true;
    
    for (let i = 0; i < Math.min(res.length, 16); i += 2) {
        if (i + 1 >= res.length) break;
        if (res[i] !== res[i+1]) {
            isCau22 = false;
            break;
        }
        if (i + 2 < res.length && res[i] === res[i+2]) {
            isCau22 = false;
            break;
        }
        soCap++;
    }
    
    if (!isCau22 || soCap < 3) return { coCau: false };
    
    const duDoan = opp(res[soCap * 2 - 2]);
    let doTinCay = 0;
    
    if (soCap >= 5) {
        doTinCay = 88;
    } else if (soCap >= 4) {
        doTinCay = 84;
    } else {
        doTinCay = 76;
    }
    
    return {
        coCau: true,
        loaiCau: "CẦU 2-2",
        capDo: 6,
        doDai: soCap * 2,
        soCap: soCap,
        duDoan: duDoan,
        doTinCay: doTinCay,
        giaiThich: `Phát hiện cầu ${soCap} cặp đôi: ${res.slice(0, soCap*2).map(r => r === "TAI" ? "T" : "X").join('')}. Mô hình TT-XX-TT-XX... đang lặp lại.`,
        khuyenNghi: "BẺ CẦU - CƯỢC CỬA NGƯỢC VỚI CẶP CUỐI"
    };
}

// 3.4 PHÁT HIỆN CẦU 3-2 (3 TÀI 2 XỈU HOẶC 3 XỈU 2 TÀI)
function phatHienCau32(res) {
    if (res.length < 10) return { coCau: false };
    
    const p5 = res.slice(0, 5);
    const p5Str = p5.map(r => r === "TAI" ? "T" : "X").join('');
    
    if (p5Str === "TTTXX") {
        return {
            coCau: true,
            loaiCau: "CẦU 3-2",
            capDo: 7,
            doDai: 5,
            pattern: "3T-2X",
            duDoan: "XIU",
            doTinCay: 80,
            giaiThich: "Phát hiện cầu 3 Tài - 2 Xỉu (TTTXX). Theo quy luật, nhịp tiếp theo sẽ là Xỉu.",
            khuyenNghi: "THEO CẦU - CƯỢC XỈU"
        };
    }
    
    if (p5Str === "XXXTT") {
        return {
            coCau: true,
            loaiCau: "CẦU 3-2",
            capDo: 7,
            doDai: 5,
            pattern: "3X-2T",
            duDoan: "TAI",
            doTinCay: 80,
            giaiThich: "Phát hiện cầu 3 Xỉu - 2 Tài (XXXTT). Theo quy luật, nhịp tiếp theo sẽ là Tài.",
            khuyenNghi: "THEO CẦU - CƯỢC TÀI"
        };
    }
    
    return { coCau: false };
}

// 3.5 PHÁT HIỆN CẦU 3-3 (3 TÀI 3 XỈU)
function phatHienCau33(res) {
    if (res.length < 12) return { coCau: false };
    
    const p6 = res.slice(0, 6);
    const p6Str = p6.map(r => r === "TAI" ? "T" : "X").join('');
    
    if (p6Str === "TTTXXX" || p6Str === "XXXTTT") {
        const duDoan = p6Str === "TTTXXX" ? "TAI" : "XIU";
        return {
            coCau: true,
            loaiCau: "CẦU 3-3",
            capDo: 8,
            doDai: 6,
            pattern: p6Str === "TTTXXX" ? "3T-3X" : "3X-3T",
            duDoan: duDoan,
            doTinCay: 84,
            giaiThich: `Phát hiện cầu ${p6Str === "TTTXXX" ? "3 Tài - 3 Xỉu" : "3 Xỉu - 3 Tài"} (${p6Str}). Cầu đang chạy theo chu kỳ.`,
            khuyenNghi: "THEO CẦU - CƯỢC THEO QUY LUẬT"
        };
    }
    
    return { coCau: false };
}

// 3.6 PHÁT HIỆN CẦU 1-2-1 (TÀI - XỈU XỈU - TÀI)
function phatHienCau121(res) {
    if (res.length < 6) return { coCau: false };
    
    const p5 = res.slice(0, 5);
    if (p5[0] === p5[2] && p5[0] === p5[4] && p5[1] === p5[3] && p5[0] !== p5[1]) {
        const duDoan = opp(p5[0]);
        return {
            coCau: true,
            loaiCau: "CẦU 1-2-1",
            capDo: 9,
            doDai: 5,
            pattern: p5[0] === "TAI" ? "T-X-X-T" : "X-T-T-X",
            duDoan: duDoan,
            doTinCay: 76,
            giaiThich: `Phát hiện cầu 1-2-1: ${p5[0] === "TAI" ? "Tài - Xỉu - Xỉu - Tài" : "Xỉu - Tài - Tài - Xỉu"}. Cầu đối xứng, dự đoán bẻ.`,
            khuyenNghi: "BẺ CẦU - CƯỢC CỬA NGƯỢC"
        };
    }
    
    return { coCau: false };
}

// 3.7 PHÁT HIỆN CẦU 2-1-2 (TÀI TÀI - XỈU - TÀI TÀI)
function phatHienCau212(res) {
    if (res.length < 7) return { coCau: false };
    
    const p6 = res.slice(0, 6);
    if (p6[0] === p6[1] && p6[3] === p6[4] && p6[0] !== p6[2] && p6[2] === p6[5] && p6[0] !== p6[3]) {
        const duDoan = opp(p6[3]);
        return {
            coCau: true,
            loaiCau: "CẦU 2-1-2",
            capDo: 10,
            doDai: 6,
            pattern: p6[0] === "TAI" ? "TT-X-TT" : "XX-T-XX",
            duDoan: duDoan,
            doTinCay: 78,
            giaiThich: `Phát hiện cầu 2-1-2: ${p6[0] === "TAI" ? "Tài Tài - Xỉu - Tài Tài" : "Xỉu Xỉu - Tài - Xỉu Xỉu"}. Cầu đối xứng.`,
            khuyenNghi: "BẺ CẦU - CƯỢC CỬA NGƯỢC"
        };
    }
    
    return { coCau: false };
}

// 3.8 PHÁT HIỆN CẦU CHỮ A (TÀI - XỈU - TÀI - XỈU - XỈU - TÀI)
function phatHienCauChuA(res) {
    if (res.length < 8) return { coCau: false };
    
    const p7 = res.slice(0, 7);
    if (p7[0] === p7[2] && p7[0] === p7[4] && p7[0] === p7[6] && 
        p7[1] === p7[3] && p7[1] === p7[5] && p7[0] !== p7[1]) {
        const duDoan = opp(p7[0]);
        return {
            coCau: true,
            loaiCau: "CẦU CHỮ A",
            capDo: 11,
            doDai: 7,
            duDoan: duDoan,
            doTinCay: 80,
            giaiThich: "Phát hiện cầu chữ A: T-X-T-X-X-T (hoặc X-T-X-T-T-X). Cầu đối xứng phức tạp.",
            khuyenNghi: "BẺ CẦU - CƯỢC CỬA NGƯỢC"
        };
    }
    
    return { coCau: false };
}

// 3.9 PHÁT HIỆN CHU KỲ LẶP LẠI
function phatHienChuKy(res) {
    if (res.length < 20) return { coCau: false };
    
    const chuoi = res.map(r => r === "TAI" ? "T" : "X").join('');
    
    for (let doDai = 2; doDai <= 7; doDai++) {
        let giongNhau = true;
        for (let i = 0; i < chuoi.length - doDai; i++) {
            if (chuoi[i] !== chuoi[i + doDai]) {
                giongNhau = false;
                break;
            }
        }
        if (giongNhau && chuoi.length >= doDai * 2) {
            const viTri = chuoi.length % doDai;
            const duDoan = chuoi[viTri] === "T" ? "TAI" : "XIU";
            return {
                coCau: true,
                loaiCau: "CHU KỲ LẶP LẠI",
                capDo: 12,
                doDai: doDai,
                duDoan: duDoan,
                doTinCay: 74,
                giaiThich: `Phát hiện chu kỳ lặp lại mỗi ${doDai} phiên. Dãy mẫu: ${chuoi.slice(0, doDai*2)}`,
                khuyenNghi: `THEO CHU KỲ - CƯỢC THEO QUY LUẬT ${doDai} PHIÊN`
            };
        }
    }
    
    return { coCau: false };
}

// ============================================================
// ========== PHẦN 4: PHÂN TÍCH THỐNG KÊ ==========
// ============================================================

// 4.1 PHÂN TÍCH TẦN SUẤT (DÀI HẠN)
function analyze_freq(res, w = 20) {
    const r = res.length >= w ? res.slice(-w) : res;
    if (r.length === 0) return ["TAI", 50, `Không đủ dữ liệu (${r.length}/${w})`];
    
    const tai = r.filter(k => k === "TAI").length;
    const xiu = r.length - tai;
    const tyLeTai = (tai / r.length) * 100;
    
    if (tyLeTai >= 70) {
        return ["XIU", 65, `${w} phiên: ${tai}T - ${xiu}X (${Math.round(tyLeTai)}% Tài) - Lệch Tài quá lớn, bắt Xỉu`];
    }
    if (tyLeTai <= 30) {
        return ["TAI", 65, `${w} phiên: ${tai}T - ${xiu}X (${Math.round(100-tyLeTai)}% Xỉu) - Lệch Xỉu quá lớn, bắt Tài`];
    }
    if (tyLeTai >= 60) {
        return ["XIU", 58, `${w} phiên: ${tai}T - ${xiu}X (${Math.round(tyLeTai)}% Tài) - Hơi lệch Tài, ưu tiên Xỉu`];
    }
    if (tyLeTai <= 40) {
        return ["TAI", 58, `${w} phiên: ${tai}T - ${xiu}X (${Math.round(100-tyLeTai)}% Xỉu) - Hơi lệch Xỉu, ưu tiên Tài`];
    }
    
    return [res[res.length - 1], 52, `${w} phiên: ${tai}T - ${xiu}X (${Math.round(tyLeTai)}% Tài) - Cân bằng, theo phiên cuối`];
}

// 4.2 PHÂN TÍCH XU HƯỚNG NGẮN HẠN
function analyze_trend(res, w = 5) {
    const r = res.length >= w ? res.slice(-w) : res;
    if (r.length === 0) return ["TAI", 50, `Không đủ dữ liệu (${r.length}/${w})`];
    
    const tai = r.filter(k => k === "TAI").length;
    const xiu = r.length - tai;
    const chenhLech = Math.abs(tai - xiu);
    
    if (tai > xiu) {
        const doTin = Math.min(74, 54 + chenhLech * 5);
        return ["TAI", doTin, `${w} phiên gần nhất: ${tai}T - ${xiu}X, nghiêng Tài (+${chenhLech})`];
    }
    if (xiu > tai) {
        const doTin = Math.min(74, 54 + chenhLech * 5);
        return ["XIU", doTin, `${w} phiên gần nhất: ${tai}T - ${xiu}X, nghiêng Xỉu (+${chenhLech})`];
    }
    
    return [res[res.length - 1], 52, `${w} phiên gần nhất: ${tai}T - ${xiu}X, cân bằng`];
}

// 4.3 PHÂN TÍCH LỆCH PHA (CHÊNH LỆCH TÀI XỈU)
function phanTichLechPha(res, khung = 15) {
    if (res.length < khung) return { coLech: false };
    
    const ganDay = res.slice(0, khung);
    const tai = ganDay.filter(k => k === "TAI").length;
    const xiu = khung - tai;
    const chenhLech = Math.abs(tai - xiu);
    
    if (chenhLech < 4) return { coLech: false };
    
    let doTinCay = 0;
    let khuyenNghi = "";
    
    if (chenhLech >= 8) {
        doTinCay = 86;
        khuyenNghi = "LỆCH CỰC ĐẠI - BẮT CỬA THIẾU RẤT MẠNH";
    } else if (chenhLech >= 6) {
        doTinCay = 80;
        khuyenNghi = "LỆCH LỚN - BẮT CỬA THIẾU MẠNH";
    } else {
        doTinCay = 70;
        khuyenNghi = "LỆCH VỪA - CÓ THỂ BẮT CỬA THIẾU";
    }
    
    const duDoan = tai > xiu ? "XIU" : "TAI";
    
    return {
        coLech: true,
        duDoan: duDoan,
        doTinCay: doTinCay,
        tai: tai,
        xiu: xiu,
        chenhLech: chenhLech,
        khuyenNghi: khuyenNghi,
        giaiThich: `${khung} phiên gần nhất: ${tai} Tài - ${xiu} Xỉu, chênh lệch ${chenhLech}. Xu hướng đang lệch, khả năng cân bằng cao.`
    };
}

// ============================================================
// ========== PHẦN 5: PHÂN TÍCH PATTERN (HỌC TỪ LỊCH SỬ) ==========
// ============================================================

// 5.1 SO KHỚP PATTERN 6 PHIÊN
function match_pattern_6(res) {
    const n = res.length;
    if (n < 8) return [null, 50, null];
    
    const pattern = res.slice(-6);
    const patternStr = pattern.map(r => r === "TAI" ? "T" : "X").join('');
    const cnt = { TAI: 0, XIU: 0 };
    const viTriTimThay = [];
    
    for (let i = 0; i <= n - 7; i++) {
        const match = res.slice(i, i + 6).every((v, idx) => v === pattern[idx]);
        if (match) {
            cnt[res[i + 6]]++;
            viTriTimThay.push(i);
        }
    }
    
    const total = cnt.TAI + cnt.XIU;
    if (total === 0) return [null, 50, null];
    
    const best = cnt.TAI >= cnt.XIU ? "TAI" : "XIU";
    const ratio = cnt[best] / total;
    const doTin = Math.min(92, 52 + Math.floor(ratio * 44));
    
    return [best, doTin, {
        pattern: patternStr,
        soLanXuatHien: total,
        tyLe: `${Math.round(ratio * 100)}%`,
        viTri: viTriTimThay
    }];
}

// 5.2 SO KHỚP PATTERN 3 PHIÊN
function match_pattern_3(res) {
    const n = res.length;
    if (n < 5) return [null, 50, null];
    
    const pattern = res.slice(-3);
    const patternStr = pattern.map(r => r === "TAI" ? "T" : "X").join('');
    const cnt = { TAI: 0, XIU: 0 };
    const viTriTimThay = [];
    
    for (let i = 0; i <= n - 4; i++) {
        const match = res.slice(i, i + 3).every((v, idx) => v === pattern[idx]);
        if (match) {
            cnt[res[i + 3]]++;
            viTriTimThay.push(i);
        }
    }
    
    const total = cnt.TAI + cnt.XIU;
    if (total === 0) return [null, 50, null];
    
    const best = cnt.TAI >= cnt.XIU ? "TAI" : "XIU";
    const ratio = cnt[best] / total;
    const doTin = Math.min(82, 52 + Math.floor(ratio * 34));
    
    return [best, doTin, {
        pattern: patternStr,
        soLanXuatHien: total,
        tyLe: `${Math.round(ratio * 100)}%`,
        viTri: viTriTimThay
    }];
}

// 5.3 SO KHỚP PATTERN 5 PHIÊN
function match_pattern_5(res) {
    const n = res.length;
    if (n < 7) return [null, 50, null];
    
    const pattern = res.slice(-5);
    const patternStr = pattern.map(r => r === "TAI" ? "T" : "X").join('');
    const cnt = { TAI: 0, XIU: 0 };
    
    for (let i = 0; i <= n - 6; i++) {
        const match = res.slice(i, i + 5).every((v, idx) => v === pattern[idx]);
        if (match) cnt[res[i + 5]]++;
    }
    
    const total = cnt.TAI + cnt.XIU;
    if (total === 0) return [null, 50, null];
    
    const best = cnt.TAI >= cnt.XIU ? "TAI" : "XIU";
    const ratio = cnt[best] / total;
    const doTin = Math.min(88, 52 + Math.floor(ratio * 40));
    
    return [best, doTin, {
        pattern: patternStr,
        soLanXuatHien: total,
        tyLe: `${Math.round(ratio * 100)}%`
    }];
}

// ============================================================
// ========== PHẦN 6: PHÂN TÍCH XÚC XẮC ==========
// ============================================================

// 6.1 PHÂN TÍCH THIÊN LỆCH XÚC XẮC (MẶT 1-3 VS 4-6)
function dice_bias(hist) {
    const faces = [];
    for (const h of hist.slice(-30)) {
        if (h.dices) faces.push(...h.dices);
    }
    if (faces.length < 20) return [null, 50, `Chỉ có ${faces.length} mẫu xúc xắc (cần 20)`];
    
    const high = faces.filter(d => d >= 4).length;
    const low = faces.filter(d => d <= 3).length;
    const total = high + low;
    const tyLeHigh = (high / total) * 100;
    
    if (tyLeHigh > 60) {
        return ["TAI", 58, `Xúc xắc 30 phiên: ${high} mặt 4-6 (${Math.round(tyLeHigh)}%), ${low} mặt 1-3 - Nghiêng Tài`];
    }
    if (tyLeHigh < 40) {
        return ["XIU", 58, `Xúc xắc 30 phiên: ${high} mặt 4-6 (${Math.round(tyLeHigh)}%), ${low} mặt 1-3 - Nghiêng Xỉu`];
    }
    
    return [null, 50, `Xúc xắc cân bằng: ${high} mặt 4-6 (${Math.round(tyLeHigh)}%) - ${low} mặt 1-3`];
}

// 6.2 PHÂN TÍCH XU HƯỚNG ĐIỂM SỐ
function point_trend(hist, w = 10) {
    const recent = hist.length >= w ? hist.slice(-w) : hist;
    if (recent.length < 5) return [null, 50, `Chỉ có ${recent.length} phiên điểm (cần 5)`];
    
    const pts = recent.map(h => h.point).filter(p => p);
    if (pts.length === 0) return [null, 50, "Không có dữ liệu điểm"];
    
    const avg = pts.reduce((a, b) => a + b, 0) / pts.length;
    const last3Avg = pts.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
    const xuHuong = last3Avg - avg;
    
    if (avg > 11.5) {
        return ["XIU", 55, `Điểm TB ${w} phiên: ${avg.toFixed(1)} (cao) - Khả năng ra Xỉu`];
    }
    if (avg < 9.5) {
        return ["TAI", 55, `Điểm TB ${w} phiên: ${avg.toFixed(1)} (thấp) - Khả năng ra Tài`];
    }
    
    if (xuHuong > 1.5) {
        return ["XIU", 54, `Điểm đang tăng (${last3Avg.toFixed(1)} > ${avg.toFixed(1)}) - Dự đoán Xỉu`];
    }
    if (xuHuong < -1.5) {
        return ["TAI", 54, `Điểm đang giảm (${last3Avg.toFixed(1)} < ${avg.toFixed(1)}) - Dự đoán Tài`];
    }
    
    return [null, 50, `Điểm ổn định: TB ${avg.toFixed(1)}`];
}

// 6.3 PHÂN TÍCH BIÊN ĐỘ ĐIỂM
function point_range(hist, w = 10) {
    const recent = hist.length >= w ? hist.slice(-w) : hist;
    if (recent.length < 5) return [null, 50];
    
    const pts = recent.map(h => h.point).filter(p => p);
    if (pts.length === 0) return [null, 50];
    
    const max = Math.max(...pts);
    const min = Math.min(...pts);
    const range = max - min;
    
    if (range > 8) {
        return [null, 52, `Biên độ điểm lớn (${range}), dễ biến động mạnh`];
    }
    if (range < 3) {
        return [null, 52, `Biên độ điểm hẹp (${range}), cầu đang sideway`];
    }
    
    return [null, 50, `Biên độ điểm: ${range}`];
}

// ============================================================
// ========== PHẦN 7: PHÂN TÍCH CẦU 1-1-1 (ĐAN XEN HOÀN HẢO) ==========
// ============================================================

function phatHienCau111(res) {
    if (res.length < 7) return { coCau: false };
    
    let is111 = true;
    for (let i = 1; i < 7; i++) {
        if (res[i] === res[i-1]) {
            is111 = false;
            break;
        }
    }
    
    if (is111) {
        const duDoan = opp(res[0]);
        return {
            coCau: true,
            loaiCau: "CẦU 1-1-1",
            capDo: 13,
            doDai: 7,
            duDoan: duDoan,
            doTinCay: 82,
            giaiThich: "Phát hiện cầu đan xen hoàn hảo 7 phiên: T-X-T-X-T-X-T (hoặc X-T-X-T-X-T-X). Cầu rất đẹp!",
            khuyenNghi: "THEO CẦU - CƯỢC THEO QUY LUẬT ĐAN XEN"
        };
    }
    
    return { coCau: false };
}

// ============================================================
// ========== PHẦN 8: PHÁT HIỆN ZIGZAG (CẦU 1-1 NGẮN) ==========
// ============================================================

function detect_zigzag(res) {
    const n = res.length;
    if (n < 5) return [null, 50];
    
    const last5 = res.slice(-5);
    let diffs = 0;
    for (let i = 0; i < last5.length - 1; i++) {
        if (last5[i] !== last5[i + 1]) diffs++;
    }
    
    if (diffs >= 3) {
        return [opp(res[res.length - 1]), 60, `5 phiên gần nhất đan xen ${diffs}/4 lần`];
    }
    
    return [null, 50];
}

// ============================================================
// ========== PHẦN 9: TỔNG HỢP VÀ BỎ PHIẾU ==========
// ============================================================

// 9.1 BỎ PHIẾU CÓ TRỌNG SỐ
function weighted_vote(votes) {
    let s = { TAI: 0, XIU: 0 };
    let chiTietVotes = [];
    
    for (const [nguon, pred, w, lyDo] of votes) {
        if (pred === "TAI") {
            s.TAI += w;
            chiTietVotes.push({ nguon, duDoan: "TÀI", diem: w, lyDo });
        } else if (pred === "XIU") {
            s.XIU += w;
            chiTietVotes.push({ nguon, duDoan: "XỈU", diem: w, lyDo });
        }
    }
    
    const total = s.TAI + s.XIU;
    if (total === 0) return { duDoan: "TAI", doTinCay: 50, chiTiet: [] };
    
    const final = s.TAI >= s.XIU ? "TAI" : "XIU";
    const conf = Math.min(94, Math.max(52, Math.floor((s[final] / total) * 100)));
    
    return { duDoan: final, doTinCay: conf, chiTiet: chiTietVotes };
}

// 9.2 DỰ ĐOÁN CHÍNH - TỔNG HỢP TẤT CẢ
function predict_session(hist) {
    const res = hist.map(h => h.resultTruyenThong);
    if (res.length < 3) {
        return {
            duDoan: "TAI",
            doTinCay: 50,
            cauType: "chưa_đủ_dữ_liệu",
            chiTiet: [],
            thongKe: { tongPhien: res.length }
        };
    }
    
    const votes = [];
    const phatHien = [];
    
    // 1. PHÁT HIỆN CÁC LOẠI CẦU (ƯU TIÊN CAO NHẤT)
    const cauBet = phatHienCauBet(res);
    if (cauBet.coCau) {
        votes.push(["CAU_BET", cauBet.duDoan, cauBet.doTinCay * 1.0, cauBet.giaiThich]);
        phatHien.push(cauBet);
    }
    
    const cau11 = phatHienCau11(res);
    if (cau11.coCau) {
        votes.push(["CAU_11", cau11.duDoan, cau11.doTinCay * 0.95, cau11.giaiThich]);
        phatHien.push(cau11);
    }
    
    const cau22 = phatHienCau22(res);
    if (cau22.coCau) {
        votes.push(["CAU_22", cau22.duDoan, cau22.doTinCay * 0.95, cau22.giaiThich]);
        phatHien.push(cau22);
    }
    
    const cau32 = phatHienCau32(res);
    if (cau32.coCau) {
        votes.push(["CAU_32", cau32.duDoan, cau32.doTinCay * 0.9, cau32.giaiThich]);
        phatHien.push(cau32);
    }
    
    const cau33 = phatHienCau33(res);
    if (cau33.coCau) {
        votes.push(["CAU_33", cau33.duDoan, cau33.doTinCay * 0.95, cau33.giaiThich]);
        phatHien.push(cau33);
    }
    
    const cau121 = phatHienCau121(res);
    if (cau121.coCau) {
        votes.push(["CAU_121", cau121.duDoan, cau121.doTinCay * 0.85, cau121.giaiThich]);
        phatHien.push(cau121);
    }
    
    const cau212 = phatHienCau212(res);
    if (cau212.coCau) {
        votes.push(["CAU_212", cau212.duDoan, cau212.doTinCay * 0.85, cau212.giaiThich]);
        phatHien.push(cau212);
    }
    
    const cauChuA = phatHienCauChuA(res);
    if (cauChuA.coCau) {
        votes.push(["CAU_CHU_A", cauChuA.duDoan, cauChuA.doTinCay * 0.85, cauChuA.giaiThich]);
        phatHien.push(cauChuA);
    }
    
    const cau111 = phatHienCau111(res);
    if (cau111.coCau) {
        votes.push(["CAU_111", cau111.duDoan, cau111.doTinCay * 0.9, cau111.giaiThich]);
        phatHien.push(cau111);
    }
    
    const chuKy = phatHienChuKy(res);
    if (chuKy.coCau) {
        votes.push(["CHU_KY", chuKy.duDoan, chuKy.doTinCay * 0.85, chuKy.giaiThich]);
        phatHien.push(chuKy);
    }
    
    // 2. PHÂN TÍCH THỐNG KÊ
    const [fp, fc, fReason] = analyze_freq(res, 20);
    votes.push(["TAN_SUAT_20", fp, fc * 0.75, fReason]);
    
    const [tp, tc, tReason] = analyze_trend(res, 5);
    votes.push(["XU_HUONG_5", tp, tc * 0.7, tReason]);
    
    const lechPha = phanTichLechPha(res, 15);
    if (lechPha.coLech) {
        votes.push(["LECH_PHA_15", lechPha.duDoan, lechPha.doTinCay * 0.8, lechPha.giaiThich]);
    }
    
    // 3. PHÂN TÍCH PATTERN
    const [p6, p6c, p6Detail] = match_pattern_6(res);
    if (p6) {
        votes.push(["PATTERN_6", p6, p6c * 0.85, `Pattern 6 phiên ${p6Detail.pattern} xuất hiện ${p6Detail.soLanXuatHien} lần (${p6Detail.tyLe})`]);
    }
    
    const [p3, p3c, p3Detail] = match_pattern_3(res);
    if (p3) {
        votes.push(["PATTERN_3", p3, p3c * 0.7, `Pattern 3 phiên ${p3Detail.pattern} xuất hiện ${p3Detail.soLanXuatHien} lần (${p3Detail.tyLe})`]);
    }
    
    const [p5, p5c, p5Detail] = match_pattern_5(res);
    if (p5) {
        votes.push(["PATTERN_5", p5, p5c * 0.8, `Pattern 5 phiên ${p5Detail.pattern} xuất hiện ${p5Detail.soLanXuatHien} lần (${p5Detail.tyLe})`]);
    }
    
    // 4. PHÂN TÍCH XÚC XẮC
    const [dp, dc, dReason] = dice_bias(hist);
    if (dp) {
        votes.push(["DICE_BIAS", dp, dc * 0.5, dReason]);
    }
    
    const [ptp, ptc, ptReason] = point_trend(hist, 10);
    if (ptp) {
        votes.push(["POINT_TREND", ptp, ptc * 0.45, ptReason]);
    }
    
    // 5. ZIGZAG
    const [zp, zc, zReason] = detect_zigzag(res);
    if (zp) {
        votes.push(["ZIGZAG", zp, zc * 0.55, zReason]);
    }
    
    // 6. BỆT 4+ (THÊM LẦN NỮA)
    const [streak, cur] = get_streak(res);
    if (streak >= 4 && cur) {
        votes.push(["BET_4_PLUS", opp(cur), 66 * 0.85, `Bệt ${streak} phiên ${cur === "TAI" ? "TÀI" : "XỈU"}, khuyến nghị đảo cầu`]);
    }
    
    const result = weighted_vote(votes);
    
    // Xác định loại cầu chính
    let mainCauType = "hỗn_hợp";
    if (phatHien.length > 0) {
        phatHien.sort((a, b) => b.capDo - a.capDo);
        mainCauType = phatHien[0].loaiCau;
    }
    
    return {
        duDoan: result.duDoan,
        doTinCay: result.doTinCay,
        cauType: mainCauType,
        chiTiet: result.chiTiet,
        phatHien: phatHien,
        thongKe: {
            tongPhien: res.length,
            soLoaiCauPhatHien: phatHien.length
        }
    };
}

// ============================================================
// ========== PHẦN 10: FETCH VÀ XỬ LÝ API ==========
// ============================================================

async function fetchData(url) {
    try {
        const res = await http.get(url);
        return res.data;
    } catch (e) {
        console.error(`Fetch lỗi ${url}:`, e.message);
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
    const lichSuKQ = lichSu.map(h => h.resultTruyenThong);

    // Dự đoán
    const prediction = predict_session(lichSu);
    
    // Xúc xắc hiện tại
    let tong = 0, xx = [0, 0, 0];
    if (current.dices && current.dices.length === 3) {
        xx = current.dices;
        tong = current.dices.reduce((a, b) => a + b, 0);
    }

    const coNenCuoc = prediction.doTinCay >= 68;

    // Thống kê 30 phiên
    const lichSu30 = lichSuKQ.slice(0, 30);
    const tai30 = lichSu30.filter(k => k === "TAI").length;
    const xiu30 = 30 - tai30;
    const [streak, cur] = get_streak(lichSuKQ);
    const maxStreak = get_max_streak(lichSuKQ);
    const [streakStart, curStart] = get_streak_from_start(lichSuKQ);

    // Lấy 5 phiên gần nhất
    const last5 = lichSuKQ.slice(0, 5).map(r => r === "TAI" ? "T" : "X").join(' - ');
    const last10 = lichSuKQ.slice(0, 10).map(r => r === "TAI" ? "T" : "X").join('');

    return {
        success: true,
        game: game,
        current: {
            phien: current.id,
            xuc_xac: `${xx[0]} - ${xx[1]} - ${xx[2]}`,
            tong: tong,
            ket_qua: current.resultTruyenThong === "TAI" ? "TÀI" : "XỈU"
        },
        phan_tich_hien_tai: {
            ba_phien_gan_nhat: last5.split(' - ').slice(0, 3).join(' - '),
            nam_phien_gan_nhat: last5,
            muoi_phien_gan_nhat: last10,
            chuoi_bet_hien_tai: streak >= 2 ? `${streak} phiên ${cur === "TAI" ? "TÀI" : "XỈU"}` : "KHÔNG CÓ BỆT",
            chuoi_bet_dau_tien: streakStart >= 2 ? `${streakStart} phiên ${curStart === "TAI" ? "TÀI" : "XỈU"} ở đầu` : "KHÔNG",
            chuoi_bet_dai_nhat_lich_su: `${maxStreak} phiên`
        },
        du_doan: {
            phien_tiep: current.id + 1,
            du_doan: prediction.duDoan === "TAI" ? "TÀI" : "XỈU",
            do_tin_cay: `${prediction.doTinCay}%`,
            co_nen_cuoc: coNenCuoc ? "✅✅✅ NÊN CƯỢC MẠNH" : (prediction.doTinCay >= 60 ? "⚠️ CƯỢC NHẸ" : "⏸️ BỎ QUA"),
            loai_cau_chinh: prediction.cauType,
            so_loai_cau_phat_hien: prediction.thongKe.soLoaiCauPhatHien
        },
        chi_tiet_cau_phat_hien: prediction.phatHien.slice(0, 3).map(c => ({
            loai: c.loaiCau,
            du_doan: c.duDoan === "TAI" ? "TÀI" : "XỈU",
            do_tin_cay: `${c.doTinCay}%`,
            giai_thich: c.giaiThich
        })),
        chi_tiet_bo_phieu: prediction.chiTiet.slice(0, 5).map(v => ({
            nguon: v.nguon,
            du_doan: v.duDoan,
            diem: v.diem,
            ly_do: v.lyDo
        })),
        thong_ke: {
            tong_phien_phan_tich: Math.min(lichSu.length, 50),
            ti_le_tai_30p: `${Math.round(tai30 / 30 * 100)}%`,
            tai_30p: `${tai30}T - ${xiu30}X`,
            do_lech_30p: Math.abs(tai30 - xiu30),
            ti_le_tai_tong: `${Math.round(tai30 / 30 * 100)}%`
        },
        timestamp: new Date().toISOString()
    };
}

// ============================================================
// ========== PHẦN 11: API ENDPOINTS ==========
// ============================================================

app.get("/", (req, res) => {
    res.json({
        name: "🎲 LC79 - SIÊU THUẬT TOÁN PHÂN TÍCH CẦU TOÀN DIỆN 🎲",
        author: "@tranhoang2286",
        version: "16.0 - ULTIMATE",
        thuat_toan: [
            "🔴 1. BỆT (7 cấp độ: 3,4,5,6,7+) - Đảo cầu khi bệt dài",
            "🟢 2. CẦU 1-1 (đan xen Tài-Xỉu)",
            "🟢 3. CẦU 2-2 (cặp đôi TT-XX)",
            "🔵 4. CẦU 3-2 (3T-2X / 3X-2T)",
            "🔵 5. CẦU 3-3 (3T-3X / 3X-3T)",
            "🟣 6. CẦU 1-2-1 (T-X-X-T / X-T-T-X)",
            "🟣 7. CẦU 2-1-2 (TT-X-TT / XX-T-XX)",
            "💎 8. CẦU CHỮ A (T-X-T-X-X-T)",
            "💎 9. CẦU 1-1-1 (đan xen hoàn hảo 7 phiên)",
            "🔄 10. CHU KỲ LẶP LẠI (phát hiện chu kỳ 2-7 phiên)",
            "📊 11. TẦN SUẤT 20 PHIÊN",
            "📈 12. XU HƯỚNG 5 PHIÊN",
            "📐 13. LỆCH PHA 15 PHIÊN",
            "📚 14. PATTERN 3-5-6 PHIÊN (học từ lịch sử)",
            "🎲 15. PHÂN TÍCH XÚC XẮC (mặt 1-3 vs 4-6)",
            "🎯 16. XU HƯỚNG ĐIỂM SỐ",
            "🔄 17. ZIGZAG (cầu 1-1 ngắn)",
            "⚖️ 18. BỎ PHIẾU TRỌNG SỐ (tổng hợp tất cả)"
        ],
        quy_tac: "✅ CHỈ CƯỢC KHI 'co_nen_cuoc' = '✅✅✅ NÊN CƯỢC MẠNH' (độ tin cậy >= 68%)",
        endpoints: {
            "TX (Hũ) - Dự đoán": "GET /taixiu",
            "MD5 - Dự đoán": "GET /taixiumd5",
            "Kiểm tra sức khỏe": "GET /health"
        }
    });
});

app.get("/health", (req, res) => {
    res.json({
        status: "ONLINE",
        timestamp: new Date().toISOString(),
        version: "16.0",
        uptime: process.uptime()
    });
});

app.get("/taixiu", async (req, res) => {
    try {
        const result = await duDoan("TX");
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get("/taixiumd5", async (req, res) => {
    try {
        const result = await duDoan("MD5");
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`\n================================================================`);
    console.log(`🎲 LC79 - SIÊU THUẬT TOÁN PHÂN TÍCH CẦU v16.0`);
    console.log(`================================================================`);
    console.log(`✅ TX (Hũ): http://localhost:${PORT}/taixiu`);
    console.log(`✅ MD5: http://localhost:${PORT}/taixiumd5`);
    console.log(`🎯 18 THUẬT TOÁN - BỎ PHIẾU TRỌNG SỐ`);
    console.log(`🎯 PHÁT HIỆN: Bệt, 1-1, 2-2, 3-2, 3-3, 1-2-1, 2-1-2, Chữ A, Chu kỳ, Pattern, Zigzag`);
    console.log(`🎯 CHỈ CƯỢC KHI "co_nen_cuoc" = "✅✅✅ NÊN CƯỢC MẠNH" (>=68%)`);
    console.log(`================================================================\n`);
});
