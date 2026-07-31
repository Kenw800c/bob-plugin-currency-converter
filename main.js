function supportLanguages() {
  return [
    "auto", "zh-Hans", "zh-Hant", "en", "ja", "ko",
    "fr", "de", "es", "it", "ru", "pt", "nl", "pl", "ar"
  ];
}

function translate(query, completion) {
  const rawText = query.text.trim().toLowerCase();

  let fromCurrency = '';
  let currencySymbol = '';

  // 1. 严格检查是否包含货币关键词，不满足直接退出
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
    // 没匹配到任何货币标识时，直接静默/报错提示，不误触发换算
    completion({
      error: {
        type: 'unsupportedLanguage',
        message: '未检测到有效货币单位（如 $, 円, USD, MOP 等）'
      }
    });
    return;
  }

  // 2. 只有确认有货币单位后，才提取数值部分
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

  let amount = 0;

  // 拆分/拼接数字逻辑
  if (rawText.includes('.')) {
    const dotSplit = rawText.split('.');
    const integerParts = dotSplit[0].match(/\d+/g);
    const decimalParts = dotSplit[1].match(/\d+/);

    const intStr = integerParts ? integerParts.join('') : '0';
    const decStr = decimalParts ? decimalParts[0] : '0';
    amount = parseFloat(`${intStr}.${decStr}`);
  } else {
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

  // 3. 调用汇率 API 换算
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