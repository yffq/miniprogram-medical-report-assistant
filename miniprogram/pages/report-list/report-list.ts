// report-list.ts
import { getReports } from '../../utils/database'
import { showLoadError, showNetworkError, checkNetworkStatus } from '../../utils/error-handler'

interface Report {
  _id: string
  reportDate: string
  itemCount: number
  abnormalCount: number
  createdAt: string
}

Component({
  data: {
    reports: [] as Report[],
    page: 1,
    pageSize: 20,
    total: 0,
    loading: false,
    hasMore: true,
    isEmpty: false
  },

  lifetimes: {
    attached() {
      this.loadReports()
    }
  },

  methods: {
    // 加载报告列表
    async loadReports(refresh: boolean = false) {
      if (this.data.loading) return

      // 检查网络状态
      const hasNetwork = await checkNetworkStatus()
      if (!hasNetwork) {
        showNetworkError(() => {
          this.loadReports(refresh)
        })
        return
      }

      const page = refresh ? 1 : this.data.page

      this.setData({ loading: true })

      try {
        const result = await getReports(page, this.data.pageSize)

        const reports = refresh ? result.reports : [...this.data.reports, ...result.reports]
        const hasMore = reports.length < result.total

        this.setData({
          reports,
          page: page,
          total: result.total,
          hasMore,
          isEmpty: reports.length === 0,
          loading: false
        })
      } catch (error: any) {
        console.error('加载报告列表失败:', error)
        this.setData({ loading: false })
        
        // 使用统一的加载错误处理
        showLoadError(error, () => {
          this.loadReports(refresh)
        })
      }
    },

    // 下拉刷新
    onPullDownRefresh() {
      this.loadReports(true).then(() => {
        wx.stopPullDownRefresh()
      })
    },

    // 上拉加载更多
    onReachBottom() {
      if (!this.data.hasMore || this.data.loading) return

      this.setData({
        page: this.data.page + 1
      })
      this.loadReports()
    },

    // 查看报告详情
    viewReport(e: any) {
      const { id } = e.currentTarget.dataset
      console.log('Viewing report, id:', id)
      if (!id) {
        wx.showToast({
          title: '报告ID不存在',
          icon: 'none'
        })
        return
      }
      wx.navigateTo({
        url: `/pages/report-detail/report-detail?id=${id}`
      })
    },

    // 返回首页
    goHome() {
      wx.switchTab({
        url: '/pages/index/index'
      })
    }
  }
})
