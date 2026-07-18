let pollId = null;

$(function() {
    if (!isLoggedIn()) {
        if (confirm('请先登录才能参与投票')) {
            window.location.href = '/login.html';
        } else {
            window.location.href = '/';
        }
        return;
    }

    pollId = getQueryParam('id');
    if (!pollId) {
        window.location.href = '/';
        return;
    }

    loadPollDetail(pollId);
    checkVoted(pollId);
});

function loadPollDetail(id) {
    $.ajax({
        url: API_BASE + '/polls/' + id,
        method: 'GET',
        success: function(res) {
            if (res.code === 200) {
                renderPoll(res.data);
            } else {
                $('#pollTitle').text('投票不存在');
            }
        },
        error: function() {
            $('#pollTitle').text('加载失败');
        }
    });
}

function renderPoll(data) {
    $('#pollTitle').text(data.title);
    $('#pollDesc').text(data.description || '暂无说明');
    $('#pollType').text(data.type === 'single' ? '单选' : '多选');
    $('#pollStatus').text(getStatusText(data.status));
    $('#pollStatus').removeClass('bg-success bg-danger bg-secondary')
        .addClass(data.status === 'active' ? 'bg-success' : data.status === 'closed' ? 'bg-danger' : 'bg-secondary');
    $('#pollEndTime').text(data.end_time ? '截止：' + formatDate(data.end_time) : '无截止时间');

    // 渲染选项
    const container = $('#optionsContainer');
    container.empty();

    if (data.options && data.options.length > 0) {
        const type = data.type === 'single' ? 'radio' : 'checkbox';
        data.options.forEach(function(opt) {
            container.append(`
                <div class="form-check mb-2">
                    <input class="form-check-input" type="${type}" name="voteOption" value="${opt.id}" id="opt_${opt.id}">
                    <label class="form-check-label" for="opt_${opt.id}">${opt.option_text}</label>
                </div>
            `);
        });
    } else {
        container.html('<p class="text-muted">暂无选项</p>');
    }

    // 查看结果链接
    $('#resultLink').attr('href', 'result.html?id=' + data.id);
    $('#viewResultBtn').attr('href', 'result.html?id=' + data.id);

    // 如果投票已结束，禁用提交
    if (data.status === 'closed') {
        $('#submitBtn').prop('disabled', true).text('投票已结束');
    }
}

function checkVoted(id) {
    $.ajax({
        url: API_BASE + '/votes/' + id + '/check',
        method: 'GET',
        success: function(res) {
            if (res.code === 200 && res.data.hasVoted) {
                $('#votedInfo').show();
                $('#submitBtn').prop('disabled', true).text('已投票');
                $('#voteForm .form-check-input').prop('disabled', true);
            }
        }
    });
}

$('#voteForm').on('submit', function(e) {
    e.preventDefault();

    const selected = $('input[name="voteOption"]:checked').map(function() {
        return parseInt($(this).val());
    }).get();

    if (selected.length === 0) {
        $('#errorMsg').text('请至少选择一个选项').show();
        return;
    }

    $('#errorMsg').hide();
    $('#submitBtn').prop('disabled', true).text('提交中...');

    $.ajax({
        url: API_BASE + '/votes/' + pollId,
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ optionIds: selected }),
        success: function(res) {
            if (res.code === 201) {
                alert('投票成功！');
                window.location.href = 'result.html?id=' + pollId;
            } else {
                $('#errorMsg').text(res.msg).show();
                $('#submitBtn').prop('disabled', false).text('提交投票');
            }
        },
        error: function(xhr) {
            const msg = xhr.responseJSON?.msg || '投票失败，请重试';
            $('#errorMsg').text(msg).show();
            $('#submitBtn').prop('disabled', false).text('提交投票');
        }
    });
});