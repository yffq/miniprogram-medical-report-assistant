# ocrReport 云函数

OCR 识别医疗检验报告的云函数，调用 Textin API 进行图像识别。

## 快速开始

### 1. 配置环境变量

在云开发控制台配置以下环境变量：

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `TEXTIN_APP_ID` | Textin API App ID | `your_app_id` |
| `TEXTIN_SECRET_CODE` | Textin API Secret Code | `your_secret_code` |
| `DEBUG_OCR` | 是否开启调试日志 | `false` |

**配置步骤**：
1. 打开云开发控制台 → 云函数 → ocrReport
2. 点击"配置" → "环境变量"
3. 添加上述环境变量

### 2. 部署云函数

在微信开发者工具中：
1. 右键点击 `ocrReport` 目录
2. 选择"上传并部署：云端安装依赖"
3. 等待部署完成

## 功能说明

- 接收医疗检验报告图片（base64 格式）
- 调用 Textin 医疗票据识别 API
- 解析识别结果，提取检验项目信息
- 返回结构化的检验数据

## 数据格式

### 输入参数

```typescript
{
  imageData: string,  // base64 编码的图片数据（必需）
  reportDate?: string // 报告日期（可选）
}
```

### 返回数据

```typescript
{
  items: [
    {
      name: string,        // 检验项目中文名称
      nameEn: string,      // 检验项目英文名称（可为空）
      value: number,       // 检验值
      unit: string,        // 单位
      normalRange: string, // 正常范围
      status: 'L' | 'N' | 'H'  // 状态：L=低于正常, N=正常, H=高于正常
    }
  ],
  totalItems: number  // 识别到的项目总数
}
```

### 返回示例

```json
{
  "items": [
    {
      "name": "白细胞",
      "nameEn": "WBC",
      "value": 5.5,
      "unit": "10^9/L",
      "normalRange": "3.5-9.5",
      "status": "N"
    },
    {
      "name": "红细胞",
      "nameEn": "RBC",
      "value": 3.2,
      "unit": "10^12/L",
      "normalRange": "4.0-5.5",
      "status": "L"
    }
  ],
  "totalItems": 2
}
```

## 使用示例

### 在小程序中调用

```typescript
// 选择图片
wx.chooseImage({
  count: 1,
  success: async (res) => {
    const tempFilePath = res.tempFilePaths[0];
    
    // 读取图片为 base64
    const fs = wx.getFileSystemManager();
    const imageData = fs.readFileSync(tempFilePath, 'base64');
    
    // 调用云函数
    wx.showLoading({ title: '识别中...' });
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'ocrReport',
        data: { imageData }
      });
      
      wx.hideLoading();
      
      if (result.result.items) {
        console.log('识别成功:', result.result);
        // 处理识别结果
        this.handleOCRResult(result.result.items);
      }
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: '识别失败，请重试',
        icon: 'none'
      });
      console.error('OCR 错误:', error);
    }
  }
});
```

## 错误处理

| 错误码 | 说明 | 处理建议 |
|--------|------|----------|
| 400 | 参数错误 | 检查 imageData 是否正确 |
| 401 | 认证失败 | 检查 API 密钥配置 |
| 500 | OCR 识别失败 | 检查图片质量，重试 |
| 502 | 网络错误 | 检查网络连接，重试 |

## 性能建议

- 图片大小：建议 < 2MB
- 图片分辨率：建议 ≥ 1000x1000
- 超时时间：30 秒
- 建议在上传前压缩图片

## 日志查看

在云开发控制台查看详细日志：
- 云开发控制台 → 云函数 → ocrReport → 日志
- 设置 `DEBUG_OCR=true` 可查看完整 API 返回数据

## 版本变更

### v2.0.0 (当前版本)

相比旧版本的变更：

1. ✓ **新增 nameEn 字段** - 存储英文名称
2. ✓ **使用 status 替代 isNormal** - 更精确的状态表示
3. ✓ **status 值为 'L'/'N'/'H'** - 三种状态
4. ✓ **移除 confidence 字段** - 简化数据结构
5. ✓ **status 来自 Textin API 的 prompt 字段** - 直接映射

## 相关文档

- [config.example.json](./config.example.json) - 配置模板
