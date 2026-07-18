let currentPage = 1;
const pageSize = 10;

$(function() {
    if (!isLoggedIn()) {
        window.location.href = '/login.html';
        return;
    }
    loadMyPolls(1);
});

function loadMyPolls(page) {
    currentPage = page || 1;
    $('#pollList').html('<tr><td colspan="6" class="text-center text-muted">加载中...</td></tr>');

    $.ajax({
        url: API_BASE + '/polls/my/list',
        method: 'GET',
        data: { page: currentPage, pageSize: pageSize },
        success: function(res) {
            if (res.code === 200) {
                renderList(res.data.list);
                renderPagination(res.data);
            }
        },
        error: function() {
            $('#pollList').html('<tr><td colspan="6" class="text-center text-danger">加载失败</td></tr>');
        }
    });
}

function renderList(list) {
    if (!list || list.length === 0) {
        $('#pollList').html('<tr><td colspan="6" class="text-center text-muted">暂无创建的投票</td></tr>');
        return;
    }

    let html = '';
    list.forEach(function(poll) {
        html += `
            <tr>
                <td><a href="poll.html?id=${poll.id}" class="text-decoration-none">${poll.title}</a></td>
                <td>${poll.type === 'single' ? '单选' : '多选'}</td>
                <td>${getStatusBadge(poll.status)}</td>
                <td>${poll.vote_count || 0}</td>
                <td>${formatDate(poll.created_at)}</td>
                <td>
                    <a href="result.html?id=${poll.id}" class="btn btn-sm btn-outline-primary me-1">结果</a>
                    <a href="poll.html?id=${poll.id}" class="btn btn-sm btn-outline-secondary me-1">详情</a>
                    <button class="btn btn-sm btn-outline-danger" onclick="deletePoll(${poll.id})">删除</button>
                </td>
            </tr>
        `;
    });

    $('#pollList').html(html);
}

function renderPagination(data) {
    const totalPages = data.totalPages || 1;
    let html = '';
    html += `<li class="page-item ${data.page <= 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="loadMyPolls(${data.page - 1})">上一页</a>
            </li>`;
    for (let i = 1; i <= totalPages; i++) {
        html += `<li class="page-item ${i === data.page ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="loadMyPolls(${i})">${i}</a>
                </li>`;
    }
    html += `<li class="page-item ${data.page >= totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="loadMyPolls(${data.page + 1})">下一页</a>
            </li>`;
    $('#pagination').html(html);
}

function deletePoll(id) {
    if (!confirm('确定要删除该投票吗？删除后不可恢复！')) return;

    $.ajax({
        url: API_BASE + '/polls/' + id,
        method: 'DELETE',
        success: function(res) {
            if (res.code === 200) {
                alert('删除成功');
                loadMyPolls(currentPage);
            } else {
                alert(res.msg);
            }
        },
        error: function() {
            alert('删除失败，请重试');
        }
    });
}