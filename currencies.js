/**
 * 精简版核心货币字典与解析管道 (带小数点优先法则)
 */

const list = {
  GBP: {
    code: "GBP",
    symbol: "£",
    cnName: "英镑",
    hasDecimals: true,
    aliases: ["gbp", "£", "\u00a3", "\uffe1", "英镑", "磅"]
  },
  JPY: {
    code: "JPY",
    symbol: "¥",
    cnName: "日元",
    hasDecimals: false,
    aliases: ["jpy", "jp¥", "jp·", "円", "日元", "日币"],
    extraPatterns: [/^jp[\s·•·\.-]?\d/i]
  },
  USD: {
    code: "USD",
    symbol: "$",
    cnName: "美元",
    hasDecimals: true,
    aliases: ["usd", "$", "美元", "刀"]
  },
  SGD: {
    code: "SGD",
    symbol: "S$",
    cnName: "新加坡元",
    hasDecimals: true,
    aliases: ["sgd", "s$", "新币", "坡币"]
  },
  MOP: {
    code: "MOP",
    symbol: "MOP$",
    cnName: "澳门币",
    hasDecimals: true,
    aliases: ["mop$", "mop", "澳门币", "葡币"]
  },
  HKD: {
    code: "HKD",
    symbol: "HK$",
    cnName: "港币",
    hasDecimals: true,
    aliases: ["hk$", "h$", "hkd", "港币", "港元"]
  },
  THB: {
    code: "THB",
    symbol: "฿",
    cnName: "泰铢",
    hasDecimals: true,
    aliases: ["thb", "฿", "泰铢", "泰币"]
  },
  TWD: {
    code: "TWD",
    symbol: "NT$",
    cnName: "新台币",
    hasDecimals: false,
    aliases: ["nt$", "twd", "ntd", "nt", "台币", "新台币"]
  },
  EUR: {
    code: "EUR",
    symbol: "€",
    cnName: "欧元",
    hasDecimals: true,
    aliases: ["eur", "€", "\u20ac", "欧元"]
  },
  KRW: {
    code: "KRW",
    symbol: "₩",
    cnName: "韩元",
    hasDecimals: false,
    aliases: ["krw", "₩", "\u20a9", "\uffe6", "韩元", "韩币"]
  },
  AUD: {
    code: "AUD",
    symbol: "A$",
    cnName: "澳大利亚元",
    hasDecimals: true,
    aliases: ["aud", "a$", "au$", "澳元", "澳币"]
  }
};

