-- 密码哈希生成命令：node -e "console.log(require('bcryptjs').hashSync('你的密码', 10))"
-- 创建数据库
CREATE DATABASE IF NOT EXISTS e_vote
    DEFAULT CHARACTER SET utf8mb4
    DEFAULT COLLATE utf8mb4_unicode_ci;

USE e_vote;

-- 用户表
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '用户ID',
    username VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
    password VARCHAR(255) NOT NULL COMMENT '密码（bcrypt加密）',
    real_name VARCHAR(50) NOT NULL COMMENT '真实姓名',
    role ENUM('admin', 'user') DEFAULT 'user' COMMENT '角色',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '注册时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- 投票主表
CREATE TABLE polls (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '投票ID',
    title VARCHAR(200) NOT NULL COMMENT '投票标题',
    description TEXT COMMENT '投票说明',
    type ENUM('single', 'multi') DEFAULT 'single' COMMENT '单选/多选',
    is_anonymous BOOLEAN DEFAULT FALSE COMMENT '是否匿名投票',
    status ENUM('draft', 'active', 'closed') DEFAULT 'draft' COMMENT '状态',
    end_time DATETIME COMMENT '截止时间',
    created_by INT COMMENT '创建者ID',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_end_time (end_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='投票表';

-- 选项表
CREATE TABLE options (
    id INT AUTO_INCREMENT PRIMARY KEY,
    poll_id INT NOT NULL,
    option_text VARCHAR(200) NOT NULL,
    sort_order INT DEFAULT 0,
    FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE,
    INDEX idx_poll (poll_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='选项表';

-- 投票记录表
CREATE TABLE votes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    poll_id INT NOT NULL,
    option_id INT NOT NULL,
    user_id INT NOT NULL,
    ip_address VARCHAR(45),
    voted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE,
    FOREIGN KEY (option_id) REFERENCES options(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uk_user_poll (user_id, poll_id),
    INDEX idx_poll_option (poll_id, option_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='投票记录表';

-- 插入默认管理员（密码: admin123，需用bcrypt生成实际哈希）
-- 使用命令生成: node -e "console.log(require('bcryptjs').hashSync('admin123', 10))"
INSERT INTO users (username, password, real_name, role) VALUES
('admin', '$2a$10$REPLACE_WITH_YOUR_BCRYPT_HASH', '系统管理员', 'admin');

-- 插入测试投票数据
INSERT INTO polls (title, description, type, status, end_time, created_by) VALUES
('2024年最受欢迎的编程语言', '请选择您最常用的编程语言', 'single', 'active', DATE_ADD(NOW(), INTERVAL 7 DAY), 1),
('团队建设活动意向调查', '请选择您希望参加的活动类型（可多选）', 'multi', 'active', DATE_ADD(NOW(), INTERVAL 14 DAY), 1);

INSERT INTO options (poll_id, option_text, sort_order) VALUES
(1, 'JavaScript', 1),
(1, 'Python', 2),
(1, 'Java', 3),
(1, 'Go', 4),
(1, 'Rust', 5),
(2, '户外拓展', 1),
(2, '桌游聚会', 2),
(2, '观影活动', 3),
(2, '技术分享会', 4);