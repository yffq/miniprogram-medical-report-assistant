// chart.ts
import { getIndicatorHistory } from '../../utils/database'
import { generateChartConfig, getDataStatistics } from '../../utils/chart-config'
import { showLoadError } from '../../utils/error-handler'

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

Component({
  data: {
    indicatorNames: [] as string[],
    indicatorData: [] as IndicatorData[],
    loading: true,
    chartConfig: null as any,
    statistics: [] as any[],
    showStatistics: false,
    ec: {
      lazyLoad: true,
      onInit: null as any
    }
  },

  lifetimes: {
    attached() {
      // 从页面参数获取指标名称列表
      const pages = getCurrentPages()
      const currentPage = pages[pages.length - 1]
      const options = (currentPage.options || {}) as any
      
      console.log('chart attached, options:', options)
      
      let names: string[] | null = null
      
      // 优先从 URL 参数获取
      if (options && options.names) {
        try {
          names = JSON.parse(decodeURIComponent(options.names))
          console.log('Parsed indicator names from URL:', names)
        } catch (error) {
          console.error('解析指标名称失败:', error)
        }
      }
      
      // 如果 URL 参数失败，从 globalData 获取
      if (!names) {
        const app = getApp<IAppOption>()
        names = (app.globalData && app.globalData.selectedIndicatorNames) || null
        console.log('URL 参数为空，从 globalData 获取 names:', names)
      }
      
      if (names && names.length > 0) {
        this.setData({ indicatorNames: names })
        this.loadIndicatorHistory()
        
        // 清除 globalData 中的临时数据
        const app = getApp<IAppOption>()
        if (app.globalData) {
          delete app.globalData.selectedIndicatorNames
        }
      } else {
        console.error('Missing names parameter, options:', options)
        wx.showModal({
          title: '提示',
          content: '缺少指标参数，请从指标选择页面重新进入。',
          showCancel: false,
          success: () => {
            wx.navigateBack()
          }
        })
      }
    }
  },

  methods: {
    // 加载指标历史数据
    async loadIndicatorHistory() {
      this.setData({ loading: true })

      try {
        // 为每个指标分别查询历史数据
        const promises = this.data.indicatorNames.map(name => 
          getIndicatorHistory(name)
        )
        
        const results = await Promise.all(promises)
        
        // 转换数据格式
        const indicatorData: IndicatorData[] = results.map(result => ({
          indicator: result.indicatorName,
          records: result.history.map(item => ({
            date: item.reportDate,
            value: item.value,
            unit: item.unit,
            normalRange: '', // 历史数据中没有 normalRange
            status: item.status,
            reportId: '' // 历史数据中没有 reportId
          }))
        }))

        // 过滤掉没有数据的指标
        const validData = indicatorData.filter(item => item.records && item.records.length > 0)

        if (validData.length === 0) {
          wx.showModal({
            title: '暂无数据',
            content: '选中的指标暂无历史数据，请先上传包含这些指标的检验报告',
            showCancel: false,
            success: () => {
              wx.navigateBack()
            }
          })
          return
        }

        // 数据点数量提示（可选）
        const singlePointIndicators = validData.filter(item => item.records.length === 1)
        if (singlePointIndicators.length > 0) {
          const names = singlePointIndicators.map(item => item.indicator).join('、')
          wx.showToast({
            title: `${names} 仅有1条记录，上传更多报告可查看趋势`,
            icon: 'none',
            duration: 2000
          })
        }

        // 生成图表配置
        const chartConfig = generateChartConfig(validData)

        // 计算统计信息
        const statistics = validData.map(item => ({
          name: item.indicator,
          unit: (item.records[0] && item.records[0].unit) || '',
          ...getDataStatistics(item.records)
        }))

        this.setData({
          indicatorData: validData,
          chartConfig,
          statistics,
          loading: false
        })

        // 初始化图表
        this.initChart()
      } catch (error: any) {
        console.error('加载指标历史数据失败:', error)
        this.setData({ loading: false })
        
        // 使用统一的加载错误处理，提供重试选项
        showLoadError(error, () => {
          this.loadIndicatorHistory()
        })
        
        // 如果用户不重试，延迟返回上一页
        setTimeout(() => {
          if (this.data.loading === false && this.data.indicatorData.length === 0) {
            wx.navigateBack()
          }
        }, 3000)
      }
    },

    // 初始化图表
    initChart() {
      console.log('初始化图表, chartConfig:', this.data.chartConfig)
      
      if (!this.data.chartConfig) {
        console.error('图表配置为空')
        return
      }

      const chartConfig = this.data.chartConfig

      // 设置 onInit 回调并触发图表初始化
      this.setData({
        'ec.onInit': (canvas: any, width: number, height: number, dpr: number) => {
          console.log('ec.onInit 被调用, width:', width, 'height:', height)
          
          // 动态导入 echarts
          const echarts = require('../../components/ec-canvas/echarts')
          
          const chart = echarts.init(canvas, null, {
            width: width,
            height: height,
            devicePixelRatio: dpr
          })
          
          console.log('设置图表配置')
          chart.setOption(chartConfig)
          
          return chart
        }
      }, () => {
        // setData 完成后，手动调用 init
        setTimeout(() => {
          const chartComponent = this.selectComponent('#mychart') as any
          if (chartComponent) {
            console.log('调用 chartComponent.init()')
            chartComponent.init()
          } else {
            console.error('未找到图表组件')
          }
        }, 100)
      })
    },

    // 切换统计信息显示
    toggleStatistics() {
      this.setData({
        showStatistics: !this.data.showStatistics
      })
    },

    // 查看报告详情
    viewReport(e: any) {
      const { reportId } = e.currentTarget.dataset
      wx.navigateTo({
        url: `/pages/report-detail/report-detail?id=${reportId}`
      })
    }
  }
})
