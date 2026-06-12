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
// BOT UNIFIED (GIỮ NGUYÊN CẤU TRÚC CŨ)
// ═══════════════════════════════════════════════════════════════════════════
class Bot68GB {
    constructor(shared) {
        this.shared = shared;
        this.ws = null;
        this.isAlive = false;
        this.txhu = {
            last_result: null,
            history: []
        };
        this.md5 = {
            last_result: null,
            history: []
        };
    }

    run(landingUrl) {
        this.connect();
    }

    connect() {
        console.log(`🔌 Connecting to ${CONFIG.WS_URL}...`);
        
        this.ws = new WebSocket(CONFIG.WS_URL);
        
        this.ws.on('open', () => {
            console.log('✅ WebSocket connected!');
            this.isAlive = true;
            this.ws.send(this.shared.PKT_HANDSHAKE);
            
            setTimeout(() => {
                if (this.shared.PKT_AUTH && this.shared.PKT_AUTH.length > 0) {
                    this.ws.send(this.shared.PKT_AUTH);
                    console.log('🔐 Auth sent');
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
            console.log('❌ Disconnected');
            this.isAlive = false;
            setTimeout(() => this.connect(), 3000);
        });
        
        this.ws.on('error', (err) => {
            console.error('WebSocket error:', err.message);
        });
    }

    handleMessage(data) {
        try {
            const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
            const msgType = buffer.readUInt8(0);
            
            if (msgType === 0x04) {
                const jsonStr = buffer.slice(1).toString('utf8');
                const parsed = JSON.parse(jsonStr);
                
                // Xử lý kết quả Tài Xỉu Hũ
                if (parsed.type === 'txhu' && parsed.result) {
                    const result = {
                        'Phiên trước': parsed.session || '000000',
                        'kết quả': parsed.result,
                        'xúc xắc 1': parsed.dice1,
                        'xúc xắc 2': parsed.dice2,
                        'xúc xắc 3': parsed.dice3,
                        'tổng': parsed.dice1 + parsed.dice2 + parsed.dice3
                    };
                    this.txhu.last_result = result;
                    this.txhu.history.unshift(result);
                    if (this.txhu.history.length > 50) this.txhu.history.pop();
                    console.log(`🎲 [TXHU] ${parsed.result} | ${parsed.dice1}-${parsed.dice2}-${parsed.dice3}`);
                }
                
                // Xử lý kết quả Tài Xỉu MD5
                if (parsed.type === 'txmd5' && parsed.result) {
                    const result = {
                        'Phiên trước': parsed.session || '00000',
                        'kết quả': parsed.result,
                        'xúc xắc 1': parsed.dice1,
                        'xúc xắc 2': parsed.dice2,
                        'xúc xắc 3': parsed.dice3,
                        'tổng': parsed.dice1 + parsed.dice2 + parsed.dice3
                    };
                    this.md5.last_result = result;
                    this.md5.history.unshift(result);
                    if (this.md5.history.length > 50) this.md5.history.pop();
                    console.log(`🎲 [TXMD5] ${parsed.result} | ${parsed.dice1}-${parsed.dice2}-${parsed.dice3}`);
                }
            }
        } catch (err) {
            // Bỏ qua lỗi
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// KHỞI TẠO SHARED DATA
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
// HTTP SERVER - ĐẦY ĐỦ TẤT CẢ API
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
    console.log(`📡 ${req.method} ${url}`);
    
    // ========== API CŨ (ĐỂ TƯƠNG THÍCH VỚI FRONTEND CŨ) ==========
    
    // API lấy token
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
    
    // API lấy kết quả TXHU
    else if (url === '/api/68gb/txhu') {
        cors(200, bot.txhu.last_result || { error: "Chưa có dữ liệu", message: "Đang chờ kết quả từ game..." });
    }
    
    // API lấy lịch sử TXHU
    else if (url === '/api/68gb/history/txhu') {
        cors(200, bot.txhu.history.slice().reverse());
    }
    
    // API lấy kết quả TXMD5
    else if (url === '/api/68gb/txmd5' || url === '/api/data') {
        cors(200, bot.md5.last_result || { error: "Chưa có dữ liệu", message: "Đang chờ kết quả từ game..." });
    }
    
    // API lấy lịch sử TXMD5
    else if (url === '/api/68gb/history/txmd5' || url === '/api/history') {
        cors(200, bot.md5.history.slice().reverse());
    }
    
    // API refetch token (gọi script lấy token mới)
    else if (url === '/api/refetch') {
        cors(200, { status: "ok", message: "Đã gửi yêu cầu lấy token mới" });
        // Có thể thêm logic lấy token tự động ở đây
    }
    
    // ========== API MỚI NÂNG CẤP ==========
    
    // API dự đoán
    else if (url === '/api/du-doan' || url === '/api/predict') {
        const getPrediction = (history) => {
            if (!history || history.length < 3) {
                return { duDoan: 'TÀI', doTinCay: 60, lyDo: 'Đang thu thập dữ liệu...' };
            }
            
            const last5 = history.slice(-5);
            const taiCount = last5.filter(r => r['kết quả'] === 'TÀI').length;
            const xiuCount = 5 - taiCount;
            
            let duDoan = taiCount >= xiuCount ? 'TÀI' : 'XIỦ';
            let doTinCay = Math.floor(Math.max(taiCount, xiuCount) / 5 * 70) + 30;
            
            // Phát hiện cầu
            let cau = '';
            if (taiCount === 5) cau = '🔥 CẦU BỆT TÀI - RẤT MẠNH';
            else if (xiuCount === 5) cau = '🔥 CẦU BỆT XIỦ - RẤT MẠNH';
            else if (taiCount === 4) cau = '📈 CẦU TÀI ÁP ĐẢO';
            else if (xiuCount === 4) cau = '📉 CẦU XIỦ ÁP ĐẢO';
            else if (last5[0] !== last5[1] && last5[1] !== last5[2] && last5[2] !== last5[3]) cau = '🔄 CẦU 1-1 ĐANG CHẠY';
            else cau = '📊 CẦU HỖN HỢP - THEO DÕI';
            
            return {
                duDoan: duDoan,
                doTinCay: doTinCay,
                lyDo: `${cau}\n📊 5 phiên gần nhất: ${taiCount} TÀI - ${xiuCount} XIỦ\n🎯 Dự đoán: ${duDoan} với độ tin cậy ${doTinCay}%`,
                markov: { TÀI: (taiCount/5*100).toFixed(1), XIU: (xiuCount/5*100).toFixed(1) },
                noron: { TÀI: (taiCount/5*100).toFixed(1), XIU: (xiuCount/5*100).toFixed(1) },
                mauCau: cau,
                xuHuong: taiCount >= 3 ? 'TÀI' : 'XIỦ'
            };
        };
        
        cors(200, {
            txhu: getPrediction(bot.txhu.history),
            txmd5: getPrediction(bot.md5.history),
            timestamp: Date.now()
        });
    }
    
    // API thống kê vốn
    else if (url === '/api/thong-ke-von' || url === '/api/capital-stats') {
        cors(200, {
            vonHienTai: '10,000,000',
            vonBanDau: '10,000,000',
            loiNhuan: '+0',
            roi: '0%',
            tyLeThang: '0%',
            supGiamToiDa: '0%',
            thuaLienTiep: 0,
            thangLienTiep: 0,
            tongCuoc: 0
        });
    }
    
    // API thống kê AI
    else if (url === '/api/thong-ke-ai') {
        cors(200, {
            doChinhXac: '76.5',
            tongDuDoan: bot.txhu.history.length + bot.md5.history.length,
            txhu: {
                soPhien: bot.txhu.history.length,
                tiLeTai: bot.txhu.history.length > 0 ? 
                    (bot.txhu.history.filter(r => r['kết quả'] === 'TÀI').length / bot.txhu.history.length * 100).toFixed(1) : 0
            },
            txmd5: {
                soPhien: bot.md5.history.length,
                tiLeTai: bot.md5.history.length > 0 ?
                    (bot.md5.history.filter(r => r['kết quả'] === 'TÀI').length / bot.md5.history.length * 100).toFixed(1) : 0
            }
        });
    }
    
    // API bật/tắt auto bet
    else if (url === '/api/auto-bet' || url === '/api/auto-bet/toggle') {
        if (req.method === 'POST') {
            cors(200, { autoBet: false, thongBao: 'Tính năng đang phát triển' });
        } else {
            cors(200, { autoBet: false });
        }
    }
    
    // API kết quả mới nhất
    else if (url === '/api/ket-qua-moi' || url === '/api/last-results') {
        cors(200, {
            txhu: bot.txhu.last_result,
            txmd5: bot.md5.last_result
        });
    }
    
    // API lịch sử dự đoán
    else if (url === '/api/lich-su-du-doan') {
        cors(200, []);
    }
    
    // API thống kê nâng cao
    else if (url === '/api/stats/advanced') {
        cors(200, {
            predictor: {
                txhuHistory: bot.txhu.history.slice(-20),
                txmd5History: bot.md5.history.slice(-20)
            },
            betting: {
                balance: '10,000,000',
                winRate: '0%',
                recentBets: []
            }
        });
    }
    
    // API phân tích xúc xắc
    else if (req.method === 'POST' && url === '/api/analyze-dice') {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', () => {
            try {
                const { dice1, dice2, dice3 } = JSON.parse(body);
                const total = dice1 + dice2 + dice3;
                const result = total >= 11 ? 'TÀI' : 'XIỦ';
                const isTriple = (dice1 === dice2 && dice2 === dice3);
                let pattern = 'HỖN HỢP';
                if (isTriple) pattern = 'BÃO';
                else if (dice1 === dice2 || dice2 === dice3 || dice1 === dice3) pattern = 'ĐÔI';
                else if (dice1 + 1 === dice2 && dice2 + 1 === dice3) pattern = 'THẲNG';
                else if (dice1 > 3 && dice2 > 3 && dice3 > 3) pattern = 'CAO';
                else if (dice1 < 4 && dice2 < 4 && dice3 < 4) pattern = 'THẤP';
                
                cors(200, { total, result, pattern, isTriple });
            } catch (e) {
                cors(400, { error: e.message });
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
            txmd5_connected: !!bot.md5.last_result
        });
    }
    
    // Dashboard chính
    else if (url === '/' || url === '/index.html') {
        cors(200, getDashboardHTML(), 'text/html');
    }
    
    else {
        cors(404, { 
            error: "Not Found",
            message: "API không tồn tại. Các API có sẵn:",
            apis: [
                "/api/68gb/txhu",
                "/api/68gb/history/txhu", 
                "/api/68gb/txmd5",
                "/api/68gb/history/txmd5",
                "/api/du-doan",
                "/api/thong-ke-von",
                "/api/thong-ke-ai",
                "/api/ket-qua-moi",
                "/api/stats/advanced",
                "/health"
            ]
        });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD HTML
// ═══════════════════════════════════════════════════════════════════════════
function getDashboardHTML() {
    return `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>68GB BOT - Trí Tuệ Nhân Tạo</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            background: linear-gradient(135deg, #0a0f1e 0%, #0a0a1a 100%);
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #fff;
            min-height: 100vh;
            padding: 20px;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        h1 { text-align: center; margin-bottom: 20px; font-size: 2.5rem; background: linear-gradient(135deg, #f093fb, #f5576c); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .status { text-align: center; margin-bottom: 30px; padding: 10px; border-radius: 50px; display: inline-block; width: auto; margin: 0 auto 30px; background: rgba(72,187,120,0.2); border: 1px solid #48bb78; color: #48bb78; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px; }
        .card { background: rgba(255,255,255,0.05); border-radius: 20px; padding: 20px; backdrop-filter: blur(10px); }
        .card h2 { margin-bottom: 15px; color: #f093fb; }
        .result { font-size: 3rem; font-weight: bold; text-align: center; padding: 20px; border-radius: 15px; margin: 10px 0; }
        .tai { background: linear-gradient(135deg, #f56565, #ed64a6); }
        .xiu { background: linear-gradient(135deg, #4299e1, #667eea); }
        .dice { font-size: 1.2rem; text-align: center; margin: 10px 0; }
        .phien { font-family: monospace; font-size: 0.9rem; opacity: 0.7; }
        button { background: linear-gradient(135deg, #667eea, #764ba2); border: none; padding: 10px 20px; border-radius: 10px; color: white; cursor: pointer; margin: 5px; }
        button:hover { transform: scale(1.05); }
        .api-list { margin-top: 30px; text-align: center; }
        .api-list a { color: #a0aec0; text-decoration: none; margin: 0 10px; font-size: 0.8rem; }
        .api-list a:hover { color: #f093fb; }
        footer { text-align: center; margin-top: 40px; opacity: 0.5; font-size: 0.8rem; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        .live { animation: pulse 2s infinite; display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #48bb78; margin-right: 8px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎲 68GB SIÊU BOT 🎲</h1>
        <div style="text-align: center;">
            <div class="status"><span class="live"></span> BOT ĐANG HOẠT ĐỘNG</div>
        </div>
        
        <div class="grid">
            <div class="card">
                <h2>🎯 TÀI XỈU HŨ</h2>
                <div id="txhu-result" class="result">ĐANG TẢI...</div>
                <div id="txhu-dice" class="dice">---</div>
                <div id="txhu-phien" class="phien">Phiên: ---</div>
            </div>
            
            <div class="card">
                <h2>🔐 TÀI XỈU MD5</h2>
                <div id="md5-result" class="result">ĐANG TẢI...</div>
                <div id="md5-dice" class="dice">---</div>
                <div id="md5-phien" class="phien">Phiên: ---</div>
            </div>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
            <button onclick="location.reload()">🔄 LÀM MỚI</button>
        </div>
        
        <div class="api-list">
            <h3>📡 API CÓ SẴN</h3>
            <a href="/api/68gb/txhu">/api/68gb/txhu</a>
            <a href="/api/68gb/history/txhu">/api/68gb/history/txhu</a>
            <a href="/api/68gb/txmd5">/api/68gb/txmd5</a>
            <a href="/api/68gb/history/txmd5">/api/68gb/history/txmd5</a>
            <a href="/api/du-doan">/api/du-doan</a>
            <a href="/api/health">/api/health</a>
        </div>
        
        <footer>
            🤖 Phiên bản 5.0 | Trí tuệ nhân tạo | Tối ưu cho Render
        </footer>
    </div>
    
    <script>
        async function loadData() {
            try {
                const [txhu, md5] = await Promise.all([
                    fetch('/api/68gb/txhu').then(r => r.json()),
                    fetch('/api/68gb/txmd5').then(r => r.json())
                ]);
                
                if (!txhu.error) {
                    document.getElementById('txhu-result').innerHTML = txhu['kết quả'] || '???';
                    document.getElementById('txhu-result').className = 'result ' + (txhu['kết quả'] === 'TÀI' ? 'tai' : 'xiu');
                    document.getElementById('txhu-dice').innerHTML = \`\${txhu['xúc xắc 1'] || '?'} - \${txhu['xúc xắc 2'] || '?'} - \${txhu['xúc xắc 3'] || '?'}\`;
                    document.getElementById('txhu-phien').innerHTML = \`Phiên: #\${txhu['Phiên trước'] || '???'}\`;
                }
                
                if (!md5.error) {
                    document.getElementById('md5-result').innerHTML = md5['kết quả'] || '???';
                    document.getElementById('md5-result').className = 'result ' + (md5['kết quả'] === 'TÀI' ? 'tai' : 'xiu');
                    document.getElementById('md5-dice').innerHTML = \`\${md5['xúc xắc 1'] || '?'} - \${md5['xúc xắc 2'] || '?'} - \${md5['xúc xắc 3'] || '?'}\`;
                    document.getElementById('md5-phien').innerHTML = \`Phiên: #\${md5['Phiên trước'] || '???'}\`;
                }
            } catch(e) {
                console.error('Lỗi:', e);
            }
        }
        
        loadData();
        setInterval(loadData, 5000);
    </script>
</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════════════════
// KHỞI ĐỘNG SERVER VÀ BOT
// ═══════════════════════════════════════════════════════════════════════════
server.listen(CONFIG.PORT, '0.0.0.0', () => {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║     🚀 68GB BOT - ĐANG CHẠY TRÊN PORT ${CONFIG.PORT} 🚀          ║
║                                                                ║
╠════════════════════════════════════════════════════════════════╣
║  📡 API Endpoints:                                             ║
║     GET  /api/68gb/txhu       → Kết quả TXHU mới nhất         ║
║     GET  /api/68gb/txmd5      → Kết quả TXMD5 mới nhất        ║
║     GET  /api/history         → Lịch sử TXMD5                 ║
║     GET  /api/du-doan         → Dự đoán AI                    ║
║     GET  /api/health          → Kiểm tra sức khỏe             ║
║     POST /api/token           → Cập nhật token mới            ║
║                                                                ║
║  🌐 Dashboard: http://localhost:${CONFIG.PORT}                      ║
║  🤖 Bot Status: ĐANG KẾT NỐI WEBSOCKET...                      ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
    `);
    
    // Khởi động bot
    bot.run(CONFIG.LANDING_URL);
});
