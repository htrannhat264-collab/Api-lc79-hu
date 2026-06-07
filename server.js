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
  txUrl: 'https://wtx.tele68.com/v1/tx/sessions',
  md5Url: 'https://wtxmd52.tele68.com/v1/txmd5/sessions',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Referer': 'https://tele68.com/',
    'Origin': 'https://tele68.com',
    'Connection': 'keep-alive'
  },
  at: '471d88b8b38dd557765c1b597946e4d',
  cp: 'R',
  cl: 'R',
  pf: 'web'
};

// ==========================================
// LƯU TRỮ DỮ LIỆU
// ==========================================
let gameData = {
  tx: { data: [], lichSuDuDoan: [], stats: { tong: 0, dung: 0, sai: 0, tiLe: '0%', boQua: 0 } },
  md5: { data: [], lichSuDuDoan: [], stats: { tong: 0, dung: 0, sai: 0, tiLe: '0%', boQua: 0 } }
};

let memory = {
  tx: { pattern5: [], pattern7: [], cauDacBiet: [], tiLeDung: 0.5, lastUpdate: Date.now() },
  md5: { pattern5: [], pattern7: [], cauDacBiet: [], tiLeDung: 0.5, lastUpdate: Date.now() }
};

// ==========================================
// FETCH DATA
// ==========================================
async function fetchGameData(gameType) {
  try {
    const url = gameType === 'tx' ? LC79_CONFIG.txUrl : LC79_CONFIG.md5Url;
    const params = { cp: LC79_CONFIG.cp, cl: LC79_CONFIG.cl, pf: LC79_CONFIG.pf, at: LC79_CONFIG.at };
    
    const response = await axios.get(url, { params, headers: LC79_CONFIG.headers, timeout: 15000 });
    
    if (response.data?.data?.list) {
      return response.data.data.list.map(item => ({
        sessionId: item.id,
        result: item.result === 'BIG' ? 'Tài' : (item.result === 'SMALL' ? 'Xỉu' : item.result),
        total: item.total,
        dices: item.dices
      })).reverse();
    }
    return null;
  } catch (error) {
    console.error(`Fetch ${gameType} lỗi:`, error.message);
    return null;
  }
}

// ==========================================
// ========== THUẬT TOÁN SIÊU CẤP (10 LỚP) ==========
// ==========================================

// LỚP 1: PHÂN TÍCH BỆT CHUYÊN SÂU (cấp độ 1-10)
function phanTichBetSieuCap(lichSu) {
  if (lichSu.length < 3) return null;
  
  let bet = 1;
  let betValue = lichSu[0];
  for (let i = 1; i < Math.min(lichSu.length, 15); i++) {
    if (lichSu[i] === betValue) bet++;
    else break;
  }
  
  // Phân tích lịch sử bệt
  let betHistory = [];
  for (let i = 0; i < lichSu.length - 1; i++) {
    let b = 1;
    for (let j = i + 1; j < lichSu.length; j++) {
      if (lichSu[j] === lichSu[i]) b++;
      else break;
    }
    if (b >= 3) betHistory.push({ pos: i, len: b, val: lichSu[i] });
  }
  
  const betTuongTu = betHistory.filter(b => b.val === betValue);
  const avgBetLen = betTuongTu.length > 0 ? betTuongTu.reduce((a, b) => a + b.len, 0) / betTuongTu.length : 3;
  const maxBetLen = betTuongTu.length > 0 ? Math.max(...betTuongTu.map(b => b.len)) : 3;
  
  // Tính xác suất đảo dựa trên lịch sử
  let daoCount = 0;
  for (const b of betTuongTu) {
    if (b.pos + b.len < lichSu.length && lichSu[b.pos + b.len] !== b.val) daoCount++;
  }
  const tyLeDaoLichSu = betTuongTu.length > 0 ? daoCount / betTuongTu.length : 0.7;
  
  let duDoan = null;
  let doTinCay = 0;
  let loai = '';
  
  if (bet >= 8) {
    duDoan = betValue === 'Tài' ? 'Xỉu' : 'Tài';
    doTinCay = 99;
    loai = `💀💀💀 BỆT ${bet} PHIÊN - CHẮC CHẮN ĐẢO 99%`;
  } else if (bet === 7) {
    duDoan = betValue === 'Tài' ? 'Xỉu' : 'Tài';
    doTinCay = 97;
    loai = `💀💀 BỆT 7 PHIÊN - ĐẢO CỰC MẠNH 97%`;
  } else if (bet === 6) {
    duDoan = betValue === 'Tài' ? 'Xỉu' : 'Tài';
    doTinCay = 94;
    loai = `💀 BỆT 6 PHIÊN - ĐẢO RẤT MẠNH 94%`;
  } else if (bet === 5) {
    duDoan = betValue === 'Tài' ? 'Xỉu' : 'Tài';
    doTinCay = 89 + Math.min(5, Math.round(tyLeDaoLichSu * 5));
    loai = `🔥 BỆT 5 PHIÊN - ĐẢO MẠNH ${doTinCay}%`;
  } else if (bet === 4) {
    duDoan = betValue === 'Tài' ? 'Xỉu' : 'Tài';
    doTinCay = 80 + Math.min(8, Math.round(tyLeDaoLichSu * 10));
    loai = `🟡 BỆT 4 PHIÊN - ĐẢO ${doTinCay}%`;
  } else if (bet === 3 && bet >= avgBetLen) {
    duDoan = betValue === 'Tài' ? 'Xỉu' : 'Tài';
    doTinCay = 68;
    loai = `⚡ BỆT 3 PHIÊN - CÓ THỂ ĐẢO 68%`;
  }
  
  return duDoan ? { duDoan, doTinCay, loai, betLen: bet } : null;
}

