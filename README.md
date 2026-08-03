<p align="center">
  <img src="icon.png" width="128" height="128" alt="插件图标" />
</p>

# Bob 汇率换算插件 (Currency Converter for Bob)

一款专为 macOS 划词/截图翻译工具 **Bob** 打造的实时汇率换算插件。支持划词提取或截图 OCR 识别人民币以外的外币金额，并自动实时折算为人民币（CNY）。

针对亚马逊等电商平台的“上标价格”、“丢失小数点”、“空格/全角逗号”等特殊 OCR 识别场景进行了深度强力适配，体验极致流畅。

---

### ✨ 核心特性

* **10 种主流币种自动识别**：
* **日元 (JPY)**：`円`, `日元`, `JP¥`, `JP·`
* **美元 (USD)**：`$`, `USD`, `美元`, `刀`
* **新加坡元 (SGD)**：`S$`, `SGD`, `新币`, `坡币`
* **澳门币 (MOP)**：`MOP$`, `MOP`, `澳门币`, `葡币`
* **港币 (HKD)**：`HK$`, `HKD`, `港币`, `港元`
* **泰铢 (THB)**：`฿`, `THB`, `泰铢`, `泰币`
* **新台币 (TWD)**：`NT$`, `TWD`, `台币`, `新台币`
* **欧元 (EUR)**：`€`, `EUR`, `欧元`
* **英镑 (GBP)**：`£`, `GBP`, `英镑`
* **韩元 (KRW)**：`₩`, `KRW`, `韩元`


* **电商 OCR 上标强力纠错**：完美解决亚马逊等平台上标角分被识别为 `SGD 3,21839`、`SGD 294 78` 或 `SGD 1 298` 时丢失小数点导致算错的痛点，自动智能断句并补全角分。
* **防止误触发机制**：划词纯型号（如 `BDAY26-V33-1`）或无货币单位的普通文本时，自动静默，不进行盲目换算。
* **开箱即用，免配置 Key**：调用免费开放汇率 API（Open Exchange Rates），无需申请和配置繁琐的 API Key。

---

### 📦 安装方法

1. 前往本仓库的 [Releases 页面](https://github.com/Kenw800c/bob-plugin-currency-converter/releases) 下载最新版的 `CurrencyConverter.bobplugin`。
2. 双击 `CurrencyConverter.bobplugin` 文件，或直接将其拖入 Bob 偏好设置中的 **插件列表** 即可完成安装。

---

### 🛠️ 使用示例

* 划词或 OCR 框选 `3, 740円` $\rightarrow$ 自动识别为 **`3740 JPY`** $\rightarrow$ 输出对应人民币金额与实时汇率。
* 框选亚马逊价格 `SGD7371` / `SGD 1 298` $\rightarrow$ 自动补全小数矫正为 **`73.71 SGD`** / **`12.98 SGD`** 进行精准折算。

---

### 📄 开源协议

本项目采用 [MIT License](https://www.google.com/search?q=LICENSE) 开源协议。
