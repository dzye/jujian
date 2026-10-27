# 句间 — 英文视频查词与生词本

在视频里，读懂每一句。支持 YouTube 与B站普通视频页的独立英文字幕学习、单词/词组查询、多翻译来源、生词本和手动遮挡。

- [下载当前版本](https://github.com/dzye/jujian/releases)
- [使用与限制](#安装)
- [验证记录](VALIDATION.md)
- [隐私说明](https://dzye.github.io/jujian/privacy.html)

## 开发与打包

需要 Node.js、Python 3 和 Google Chrome。安装开发依赖后运行测试：

```sh
npm ci
npm test
npm run package
```

`npm run package` 生成 `dist/jujian-webstore-0.4.0.zip`，可用于 Chrome 商店上传，manifest 位于 ZIP 根目录。项目旧版交付 ZIP 含 extension 子目录，不能直接作为商店上传包。

仓库当前未授予通用开源许可；第三方依赖按各自许可证分发，见 extension/vendor。

---


句间（Jujian）是一款 Chrome Manifest V3 英文视频学习扩展，提供字幕交互查词、带视频时间来源的生词本和手动字幕遮挡。查词使用外部词典与翻译服务，不上传视频。

## 安装

1. 在 Chrome 打开 `chrome://extensions`。
2. 打开右上角「开发者模式」。
3. 点击「加载已解压的扩展程序」，选择本项目的 `extension` 文件夹。
4. 打开视频页面并播放，点击扩展图标，再点击「开启遮挡」。

## 使用

- 拖动遮挡条移动，拖动四角调整大小。
- 面板可调整颜色和不透明度；默认 95%，需要完全遮住时调到 100%。
- 点击遮挡条上方「锁定」，鼠标将穿透遮挡层，可继续操作播放器。
- 锁定后按住 Alt 临时显示中文，松开恢复。
- `Alt+Shift+H` 开关遮挡；`Alt+Shift+E` 编辑/锁定。快捷键可在 Chrome 扩展快捷键页面修改。
- 按网站保存位置、大小、颜色和透明度；每次打开页面需手动开启。
- 默认选取页面内最大的可见视频，遮挡位置随视频元素尺寸变化。

## 已知限制

- 直接让 video 元素全屏时，覆盖层不能显示；播放器容器全屏支持，仍需在实际网站验收。
- 不支持画中画窗口、跨域嵌入播放器、Chrome 内部页面。
- 坐标基于 video 元素，视频内部黑边及字幕换位置可能需要手动微调。
- Alt 临时显示可能与网页或系统按键行为冲突。

## 验证

JavaScript 语法检查通过。`tests/subtitle-mask.test.cjs` 使用 Playwright + 独立无头 Chrome，在模拟扩展存储和消息 API 的测试页面验证：开启、拖动、缩放、不透明度、锁定穿透、Alt 临时显示、容器全屏、重置、关闭、设置保存。未完成真实视频网站与 Chrome 加载扩展的端到端验收。

## 0.2.0 字幕学习体验版

在扩展面板点击「开启英文字幕学习」，并在 YouTube 自带 CC 菜单中选择英语字幕。

- 显示可逐词点击的英文字幕条，保留原手动遮挡功能。
- 鼠标悬停字幕或查词浮框时暂停；离开两个区域约 220 毫秒后收起浮框并自动恢复。原本手动暂停的视频不会自动恢复。
- 点击单词查询中文机器翻译与英文词典释义（不是上下文 AI 解释），支持本地缓存。
- 查询时仅向 Dictionary API 与 MyMemory 发送所选单词；视频标题、整句和收藏不发送给这两个服务。首次查询需要网络，外部服务可能限流。
- 生词本保存在 chrome.storage.local，可查看多个视频来源、点击精确到收藏时秒数的 YouTube 链接、搜索、备注、标记学习状态、删除与导出 JSON。
- 视频秒数取点击查词时的 currentTime；cueStart 仅是观察到字幕文字变化的时间，不代表原字幕文件精确起始时间。
- 第一版读取 YouTube 当前显示的字幕文字，不自动切换语言；压进画面的字幕不支持读取。尚未实现词形还原、短语、上下文解释、发音、字幕文件导入和生词本导入。
- 修改扩展后，在 chrome://extensions 点击扩展「重新加载」，再刷新视频页面。

新增测试：tests/subtitle-learning.test.cjs 与 tests/vocabulary.test.cjs。模拟网页和扩展 API 的交互验证通过，包括移出自动恢复、手动暂停保护、来源时间链接、并发收藏去重、生词本搜索/状态/备注。Dictionary API 网络查询返回 HTTP 200；MyMemory 和真实 YouTube 加载扩展流程尚未端到端验收。

### 播放控制设置

面板提供两个独立开关：「悬停字幕时自动暂停」「移出后自动继续播放」，默认都开启，设置跨页面保存。关闭自动继续后，移出会收起浮框但保持暂停。字幕条上方始终提供播放 / 暂停按钮，可手动控制；「关闭并继续」为明确的继续操作。原本手动暂停不会因移出而恢复。

配置测试已覆盖：关闭悬停后不暂停、手动暂停/播放按钮、开启悬停但关闭自动继续时保持暂停。

## 项目与文件命名

产品名：句间；代码名与项目目录：jujian。

- extension/service-worker.js：扩展后台、查词与收藏写入。
- extension/subtitle-mask.js：手动字幕遮挡。
- extension/subtitle-learning.js：字幕查词与播放交互。
- extension/extension-panel.*：扩展控制面板。
- extension/vocabulary.*：生词本页面。
- tests/*.test.cjs：对应模块的交互验证。

浏览器存储字段保持兼容，不因品牌改名清空学习数据。若移动已加载的扩展目录，请先导出生词本备份；Chrome 可能把新路径视为另一个扩展，当前版本尚不支持导入。仅刷新旧目录内的扩展可保留原扩展存储。

## 0.2.1 双字幕修复

开启字幕学习后，仅隐藏 YouTube 原生 CC 的视觉图层，保留字幕文本和时间更新；关闭学习模式即恢复。播放器替换字幕节点后依旧有效。学习字幕无法显示（例如直接将 video 元素全屏）时恢复原生字幕。未处理其他翻译插件额外生成的字幕或压入视频画面的字幕。

## 0.2.2 词组翻译与收藏

单击字幕单词查词；在字幕上按住鼠标左键，拖过多个单词后松开，查询选中词组（支持反向拖选）。拖动时高亮并固定当前句，松开后显示词组翻译。可将整个词组收藏到生词本，保留完整字幕、视频标题与点击/开始选择时的播放时间链接。词组查询仅向 MyMemory 发送选中内容，不调用单词词典。最多 200 字符，机器翻译仍可能误解习语或上下文。测试覆盖正反向拖选、单击回归、词组收藏来源、后台翻译路由与缓存。

## 0.2.3 字幕逐句导航

字幕左右的 ‹ / › 分别跳到上一条 / 下一条字幕的起始时间，同时更新字幕。首尾按钮禁用，字幕空隙中向左跳最近上一条，向右跳下一条。基于 YouTube 字幕条目而非语法句子，自动字幕可能分段较短。跳转本身保留播放状态，原有悬停暂停设置仍生效。

通过扩展后台在 YouTube 页面上下文读取当前字幕轨道并请求 JSON3 时间轴，不增加站点授权。获取失败时保留原有可点击字幕并禁用导航；按钮提示失败原因，可关闭再开启学习模式重试。视频切换会清空旧时间轴；同一视频切换字幕语言后请关闭再开启学习模式以重新获取。

句子导航模拟测试与原字幕交互回归通过。真实 YouTube 的时间轴请求仍需现场验收（平台可能限制请求），不能保证所有视频可取得时间轴。

## 0.2.4 生词本入口与备份

视频查词浮框和扩展面板都通过后台 chrome.tabs.create 打开生词本，不再从视频网页直接链接未公开的扩展资源。未增加 web_accessible_resources。截图中的拦截与旧链接方式吻合，但真实 Chrome 拦截是否消除仍需重载验收。

- JSON：推荐完整备份和跨设备恢复；format=jujian-vocabulary、version=1，含词条、词组、释义、备注、学习状态和全部视频来源。兼容旧版仅含 version/words 的 JSON。
- CSV：UTF-8 BOM，可在 Excel 查看；每个来源一行，支持句间 CSV 重新导入。含 meanings_json 保留结构化释义。不支持任意第三方 CSV 列名。防止备注等字段被表格软件当作公式执行。
- 导入：本机合并，不覆盖已有学习状态和非空备注；相同词条合并，相同视频/毫秒时间/句子的来源去重。整个文件校验通过后一次写入；无效来源链接或时间会拒绝。文件上限 10 MB、20000 行词条数据。
- JSON/CSV 都包含个人学习记录和观看来源，导出文件请自行保存。

验证：后台打开消息、JSON v1 兼容、CSV 中文/引号/换行/公式转义往返、来源保留、重复导入、无效文件不写入，以及页面 JSON 文件选择和 CSV 下载测试通过。

## 0.2.5 英文字幕移动

字幕上方「⠿ 移动字幕」是独立拖动手柄，按住左键拖动整条英文字幕；拖选文字仍用于词组查询。位置以视频区域比例保存到本机，下次开启恢复。「复位」恢复默认位置。边界限制避免字幕和工具栏移出可见区域；查词浮框跟随字幕位置，在上方空间不足时改在下方显示。拖动、位置保存/恢复、复位和边界测试，以及词组和句子导航回归通过。

## 0.2.6 - Vocabulary list, detail and component filters

Subtitle arrows use symmetric SVG and flex centering. Vocabulary opens as simple rows; each row links to a hash-routed detail view with definitions, video timestamps, notes and learning status. Returning to the list preserves filters. Lists show 50 entries at a time.

All three selects use locally bundled Tom Select 2.6.2 (Apache-2.0), with license in extension/vendor/tom-select. Source videos are searchable by title. Import/export still operates on the full collection.

Validation: component dropdown interaction, video/status/search filtering, list/detail/back navigation, note/status updates, JSON import, CSV download, desktop and 600px responsive screenshots passed. SVG vertical center is within 1px of its button center. Sentence navigation, phrase selection, subtitle position and backup regressions passed. These tests use mocked extension APIs, not a live YouTube end-to-end run.

## 0.2.7 - Previous / next vocabulary entry

Detail views include previous/next entry buttons and a position counter. Navigation follows the complete filtered list captured on entry, including rows beyond the first 50. Direct detail URLs use the full collection order. Deleted entries are removed from the navigation sequence. First/last buttons are disabled. Notes edited in the detail view are saved before previous/next navigation; failed saves prevent navigation. Existing list filters remain when returning.

Browser tests cover previous/next, first/last and single-item boundaries, filtered scope, note auto-save, direct detail routing and existing list/filter/import/export flows.

## 0.2.8 - Unobstructed watching controls

Supersedes the earlier always-visible subtitle toolbar: playback and reset buttons are removed from the video overlay. Automatic hover pause is configured only in the extension panel; disabling it uses the original video player controls for manual playback.

Subtitle position adjustment and reset are panel actions. The drag handle is hidden by default, appears only after explicitly enabling position adjustment, and automatically hides/locks after a drag. Escape exits adjustment. Settings and saved positions are preserved. Tests cover default hidden controls, no overlay playback/reset buttons, explicit edit mode, auto-lock after dragging, position restore, panel reset action, phrase interaction and sentence navigation.

## 0.2.9 - Settings tabs

The popup defaults to Subtitle Learning on every open. Playback preferences (automatic hover pause and resume on leave) and subtitle position adjustment/reset are grouped within that tab. Manual Mask has its own tab for mask toggle, editing, appearance and shortcuts. The vocabulary entry is shared in the header. Tabs support keyboard arrows and Home/End. Existing saved settings are preserved.

Popup interaction tests pass: default/reload tab, separate panel visibility, keyboard navigation, learning and mask toggles, preference persistence, position editing/reset, notebook opening and horizontal bounds. Both panel screenshots were visually checked.

## 0.3.0 - Multi-source translation with configurable visibility

The default dictionary remains available and is not replaced by custom APIs. It uses the existing online dictionary/translation services plus local caching; it is not a full offline dictionary.

- Popup: ordered collapsible source sections, per-source loading/error/retry/configure state. Only the default-expanded source starts a query on word lookup; other sources query on expansion. Unconfigured and hidden sources never query. Hidden sources retain configuration and caches. All-hidden state links to settings.
- Source menu: configure, set default expansion, hide. Source changes refresh an open lookup. Requests from an old lookup cannot overwrite a newer one. Results scroll inside the popup while the selected meaning, collection button and footer remain available.
- Settings: Subtitle Learning > Manage Translation Sources. Toggle visibility, choose one default-expanded source (or collapse all), reorder, add multiple AI/dictionary sources, configure each independently, and delete custom sources. The builtin source can be hidden but cannot be deleted. Up to 12 sources including builtin.
- Custom APIs: AI Chat Completions-compatible or GET/JSON dictionary. Optional domain permission is requested only when saving an enabled API configuration. No provider credits or accounts are bundled. Existing standalone API settings are read as a migrated custom source without replacing the builtin dictionary.
- Collection: first loaded result is adopted initially; choose another source with Adopt Meaning before collecting. Updating the selected explanation preserves word status, notes and all video encounters, records the translation source and keeps previously adopted explanations. Translation provenance survives JSON and CSV round trips. Keys and API configuration are not included in vocabulary exports.

Validation: tests/translation-sources.test.cjs and tests/multi-source-popup.test.cjs cover retained builtin dictionary, lazy queries, hidden/unconfigured sources, source order/default and error isolation, adopted-source collection with video timestamps, key redaction and translation-source backup. Updated settings-page tests use the actual background message handlers. Existing dictionary, phrase, notebook import/export/detail navigation, popup tabs, subtitle position and sentence navigation tests pass. Screenshots checked on desktop and narrow settings layouts. Network responses and browser extension APIs are simulated; no paid provider or live YouTube end-to-end verification was performed.

## 0.4.0 B站普通视频适配

支持桌面端 `https://www.bilibili.com/video/BV.../` 普通视频页（含分 P），复用字幕查词、词组、多来源翻译、悬停暂停与逐句跳转。

### 使用

1. 在 Chrome 扩展管理页重新加载句间，再刷新视频页面。
2. 打开B站普通视频，建议先登录本人B站账号；字幕能否读取由视频与账号权限决定。
3. 点击句间的「字幕学习」开启。读取成功后仅显示学习字幕；关闭学习时恢复原生字幕。
4. 多个独立英文 CC 轨道可在配置面板选择；登录、切换轨道后可点「重新读取字幕」。
5. 仅中文、没有独立字幕或登录受限时给出明确提示，不将中文或画面内字幕冒充英文。可切到「手动遮挡」。不包含 OCR 或语音识别。
6. B站字幕位置与 YouTube 独立保存。支持网页全屏和播放器容器全屏；画中画、直接对视频元素全屏、直播、番剧和嵌入页不在本版范围内。
7. 生词来源包含平台、BV、CID、分 P、视频标题、分 P 标题、播放秒数和字幕开始时间。回看链接带 `p` 和 `t`；来源视频筛选按分 P 区分。JSON / CSV 保留这些字段并兼容旧 YouTube 备份。

### 实现与验证边界

- 平台差异集中在 `video-platform.js` 和 `bilibili-reader.js`。字幕元数据在B站页面上下文读取，使用当前浏览器的正常站点会话；不读取或导出 Cookie、不绕过登录/地区限制，不增加B站整站必选权限。
- 校验 BV、分 P、CID 与接口身份一致，切换视频/分 P 时清空旧时间轴、忽略过期请求。不重复轮询明确的无字幕/登录限制；用户可显式重读。
- js-md5 0.8.3 仅用于标准 WBI 请求签名，附 MIT 许可证并通过 npm 包 SHA-512 校验；局部包装避免覆盖页面已有 md5 变量。
- 原生 HTML video 为主要适配路径；额外提供 BWP 自定义媒体元素的页面控制桥。无法读取媒体状态时提示不支持，不继续隐藏原字幕。
- 16 个本地测试套件通过，覆盖B站读取器签名、英文/中文/无字幕/登录限制、轨道、分 P、播放器全屏、暂停、逐句同步、收藏回看、混合备份、来源筛选及 YouTube 原有功能。测试网络与扩展 API 为模拟，实际读取器和后台消息处理参与联测。
- 真实匿名 Chrome 只读检查：`BV1MU411S7iJ` 页面、播放器及 BV/CID 识别成功，返回无独立英文字幕；`BV1FU4y1F7Px` 页面和当前 CID 识别成功，英文 CC 读取返回登录限制。登录账号下的真实英文字幕完整链路尚未验收。

完整验证记录见 `VALIDATION.md`。
