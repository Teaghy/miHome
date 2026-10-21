# 前端开发规范

## 技术选择

前端使用 React 19、TypeScript strict、Vite。React 负责渲染与交互，Rust 负责米家认证、云端协议和凭据存储。页面在浏览器中运行本地演示，也作为 Tauri WebView 的前端。

现有界面基础为 Radix UI Dialog / Select / Checkbox、Lucide React、自定义 CSS 与 Tailwind CSS 4。保留 Radix 提供的焦点管理、Escape 关闭和模态语义；界面按用户提供的 [桌面 UI 规范](米家桌面端_UI设计规范.md) 与 [实施约定](UI_DESIGN.md) 定制。二维码使用 `qrcode.react`，多页面路由使用 React Router 的 HashRouter，图表使用可键盘访问的本地 SVG。

依赖统一由 pnpm 10.32.1 管理，版本由 `package.json` 的 `packageManager` 固定，唯一前端锁文件为 `pnpm-lock.yaml`。首次安装及 CI 使用 `pnpm install --frozen-lockfile`，新增依赖使用 `pnpm add` / `pnpm add -D`。`pnpm-workspace.yaml` 仅允许已需要的 esbuild 安装脚本；新增需安装脚本的依赖时先确认用途。脚本必须引用已直接声明的依赖，不能依赖 npm 扁平安装带来的间接包。

依赖按实际需求加入：已有组件或平台 API 足够时直接复用；需要复杂表单、表格、路由或日期运算时再评估相应库。Ant Design 适合复杂管理表单，不作为整个米家界面的默认视觉；日期展示目前使用 `Intl`，简单数组操作使用原生方法。引入依赖时说明用途，提交 `package.json` 与锁文件，并验证打包结果。

## 目录与职责

```text
src/
  main.tsx                    React 挂载、全局样式入口
  app/
    App.tsx                   应用初始化、页面组合与 Provider
    AppDialogs.tsx            全局弹层与控制器的连接
    MiHomeContext.tsx         应用控制器 Context 与消费入口
    HouseholdContext.tsx      扩展家庭功能的类型化状态入口
    HouseholdProvider.tsx     本地家庭状态加载、保存与模式隔离
  pages/
    DashboardPage.tsx         十个模块的家庭首页
    DevicesPage.tsx           设备管理、类型/状态筛选与收藏
    DeviceDetailPage.tsx      按设备规格适配的完整控制页
    ...                       其余页面与路由见 PAGE_COVERAGE.md
  components/
    layout/                   导航、家庭切换、搜索和应用外壳
    dashboard/                Hero、天气、安防、摄像头与洞察模块
    charts/                   可访问趋势图与周期切换
    devices/                  设备卡片、设备图示和详情面板
    scenes/                   场景快捷入口
    dialogs/                  登录、设置和语音弹层
    ui/                       无业务依赖的基础 UI
      Select.tsx              Radix 下拉与选项，空字符串和数值转接
      Checkbox.tsx            Radix 复选框与品牌勾选样式
  hooks/
    useMiHome.ts              初始化、刷新、设置和设备操作编排
    useAppNavigation.ts       类型化页面与 Hash 路由适配
  api/
    mihome.ts                 前端调用边界，选择原生/演示实现
    mihome.test.ts            演示隔离与调用契约测试
    household.ts              本地家庭扩展数据的加载与保存
    household.test.ts         家庭/真实会话隔离和坏缓存恢复
  mocks/
    devices.ts                虚构快照与 MIoT 设备详情
    household.ts              天气/环境/能耗等页面的示例模型
  types/
    index.ts                  应用模型和前后端 JSON 契约
    household.ts              成员、规则、摄像机和消息模型
  utils/
    device.ts                 设备筛选、设置和属性校验纯函数
    device.test.ts            领域规则测试
    device-kind.ts            设备类别识别
    presentation.ts           场景展示映射和时间格式化
    errors.ts                 unknown 错误转用户提示
  styles/
    index.css                 样式导入与 Tailwind 扫描入口
    tokens.css                明暗主题、色彩和尺寸变量
    base.css                  重置、基础排版、焦点规则
    layout.css                导航、顶栏和页面框架
    devices.css               设备列表与筛选
    device-art.css            设备图示
    pages.css                 场景、活动、空态和通用反馈
    dashboard.css             统一 Panel 与家庭首页模块
    management.css            管理页、详情、表单与流程
    forms.css                 统一下拉、复选框与文本输入焦点
    dialogs.css               模态框、表单与设备详情
    responsive.css            断点、安全区域与减少动态效果
```

依赖方向：`app/pages → hooks/components → api/utils/types`。`api` 可以引用 `mocks` 实现演示；`utils` 中的展示映射可以引用图标库。`components/ui` 保持业务无关，`DeviceCard` 通过 props 接受数据与事件；布局、快捷场景和页面使用应用 Context 连接业务。API 和纯函数不导入页面、组件或 Hook。

跨目录导入优先使用 `@/`，同目录模块使用相对路径。别名必须同时保持 TypeScript、Vite 和 Vitest 一致。测试紧邻被测模块，端到端用例放在 `tests/e2e`。

## 组件与状态

