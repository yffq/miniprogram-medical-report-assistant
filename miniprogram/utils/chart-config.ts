/**
 * 图表配置工具
 * 生成 ECharts 配置，处理多指标数据
 */

interface IndicatorData {
  indicator: string
  records: Array<{
    date: string
    value: number
    unit: string
    normalRange: string
    status: 'L' | 'N' | 'H'
    reportId: string
  }>
}

// 预定义的颜色方案
const CHART_COLORS = [
  '#5470c6', // 蓝色
  '#91cc75', // 绿色
  '#fac858', // 黄色
  '#ee6666', // 红色
  '#73c0de', // 青色
  '#3ba272', // 深绿
  '#fc8452', // 橙色
  '#9a60b4', // 紫色
  '#ea7ccc', // 粉色
  '#5470c6'  // 循环使用
]

/**
 * 解析正常范围字符串
 * @param normalRange 正常范围字符串，如 "3.5-5.5"、"<10"、">100"
 * @returns { min: number | null, max: number | null }
 */
function parseNormalRange(normalRange: string): { min: number | null; max: number | null } {
  if (!normalRange) {
    return { min: null, max: null }
  }

  // 处理范围格式 "3.5-5.5"
  const rangeMatch = normalRange.match(/^([\d.]+)\s*-\s*([\d.]+)$/)
  if (rangeMatch) {
    return {
      min: parseFloat(rangeMatch[1]),
      max: parseFloat(rangeMatch[2])
    }
  }

  // 处理小于格式 "<10"
  const lessThanMatch = normalRange.match(/^<\s*([\d.]+)$/)
  if (lessThanMatch) {
    return {
      min: null,
      max: parseFloat(lessThanMatch[1])
    }
  }

  // 处理大于格式 ">100"
  const greaterThanMatch = normalRange.match(/^>\s*([\d.]+)$/)
  if (greaterThanMatch) {
    return {
      min: parseFloat(greaterThanMatch[1]),
      max: null
    }
  }

  return { min: null, max: null }
}

/**
 * 生成 ECharts 配置
 * @param indicatorDataList 指标数据列表
 * @returns ECharts 配置对象
 */
export function generateChartConfig(indicatorDataList: IndicatorData[]): any {
  if (!indicatorDataList || indicatorDataList.length === 0) {
    return null
  }

  // 收集所有日期并排序
  const allDates = new Set<string>()
  indicatorDataList.forEach(item => {
    item.records.forEach(record => {
      allDates.add(record.date)
    })
  })
  const sortedDates = Array.from(allDates).sort()

  // 生成系列数据
  const series: any[] = []
  const legend: string[] = []

  indicatorDataList.forEach((item, index) => {
    const color = CHART_COLORS[index % CHART_COLORS.length]
    const seriesName = `${item.indicator} (${(item.records[0] && item.records[0].unit) || ''})`
    legend.push(seriesName)

    // 构建数据点
    const data = sortedDates.map(date => {
      const record = item.records.find(r => r.date === date)
      return record ? record.value : null
    })

    // 添加折线系列
    series.push({
      name: seriesName,
      type: 'line',
      data,
      smooth: true,
      symbol: 'circle',
      symbolSize: 8, // 增大点的大小，确保单点可见
      showSymbol: true, // 强制显示数据点
      lineStyle: {
        width: 2,
        color
      },
      itemStyle: {
        color,
        borderWidth: 2,
        borderColor: '#fff'
      },
      emphasis: {
        focus: 'series',
        itemStyle: {
          borderWidth: 3,
          shadowBlur: 10,
          shadowColor: color
        }
      }
    })

    // 添加正常范围区域（如果有）
    const firstRecord = item.records[0]
    if (firstRecord && firstRecord.normalRange) {
      const { min, max } = parseNormalRange(firstRecord.normalRange)
      
      if (min !== null && max !== null) {
        // 添加正常范围的上下界线
        series.push({
          name: `${item.indicator} 正常范围`,
          type: 'line',
          data: sortedDates.map(() => max),
          lineStyle: {
            type: 'dashed',
            color: color,
            opacity: 0.3,
            width: 1
          },
          symbol: 'none',
          silent: true,
          animation: false
        })

        series.push({
          name: `${item.indicator} 正常范围下限`,
          type: 'line',
          data: sortedDates.map(() => min),
          lineStyle: {
            type: 'dashed',
            color: color,
            opacity: 0.3,
            width: 1
          },
          symbol: 'none',
          silent: true,
          animation: false,
          areaStyle: {
            color: color,
            opacity: 0.1
          }
        })
      }
    }
  })

  // 生成配置
  const config = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      },
      formatter: (params: any) => {
        if (!params || params.length === 0) return ''
        
        const date = params[0].axisValue
        let html = `<div style="font-weight: bold; margin-bottom: 5px;">${date}</div>`
        
        params.forEach((param: any) => {
          // 只显示主要数据系列，不显示正常范围线
          if (!param.seriesName.includes('正常范围')) {
            const value = param.value !== null ? param.value.toFixed(2) : '-'
            html += `
              <div style="margin: 3px 0;">
                ${param.marker} ${param.seriesName}: ${value}
              </div>
            `
          }
        })
        
        return html
      }
    },
    legend: {
      data: legend,
      top: 10,
      type: 'scroll',
      textStyle: {
        fontSize: 12
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '10%',
      top: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: sortedDates,
      axisLabel: {
        rotate: 45,
        fontSize: 10
      }
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        fontSize: 10
      },
      splitLine: {
        lineStyle: {
          type: 'dashed',
          opacity: 0.3
        }
      }
    },
    series,
    dataZoom: [
      {
        type: 'inside',
        start: 0,
        end: 100
      },
      {
        type: 'slider',
        start: 0,
        end: 100,
        height: 20,
        bottom: 10
      }
    ]
  }

  return config
}

/**
 * 获取指标颜色
 * @param index 指标索引
 * @returns 颜色值
 */
export function getIndicatorColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length]
}

/**
 * 格式化日期用于图表显示
 * @param dateStr 日期字符串
 * @returns 格式化后的日期
 */
export function formatChartDate(dateStr: string): string {
  const date = new Date(dateStr)
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${month}/${day}`
}

/**
 * 检查数据点是否异常
 * @param value 数值
 * @param normalRange 正常范围字符串
 * @returns 是否异常
 */
export function isAbnormalValue(value: number, normalRange: string): boolean {
  const { min, max } = parseNormalRange(normalRange)
  
  if (min !== null && value < min) {
    return true
  }
  
  if (max !== null && value > max) {
    return true
  }
  
  return false
}

/**
 * 获取数据统计信息
 * @param records 记录列表
 * @returns 统计信息
 */
export function getDataStatistics(records: Array<{ value: number }>) {
  if (!records || records.length === 0) {
    return {
      min: 0,
      max: 0,
      avg: 0,
      count: 0
    }
  }

  const values = records.map(r => r.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const sum = values.reduce((a, b) => a + b, 0)
  const avg = sum / values.length

  return {
    min: Number(min.toFixed(2)),
    max: Number(max.toFixed(2)),
    avg: Number(avg.toFixed(2)),
    count: values.length
  }
}