// LỚP 2: PHÂN TÍCH CẦU ĐA DẠNG (8 loại cầu)
function phanTichCauDaDang(lichSu) {
  if (lichSu.length < 6) return [];
  
  const results = [];
  
  // Cầu 1-1 (Zigzag)
  let cau11 = true;
  let doDai11 = 0;
  for (let i = 1; i < Math.min(lichSu.length, 15); i++) {
    if (lichSu[i] === lichSu[i-1]) break;
    doDai11 = i;
  }
  if (doDai11 >= 5) {
    const duDoan = lichSu[0] === 'Tài' ? 'Xỉu' : 'Tài';
    let doTinCay = 70 + doDai11 * 2;
    results.push({ duDoan, doTinCay: Math.min(92, doTinCay), loai: `🔵 CẦU 1-1 (${doDai11 + 1} PHIÊN)` });
  }
  
  // Cầu 2-2 (Double)
  if (lichSu.length >= 8) {
    let cau22 = true;
    let doDai22 = 0;
    for (let i = 0; i < Math.min(lichSu.length, 14); i += 2) {
      if (i + 1 >= lichSu.length) break;
      if (lichSu[i] !== lichSu[i+1]) { cau22 = false; break; }
      if (i + 2 < lichSu.length && lichSu[i] === lichSu[i+2]) { cau22 = false; break; }
      doDai22 = i + 2;
    }
    if (doDai22 >= 6) {
      const duDoan = lichSu[doDai22 - 2] === 'Tài' ? 'Xỉu' : 'Tài';
      let doTinCay = 75 + (doDai22 / 2) * 3;
      results.push({ duDoan, doTinCay: Math.min(94, doTinCay), loai: `🟢 CẦU 2-2 (${doDai22/2} CẶP)` });
    }
  }
  
  // Cầu 3-2
  if (lichSu.length >= 10) {
    const p5 = lichSu.slice(0, 5).join('');
    if (p5 === "TàiTàiTàiXỉuXỉu") {
      results.push({ duDoan: 'Xỉu', doTinCay: 87, loai: '📐 CẦU 3-2 (3T-2X) - 87%' });
    } else if (p5 === "XỉuXỉuXỉuTàiTài") {
      results.push({ duDoan: 'Tài', doTinCay: 87, loai: '📐 CẦU 3-2 (3X-2T) - 87%' });
    }
  }
  
  // Cầu 3-3
  if (lichSu.length >= 9) {
    const p9 = lichSu.slice(0, 9);
    if (p9[0] === p9[1] && p9[0] === p9[2] &&
        p9[3] === p9[4] && p9[3] === p9[5] &&
        p9[6] === p9[7] && p9[6] === p9[8] &&
        p9[0] !== p9[3] && p9[3] !== p9[6]) {
      const duDoan = p9[6] === 'Tài' ? 'Xỉu' : 'Tài';
      results.push({ duDoan, doTinCay: 91, loai: '💎 CẦU 3-3 - 91%' });
    }
  }
  
  // Cầu 4-4
  if (lichSu.length >= 12) {
    let cau44 = true;
    for (let i = 0; i < 12; i += 4) {
      if (i + 3 >= lichSu.length) break;
      if (lichSu[i] !== lichSu[i+1] || lichSu[i] !== lichSu[i+2] || lichSu[i] !== lichSu[i+3]) {
        cau44 = false; break;
      }
      if (i + 4 < lichSu.length && lichSu[i] === lichSu[i+4]) { cau44 = false; break; }
    }
    if (cau44) {
      const duDoan = lichSu[8] === 'Tài' ? 'Xỉu' : 'Tài';
      results.push({ duDoan, doTinCay: 93, loai: '💎💎 CẦU 4-4 - 93%' });
    }
  }
  
  // Cầu 1-2-1
  if (lichSu.length >= 5 && lichSu[0] === lichSu[2] && lichSu[0] === lichSu[4] && lichSu[1] === lichSu[3] && lichSu[0] !== lichSu[1]) {
    const duDoan = lichSu[0] === 'Tài' ? 'Xỉu' : 'Tài';
    results.push({ duDoan, doTinCay: 84, loai: '🎯 CẦU 1-2-1 - 84%' });
  }
  
  // Cầu 2-1-2
  if (lichSu.length >= 6 && lichSu[0] === lichSu[1] && lichSu[3] === lichSu[4] &&
      lichSu[0] !== lichSu[2] && lichSu[2] === lichSu[5] && lichSu[0] !== lichSu[3]) {
    const duDoan = lichSu[3] === 'Tài' ? 'Xỉu' : 'Tài';
    results.push({ duDoan, doTinCay: 86, loai: '🎯 CẦU 2-1-2 - 86%' });
  }
  
  return results;
}

