// routes/ai.js
// DeepSeek API + Mock 回退（智能识别场景，严格保留用户选项）

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const OpenAI = require('openai');

// ============================================================
// 初始化 DeepSeek 客户端
// ============================================================
const openai = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: process.env.DEEPSEEK_API_KEY || 'sk-dummy',
});

// ============================================================
// Mock 数据模板（按场景分类）
// ============================================================
const MOCK_TEMPLATES = {
    evaluation: [
        {
            title: '关于「{topic}」的能力评价投票',
            description: '请根据候选人在实际工作中的表现，从反馈传达的及时性、问题改正的彻底性、跨部门协作的效率等维度进行评价。您的投票将作为年度评优的重要参考。',
            options: ['候选人 A', '候选人 B', '候选人 C', '候选人 D']
        }
    ],
    satisfaction: [
        {
            title: '「{topic}」满意度调查',
            description: '为了持续改进工作质量和服务水平，诚邀您参与本次满意度测评。您的反馈对我们至关重要，将直接影响后续优化方向。',
            options: ['非常满意 🌟', '比较满意 👍', '一般 😐', '不满意 😞', '非常不满意 😤']
        }
    ],
    selection: [
        {
            title: '「{topic}」评选活动',
            description: '请为您心目中的最佳选项投上宝贵一票。每人限投一次，请根据实际表现慎重选择。',
            options: ['候选人 A', '候选人 B', '候选人 C', '候选人 D']
        }
    ],
    general: [
        {
            title: '关于「{topic}」的投票',
            description: '请根据您的实际情况和偏好，选择最符合您观点的选项。本次投票为匿名，结果将用于后续决策参考。',
            options: ['选项 A', '选项 B', '选项 C', '选项 D', '选项 E']
        },
        {
            title: '「{topic}」活动方案征集',
            description: '请选出您最期待的活动方案，得票最高的方案将优先落地实施。',
            options: ['唱歌 🎤', '舞蹈 💃', '小品 🎭', '魔术 🪄', '脱口秀 🎙️', '乐器演奏 🎸']
        }
    ]
};

// ============================================================
// 场景识别函数
// ============================================================
function detectScenario(topic, desc) {
    const combined = (topic + ' ' + desc).toLowerCase();
    
    const evalKeywords = ['反馈传达', '改正工作', '沟通协作', '执行力', '能力评价', '测评', '潜力', '成长'];
    const satKeywords = ['满意', '体验', '服务', '质量'];
    const selKeywords = ['评选', '优秀', '最佳', '候选', '提名'];

    let evalCount = 0, satCount = 0, selCount = 0;
    evalKeywords.forEach(function(kw) {
        if (combined.includes(kw)) evalCount++;
    });
    satKeywords.forEach(function(kw) {
        if (combined.includes(kw)) satCount++;
    });
    selKeywords.forEach(function(kw) {
        if (combined.includes(kw)) selCount++;
    });

    if (evalCount >= 2) return 'evaluation';
    if (selCount >= 1) return 'selection';
    if (satCount >= 2) return 'satisfaction';
    return 'general';
}

// ============================================================
// Mock 数据生成（保留用户选项）
// ============================================================
function getMockPoll(topic, desc, existingOptions) {
    const scenario = detectScenario(topic, desc);
    const templates = MOCK_TEMPLATES[scenario] || MOCK_TEMPLATES.general;
    const index = Math.floor(Math.random() * templates.length);
    const template = templates[index];
    
    // 如果用户提供了选项，使用用户的；否则用模板的
    const options = (existingOptions && existingOptions.length > 0) 
        ? existingOptions 
        : template.options.slice(0, 6);
    
    return {
        title: template.title.replace(/\{topic\}/g, topic),
        description: template.description,
        options: options
    };
}

// ============================================================
// 频率限制
// ============================================================
const userGenerateCount = {};

