# Windows 构建交接

## 当前状态

源代码、前端生产构建、27 项 Rust 离线测试、21 项 TypeScript/启动脚本测试、15 项浏览器用例（分别在开发和生产模式运行）已通过。真实小米二维码生成/取消测试已通过，但没有扫码确认账号，也未操作真实设备。

**尚未产出可运行的 Windows exe 或安装包。** 标准 Tauri Release 构建在 MSVC 资源链接阶段失败；不能把通过 `cargo check` 或库测试当作桌面程序已运行的证据。

## 给设备管理员的诊断摘要

- 标准命令：`npm run desktop:build -- --no-bundle`。
- 错误：`CVTRES CVT1103`，随后 `LINK LNK1123`。
- 受影响的是 Tauri 自动生成的构建资源 `src-tauri/target/release/build/mihome-*/out/resource.lib`。
- 观察到文件头包含 `E-SafeNet` 和 `LOCK`，资源转换工具无法按 Windows 资源格式读取。
- 同一资源描述使用标准 Windows SDK 生成 `.res`、再转换 COFF 对象的诊断测试成功，表明图标及资源描述有效；诊断临时产物已清理。
- 本项目没有停用安全软件、修改加密策略、解密受保护文件、修改编译依赖或加入绕过脚本。

请由有授权的管理员核查 **Rust/Cargo、Windows SDK 资源编译器、CVTRES、MSVC LINK** 之间的中间文件读写授权，按组织安全策略恢复标准编译流程。不需要把应用改为管理员运行，也不要把账号凭据加入构建或提供给他人。

## 环境恢复后的验证

先重新生成受影响的构建中间文件，再在项目根目录运行：

```powershell
npm ci
npm test
node scripts/rust.mjs test --locked
node scripts/rust.mjs clippy --all-targets --locked -- -D warnings
npm run desktop:build -- --no-bundle
```

成功后应检查 `src-tauri/target/release/mihome.exe`，实际启动验证 WebView2 窗口、主题、托盘显示/隐藏/退出及设置保存。之后再使用自己的米家账号扫码，按主 README 的真实设备验收步骤核实行为。安装包需要另行执行 `npm run desktop:build` 并验证安装/卸载；本项目尚未配置代码签名。

如果组织允许，可以使用已提供的 [Windows CI 配置](../.github/workflows/ci.yml) 在合规的构建环境验证。**本会话没有推送代码或执行远程 CI，不能宣称 CI 已通过。** 不要上传账号凭据、应用数据、其他项目内容或本地工具链；参考项目仍须按 GPL 许可保留来源声明。

完整结果及已知功能差异见 [验证记录](VERIFICATION.md) 与 [主 README](../README.md)。
