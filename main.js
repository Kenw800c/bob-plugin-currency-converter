/**
 * 声明插件支持的语言列表（供 Bob 预检使用）
 */
function supportLanguages() {
  return [
    "auto", "zh-Hans", "zh-Hant", "en", "ja", "ko",
    "fr", "de", "es", "it", "ru", "pt", "nl", "pl", "ar"
  ];
}

/**
 * Bob 核心翻译/换算入口函数
 * @param {Object} query - Bob 传入的划词数据结构，包含 query.text（选中文本）
 * @param {Function} completion - 回调函数，用于将结果或错误返回给 Bob 弹窗
 */
function translate(query, completion) {
  // 获取划词文本，去头尾空格并转为小写，方便后续不区分大小写匹配
  const rawText = query.text.trim().toLowerCase();

  let fromCurrency = '';
  let currencySymbol = '';

  // ==========================================
  // 步骤 1：严格的货币特征预检（防止非金额文本误触发）
  // ==========================================
  
  // 1.1 澳门币 (MOP)
  if (rawText.includes('mop') || rawText.includes('澳门币') || rawText.includes('澳门元') || rawText.includes('葡币')) {
    fromCurrency = 'MOP';
    currencySymbol = 'MOP$';
  }
  // 1.2 新加坡元 (SGD)
  else if (rawText.includes('sgd') || rawText.includes('s$') || rawText.includes('新币') || rawText.includes('新元') || rawText.includes('坡币')) {
    fromCurrency = 'SGD';
    currencySymbol = 'S$';
  }
  // 1.3 日元 (JPY)
  else if (rawText.includes('jpy') || rawText.includes('円') || rawText.includes('日元')) {
    fromCurrency = 'JPY';
    currencySymbol = '円';
  } 
  // 1.4 美元 (USD)
  else if (rawText.includes('usd') || rawText.includes('$') || rawText.includes('美元') || rawText.includes('刀')) {
    fromCurrency = 'USD';
    currencySymbol = '$';
  } 
  // 1.5 欧元 (EUR)
  else if (rawText.includes('eur') || rawText.includes('€') || rawText.includes('欧元')) {
    fromCurrency = 'EUR';
    currencySymbol = '€';
  } 
  // 1.6 英镑 (GBP)
  else if (rawText.includes('gbp') || rawText.includes('£') || rawText.includes('英镑')) {
    fromCurrency = 'GBP';
    currencySymbol = '£';
  } 
  // 1.7 韩元 (KRW)
  else if (rawText.includes('krw') || rawText.includes('₩') || rawText.includes('韩元')) {
    fromCurrency = 'KRW';
    currencySymbol = '₩';
  } 
  // 1.8 港币 (HKD)
  else if (rawText.includes('hkd') || rawText.includes('hk$') || rawText.includes('港币') || rawText.includes('港元')) {
    fromCurrency = 'HKD';
    currencySymbol = 'HK$';
  }
  // 1.9 纯日元/人民币符号 ¥ 兜底按日元处理
  else if (rawText.includes('￥') || rawText.includes('¥')) {
    fromCurrency = 'JPY';
    currencySymbol = '円';
  }
  // 1.10 未检测到任何货币单位（如纯型号 BDAY26-VPS-1），直接静默退出，不进行误换算
  else {
    completion({
      error: {
        type: 'unsupportedLanguage',
        message: '未检测到有效货币单位（如 $, 円, USD, MOP 等）'
      }
    });
    return;
  }

  // ==========================================
  // 步骤 2：数值提取与清洗（兼容逗号、不规则空格及小数点）
  // ==========================================
  
  // 提取文本中所有的数字片段（如 "3, 740" -> ["3", "740"]）
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

  // 如果包含小数点，区分整数部分与小数部分分别清洗后拼接
  if (rawText.includes('.')) {
    const dotSplit = rawText.split('.');
    const integerParts = dotSplit[0].match(/\d+/g);
    const decimalParts = dotSplit[1].match(/\d+/);

    const intStr = integerParts ? integerParts.join('') : '0';
    const decStr = decimalParts ? decimalParts[0] : '0';
    amount = parseFloat(`${intStr}.${decStr}`);
  } else {
    // 无小数点，直接拼接所有数字片段（如 ["3", "740"] -> "3740"）
    amount = parseFloat(numParts.join(''));
  }

  // 防二次校验：确保解析出的金额有效且大于 0
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
  // 步骤 3：请求在线 API 获取实时汇率并换算
  // ==========================================
  
  // 使用 Open Exchange Rates 提供的免费开放接口（无需 API Key）
  $http.get({
    url: `https://open.er-api.com/v6/latest/${fromCurrency}`,
    handler: function(resp) {
      if (resp.data && resp.data.result === 'success') {
        // 提取人民币 (CNY) 的参考汇率
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

        // 计算目标人民币金额（保留 2 位小数）与单价汇率（保留 4 位小数）
        const resultCNY = (amount * rateToCNY).toFixed(2);
        const singleRate = (1 * rateToCNY).toFixed(4);

        // 将格式化后的结果输出给 Bob 弹窗渲染
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