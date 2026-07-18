// public/js/create-poll.js
// E-Vote 在线投票系统 - 创建投票页脚本

// ============================================================
// 工具函数
// ============================================================

function escapeHtml(text) {
    if (!text) return '';
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================================
// 选项管理
// ============================================================

function addOption(text) {
    var container = $('#optionsContainer');
    var count = container.children('.option-item').length + 1;
    var val = text || '';
    container.append(`
        <div class="input-group mb-2 option-item">
            <input type="text" class="form-control" placeholder="选项 ${count}" value="${escapeHtml(val)}" required>
            <button class="btn btn-outline-danger" type="button" onclick="removeOption(this)">✕</button>
        </div>
    `);
}

function removeOption(btn) {
    var container = $('#optionsContainer');
    if (container.children('.option-item').length <= 2) {
        alert('至少保留 2 个选项');
        return;
    }
    $(btn).closest('.option-item').remove();
}

// ============================================================
// 表单提交
// ============================================================

$('#createPollForm').on('submit', function(e) {
    e.preventDefault();

    var title = $('#pollTitle').val().trim();
    var description = $('#pollDesc').val().trim();
    var type = $('#pollType').val();
    var endTime = $('#pollEndTime').val();
    var isAnonymous = $('#isAnonymous').is(':checked');

    if (!title) {
        $('#errorMsg').text('请填写投票标题').show();
        return;
    }

    var options = [];
    var valid = true;
    $('.option-item input[type="text"]').each(function() {
        var val = $(this).val().trim();
        if (!val) {
            valid = false;
            return false;
        }
        options.push(val);
    });

    if (!valid || options.length < 2) {
        $('#errorMsg').text('请填写所有选项，且至少 2 个').show();
        return;
    }

    $('#errorMsg').hide();

    $.ajax({
        url: API_BASE + '/polls',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            title: title,
            description: description,
            type: type,
            options: options,
            endTime: endTime || null,
            isAnonymous: isAnonymous
        }),
        success: function(res) {
            if (res.code === 201) {
                alert('🎉 投票创建成功！');
                window.location.href = '/';
            } else {
                $('#errorMsg').text(res.msg).show();
            }
        },
        error: function(xhr) {
            var msg = xhr.responseJSON?.msg || '创建失败，请重试';
            $('#errorMsg').text(msg).show();
        }
    });
});

// ============================================================
// AI 智能生成（按钮在标题框右侧）
// ============================================================

$('#aiGenerateBtn').on('click', function() {
    var title = $('#pollTitle').val().trim();
    var desc = $('#pollDesc').val().trim();
    var $btn = $(this);
    var $status = $('#aiStatus');

    var topic = title;
    if (!topic && desc) {
        topic = desc.substring(0, 20) + '...';
    }
    if (!topic) {
        $status.html('⚠️ 请先在标题框中输入主题').css('color', '#856404');
        return;
    }

    $btn.prop('disabled', true).text('⏳ 生成中...');
    $status.html('⏳ AI 正在思考中...').css('color', '#0d47a1');

    $.ajax({
        url: API_BASE + '/ai/generate-poll',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            topic: topic,
            existingTitle: title,
            existingDesc: desc
        }),
        success: function(res) {
            if (res.code === 200) {
                var data = res.data;

                if (data.title) {
                    $('#pollTitle').val(data.title);
                }
                if (data.description) {
                    $('#pollDesc').val(data.description);
                }
                if (data.options && data.options.length > 0) {
                    $('#optionsContainer').empty();
                    data.options.forEach(function(opt) {
                        addOption(opt);
                    });
                }

                if (data._mock) {
                    $status.html('⚠️ ' + (res.msg || '已使用示例数据填充')).css('color', '#856404');
                } else {
                    $status.html('✅ 生成成功！表单已更新').css('color', '#28a745');
                }
            } else {
                $status.html('❌ ' + (res.msg || '生成失败，请重试')).css('color', '#dc3545');
            }
        },
        error: function(xhr) {
            var msg = '网络错误，请重试';
            if (xhr.status === 429) {
                msg = xhr.responseJSON?.msg || '今日生成次数已达上限';
            } else if (xhr.status === 500) {
                msg = xhr.responseJSON?.msg || '服务器错误，请稍后重试';
            } else if (xhr.responseJSON?.msg) {
                msg = xhr.responseJSON.msg;
            }
            $status.html('❌ ' + msg).css('color', '#dc3545');
        },
        complete: function() {
            $btn.prop('disabled', false).text('✨ AI 生成');
        }
    });
});

