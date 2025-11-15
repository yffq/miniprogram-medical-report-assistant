---
inclusion: always
---

# 项目结构

## 根目录配置

- `project.config.json` - 微信小程序项目配置
- `tsconfig.json` - TypeScript 编译器配置
- `package.json` - Node 依赖（仅开发环境）

## 小程序目录 (`miniprogram/`)

所有小程序源代码位于 `miniprogram/` 目录：

### 核心文件
- `app.ts` - 应用入口和全局配置
- `app.json` - 页面路由和窗口配置
- `app.less` - 全局样式
- `sitemap.json` - 微信搜索 SEO 配置

### 页面 (`pages/`)
每个页面包含 4 个同名文件：
- `.ts` - TypeScript 逻辑（使用 `Component()` 构造器）
- `.wxml` - 模板标记
- `.less` - 页面样式
- `.json` - 页面配置

示例：`pages/index/` 包含 `index.ts`、`index.wxml`、`index.less`、`index.json`

### 组件 (`components/`)
自定义组件遵循与页面相同的 4 文件结构：
- `.ts` - 组件逻辑（使用 `Component()` 构造器）
- `.wxml` - 组件模板
- `.less` - 组件样式
- `.json` - 组件配置

示例：`components/navigation-bar/`

### 工具函数 (`utils/`)
共享的工具函数和辅助函数，使用 TypeScript 文件。

## 类型定义 (`typings/`)

- `typings/index.d.ts` - 主类型定义入口
- `typings/types/wx/` - 微信 API 类型定义
- 应用自定义类型定义

## 约定规范

- 页面和组件都使用 `Component()` 构造器
- 组件属性在 `properties` 对象中定义
- 方法在 `methods` 对象中定义
- 组件生命周期钩子在 `lifetimes` 对象中定义
- 使用自定义导航栏（app.json 中 navigationStyle: "custom"）
