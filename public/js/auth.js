$(function() {
    // ===== 登录 =====
    $('#loginForm').on('submit', function(e) {
        e.preventDefault();
        const username = $('#username').val().trim();
        const password = $('#password').val().trim();
        const $error = $('#errorMsg');

        if (!username || !password) {
            $error.text('请填写用户名和密码').show();
            return;
        }

        $error.hide();
        $.ajax({
            url: API_BASE + '/auth/login',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ username, password }),
            success: function(res) {
                if (res.code === 200) {
                    localStorage.setItem('token', res.data.token);
                    localStorage.setItem('user', JSON.stringify(res.data.user));
                    window.location.href = '/';
                } else {
                    $error.text(res.msg).show();
                }
            },
            error: function(xhr) {
                const msg = xhr.responseJSON?.msg || '网络错误，请重试';
                $error.text(msg).show();
            }
        });
    });

    // ===== 注册 =====
    $('#registerForm').on('submit', function(e) {
        e.preventDefault();
        const username = $('#username').val().trim();
        const realName = $('#realName').val().trim();
        const password = $('#password').val();
        const confirmPassword = $('#confirmPassword').val();
        const $error = $('#errorMsg');

        if (password !== confirmPassword) {
            $error.text('两次输入的密码不一致').show();
            return;
        }

        if (password.length < 6) {
            $error.text('密码长度不能少于6个字符').show();
            return;
        }

        $error.hide();
        $.ajax({
            url: API_BASE + '/auth/register',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ username, password, realName }),
            success: function(res) {
                if (res.code === 201) {
                    alert('注册成功，请登录');
                    window.location.href = '/login.html';
                } else {
                    $error.text(res.msg).show();
                }
            },
            error: function(xhr) {
                const msg = xhr.responseJSON?.msg || '网络错误，请重试';
                $error.text(msg).show();
            }
        });
    });
});