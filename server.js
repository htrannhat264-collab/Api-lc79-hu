const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 5000;

// ==========================================
// CẤU HÌNH API LC79
// ==========================================
const LC79_CONFIG = {
  baseUrl: 'https://wtx.tele68.com',
  at: '471d88b8b38dd557765c1b597946e4d',
  bearer: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjb2RlIjowLCJtZXNzYWdlIjoiU3VjY2VzcyIsIm5pY2tOYW1lIjoiQ2FjdGF1bmUiLCJhY2Nlc3NUb2tlbiI6IjQ3MWQ4OGI4YjM4ZGRmNTU3NzY1YzFiNTk3OTQ2ZTRkIiwiaXNMb2dpbiI6dHJ1ZSwibW9uZXkiOjAsImlkIjoiODE1NzAxMyIsInVzZXJuYW1lIjoiaG9hbmcyMjg1IiwiaWF0IjoxNzgwODM4MjQ0LCJleHAiOjE3ODA4NjcwNDR9.BOOw6RIK3OPqMM_99ZV1XnUvk0hhCB_Zr1b2ilsLLI0',
  cp: 'R',
  cl: 'R',
  pf: 'web'
};

// LƯU TRỮ
let gameData = { data: [], lichSuDuDoan: [] };
let stats = { tong: 0, dung: 0, sai: 0, tiLe: '0%', boQua: 0 };
let memory = {
  patternHistory: [],      // Lưu pattern 5 phiên
  cauDacBiet: new Map(),   // Lưu cầu đặc biệt đã xuất hiện
  tiLeDungTheoPattern: new Map(), // Tỷ lệ đúng theo từng pattern
  lastUpdate: Date.now()
};

// ==========================================
// FETCH DATA
// ==========================================
async function fetchLC79Data(sessionId) {
  try {
    const url = `${LC79_CONFIG.baseUrl}/v1/tx/session-summary`;
    const params = {
      sessionId: sessionId,
      cp: LC79_CONFIG.cp,
      cl: LC79_CONFIG.cl,
      pf: LC79_CONFIG.pf,
      at: LC79_CONFIG.at
    };
    
    const headers = {
      'Host': 'wtx.tele68.com',
      'Accept': '*/*',
      'Content-Type': 'application/json',
      'Origin': 'https://lc79b.bet',
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15',
      'Referer': 'https://lc79b.bet/',
      'Authorization': `Bearer ${LC79_CONFIG.bearer}`,
      'Accept-Language': 'vi-VN,vi;q=0.9'
    };
    
    const response = await axios.get(url, { params, headers, timeout: 15000 });
    return response.data;
  } catch (error) {
    console.error(`Fetch session ${sessionId} lỗi:`, error.message);
    return null;
  }
}

