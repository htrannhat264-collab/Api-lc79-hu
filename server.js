const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');

// ═══════════════════════════════════════════════════════════════════════════
// CẤU HÌNH
// ═══════════════════════════════════════════════════════════════════════════
const CONFIG = {
    TOKEN_HEX: "010000687b22636f6465223a3230302c22737973223a7b22686561727462656174223a31352c2273657269616c697a657222",
    WS_URL: "wss://mtsahwkvbim09mnwv.cq.qnwxdhwica.com/",
    LANDING_URL: "https://68gbvn88.bar",
    PORT: parseInt(process.env.PORT || "8080"),
    HEARTBEAT_INTERVAL: 15000
};

// ═══════════════════════════════════════════════════════════════════════════
// TRÍ TUỆ NHÂN TẠO - DỰ ĐOÁN THÔNG MINH
// ═══════════════════════════════════════════════════════════════════════════
class AIPredictor {
    constructor() {
        this.lichSuDuDoan = {
            txhu: [],
            txmd5: []
        };
    }

    // Dự đoán dựa trên lịch sử
    duDoan(lichSu, loaiGame) {
        if (!lichSu || lichSu.length < 3) {
            return {
                duDoan: 'TÀI',
                doTinCay: 60,
                lyDo: '⏳ Đang thu thập dữ liệu...',
                phienTruoc: null,
                markov: { TÀI: 50, XIU: 50 },
                nhanDienCau: 'Chưa đủ dữ liệu',
                cauDacBiet: null
            };
        }

        // Lấy 10 phiên gần nhất
        const ganDay = lichSu.slice(-10);
        const taiGanDay = ganDay.filter(r => r['kết quả'] === 'TÀI').length;
        const xiuGanDay = 10 - taiGanDay;
        
        // Lấy 5 phiên gần nhất để phân tích cầu
        const namCuoi = lichSu.slice(-5);
        const taiNamCuoi = namCuoi.filter(r => r['kết quả'] === 'TÀI').length;
        const xiuNamCuoi = 5 - taiNamCuoi;
        
        // PHÂN TÍCH CẦU (PATTERN RECOGNITION)
        let nhanDienCau = '';
        let doTinCayBoSung = 0;
        let cauDacBiet = null;
        
        // 1. Kiểm tra cầu bệt (ra liên tiếp)
        let chuoiLienTiep = 1;
        for (let i = lichSu.length - 2; i >= 0; i--) {
            if (lichSu[i]['kết quả'] === lichSu[lichSu.length - 1]['kết quả']) {
                chuoiLienTiep++;
            } else break;
        }
        
        if (chuoiLienTiep >= 4) {
            const loaiCau = lichSu[lichSu.length - 1]['kết quả'];
            nhanDienCau = `🔥 CẦU BỆT ${chuoiLienTiep} ${loaiCau}`;
            doTinCayBoSung = 15;
            cauDacBiet = { loai: 'BỆT', soPhien: chuoiLienTiep, ketQua: loaiCau };
        }
        
        // 2. Kiểm tra cầu 1-1 (đan xen)
        else if (lichSu.length >= 6) {
            let laCau11 = true;
            for (let i = lichSu.length - 5; i < lichSu.length - 1; i++) {
                if (lichSu[i]['kết quả'] === lichSu[i+1]['kết quả']) {
                    laCau11 = false;
                    break;
                }
            }
            if (laCau11) {
                nhanDienCau = '🔄 CẦU 1-1 ĐAN XEN';
                doTinCayBoSung = 12;
                const tiepTheo = lichSu[lichSu.length - 1]['kết quả'] === 'TÀI' ? 'XIỦ' : 'TÀI';
                cauDacBiet = { loai: '1-1', tiepTheo: tiepTheo };
            }
        }
        
        // 3. Kiểm tra cầu 2-1
        else if (lichSu.length >= 6) {
            const baCuoi = lichSu.slice(-3);
            if (baCuoi[0]['kết quả'] === baCuoi[1]['kết quả'] && 
                baCuoi[1]['kết quả'] !== baCuoi[2]['kết quả']) {
                nhanDienCau = '📊 CẦU 2-1 (Kép rồi đảo)';
                doTinCayBoSung = 10;
                cauDacBiet = { loai: '2-1', ketQua: baCuoi[2]['kết quả'] };
            }
        }
        
        // 4. Kiểm tra cầu 1-2
        else if (lichSu.length >= 6) {
            const baCuoi = lichSu.slice(-3);
            if (baCuoi[0]['kết quả'] !== baCuoi[1]['kết quả'] && 
                baCuoi[1]['kết quả'] === baCuoi[2]['kết quả']) {
                nhanDienCau = '📊 CẦU 1-2 (Đảo rồi kép)';
                doTinCayBoSung = 10;
                cauDacBiet = { loai: '1-2', ketQua: baCuoi[2]['kết quả'] };
            }
        }
        
        // 5. Phân tích xu hướng
        let xuHuong = '';
        if (taiGanDay >= 7) xuHuong = '📈 TÀI ĐANG ÁP ĐẢO';
        else if (xiuGanDay >= 7) xuHuong = '📉 XIỦ ĐANG ÁP ĐẢO';
        else if (taiGanDay >= 6) xuHuong = '📈 TÀI ĐANG LÊN';
        else if (xiuGanDay >= 6) xuHuong = '📉 XIỦ ĐANG LÊN';
        else xuHuong = '⚖️ CÂN BẰNG';
        
        // THUẬT TOÁN MARKOV CHAIN (xác suất chuyển tiếp)
        let markov = { TÀI: 50, XIU: 50 };
        if (lichSu.length >= 4) {
            const last2 = `${lichSu[lichSu.length-2]['kết quả']}|${lichSu[lichSu.length-1]['kết quả']}`;
            const dem = { TÀI: 0, XIU: 0 };
            for (let i = 0; i < lichSu.length - 2; i++) {
                const state = `${lichSu[i]['kết quả']}|${lichSu[i+1]['kết quả']}`;
                if (state === last2) {
                    dem[lichSu[i+2]['kết quả']]++;
                }
            }
            const tong = dem.TÀI + dem.XIU;
            if (tong > 0) {
                markov = {
                    TÀI: Math.round(dem.TÀI / tong * 100),
                    XIU: Math.round(dem.XIU / tong * 100)
                };
            }
        }
        
        // TÍNH ĐỘ TIN CẬY CUỐI CÙNG
        let doTinCay = Math.round((Math.max(taiNamCuoi, xiuNamCuoi) / 5) * 70) + 20;
        doTinCay = Math.min(doTinCay + doTinCayBoSung, 98);
        
        // DỰ ĐOÁN CUỐI CÙNG
        let duDoan = '';
        if (cauDacBiet?.loai === '1-1') {
            duDoan = cauDacBiet.tiepTheo;
            doTinCay = Math.min(doTinCay + 10, 95);
        } else if (cauDacBiet?.loai === 'BỆT') {
            duDoan = cauDacBiet.ketQua;
            doTinCay = Math.min(doTinCay + 15, 95);
        } else if (markov.TÀI > markov.XIU + 20) {
            duDoan = 'TÀI';
        } else if (markov.XIU > markov.TÀI + 20) {
            duDoan = 'XIỦ';
        } else {
            duDoan = taiNamCuoi >= xiuNamCuoi ? 'TÀI' : 'XIỦ';
        }
        
        // TẠO LÝ DO CHI TIẾT
        let lyDo = `🎯 Dự đoán: ${duDoan} (${doTinCay}% tin cậy)\n`;
        lyDo += `📊 10 phiên gần: ${taiGanDay} TÀI - ${xiuGanDay} XIỦ\n`;
        lyDo += `📈 5 phiên cuối: ${taiNamCuoi} TÀI - ${xiuNamCuoi} XIỦ\n`;
        lyDo += `🎲 Markov: TÀI ${markov.TÀI}% - XIU ${markov.XIU}%\n`;
        lyDo += `🎨 Nhận diện: ${nhanDienCau || 'Cầu hỗn hợp'}\n`;
        lyDo += `📉 Xu hướng: ${xuHuong}`;
        
        return {
            duDoan: duDoan,
            doTinCay: doTinCay,
            lyDo: lyDo,
            phienTruoc: lichSu[lichSu.length - 1] || null,
            markov: markov,
            nhanDienCau: nhanDienCau || 'Cầu hỗn hợp',
            xuHuong: xuHuong,
            cauDacBiet: cauDacBiet,
            thongKe: {
                tongPhien: lichSu.length,
                tiLeTai: (lichSu.filter(r => r['kết quả'] === 'TÀI').length / lichSu.length * 100).toFixed(1),
                tiLeXiu: (lichSu.filter(r => r['kết quả'] === 'XIỦ').length / lichSu.length * 100).toFixed(1),
                chuoiLienTiep: chuoiLienTiep
            }
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// BOT UNIFIED
// ═══════════════════════════════════════════════════════════════════════════
class Bot68GB {
    constructor(shared) {
        this.shared = shared;
        this.ws = null;
        this.isAlive = false;
        this.ai = new AIPredictor();
        this.txhu = {
            last_result: null,
            history: [],
            duDoan: null
        };
        this.md5 = {
            last_result: null,
            history: [],
            duDoan: null
        };
    }

    run(landingUrl) {
        this.connect();
    }

    connect() {
        console.log(`🔌 Đang kết nối tới ${CONFIG.WS_URL}...`);
        
        this.ws = new WebSocket(CONFIG.WS_URL);
        
        this.ws.on('open', () => {
            console.log('✅ Kết nối WebSocket thành công!');
            this.isAlive = true;
            this.ws.send(this.shared.PKT_HANDSHAKE);
            
            setTimeout(() => {
                if (this.shared.PKT_AUTH && this.shared.PKT_AUTH.length > 0) {
                    this.ws.send(this.shared.PKT_AUTH);
                    console.log('🔐 Đã gửi xác thực');
                }
            }, 1000);
            
            setInterval(() => {
                if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                    this.ws.send(this.shared.PKT_HEARTBEAT);
                }
            }, CONFIG.HEARTBEAT_INTERVAL);
        });
        
        this.ws.on('message', (data) => this.handleMessage(data));
        
        this.ws.on('close', () => {
            console.log('❌ Mất kết nối');
            this.isAlive = false;
            setTimeout(() => this.connect(), 3000);
        });
        
        this.ws.on('error', (err) => {
            console.error('Lỗi WebSocket:', err.message);
        });
    }

    handleMessage(data) {
        try {
            const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
            const msgType = buffer.readUInt8(0);
            
            if (msgType === 0x04) {
                const jsonStr = buffer.slice(1).toString('utf8');
                const parsed = JSON.parse(jsonStr);
                
                // Xử lý TXHU
                if (parsed.type === 'txhu' && parsed.result) {
                    const result = {
                        'Phiên trước': parsed.session || ('TXHU' + Date.now().toString().slice(-6)),
                        'kết quả': parsed.result,
                        'xúc xắc 1': parsed.dice1,
                        'xúc xắc 2': parsed.dice2,
                        'xúc xắc 3': parsed.dice3,
                        'tổng': parsed.dice1 + parsed.dice2 + parsed.dice3,
                        'thời gian': new Date().toLocaleString('vi-VN')
                    };
                    this.txhu.last_result = result;
                    this.txhu.history.unshift(result);
                    if (this.txhu.history.length > 100) this.txhu.history.pop();
                    
                    // Cập nhật dự đoán mới dựa trên lịch sử
                    this.txhu.duDoan = this.ai.duDoan(this.txhu.history, 'txhu');
                    
                    console.log(`\n🎲 [TXHU] Phiên: ${result['Phiên trước']} | ${result['kết quả']} | ${result['xúc xắc 1']}-${result['xúc xắc 2']}-${result['xúc xắc 3']}`);
                    console.log(`🤖 Dự đoán phiên tiếp: ${this.txhu.duDoan.duDoan} (${this.txhu.duDoan.doTinCay}%)`);
                }
                
                // Xử lý TXMD5
                if (parsed.type === 'txmd5' && parsed.result) {
                    const result = {
                        'Phiên trước': parsed.session || ('MD5' + Date.now().toString().slice(-5)),
                        'kết quả': parsed.result,
                        'xúc xắc 1': parsed.dice1,
                        'xúc xắc 2': parsed.dice2,
                        'xúc xắc 3': parsed.dice3,
                        'tổng': parsed.dice1 + parsed.dice2 + parsed.dice3,
                        'thời gian': new Date().toLocaleString('vi-VN')
                    };
                    this.md5.last_result = result;
                    this.md5.history.unshift(result);
                    if (this.md5.history.length > 100) this.md5.history.pop();
                    
                    // Cập nhật dự đoán mới
                    this.md5.duDoan = this.ai.duDoan(this.md5.history, 'txmd5');
                    
                    console.log(`\n🎲 [TXMD5] Phiên: ${result['Phiên trước']} | ${result['kết quả']} | ${result['xúc xắc 1']}-${result['xúc xắc 2']}-${result['xúc xắc 3']}`);
                    console.log(`🤖 Dự đoán phiên tiếp: ${this.md5.duDoan.duDoan} (${this.md5.duDoan.doTinCay}%)`);
                }
            }
        } catch (err) {
            // Bỏ qua lỗi
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// KHỞI TẠO
// ═══════════════════════════════════════════════════════════════════════════
const shared = {
    WS_URL: CONFIG.WS_URL,
    PKT_HANDSHAKE: Buffer.from('010000727b22737973223a7b22706c6174666f726d223a226a732d776562736f636b6574222c22636c69656e744275696c644e756d626572223a22302e302e31222c22636c69656e7456657273696f6e223a223061323134383164373436663932663834323865316236646565623736666561227d7d', 'hex'),
    PKT_HANDSHAKE_ACK: Buffer.from('02000000', 'hex'),
    PKT_HEARTBEAT: Buffer.from('03000000', 'hex'),
    PKT_AUTH: Buffer.from(CONFIG.TOKEN_HEX, 'hex'),
    SESSION_READY: true
};

const bot = new Bot68GB(shared);

// ═══════════════════════════════════════════════════════════════════════════
// HTTP SERVER - ĐẦY ĐỦ API
// ═══════════════════════════════════════════════════════════════════════════
const server = http.createServer((req, res) => {
    const cors = (code, data, type = 'application/json') => {
        res.writeHead(code, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Content-Type': `${type}; charset=utf-8`
        });
        res.end(typeof data === 'string' ? data : JSON.stringify(data, null, 2));
    };
    
    if (req.method === 'OPTIONS') {
        cors(200, 'OK');
        return;
    }
    
    const url = req.url;
    
    // ==================== API CŨ (GIỮ NGUYÊN) ====================
    
    if (req.method === 'POST' && url === '/api/token') {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const hex = data.token.replace(/b'|'|\\x| /g, "");
                shared.PKT_AUTH = Buffer.from(hex, 'hex');
                fs.writeFileSync('token_shared.bin', shared.PKT_AUTH);
                shared.SESSION_READY = true;
                if (bot.ws) bot.ws.close();
                else bot.run(CONFIG.LANDING_URL);
                cors(200, { status: "ok", message: "Đã cập nhật token" });
            } catch (e) { 
                cors(400, { error: e.message }); 
            }
        });
    }
    
    // API TXHU - TRẢ VỀ PHIÊN TRƯỚC + KẾT QUẢ
    else if (url === '/api/68gb/txhu') {
        const response = bot.txhu.last_result || { 
            error: "Chưa có dữ liệu", 
            message: "Đang chờ kết quả từ game...",
            'Phiên trước': 'Đang chờ',
            'kết quả': '???',
            'xúc xắc 1': '?',
            'xúc xắc 2': '?',
            'xúc xắc 3': '?'
        };
        cors(200, response);
    }
    
    // API lịch sử TXHU
    else if (url === '/api/68gb/history/txhu') {
        cors(200, bot.txhu.history.slice().reverse());
    }
    
    // API TXMD5
    else if (url === '/api/68gb/txmd5' || url === '/api/data') {
        const response = bot.md5.last_result || {
            error: "Chưa có dữ liệu",
            'Phiên trước': 'Đang chờ',
            'kết quả': '???',
            'xúc xắc 1': '?',
            'xúc xắc 2': '?',
            'xúc xắc 3': '?'
        };
        cors(200, response);
    }
    
    // API lịch sử TXMD5
    else if (url === '/api/68gb/history/txmd5' || url === '/api/history') {
        cors(200, bot.md5.history.slice().reverse());
    }
    
    // ==================== API DỰ ĐOÁN MỚI ====================
    
    // API dự đoán cho TXHU
    else if (url === '/api/predict/txhu') {
        const duDoan = bot.txhu.duDoan || bot.ai.duDoan(bot.txhu.history, 'txhu');
        cors(200, {
            game: 'TXHU',
            duDoan: duDoan,
            phiênHiệnTại: bot.txhu.last_result,
            thoiGian: new Date().toISOString()
        });
    }
    
    // API dự đoán cho TXMD5
    else if (url === '/api/predict/txmd5') {
        const duDoan = bot.md5.duDoan || bot.ai.duDoan(bot.md5.history, 'txmd5');
        cors(200, {
            game: 'TXMD5',
            duDoan: duDoan,
            phiênHiệnTại: bot.md5.last_result,
            thoiGian: new Date().toISOString()
        });
    }
    
    // API dự đoán tổng hợp (cả 2 game)
    else if (url === '/api/du-doan' || url === '/api/predict') {
        cors(200, {
            txhu: bot.txhu.duDoan || bot.ai.duDoan(bot.txhu.history, 'txhu'),
            txmd5: bot.md5.duDoan || bot.ai.duDoan(bot.md5.history, 'txmd5'),
            timestamp: Date.now(),
            thoiGian: new Date().toLocaleString('vi-VN')
        });
    }
    
    // API dự đoán SIÊU CẤP (chi tiết hơn)
    else if (url === '/api/super-predict') {
        const txhuDuDoan = bot.txhu.duDoan || bot.ai.duDoan(bot.txhu.history, 'txhu');
        const txmd5DuDoan = bot.md5.duDoan || bot.ai.duDoan(bot.md5.history, 'txmd5');
        
        cors(200, {
            txhu: {
                duDoan: txhuDuDoan.duDoan,
                doTinCay: txhuDuDoan.doTinCay,
                lyDo: txhuDuDoan.lyDo,
                phienTruoc: bot.txhu.last_result,
                markov: txhuDuDoan.markov,
                nhanDienCau: txhuDuDoan.nhanDienCau,
                xuHuong: txhuDuDoan.xuHuong,
                thongKe: txhuDuDoan.thongKe
            },
            txmd5: {
                duDoan: txmd5DuDoan.duDoan,
                doTinCay: txmd5DuDoan.doTinCay,
                lyDo: txmd5DuDoan.lyDo,
                phienTruoc: bot.md5.last_result,
                markov: txmd5DuDoan.markov,
                nhanDienCau: txmd5DuDoan.nhanDienCau,
                xuHuong: txmd5DuDoan.xuHuong,
                thongKe: txmd5DuDoan.thongKe
            },
            timestamp: Date.now()
        });
    }
    
    // API thống kê
    else if (url === '/api/stats') {
        cors(200, {
            txhu: {
                tongPhien: bot.txhu.history.length,
                ganDay: bot.txhu.history.slice(0, 10),
                tiLeTai: bot.txhu.history.length > 0 ? 
                    (bot.txhu.history.filter(r => r['kết quả'] === 'TÀI').length / bot.txhu.history.length * 100).toFixed(1) : 0
            },
            txmd5: {
                tongPhien: bot.md5.history.length,
                ganDay: bot.md5.history.slice(0, 10),
                tiLeTai: bot.md5.history.length > 0 ?
                    (bot.md5.history.filter(r => r['kết quả'] === 'TÀI').length / bot.md5.history.length * 100).toFixed(1) : 0
            }
        });
    }
    
    // Health check
    else if (url === '/health') {
        cors(200, {
            status: 'ok',
            timestamp: Date.now(),
            bot: bot.isAlive ? 'running' : 'connecting',
            txhu_connected: !!bot.txhu.last_result,
            txmd5_connected: !!bot.md5.last_result,
            txhu_phienCuoi: bot.txhu.last_result?.phiên || null,
            txmd5_phienCuoi: bot.md5.last_result?.phiên || null
        });
    }
    
    // Dashboard
    else if (url === '/' || url === '/index.html') {
        cors(200, getDashboardHTML(bot), 'text/html');
    }
    
    else {
        cors(404, { 
            error: "Not Found",
            message: "API không tồn tại",
            available_apis: [
                "/api/68gb/txhu - Kết quả TXHU mới nhất (có phiên trước)",
                "/api/68gb/history/txhu - Lịch sử TXHU",
                "/api/68gb/txmd5 - Kết quả TXMD5 mới nhất",
                "/api/68gb/history/txmd5 - Lịch sử TXMD5",
                "/api/du-doan - Dự đoán cho cả 2 game",
                "/api/super-predict - Dự đoán siêu cấp chi tiết",
                "/api/predict/txhu - Dự đoán riêng TXHU",
                "/api/predict/txmd5 - Dự đoán riêng TXMD5",
                "/api/stats - Thống kê",
                "/api/token - Cập nhật token (POST)",
                "/health - Kiểm tra sức khỏe"
            ]
        });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD HTML
// ═══════════════════════════════════════════════════════════════════════════
function getDashboardHTML(bot) {
    return `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>68GB BOT - Dự Đoán Tài Xỉu AI</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            background: linear-gradient(135deg, #0a0f1e 0%, #0a0a1a 100%);
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #fff;
            min-height: 100vh;
            padding: 20px;
        }
        .container { max-width: 1300px; margin: 0 auto; }
        h1 { text-align: center; margin-bottom: 10px; font-size: 2rem; background: linear-gradient(135deg, #f093fb, #f5576c); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .sub { text-align: center; margin-bottom: 30px; opacity: 0.7; }
        .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 25px; }
        .card {
            background: rgba(255,255,255,0.05);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 25px;
            border: 1px solid rgba(255,255,255,0.1);
        }
        .card h2 { margin-bottom: 20px; color: #f093fb; border-left: 3px solid #f093fb; padding-left: 15px; }
        .result-box {
            background: rgba(0,0,0,0.3);
            border-radius: 15px;
            padding: 20px;
            margin-bottom: 20px;
            text-align: center;
        }
        .phien {
            font-family: monospace;
            font-size: 0.9rem;
            color: #a0aec0;
            margin-bottom: 10px;
        }
        .ketqua {
            font-size: 3rem;
            font-weight: bold;
            padding: 15px;
            border-radius: 15px;
            display: inline-block;
            min-width: 200px;
        }
        .tai { background: linear-gradient(135deg, #f56565, #ed64a6); }
        .xiu { background: linear-gradient(135deg, #4299e1, #667eea); }
        .xucxac { font-size: 1.5rem; margin: 15px 0; letter-spacing: 10px; }
        .du-doan-box {
            background: rgba(255,255,255,0.05);
            border-radius: 15px;
            padding: 15px;
            margin-top: 15px;
        }
        .du-doan-title { color: #fbbf24; font-weight: bold; margin-bottom: 10px; }
        .du-doan-ketqua { font-size: 2rem; font-weight: bold; display: inline-block; padding: 5px 20px; border-radius: 10px; margin: 10px 0; }
        .tin-cay { 
            background: #2d3748;
            border-radius: 10px;
            height: 8px;
            overflow: hidden;
            margin: 10px 0;
        }
        .tin-cay-fill { height: 100%; background: linear-gradient(90deg, #48bb78, #38b2ac); width: 0%; transition: width 0.5s; }
        .lydo { font-size: 0.8rem; opacity: 0.8; margin-top: 10px; white-space: pre-line; }
        button {
            background: linear-gradient(135deg, #667eea, #764ba2);
            border: none;
            padding: 10px 25px;
            border-radius: 10px;
            color: white;
            cursor: pointer;
            margin-top: 20px;
            font-size: 1rem;
        }
        button:hover { transform: scale(1.02); }
        .api-list { margin-top: 30px; text-align: center; padding: 20px; background: rgba(0,0,0,0.2); border-radius: 15px; }
        .api-list a { color: #a0aec0; text-decoration: none; margin: 0 10px; font-size: 0.8rem; }
        .api-list a:hover { color: #f093fb; }
        .live { display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #48bb78; margin-right: 8px; animation: pulse 2s infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        footer { text-align: center; margin-top: 40px; opacity: 0.5; font-size: 0.8rem; }
        @media (max-width: 768px) { .grid { grid-template-columns: 1fr; } }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎲 68GB SIÊU BOT - DỰ ĐOÁN AI 🎲</h1>
        <div class="sub"><span class="live"></span> Hệ thống dự đoán Tài Xỉu bằng Trí tuệ Nhân tạo</div>
        
        <div class="grid">
            <!-- TXHU CARD -->
            <div class="card">
                <h2>🎯 TÀI XỈU HŨ</h2>
                <div class="result-box">
                    <div class="phien" id="txhu-phien">Phiên: ---</div>
                    <div class="ketqua" id="txhu-ketqua">---</div>
                    <div class="xucxac" id="txhu-xucxac">⚀ ⚀ ⚀</div>
                </div>
                <div class="du-doan-box">
                    <div class="du-doan-title">🤖 DỰ ĐOÁN PHIÊN TIẾP THEO</div>
                    <div class="du-doan-ketqua" id="txhu-dudoan">---</div>
                    <div class="tin-cay"><div class="tin-cay-fill" id="txhu-tincay"></div></div>
                    <div class="lydo" id="txhu-lydo"></div>
                </div>
            </div>
            
            <!-- TXMD5 CARD -->
            <div class="card">
                <h2>🔐 TÀI XỈU MD5</h2>
                <div class="result-box">
                    <div class="phien" id="md5-phien">Phiên: ---</div>
                    <div class="ketqua" id="md5-ketqua">---</div>
                    <div class="xucxac" id="md5-xucxac">⚀ ⚀ ⚀</div>
                </div>
                <div class="du-doan-box">
                    <div class="du-doan-title">🤖 DỰ ĐOÁN PHIÊN TIẾP THEO</div>
                    <div class="du-doan-ketqua" id="md5-dudoan">---</div>
                    <div class="tin-cay"><div class="tin-cay-fill" id="md5-tincay"></div></div>
                    <div class="lydo" id="md5-lydo"></div>
                </div>
            </div>
        </div>
        
        <div style="text-align: center;">
            <button onclick="location.reload()">🔄 LÀM MỚI DỮ LIỆU</button>
        </div>
        
        <div class="api-list">
            <strong>📡 API CÓ SẴN</strong><br>
            <a href="/api/68gb/txhu">📊 Kết quả TXHU</a>
            <a href="/api/68gb/txmd5">📊 Kết quả TXMD5</a>
            <a href="/api/du-doan">🎯 Dự đoán</a>
            <a href="/api/super-predict">⚡ Dự đoán siêu cấp</a>
            <a href="/api/stats">📈 Thống kê</a>
            <a href="/health">💚 Health</a>
        </div>
        
        <footer>
            🤖 Phiên bản 5.0 | Thuật toán Markov Chain + Nhận diện cầu | Tối ưu cho Render
        </footer>
    </div>
    
    <script>
        async function loadData() {
            try {
                // Gọi API dự đoán siêu cấp
                const predictRes = await fetch('/api/super-predict');
                const data = await predictRes.json();
                
                // Cập nhật TXHU
                if (data.txhu) {
                    // Kết quả hiện tại
                    if (data.txhu.phienTruoc) {
                        document.getElementById('txhu-phien').innerHTML = \`Phiên: #\${data.txhu.phienTruoc['Phiên trước'] || '???'}\`;
                        document.getElementById('txhu-ketqua').innerHTML = data.txhu.phienTruoc['kết quả'] || '???';
                        document.getElementById('txhu-ketqua').className = \`ketqua \${data.txhu.phienTruoc['kết quả'] === 'TÀI' ? 'tai' : 'xiu'}\`;
                        const d1 = data.txhu.phienTruoc['xúc xắc 1'] || '?';
                        const d2 = data.txhu.phienTruoc['xúc xắc 2'] || '?';
                        const d3 = data.txhu.phienTruoc['xúc xắc 3'] || '?';
                        document.getElementById('txhu-xucxac').innerHTML = \`🎲 \${d1} - \${d2} - \${d3}\`;
                    }
                    
                    // Dự đoán
                    document.getElementById('txhu-dudoan').innerHTML = data.txhu.duDoan || 'TÀI';
                    document.getElementById('txhu-dudoan').className = \`du-doan-ketqua \${data.txhu.duDoan === 'TÀI' ? 'tai' : 'xiu'}\`;
                    document.getElementById('txhu-tincay').style.width = (data.txhu.doTinCay || 60) + '%';
                    document.getElementById('txhu-lydo').innerHTML = (data.txhu.lyDo || 'Đang phân tích...').replace(/\\n/g, '<br>');
                }
                
                // Cập nhật TXMD5
                if (data.txmd5) {
                    if (data.txmd5.phienTruoc) {
                        document.getElementById('md5-phien').innerHTML = \`Phiên: #\${data.txmd5.phienTruoc['Phiên trước'] || '???'}\`;
                        document.getElementById('md5-ketqua').innerHTML = data.txmd5.phienTruoc['kết quả'] || '???';
                        document.getElementById('md5-ketqua').className = \`ketqua \${data.txmd5.phienTruoc['kết quả'] === 'TÀI' ? 'tai' : 'xiu'}\`;
                        const d1 = data.txmd5.phienTruoc['xúc xắc 1'] || '?';
                        const d2 = data.txmd5.phienTruoc['xúc xắc 2'] || '?';
                        const d3 = data.txmd5.phienTruoc['xúc xắc 3'] || '?';
                        document.getElementById('md5-xucxac').innerHTML = \`🎲 \${d1} - \${d2} - \${d3}\`;
                    }
                    
                    document.getElementById('md5-dudoan').innerHTML = data.txmd5.duDoan || 'TÀI';
                    document.getElementById('md5-dudoan').className = \`du-doan-ketqua \${data.txmd5.duDoan === 'TÀI' ? 'tai' : 'xiu'}\`;
                    document.getElementById('md5-tincay').style.width = (data.txmd5.doTinCay || 60) + '%';
                    document.getElementById('md5-lydo').innerHTML = (data.txmd5.lyDo || 'Đang phân tích...').replace(/\\n/g, '<br>');
                }
            } catch(e) {
                console.error('Lỗi tải dữ liệu:', e);
            }
        }
        
        loadData();
        setInterval(loadData, 5000);
    </script>
</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════════════════
// KHỞI ĐỘNG
// ═══════════════════════════════════════════════════════════════════════════
server.listen(CONFIG.PORT, '0.0.0.0', () => {
    console.log(`
╔══════════════════════════════════════════════════════════════════════════╗
║                                                                            ║
║     🚀 68GB SIÊU BOT - ĐÃ SẴN SÀNG TRÊN PORT ${CONFIG.PORT} 🚀               ║
║                                                                            ║
╠══════════════════════════════════════════════════════════════════════════╣
║  📡 API:                                                                  ║
║     🎯 /api/68gb/txhu        → Kết quả TXHU (Có phiên trước)             ║
║     🎯 /api/68gb/txmd5       → Kết quả TXMD5 (Có phiên trước)            ║
║     🤖 /api/du-doan          → Dự đoán cho cả 2 game                      ║
║     ⚡ /api/super-predict    → Dự đoán siêu cấp chi tiết                  ║
║     📊 /api/stats            → Thống kê                                   ║
║     💚 /health               → Kiểm tra sức khỏe                          ║
║                                                                            ║
║  🌐 DASHBOARD: http://localhost:${CONFIG.PORT}                                ║
║  🤖 BOT: ${bot.isAlive ? '🟢 ĐANG CHẠY' : '🟡 ĐANG KẾT NỐI'}                                      ║
║                                                                            ║
╚══════════════════════════════════════════════════════════════════════════╝
    `);
    
    bot.run(CONFIG.LANDING_URL);
});