// ============================================================
// 快速模板
// ============================================================

$('.template-btn').on('click', function() {
    var topic = $(this).data('topic');
    
    $('#pollTitle').val(topic);
    $('#pollDesc').val('');
    $('#optionsContainer').empty();
    addOption('');
    addOption('');
    
    $('#aiStatus').html('🔄 已切换模板，正在生成...').css('color', '#0d47a1');
    
    setTimeout(function() {
        $('#aiGenerateBtn').click();
    }, 200);
});

// ============================================================
// 回车键触发生成
// ============================================================

$('#pollTitle').on('keypress', function(e) {
    if (e.which === 13) {
        e.preventDefault();
        $('#aiGenerateBtn').click();
    }
});

// ============================================================
// 批量填充（核心修改）
// ============================================================

/**
 * 解析批量输入文本
 * 规则：
 * 1. 第一行 = 标题
 * 2. 第二行 = 说明（如果看起来像选项，则视为选项）
 * 3. 第三行起 = 选项（每行一个）
 * 4. 空行会被忽略
 * 5. 如果只有标题+选项（无说明），第二行开始全是选项
 */
function parseBatchInput(text) {
    // 按换行分割，保留空行，然后逐行处理
    var rawLines = text.split('\n');
    var lines = [];
    for (var i = 0; i < rawLines.length; i++) {
        var trimmed = rawLines[i].trim();
        // 保留非空行
        if (trimmed.length > 0) {
            lines.push(trimmed);
        }
    }

    if (lines.length === 0) return null;

    var title = lines[0] || '';
    var description = '';
    var options = [];

    // 从第二行开始判断
    if (lines.length > 1) {
        var secondLine = lines[1];
        // 判断第二行是否为选项（而不是简介）
        // 规则：长度短（<20字）、不含标点、看起来像选项名
        var looksLikeOption = secondLine.length <= 15 
            && !/[，。；：！？、""\u3002\uff1f\uff01\uff1b\uff1a\uff0c]/.test(secondLine)
            && !secondLine.includes('请');
        
        if (looksLikeOption) {
            // 第二行就是第一个选项，没有简介
            description = '';
            options = lines.slice(1);
        } else {
            // 第二行是简介
            description = secondLine;
            options = lines.slice(2);
        }
    }

    // 如果只有标题，没有其他内容
    if (options.length === 0 && !description) {
        options = lines.slice(1);
    }

    return { title: title, description: description, options: options };
}

/**
 * 检查内容是否完整清晰
 * 完整条件：标题 ≥ 2 字，选项 ≥ 2 个，每个选项 ≥ 1 字
 */
function isContentComplete(title, description, options) {
    if (!title || title.length < 2) return false;
    if (!options || options.length < 2) return false;
    
    for (var i = 0; i < options.length; i++) {
        if (options[i].length < 1) return false;
    }
    return true;
}

/**
 * 填充表单（直接填充，保留用户所有选项）
 */
function fillFormDirectly(title, description, options) {
    $('#pollTitle').val(title);
    $('#pollDesc').val(description || '');
    $('#optionsContainer').empty();
    if (options && options.length > 0) {
        options.forEach(function(opt) {
            addOption(opt);
        });
    } else {
        addOption('');
        addOption('');
    }
    $('#batchStatus').text('✅ 已直接填充到表单（' + options.length + ' 个选项）').css('color', '#28a745');
}

/**
 * 调用 AI 优化后填充（选项强制保留用户输入）
 */
