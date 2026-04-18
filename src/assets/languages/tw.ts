const langs: Record<string, any> = {
  Error: "發生錯誤。",

  // News command
  news_NoPerm: "❌ 你需要 `管理伺服器` 權限才能使用此指令。",
  news_BindPlaceholder: "目前已綁定 <count> 個頻道",
  news_BindDefault: "選擇文字頻道...",
  news_BindCurrent: "綁定當前頻道",
  news_BindTip: "請選擇接收 **<lang>** · **<filter>** 的頻道（可多選）：",
  news_BindTipRole: "推送時提及：<role>",
  news_DmBound: "✅ **此私訊頻道已綁定。**",
  news_DmSuccess: "✅ **成功綁定。**\n將會在此私訊接收異環最新消息。",
  news_UnbindSuccess: "✅ **成功解除綁定。**",
  news_UnbindDetail: "已解除 <scope>綁定（<count> 個頻道）。",
  news_UnbindLangDetail: "已解除本伺服器 **<lang>** 語言的訂閱（<count> 個頻道）。",
  news_UnbindScopeAll: "本伺服器所有",
  news_UnbindScopeSingle: "此",
  news_NoSub: "目前沒有綁定任何頻道。",
  news_SetupSuccess: "✅ **設定已更新。**",
  news_BindSuccessDetail: "已綁定以下頻道接收通知：",
  news_BindFail: "❌ **設定失敗。**",
  news_BindFailDetail: "所有選擇的頻道皆無效，請檢查機器人權限。",
  news_UnbindAll: "✅ **設定已更新。**\n已取消所有頻道綁定。",
  news_InvalidChannels: "⚠️ **以下頻道無法綁定**（權限不足）：",
  news_PermissionMissing: "缺少：",
  news_PermissionUnknown: "無法確認權限",
  news_PermissionError: "檢查時發生錯誤",
  news_ViewChannel: "檢視頻道",
  news_SendMessages: "發送訊息",
  news_PermissionTip: "請確保機器人擁有「檢視頻道」和「發送訊息」權限。",
  news_BindCurrentSuccess: "✅ **設定已更新。**\n已綁定當前頻道 <#<channelId>> 接收通知。",

  // Language labels
  news_lang_tw: "繁體中文",
  news_lang_cn: "簡體中文",
  news_lang_en: "English",
  news_lang_jp: "日本語",

  // Filter labels
  news_filter_all:           "全部（官網最新 + 官方推文）",
  news_filter_news_all:      "官網最新",
  news_filter_news_gamenews: "官網新聞",
  news_filter_news_gameevent:"官網活動",
  news_filter_news_gamebroad:"官網系統",
  news_filter_tweet:         "官方推文",

  // Force
  news_ForceTriggered: "✅ **已觸發強制推送。**\n最新內容將在片刻後發送至綁定頻道。",
};

export default langs;