- 使用函数组件和 Hooks，组件文件使用 PascalCase，Hook 使用 `useXxx`，工具函数使用 camelCase。文件名应说明具体职责。
- 页面负责组合与展示，设备卡片保持可复用；组件增长到承担多个独立职责时拆分。通用交互放在 `components/ui`，纯计算放在 `utils`。
- 设备与原生会话状态通过 `useMiHome` 与 Context 共享，扩展家庭数据通过按家庭/模式重新挂载的 `HouseholdProvider` 管理。输入和弹层内部状态就近保存。
- 应用视图使用联合类型 `Page` 与 React Router Hash 路由，路由可直接打开、刷新及使用浏览器前后导航，适配 Tauri 的打包资源路径。完整设备详情通过 `device` 查询参数选择设备；切换页面时重置房间与搜索，切换家庭时重置房间与打开的快速详情。
- 由已有状态计算的数据直接派生，成本明显的筛选使用 `useMemo`。Effect 用于订阅、定时器和外部同步，并完整清理；依赖通过 ESLint 检查。
- 异步操作必须覆盖加载、成功、失败和结束状态。刷新锁防止重复刷新，账号/演示切换使用 generation 隔离旧返回，组件卸载时清理定时器和订阅。
- 通知和最近活动以实际请求结果生成；设备状态在写入成功后重新读取，不将猜测的乐观状态显示为成功。

## API、类型和数据

`src/api/mihome.ts` 是前端控制入口。只有该模块调用 Tauri `invoke`；页面或组件需要新增操作时，先定义类型和 API 函数，再连接交互。原生/演示分流在此完成，保持调用签名一致。

TypeScript 使用 strict，跨层数据声明具体类型，未知值使用 `unknown` 并进行校验。MIoT 枚举保存原始数值/布尔/字符串类型，动作参数和属性值遵循设备规格。请求错误通过 `utils/errors.ts` 转为可读提示，包装错误保留 `cause`。

演示数据和演示设置使用独立存储，浏览器永远不会伪装成真实登录。桌面端会话、登录票据与密钥存储继续由 Rust 管理；新增接口同时检查 Rust 参数和返回值契约。设备写入、场景执行、语音发送的安全边界见根目录 `AGENTS.md`。

扩展家庭数据经 `api/household.ts` 访问，当前仅支持本地演示，不调用原生命令。持久化键含家庭 ID；真实会话返回空状态并拒绝保存。损坏或缺字段缓存回退为初始模型，存储失败反馈错误。新增真实服务应实现独立的类型与适配器，完成接入前使用服务空态。

设备配网、房间编辑和新增设备只作用于本地会话，不采集网络密码。自动化规则当前只提供本地编辑和启停，不承诺后台执行。所有服务边界、20 个必需页面和可交互范围维护在 [页面覆盖清单](PAGE_COVERAGE.md)。

## 样式与可访问性

语义色集中在 `tokens.css`，组件使用 `var(--surface)`、`var(--ink)`、`var(--accent)` 等变量。页面布局样式按职责放在对应文件；响应式覆盖统一放在 `responsive.css`。Tailwind 工具类可以用于局部组合，新增扫描目录时保持 `source(none)` 的受控范围，避免扫描 Rust、工具链或构建产物。

可点击行为使用 `button`，导航链接使用 `a`，输入拥有可访问名称，图标按钮提供中文 `aria-label`，状态切换提供对应 ARIA 属性。保留 `:focus-visible`、模态焦点回归和键盘操作，考虑 `prefers-reduced-motion`。设备名称、错误和长参数需允许截断或换行，避免破坏布局。

下拉统一使用 `components/ui/Select` 和 `SelectOption`，不直接渲染原生 `select`。通过 `onValueChange` 接收字符串，在调用处转换数值，MIoT 枚举仍通过索引还原原始类型。空字符串是可选的实际值。复选框使用 `components/ui/Checkbox`，通过 `onCheckedChange` 更新状态。文本输入保留原生语义、输入法及表单能力，焦点统一为品牌绿色边框与轻光圈；搜索框仅在容器显示焦点。键盘操作保留清晰的焦点提示。端到端测试通过打开 combobox 并点击 option 操作下拉，不再使用原生 `selectOption`。

## 检查与验收

```powershell
pnpm run lint
pnpm run check
pnpm test
pnpm run format:check
pnpm run build
pnpm run test:e2e
pnpm run test:e2e:production
```

格式调整使用 `pnpm run format`。ESLint 检查 TypeScript、React Hooks 与 Fast Refresh 导出边界，Prettier 统一格式；CI 执行相同检查。

默认开发与预览端口为 1420。已有应用占用端口时，保留已有进程，使用独立测试端口：

```powershell
$env:MIHOME_E2E_PORT = '1422'
pnpm run test:e2e
# 生产套件会自行启动、关闭该端口的预览服务。
pnpm run test:e2e:production
Remove-Item Env:MIHOME_E2E_PORT
```

端到端测试复用既有功能用例，重点验证家庭/房间/搜索组合、离线/异常不可写、失败状态、设备详情、场景确认、语音确认和演示隔离。扩展页面验证消息已读、摄像机隐私、本地自动化持久化、房间编辑和配网完成流程。

视觉验收基准为 1920×1080，同时检查 1366×768、2560×1440、3840×2160 和 390px 窄屏，覆盖主题、200% 用户缩放、长文本和弹层。`scripts/capture.mjs` 导出目标分辨率、全部页面及五类详情截图。以真实行为和跨层契约为测试目标，不为纯样式改动重复编写实现细节测试。
