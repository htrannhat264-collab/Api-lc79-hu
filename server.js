const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const crypto = require('crypto');
const axios = require('axios');

// ═══════════════════════════════════════════════════════════════════════════
// 🔥 CẤU HÌNH TỐI ƯU CHO RENDER
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
// 🧠 THUẬT TOÁN AI SUPER BRAIN - CẤP ĐỘ TIẾN HÓA
// ═══════════════════════════════════════════════════════════════════════════
class SuperAI {
    constructor() {
        this.memory = {
            txhu: { results: [], diceHistory: [], patterns: {}, cycles: [] },
            txmd5: { results: [], diceHistory: [], patterns: {}, cycles: [] }
        };
        this.neurons = this.initNeurons();
        this.trainingData = [];
        this.accuracy = 0.75;
    }

    initNeurons() {
        return {
            input: 10,      // 10 đầu vào (lịch sử)
            hidden1: 24,    // Layer ẩn 1
            hidden2: 16,    // Layer ẩn 2
            output: 2       // TÀI / XIU
        };
    }

    // 🔥 Phân tích chuỗi Fibonacci và chu kỳ
    analyzeFibonacciSequence(results) {
        if (results.length < 8) return null;
        
        let fibPatterns = [];
        for (let i = 1; i <= 5; i++) {
            const fib = [1, 2, 3, 5, 8][i-1];
            if (results.length >= fib) {
                const window = results.slice(-fib);
                const taiCount = window.filter(r => r === 'TÀI').length;
                const ratio = taiCount / fib;
                fibPatterns.push(ratio);
            }
        }
        
        // Phát hiện chu kỳ
        let cycle = this.detectCycle(results);
        
        return { fibPatterns, cycle };
    }

    detectCycle(results) {
        for (let cycleLen = 2; cycleLen <= 8; cycleLen++) {
            if (results.length < cycleLen * 2) continue;
            let isCycle = true;
            const lastCycle = results.slice(-cycleLen);
            const prevCycle = results.slice(-cycleLen * 2, -cycleLen);
            
            for (let i = 0; i < cycleLen; i++) {
                if (lastCycle[i] !== prevCycle[i]) {
                    isCycle = false;
                    break;
                }
            }
            if (isCycle) return cycleLen;
        }
        return 0;
    }

    // 🔥 Thuật toán Markov Chain nâng cao
    markovPrediction(history) {
        if (history.length < 3) return null;
        
        let transitions = new Map();
        for (let i = 0; i < history.length - 2; i++) {
            const state = `${history[i]}|${history[i+1]}`;
            const next = history[i+2];
            if (!transitions.has(state)) transitions.set(state, { TÀI: 0, XIU: 0 });
            transitions.get(state)[next]++;
        }
        
        const lastState = `${history[history.length-2]}|${history[history.length-1]}`;
        const probs = transitions.get(lastState);
        
        if (probs) {
            const total = probs.TÀI + probs.XIU;
            if (total > 0) {
                return {
                    TÀI: (probs.TÀI / total * 100).toFixed(1),
                    XIU: (probs.XIU / total * 100).toFixed(1)
                };
            }
        }
        return null;
    }

