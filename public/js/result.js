// public/js/result.js
// E-Vote 在线投票系统 - 投票结果页脚本
// 功能：展示投票结果图表，支持饼图/柱状图切换，1秒自动刷新

let pollId = null;
let myChart = null;
let currentChartType = 'pie';
let timer = null;
let isLoading = false; // 防止请求重叠

// ============================================================
// 页面初始化
// ============================================================
$(function() {
    pollId = getQueryParam('id');
    if (!pollId) {
        window.location.href = '/';
        return;
    }

    // 初始化 ECharts
    myChart = echarts.init(document.getElementById('chartContainer'));
    window.addEventListener('resize', function() { 
        if (myChart) myChart.resize(); 
    });

    // 加载数据
    loadResults();

    // 图表切换：饼图
    $('#chartPie').on('click', function() {
        $(this).addClass('active').removeClass('btn-outline-primary').addClass('btn-primary');
        $('#chartBar').removeClass('active').removeClass('btn-primary').addClass('btn-outline-primary');
        currentChartType = 'pie';
        loadResults();
    });

    // 图表切换：柱状图
    $('#chartBar').on('click', function() {
        $(this).addClass('active').removeClass('btn-outline-primary').addClass('btn-primary');
        $('#chartPie').removeClass('active').removeClass('btn-primary').addClass('btn-outline-primary');
        currentChartType = 'bar';
        loadResults();
    });

    // 启动自动刷新（1秒轮询）
    startAutoRefresh();

    // 页面离开时清除定时器
    $(window).on('beforeunload', function() {
        if (timer) clearInterval(timer);
    });
});

// ============================================================
// 数据加载函数（带防重叠锁）
// ============================================================
function loadResults() {
    // 如果上一次请求还没回来，直接跳过本次请求
    if (isLoading) {
        console.log('⏳ 上一次请求尚未返回，跳过本次轮询');
        return;
    }

    isLoading = true;

    $.ajax({
        url: API_BASE + '/votes/' + pollId + '/results',
        method: 'GET',
        success: function(res) {
            if (res.code === 200) {
                renderResults(res.data);
            }
            isLoading = false;
        },
        error: function(xhr) {
            isLoading = false;
            // 只在首次加载或网络断开时显示错误，避免频繁弹窗
            if (xhr.status === 404) {
                $('#resultTitle').text('投票不存在');
            }
            console.warn('⚠️ 获取结果失败:', xhr.status);
        }
    });
}

// ============================================================
// 渲染结果：标题 + 总人数 + 图表 + 进度条列表
// ============================================================
function renderResults(data) {
    $('#resultTitle').text(data.title);
    $('#totalVoters').text(data.totalVoters);

    renderChart(data.options, data.totalVoters);
    renderList(data.options, data.totalVoters);
}

// ============================================================
// 渲染 ECharts 图表
// ============================================================
function renderChart(options, totalVoters) {
    if (!myChart) return;

    // 如果没有任何数据，显示空状态
    if (!options || options.length === 0 || totalVoters === 0) {
        myChart.clear();
        myChart.setOption({
            title: { text: '暂无投票数据', left: 'center', top: 'center' }
        });
        return;
    }

    let option = {};

    if (currentChartType === 'pie') {
        option = {
            tooltip: {
                trigger: 'item',
                formatter: function(params) {
                    return params.name + '<br/>票数：' + params.value + ' 票<br/>占比：' + params.percent + '%';
                }
            },
            legend: {
                orient: 'vertical',
                left: 'left',
                top: 'center',
                textStyle: { fontSize: 12 }
            },
            series: [{
                type: 'pie',
                radius: ['40%', '70%'],
                avoidLabelOverlap: true,
                data: options.map(function(o) {
                    return {
                        name: o.text,
                        value: o.count
                    };
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
            }]
        };
    } else {
        // 柱状图
        const labels = options.map(function(o) { return o.text; });
        const values = options.map(function(o) { return o.count; });

        option = {
            tooltip: {
                trigger: 'axis',
                formatter: function(params) {
                    const p = params[0];
                    const opt = options.find(function(o) { return o.text === p.name; });
                    return p.name + '<br/>票数：' + p.value + ' 票<br/>占比：' + (opt ? opt.percentage : 0) + '%';
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
            series: [{
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
                    formatter: function(params) {
                        const opt = options.find(function(o) { return o.text === params.name; });
                        return opt ? opt.percentage + '%' : '';
                    },
                    fontSize: 11
                },
                barMaxWidth: 80
            }]
        };
    }

    myChart.setOption(option, true);
}

// ============================================================
// 渲染进度条列表
// ============================================================
function renderList(options, totalVoters) {
    if (!options || options.length === 0) {
        $('#resultList').html('<p class="text-muted">暂无数据</p>');
        return;
    }

    let html = '';
    options.forEach(function(opt) {
        const pct = opt.percentage || 0;
        let barColor = 'bg-secondary';
        if (pct >= 50) barColor = 'bg-success';
        else if (pct >= 30) barColor = 'bg-primary';
        else if (pct >= 10) barColor = 'bg-warning';

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
        `;
    });

    $('#resultList').html(html);
}

// ============================================================
// 防 XSS 工具函数
// ============================================================
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================================
// 1秒自动刷新（带页面可见性管理）
// ============================================================
function startAutoRefresh() {
    if (timer) clearInterval(timer);

    timer = setInterval(function() {
        // 只在页面可见且未锁定时刷新
        if (!document.hidden && !isLoading) {
            loadResults();
        }
    }, 1000);

    // 监听页面可见性变化
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            // 页面隐藏（切换标签页），清除定时器，减少资源浪费
            if (timer) {
                clearInterval(timer);
                timer = null;
                console.log('⏸️ 页面隐藏，已暂停自动刷新');
            }
        } else {
            // 页面重新可见，立即刷新一次并重启定时器
            console.log('▶️ 页面可见，恢复自动刷新');
            if (!isLoading) {
                loadResults();
            }
            if (!timer) {
                timer = setInterval(function() {
                    if (!document.hidden && !isLoading) {
                        loadResults();
                    }
                }, 1000);
            }
        }
    });
}

// ============================================================
// 手动刷新（供外部调用）
// ============================================================
function refreshResults() {
    if (!isLoading) {
        loadResults();
    }
}