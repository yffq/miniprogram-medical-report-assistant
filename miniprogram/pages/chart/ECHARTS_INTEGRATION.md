# ECharts 集成说明

## 快速集成

### 1. 下载 ECharts

```bash
git clone https://github.com/ecomfe/echarts-for-weixin.git
# 或
npm install echarts-for-weixin
```

### 2. 复制文件

将 `ec-canvas` 目录复制到 `miniprogram/` 目录下。

### 3. 配置组件

**chart.json**:
```json
{
  "usingComponents": {
    "ec-canvas": "/ec-canvas/ec-canvas"
  }
}
```

**chart.wxml**:
```xml
<ec-canvas 
  id="mychart" 
  canvas-id="mychart" 
  ec="{{ ec }}"
  class="chart-canvas"
></ec-canvas>
```

**chart.ts**:
```typescript
data: {
  ec: {
    onInit: (canvas: any, width: number, height: number, dpr: number) => {
      const echarts = require('../../ec-canvas/echarts')
      const chart = echarts.init(canvas, null, {
        width, height, devicePixelRatio: dpr
      })
      chart.setOption(this.data.chartConfig)
      return chart
    }
  }
}
```

**chart.less**:
```less
.chart-canvas {
  width: 100%;
  height: 600rpx;
}
```

## 功能特性

- 多指标折线图
- 正常范围区域显示
- 数据点交互
- 图表缩放和拖动
- 图例显示和切换

## 参考资源

- [ECharts for 微信小程序](https://github.com/ecomfe/echarts-for-weixin)
- [ECharts 官方文档](https://echarts.apache.org/zh/index.html)

## 注意事项

- ECharts 文件较大，建议使用分包加载
- 在真机上测试图表性能和交互效果
