# 句间 0.4.0 验证记录

日期：2026-10-27。项目：仓库根目录。

## 自动验证

16 个测试套件通过：

- `bilibili-reader.test.cjs`：实际读取器、标准 WBI 签名、当前分 P/CID、英文轨道选择、中文/无字幕/登录限制、拒绝串用身份/非白名单地址、丢弃过期分 P 响应、保留宿主页面变量。
- `bilibili-integration.test.cjs`：实际后台与页面读取器在模拟B站 DOM/网络中的联测；英文 CC、悬停、逐句跳转、容器全屏、分 P 记录、轨道切换、回退、遮挡及平台位置隔离。
- `bilibili-backup.test.cjs`：B站与旧 YouTube JSON/CSV 混合往返，同 BV 不同分 P/CID 独立保存，来源地址/分 P 一致性校验。
- `video-platform.test.cjs`：平台身份、普通视频范围、BWP 页面状态桥与控制、时间来源。
- `translation-sources.test.cjs`、`translation-api.test.cjs`、`phrase-lookup.test.cjs`、`vocabulary-backup.test.cjs`：已有后台功能回归。
- `subtitle-mask.test.cjs`、`subtitle-learning.test.cjs`、`sentence-navigation.test.cjs`、`subtitle-position.test.cjs`、`multi-source-popup.test.cjs`：YouTube 原有字幕、遮挡、浮框和翻译交互回归，学习相关测试加载共享平台适配器。
- `vocabulary.test.cjs`：列表/详情、连续浏览、搜索/状态/视频筛选、导入导出，并验证B站分 P 筛选与时间链接。
- `extension-panel.test.cjs`：Tab、设置、B站英文轨道选择和重读入口。
- `translation-settings.test.cjs`：多翻译来源管理回归。

使用独立无头 Chrome 与本机 Playwright。模拟 API 测试不等同于真实登录环境端到端验证。所有自有 JS 语法与 HTML/manifest 资源引用检查通过。

## 真实站点只读检查

独立匿名 Chrome，未使用用户的浏览器配置、账号或 Cookie，未执行登录或修改站点设置：

1. [普通公开视频](https://www.bilibili.com/video/BV1MU411S7iJ/)：HTTP 200，找到 VIDEO 元素及标准 currentTime/play 接口；当前 CID 1625992822。实际读取器返回无可读取英文 CC，按设计提示手动遮挡。
2. [标注英文 CC 的视频](https://www.bilibili.com/video/BV1FU4y1F7Px/?p=1)：HTTP 200，识别 BV、P1、CID 499901717；接口返回登录限制，实际读取器给出请登录提示。
3. 普通非浏览器直连接口探测曾返回 HTTP 412；不作为浏览器环境失败的结论。正常匿名 Chrome 可以访问上述页面和部分接口。

## 尚未验证

- 当前用户登录状态下，真实英文 CC 从获取到查词/收藏/回看的完整闭环。
- 不同B站版本、全部自定义播放器模式和所有全屏变体。
- 番剧、直播、嵌入页、画中画、硬字幕识别不属于本版承诺。

## 参考

- B站当前页面 DOM 与接口只读观察。
- [yt-dlp Bilibili 提取器](https://github.com/yt-dlp/yt-dlp/blob/master/yt_dlp/extractor/bilibili.py)：核对播放器接口、字幕正文格式和标准 WBI 参数算法。
- MD5 依赖许可证与版本记录位于 `extension/vendor/js-md5/`。