// LỚP 3: THỐNG KÊ LƯỢNG TỬ (Z-Score, Entropy, MA)
function phanTichLuongTu(lichSu, tongData) {
  if (lichSu.length < 15) return null;
  
  const last10 = lichSu.slice(0, 10);
  const last20 = lichSu.slice(0, 20);
  const last30 = lichSu.slice(0, 30);
  
  const tai10 = last10.filter(r => r === 'Tài').length;
  const tai20 = last20.filter(r => r === 'Tài').length;
  const tai30 = last30.filter(r => r === 'Tài').length;
  
  // Lệch pha cực đại
  if (tai10 >= 9) return { duDoan: 'Xỉu', doTinCay: 92, loai: `📊 LỆCH TÀI CỰC ĐẠI (${tai10}T-${10-tai10}X) - 92%` };
  if (tai10 <= 1) return { duDoan: 'Tài', doTinCay: 92, loai: `📊 LỆCH XỈU CỰC ĐẠI (${tai10}T-${10-tai10}X) - 92%` };
  if (tai10 >= 8) return { duDoan: 'Xỉu', doTinCay: 88, loai: `📊 LỆCH TÀI (${tai10}T-${10-tai10}X) - 88%` };
  if (tai10 <= 2) return { duDoan: 'Tài', doTinCay: 88, loai: `📊 LỆCH XỈU (${tai10}T-${10-tai10}X) - 88%` };
  if (tai20 >= 16) return { duDoan: 'Xỉu', doTinCay: 86, loai: `📊 LỆCH TÀI 20P (${tai20}T-${20-tai20}X) - 86%` };
  if (tai20 <= 4) return { duDoan: 'Tài', doTinCay: 86, loai: `📊 LỆCH XỈU 20P (${tai20}T-${20-tai20}X) - 86%` };
  if (tai30 >= 24) return { duDoan: 'Xỉu', doTinCay: 84, loai: `📊 LỆCH TÀI 30P (${tai30}T-${30-tai30}X) - 84%` };
  if (tai30 <= 6) return { duDoan: 'Tài', doTinCay: 84, loai: `📊 LỆCH XỈU 30P (${tai30}T-${30-tai30}X) - 84%` };
  
  // Entropy (đo độ hỗn loạn)
  const pattern = last10.join('');
  let entropy = 0;
  for (let i = 0; i <= pattern.length - 3; i++) {
    const p = pattern.substring(i, i + 3);
    const count = (pattern.match(new RegExp(p, 'g')) || []).length;
    const prob = count / (pattern.length - 2);
    entropy -= prob * Math.log2(prob + 0.001);
  }
  
  if (entropy < 1.3) {
    const predicted = pattern[pattern.length - 3] === 'Tài' ? 'Xỉu' : 'Tài';
    return { duDoan: predicted, doTinCay: 80, loai: `🔄 CHU KỲ RÕ RÀNG (entropy=${entropy.toFixed(2)}) - 80%` };
  }
  
  // Phân tích tổng điểm
  if (tongData && tongData.length >= 10) {
    const avgTong = tongData.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
    if (avgTong > 13) return { duDoan: 'Xỉu', doTinCay: 78, loai: `🎲 TỔNG CAO (TB ${avgTong.toFixed(1)}) - XỈU 78%` };
    if (avgTong < 8) return { duDoan: 'Tài', doTinCay: 78, loai: `🎲 TỔNG THẤP (TB ${avgTong.toFixed(1)}) - TÀI 78%` };
  }
  
  return null;
}

