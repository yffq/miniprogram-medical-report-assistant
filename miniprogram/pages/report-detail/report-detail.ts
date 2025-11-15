// report-detail.ts
import { getReportDetail, Report } from '../../utils/database'
import { showLoadError } from '../../utils/error-handler'

Component({
  data: {
    reportId: '',
    report: null as Report | null,
    loading: true,
    normalItems: [] as TestItem[],
    abnormalItems: [] as TestItem[],
    showAbnormalOnly: false
  },

  lifetimes: {
    attached() {
      // 从页面参数获取报告 ID
      const pages = getCurrentPages()
      const currentPage = pages[pages.length - 1]
      const options = (currentPage.options || {}) as any
      
      console.log('report-detail attached')
      console.log('options:', options)
      console.log('options.id:', options.id)
      
      // 优先从 URL 参数获取，如果失败则从 globalData 获取
      let reportId = options.id
      
      if (!reportId) {
        const app = getApp<IAppOption>()
        reportId = (app.globalData && app.globalData.currentReportId) || ''
        console.log('URL 参数为空，从 globalData 获取 reportId:', reportId)
      }
      
      if (reportId) {
        console.log('Setting reportId:', reportId)
        this.setData({ reportId })
        this.loadReportDetail()
        
        // 清除 globalData 中的临时数据
        const app = getApp<IAppOption>()
        if (app.globalData) {
          delete app.globalData.currentReportId
        }
      } else {
        console.error('报告 ID 不存在, options:', options)
        wx.showModal({
          title: '提示',
          content: '报告 ID 不存在，请从报告列表重新进入。',
          showCancel: false,
          success: () => {
            wx.navigateBack()
          }
        })
      }
    }
  },

  methods: {
    // 加载报告详情
    async loadReportDetail() {
      this.setData({ loading: true })

      try {
        console.log('Loading report detail, reportId:', this.data.reportId)
        const report = await getReportDetail(this.data.reportId)
        console.log('Report loaded successfully:', report)

        // 验证数据完整性
        if (!report || !report.items) {
          throw new Error('报告数据不完整')
        }

        // 分类正常和异常项目（使用 status 字段）
        const normalItems = report.items.filter(item => item.status === 'N')
        const abnormalItems = report.items.filter(item => item.status === 'L' || item.status === 'H')

        this.setData({
          report,
          normalItems,
          abnormalItems,
          loading: false
        })
      } catch (error: any) {
        console.error('加载报告详情失败:', error)
        this.setData({ loading: false })
        
        // 使用统一的加载错误处理，提供重试选项
        showLoadError(error, () => {
          this.loadReportDetail()
        })
        
        // 如果重试失败，延迟返回上一页
        setTimeout(() => {
          if (this.data.loading === false && !this.data.report) {
            wx.navigateBack()
          }
        }, 3000)
      }
    },

    // 切换显示模式
    toggleShowMode() {
      this.setData({
        showAbnormalOnly: !this.data.showAbnormalOnly
      })
    },

    // 格式化日期
    formatDate(dateStr: string): string {
      const date = new Date(dateStr)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
  }
})
