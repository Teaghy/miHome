# 页面覆盖与能力清单

以 [UI 设计规范](米家桌面端_UI设计规范.md) 的 20 个页面为验收清单。所有页面共用 `DesktopShell`、语义色、卡片、按钮、图标、圆角和间距。Hash 路由适配浏览器与 Tauri；可直接打开或通过应用导航访问。

| 页面                                                    | 路由                                  | 已实现的交互与数据边界                                                                                           |
| ------------------------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| [首页 / 家庭总览](images/home-1920x1080.png)            | `/#/home`                             | Hero、天气、场景、房间、八台设备、安防、摄像头、能耗、环境、消息；设备与场景使用共享控制接口，扩展数据按家庭隔离 |
| [设备管理](images/pages/devices.png)                    | `/#/devices`                          | 搜索、房间、类型、在线/离线/异常筛选，收藏、快捷控制与详情                                                       |
| [设备详情 · 空调](images/pages/device-ac.png)           | `/#/device-detail?device=demo-ac`     | 温度圆环、增减温度、模式、电源；写入后重新读取                                                                   |
| [设备详情 · 灯](images/pages/device-light.png)          | `/#/device-detail?device=demo-light`  | 亮度圆环、色温、开关与参数范围                                                                                   |
| [设备详情 · 扫拖机器人](images/pages/device-vacuum.png) | `/#/device-detail?device=demo-vacuum` | 示例户型、实际读取的电量、开始清扫/返回充电及确认                                                                |
| [设备详情 · 摄像头](images/pages/device-camera.png)     | `/#/device-detail?device=demo-camera` | 本地静帧预览、MIoT 隐私属性与清晰度信息                                                                          |
| [设备详情 · 门锁](images/pages/device-lock.png)         | `/#/device-detail?device=demo-lock`   | 读取门锁状态、电量与连接信息；只读展示                                                                           |
| [场景](images/pages/scenes.png)                         | `/#/scenes`                           | 手动场景列表、搜索、同步、执行确认与反馈                                                                         |
| [自动化](images/pages/automation.png)                   | `/#/automation`                       | IF → THEN 卡片、本地创建、启停、删除、持久化；不运行真实定时或云端规则                                           |
| [摄像头监控](images/pages/cameras.png)                  | `/#/cameras`                          | 四画面/大画面、房间筛选、本地隐私模式与全屏静帧预览；不伪称直播                                                  |
| [家庭安防](images/pages/security.png)                   | `/#/security`                         | 本地布防确认、门窗/烟雾/人形/门锁状态卡与事件记录                                                                |
| [环境监测](images/pages/environment.png)                | `/#/environment`                      | 房间、指标、周期选择；温湿度、PM2.5、CO₂ 示例趋势与关联设备                                                      |
| [能耗统计](images/pages/energy.png)                     | `/#/energy`                           | 日/周/月、用量趋势、设备分布、预估电费与减排示例                                                                 |
| [消息中心](images/pages/messages.png)                   | `/#/messages`                         | 分类/未读/搜索、本地已读、详情、删除与持久化                                                                     |
| [家庭管理](images/pages/family.png)                     | `/#/family`                           | 成员卡片、角色与房间权限；本地添加/移除，不发出外部邀请                                                          |
| [房间管理](images/pages/rooms.png)                      | `/#/rooms`                            | 房间卡片、设备数量、在线数；当前演示会话添加/重命名并更新设备归属                                                |
| [设备添加](images/pages/add-device.png)                 | `/#/add-device`                       | 八类设备目录、搜索与分类，进入配网流程                                                                           |
| [设备配网](images/pages/pairing.png)                    | `/#/pairing`                          | 准备、网络名称、连接进度、房间和命名、完成；仅本地体验，不收集网络密码                                           |
| [个人中心](images/pages/profile.png)                    | `/#/profile`                          | 账号状态、家庭/设备/收藏入口、登录、真实账号退出确认                                                             |
| [设置](images/pages/settings.png)                       | `/#/settings`                         | 浅色/深色/系统主题、缩放、刷新、原生选项、默认音箱和本地通知偏好                                                 |

额外保留 `/#/favorites` 收藏设备、`/#/activity` 当前会话操作记录，以及快速设备、账号、设置、登录和小爱弹层。

## 真实家庭的边界

- 已有原生能力：账号、家庭/设备快照、MIoT 详情与属性、设备动作、手动场景、音箱文字指令、设置。继续经过 `src/api/mihome.ts`。
- 尚未接入：天气服务、实时视频流、云端能耗/环境历史、真实安防汇总、云端消息、成员权限写入、房间编辑、设备发现/配网、自动化执行。对应页面展示空态或说明，并禁用不具备后端能力的写入。
- 新增的 `src/api/household.ts` 只管理演示家庭的本地状态；真实会话读取返回空值，保存被拒绝。状态使用家庭 ID 分区，损坏缓存回退为示例初始值。
- 自动化编辑与本地配网不是后台调度器或真实无线连接；界面完成不等于硬件能力已实现。

## 视觉与行为覆盖

全局加载、请求失败/重试、服务空态和未连接状态由应用外壳承载；设备卡片覆盖开启、关闭、离线、异常、Hover、禁用和收藏状态。模态交互沿用 Radix 的键盘与焦点管理。

自动化、消息、摄像机隐私、房间编辑和配网完成流程有端到端回归；所有路由及五类详情有渲染与横向溢出检查。四个目标分辨率有独立首页检查和截图。

## 首页画布预览

[1920×1080](images/home-1920x1080.png) · [1366×768](images/home-1366x768.png) · [2560×1440](images/home-2560x1440.png) · [3840×2160](images/home-3840x2160.png)。上表的页面名称链接到对应页面截图。