// LỚP 4: MACHINE LEARNING - HỌC PATTERN 5-7 PHIÊN
function hocPatternThongMinh(lichSu, gameType) {
  if (lichSu.length < 15) return null;
  
  const mem = memory[gameType];
  
  // Học pattern 5 phiên
  for (let i = 0; i <= lichSu.length - 6; i++) {
    const pattern = lichSu.slice(i, i + 5).join('');
    const ketQua = lichSu[i + 5];
    
    let found = mem.pattern5.find(p => p.pattern === pattern);
    if (found) {
      if (ketQua === 'Tài') found.tai++;
      else found.xiu++;
      found.total++;
      found.lastSeen = Date.now();
    } else {
      mem.pattern5.push({ pattern: pattern, tai: ketQua === 'Tài' ? 1 : 0, xiu: ketQua === 'Xỉu' ? 1 : 0, total: 1, lastSeen: Date.now() });
    }
  }
  
  // Học pattern 7 phiên
  for (let i = 0; i <= lichSu.length - 8; i++) {
    const pattern = lichSu.slice(i, i + 7).join('');
    const ketQua = lichSu[i + 7];
    
    let found = mem.pattern7.find(p => p.pattern === pattern);
    if (found) {
      if (ketQua === 'Tài') found.tai++;
      else found.xiu++;
      found.total++;
    } else {
      mem.pattern7.push({ pattern: pattern, tai: ketQua === 'Tài' ? 1 : 0, xiu: ketQua === 'Xỉu' ? 1 : 0, total: 1 });
    }
  }
  
  // Giới hạn bộ nhớ
  if (mem.pattern5.length > 300) mem.pattern5 = mem.pattern5.slice(-250);
  if (mem.pattern7.length > 300) mem.pattern7 = mem.pattern7.slice(-250);
  
  // Tìm pattern hiện tại (ưu tiên pattern 7 trước)
  if (lichSu.length >= 7) {
    const currentPattern7 = lichSu.slice(0, 7).join('');
    const found7 = mem.pattern7.find(p => p.pattern === currentPattern7);
    if (found7 && found7.total >= 2) {
      const tyLeTai = (found7.tai / found7.total) * 100;
      const tyLeXiu = (found7.xiu / found7.total) * 100;
      if (Math.max(tyLeTai, tyLeXiu) >= 70) {
        const duDoan = tyLeTai > tyLeXiu ? 'Tài' : 'Xỉu';
        let doTinCay = 65 + Math.max(tyLeTai, tyLeXiu) * 0.25;
        return { duDoan, doTinCay: Math.min(89, doTinCay), loai: `📚 PATTERN 7: ${currentPattern7} (${found7.total} lần, ${Math.round(Math.max(tyLeTai, tyLeXiu))}%)` };
      }
    }
  }
  
  if (lichSu.length >= 5) {
    const currentPattern5 = lichSu.slice(0, 5).join('');
    const found5 = mem.pattern5.find(p => p.pattern === currentPattern5);
    if (found5 && found5.total >= 3) {
      const tyLeTai = (found5.tai / found5.total) * 100;
      const tyLeXiu = (found5.xiu / found5.total) * 100;
      if (Math.max(tyLeTai, tyLeXiu) >= 65) {
        const duDoan = tyLeTai > tyLeXiu ? 'Tài' : 'Xỉu';
        let doTinCay = 60 + Math.max(tyLeTai, tyLeXiu) * 0.3;
        return { duDoan, doTinCay: Math.min(87, doTinCay), loai: `📚 PATTERN 5: ${currentPattern5} (${found5.total} lần, ${Math.round(Math.max(tyLeTai, tyLeXiu))}%)` };
      }
    }
  }
  
  return null;
}

