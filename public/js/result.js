// public/js/result.js
// E-Vote 在线投票系统 - 投票结果页脚本
// 功能：展示投票结果图表，支持饼图/柱状图切换，WebSocket 实时推送

let pollId = null
let myChart = null
let currentChartType = 'pie'
let socket = null
let isConnected = false
let isLoading = false
let pollingTimer = null

// ============================================================
// 缓存最新数据（用于图表切换时重绘）
// ============================================================
let currentData = { totalVoters: 0, options: [] }

// ============================================================
// 页面初始化
// ============================================================
$(function () {
    pollId = getQueryParam('id')
    if (!pollId) {
        window.location.href = '/'
        return
    }

    // 初始化 ECharts
    myChart = echarts.init(document.getElementById('chartContainer'))
    window.addEventListener('resize', function () {
        if (myChart) myChart.resize()
    })

    // ✅ 连接 WebSocket
    connectSocket()

    // 加载数据（首次加载）
    loadResults()

    // 图表切换：饼图
    $('#chartPie').on('click', function () {
        $(this).addClass('active').removeClass('btn-outline-primary').addClass('btn-primary')
        $('#chartBar')
            .removeClass('active')
            .removeClass('btn-primary')
            .addClass('btn-outline-primary')
        currentChartType = 'pie'
        renderChart(currentData.options, currentData.totalVoters)
    })

    // 图表切换：柱状图
    $('#chartBar').on('click', function () {
        $(this).addClass('active').removeClass('btn-outline-primary').addClass('btn-primary')
        $('#chartPie')
            .removeClass('active')
            .removeClass('btn-primary')
            .addClass('btn-outline-primary')
        currentChartType = 'bar'
        renderChart(currentData.options, currentData.totalVoters)
    })

    // 页面离开时断开连接
    $(window).on('beforeunload', function () {
        if (socket) {
            socket.emit('leave-poll', pollId)
            socket.disconnect()
        }
        if (pollingTimer) clearInterval(pollingTimer)
    })
    // ============================================================
    // 导出 CSV
    // ============================================================
    $('#exportCsvBtn').on('click', function () {
        const token = localStorage.getItem('token')
        if (!token) {
            alert('请先登录')
            return
        }

        // 用 fetch 下载，携带 Authorization 头
        fetch(API_BASE + '/votes/' + pollId + '/export', {
            headers: {
                Authorization: 'Bearer ' + token
            }
        })
            .then((response) => {
                if (!response.ok) {
                    return response.json().then((err) => {
                        throw new Error(err.msg || '导出失败')
                    })
                }
                // 从 Content-Disposition 获取文件名
                const contentDisposition = response.headers.get('Content-Disposition')
                let filename = '投票结果.csv'
                if (contentDisposition) {
                    const match = contentDisposition.match(/filename=(.+)/)
                    if (match) filename = match[1]
                }
                return response.blob().then((blob) => {
                    const url = window.URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = filename
                    document.body.appendChild(a)
                    a.click()
                    a.remove()
                    window.URL.revokeObjectURL(url)
                })
            })
            .catch((err) => {
                alert(err.message)
            })
    })
})

// ============================================================
// ✅ WebSocket 连接
// ============================================================
function connectSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    socket = io(protocol + '//' + host, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
    })

    socket.on('connect', function () {
        console.log('✅ WebSocket 已连接')
        isConnected = true
        // 加入当前投票的房间
        socket.emit('join-poll', pollId)
        $('#liveTip').text('⚡ 实时推送已连接').css('color', '#28a745')
        // 清除轮询降级（如果有）
        if (pollingTimer) {
            clearInterval(pollingTimer)
            pollingTimer = null
        }
    })

    socket.on('disconnect', function () {
        console.log('❌ WebSocket 已断开')
        isConnected = false
        $('#liveTip').text('⚡ 连接已断开，尝试重新连接...').css('color', '#dc3545')
        // 启动轮询降级
        startPollingFallback()
    })

    socket.on('connect_error', function (err) {
        console.warn('⚠️ WebSocket 连接错误:', err.message)
        $('#liveTip').text('⏳ 连接中... 使用轮询模式').css('color', '#856404')
        // 启动轮询降级
        startPollingFallback()
    })

    // ✅ 监听投票更新事件
    socket.on('vote-update', function (data) {
        console.log('📡 收到投票更新:', data)
        currentData = {
            totalVoters: data.totalVoters,
            options: data.options
        }
        // 更新页面
        renderResults(currentData)
        $('#liveTip').text('⚡ 实时推送已连接').css('color', '#28a745')
    })
}

// ============================================================
// ✅ 轮询降级（WebSocket 不可用时备用）
// ============================================================
function startPollingFallback() {
    if (pollingTimer) return
    pollingTimer = setInterval(function () {
        if (!isConnected && !isLoading) {
            loadResults()
        }
    }, 3000) // 降级时 3 秒轮询
}

// ============================================================
// 数据加载函数
// ============================================================
function loadResults() {
    if (isLoading) {
        console.log('⏳ 上一次请求尚未返回，跳过本次请求')
        return
    }

    isLoading = true

    $.ajax({
        url: API_BASE + '/votes/' + pollId + '/results',
        method: 'GET',
        success: function (res) {
            if (res.code === 200) {
                currentData = {
                    totalVoters: res.data.totalVoters,
                    options: res.data.options
                }
                renderResults(currentData)
            }
            isLoading = false
        },
        error: function (xhr) {
            isLoading = false
            if (xhr.status === 404) {
                $('#resultTitle').text('投票不存在')
            }
            console.warn('⚠️ 获取结果失败:', xhr.status)
        }
    })
}

