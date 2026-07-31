function supportLanguages() {
  return [
    "auto", "zh-Hans", "zh-Hant", "en", "ja", "ko",
    "fr", "de", "es", "it", "ru", "pt", "nl", "pl", "ar"
  ];
}

function translate(query, completion) {
  const rawText = query.text.trim();
  const text = rawText.toLowerCase();

  const numMatch = text.match(/(\d+(?:,\d+)*(?:\.\d+)?)/);
  if (!numMatch) {
    completion({
      error: {
        type: 'unsupportedLanguage',
        message: '文本中未检测到有效数字'
      }
    });
    return;
  }

  const amount = parseFloat(numMatch[1].replace(/,/g, ''));

  let fromCurrency = '';
  let currencySymbol = '';

  // 1. 新加坡元 (SGD, S$, 新币, 新元, 坡币)
  if (text.includes('sgd') || text.includes('s$') || text.includes('新币') || text.includes('新元') || text.includes('坡币')) {
    fromCurrency = 'SGD';
    currencySymbol = 'S$';
  }
  // 2. 日元 (JPY, 円, 日元, ¥)
  else if (text.includes('jpy') || text.includes('円') || text.includes('日元')) {
    fromCurrency = 'JPY';
    currencySymbol = '円';
  } 
  // 3. 美元 (USD, $, 美元, 刀)
  else if (text.includes('usd') || text.includes('$') || text.includes('美元') || text.includes('刀')) {
    fromCurrency = 'USD';
    currencySymbol = '$';
  } 
  // 4. 欧元 (EUR, €, 欧元)
  else if (text.includes('eur') || text.includes('€') || text.includes('欧元')) {
    fromCurrency = 'EUR';
    currencySymbol = '€';
  } 
  // 5. 英镑 (GBP, £, 英镑)
  else if (text.includes('gbp') || text.includes('£') || text.includes('英镑')) {
    fromCurrency = 'GBP';
    currencySymbol = '£';
  } 
  // 6. 韩元 (KRW, ₩, 韩元)
  else if (text.includes('krw') || text.includes('₩') || text.includes('韩元')) {
    fromCurrency = 'KRW';
    currencySymbol = '₩';
  } 
  // 7. 港币 (HKD, HK$, 港币, 港元)
  else if (text.includes('hkd') || text.includes('hk$') || text.includes('港币') || text.includes('港元')) {
    fromCurrency = 'HKD';
    currencySymbol = 'HK$';
  }
  // 8. 纯人民币符号 / 纯日元符号 ¥ 兜底
  else if (text.includes('￥') || text.includes('¥')) {
    fromCurrency = 'JPY';
    currencySymbol = '円';
  }
  // 9. 纯数字兜底（默认日元）
  else {
    fromCurrency = 'JPY';
    currencySymbol = '円';
  }

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