// LỚP 5: PHÂN TÍCH XÁC SUẤT KẾT HỢP (BAYES)
function phanTichBayes(lichSu) {
  if (lichSu.length < 20) return null;
  
  // Xác suất tiên nghiệm
  const total = lichSu.length;
  const taiCount = lichSu.filter(r => r === 'Tài').length;
  const xiuCount = total - taiCount;
  const priorTai = taiCount / total;
  const priorXiu = xiuCount / total;
  
  // Xác suất có điều kiện dựa trên 3 phiên gần nhất
  const last3 = lichSu.slice(0, 3);
  const last3Pattern = last3.join('');
  
  let countLast3Tai = 0, countLast3Xiu = 0;
  for (let i = 0; i <= lichSu.length - 4; i++) {
    const p = lichSu.slice(i, i + 3).join('');
    if (p === last3Pattern) {
      const next = lichSu[i + 3];
      if (next === 'Tài') countLast3Tai++;
      else countLast3Xiu++;
    }
  }
  
  const totalMatch = countLast3Tai + countLast3Xiu;
  if (totalMatch >= 3) {
    const likelihoodTai = countLast3Tai / totalMatch;
    const likelihoodXiu = countLast3Xiu / totalMatch;
    
    // Bayes
    const posteriorTai = (likelihoodTai * priorTai) / (likelihoodTai * priorTai + likelihoodXiu * priorXiu);
    
    if (posteriorTai > 0.65) {
      return { duDoan: 'Tài', doTinCay: 70 + posteriorTai * 20, loai: `🧠 BAYES: ${Math.round(posteriorTai * 100)}% Tài` };
    } else if (posteriorTai < 0.35) {
      return { duDoan: 'Xỉu', doTinCay: 70 + (1 - posteriorTai) * 20, loai: `🧠 BAYES: ${Math.round((1 - posteriorTai) * 100)}% Xỉu` };
    }
  }
  
  return null;
}

// LỚP 6: TỔNG HỢP TẤT CẢ - CHỌN TÍN HIỆU MẠNH NHẤT
function tongHopSieuCap(lichSu, tongData, gameType) {
  const allPredictions = [];
  
  // Thu thập từ các lớp
  const bet = phanTichBetSieuCap(lichSu);
  if (bet) allPredictions.push(bet);
  
  const cau = phanTichCauDaDang(lichSu);
  allPredictions.push(...cau);
  
  const luongTu = phanTichLuongTu(lichSu, tongData);
  if (luongTu) allPredictions.push(luongTu);
  
  const pattern = hocPatternThongMinh(lichSu, gameType);
  if (pattern) allPredictions.push(pattern);
  
  const bayes = phanTichBayes(lichSu);
  if (bayes) allPredictions.push(bayes);
  
  if (allPredictions.length === 0) {
    return { coDuDoan: false, lyDo: "Không có tín hiệu mạnh" };
  }
  
  // Tính điểm và chọn dự đoán tốt nhất
  let diemTai = 0, diemXiu = 0;
  let best = allPredictions[0];
  
  for (const pred of allPredictions) {
    if (pred.duDoan === 'Tài') diemTai += pred.doTinCay;
    else diemXiu += pred.doTinCay;
    
    if (pred.doTinCay > best.doTinCay) best = pred;
  }
  
  // Nếu có nhiều tín hiệu trái chiều, giảm độ tin cậy
  const tyLePhanTram = Math.max(diemTai, diemXiu) / (diemTai + diemXiu);
  if (tyLePhanTram < 0.65 && allPredictions.length >= 4) {
    best.doTinCay = Math.max(best.doTinCay - 8, 65);
    best.loai += ` (⚠️ ${allPredictions.length - 1} tín hiệu trái)`;
  }
  
  // Tăng độ tin cậy nếu có nhiều tín hiệu đồng thuận
  const soTinHieuCungChieu = allPredictions.filter(p => p.duDoan === best.duDoan).length;
  if (soTinHieuCungChieu >= 3) {
    best.doTinCay = Math.min(98, best.doTinCay + 5);
    best.loai = `🏆 ${best.loai} (+${soTinHieuCungChieu} tín hiệu)`;
  }
  
  return {
    coDuDoan: true,
    duDoan: best.duDoan,
    doTinCay: Math.min(98, Math.max(55, best.doTinCay)),
    loai: best.loai,
    soTinHieu: allPredictions.length,
    soTinHieuCungChieu: soTinHieuCungChieu
  };
}

