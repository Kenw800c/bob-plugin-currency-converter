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
  // 步骤 1：严格的货币特征预检（新增 泰铢 与 新台币）
  // ==========================================
  
  // 1. 泰铢 (THB, ฿, 泰铢, 泰币)
  if (rawText.includes('thb') || rawText.includes('฿') || rawText.includes('泰铢') || rawText.includes('泰币')) {
    fromCurrency = 'THB';
    currencySymbol = '฿';
  }
  // 2. 新台币 (TWD, nt$, nt, 台币, 新台币)
  else if (rawText.includes('twd') || rawText.includes('nt$') || rawText.includes('nt') || rawText.includes('台币') || rawText.includes('新台币')) {
    fromCurrency = 'TWD';
    currencySymbol = 'NT$';
  }
  // 3. 澳门币 (MOP)
  else if (rawText.includes('mop') || rawText.includes('澳门币') || rawText.includes('澳门元') || rawText.includes('葡币')) {
    fromCurrency = 'MOP';
    currencySymbol = 'MOP$';
  }
  // 4. 新加坡元 (SGD)
  else if (rawText.includes('sgd') || rawText.includes('s$') || rawText.includes('新币') || rawText.includes('新元') || rawText.includes('坡币')) {
    fromCurrency = 'SGD';
    currencySymbol = 'S$';
  }
  // 5. 日元 (JPY, 含 jp/jp¥/· 等 OCR 特征)
  else if (rawText.includes('jpy') || rawText.includes('円') || rawText.includes('日元') || rawText.includes('jp') || rawText.includes('￥') || rawText.includes('¥')) {
    fromCurrency = 'JPY';
    currencySymbol = '円';
  } 
  // 6. 美元 (USD)
  else if (rawText.includes('usd') || rawText.includes('$') || rawText.includes('美元') || rawText.includes('刀')) {
    fromCurrency = 'USD';
    currencySymbol = '$';
  } 
  // 7. 欧元 (EUR)
  else if (rawText.includes('eur') || rawText.includes('€') || rawText.includes('欧元')) {
    fromCurrency = 'EUR';
    currencySymbol = '€';
  } 
  // 8. 英镑 (GBP)
  else if (rawText.includes('gbp') || rawText.includes('£') || rawText.includes('英镑')) {
    fromCurrency = 'GBP';
    currencySymbol = '£';
  } 
  // 9. 韩元 (KRW)
  else if (rawText.includes('krw') || rawText.includes('₩') || rawText.includes('韩元')) {
    fromCurrency = 'KRW';
    currencySymbol = '₩';
  } 
  // 10. 港币 (HKD)
  else if (rawText.includes('hkd') || rawText.includes('hk$') || rawText.includes('港币') || rawText.includes('港元')) {
    fromCurrency = 'HKD';
    currencySymbol = 'HK$';
  }
  else {
    completion({
      error: {
        type: 'unsupportedLanguage',
        message: '未检测到有效货币单位（如 $, 円, ฿, NT$, USD, SGD, MOP 等）'
      }
    });
    return;
  }

  // ==========================================
  // 步骤 2：全场景数值提取与角分自动断句
  // ==========================================
  
  let amount = 0;

  // 情况 A：文本明确带有小数点 "."（如 "73.71" 或 "3,218.39"）
  if (rawText.includes('.')) {
    const dotSplit = rawText.split('.');
    const integerParts = dotSplit[0].match(/\d+/g);
    const decimalParts = dotSplit[1].match(/\d+/);

    const intStr = integerParts ? integerParts.join('') : '0';
    const decStr = decimalParts ? decimalParts[0] : '0';
    amount = parseFloat(`${intStr}.${decStr}`);
  } 
  // 情况 B：没有小数点 "." 的情况
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

    const fullNumDigits = numParts.join('');

    // 日元 (JPY) 和韩元 (KRW) 属于无角分/纯整数货币，提取出的数字永远全保留为整数
    if (fromCurrency === 'JPY' || fromCurrency === 'KRW' || fullNumDigits.length <= 2) {
      amount = parseFloat(fullNumDigits);
    } 
    // 其他外币（含 THB, TWD, SGD, USD 等）且无点时，把末尾 2 位切出来当角分
    else {
      const intStr = fullNumDigits.slice(0, -2);
      const decStr = fullNumDigits.slice(-2);
      amount = parseFloat(`${intStr}.${decStr}`);
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