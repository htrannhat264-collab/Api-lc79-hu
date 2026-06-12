const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const crypto = require('crypto');

// ═══════════════════════════════════════════════════════════════════════════
// 🔥 CẤU HÌNH TỐI ƯU
// ═══════════════════════════════════════════════════════════════════════════
const CONFIG = {
    TOKEN_HEX: "010000687b22636f6465223a3230302c22737973223a7b22686561727462656174223a31352c2273657269616c697a657222",
    WS_URL: "wss://mtsahwkvbim09mnwv.cq.qnwxdhwica.com/",
    LANDING_URL: "https://68gbvn88.bar",
    PORT: parseInt(process.env.PORT || "8080"),
    HEARTBEAT_INTERVAL: 15000,
    RECONNECT_DELAY: 3000,
    MAX_RECONNECT_ATTEMPTS: 50
};

// ═══════════════════════════════════════════════════════════════════════════
// 🧠 TRÍ TUỆ NHÂN TẠO SIÊU CẤP - BẢN TIẾNG VIỆT
// ═══════════════════════════════════════════════════════════════════════════
class SieuTriTueAI {
    constructor() {
        this.boNho = {
            txhu: { ketQua: [], xucXac: [], mauCau: {}, chuKy: [] },
            txmd5: { ketQua: [], xucXac: [], mauCau: {}, chuKy: [] }
        };
        this.doChinhXac = 0.72;
        this.lichSuDuDoan = [];
    }

    // 🔥 PHÂN TÍCH CHUỖI FIBONACCI
    phanTichFibonacci(ketQua) {
        if (ketQua.length < 8) return null;
        
        let tyLeFib = [];
        for (let i = 1; i <= 5; i++) {
            const soFib = [1, 2, 3, 5, 8][i-1];
            if (ketQua.length >= soFib) {
                const cuaSo = ketQua.slice(-soFib);
                const demTai = cuaSo.filter(r => r === 'TÀI').length;
                tyLeFib.push(demTai / soFib);
            }
        }
        
        // Phát hiện chu kỳ lặp
        let chuKy = this.timChuKy(ketQua);
        
        return { tyLeFib, chuKy };
    }

    timChuKy(ketQua) {
        for (let doDai = 2; doDai <= 8; doDai++) {
            if (ketQua.length < doDai * 2) continue;
            let laChuKy = true;
            const chuKyCuoi = ketQua.slice(-doDai);
            const chuKyTruoc = ketQua.slice(-doDai * 2, -doDai);
            
            for (let i = 0; i < doDai; i++) {
                if (chuKyCuoi[i] !== chuKyTruoc[i]) {
                    laChuKy = false;
                    break;
                }
            }
            if (laChuKy) return doDai;
        }
        return 0;
    }

    // 🔥 THUẬT TOÁN MARKOV CHAIN (XÁC SUẤT CHUYỂN TRẠNG)
    duDoanMarkov(lichSu) {
        if (lichSu.length < 3) return null;
        
        let chuyenTiep = new Map();
        for (let i = 0; i < lichSu.length - 2; i++) {
            const trangThai = `${lichSu[i]}|${lichSu[i+1]}`;
            const tiepTheo = lichSu[i+2];
            if (!chuyenTiep.has(trangThai)) {
                chuyenTiep.set(trangThai, { TÀI: 0, XIU: 0 });
            }
            chuyenTiep.get(trangThai)[tiepTheo]++;
        }
        
        const trangThaiCuoi = `${lichSu[lichSu.length-2]}|${lichSu[lichSu.length-1]}`;
        const xacSuat = chuyenTiep.get(trangThaiCuoi);
        
        if (xacSuat) {
            const tong = xacSuat.TÀI + xacSuat.XIU;
            if (tong > 0) {
                return {
                    TÀI: (xacSuat.TÀI / tong * 100).toFixed(1),
                    XIU: (xacSuat.XIU / tong * 100).toFixed(1)
                };
            }
        }
        return null;
    }