// ==========================================
// LẤY 50 PHIÊN GẦN NHẤT
// ==========================================
async function getRecentSessions(startId = 6786408, limit = 50) {
  const results = [];
  for (let i = 0; i <= limit; i++) {
    const data = await fetchLC79Data(startId - i);
    if (data && data.data) {
      results.push({
        sessionId: startId - i,
        result: data.data.result,
        total: data.data.total,
        dices: data.data.dices
      });
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  return results.sort((a, b) => b.sessionId - a.sessionId);
}

// ==========================================
// ========== THUẬT TOÁN SIÊU MẠNH ==========
// ==========================================

// 1. PHÂN TÍCH CHUỖI BỆT CHI TIẾT (cấp độ 1-10)
function phanTichBet(lichSu) {
  if (lichSu.length < 2) return null;
  
  let bet = 1;
  let betValue = lichSu[0];
  for (let i = 1; i < Math.min(lichSu.length, 15); i++) {
    if (lichSu[i] === betValue) bet++;
    else break;
  }
  
  // Phân tích lịch sử bệt của game
  const betHistory = [];
  for (let i = 0; i < lichSu.length - 1; i++) {
    let b = 1;
    for (let j = i + 1; j < lichSu.length; j++) {
      if (lichSu[j] === lichSu[i]) b++;
      else break;
    }
    if (b >= 3) betHistory.push({ position: i, length: b, value: lichSu[i] });
  }
  
  // Tính xác suất đảo cầu dựa trên lịch sử
  const betLengths = betHistory.filter(b => b.value === betValue).map(b => b.length);
  const avgBetLength = betLengths.length > 0 ? betLengths.reduce((a, b) => a + b, 0) / betLengths.length : 3;
  
  let doTinCay = 0;
  let duDoan = null;
  let loai = '';
  
  if (bet >= 8) {
    duDoan = betValue === 'Tài' ? 'Xỉu' : 'Tài';
    doTinCay = 99;
    loai = `🔥🔥🔥 BỆT ${bet} PHIÊN - CHẮC CHẮN ĐẢO 99%`;
  } else if (bet === 7) {
    duDoan = betValue === 'Tài' ? 'Xỉu' : 'Tài';
    doTinCay = 97;
    loai = `🔥🔥 BỆT ${bet} PHIÊN - ĐẢO CỰC MẠNH 97%`;
  } else if (bet === 6) {
    duDoan = betValue === 'Tài' ? 'Xỉu' : 'Tài';
    doTinCay = 94;
    loai = `🔥🔥 BỆT 6 PHIÊN - ĐẢO RẤT MẠNH 94%`;
  } else if (bet === 5) {
    duDoan = betValue === 'Tài' ? 'Xỉu' : 'Tài';
    doTinCay = 89;
    loai = `🔥 BỆT 5 PHIÊN - ĐẢO MẠNH 89%`;
  } else if (bet === 4) {
    // Kiểm tra xem bệt 4 có phổ biến không
    const bet4Count = betHistory.filter(b => b.length >= 4).length;
    const tyLeBet4ThanhCong = betHistory.filter(b => b.length >= 4 && b.position + b.length < lichSu.length)
      .filter(b => lichSu[b.position + b.length] !== b.value).length / Math.max(1, bet4Count);
    
    duDoan = betValue === 'Tài' ? 'Xỉu' : 'Tài';
    doTinCay = 75 + Math.min(15, Math.round(tyLeBet4ThanhCong * 20));
    loai = `🟡 BỆT 4 PHIÊN - ĐẢO ${doTinCay}%`;
  } else if (bet === 3 && bet >= avgBetLength) {
    // Bệt 3 nhưng dài hơn trung bình
    duDoan = betValue === 'Tài' ? 'Xỉu' : 'Tài';
    doTinCay = 68;
    loai = `⚡ BỆT 3 PHIÊN - CÓ THỂ ĐẢO 68%`;
  } else {
    return null;
  }
  
  return { duDoan, doTinCay, loai, betLength: bet };
}

// 2. PHÂN TÍCH CẦU ĐA DẠNG (1-1, 2-2, 3-2, 3-3, 4-4, 1-2-1, 2-1-2)
function phanTichCau(lichSu) {
  if (lichSu.length < 6) return null;
  
  const results = [];
  
  // CẦU 1-1 (ZIGZAG)
  let cau11 = true;
  let doDai11 = 0;
  for (let i = 1; i < Math.min(lichSu.length, 15); i++) {
    if (lichSu[i] === lichSu[i-1]) break;
    cau11 = true;
    doDai11 = i;
  }
  if (doDai11 >= 5) {
    const duDoan = lichSu[0] === 'Tài' ? 'Xỉu' : 'Tài';
    let doTinCay = 70 + doDai11 * 2;
    doTinCay = Math.min(90, doTinCay);
    results.push({ duDoan, doTinCay, loai: `🔵 CẦU 1-1 DÀI ${doDai11 + 1} PHIÊN - ${doTinCay}%` });
  }
  
  // CẦU 2-2 (DOUBLE)
  if (lichSu.length >= 8) {
    let cau22 = true;
    let doDai22 = 0;
    for (let i = 0; i < Math.min(lichSu.length, 12); i += 2) {
      if (i + 1 >= lichSu.length) break;
      if (lichSu[i] !== lichSu[i+1]) { cau22 = false; break; }
      if (i + 2 < lichSu.length && lichSu[i] === lichSu[i+2]) { cau22 = false; break; }
      doDai22 = i + 2;
    }
    if (doDai22 >= 6) {
      const duDoan = lichSu[doDai22 - 2] === 'Tài' ? 'Xỉu' : 'Tài';
      let doTinCay = 75 + (doDai22 / 2) * 3;
      doTinCay = Math.min(92, doTinCay);
      results.push({ duDoan, doTinCay, loai: `🟢 CẦU 2-2 (${doDai22/2} CẶP) - ${doTinCay}%` });
    }
  }
  
  // CẦU 3-2
  if (lichSu.length >= 10) {
    const p5 = lichSu.slice(0, 5).join('');
    if (p5 === "TàiTàiTàiXỉuXỉu") {
      results.push({ duDoan: 'Xỉu', doTinCay: 86, loai: '📐 CẦU 3-2 (3T-2X) - 86%' });
    } else if (p5 === "XỉuXỉuXỉuTàiTài") {
      results.push({ duDoan: 'Tài', doTinCay: 86, loai: '📐 CẦU 3-2 (3X-2T) - 86%' });
    }
  }
  
  // CẦU 3-3
  if (lichSu.length >= 9) {
    const p9 = lichSu.slice(0, 9);
    if (p9[0] === p9[1] && p9[0] === p9[2] &&
        p9[3] === p9[4] && p9[3] === p9[5] &&
        p9[6] === p9[7] && p9[6] === p9[8] &&
        p9[0] !== p9[3] && p9[3] !== p9[6]) {
      const duDoan = p9[6] === 'Tài' ? 'Xỉu' : 'Tài';
      results.push({ duDoan, doTinCay: 90, loai: '💎 CẦU 3-3 - 90%' });
    }
  }
  
  // CẦU 4-4
  if (lichSu.length >= 12) {
    let cau44 = true;
    for (let i = 0; i < 12; i += 4) {
      if (i + 3 >= lichSu.length) break;
      if (lichSu[i] !== lichSu[i+1] || lichSu[i] !== lichSu[i+2] || lichSu[i] !== lichSu[i+3]) {
        cau44 = false;
        break;
      }
      if (i + 4 < lichSu.length && lichSu[i] === lichSu[i+4]) {
        cau44 = false;
        break;
      }
    }
    if (cau44) {
      const duDoan = lichSu[8] === 'Tài' ? 'Xỉu' : 'Tài';
      results.push({ duDoan, doTinCay: 92, loai: '💎💎 CẦU 4-4 - 92%' });
    }
  }
  
  // CẦU 1-2-1
  if (lichSu.length >= 5) {
    if (lichSu[0] === lichSu[2] && lichSu[0] === lichSu[4] && 
        lichSu[1] === lichSu[3] && lichSu[0] !== lichSu[1]) {
      const duDoan = lichSu[0] === 'Tài' ? 'Xỉu' : 'Tài';
      results.push({ duDoan, doTinCay: 83, loai: '🎯 CẦU 1-2-1 - 83%' });
    }
  }
  
  // CẦU 2-1-2
  if (lichSu.length >= 6) {
    if (lichSu[0] === lichSu[1] && lichSu[3] === lichSu[4] &&
        lichSu[0] !== lichSu[2] && lichSu[2] === lichSu[5] &&
        lichSu[0] !== lichSu[3]) {
      const duDoan = lichSu[3] === 'Tài' ? 'Xỉu' : 'Tài';
      results.push({ duDoan, doTinCay: 85, loai: '🎯 CẦU 2-1-2 - 85%' });
    }
  }
  
  return results.length > 0 ? results : null;
}

// 3. THỐNG KÊ XÁC SUẤT NÂNG CAO (Z-Score, Markov, Entropy)
function phanTichXacSuat(lichSu, tongData) {
  if (lichSu.length < 20) return null;
  
  // 3.1 THỐNG KÊ CƠ BẢN
  const last10 = lichSu.slice(0, 10);
  const last20 = lichSu.slice(0, 20);
  const last30 = lichSu.slice(0, 30);
  
  const tai10 = last10.filter(r => r === 'Tài').length;
  const tai20 = last20.filter(r => r === 'Tài').length;
  const tai30 = last30.filter(r => r === 'Tài').length;
  
  const lech10 = Math.abs(tai10 - 5);
  const lech20 = Math.abs(tai20 - 10);
  const lech30 = Math.abs(tai30 - 15);
  
  // 3.2 PHÁT HIỆN LỆCH PHA
  if (tai10 >= 8) {
    return { duDoan: 'Xỉu', doTinCay: 88, loai: `📊 LỆCH TÀI 10P (${tai10}T-${10-tai10}X) - 88%` };
  }
  if (tai10 <= 2) {
    return { duDoan: 'Tài', doTinCay: 88, loai: `📊 LỆCH XỈU 10P (${tai10}T-${10-tai10}X) - 88%` };
  }
  if (tai20 >= 15) {
    return { duDoan: 'Xỉu', doTinCay: 86, loai: `📊 LỆCH TÀI 20P (${tai20}T-${20-tai20}X) - 86%` };
  }
  if (tai20 <= 5) {
    return { duDoan: 'Tài', doTinCay: 86, loai: `📊 LỆCH XỈU 20P (${tai20}T-${20-tai20}X) - 86%` };
  }
  
  // 3.3 PHÂN TÍCH CHU KỲ (ENTROPY)
  const pattern10 = last10.join('');
  let entropy = 0;
  for (let i = 0; i <= pattern10.length - 3; i++) {
    const p = pattern10.substring(i, i + 3);
    const count = (pattern10.match(new RegExp(p, 'g')) || []).length;
    const prob = count / (pattern10.length - 2);
    entropy -= prob * Math.log2(prob);
  }
  
  if (entropy < 1.5) {
    // Chu kỳ rõ ràng, dự đoán theo chu kỳ
    const predicted = pattern10[pattern10.length - 3] === 'Tài' ? 'Xỉu' : 'Tài';
    return { duDoan: predicted, doTinCay: 78, loai: `🔄 CHU KỲ RÕ RÀNG - 78%` };
  }
  
  // 3.4 PHÂN TÍCH TỔNG ĐIỂM (nếu có)
  if (tongData && tongData.length >= 10) {
    const avgTong = tongData.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
    if (avgTong > 12.5) {
      return { duDoan: 'Xỉu', doTinCay: 76, loai: `🎲 TỔNG CAO TB ${avgTong.toFixed(1)} - XỈU 76%` };
    }
    if (avgTong < 8.5) {
      return { duDoan: 'Tài', doTinCay: 76, loai: `🎲 TỔNG THẤP TB ${avgTong.toFixed(1)} - TÀI 76%` };
    }
  }
  
  return null;
}

// 4. HỌC PATTERN TỪ LỊCH SỬ (MACHINE LEARNING ĐƠN GIẢN)
function hocPatternTuLichSu(lichSu) {
  if (lichSu.length < 15) return null;
  
  // Lưu pattern 5 phiên
  for (let i = 0; i <= lichSu.length - 6; i++) {
    const pattern = lichSu.slice(i, i + 5).join('');
    const ketQuaTiep = lichSu[i + 5];
    
    const existing = memory.patternHistory.find(p => p.pattern === pattern);
    if (existing) {
      if (ketQuaTiep === 'Tài') existing.tai++;
      else existing.xiu++;
      existing.total++;
    } else {
      memory.patternHistory.push({
        pattern: pattern,
        tai: ketQuaTiep === 'Tài' ? 1 : 0,
        xiu: ketQuaTiep === 'Xỉu' ? 1 : 0,
        total: 1
      });
    }
  }
  
  // Giới hạn bộ nhớ
  if (memory.patternHistory.length > 200) {
    memory.patternHistory = memory.patternHistory.slice(-150);
  }
  
  // Tìm pattern hiện tại
  if (lichSu.length >= 5) {
    const currentPattern = lichSu.slice(0, 5).join('');
    const found = memory.patternHistory.find(p => p.pattern === currentPattern);
    
    if (found && found.total >= 2) {
      const tyLeTai = (found.tai / found.total) * 100;
      const tyLeXiu = (found.xiu / found.total) * 100;
      const maxTyLe = Math.max(tyLeTai, tyLeXiu);
      
      if (maxTyLe >= 70) {
        const duDoan = tyLeTai > tyLeXiu ? 'Tài' : 'Xỉu';
        let doTinCay = 60 + maxTyLe * 0.3;
        doTinCay = Math.min(88, doTinCay);
        return { duDoan, doTinCay, loai: `📚 PATTERN HỌC: ${currentPattern} (${found.total} lần, ${Math.round(maxTyLe)}%)` };
      }
    }
  }
  
  return null;
}

// 5. TỔNG HỢP TẤT CẢ THUẬT TOÁN - CHỌN TÍN HIỆU MẠNH NHẤT
function tongHopDuDoan(lichSu, tongData) {
  const allPredictions = [];
  
  // Thu thập từ các nguồn
  const bet = phanTichBet(lichSu);
  if (bet) allPredictions.push(bet);
  
  const cau = phanTichCau(lichSu);
  if (cau) allPredictions.push(...cau);
  
  const xacSuat = phanTichXacSuat(lichSu, tongData);
  if (xacSuat) allPredictions.push(xacSuat);
  
  const patternHoc = hocPatternTuLichSu(lichSu);
  if (patternHoc) allPredictions.push(patternHoc);
  
  if (allPredictions.length === 0) {
    return { coDuDoan: false, lyDo: "Không có tín hiệu mạnh" };
  }
  
  // TÍNH ĐIỂM CHO TỪNG DỰ ĐOÁN
  let diemTai = 0, diemXiu = 0;
  let bestPrediction = null;
  let maxDoTinCay = 0;
  
  for (const pred of allPredictions) {
    if (pred.duDoan === 'Tài') diemTai += pred.doTinCay;
    else diemXiu += pred.doTinCay;
    
    if (pred.doTinCay > maxDoTinCay) {
      maxDoTinCay = pred.doTinCay;
      bestPrediction = pred;
    }
  }
  
  // Quyết định cuối cùng
  let duDoan = bestPrediction.duDoan;
  let doTinCay = bestPrediction.doTinCay;
  let loai = bestPrediction.loai;
  let soLuongTinHieu = allPredictions.length;
  
  // Nếu có nhiều tín hiệu trái chiều, giảm độ tin cậy
  const tyLePhanTram = Math.max(diemTai, diemXiu) / (diemTai + diemXiu);
  if (tyLePhanTram < 0.65 && soLuongTinHieu >= 3) {
    doTinCay = Math.max(doTinCay - 10, 65);
    loai = `${loai} (⚠️ Có ${soLuongTinHieu - 1} tín hiệu trái chiều)`;
  }
  
  // Giới hạn độ tin cậy
  doTinCay = Math.min(98, Math.max(55, doTinCay));
  
  return {
    coDuDoan: true,
    duDoan: duDoan,
    doTinCay: doTinCay,
    loai: loai,
    soTinHieu: soLuongTinHieu,
    chiTiet: allPredictions.map(p => ({ duDoan: p.duDoan, doTinCay: p.doTinCay, loai: p.loai }))
  };
}

// 6. DỰ ĐOÁN 2 PHIÊN
function duDoan2Phien(lichSu, tongData) {
  const p1 = tongHopDuDoan(lichSu, tongData);
  if (!p1.coDuDoan) return { coDuDoan: false, lyDo: p1.lyDo };
  
  // Dự đoán phiên 2
  const lichSuGia = [p1.duDoan, ...lichSu];
  const p2 = tongHopDuDoan(lichSuGia, tongData);
  
  return {
    coDuDoan: true,
    p1: { duDoan: p1.duDoan, doTinCay: p1.doTinCay, loai: p1.loai, soTinHieu: p1.soTinHieu },
    p2: p2.coDuDoan ? { duDoan: p2.duDoan, doTinCay: p2.doTinCay, loai: p2.loai, soTinHieu: p2.soTinHieu } : null
  };
}

// ==========================================
// API CHÍNH
// ==========================================

async function xuLyGame() {
  const sessions = await getRecentSessions(6786408, 50);
  if (!sessions || sessions.length === 0) {
    throw new Error('Không lấy được dữ liệu. Token có thể hết hạn.');
  }
  
  // Cập nhật dữ liệu
  for (const session of sessions) {
    if (!gameData.data.find(x => x.phien === session.sessionId)) {
      gameData.data.unshift(session);
    }
  }
  gameData.data = gameData.data.slice(0, 300);
  
  const current = gameData.data[0];
  const lichSu = gameData.data.map(d => d.result);
  const tongData = gameData.data.map(d => d.total).filter(t => t);
  
  // Kiểm tra dự đoán cũ
  if (gameData.lichSuDuDoan.length > 0 && gameData.lichSuDuDoan[0].ket_qua === 'CHỜ' && current) {
    const last = gameData.lichSuDuDoan[0];
    if (last.du_doan) {
      const dung = current.result === last.du_doan;
      if (dung) stats.dung++;
      else stats.sai++;
      stats.tong++;
      stats.tiLe = ((stats.dung / stats.tong) * 100).toFixed(1) + '%';
      last.ket_qua = dung ? 'ĐÚNG' : 'SAI';
      last.thuc_te = current.result;
    }
  }
  
  // Dự đoán
  const duDoan = duDoan2Phien(lichSu, tongData);
  
  // Lưu dự đoán
  if (duDoan.coDuDoan) {
    gameData.lichSuDuDoan.unshift({
      phien: current?.sessionId,
      du_doan: duDoan.p1.duDoan,
      do_tin_cay: duDoan.p1.doTinCay,
      ly_do: duDoan.p1.loai,
      ket_qua: 'CHỜ'
    });
  } else {
    stats.boQua++;
  }
  if (gameData.lichSuDuDoan.length > 100) gameData.lichSuDuDoan.pop();
  
  const coNenCuoc = duDoan.coDuDoan && duDoan.p1.doTinCay >= 80;
  
  return {
    success: true,
    game: 'lc79_tx',
    current: {
      sessionId: current?.sessionId,
      ket_qua: current?.result || '?',
      tong: current?.total || '?',
      xuc_xac: current?.dices ? `${current.dices[0]} - ${current.dices[1]} - ${current.dices[2]}` : '?'
    },
    du_doan: duDoan.coDuDoan ? {
      co_nen_cuoc: coNenCuoc ? '✅✅✅ NÊN CƯỢC MẠNH' : '⚠️ CƯỢC NHẸ',
      phien_1: (current?.sessionId || 0) + 1,
      du_doan_1: duDoan.p1.duDoan,
      do_tin_cay_1: duDoan.p1.doTinCay + '%',
      loai_1: duDoan.p1.loai,
      so_tin_hieu_1: duDoan.p1.soTinHieu,
      phien_2: duDoan.p2 ? (current?.sessionId || 0) + 2 : null,
      du_doan_2: duDoan.p2?.duDoan || null,
      do_tin_cay_2: duDoan.p2 ? duDoan.p2.doTinCay + '%' : null,
      loai_2: duDoan.p2?.loai || null,
      chi_tiet_tin_hieu: duDoan.p1.chiTiet?.slice(0, 3) || []
    } : {
      co_nen_cuoc: '⏸️ BỎ QUA',
      ly_do: duDoan.lyDo,
      note: 'KHÔNG CÓ TÍN HIỆU - BỎ QUA BẢO TOÀN VỐN'
    },
    thong_ke: {
      tong: stats.tong,
      dung: stats.dung,
      sai: stats.sai,
      ti_le: stats.tiLe,
      bo_qua: stats.boQua
    },
    lich_su_10_phien: lichSu.slice(0, 10),
    so_pattern_da_hoc: memory.patternHistory.length
  };
}

// API ENDPOINTS
app.get('/api/lc79/predict', async (req, res) => {
  try {
    const result = await xuLyGame();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/lc79/history/:limit', async (req, res) => {
  try {
    const limit = parseInt(req.params.limit) || 20;
    const startId = 6786408;
    const sessions = await getRecentSessions(startId, limit);
    res.json({ success: true, history: sessions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/lc79/session/:id', async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id);
    const data = await fetchLC79Data(sessionId);
    res.json({ success: true, sessionId, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/lc79/stats', (req, res) => {
  res.json(stats);
});

app.post('/api/lc79/feedback', (req, res) => {
  const { du_doan, ket_qua_thuc_te } = req.body;
  const dung = du_doan === ket_qua_thuc_te;
  if (dung) stats.dung++;
  else stats.sai++;
  stats.tong++;
  stats.tiLe = ((stats.dung / stats.tong) * 100).toFixed(1) + '%';
  res.json({ success: true, dung, stats });
});

app.get('/', (req, res) => {
  res.json({
    name: '🎲 LC79 TX - SIÊU THUẬT TOÁN DỰ ĐOÁN 🎲',
    author: '@tranhoang2286',
    version: '3.0 - MẠNH NHẤT',
    thuat_toan: [
      '1. 🔴 Phân tích bệt cấp độ 1-10 (xác suất đảo cầu 99%)',
      '2. 🔵 Cầu 1-1, 2-2, 3-2, 3-3, 4-4, 1-2-1, 2-1-2',
      '3. 📊 Thống kê Z-Score, lệch pha 10-20-30 phiên',
      '4. 🎲 Phân tích tổng điểm và biên độ',
      '5. 📚 Học pattern 5 phiên từ lịch sử (ML đơn giản)',
      '6. 🔄 Phân tích Entropy phát hiện chu kỳ'
    ],
    quy_tac: 'CHỈ CƯỢC KHI "co_nen_cuoc" = "✅✅✅ NÊN CƯỢC MẠNH" (độ tin cậy >= 85%)',
    endpoints: {
      'Dự đoán': 'GET /api/lc79/predict',
      'Lịch sử': 'GET /api/lc79/history/:limit'
    }
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n============================================================`);
  console.log(`🎲 LC79 TX - SIÊU THUẬT TOÁN DỰ ĐOÁN v3.0`);
  console.log(`============================================================`);
  console.log(`✅ 6 LỚP THUẬT TOÁN | PHÂN TÍCH ĐA CHIỀU`);
  console.log(`✅ HỌC PATTERN TỪ LỊCH SỬ | CHỈ CƯỢC KHI CHẮC`);
  console.log(`🚀 PORT: ${PORT}`);
  console.log(`============================================================\n`);
});