function parse(rawText, originalText, defaultDollar = 'AUTO') {
  let matchedKey = null;

  // ==========================================
  // 步骤 1：全符号正则匹配
  // ==========================================
  
  if (/[\u00a3\uffe1]|\bgbp\b|英镑/i.test(rawText)) {
    matchedKey = 'GBP';
  } else if (/[\u20a9\uffe6₩]|\bkrw\b|韩元|韩币/i.test(rawText)) {
    matchedKey = 'KRW';
  } else if (/[\u20ac€]|\beur\b|欧元/i.test(rawText)) {
    matchedKey = 'EUR';
  } else if (/[\u0e3f฿]|\bthb\b|泰铢|泰币/i.test(rawText)) {
    matchedKey = 'THB';
  }

  // 1.2 复合别名匹配 (HK$, H$, S$, NT$, MOP$, JP¥, USD, JPY 等)
  if (!matchedKey) {
    for (const [key, config] of Object.entries(list)) {
      const mainAliases = config.aliases.filter(a => a !== '$' && a !== '¥');
      
      if (mainAliases.some(alias => rawText.includes(alias.toLowerCase()))) {
        matchedKey = key;
        break;
      }

      if (config.extraPatterns && config.extraPatterns.some(p => p.test(rawText))) {
        matchedKey = key;
        break;
      }
    }
  }

  // 1.3 单符号 $ / ￥ 智能分流
  if (!matchedKey) {
    if (rawText.includes('￥')) {
      matchedKey = 'JPY';
    } else if (rawText.includes('$')) {
      if (defaultDollar === 'USD') {
        matchedKey = 'USD';
      } else if (defaultDollar === 'AUTO') {
        if (rawText.includes('.')) {
          matchedKey = 'USD';
        } else if (/,/.test(rawText)) {
          const parts = rawText.split(',');
          const afterComma = (parts[parts.length - 1].match(/\d+/g) || []).join('');
          if (afterComma.length === 3) {
            matchedKey = 'TWD';
          } else if (afterComma.length === 5) {
            matchedKey = 'USD';
          } else {
            matchedKey = 'TWD';
          }
        } else {
          const pureDigits = (rawText.match(/\d+/g) || []).join('');
          if (pureDigits.length === 4 && /(99|90|95|00)$/.test(pureDigits)) {
            matchedKey = 'USD';
          } else {
            matchedKey = 'TWD';
          }
        }
      } else {
        matchedKey = defaultDollar;
      }
    }
  }

  if (!matchedKey || !list[matchedKey]) {
    return null;
  }

  const currencyConfig = list[matchedKey];
  const hasDecimals = currencyConfig.hasDecimals;

  // ==========================================
  // 步骤 2：数值提取管道 (优先尊重显式小数点)
  // ==========================================
  let pureText = rawText;

  let multiplier = 1;
  if (pureText.includes('万')) {
    multiplier = 10000;
  } else if (/\d\s*w\b/.test(pureText)) {
    multiplier = 10000;
  } else if (/\d\s*k\b/.test(pureText)) {
    multiplier = 1000;
  }

  let amount = 0;

  // 🌟 铁律 1：不论任何货币，只要文本中带有明确的小数点 "."，优先按标准小数解析！
  if (pureText.includes('.')) {
    const onlyNumAndDot = pureText.replace(/,/g, '').replace(/[^\d.]/g, '');
    const match = onlyNumAndDot.match(/(\d+)\.(\d+)/);
    if (match) {
      amount = parseFloat(`${match[1]}.${match[2]}`) * multiplier;
    }
  }

  // 场景 B：没有小数点时的提取分支
  if (!amount) {
    if (!hasDecimals) {
      // 没有任何小数点的无角分货币 (JPY, TWD, KRW)：纯整数
      const digits = pureText.match(/\d+/g) || [];
      if (digits.length > 0) {
        amount = parseFloat(digits.join('')) * multiplier;
      }
    } else {
      // 没有任何小数点的带角分货币 (GBP, USD, EUR, HKD 等)
      
      // 千分位整数 (如 $10,600)
      if (/,/.test(pureText)) {
        const parts = pureText.split(',');
        const lastPartDigits = (parts[parts.length - 1].match(/\d+/g) || []).join('');
        if (lastPartDigits.length === 3) {
          const pureIntStr = pureText.replace(/,/g, '').replace(/[^\d]/g, '');
          amount = parseFloat(pureIntStr) * multiplier;
        }
      }

      // 切块或粘连角分
      if (!amount) {
        const noCommaText = pureText.replace(/,/g, '');
        const blocks = noCommaText.match(/\d+/g) || [];

        if (blocks.length >= 2) {
          const lastBlock = blocks[blocks.length - 1];
          if (lastBlock.length <= 2) {
            const intPart = blocks.slice(0, -1).join('');
            const decPart = lastBlock.padStart(2, '0');
            amount = parseFloat(`${intPart}.${decPart}`) * multiplier;
          } else {
            amount = parseFloat(blocks.join('')) * multiplier;
          }
        } else if (blocks.length === 1) {
          const singleStr = blocks[0];
          if (singleStr.length >= 3 && singleStr.length <= 6) {
            const intPart = singleStr.slice(0, -2);
            const decPart = singleStr.slice(-2);
            amount = parseFloat(`${intPart}.${decPart}`) * multiplier;
          } else {
            amount = parseFloat(singleStr) * multiplier;
          }
        }
      }
    }
  }

  if (!amount || isNaN(amount) || amount <= 0) {
    return null;
  }

  return {
    amount: amount,
    currencyCode: currencyConfig.code,
    symbol: currencyConfig.symbol,
    cnName: currencyConfig.cnName
  };
}

module.exports = {
  list,
  parse
};