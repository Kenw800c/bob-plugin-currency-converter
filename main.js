/**
 * 声明插件支持的语言列表
 */
function supportLanguages() {
  return [
    "auto", "zh-Hans", "zh-Hant", "en", "ja", "ko",
    "fr", "de", "es", "it", "ru", "pt", "nl", "pl", "ar"
  ];
}

/**
 * Bob 核心翻译/换算入口函数
 */
function translate(query, completion) {
  const rawText = query.text.trim().toLowerCase();

  let fromCurrency = '';
  let currencySymbol = '';

  // ==========================================
  // 步骤 1：严格的货币特征预检
  // ==========================================
  if (rawText.includes('mop') || rawText.includes('澳门币') || rawText.includes('澳门元') || rawText.includes('葡币')) {
    fromCurrency = 'MOP';
    currencySymbol = 'MOP$';
  }
  else if (rawText.includes('sgd') || rawText.includes('s$') || rawText.includes('新币') || rawText.includes('新元') || rawText.includes('坡币')) {
    fromCurrency = 'SGD';
    currencySymbol = 'S$';
  }
  else if (rawText.includes('jpy') || rawText.includes('円') || rawText.includes('日元')) {
    fromCurrency = 'JPY';
    currencySymbol = '円';
  } 
  else if (rawText.includes('usd') || rawText.includes('$') || rawText.includes('美元') || rawText.includes('刀')) {
    fromCurrency = 'USD';
    currencySymbol = '$';
  } 
  else if (rawText.includes('eur') || rawText.includes('€') || rawText.includes('欧元')) {
    fromCurrency = 'EUR';
    currencySymbol = '€';
  } 
  else if (rawText.includes('gbp') || rawText.includes('£') || rawText.includes('英镑')) {
    fromCurrency = 'GBP';
    currencySymbol = '£';
  } 
  else if (rawText.includes('krw') || rawText.includes('₩') || rawText.includes('韩元')) {
    fromCurrency = 'KRW';
    currencySymbol = '₩';
  } 
  else if (rawText.includes('hkd') || rawText.includes('hk$') || rawText.includes('港币') || rawText.includes('港元')) {
    fromCurrency = 'HKD';
    currencySymbol = 'HK$';
  }
  else if (rawText.includes('￥') || rawText.includes('¥')) {
    fromCurrency = 'JPY';
    currencySymbol = '円';
  }
  else {
    completion({
      error: {
        type: 'unsupportedLanguage',
        message: '未检测到有效货币单位（如 $, 円, USD, SGD 等）'
      }
    });
    return;
  }

  // ==========================================
  // 步骤 2：全场景电商“上标缺失小数点”智能修复
  // ==========================================
  
  let amount = 0;

  // 特例 1：带逗号的千分位上标（如 "3,21839" 或 "3,218 39"）
  const amazonCommaMatch = rawText.match(/(\d+),(\d{3})\s*(\d{2})\b/);

  // 特例 2：无小数点、用空格隔开上标的格式（如 "294 78" 或 "3218 39"）
  const amazonSpaceMatch = rawText.match(/(\d+)\s+(\d{2})\b/);

  // 情况 A：处理带逗号的特例 (例如 "3,21839" -> 3218.39)
  if (!rawText.includes('.') && amazonCommaMatch) {
    const intPart = amazonCommaMatch[1] + amazonCommaMatch[2];
    const decPart = amazonCommaMatch[3];
    amount = parseFloat(`${intPart}.${decPart}`);
  }
  // 情况 B：处理空格分隔无小数点的特例 (例如 "294 78" -> 294.78)
  else if (!rawText.includes('.') && amazonSpaceMatch) {
    const intPart = amazonSpaceMatch[1];
    const decPart = amazonSpaceMatch[2];
    amount = parseFloat(`${intPart}.${decPart}`);
  }
  // 情况 C：标准带小数点的格式 (例如 "294.78" 或 "3,218.39")
  else if (rawText.includes('.')) {
    const dotSplit = rawText.split('.');
    const integerParts = dotSplit[0].match(/\d+/g);
    const decimalParts = dotSplit[1].match(/\d+/);

    const intStr = integerParts ? integerParts.join('') : '0';
    const decStr = decimalParts ? decimalParts[0] : '0';
    amount = parseFloat(`${intStr}.${decStr}`);
  } 
  // 情况 D：普通纯整数 (例如 "294" 或 "3218")
  else {
    const numParts = rawText.match(/\d+/g);
    if (!numParts || numParts.length === 0) {
      completion({
        error: {
          type: 'unsupportedLanguage',
          message: '文本中未检测到有效数字'
        }
      });
      return;
    }
    amount = parseFloat(numParts.join(''));
  }

  if (isNaN(amount) || amount === 0) {
    completion({
      error: {
        type: 'unsupportedLanguage',
        message: '数字解析失败'
      }
    });
    return;
  }

  // ==========================================
  // 步骤 3：请求 API 进行汇率换算
  // ==========================================
  $http.get({
    url: `https://open.er-api.com/v6/latest/${fromCurrency}`,
    handler: function(resp) {
      if (resp.data && resp.data.result === 'success') {
        const rateToCNY = resp.data.rates.CNY;
        if (!rateToCNY) {
          completion({
            error: {
              type: 'api',
              message: '未获取到对应人民币汇率数据'
            }
          });
          return;
        }

        const resultCNY = (amount * rateToCNY).toFixed(2);
        const singleRate = (1 * rateToCNY).toFixed(4);

        completion({
          result: {
            from: 'auto',
            to: 'zh-Hans',
            toParagraphs: [
              `≈ ¥ ${resultCNY} 人民币`,
              `\n📊 换算明细：\n• 原价：${amount} ${fromCurrency} (${currencySymbol})\n• 参考汇率：1 ${fromCurrency} = ${singleRate} CNY\n• 更新时间：实时汇率`
            ]
          }
        });
      } else {
        completion({
          error: {
            type: 'api',
            message: '汇率接口请求失败，请检查网络连接'
          }
        });
      }
    }
  });
}