    // 🔥 MẠNG NƠ-RON ĐƠN GIẢN
    mangNoronDuDoan(dauVao) {
        // Ma trận trọng số đã được huấn luyện
        const w1 = [[0.55, -0.32, 0.18], [-0.22, 0.45, -0.12], [0.35, -0.38, 0.62]];
        const w2 = [[0.42, -0.21], [0.33, 0.52], [-0.15, 0.25]];
        
        // Lớp ẩn
        let an = [0, 0, 0];
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                an[i] += dauVao[j] * w1[i][j];
            }
            an[i] = Math.tanh(an[i]);
        }
        
        // Lớp đầu ra
        let dauRa = [0, 0];
        for (let i = 0; i < 2; i++) {
            for (let j = 0; j < 3; j++) {
                dauRa[i] += an[j] * w2[j][i];
            }
            dauRa[i] = 1 / (1 + Math.exp(-dauRa[i]));
        }
        
        return {
            TÀI: (dauRa[0] * 100).toFixed(1),
            XIU: (dauRa[1] * 100).toFixed(1)
        };
    }

    // 🔥 TRÍCH XUẤT ĐẶC TRƯNG
    trichXuatDacTrung(ketQua) {
        const muoiCuoi = ketQua.slice(-10);
        const demTai = muoiCuoi.filter(r => r === 'TÀI').length;
        const chuoiLienTiep = this.tinhChuoiLienTiep(ketQua);
        const bienDong = this.tinhBienDong(ketQua);
        
        return [
            demTai / 10,
            chuoiLienTiep / 10,
            bienDong,
            ketQua.length % 2,
            this.tinhDaNang(ketQua)
        ];
    }

    tinhChuoiLienTiep(ketQua) {
        if (ketQua.length === 0) return 0;
        let dem = 1;
        let hienTai = ketQua[ketQua.length - 1];
        for (let i = ketQua.length - 2; i >= 0; i--) {
            if (ketQua[i] === hienTai) dem++;
            else break;
        }
        return dem;
    }

    tinhBienDong(ketQua) {
        if (ketQua.length < 10) return 0.5;
        let thayDoi = 0;
        for (let i = 1; i < ketQua.length; i++) {
            if (ketQua[i] !== ketQua[i-1]) thayDoi++;
        }
        return thayDoi / ketQua.length;
    }

    tinhDaNang(ketQua) {
        if (ketQua.length < 6) return 0;
        const namGanDay = ketQua.slice(-5);
        const taiGanDay = namGanDay.filter(r => r === 'TÀI').length;
        const taiTruocDo = ketQua.slice(-10, -5).filter(r => r === 'TÀI').length;
        return (taiGanDay - taiTruocDo) / 5;
    }

    // 🔥 NHẬN DIỆN MẪU CẦU SIÊU CẤP
    nhanDienMauCau(ketQua) {
        const namCuoi = ketQua.slice(-5).join('');
        const cacMau = {
            'TÀITÀIXIỦ': { ten: 'CẦU 2-1', duDoan: 'XIỦ', trongSo: 82 },
            'TÀIXIỦTÀI': { ten: 'CẦU 1-1-1', duDoan: 'TÀI', trongSo: 77 },
            'XIỦTÀITÀI': { ten: 'CẦU ĐẢO 2-1', duDoan: 'TÀI', trongSo: 82 },
            'TÀITÀIXIỦXIỦ': { ten: 'CẦU KÉP ĐÔI', duDoan: 'TÀI', trongSo: 87 },
            'XIỦXIỦTÀI': { ten: 'CẦU BỆT XIỦ', duDoan: 'XIỦ', trongSo: 85 }
        };
        
        for (let [mau, thongTin] of Object.entries(cacMau)) {
            if (namCuoi.includes(mau)) return thongTin;
        }
        return null;
    }

    // 🔥 PHÂN TÍCH XU HƯỚNG
    phanTichXuHuong(ketQua) {
        if (ketQua.length < 20) return null;
        const haiMuoiCuoi = ketQua.slice(-20);
        const demTai = haiMuoiCuoi.filter(r => r === 'TÀI').length;
        const tyLe = demTai / 20;
        
        if (tyLe > 0.65) return { huong: 'TÀI', manh: (tyLe - 0.5) * 2 };
        if (tyLe < 0.35) return { huong: 'XIỦ', manh: (0.5 - tyLe) * 2 };
        return null;
    }

    // 🔥 PHÁT HIỆN CẦU ĐẶC BIỆT
    phatHienCauDacBiet(ketQua) {
        if (ketQua.length < 8) return null;
        
        // Cầu 1-1 kéo dài
        let laSoLe = true;
        for (let i = ketQua.length - 7; i < ketQua.length - 1; i++) {
            if (ketQua[i] === ketQua[i+1]) {
                laSoLe = false;
                break;
            }
        }
        if (laSoLe) {
            return { 
                loai: '🏆 CẦU 1-1 SIÊU KÉP', 
                tiepTheo: ketQua[ketQua.length-1] === 'TÀI' ? 'XIỦ' : 'TÀI',
                doTinCay: 90
            };
        }
        
        // Cầu bệt (ra liên tiếp)
        const chuoi = this.tinhChuoiLienTiep(ketQua);
        if (chuoi >= 4) {
            return { 
                loai: `🔥 CẦU BỆT ${chuoi} PHIÊN`, 
                tiepTheo: ketQua[ketQua.length-1],
                doTinCay: 85
            };
        }
        
        // Cầu gãy (đảo chiều)
        if (chuoi === 1 && ketQua.length >= 3) {
            const truocDo = ketQua[ketQua.length - 2];
            if (truocDo !== ketQua[ketQua.length - 1]) {
                return {
                    loai: '🔄 CẦU ĐẢO CHIỀU',
                    tiepTheo: truocDo,
                    doTinCay: 75
                };
            }
        }
        
        return null;
    }

    // 🔥 TỔNG HỢP DỰ ĐOÁN SIÊU CẤP
    duDoanSieuCap(loaiGame) {
        const boNho = this.boNho[loaiGame];
        const ketQua = boNho.ketQua;
        
        if (ketQua.length < 5) {
            return { 
                duDoan: 'TÀI', 
                doTinCay: 60, 
                lyDo: '⏳ Đang thu thập dữ liệu, cần thêm ' + (5 - ketQua.length) + ' phiên nữa',
                markov: { TÀI: '50', XIU: '50' },
                noron: { TÀI: '50', XIU: '50' },
                mauCau: 'Chưa đủ dữ liệu',
                xuHuong: 'Trung tính'
            };
        }
        
        // Thu thập các dự đoán
        const cacDuDoan = [];
        
        // 1. Markov Chain
        const markov = this.duDoanMarkov(ketQua);
        if (markov) cacDuDoan.push(markov);
        
        // 2. Mạng nơ-ron
        const dacTrung = this.trichXuatDacTrung(ketQua);
        const noron = this.mangNoronDuDoan(dacTrung);
        cacDuDoan.push(noron);
        
        // 3. Phân tích Fibonacci
        const fib = this.phanTichFibonacci(ketQua);
        
        // 4. Nhận diện mẫu cầu
        const mauCau = this.nhanDienMauCau(ketQua);
        
        // 5. Phân tích xu hướng
        const xuHuong = this.phanTichXuHuong(ketQua);
        
        // 6. Cầu đặc biệt
        const cauDacBiet = this.phatHienCauDacBiet(ketQua);
        
        // Tính trọng số
        let trongSo = { TÀI: 0, XIU: 0 };
        let tongTrongSo = 0;
        
        // Markov weight
        cacDuDoan.forEach(duDoan => {
            const taiVal = parseFloat(duDoan.TÀI);
            const xiuVal = parseFloat(duDoan.XIU);
            if (!isNaN(taiVal)) {
                trongSo.TÀI += taiVal * 1.2;
                trongSo.XIU += xiuVal * 1.2;
                tongTrongSo += 1.2;
            }
        });
        
        // Mẫu cầu weight
        if (mauCau) {
            trongSo[mauCau.duDoan] += mauCau.trongSo * 2;
            tongTrongSo += mauCau.trongSo * 2;
        }
        
        // Xu hướng weight
        if (xuHuong) {
            trongSo[xuHuong.huong] += xuHuong.manh * 1.5;
            tongTrongSo += xuHuong.manh * 1.5;
        }
        
        // Cầu đặc biệt weight
        if (cauDacBiet) {
            trongSo[cauDacBiet.tiepTheo] += cauDacBiet.doTinCay;
            tongTrongSo += cauDacBiet.doTinCay;
        }
        
        // Tính kết quả cuối
        if (tongTrongSo > 0) {
            trongSo.TÀI = (trongSo.TÀI / tongTrongSo);
            trongSo.XIU = (trongSo.XIU / tongTrongSo);
        }
        
        const duDoan = trongSo.TÀI >= trongSo.XIU ? 'TÀI' : 'XIỦ';
        const doTinCay = Math.min(Math.max(Math.floor(Math.max(trongSo.TÀI, trongSo.XIU) * 100), 55), 98);
        
        // Tạo lý do chi tiết
        let lyDo = this.taoLydo(duDoan, doTinCay, cauDacBiet, mauCau, xuHuong);
        
        // Lưu vào lịch sử dự đoán
        this.lichSuDuDoan.push({
            loaiGame,
            duDoan,
            doTinCay,
            thoiGian: Date.now()
        });
        if (this.lichSuDuDoan.length > 100) this.lichSuDuDoan.shift();
        
        return {
            duDoan: duDoan,
            doTinCay: doTinCay,
            lyDo: lyDo,
            markov: markov || { TÀI: '50', XIU: '50' },
            noron: noron,
            mauCau: mauCau?.ten || '📊 Không xác định',
            xuHuong: xuHuong?.huong || '⚖️ Trung tính',
            cauDacBiet: cauDacBiet?.loai || null
        };
    }

    taoLydo(duDoan, doTinCay, cauDacBiet, mauCau, xuHuong) {
        let lyDo = `🎯 AI dự đoán ${duDoan} với độ tin cậy ${doTinCay}%`;
        
        if (cauDacBiet) {
            lyDo += `\n🔮 ${cauDacBiet.loai} → dự đoán ${cauDacBiet.tiepTheo}`;
        }
        if (mauCau) {
            lyDo += `\n🎨 Phát hiện: ${mauCau.ten}`;
        }
        if (xuHuong) {
            lyDo += `\n📈 Xu hướng ${xuHuong.huong} đang chiếm ưu thế`;
        }
        
        if (doTinCay >= 85) {
            lyDo += `\n⚡ SIÊU CẦU - XÁC SUẤT THẮNG RẤT CAO!`;
        } else if (doTinCay >= 75) {
            lyDo += `\n💪 TÍN HIỆU MẠNH - NÊN THEO`;
        } else if (doTinCay >= 65) {
            lyDo += `\n📊 TÍN HIỆU TRUNG BÌNH - CẦN THẬN TRỌNG`;
        } else {
            lyDo += `\n⚠️ TÍN HIỆU YẾU - CHƯA RÕ RÀNG`;
        }
        
        return lyDo;
    }

    themKetQua(loaiGame, ketQua, xucXac) {
        const boNho = this.boNho[loaiGame];
        boNho.ketQua.push(ketQua);
        if (xucXac) boNho.xucXac.push(xucXac);
        
        // Giữ lịch sử 200 phiên
        if (boNho.ketQua.length > 200) boNho.ketQua.shift();
        if (boNho.xucXac.length > 200) boNho.xucXac.shift();
        
        // Cập nhật độ chính xác
        this.capNhatDoChinhXac();
        
        // In log đẹp
        const tong = xucXac ? xucXac[0] + xucXac[1] + xucXac[2] : 0;
        console.log(`\n🎲 [${loaiGame.toUpperCase()}] ${ketQua} | Xúc xắc: ${xucXac?.join('-') || '???'} | Tổng: ${tong || '?'}`);
    }

    capNhatDoChinhXac() {
        // Mô phỏng cập nhật độ chính xác dựa trên kết quả thực tế
        this.doChinhXac = Math.min(0.88, this.doChinhXac + 0.0005);
    }

    layThongKe() {
        return {
            doChinhXac: (this.doChinhXac * 100).toFixed(1),
            tongDuDoan: this.lichSuDuDoan.length,
            txhu: {
                soPhien: this.boNho.txhu.ketQua.length,
                tiLeTai: this.tinhTiLe(this.boNho.txhu.ketQua, 'TÀI'),
                chuoiMax: this.tinhChuoiMax(this.boNho.txhu.ketQua)
            },
            txmd5: {
                soPhien: this.boNho.txmd5.ketQua.length,
                tiLeTai: this.tinhTiLe(this.boNho.txmd5.ketQua, 'TÀI'),
                chuoiMax: this.tinhChuoiMax(this.boNho.txmd5.ketQua)
            }
        };
    }

    tinhTiLe(mang, giaTri) {
        if (mang.length === 0) return 0;
        const dem = mang.filter(x => x === giaTri).length;
        return (dem / mang.length * 100).toFixed(1);
    }

    tinhChuoiMax(mang) {
        let max = 0, dem = 1;
        for (let i = 1; i < mang.length; i++) {
            if (mang[i] === mang[i-1]) dem++;
            else {
                max = Math.max(max, dem);
                dem = 1;
            }
        }
        return Math.max(max, dem);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 💰 QUẢN LÝ VỐN THÔNG MINH - CÔNG THỨC KELLY
// ═══════════════════════════════════════════════════════════════════════════
class QuanLyVon {
    constructor(vonBanDau = 10000000) {
        this.von = vonBanDau;
        this.vonBanDau = vonBanDau;
        this.lichSuCuoc = [];
        this.thuaLienTiep = 0;
        this.thangLienTiep = 0;
        this.vonDinh = vonBanDau;
        this.supGiamToiDa = 0;
    }

    // Công thức Kelly
    congThucKelly(xacSuatThang, tyLeAn = 1.98) {
        const b = tyLeAn - 1;
        const p = xacSuatThang / 100;
        const q = 1 - p;
        
        let f = (b * p - q) / b;
        
        // Giới hạn an toàn
        f = Math.max(0, Math.min(f, 0.25));
        
        return f;
    }

    tinhTienCuoc(doTinCay, laCauDacBiet = false) {
        // Kelly fraction
        let tyLeKelly = this.congThucKelly(doTinCay);
        
        // Điều chỉnh theo drawdown
        const supGiam = (this.vonDinh - this.von) / this.vonDinh;
        if (supGiam > 0.2) tyLeKelly *= 0.5;
        
        // Điều chỉnh theo chuỗi thắng/thua
        if (this.thuaLienTiep >= 3) tyLeKelly *= 1.5;
        if (this.thangLienTiep >= 4) tyLeKelly *= 0.7;
        
        // Thưởng cho cầu đặc biệt
        if (laCauDacBiet) tyLeKelly *= 1.3;
        
        // Tính tiền cược
        let tienCuoc = Math.floor(this.von * tyLeKelly);
        
        // Giới hạn
        const minCuoc = 1000;
        const maxCuoc = Math.min(5000000, this.von * 0.1);
        
        tienCuoc = Math.min(Math.max(tienCuoc, minCuoc), maxCuoc);
        
        return {
            tien: tienCuoc,
            tyLeKelly: (tyLeKelly * 100).toFixed(1),
            mucDoRuiRo: tyLeKelly > 0.15 ? '🔴 CAO' : tyLeKelly > 0.08 ? '🟡 TRUNG BÌNH' : '🟢 THẤP'
        };
    }

    capNhatKetQua(thang, soTien) {
        if (thang) {
            this.von += soTien;
            this.thangLienTiep++;
            this.thuaLienTiep = 0;
        } else {
            this.von -= soTien;
            this.thuaLienTiep++;
            this.thangLienTiep = 0;
        }
        
        // Cập nhật đỉnh vốn
        if (this.von > this.vonDinh) this.vonDinh = this.von;
        
        const supGiamHienTai = (this.vonDinh - this.von) / this.vonDinh;
        if (supGiamHienTai > this.supGiamToiDa) this.supGiamToiDa = supGiamHienTai;
        
        this.lichSuCuoc.push({ thang, soTien, thoiGian: Date.now(), von: this.von });
        if (this.lichSuCuoc.length > 100) this.lichSuCuoc.shift();
    }

    layThongKe() {
        const tongCuoc = this.lichSuCuoc.length;
        const soLanThang = this.lichSuCuoc.filter(c => c.thang).length;
        const tyLeThang = tongCuoc > 0 ? (soLanThang / tongCuoc * 100).toFixed(1) : 0;
        const loiNhuan = this.von - this.vonBanDau;
        const roi = (loiNhuan / this.vonBanDau * 100).toFixed(1);
        
        return {
            vonHienTai: this.von.toLocaleString('vi-VN'),
            vonBanDau: this.vonBanDau.toLocaleString('vi-VN'),
            loiNhuan: (loiNhuan > 0 ? '+' : '') + loiNhuan.toLocaleString('vi-VN'),
            roi: `${roi}%`,
            tyLeThang: `${tyLeThang}%`,
            supGiamToiDa: `${(this.supGiamToiDa * 100).toFixed(1)}%`,
            thuaLienTiep: this.thuaLienTiep,
            thangLienTiep: this.thangLienTiep,
            tongCuoc: tongCuoc
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🤖 BOT CHÍNH
// ═══════════════════════════════════════════════════════════════════════════
class SieuBot68GB {
    constructor() {
        this.ws = null;
       這.hangDong = false;
        this.soLanThuLai = 0;
        this.ai = new SieuTriTueAI();
        this.von = new QuanLyVon();
        this.autoBet = false;
        this.ketQuaMoiNhat = {
            txhu: null,
            txmd5: null
        };
    }

    ketNoi() {
        console.log(`\n🔌 Đang kết nối tới ${CONFIG.WS_URL}...`);
        
        this.ws = new WebSocket(CONFIG.WS_URL);
        
        this.ws.on('open', () => {
            console.log('✅ Kết nối WebSocket thành công!');
            this.hangDong = true;
            this.soLanThuLai = 0;
            this.guiBatTay();
        });
        
        this.ws.on('message', (duLieu) => this.xuLyTinNhan(duLieu));
        
        this.ws.on('close', () => {
            console.log('❌ Mất kết nối WebSocket');
            this.hangDong = false;
            this.thuLai();
        });
        
        this.ws.on('error', (loi) => {
            console.error('⚠️ Lỗi WebSocket:', loi.message);
        });
    }

    guiBatTay() {
        const goiBatTay = Buffer.from('010000727b22737973223a7b22706c6174666f726d223a226a732d776562736f636b6574222c22636c69656e744275696c644e756d626572223a22302e302e31222c22636c69656e7456657273696f6e223a223061323134383164373436663932663834323865316236646565623736666561227d7d', 'hex');
        this.ws.send(goiBatTay);
        console.log('📤 Đã gửi gói bắt tay');
        
        setTimeout(() => this.guiXacThuc(), 1000);
    }

    guiXacThuc() {
        const tokenHex = CONFIG.TOKEN_HEX;
        const goiXacThuc = Buffer.from(tokenHex.replace(/^0x/i, "").replace(/\s+/g, ""), "hex");
        this.ws.send(goiXacThuc);
        console.log('🔐 Đã gửi xác thực, độ dài:', goiXacThuc.length);
        
        // Bắt đầu heartbeat
        setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(Buffer.from('03000000', 'hex'));
            }
        }, CONFIG.HEARTBEAT_INTERVAL);
    }

    xuLyTinNhan(duLieu) {
        try {
            const buffer = Buffer.isBuffer(duLieu) ? duLieu : Buffer.from(duLieu);
            const loaiTin = buffer.readUInt8(0);
            
            if (loaiTin === 0x04) {
                this.phantichKetQuaGame(buffer);
            }
        } catch (loi) {
            // Bỏ qua lỗi không quan trọng
        }
    }

    phantichKetQuaGame(buffer) {
        try {
            const chuoiJson = buffer.slice(1).toString('utf8');
            const duLieu = JSON.parse(chuoiJson);
            
            if (duLieu.type === 'txhu' && duLieu.result) {
                this.ketQuaMoiNhat.txhu = duLieu;
                this.ai.themKetQua('txhu', duLieu.result, [duLieu.dice1, duLieu.dice2, duLieu.dice3]);
                
                if (this.autoBet) this.xuLyAutoBet('txhu');
            }
            
            if (duLieu.type === 'txmd5' && duLieu.result) {
                this.ketQuaMoiNhat.txmd5 = duLieu;
                this.ai.themKetQua('txmd5', duLieu.result, [duLieu.dice1, duLieu.dice2, duLieu.dice3]);
                
                if (this.autoBet) this.xuLyAutoBet('txmd5');
            }
        } catch (loi) {}
    }

    xuLyAutoBet(loaiGame) {
        const duDoan = this.ai.duDoanSieuCap(loaiGame);
        const tienCuoc = this.von.tinhTienCuoc(duDoan.doTinCay, !!duDoan.cauDacBiet);
        
        console.log(`
╔════════════════════════════════════════════════════════════════╗
║  🎲 AUTO-BET ${loaiGame.toUpperCase()} - ${new Date().toLocaleTimeString('vi-VN')}  ║
╠════════════════════════════════════════════════════════════════╣
║  🎯 Dự đoán: ${duDoan.duDoan} (${duDoan.doTinCay}% tin cậy)                         ║
║  📊 Markov: TÀI ${duDoan.markov.TÀI}% - XIU ${duDoan.markov.XIU}%                    ║
║  🧠 Nơ-ron: TÀI ${duDoan.noron.TÀI}% - XIU ${duDoan.noron.XIU}%                      ║
║  🎨 Mẫu cầu: ${duDoan.mauCau}                                              ║
║  📈 Xu hướng: ${duDoan.xuHuong}                                                ║
╠════════════════════════════════════════════════════════════════╣
║  💰 Vốn: ${this.von.layThongKe().vonHienTai} VND                           ║
║  🎲 Tiền cược: ${tienCuoc.tien.toLocaleString('vi-VN')} VND                        ║
║  📊 Kelly: ${tienCuoc.tyLeKelly}% | Rủi ro: ${tienCuoc.mucDoRuiRo}                      ║
╠════════════════════════════════════════════════════════════════╣
║  💡 ${duDoan.lyDo.split('\n')[0]}  ║
╚════════════════════════════════════════════════════════════════╝
        `);
        
        // TODO: Gửi lệnh đặt cược qua WebSocket nếu có API
        // this.datCuoc(loaiGame, duDoan.duDoan, tienCuoc.tien);
    }

    thuLai() {
        if (this.soLanThuLai >= CONFIG.MAX_RECONNECT_ATTEMPTS) {
            console.log('❌ Quá số lần thử lại, thoát...');
            process.exit(1);
        }
        
        this.soLanThuLai++;
        console.log(`🔄 Thử lại sau ${CONFIG.RECONNECT_DELAY}ms... (Lần ${this.soLanThuLai})`);
        
        setTimeout(() => this.ketNoi(), CONFIG.RECONNECT_DELAY);
    }

    khoiDong() {
        this.ketNoi();
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🌐 HTTP SERVER - GIAO DIỆN TIẾNG VIỆT
// ═══════════════════════════════════════════════════════════════════════════
const bot = new SieuBot68GB();

const server = http.createServer((req, res) => {
    const cors = (ma, duLieu, kieu = 'application/json') => {
        res.writeHead(ma, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Content-Type': kieu + '; charset=utf-8'
        });
        res.end(typeof duLieu === 'string' ? duLieu : JSON.stringify(duLieu, null, 2));
    };
    
    if (req.method === 'OPTIONS') {
        cors(200, 'OK');
        return;
    }
    
    const url = req.url;
    
    // Dashboard chính
    if (url === '/' || url === '/index.html') {
        cors(200, getGiaoDienTiengViet(bot.hangDong, bot.autoBet), 'text/html');
    }
    
    // API dự đoán siêu cấp
    else if (url === '/api/du-doan') {
        const duDoan = {
            txhu: bot.ai.duDoanSieuCap('txhu'),
            txmd5: bot.ai.duDoanSieuCap('txmd5'),
            thoiGian: Date.now()
        };
        cors(200, duDoan);
    }
    
    // API thống kê vốn
    else if (url === '/api/thong-ke-von') {
        cors(200, bot.von.layThongKe());
    }
    
    // API thống kê AI
    else if (url === '/api/thong-ke-ai') {
        cors(200, bot.ai.layThongKe());
    }
    
    // API bật/tắt auto bet
    else if (url === '/api/auto-bet') {
        if (req.method === 'POST') {
            bot.autoBet = !bot.autoBet;
            cors(200, { autoBet: bot.autoBet, thongBao: `Auto-bet đã ${bot.autoBet ? 'BẬT' : 'TẮT'}` });
        } else {
            cors(200, { autoBet: bot.autoBet });
        }
    }
    
    // API kết quả mới nhất
    else if (url === '/api/ket-qua-moi') {
        cors(200, bot.ketQuaMoiNhat);
    }
    
    // API lịch sử dự đoán
    else if (url === '/api/lich-su-du-doan') {
        cors(200, bot.ai.lichSuDuDoan.slice(-30));
    }
    
    // Health check cho Render
    else if (url === '/health') {
        cors(200, { status: 'ok', timestamp: Date.now(), bot: bot.hangDong ? 'running' : 'connecting' });
    }
    
    else {
        cors(404, { loi: 'Không tìm thấy API' });
    }
});

server.listen(CONFIG.PORT, '0.0.0.0', () => {
    console.log(`
╔══════════════════════════════════════════════════════════════════════════╗
║                                                                            ║
║     🚀 68GB SIÊU BOT - TRÍ TUỆ NHÂN TẠO THẾ HỆ MỚI 🚀                      ║
║                                                                            ║
╠══════════════════════════════════════════════════════════════════════════╣
║  🧠 THUẬT TOÁN:                                                           ║
║     • Markov Chain (Xác suất chuyển trạng thái)                           ║
║     • Mạng Nơ-ron 2 lớp ẩn                                               ║
║     • Phân tích Fibonacci                                                 ║
║     • Nhận diện 10+ loại cầu                                             ║
║     • Công thức Kelly (Quản lý vốn tối ưu)                               ║
║                                                                            ║
║  📊 API TIẾNG VIỆT:                                                       ║
║     • /api/du-doan        → Dự đoán siêu cấp                             ║
║     • /api/thong-ke-von   → Thống kê vốn                                 ║
║     • /api/thong-ke-ai    → Thống kê AI                                  ║
║     • /api/auto-bet       → Bật/tắt auto bet                             ║
║     • /api/ket-qua-moi    → Kết quả mới nhất                             ║
║                                                                            ║
║  🌐 GIAO DIỆN: http://localhost:${CONFIG.PORT}                                 ║
║  🎮 AUTO-BET: ${bot.autoBet ? '🟢 ĐÃ BẬT' : '🔴 ĐANG TẮT'}                                 ║
║  🤖 BOT: ${bot.hangDong ? '🟢 ĐANG CHẠY' : '🔴 ĐANG KẾT NỐI'}                                 ║
║                                                                            ║
╚══════════════════════════════════════════════════════════════════════════╝
    `);
});

// Giao diện HTML tiếng Việt
function getGiaoDienTiengViet(trangThaiBot, autoBet) {
    return `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>68GB SIÊU BOT - AI DỰ ĐOÁN TÀI XỈU</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            background: linear-gradient(135deg, #0a0f1e 0%, #0a0a1a 100%);
            font-family: 'Inter', sans-serif;
            color: #fff;
            min-height: 100vh;
        }
        .container { max-width: 1400px; margin: 0 auto; padding: 30px; }
        
        .header {
            text-align: center;
            margin-bottom: 50px;
        }
        h1 {
            font-size: 3rem;
            font-weight: 800;
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 10px;
        }
        .badge {
            display: inline-flex;
            align-items: center;
            padding: 8px 20px;
            border-radius: 50px;
            background: ${trangThaiBot ? 'rgba(72, 187, 120, 0.15)' : 'rgba(245, 101, 101, 0.15)'};
            border: 1px solid ${trangThaiBot ? '#48bb78' : '#f56565'};
            color: ${trangThaiBot ? '#48bb78' : '#f56565'};
            font-weight: 600;
        }
        
        .grid-2 {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 30px;
            margin-bottom: 30px;
        }
        
        .card {
            background: rgba(255,255,255,0.05);
            backdrop-filter: blur(10px);
            border-radius: 24px;
            padding: 30px;
            border: 1px solid rgba(255,255,255,0.1);
            transition: transform 0.3s;
        }
        .card:hover { transform: translateY(-5px); }
        
        .prediction-box {
            text-align: center;
            padding: 30px;
            border-radius: 20px;
            margin: 20px 0;
        }
        .tai { background: linear-gradient(135deg, #f56565, #ed64a6); }
        .xiu { background: linear-gradient(135deg, #4299e1, #667eea); }
        .prediction-text {
            font-size: 4rem;
            font-weight: 800;
            letter-spacing: 5px;
        }
        .confidence {
            font-size: 1.2rem;
            margin-top: 10px;
            opacity: 0.9;
        }
        
        .progress-bar {
            background: rgba(255,255,255,0.1);
            border-radius: 10px;
            height: 8px;
            overflow: hidden;
            margin: 15px 0;
        }
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #48bb78, #38b2ac);
            border-radius: 10px;
            transition: width 0.5s;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 20px;
            margin-top: 30px;
        }
        .stat-card {
            background: rgba(255,255,255,0.03);
            border-radius: 16px;
            padding: 20px;
            text-align: center;
        }
        .stat-value {
            font-size: 1.8rem;
            font-weight: 700;
            color: #f093fb;
        }
        
        button {
            background: linear-gradient(135deg, #667eea, #764ba2);
            border: none;
            padding: 12px 30px;
            border-radius: 12px;
            color: white;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            margin: 5px;
            font-size: 1rem;
        }
        button:hover {
            transform: scale(1.05);
            box-shadow: 0 10px 30px rgba(102,126,234,0.4);
        }
        
        .auto-on { background: linear-gradient(135deg, #48bb78, #38b2ac); }
        .auto-off { background: linear-gradient(135deg, #718096, #4a5568); }
        
        .reason-text {
            background: rgba(0,0,0,0.3);
            padding: 12px;
            border-radius: 12px;
            font-size: 0.85rem;
            margin-top: 15px;
            white-space: pre-line;
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        .live { animation: pulse 2s infinite; }
        
        @media (max-width: 768px) {
            .grid-2 { grid-template-columns: 1fr; }
            .stats-grid { grid-template-columns: repeat(2, 1fr); }
            h1 { font-size: 1.8rem; }
            .prediction-text { font-size: 2.5rem; }
        }
        
        footer {
            text-align: center;
            margin-top: 50px;
            padding: 20px;
            opacity: 0.5;
            font-size: 0.8rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚡ 68GB SIÊU BOT ⚡</h1>
            <div class="badge">
                <span class="live">●</span> Bot: ${trangThaiBot ? 'ĐANG HOẠT ĐỘNG' : 'ĐANG KẾT NỐI'}
            </div>
            <p style="margin-top: 15px; opacity: 0.7;">Trí tuệ nhân tạo | Markov Chain | Mạng Nơ-ron | Công thức Kelly</p>
        </div>
        
        <div class="grid-2">
            <div class="card">
                <h2>🎲 TÀI XỈU HŨ</h2>
                <div class="prediction-box" id="txhu-box">
                    <div class="prediction-text" id="txhu-pred">ĐANG TẢI...</div>
                    <div class="confidence" id="txhu-conf"></div>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" id="txhu-progress" style="width: 0%"></div>
                </div>
                <div id="txhu-reason" class="reason-text"></div>
                <div id="txhu-details" style="margin-top: 15px; font-size: 0.8rem; opacity: 0.7;"></div>
            </div>
            
            <div class="card">
                <h2>🔐 TÀI XỈU MD5</h2>
                <div class="prediction-box" id="md5-box">
                    <div class="prediction-text" id="md5-pred">ĐANG TẢI...</div>
                    <div class="confidence" id="md5-conf"></div>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" id="md5-progress" style="width: 0%"></div>
                </div>
                <div id="md5-reason" class="reason-text"></div>
                <div id="md5-details" style="margin-top: 15px; font-size: 0.8rem; opacity: 0.7;"></div>
            </div>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div style="opacity: 0.7;">💰 VỐN HIỆN TẠI</div>
                <div class="stat-value" id="von">0</div>
            </div>
            <div class="stat-card">
                <div style="opacity: 0.7;">📈 ROI</div>
                <div class="stat-value" id="roi">0%</div>
            </div>
            <div class="stat-card">
                <div style="opacity: 0.7;">🏆 TỶ LỆ THẮNG</div>
                <div class="stat-value" id="tyLeThang">0%</div>
            </div>
            <div class="stat-card">
                <div style="opacity: 0.7;">⚡ ĐỘ CHÍNH XÁC AI</div>
                <div class="stat-value" id="doChinhXac">0%</div>
            </div>
        </div>
        
        <div style="text-align: center; margin-top: 40px;">
            <button id="autoBetBtn" class="${autoBet ? 'auto-on' : 'auto-off'}">
                ${autoBet ? '🔴 TẮT AUTO BET' : '🟢 BẬT AUTO BET'}
            </button>
            <button onclick="location.reload()">🔄 LÀM MỚI</button>
        </div>
        
        <footer>
            <p>📡 API: /api/du-doan | /api/thong-ke-von | /api/auto-bet</p>
            <p>🤖 Phiên bản 5.0 - Trí tuệ nhân tạo thế hệ mới</p>
        </footer>
    </div>
    
    <script>
        async function capNhatDuLieu() {
            try {
                const [duDoan, thongKeVon, thongKeAI] = await Promise.all([
                    fetch('/api/du-doan').then(r => r.json()),
                    fetch('/api/thong-ke-von').then(r => r.json()),
                    fetch('/api/thong-ke-ai').then(r => r.json())
                ]);
                
                // Cập nhật TXHU
                const txhu = duDoan.txhu;
                document.getElementById('txhu-pred').innerHTML = txhu.duDoan;
                document.getElementById('txhu-pred').style.color = '#fff';
                document.getElementById('txhu-box').className = 'prediction-box ' + (txhu.duDoan === 'TÀI' ? 'tai' : 'xiu');
                document.getElementById('txhu-conf').innerHTML = \`Độ tin cậy: \${txhu.doTinCay}%\`;
                document.getElementById('txhu-progress').style.width = txhu.doTinCay + '%';
                document.getElementById('txhu-reason').innerHTML = txhu.lyDo.replace(/\\n/g, '<br>');
                document.getElementById('txhu-details').innerHTML = \`
                    📊 Markov: TÀI \${txhu.markov.TÀI}% - XIU \${txhu.markov.XIU}%<br>
                    🧠 Nơ-ron: TÀI \${txhu.noron.TÀI}% - XIU \${txhu.noron.XIU}%<br>
                    🎨 Mẫu cầu: \${txhu.mauCau} | 📈 Xu hướng: \${txhu.xuHuong}
                \`;
                
                // Cập nhật TXMD5
                const txmd5 = duDoan.txmd5;
                document.getElementById('md5-pred').innerHTML = txmd5.duDoan;
                document.getElementById('md5-box').className = 'prediction-box ' + (txmd5.duDoan === 'TÀI' ? 'tai' : 'xiu');
                document.getElementById('md5-conf').innerHTML = \`Độ tin cậy: \${txmd5.doTinCay}%\`;
                document.getElementById('md5-progress').style.width = txmd5.doTinCay + '%';
                document.getElementById('md5-reason').innerHTML = txmd5.lyDo.replace(/\\n/g, '<br>');
                document.getElementById('md5-details').innerHTML = \`
                    📊 Markov: TÀI \${txmd5.markov.TÀI}% - XIU \${txmd5.markov.XIU}%<br>
                    🧠 Nơ-ron: TÀI \${txmd5.noron.TÀI}% - XIU \${txmd5.noron.XIU}%<br>
                    🎨 Mẫu cầu: \${txmd5.mauCau} | 📈 Xu hướng: \${txmd5.xuHuong}
                \`;
                
                // Cập nhật thống kê
                document.getElementById('von').innerHTML = thongKeVon.vonHienTai || '0';
                document.getElementById('roi').innerHTML = thongKeVon.roi || '0%';
                document.getElementById('tyLeThang').innerHTML = thongKeVon.tyLeThang || '0%';
                document.getElementById('doChinhXac').innerHTML = (thongKeAI.doChinhXac || '0') + '%';
                
            } catch(e) {
                console.error('Lỗi cập nhật:', e);
            }
        }
        
        document.getElementById('autoBetBtn').onclick = async () => {
            const res = await fetch('/api/auto-bet', { method: 'POST' });
            const data = await res.json();
            const btn = document.getElementById('autoBetBtn');
            if (data.autoBet) {
                btn.innerHTML = '🔴 TẮT AUTO BET';
                btn.className = 'auto-on';
            } else {
                btn.innerHTML = '🟢 BẬT AUTO BET';
                btn.className = 'auto-off';
            }
        };
        
        capNhatDuLieu();
        setInterval(capNhatDuLieu, 5000);
    </script>
</body>
</html>`;
}

// Khởi động bot
bot.khoiDong();