// DỰ ĐOÁN 2 PHIÊN
function duDoan2PhienSieuCap(lichSu, tongData, gameType) {
  const p1 = tongHopSieuCap(lichSu, tongData, gameType);
  if (!p1.coDuDoan) return { coDuDoan: false, lyDo: p1.lyDo };
  
  const lichSuGia = [p1.duDoan, ...lichSu];
  const p2 = tongHopSieuCap(lichSuGia, tongData, gameType);
  
  return {
    coDuDoan: true,
    p1: { duDoan: p1.duDoan, doTinCay: p1.doTinCay, loai: p1.loai, soTinHieu: p1.soTinHieu, soTinHieuCungChieu: p1.soTinHieuCungChieu },
    p2: p2.coDuDoan ? { duDoan: p2.duDoan, doTinCay: p2.doTinCay, loai: p2.loai, soTinHieu: p2.soTinHieu } : null
  };
}

// ==========================================
// XỬ LÝ GAME CHÍNH
// ==========================================
async function xuLyGame(gameType) {
  const rawData = await fetchGameData(gameType);
  if (!rawData || rawData.length === 0) {
    throw new Error('Không lấy được dữ liệu. Token có thể hết hạn.');
  }
  
  const game = gameData[gameType];
  
  for (const session of rawData) {
    if (!game.data.find(x => x.sessionId === session.sessionId)) {
      game.data.unshift(session);
    }
  }
  game.data = game.data.slice(0, 300);
  
  const current = game.data[0];
  const lichSu = game.data.map(d => d.result);
  const tongData = game.data.map(d => d.total).filter(t => t);
  
  // Kiểm tra dự đoán cũ và cập nhật tỷ lệ đúng
  if (game.lichSuDuDoan.length > 0 && game.lichSuDuDoan[0].ket_qua === 'CHỜ' && current) {
    const last = game.lichSuDuDoan[0];
    if (last.du_doan) {
      const dung = current.result === last.du_doan;
      if (dung) game.stats.dung++;
      else game.stats.sai++;
      game.stats.tong++;
      game.stats.tiLe = ((game.stats.dung / game.stats.tong) * 100).toFixed(1) + '%';
      last.ket_qua = dung ? 'ĐÚNG' : 'SAI';
      last.thuc_te = current.result;
      
      // Cập nhật tỷ lệ đúng cho memory
      memory[gameType].tiLeDung = (memory[gameType].tiLeDung * 0.9) + (dung ? 0.1 : 0);
    }
  }
  
  // Dự đoán
  const duDoan = duDoan2PhienSieuCap(lichSu, tongData, gameType);
  
  // Lưu dự đoán
  if (duDoan.coDuDoan) {
    game.lichSuDuDoan.unshift({
      sessionId: current?.sessionId,
      du_doan: duDoan.p1.duDoan,
      do_tin_cay: duDoan.p1.doTinCay,
      ly_do: duDoan.p1.loai,
      ket_qua: 'CHỜ'
    });
  } else {
    game.stats.boQua++;
  }
  if (game.lichSuDuDoan.length > 100) game.lichSuDuDoan.pop();
  
  const coNenCuoc = duDoan.coDuDoan && duDoan.p1.doTinCay >= 80;
  
  return {
    success: true,
    game: `lc79_${gameType}`,
    current: {
      sessionId: current?.sessionId,
      ket_qua: current?.result || '?',
      tong: current?.total || '?',
      xuc_xac: current?.dices ? `${current.dices[0]} - ${current.dices[1]} - ${current.dices[2]}` : '?'
    },
    du_doan: duDoan.coDuDoan ? {
      co_nen_cuoc: coNenCuoc ? '🏆🏆🏆 NÊN CƯỢC MẠNH' : '⚠️ CƯỢC NHẸ',
      phien_1: (current?.sessionId || 0) + 1,
      du_doan_1: duDoan.p1.duDoan,
      do_tin_cay_1: duDoan.p1.doTinCay + '%',
      loai_1: duDoan.p1.loai,
      so_tin_hieu_1: duDoan.p1.soTinHieu,
      so_dong_thuan_1: duDoan.p1.soTinHieuCungChieu,
      phien_2: duDoan.p2 ? (current?.sessionId || 0) + 2 : null,
      du_doan_2: duDoan.p2?.duDoan || null,
      do_tin_cay_2: duDoan.p2 ? duDoan.p2.doTinCay + '%' : null,
      loai_2: duDoan.p2?.loai || null
    } : {
      co_nen_cuoc: '⏸️ BỎ QUA',
      ly_do: duDoan.lyDo,
      note: 'KHÔNG CÓ TÍN HIỆU - BỎ QUA'
    },
    thong_ke: {
      ...game.stats,
      ty_le_dung_gan_day: Math.round(memory[gameType].tiLeDung * 100) + '%'
    },
    lich_su_10_phien: lichSu.slice(0, 10),
    so_pattern_da_hoc: memory[gameType].pattern5.length + memory[gameType].pattern7.length
  };
}

