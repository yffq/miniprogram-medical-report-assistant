/// <reference path="./types/index.d.ts" />

interface TestItem {
  id?: number
  name: string
  nameEn: string
  value: number
  unit: string
  normalRange: string
  status: 'L' | 'N' | 'H'
}

interface IAppOption {
  globalData: {
    userInfo?: WechatMiniprogram.UserInfo,
    tempReportData?: {
      reportDate: string
      items: TestItem[]
    },
    currentReportId?: string,
    selectedIndicatorNames?: string[]
  }
  userInfoReadyCallback?: WechatMiniprogram.GetUserInfoSuccessCallback,
}