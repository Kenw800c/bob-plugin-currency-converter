/**
 * 核心货币字典与解析管道 (支持葡语/欧系逗号小数点 25,50 解析)
 */

const list = {
  BRL: {
    code: "BRL",
    symbol: "R$",
    cnName: "巴西雷亚尔",
    hasDecimals: true,
    aliases: ["brl", "r$", "雷亚尔", "巴西雷亚尔"]
  },
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

function parse(rawText, originalText, defaultDollar = 'USD') {
  let matchedKey = null;

  let cleanText = rawText.replace(/['’`"]/g, '');

  // 1.1 特殊非字母单字符优先匹配
  if (/[\u00a3\uffe1]|\bgbp\b|英镑/i.test(cleanText)) {
    matchedKey = 'GBP';
  } else if (/[\u20a9\uffe6₩]|\bkrw\b|韩元|韩币/i.test(cleanText)) {
    matchedKey = 'KRW';
  } else if (/[\u20ac€]|\beur\b|欧元/i.test(cleanText)) {
    matchedKey = 'EUR';
  } else if (/[\u0e3f฿]|\bthb\b|泰铢|泰币/i.test(cleanText)) {
    matchedKey = 'THB';
  }

  // 1.2 复合别名匹配
  if (!matchedKey) {
    for (const [key, config] of Object.entries(list)) {
      const mainAliases = config.aliases.filter(a => a !== '$' && a !== '¥');
      
      if (mainAliases.some(alias => cleanText.includes(alias.toLowerCase()))) {
        matchedKey = key;
        break;
      }

      if (config.extraPatterns && config.extraPatterns.some(p => p.test(cleanText))) {
        matchedKey = key;
        break;
      }
    }
  }

  // 1.3 单符号 $ / ￥ 智能分流
  if (!matchedKey) {
    if (cleanText.includes('￥')) {
      matchedKey = 'JPY';
    } else if (cleanText.includes('$')) {
      if (defaultDollar === 'USD') {
        matchedKey = 'USD';
      } else if (defaultDollar === 'TWD') {
        matchedKey = 'TWD';
      } else if (defaultDollar === 'AUTO') {
        if (cleanText.includes('.')) {
          matchedKey = 'USD';
        } else if (/,/.test(cleanText)) {
          const parts = cleanText.split(',');
          const afterCommaDigits = (parts[parts.length - 1].match(/\d+/g) || []).join('');
          
          if (afterCommaDigits.length === 3) {
            matchedKey = 'TWD';
          } else if (afterCommaDigits.length === 4 || afterCommaDigits.length === 5 || afterCommaDigits.length <= 2) {
            matchedKey = 'USD';
          } else {
            matchedKey = 'TWD';
          }
        } else {
          const pureDigits = (cleanText.match(/\d+/g) || []).join('');
          if (pureDigits.length === 4 && /(99|90|95|00)$/.test(pureDigits)) {
            matchedKey = 'USD';
          } else {
            matchedKey = 'TWD';
          }
        }
      }
    }
  }

  if (!matchedKey || !list[matchedKey]) {
    return null;
  }

  const currencyConfig = list[matchedKey];
  const hasDecimals = currencyConfig.hasDecimals;

  let pureText = cleanText;

  let multiplier = 1;
  if (pureText.includes('万')) {
    multiplier = 10000;
  } else if (/\d\s*w\b/.test(pureText)) {
    multiplier = 10000;
  } else if (/\d\s*k\b/.test(pureText)) {
    multiplier = 1000;
  }

  let amount = 0;

  // 场景 A：带有显式英文小数点 "."
  if (pureText.includes('.')) {
    const onlyNumAndDot = pureText.replace(/,/g, '').replace(/[^\d.]/g, '');
    const match = onlyNumAndDot.match(/(\d+)\.(\d+)/);
    if (match) {
      amount = parseFloat(`${match[1]}.${match[2]}`) * multiplier;
    }
  }

  // 场景 B：没有英文小数点，处理带逗号的情况
  if (!amount && /,/.test(pureText)) {
    if (!hasDecimals) {
      // 无角分货币直接全数字拼接
      const digits = pureText.match(/\d+/g) || [];
      if (digits.length > 0) {
        amount = parseFloat(digits.join('')) * multiplier;
      }
    } else {
      const parts = pureText.split(',');
      const afterCommaDigits = (parts[parts.length - 1].match(/\d+/g) || []).join('');
      const beforeCommaDigits = parts.slice(0, -1).join('').replace(/[^\d]/g, '');

      // 1. 欧系/葡语逗号当小数点（如 25,50 或 1.250,50）
      if (afterCommaDigits.length === 1 || afterCommaDigits.length === 2) {
        amount = parseFloat(`${beforeCommaDigits}.${afterCommaDigits}`) * multiplier;
      }
      // 2. 美亚上标粘连 4~5 位（如 3,68379）
      else if (afterCommaDigits.length === 4 || afterCommaDigits.length === 5) {
        const intPart = beforeCommaDigits + afterCommaDigits.slice(0, 3);
        const decPart = afterCommaDigits.slice(3);
        amount = parseFloat(`${intPart}.${decPart}`) * multiplier;
      }
      // 3. 标准千分位整百/千（如 10,000）
      else if (afterCommaDigits.length === 3) {
        const pureIntStr = pureText.replace(/,/g, '').replace(/[^\d]/g, '');
        amount = parseFloat(pureIntStr) * multiplier;
      }
    }
  }

  // 场景 C：纯无标点切块或整数兜底
  if (!amount) {
    if (!hasDecimals) {
      const digits = pureText.match(/\d+/g) || [];
      if (digits.length > 0) {
        amount = parseFloat(digits.join('')) * multiplier;
      }
    } else {
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
        if (singleStr.length >= 5 && singleStr.length <= 6) {
          const intPart = singleStr.slice(0, -2);
          const decPart = singleStr.slice(-2);
          amount = parseFloat(`${intPart}.${decPart}`) * multiplier;
        } else {
          amount = parseFloat(singleStr) * multiplier;
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