const currencyRules = require('./currencies.js');

function supportLanguages() {
  return [
    "auto", "zh-Hans", "zh-Hant", "en", "ja", "ko",
    "th", "fr", "de", "es", "it", "ru", "pt", "pt-BR", "nl", "pl", "ar"
  ];
}

function translate(query, completion) {
  const handleCompletion = query.onCompletion || completion;
  
  const originalText = (query.originalText || '').trim();
  const normalText = (query.text || '').trim();
  const rawText = (originalText || normalText).toLowerCase();

  // 默认缺省货币设为 USD
  const defaultDollar = ($option && $option.defaultDollarCurrency) ? $option.defaultDollarCurrency : 'USD';

  // ==========================================
  // 1. 调用 currencies.js 规则管道进行智能解析
  // ==========================================
  const parsedResult = currencyRules.parse(rawText, originalText, defaultDollar);

  if (!parsedResult) {
    handleCompletion({
      error: {
        type: 'unsupportedLanguage',
        message: '未检测到有效货币单位或无法解析金额'
      }
    });
    return;
  }

  const { amount, currencyCode, symbol, cnName } = parsedResult;

  // ==========================================
  // 2. 请求 API 并输出渲染
  // ==========================================
  $http.get({
    url: `https://open.er-api.com/v6/latest/${currencyCode}`,
    timeout: 10,
    handler: function(resp) {
      if (resp.data && resp.data.result === 'success') {
        const rateToCNY = resp.data.rates.CNY;
        if (!rateToCNY) {
          handleCompletion({
            error: {
              type: 'api',
              message: '未获取到对应人民币汇率数据'
            }
          });
          return;
        }

        const resultCNY = (amount * rateToCNY).toFixed(2);
        const singleRate = (1 * rateToCNY).toFixed(4);

        handleCompletion({
          result: {
            from: 'auto',
            to: 'zh-Hans',
            toParagraphs: [
              `≈ ¥ ${resultCNY} 人民币`,
              `\n📊 换算明细：\n• 原价：${amount} ${currencyCode} (${symbol}) ${cnName || ''}\n• 参考汇率：1 ${currencyCode} = ${singleRate} CNY`
            ]
          }
        });
      } else {
        handleCompletion({
          error: {
            type: 'api',
            message: '汇率接口请求失败或超时'
          }
        });
      }
    }
  });
}