function fillFormWithAI(title, description, options) {
    var $status = $('#batchStatus');
    $status.text('⏳ AI 正在优化...').css('color', '#0d47a1');

    var topic = title;
    if (description) topic += '，' + description;

    // 保存用户选项副本（防止异步丢失）
    var userOptions = options.slice(0);

    $.ajax({
        url: API_BASE + '/ai/generate-poll',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            topic: topic,
            existingTitle: title,
            existingDesc: description,
            existingOptions: userOptions
        }),
        success: function(res) {
            if (res.code === 200) {
                var data = res.data;
                
                // 填充标题和描述
                $('#pollTitle').val(data.title || title);
                $('#pollDesc').val(data.description || description || '');
                
                // ============================================================
                // 选项处理：强制使用用户输入的选项
                // ============================================================
                if (userOptions && userOptions.length > 0) {
                    $('#optionsContainer').empty();
                    userOptions.forEach(function(opt) {
                        addOption(opt);
                    });
                    console.log('✅ 批量填充：使用用户提供的选项（共 ' + userOptions.length + ' 个）');
                } else if (data.options && data.options.length > 0) {
                    $('#optionsContainer').empty();
                    data.options.forEach(function(opt) {
                        addOption(opt);
                    });
                    console.log('✅ 批量填充：使用 AI 生成的选项（共 ' + data.options.length + ' 个）');
                } else {
                    $('#optionsContainer').empty();
                    addOption('');
                    addOption('');
                }
                
                if (data._mock) {
                    $status.text('⚠️ AI 服务不可用，已直接填充（请手动调整）').css('color', '#856404');
                } else {
                    $status.text('✅ AI 优化完成！表单已更新（保留用户选项）').css('color', '#28a745');
                }
            } else {
                fillFormDirectly(title, description, userOptions);
                $status.text('⚠️ AI 优化失败，已直接填充').css('color', '#856404');
            }
        },
        error: function() {
            fillFormDirectly(title, description, userOptions);
            $status.text('⚠️ AI 优化失败，已直接填充').css('color', '#856404');
        }
    });
}

/**
 * 批量填充主函数
 */
function batchFill(useAI) {
    var input = $('#batchInput').val();
    var $status = $('#batchStatus');

    if (!input.trim()) {
        $status.text('⚠️ 请先在文本框中输入内容').css('color', '#dc3545');
        return;
    }

    var parsed = parseBatchInput(input);
    if (!parsed) {
        $status.text('⚠️ 解析失败，请检查格式').css('color', '#dc3545');
        return;
    }

    var title = parsed.title;
    var description = parsed.description;
    var options = parsed.options;

    console.log('📋 解析结果:', { title: title, description: description, options: options });

    if (!title) {
        $status.text('⚠️ 请至少填写标题（第一行）').css('color', '#dc3545');
        return;
    }
    if (options.length < 2) {
        $status.text('⚠️ 请至少填写 2 个选项（每行一个）').css('color', '#dc3545');
        return;
    }

    if (useAI) {
        // 强制 AI 优化
        fillFormWithAI(title, description, options);
    } else {
        // 直接填充：内容完整就直接填充，否则 AI 优化
        if (isContentComplete(title, description, options)) {
            fillFormDirectly(title, description, options);
            $status.text('✅ 内容完整，已直接填充（' + options.length + ' 个选项）').css('color', '#28a745');
        } else {
            $status.text('🔄 检测到内容可优化，正在调用 AI...').css('color', '#0d47a1');
            fillFormWithAI(title, description, options);
        }
    }
}

// ============================================================
// 批量填充按钮事件
// ============================================================

$('#batchFillBtn').on('click', function() {
    batchFill(false);
});

$('#batchOptimizeBtn').on('click', function() {
    batchFill(true);
});

$('#batchClearBtn').on('click', function() {
    $('#batchInput').val('');
    $('#batchStatus').text('已清空').css('color', '#6c757d');
});

// ============================================================
// 页面初始化
// ============================================================

$(function() {
    if (!isLoggedIn()) {
        window.location.href = '/login.html';
        return;
    }

    var defaultEnd = new Date();
    defaultEnd.setDate(defaultEnd.getDate() + 7);
    $('#pollEndTime').val(defaultEnd.toISOString().slice(0, 16));

    $('#aiStatus').html('💡 输入主题后点击 "✨ AI 生成"，或点击下方模板').css('color', '#6c757d');
    $('#batchStatus').html('💡 粘贴内容后点击按钮填充').css('color', '#6c757d');
});