// ============================================================
// 渲染结果：标题 + 总人数 + 图表 + 进度条列表
// ============================================================
function renderResults(data) {
    $('#resultTitle').text(data.title || $('#resultTitle').text())
    $('#totalVoters').text(data.totalVoters)

    // 显示“最多可选 X 项”
    if (data.maxChoices && data.maxChoices > 0 && data.type === 'multi') {
        $('#resultMaxChoices').text('（最多可选 ' + data.maxChoices + ' 项）')
    } else {
        $('#resultMaxChoices').text('')
    }

    renderChart(data.options, data.totalVoters)
    renderList(data.options, data.totalVoters)
}

// ============================================================
// 渲染 ECharts 图表
// ============================================================
function renderChart(options, totalVoters) {
    if (!myChart) return

    if (!options || options.length === 0 || totalVoters === 0) {
        myChart.clear()
        myChart.setOption({
            title: { text: '暂无投票数据', left: 'center', top: 'center' }
        })
        return
    }

    let option = {}

    if (currentChartType === 'pie') {
        option = {
            tooltip: {
                trigger: 'item',
                formatter: function (params) {
                    return (
                        params.name +
                        '<br/>票数：' +
                        params.value +
                        ' 票<br/>占比：' +
                        params.percent +
                        '%'
                    )
                }
            },
            legend: {
                orient: 'vertical',
                left: 'left',
                top: 'center',
                textStyle: { fontSize: 12 }
            },
            series: [
                {
                    type: 'pie',
                    radius: ['40%', '70%'],
                    avoidLabelOverlap: true,
                    data: options.map(function (o) {
                        return {
                            name: o.text,
                            value: o.count
                        }
                    }),
                    label: {
                        formatter: '{b}\n{d}%',
                        fontSize: 11
                    },
                    emphasis: {
                        itemStyle: {
                            shadowBlur: 10,
                            shadowOffsetX: 0,
                            shadowColor: 'rgba(0,0,0,0.5)'
                        }
                    }
                }
            ]
        }
    } else {
        const labels = options.map(function (o) {
            return o.text
        })
        const values = options.map(function (o) {
            return o.count
        })

        option = {
            tooltip: {
                trigger: 'axis',
                formatter: function (params) {
                    const p = params[0]
                    const opt = options.find(function (o) {
                        return o.text === p.name
                    })
                    return (
                        p.name +
                        '<br/>票数：' +
                        p.value +
                        ' 票<br/>占比：' +
                        (opt ? opt.percentage : 0) +
                        '%'
                    )
                }
            },
            grid: {
                left: '10%',
                right: '10%',
                top: '10%',
                bottom: '15%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: labels,
                axisLabel: {
                    fontSize: 11,
                    interval: 0,
                    rotate: labels.length > 6 ? 30 : 0
                }
            },
            yAxis: {
                type: 'value',
                name: '票数',
                minInterval: 1
            },
            series: [
                {
                    type: 'bar',
                    data: values,
                    itemStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            { offset: 0, color: '#1976d2' },
                            { offset: 1, color: '#0d47a1' }
                        ]),
                        borderRadius: [4, 4, 0, 0]
                    },
                    label: {
                        show: true,
                        position: 'top',
                        formatter: function (params) {
                            const opt = options.find(function (o) {
                                return o.text === params.name
                            })
                            return opt ? opt.percentage + '%' : ''
                        },
                        fontSize: 11
                    },
                    barMaxWidth: 80
                }
            ]
        }
    }

    myChart.setOption(option, true)
}

// ============================================================
// 渲染进度条列表
// ============================================================
function renderList(options, totalVoters) {
    if (!options || options.length === 0) {
        $('#resultList').html('<p class="text-muted">暂无数据</p>')
        return
    }

    let html = ''
    options.forEach(function (opt) {
        const pct = opt.percentage || 0
        let barColor = 'bg-secondary'
        if (pct >= 50) barColor = 'bg-success'
        else if (pct >= 30) barColor = 'bg-primary'
        else if (pct >= 10) barColor = 'bg-warning'

        html += `
            <div class="result-item p-2 rounded mb-2">
                <div class="d-flex justify-content-between align-items-center">
                    <span>${escapeHtml(opt.text)}</span>
                    <span class="fw-bold">${opt.count} 票 (${pct}%)</span>
                </div>
                <div class="progress">
                    <div class="progress-bar ${barColor}" style="width: ${Math.max(pct, 2)}%; transition: width 0.3s ease;">
                        ${pct > 5 ? pct + '%' : ''}
                    </div>
                </div>
            </div>
        `
    })

    $('#resultList').html(html)
}

// ============================================================
// 防 XSS 工具函数
// ============================================================
function escapeHtml(text) {
    if (!text) return ''
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
}

// ============================================================
// 手动刷新（供外部调用）
// ============================================================
function refreshResults() {
    if (!isLoading) {
        loadResults()
    }
}
