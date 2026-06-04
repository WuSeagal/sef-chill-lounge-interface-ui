const zhTW = {
    intro: {
        login: {
            brand: 'SEF-CLI',
            subtitle: '軟體工程獸互動系統',
            googleAction: '使用 Google 登入',
            googleTagline: '與軟體工程獸們互動',
        },
        fields: {
            displayName: '顯示名稱',
        },
        placeholders: {
            displayName: '例：毛毛朋友',
            customTag: '新增自訂 TAG',
            socialPlatform: '平台，例如 Telegram',
            socialUrl: 'URL',
        },
        steps: {
            nickname: {
                title: '如何稱呼您？',
                description: '決定其他獸看見你的名字',
                note: '最多 30 字；請勿使用攻擊性或可能傷害他人的名稱',
            },
            avatar: {
                title: '證件照拍攝處',
                description: '請上傳您的形象（支援 PNG / JPG / WEBP，最大 10 MB）；點擊頭像可上傳或更換',
            },
            tags: {
                title: '標籤領取處',
                description: '選幾個標籤，讓同好更快找到你',
            },
            socials: {
                title: '更多關於您的資訊',
                description: '請填寫您的社群連結',
            },
            stickers: {
                title: '貼圖打包處',
                description: '請上傳您想在此使用的貼圖（支援 JPG / PNG / GIF / WEBP，最大 10 MB，最多 5 張）',
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
            stickersSelected: '已選擇貼圖',
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
            eyebrow: '你的話題卡是',
            tail: '快進入 SEF-CLI 和工程獸友們聊聊吧！',
            manualRedirect: '如果沒有自動跳轉 請點擊我',
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
            laterEdit: '稍後編輯',
            laterFill: '稍後填寫',
            reset: '重置',
            createProfile: '建立資料',
        },
        options: {
            avatar: '設定你的頭像',
            avatarColor: '選一個頭像顏色',
            avatarBorder: '顯示頭像外框',
            avatarBorderEnable: '啟用',
            avatarBorderColor: '邊框顏色',
        },
        social: {
            invalidUrl: '請輸入合法的 http/https 連結',
            unsafe: '不可使用 localhost 或 IP 連結',
            mismatch: '與所選平台的連結格式不符',
            selectPlatform: '選擇平台…',
        },
    },
    error: {
        title: '哎呀',
        subtitleNotFound: '找不到頁面',
        subtitleServer: '伺服器錯誤',
        subtitleNetwork: '連線中斷',
        codeLabel: 'CODE',
        fromLabel: 'from',
        backHome: '回到聊天',
    },
}

export default zhTW
