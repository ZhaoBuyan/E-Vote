let currentPage = 1;
const pageSize = 10;

function loadPolls(page) {
    currentPage = page || 1;
    $('#pollList').html('<div class="col-12 text-center text-muted py-5">加载中...</div>');

    $.ajax({
        url: API_BASE + '/polls',
        method: 'GET',
        data: {
            status: 'active',
            page: currentPage,
            pageSize: pageSize
        },
        success: function(res) {
            if (res.code === 200) {
                renderPolls(res.data.list);
                renderPagination(res.data);
            }
        },
        error: function() {
            $('#pollList').html('<div class="col-12 text-center text-danger py-5">加载失败，请刷新重试</div>');
        }
    });
}

function renderPolls(list) {
    if (!list || list.length === 0) {
        $('#pollList').html('<div class="col-12 text-center text-muted py-5">暂无进行中的投票</div>');
        return;
    }

    let html = '';
    list.forEach(function(poll) {
        const endTime = poll.end_time ? '截止：' + formatDate(poll.end_time) : '无截止时间';
        const isExpired = poll.end_time && new Date(poll.end_time) < new Date();

        html += `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card h-100 shadow-sm hover-shadow">
                    <div class="card-body">
                        <h5 class="card-title text-truncate">${poll.title}</h5>
                        <p class="card-text text-muted small">${poll.description || '暂无说明'}</p>
                        <div class="d-flex flex-wrap gap-2 mb-2">
                            ${getStatusBadge(poll.status)}
                            <span class="badge bg-secondary">${poll.type === 'single' ? '单选' : '多选'}</span>
                            <span class="badge bg-info">${poll.vote_count || 0} 人参与</span>
                        </div>
                        <p class="card-text small text-muted">${endTime}</p>
                    </div>
                    <div class="card-footer bg-transparent">
                        ${poll.status === 'active' && !isExpired 
                            ? `<a href="poll.html?id=${poll.id}" class="btn btn-primary btn-sm w-100">参与投票</a>`
                            : `<button class="btn btn-secondary btn-sm w-100" disabled>已结束</button>`
                        }
                        <a href="result.html?id=${poll.id}" class="btn btn-outline-secondary btn-sm w-100 mt-1">查看结果</a>
                    </div>
                </div>
            </div>
        `;
    });

    $('#pollList').html(html);
}

function renderPagination(data) {
    const totalPages = data.totalPages || 1;
    let html = '';
    html += `<li class="page-item ${data.page <= 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="loadPolls(${data.page - 1})">上一页</a>
            </li>`;
    for (let i = 1; i <= totalPages; i++) {
        html += `<li class="page-item ${i === data.page ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="loadPolls(${i})">${i}</a>
                </li>`;
    }
    html += `<li class="page-item ${data.page >= totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="loadPolls(${data.page + 1})">下一页</a>
            </li>`;
    $('#pagination').html(html);
}

$(function() {
    if (!isLoggedIn()) {
        // 未登录也可以查看投票列表
    }
    loadPolls(1);

    $('#refreshBtn').on('click', function() {
        loadPolls(currentPage);
    });
});