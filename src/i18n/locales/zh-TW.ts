const zhTW = {
    intro: {
        login: {
            brand: 'SEF-CLI',
            subtitle: '軟體工程獸互動系統',
            googleAction: '登入Google與軟體工程獸們互動',
        },
        fields: {
            displayName: '顯示名稱',
        },
        placeholders: {
            displayName: '你想在聊天室裡怎麼被看見？',
            customTag: '新增自訂 TAG',
            socialPlatform: '平台，例如 Telegram',
            socialUrl: 'URL',
        },
        steps: {
            nickname: {
                title: '請告訴系統要怎麼顯示你',
                description: '先決定聊天室裡要怎麼顯示你。',
            },
            avatar: {
                title: '頭像與顏色',
                description: '這一步先用 mock 頭像與顏色，之後再接真圖床。',
            },
            tags: {
                title: 'TAG',
                description: '先補幾個標籤，讓別人比較快認識你。',
            },
            socials: {
                title: '社群連結',
                description: '留一個最常用的聯絡方式就夠了，也可以先略過。',
            },
            stickers: {
                title: '自訂貼圖',
                description: '這一步先用 mock 自訂貼圖包，之後再換成真上傳流程。',
            },
            review: {
                title: '確認你的設定',
                description: '最後確認一次你剛剛設定的內容。',
            },
            topic: {
                title: '話題卡抽獎',
                description: '確認完成後，按下抽獎按鈕領取你的起始話題卡。',
            },
        },
        review: {
            displayName: '顯示名稱',
            avatar: '頭像與顏色',
            tags: 'TAG',
            socials: '社群連結',
            stickers: '自訂貼圖',
            skipped: '先略過',
            empty: '未設定',
            unfilled: '未填寫',
        },
        topic: {
            prompt: '資料已建立完成，現在可以抽出你的第一張話題卡。',
            drawing: '抽獎中...',
            drawButton: '抽出話題卡',
            result: '抽獎結果',
            redirect: '{seconds} 秒後進入 chat...',
        },
        tags: {
            loading: '載入標籤中...',
            loadFailed: '載入失敗（可略過或重試）',
        },
        actions: {
            retry: '重試',
            add: '新增',
            addSocialLink: '新增社群連結',
            remove: '移除',
            previous: '上一步',
            skip: '先略過',
            next: '下一步',
            confirmCreate: '確認並建立',
        },
        options: {
            avatar: '選一個 mock 頭像',
            avatarColor: '選一個頭像顏色',
        },
    },
    error: {
        title: '哎呀',
        subtitleNotFound: '找不到頁面',
        subtitleServer: '伺服器錯誤',
        subtitleNetwork: '連線中斷',
        codeLabel: 'CODE',
        fromLabel: 'from',
        backHome: '回首頁',
    },
}

export default zhTW
