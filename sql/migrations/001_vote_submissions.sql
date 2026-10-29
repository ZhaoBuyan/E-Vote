-- 迁移：把旧的 votes 表拆成 vote_submissions + vote_choices
-- 适用场景：已经用旧版 sql/init.sql 初始化过、且不想重建数据库。
-- 执行方式：mysql -u root -p e_vote < sql/migrations/001_vote_submissions.sql
--
-- 说明：
-- 1. 旧表先重命名为 votes_legacy，不直接删除，确认迁移结果后再手动 DROP。
-- 2. 旧唯一键保证每个用户每张投票只有一行，因此可以直接按 (poll_id, user_id) 聚合。
-- 3. 该脚本只应执行一次；重复执行会因表已存在而失败。

CREATE TABLE vote_submissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    poll_id INT NOT NULL,
    user_id INT NOT NULL,
    ip_address VARCHAR(45),
    voted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uk_user_poll (user_id, poll_id),
    INDEX idx_poll (poll_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='投票提交表';

CREATE TABLE vote_choices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    submission_id INT NOT NULL,
    option_id INT NOT NULL,
    FOREIGN KEY (submission_id) REFERENCES vote_submissions(id) ON DELETE CASCADE,
    FOREIGN KEY (option_id) REFERENCES options(id) ON DELETE CASCADE,
    UNIQUE KEY uk_submission_option (submission_id, option_id),
    INDEX idx_option (option_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='投票选项明细表';

INSERT INTO vote_submissions (poll_id, user_id, ip_address, voted_at)
SELECT poll_id, user_id, MAX(ip_address), MIN(voted_at)
FROM votes
GROUP BY poll_id, user_id;

INSERT INTO vote_choices (submission_id, option_id)
SELECT vs.id, v.option_id
FROM votes v
JOIN vote_submissions vs
    ON vs.poll_id = v.poll_id AND vs.user_id = v.user_id;

RENAME TABLE votes TO votes_legacy;