// ============================================================
// 路由：AI 生成投票
// ============================================================
router.post('/generate-poll', authMiddleware, async (req, res) => {
    const { topic, existingTitle, existingDesc, existingOptions } = req.body;
    const userId = req.user.id;

    const effectiveTopic = topic || existingTitle || '';
    if (!effectiveTopic.trim()) {
        return res.status(400).json({
            code: 400,
            msg: '请先输入投票主题或标题'
        });
    }

    const today = new Date().toDateString();
    const key = userId + '_' + today;
    if (userGenerateCount[key] && userGenerateCount[key] >= 10) {
        return res.status(429).json({
            code: 429,
            msg: '今日生成次数已达上限（10次），请明天再试'
        });
    }

    console.log('🔍 调用 DeepSeek API');
    console.log('   - 主题:', effectiveTopic);
    console.log('   - 已有标题:', existingTitle || '(无)');
    console.log('   - 已有描述:', existingDesc || '(无)');
    console.log('   - 已有选项数量:', existingOptions ? existingOptions.length : 0);

    // ============================================================
    // System Prompt
    // ============================================================
    const systemPrompt = `你是一个专业的投票系统助手。请根据用户提供的主题和已有内容，生成一个完整的投票问卷。

【重要规则】
1. 如果用户提供了已有选项（existingOptions），你必须**完全保留**这些选项，**不得修改、删除或替换**任何选项文字。
2. 你只能优化标题和说明文字，使其更清晰、更专业。
3. 如果用户没有提供选项，则根据主题自行生成 4-6 个选项。
4. 选项格式为字符串数组。

【场景识别】
- 如果主题包含"反馈传达"、"改正工作"、"沟通协作"、"执行力"、"能力评价"、"测评"、"潜力"、"成长"等关键词 → 能力评价型
- 如果包含"满意"、"体验"、"服务"、"质量" → 满意度调查型
- 如果包含"评选"、"优秀"、"最佳"、"候选"、"提名" → 评选型
- 其他 → 通用型

【输出格式】
严格按 JSON 格式返回，不要包含其他文字：
{
    "title": "优化后的投票标题",
    "description": "优化后的投票说明",
    "options": ["选项1", "选项2", "..."]
}`;

    let userContent = '主题：' + effectiveTopic;
    if (existingTitle && existingTitle.trim().length > 0) {
        userContent += '\n用户已写标题：' + existingTitle.trim();
    }
    if (existingDesc && existingDesc.trim().length > 0) {
        userContent += '\n用户已写说明：' + existingDesc.trim();
    }
    if (existingOptions && existingOptions.length > 0) {
        userContent += '\n用户已提供选项（必须原样保留）：' + existingOptions.join('、');
    }
    userContent += '\n请生成完整的投票问卷。';

    // ============================================================
    // 调用 DeepSeek API
    // ============================================================
    try {
        const completion = await openai.chat.completions.create({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userContent }
            ],
            model: 'deepseek-v4-flash',
            stream: false,
        });

        let content = completion.choices[0].message.content;
        content = content.replace(/```json/g, '').replace(/```/g, '').trim();

        let result;
        try {
            result = JSON.parse(content);
        } catch (parseError) {
            console.error('❌ JSON 解析失败:', content);
            throw new Error('AI 返回的数据格式异常');
        }

        if (!result.title || !result.description) {
            throw new Error('生成的数据不完整');
        }

        // 选项处理：如果用户提供了选项，强制使用用户选项
        var finalOptions = result.options || [];
        if (existingOptions && existingOptions.length > 0) {
            finalOptions = existingOptions;
        }
        if (finalOptions.length < 2) {
            finalOptions = ['选项 A', '选项 B', '选项 C', '选项 D'];
        }
        if (finalOptions.length > 10) {
            finalOptions = finalOptions.slice(0, 10);
        }

        userGenerateCount[key] = (userGenerateCount[key] || 0) + 1;

        console.log('✅ DeepSeek API 调用成功');
        return res.json({
            code: 200,
            msg: '生成成功',
            data: {
                title: result.title,
                description: result.description,
                options: finalOptions
            }
        });

    } catch (err) {
        console.warn('⚠️ API 调用失败，使用 Mock 回退:', err.message);

        const mockData = getMockPoll(effectiveTopic, existingDesc || '', existingOptions || []);
        userGenerateCount[key] = (userGenerateCount[key] || 0) + 1;

        var msg = '已使用示例数据填充（网络连接异常）';
        if (err.message && err.message.includes('API key')) {
            msg = '已使用示例数据填充（API Key 未配置或无效）';
        } else if (err.message && err.message.includes('timeout')) {
            msg = '已使用示例数据填充（API 响应超时）';
        }

        return res.json({
            code: 200,
            msg: msg,
            data: mockData,
            _mock: true
        });
    }
});

module.exports = router;