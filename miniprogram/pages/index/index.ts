// index.ts
Component({
  data: {
    menuItems: [
      {
        id: 'upload',
        title: '上传报告',
        icon: '📋',
        desc: '拍照或选择图片识别检验报告',
        url: '/pages/upload/upload'
      },
      {
        id: 'reports',
        title: '历史报告',
        icon: '📊',
        desc: '查看已保存的检验报告',
        url: '/pages/report-list/report-list'
      },
      {
        id: 'chart',
        title: '指标趋势',
        icon: '📈',
        desc: '查看指标变化趋势图',
        url: '/pages/indicator-select/indicator-select'
      }
    ]
  },
  methods: {
    navigateTo(e: any) {
      const { url } = e.currentTarget.dataset
      wx.navigateTo({
        url
      })
    }
  }
})
