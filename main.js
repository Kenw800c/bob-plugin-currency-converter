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
  // 步骤 2：全场景数值提取与电商上标纠错
  // ==========================================
  
  let amount = 0;

  // 检查是否包含明确的小数点
  if (rawText.includes('.')) {
    const dotSplit = rawText.split('.');
    const integerParts = dotSplit[0].match(/\d+/g);
    const decimalParts = dotSplit[1].match(/\d+/);

    const intStr = integerParts ? integerParts.join('') : '0';
    const decStr = decimalParts ? decimalParts[0] : '0';
    amount = parseFloat(`${intStr}.${decStr}`);
  } 
  else {
    // 无小数点情况，处理数字片段
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

    const fullNumDigits = numParts.join('');

    // 判断逻辑：如果是不含小数点的法币（如 JPY/KRW），或者只有 1-2 位数，直接当整数
    if (fromCurrency === 'JPY' || fromCurrency === 'KRW' || fullNumDigits.length <= 2) {
      amount = parseFloat(fullNumDigits);
    } 
    // 电商特例处理：如果中间带有空格或逗号分隔（如 "1 298"、"294 78"、"3,21839"），强制将最后 2 位数当成角分小数！
    else if (numParts.length > 1 || rawText.includes(',')) {
      const intStr = fullNumDigits.slice(0, -2);
      const decStr = fullNumDigits.slice(-2);
      amount = parseFloat(`${intStr}.${decStr}`);
    } 
    // 普通纯整数
    else {
      amount = parseFloat(fullNumDigits);
    }
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