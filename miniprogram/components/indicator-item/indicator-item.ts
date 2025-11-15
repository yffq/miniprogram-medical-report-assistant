Component({
  properties: {
    item: {
      type: Object,
      value: {}
    },
    editable: {
      type: Boolean,
      value: false
    }
  },

  methods: {
    onEdit() {
      this.triggerEvent('edit', { item: this.data.item })
    },

    onDelete() {
      wx.showModal({
        title: '确认删除',
        content: `确定要删除"${this.data.item.name}"吗？`,
        success: (res) => {
          if (res.confirm) {
            this.triggerEvent('delete', { item: this.data.item })
          }
        }
      })
    }
  }
})