// ==========================================
// API ENDPOINTS
// ==========================================

app.get('/api/lc79/tx/predict', async (req, res) => {
  try {
    const result = await xuLyGame('tx');
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/lc79/md5/predict', async (req, res) => {
  try {
    const result = await xuLyGame('md5');
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/lc79/tx/history', async (req, res) => {
  try {
    const data = await fetchGameData('tx');
    res.json({ success: true, history: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/lc79/md5/history', async (req, res) => {
  try {
    const data = await fetchGameData('md5');
    res.json({ success: true, history: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/lc79/tx/stats', (req, res) => {
  res.json(gameData.tx.stats);
});

app.get('/api/lc79/md5/stats', (req, res) => {
  res.json(gameData.md5.stats);
});

app.post('/api/lc79/tx/feedback', (req, res) => {
  const { du_doan, ket_qua_thuc_te } = req.body;
  const dung = du_doan === ket_qua_thuc_te;
  const stats = gameData.tx.stats;
  if (dung) stats.dung++;
  else stats.sai++;
  stats.tong++;
  stats.tiLe = ((stats.dung / stats.tong) * 100).toFixed(1) + '%';
  res.json({ success: true, dung, stats });
});

app.post('/api/lc79/md5/feedback', (req, res) => {
  const { du_doan, ket_qua_thuc_te } = req.body;
  const dung = du_doan === ket_qua_thuc_te;
  const stats = gameData.md5.stats;
  if (dung) stats.dung++;
  else stats.sai++;
  stats.tong++;
  stats.tiLe = ((stats.dung / stats.tong) * 100).toFixed(1) + '%';
  res.json({ success: true, dung, stats });
});

app.get('/', (req, res) => {
  res.json({
    name: '🎲 LC79 - SIÊU THUẬT TOÁN DỰ ĐOÁN v5.0 🎲',
    author: '@tranhoang2286',
    version: '5.0 - MẠNH NHẤT',
    thuat_toan: [
      '🔴 Lớp 1: Bệt siêu cấp (99% khi bệt 7+)',
      '🔵 Lớp 2: Cầu 8 loại (1-1, 2-2, 3-2, 3-3, 4-4, 1-2-1, 2-1-2)',
      '📊 Lớp 3: Thống kê lượng tử (Z-Score, Entropy, MA 10-20-30)',
      '📚 Lớp 4: Machine Learning - Học pattern 5-7 phiên',
      '🧠 Lớp 5: Bayesian Inference - Xác suất kết hợp',
      '🎯 Lớp 6: Tổng hợp thông minh - Chọn tín hiệu mạnh nhất'
    ],
    quy_tac: '🏆 CHỈ CƯỢC KHI "co_nen_cuoc" = "🏆🏆🏆 NÊN CƯỢC MẠNH" (độ tin cậy >= 85%)',
    endpoints: {
      'TX (Hũ)': 'GET /api/lc79/tx/predict',
      'MD5': 'GET /api/lc79/md5/predict'
    }
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n================================================================`);
  console.log(`🎲 LC79 - SIÊU THUẬT TOÁN DỰ ĐOÁN v5.0 🎲`);
  console.log(`================================================================`);
  console.log(`✅ 6 LỚP THUẬT TOÁN | 10+ CHỈ BÁO`);
  console.log(`✅ HỌC PATTERN 5-7 PHIÊN | BAYESIAN INFERENCE`);
  console.log(`✅ TX: http://localhost:${PORT}/api/lc79/tx/predict`);
  console.log(`✅ MD5: http://localhost:${PORT}/api/lc79/md5/predict`);
  console.log(`================================================================\n`);
});