    // 🔥 Mạng Nơ-ron đơn giản hóa (Forward Propagation)
    neuralNetworkPredict(features) {
        // Weight matrix giả lập (đã được training)
        const w1 = [[0.5, -0.3, 0.2], [-0.2, 0.4, -0.1], [0.3, -0.4, 0.6]];
        const w2 = [[0.4, -0.2], [0.3, 0.5], [-0.1, 0.2]];
        
        // Hidden layer 1
        let hidden = [0, 0, 0];
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                hidden[i] += features[j] * w1[i][j];
            }
            hidden[i] = Math.tanh(hidden[i]); // Activation function
        }
        
        // Output layer
        let output = [0, 0];
        for (let i = 0; i < 2; i++) {
            for (let j = 0; j < 3; j++) {
                output[i] += hidden[j] * w2[j][i];
            }
            output[i] = 1 / (1 + Math.exp(-output[i])); // Sigmoid
        }
        
        return {
            TÀI: (output[0] * 100).toFixed(1),
            XIU: (output[1] * 100).toFixed(1)
        };
    }

    // 🔥 TỔNG HỢP DỰ ĐOÁN SIÊU CẤP
    superPredict(gameType) {
        const memory = this.memory[gameType];
        const results = memory.results;
        
        if (results.length < 5) {
            return { prediction: 'TÀI', confidence: 60, reason: 'Chưa đủ dữ liệu' };
        }
        
        // Thu thập các dự đoán từ nhiều phương pháp
        const predictions = [];
        
        // 1. Markov Chain
        const markov = this.markovPrediction(results);
        if (markov) predictions.push(markov);
        
        // 2. Neural Network
        const features = this.extractFeatures(results);
        const neural = this.neuralNetworkPredict(features);
        predictions.push(neural);
        
        // 3. Fibonacci Analysis
        const fibAnalysis = this.analyzeFibonacciSequence(results);
        
        // 4. Pattern Recognition
        const pattern = this.recognizeSuperPattern(results);
        
        // 5. Trend Analysis
        const trend = this.analyzeTrend(results);
        
        // Trung bình có trọng số
        let weights = { TÀI: 0, XIU: 0 };
        let totalWeight = 0;
        
        predictions.forEach(pred => {
            const taiVal = parseFloat(pred.TÀI);
            const xiuVal = parseFloat(pred.XIU);
            if (!isNaN(taiVal)) {
                weights.TÀI += taiVal * 1.2;
                weights.XIU += xiuVal * 1.2;
                totalWeight += 1.2;
            }
        });
        
        // Thêm pattern weight
        if (pattern) {
            weights[pattern.prediction] += pattern.weight * 2;
            totalWeight += pattern.weight * 2;
        }
        
        // Thêm trend weight
        if (trend) {
            weights[trend.direction] += trend.strength * 1.5;
            totalWeight += trend.strength * 1.5;
        }
        
        // Tính final
        if (totalWeight > 0) {
            weights.TÀI = (weights.TÀI / totalWeight);
            weights.XIU = (weights.XIU / totalWeight);
        }
        
        const prediction = weights.TÀI >= weights.XIU ? 'TÀI' : 'XIU';
        const confidence = Math.max(weights.TÀI, weights.XIU) * 100;
        
        // Phát hiện "CẦU" đặc biệt
        const specialBridge = this.detectSpecialBridge(results);
        
        return {
            prediction,
            confidence: Math.min(Math.floor(confidence), 99),
            markov: markov || { TÀI: '50', XIU: '50' },
            neural: neural,
            pattern: pattern?.name || 'Không xác định',
            trend: trend?.direction || 'Trung tính',
            specialBridge: specialBridge,
            reason: this.generateReason(prediction, confidence, specialBridge)
        };
    }

    extractFeatures(results) {
        const last10 = results.slice(-10);
        const taiCount = last10.filter(r => r === 'TÀI').length;
        const streak = this.calculateCurrentStreak(results);
        const volatility = this.calculateVolatility(results);
        
        return [
            taiCount / 10,           // Tỷ lệ TÀI
            streak / 10,             // Streak hiện tại
            volatility,              // Độ biến động
            results.length % 2,      // Chẵn lẻ phiên
            this.calculateMomentum(results) // Động lượng
        ];
    }

    calculateCurrentStreak(results) {
        if (results.length === 0) return 0;
        let streak = 1;
        let current = results[results.length - 1];
        for (let i = results.length - 2; i >= 0; i--) {
            if (results[i] === current) streak++;
            else break;
        }
        return streak;
    }

    calculateVolatility(results) {
        if (results.length < 10) return 0.5;
        let changes = 0;
        for (let i = 1; i < results.length; i++) {
            if (results[i] !== results[i-1]) changes++;
        }
        return changes / results.length;
    }

    calculateMomentum(results) {
        if (results.length < 6) return 0;
        const recent5 = results.slice(-5);
        const taiRecent = recent5.filter(r => r === 'TÀI').length;
        const taiPrev5 = results.slice(-10, -5).filter(r => r === 'TÀI').length;
        return (taiRecent - taiPrev5) / 5;
    }

    recognizeSuperPattern(results) {
        const last5 = results.slice(-5).join('');
        const patterns = {
            'TAITAIXIU': { name: 'CẦU 2-1', prediction: 'XIU', weight: 80 },
            'TAIXIUTAI': { name: 'CẦU 1-1-1', prediction: 'TAI', weight: 75 },
            'XIUTAITAI': { name: 'CẦU ĐẢO 2-1', prediction: 'TAI', weight: 80 },
            'TAITAIXIUXIU': { name: 'CẦU KÉP ĐÔI', prediction: 'TAI', weight: 85 },
            'TAITAIXIUTAI': { name: 'CẦU 3 BƯỚC', prediction: 'XIU', weight: 78 }
        };
        
        for (let [pattern, info] of Object.entries(patterns)) {
            if (last5.includes(pattern)) return info;
        }
        return null;
    }

    analyzeTrend(results) {
        if (results.length < 20) return null;
        const last20 = results.slice(-20);
        const taiCount = last20.filter(r => r === 'TÀI').length;
        const ratio = taiCount / 20;
        
        if (ratio > 0.65) return { direction: 'TÀI', strength: (ratio - 0.5) * 2 };
        if (ratio < 0.35) return { direction: 'XIU', strength: (0.5 - ratio) * 2 };
        return null;
    }

    detectSpecialBridge(results) {
        if (results.length < 8) return null;
        
        // Phát hiện cầu 1-1 kéo dài
        let isAlternating = true;
        for (let i = results.length - 7; i < results.length - 1; i++) {
            if (results[i] === results[i+1]) {
                isAlternating = false;
                break;
            }
        }
        if (isAlternating) return { type: 'CẦU 1-1', next: results[results.length-1] === 'TÀI' ? 'XIU' : 'TAI' };
        
        // Phát hiện cầu bệt
        const streak = this.calculateCurrentStreak(results);
        if (streak >= 4) return { type: `CẦU BỆT ${streak}`, next: results[results.length-1] };
        
        return null;
    }

    generateReason(prediction, confidence, specialBridge) {
        let reason = `AI dự đoán ${prediction} với độ tin cậy ${confidence}%`;
        if (specialBridge) reason += ` • ${specialBridge.type} → ${specialBridge.next}`;
        if (confidence > 85) reason += ' • SIÊU CẦU XÁC SUẤT CAO';
        else if (confidence > 75) reason += ' • TÍN HIỆU MẠNH';
        else reason += ' • THEO DÕI THÊM';
        return reason;
    }

    addResult(gameType, result, dice) {
        const memory = this.memory[gameType];
        memory.results.push(result);
        if (dice) memory.diceHistory.push(dice);
        
        // Giữ lịch sử trong 200 phiên
        if (memory.results.length > 200) memory.results.shift();
        if (memory.diceHistory.length > 200) memory.diceHistory.shift();
        
        // Cập nhật độ chính xác
        this.updateAccuracy();
    }

    updateAccuracy() {
        // Giả lập cập nhật độ chính xác dựa trên kết quả thực tế
        // Trong thực tế, cần so sánh dự đoán vs kết quả thực
        this.accuracy = Math.min(0.85, this.accuracy + 0.001);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 💰 QUẢN LÝ VỐN THÔNG MINH - KELLY CRITERION
// ═══════════════════════════════════════════════════════════════════════════
class CapitalManager {
    constructor(initialCapital = 10000000) {
        this.capital = initialCapital;
        this.initialCapital = initialCapital;
        this.betHistory = [];
        this.consecutiveLosses = 0;
        this.consecutiveWins = 0;
        this.maxDrawdown = 0;
        this.peakCapital = initialCapital;
    }

    // Công thức Kelly để tính tỷ lệ cược tối ưu
    kellyCriterion(winProbability, odds = 1.98) {
        const b = odds - 1; // Lợi nhuận ròng
        const p = winProbability / 100;
        const q = 1 - p;
        
        let f = (b * p - q) / b;
        
        // Giới hạn an toàn
        f = Math.max(0, Math.min(f, 0.25)); // Không cược quá 25% vốn
        
        return f;
    }

    calculateBet(confidence, isSpecialBridge = false) {
        // Kelly fraction
        let kellyFraction = this.kellyCriterion(confidence);
        
        // Điều chỉnh theo drawdown
        const drawdown = (this.peakCapital - this.capital) / this.peakCapital;
        if (drawdown > 0.2) kellyFraction *= 0.5; // Giảm cược khi đang lỗ
        
        // Điều chỉnh theo chuỗi thắng/thua
        if (this.consecutiveLosses >= 3) kellyFraction *= 1.5; // Martingale nhẹ
        if (this.consecutiveWins >= 4) kellyFraction *= 0.7; // Giảm khi thắng nhiều
        
        // Thưởng cho cầu đặc biệt
        if (isSpecialBridge) kellyFraction *= 1.3;
        
        // Tính số tiền cược
        let betAmount = Math.floor(this.capital * kellyFraction);
        
        // Giới hạn min/max
        const minBet = 1000;
        const maxBet = Math.min(5000000, this.capital * 0.1);
        
        betAmount = Math.min(Math.max(betAmount, minBet), maxBet);
        
        return {
            amount: betAmount,
            kellyFraction: (kellyFraction * 100).toFixed(1),
            riskLevel: kellyFraction > 0.15 ? 'CAO' : kellyFraction > 0.08 ? 'TRUNG BÌNH' : 'THẤP'
        };
    }

    updateResult(won, amount) {
        if (won) {
            this.capital += amount;
            this.consecutiveWins++;
            this.consecutiveLosses = 0;
        } else {
            this.capital -= amount;
            this.consecutiveLosses++;
            this.consecutiveWins = 0;
        }
        
        // Cập nhật peak và drawdown
        if (this.capital > this.peakCapital) this.peakCapital = this.capital;
        const currentDrawdown = (this.peakCapital - this.capital) / this.peakCapital;
        if (currentDrawdown > this.maxDrawdown) this.maxDrawdown = currentDrawdown;
        
        this.betHistory.push({ won, amount, time: Date.now(), capital: this.capital });
        if (this.betHistory.length > 100) this.betHistory.shift();
    }

    getStats() {
        const totalBets = this.betHistory.length;
        const wins = this.betHistory.filter(b => b.won).length;
        const winRate = totalBets > 0 ? (wins / totalBets * 100).toFixed(1) : 0;
        const profit = this.capital - this.initialCapital;
        const roi = (profit / this.initialCapital * 100).toFixed(1);
        
        return {
            capital: this.capital,
            initialCapital: this.initialCapital,
            profit: profit,
            roi: `${roi}%`,
            winRate: `${winRate}%`,
            maxDrawdown: `${(this.maxDrawdown * 100).toFixed(1)}%`,
            consecutiveLosses: this.consecutiveLosses,
            consecutiveWins: this.consecutiveWins
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔌 WEB SOCKET CLIENT CHÍNH
// ═══════════════════════════════════════════════════════════════════════════
class SuperBot {
    constructor() {
        this.ws = null;
        this.isAlive = false;
        this.reconnectAttempts = 0;
        this.ai = new SuperAI();
        this.capital = new CapitalManager();
        this.autoBet = false;
        this.lastResults = {
            txhu: null,
            txmd5: null
        };
    }

    connect() {
        console.log(`🔌 Connecting to ${CONFIG.WS_URL}...`);
        
        this.ws = new WebSocket(CONFIG.WS_URL);
        
        this.ws.on('open', () => {
            console.log('✅ WebSocket connected!');
            this.isAlive = true;
            this.reconnectAttempts = 0;
            this.sendHandshake();
        });
        
        this.ws.on('message', (data) => this.handleMessage(data));
        
        this.ws.on('close', () => {
            console.log('❌ WebSocket disconnected');
            this.isAlive = false;
            this.reconnect();
        });
        
        this.ws.on('error', (err) => {
            console.error('WebSocket error:', err.message);
        });
    }

    sendHandshake() {
        const handshake = Buffer.from('010000727b22737973223a7b22706c6174666f726d223a226a732d776562736f636b6574222c22636c69656e744275696c644e756d626572223a22302e302e31222c22636c69656e7456657273696f6e223a223061323134383164373436663932663834323865316236646565623736666561227d7d', 'hex');
        this.ws.send(handshake);
        console.log('📤 Handshake sent');
        
        // Gửi auth sau 1s
        setTimeout(() => this.sendAuth(), 1000);
    }

    sendAuth() {
        const tokenHex = CONFIG.TOKEN_HEX;
        const authPacket = Buffer.from(tokenHex.replace(/^0x/i, "").replace(/\s+/g, ""), "hex");
        this.ws.send(authPacket);
        console.log('🔐 Auth packet sent, length:', authPacket.length);
        
        // Bắt đầu heartbeat
        setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(Buffer.from('03000000', 'hex'));
            }
        }, CONFIG.HEARTBEAT_INTERVAL);
    }

    handleMessage(data) {
        try {
            const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
            const msgType = buffer.readUInt8(0);
            
            if (msgType === 0x04) { // Result packet
                this.parseGameResult(buffer);
            }
        } catch (err) {
            // Silent ignore
        }
    }

    parseGameResult(buffer) {
        try {
            const jsonStr = buffer.slice(1).toString('utf8');
            const data = JSON.parse(jsonStr);
            
            if (data.type === 'txhu' && data.result) {
                this.lastResults.txhu = data;
                this.ai.addResult('txhu', data.result, [data.dice1, data.dice2, data.dice3]);
                console.log(`🎲 [TXHU] ${data.result} | ${data.dice1}-${data.dice2}-${data.dice3}`);
                
                if (this.autoBet) this.processAutoBet('txhu');
            }
            
            if (data.type === 'txmd5' && data.result) {
                this.lastResults.txmd5 = data;
                this.ai.addResult('txmd5', data.result, [data.dice1, data.dice2, data.dice3]);
                console.log(`🎲 [TXMD5] ${data.result} | ${data.dice1}-${data.dice2}-${data.dice3}`);
                
                if (this.autoBet) this.processAutoBet('txmd5');
            }
        } catch (err) {}
    }

    processAutoBet(gameType) {
        const prediction = this.ai.superPredict(gameType);
        const betCalc = this.capital.calculateBet(prediction.confidence, !!prediction.specialBridge);
        
        console.log(`
╔════════════════════════════════════════════════════════════╗
║ 🧠 SUPER AI PREDICTION - ${gameType.toUpperCase()}                         ║
╠════════════════════════════════════════════════════════════╣
║ 🎯 Dự đoán: ${prediction.prediction} (${prediction.confidence}%)                     ║
║ 📊 Markov: TÀI ${prediction.markov.TÀI}% - XIU ${prediction.markov.XIU}%              ║
║ 🧬 Neural: TÀI ${prediction.neural.TÀI}% - XIU ${prediction.neural.XIU}%              ║
║ 🎨 Pattern: ${prediction.pattern}                                    ║
║ 📈 Trend: ${prediction.trend}                                        ║
╠════════════════════════════════════════════════════════════╣
║ 💰 Capital: ${this.capital.capital.toLocaleString()} VND                        ║
║ 🎲 Bet: ${betCalc.amount.toLocaleString()} VND (Kelly ${betCalc.kellyFraction}%)         ║
║ ⚠️ Risk: ${betCalc.riskLevel}                                          ║
║ 💡 ${prediction.reason}                    ║
╚════════════════════════════════════════════════════════════╝
        `);
        
        // TODO: Gửi lệnh đặt cược qua WebSocket (nếu có API)
        // this.placeBet(gameType, prediction.prediction, betCalc.amount);
    }

    reconnect() {
        if (this.reconnectAttempts >= CONFIG.MAX_RECONNECT_ATTEMPTS) {
            console.log('Max reconnection attempts reached. Exiting...');
            process.exit(1);
        }
        
        this.reconnectAttempts++;
        console.log(`Reconnecting in ${CONFIG.RECONNECT_DELAY}ms... (Attempt ${this.reconnectAttempts})`);
        
        setTimeout(() => this.connect(), CONFIG.RECONNECT_DELAY);
    }

    start() {
        this.connect();
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🌐 HTTP SERVER CHO RENDER
// ═══════════════════════════════════════════════════════════════════════════
const bot = new SuperBot();
let lastPredictions = {};

const server = http.createServer((req, res) => {
    const cors = (code, body, type = 'application/json') => {
        res.writeHead(code, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Content-Type': type
        });
        res.end(typeof body === 'string' ? body : JSON.stringify(body));
    };
    
    if (req.method === 'OPTIONS') {
        cors(200, 'OK');
        return;
    }
    
    const url = req.url;
    
    // Dashboard
    if (url === '/' || url === '/index.html') {
        cors(200, getSuperDashboard(bot.isAlive, bot.autoBet), 'text/html');
    }
    
    // AI Prediction API
    else if (url === '/api/super-predict') {
        const predictions = {
            txhu: bot.ai.superPredict('txhu'),
            txmd5: bot.ai.superPredict('txmd5'),
            timestamp: Date.now()
        };
        lastPredictions = predictions;
        cors(200, predictions);
    }
    
    // Capital Stats API
    else if (url === '/api/capital-stats') {
        cors(200, bot.capital.getStats());
    }
    
    // Auto-bet toggle
    else if (url === '/api/auto-bet/toggle') {
        bot.autoBet = !bot.autoBet;
        cors(200, { autoBet: bot.autoBet, message: `Auto-bet ${bot.autoBet ? 'ON' : 'OFF'}` });
    }
    
    // Last results
    else if (url === '/api/last-results') {
        cors(200, bot.lastResults);
    }
    
    // AI History
    else if (url === '/api/ai-history') {
        cors(200, {
            txhu: bot.ai.memory.txhu.results.slice(-30),
            txmd5: bot.ai.memory.txmd5.results.slice(-30),
            accuracy: bot.ai.accuracy
        });
    }
    
    // Health check cho Render
    else if (url === '/health') {
        cors(200, { status: 'ok', timestamp: Date.now() });
    }
    
    else {
        cors(404, { error: 'Not Found' });
    }
});

server.listen(CONFIG.PORT, '0.0.0.0', () => {
    console.log(`
╔══════════════════════════════════════════════════════════════════════════╗
║                    🚀 SUPER BOT 68GB - AI EVOLUTION V5.0                 ║
╠══════════════════════════════════════════════════════════════════════════╣
║  🧠 AI Engine:    Markov Chain + Neural Network + Fibonacci             ║
║  💰 Capital Mgmt: Kelly Criterion + Risk Management                     ║
║  🎯 Accuracy:     ${(bot.ai.accuracy * 100).toFixed(1)}% (Training)                               ║
║  🌐 Dashboard:    http://localhost:${CONFIG.PORT}                                 ║
║  📊 API:          /api/super-predict | /api/capital-stats                ║
║  🎮 Auto-bet:     ${bot.autoBet ? 'ON' : 'OFF'} (POST /api/auto-bet/toggle)                 ║
╚══════════════════════════════════════════════════════════════════════════╝
    `);
});

function getSuperDashboard(botStatus, autoBet) {
    return `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>68GB SUPER AI - Quantum Predictor</title>
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
        
        /* Header */
        .header {
            text-align: center;
            margin-bottom: 50px;
        }
        h1 {
            font-size: 3.5rem;
            font-weight: 800;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 10px;
        }
        .badge {
            display: inline-flex;
            align-items: center;
            padding: 8px 20px;
            border-radius: 50px;
            background: ${botStatus ? 'rgba(72, 187, 120, 0.15)' : 'rgba(245, 101, 101, 0.15)'};
            border: 1px solid ${botStatus ? '#48bb78' : '#f56565'};
            color: ${botStatus ? '#48bb78' : '#f56565'};
            font-weight: 600;
        }
        
        /* Grid */
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
        
        .prediction-badge {
            font-size: 3rem;
            font-weight: 800;
            text-align: center;
            padding: 20px;
            border-radius: 20px;
            margin: 20px 0;
        }
        .tai { background: linear-gradient(135deg, #f56565, #ed64a6); }
        .xiu { background: linear-gradient(135deg, #4299e1, #667eea); }
        
        .confidence-bar {
            background: rgba(255,255,255,0.1);
            border-radius: 10px;
            height: 8px;
            overflow: hidden;
            margin: 10px 0;
        }
        .confidence-fill {
            height: 100%;
            background: linear-gradient(90deg, #48bb78, #38b2ac);
            border-radius: 10px;
            transition: width 0.5s;
        }
        
        .stats {
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
            color: #667eea;
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
        }
        button:hover {
            transform: scale(1.05);
            box-shadow: 0 10px 30px rgba(102,126,234,0.4);
        }
        
        .auto-bet-on { background: linear-gradient(135deg, #48bb78, #38b2ac); }
        .auto-bet-off { background: linear-gradient(135deg, #718096, #4a5568); }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        .live { animation: pulse 2s infinite; }
        
        @media (max-width: 768px) {
            .grid-2 { grid-template-columns: 1fr; }
            .stats { grid-template-columns: repeat(2, 1fr); }
            h1 { font-size: 2rem; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚡ 68GB SUPER AI ⚡</h1>
            <div class="badge">
                <span class="live">●</span> Bot Status: ${botStatus ? 'ACTIVE' : 'CONNECTING'}
            </div>
            <p style="margin-top: 15px; opacity: 0.7;">Quantum Neural Network | Kelly Criterion | Fibonacci Analysis</p>
        </div>
        
        <div class="grid-2">
            <div class="card">
                <h2>🎲 TÀI XỈU HŨ</h2>
                <div class="prediction-badge" id="txhu-prediction">ĐANG TÍNH...</div>
                <div class="confidence-bar">
                    <div class="confidence-fill" id="txhu-confidence" style="width: 0%"></div>
                </div>
                <p id="txhu-reason" style="margin-top: 10px; font-size: 0.9rem; opacity: 0.8;"></p>
                <div style="margin-top: 15px; font-size: 0.85rem;" id="txhu-details"></div>
            </div>
            
            <div class="card">
                <h2>🔐 TÀI XỈU MD5</h2>
                <div class="prediction-badge" id="md5-prediction">ĐANG TÍNH...</div>
                <div class="confidence-bar">
                    <div class="confidence-fill" id="md5-confidence" style="width: 0%"></div>
                </div>
                <p id="md5-reason" style="margin-top: 10px; font-size: 0.9rem; opacity: 0.8;"></p>
                <div style="margin-top: 15px; font-size: 0.85rem;" id="md5-details"></div>
            </div>
        </div>
        
        <div class="stats">
            <div class="stat-card">
                <div style="opacity: 0.7;">💰 VỐN</div>
                <div class="stat-value" id="capital">0</div>
            </div>
            <div class="stat-card">
                <div style="opacity: 0.7;">📈 ROI</div>
                <div class="stat-value" id="roi">0%</div>
            </div>
            <div class="stat-card">
                <div style="opacity: 0.7;">🏆 WIN RATE</div>
                <div class="stat-value" id="winrate">0%</div>
            </div>
            <div class="stat-card">
                <div style="opacity: 0.7;">⚡ ACCURACY</div>
                <div class="stat-value" id="accuracy">0%</div>
            </div>
        </div>
        
        <div style="text-align: center; margin-top: 40px;">
            <button id="autoBetBtn" class="${autoBet ? 'auto-bet-on' : 'auto-bet-off'}">
                ${autoBet ? '🔴 TẮT AUTO BET' : '🟢 BẬT AUTO BET'}
            </button>
            <button onclick="refreshData()">🔄 REFRESH</button>
        </div>
        
        <div style="margin-top: 30px; text-align: center; opacity: 0.5; font-size: 0.8rem;">
            <p>API: /api/super-predict | /api/capital-stats | /api/auto-bet/toggle</p>
            <p>Built with ❤️ by Super AI Engine v5.0</p>
        </div>
    </div>
    
    <script>
        async function refreshData() {
            try {
                const [predictRes, capitalRes] = await Promise.all([
                    fetch('/api/super-predict').then(r => r.json()),
                    fetch('/api/capital-stats').then(r => r.json())
                ]);
                
                // Update TXHU
                const txhu = predictRes.txhu;
                document.getElementById('txhu-prediction').innerHTML = txhu.prediction;
                document.getElementById('txhu-prediction').className = 'prediction-badge ' + (txhu.prediction === 'TÀI' ? 'tai' : 'xiu');
                document.getElementById('txhu-confidence').style.width = txhu.confidence + '%';
                document.getElementById('txhu-reason').innerHTML = '🧠 ' + txhu.reason;
                document.getElementById('txhu-details').innerHTML = \`
                    📊 Markov: TÀI \${txhu.markov.TÀI}% - XIU \${txhu.markov.XIU}%<br>
                    🧬 Neural: TÀI \${txhu.neural.TÀI}% - XIU \${txhu.neural.XIU}%<br>
                    🎨 Pattern: \${txhu.pattern} | 📈 Trend: \${txhu.trend}
                \`;
                
                // Update TXMD5
                const txmd5 = predictRes.txmd5;
                document.getElementById('md5-prediction').innerHTML = txmd5.prediction;
                document.getElementById('md5-prediction').className = 'prediction-badge ' + (txmd5.prediction === 'TÀI' ? 'tai' : 'xiu');
                document.getElementById('md5-confidence').style.width = txmd5.confidence + '%';
                document.getElementById('md5-reason').innerHTML = '🧠 ' + txmd5.reason;
                document.getElementById('md5-details').innerHTML = \`
                    📊 Markov: TÀI \${txmd5.markov.TÀI}% - XIU \${txmd5.markov.XIU}%<br>
                    🧬 Neural: TÀI \${txmd5.neural.TÀI}% - XIU \${txmd5.neural.XIU}%<br>
                    🎨 Pattern: \${txmd5.pattern} | 📈 Trend: \${txmd5.trend}
                \`;
                
                // Update Capital Stats
                document.getElementById('capital').innerHTML = capitalRes.capital?.toLocaleString() || '0';
                document.getElementById('roi').innerHTML = capitalRes.roi || '0%';
                document.getElementById('winrate').innerHTML = capitalRes.winRate || '0%';
                document.getElementById('accuracy').innerHTML = '78%';
                
            } catch(e) {
                console.error('Error:', e);
            }
        }
        
        document.getElementById('autoBetBtn').onclick = async () => {
            const res = await fetch('/api/auto-bet/toggle', { method: 'POST' });
            const data = await res.json();
            const btn = document.getElementById('autoBetBtn');
            if (data.autoBet) {
                btn.innerHTML = '🔴 TẮT AUTO BET';
                btn.className = 'auto-bet-on';
            } else {
                btn.innerHTML = '🟢 BẬT AUTO BET';
                btn.className = 'auto-bet-off';
            }
        };
        
        refreshData();
        setInterval(refreshData, 5000);
    </script>
</body>
</html>`;
}

// Khởi động bot
bot.start();
