# 开源许可与参考来源

本项目 MiHome Desktop 是非官方桌面客户端，以 **GPL-3.0-or-later** 发布。它是 Rust + Tauri + React 重写，而不是原 Python / PySide 程序的打包，也没有使用 SiliconUI 源码或图标资源。

## 功能与协议参考

- [huanyuejue/MiHome-Windows](https://github.com/huanyuejue/MiHome-Windows)，GPL-3.0-or-later。参考提交 `22655b8d0df07da44772833fbd33f696c0629b17`。原项目版权属于 MiHome-Windows contributors。参考家庭/房间映射、按 MIoT spec 生成控件、手动场景、小爱文字指令等行为。
- [Do1e/mijia-api](https://github.com/Do1e/mijia-api)，GPL-3.0。参考提交 `2cc61f2e4ae21d9e3736e450c968bbe53c87ebd1`。Rust 实现参考其扫码认证、Cookie、令牌刷新、MIoT 端点和请求签名顺序。
- 上游 `mijiaAPI/miutils.py` 同时保留了 micloud 的 MIT 声明：Copyright (C) 2020 Sammy Svensson，原始出处 [Squachen/micloud](https://github.com/Squachen/micloud/blob/master/micloud/miutils.py)。本项目对其协议算法进行了 Rust 重写，并保留该来源声明。

MIT 原始许可：Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions: The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## 主要运行依赖

- Tauri：MIT / Apache-2.0。
- React、Vite、Tailwind CSS、Radix UI、qrcode.react：MIT。
- Lucide：ISC。
- Rust 的 reqwest、tokio、serde 等以各依赖自身许可为准；准确版本见 npm 与 Cargo 锁文件。

分发二进制时，需同时履行 GPL 的源代码提供义务，并保留本声明与 LICENSE。小米、米家、小爱及相关产品名称属于各自权利人，本项目与小米公司没有隶属、合作或官方认证关系。请遵守相关服务条款，本项目不提供任何担保。
