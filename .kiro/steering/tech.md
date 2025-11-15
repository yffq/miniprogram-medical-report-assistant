---
inclusion: always
---

# 技术栈

## 核心技术

- **平台**: 微信小程序
- **语言**: TypeScript (ES2020 目标，CommonJS 模块)
- **样式**: LESS
- **组件框架**: Glass Easel
- **渲染引擎**: Skyline (已启用)

## TypeScript 配置

启用严格模式，包含以下关键设置：
- `strictNullChecks`, `noImplicitAny`, `noImplicitThis`
- `noImplicitReturns`, `noUnusedLocals`, `noUnusedParameters`
- `strictPropertyInitialization`
- 目标: ES2020
- 模块: CommonJS

## 构建系统

项目使用微信开发者工具内置编译器：
- TypeScript 编译插件
- LESS 编译插件
- 无需外部构建工具（webpack、vite 等）

## 开发规范

- **编辑器设置**: 2 空格缩进 (insertSpaces)
- **基础库版本**: 2.32.3
- **按需加载**: 已启用组件按需加载
- 开发通过微信开发者工具进行

## 常用模式

- 页面使用 `Component()` 构造器（组件化页面）
- 通过 `getApp<IAppOption>()` 访问应用实例
- 类型定义存放在 `typings/` 目录
- 微信 API 类型来自 `miniprogram-api-typings` 包
