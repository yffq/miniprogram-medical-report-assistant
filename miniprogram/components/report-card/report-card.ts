Component({
  properties: {
    report: {
      type: Object,
      value: {}
    }
  },

  methods: {
    onTap() {
      const report = this.data.report as any
      const reportId = report._id || report.id
      
      console.log('report-card onTap, report:', report)
      console.log('report-card onTap, reportId:', reportId)
      
      if (reportId) {
        // 同时使用 URL 参数和 globalData 传递 ID
        const app = getApp<IAppOption>()
        app.globalData = app.globalData || {}
        app.globalData.currentReportId = reportId
        
        console.log('Stored reportId in globalData:', reportId)
        
        wx.navigateTo({
          url: `/pages/report-detail/report-detail?id=${reportId}`
        })
      } else {
        console.error('报告ID不存在, report:', report)
        wx.showToast({
          title: '报告ID不存在',
          icon: 'none'
        })
      }
    }
  }
})
