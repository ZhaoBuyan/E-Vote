// ============ 全局配置 ============
const API_BASE = '/api';

// ============ AJAX 全局拦截器 ============
$.ajaxSetup({
    beforeSend: function(xhr) {
        const token = localStorage.getItem('token');
        if (token) {
            xhr.setRequestHeader('Authorization', 'Bearer ' + token);
        }
    },
    error: function(xhr) {
        if (xhr.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            if (!window.location.pathname.includes('login') && 
                !window.location.pathname.includes('register')) {
                window.location.href = '/login.html';
            }
        }
    }
});

// ============ 工具函数 ============
function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.getFullYear() + '-' + 
           String(d.getMonth() + 1).padStart(2, '0') + '-' + 
           String(d.getDate()).padStart(2, '0') + ' ' +
           String(d.getHours()).padStart(2, '0') + ':' +
           String(d.getMinutes()).padStart(2, '0');
}

function getStatusBadge(status) {
    const map = {
        'draft': '<span class="badge bg-secondary">草稿</span>',
        'active': '<span class="badge bg-success">进行中</span>',
        'closed': '<span class="badge bg-danger">已结束</span>'
    };
    return map[status] || status;
}

function getStatusText(status) {
    const map = { 'draft': '草稿', 'active': '进行中', 'closed': '已结束' };
    return map[status] || status;
}

// ============ 用户状态管理 ============
function getToken() {
    return localStorage.getItem('token');
}

function getUser() {
    try {
        return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
        return null;
    }
}

function isLoggedIn() {
    return !!getToken();
}

function updateNav() {
    const user = getUser();
    if (user) {
        $('#loginNav').hide();
        $('#logoutNav').show();
        $('#userInfo').show().html('<span class="text-light">' + (user.realName || user.username) + '</span>');
        $('#myPollsNav').show();
        $('#createNav').show();
        $('#myPollsBtn').show();
    } else {
        $('#loginNav').show();
        $('#logoutNav').hide();
        $('#userInfo').hide();
        $('#myPollsNav').hide();
        $('#createNav').hide();
        $('#myPollsBtn').hide();
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
}

// ============ 页面初始化 ============
$(function() {
    updateNav();
    
    $('#logoutBtn').on('click', function(e) {
        e.preventDefault();
        logout();
    });
});