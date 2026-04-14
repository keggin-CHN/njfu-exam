// ==UserScript==
// @name         南林马院平时作业自动答题助手
// @namespace    http://tampermonkey.net/
// @version      3.1
// @description  利用本地题库解析当前页面题目并自动填涂答案，悬浮窗界面，填完后由用户自行提交。
// @author       Keggin
// @match        http://202.119.208.106/*
// @match        http://202.119.208.57/*
// @match        http://223.2.96.5:8080/*
// @match        http://202.119.208.28/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        window.close
// ==/UserScript==

(function() {
    'use strict';

    if (!document.getElementById('myForm') || !document.querySelector('.questionWrapper')) {
        return;
    }

    let questionBank = {};

    function cleanText(text) {
        if (!text) return "";
        let t = text.replace(/^\d+[、.]\s*/, '').trim();
        t = t.replace(/（?\d+\.\d+分）?/g, '').trim();
        return t;
    }

    function createUI() {
        const panel = document.createElement('div');
        panel.style.cssText = `
            position: fixed;
            top: 80px;
            right: 30px;
            width: 340px;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(223, 230, 233, 0.8);
            border-radius: 16px;
            box-shadow: 0 12px 36px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.08);
            z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #2d3436;
            overflow: hidden;
            transition: all 0.3s ease;
        `;

        const header = document.createElement('div');
        header.style.cssText = `
            background: linear-gradient(135deg, #6c5ce7, #0984e3);
            padding: 16px;
            text-align: center;
        `;

        const title = document.createElement('h3');
        title.innerText = '✨ 智能答题助手';
        title.style.cssText = `
            margin: 0;
            font-size: 18px;
            font-weight: 600;
            color: #ffffff;
            letter-spacing: 0.5px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.2);
        `;
        header.appendChild(title);
        panel.appendChild(header);

        const body = document.createElement('div');
        body.style.cssText = 'padding: 20px;';
        panel.appendChild(body);

        const step1Title = document.createElement('div');
        step1Title.innerText = '第一步：导入数据';
        step1Title.style.cssText = 'font-size: 14px; font-weight: bold; color: #636e72; margin-bottom: 8px;';
        body.appendChild(step1Title);

        const fileInputWrapper = document.createElement('div');
        fileInputWrapper.style.marginBottom = '20px';

        const customFileBtn = document.createElement('label');
        customFileBtn.innerHTML = '📁 请选择你爬取的题库文件！';
        customFileBtn.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            padding: 12px 0;
            background: #f1f2f6;
            color: #2d3436;
            border: 2px dashed #b2bec3;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            box-sizing: border-box;
        `;
        customFileBtn.onmouseover = () => {
            customFileBtn.style.background = '#dfe6e9';
            customFileBtn.style.borderColor = '#0984e3';
            customFileBtn.style.color = '#0984e3';
        };
        customFileBtn.onmouseout = () => {
            customFileBtn.style.background = '#f1f2f6';
            customFileBtn.style.borderColor = '#b2bec3';
            customFileBtn.style.color = '#2d3436';
        };

        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        fileInput.style.display = 'none';

        customFileBtn.appendChild(fileInput);
        fileInputWrapper.appendChild(customFileBtn);
        body.appendChild(fileInputWrapper);

        const step2Title = document.createElement('div');
        step2Title.innerText = '运行日志：';
        step2Title.style.cssText = 'font-size: 14px; font-weight: bold; color: #636e72; margin-bottom: 8px;';
        body.appendChild(step2Title);

        const logArea = document.createElement('div');
        logArea.style.cssText = `
            height: 180px;
            background: #f8f9fa;
            border: 1px solid #dfe6e9;
            border-radius: 8px;
            padding: 10px;
            overflow-y: auto;
            font-size: 12px;
            margin-bottom: 20px;
            line-height: 1.6;
            color: #636e72;
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
            scrollbar-width: thin;
            scrollbar-color: #b2bec3 #f8f9fa;
        `;

        const style = document.createElement('style');
        style.innerHTML = `
            #smart-assistant-log::-webkit-scrollbar { width: 6px; }
            #smart-assistant-log::-webkit-scrollbar-track { background: #f8f9fa; border-radius: 8px; }
            #smart-assistant-log::-webkit-scrollbar-thumb { background: #b2bec3; border-radius: 8px; }
            #smart-assistant-log::-webkit-scrollbar-thumb:hover { background: #636e72; }
            @keyframes pulse-btn {
                0% { box-shadow: 0 0 0 0 rgba(0, 184, 148, 0.4); }
                70% { box-shadow: 0 0 0 10px rgba(0, 184, 148, 0); }
                100% { box-shadow: 0 0 0 0 rgba(0, 184, 148, 0); }
            }
        `;
        document.head.appendChild(style);
        logArea.id = 'smart-assistant-log';
        logArea.innerText = '⏳ 等待导入文件...';
        body.appendChild(logArea);

        function log(msg, color = '#2d3436', isBold = false) {
            const span = document.createElement('div');
            span.style.color = color;
            span.innerText = msg;
            span.style.borderBottom = '1px solid rgba(223, 230, 233, 0.4)';
            span.style.padding = '4px 0';
            if (isBold) span.style.fontWeight = 'bold';
            logArea.appendChild(span);
            logArea.scrollTop = logArea.scrollHeight;
        }

        const fillBtn = document.createElement('button');
        fillBtn.innerHTML = '🚀 开始自动填涂';
        fillBtn.style.cssText = `
            width: 100%;
            padding: 14px;
            background: #b2bec3;
            color: #ffffff;
            border: none;
            border-radius: 8px;
            font-size: 15px;
            font-weight: 600;
            letter-spacing: 1px;
            cursor: not-allowed;
            transition: all 0.3s ease;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        `;
        body.appendChild(fillBtn);

        const tipText = document.createElement('div');
        tipText.innerHTML = '⚠️ <span style="color:#d63031">填涂后请人工检查，并手动提交试卷</span>';
        tipText.style.cssText = 'margin-top: 12px; font-size: 11px; color: #636e72; text-align: center;';
        body.appendChild(tipText);

        const footer = document.createElement('div');
        footer.innerHTML = 'made by <b>keggin</b><br><a href="https://github.com/keggin-CHN/njfu-exam" target="_blank" style="color: #0984e3; text-decoration: none; display: inline-block; margin-top: 4px; transition: color 0.2s;">🔗 开源地址: github.com/keggin-CHN/njfu-exam</a>';
        footer.style.cssText = 'margin-top: 16px; font-size: 11px; color: #b2bec3; text-align: center; border-top: 1px solid rgba(223, 230, 233, 0.6); padding-top: 12px; line-height: 1.4;';
        body.appendChild(footer);

        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;
            customFileBtn.innerHTML = `📄 ${file.name}`;
            customFileBtn.style.borderColor = '#00b894';
            customFileBtn.style.color = '#00b894';
            customFileBtn.style.background = '#e8f8f5';

            logArea.innerHTML = '';
            log(`📂 正在读取: ${file.name}...`, '#0984e3');

            const reader = new FileReader();
            reader.onload = function(evt) {
                try {
                    const rawData = JSON.parse(evt.target.result);
                    questionBank = {};
                    if (rawData['单选题'] || rawData['多选题'] || rawData['判断题']) {
                        Object.assign(questionBank, rawData['单选题'] || {}, rawData['多选题'] || {}, rawData['判断题'] || {});
                    } else {
                        questionBank = rawData;
                    }

                    const count = Object.keys(questionBank).length;
                    log(`✅ 题库解析成功！共识别到 ${count} 题。`, '#00b894', true);

                    fillBtn.style.background = 'linear-gradient(135deg, #00b894, #00cec9)';
                    fillBtn.style.cursor = 'pointer';
                    fillBtn.style.animation = 'pulse-btn 2s infinite';
                    fillBtn.onmouseover = () => {
                        fillBtn.style.transform = 'translateY(-2px)';
                        fillBtn.style.boxShadow = '0 6px 12px rgba(0, 184, 148, 0.3)';
                    };
                    fillBtn.onmouseout = () => {
                        fillBtn.style.transform = 'translateY(0)';
                        fillBtn.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
                    };

                } catch (err) {
                    log(`❌ 解析失败，非合法JSON文件！`, '#d63031', true);
                    customFileBtn.innerHTML = '📁 请重新选择文件';
                    customFileBtn.style.borderColor = '#d63031';
                    customFileBtn.style.color = '#d63031';
                    customFileBtn.style.background = '#fad390';
                }
            };
            reader.readAsText(file);
        });

        fillBtn.addEventListener('click', function() {
            if (Object.keys(questionBank).length === 0) return;

            logArea.innerHTML = '';
            log('🔍 开始智能比对并填涂...', '#0984e3', true);
            let successCount = 0;
            let failCount = 0;

            const wrappers = document.querySelectorAll('.questionWrapper');
            if (wrappers.length === 0) {
                log('❌ 当前页面未识别到考题，请确认是否处于作答界面。', '#d63031');
                return;
            }

            wrappers.forEach((wrapper, index) => {
                const titles = wrapper.querySelectorAll('span.choiceTitle2');
                if (titles.length < 2) return;

                const typeText = titles[0].innerText || titles[0].textContent;
                const qTextRaw = titles[1].innerText || titles[1].textContent;
                const cleanQText = cleanText(qTextRaw);

                const record = questionBank[cleanQText];
                const ans = record ? record.answer : null;

                if (!ans || ["不显示", "未显示", "未填写", "隐藏"].includes(ans)) {
                    log(`⚠️ 第 ${index + 1} 题无答案: "${cleanQText.substring(0, 10)}..."`, '#e17055');
                    failCount++;
                    return;
                }

                log(`✅ 第 ${index + 1} 题已涂: ${ans}`, '#00b894');
                successCount++;

                let ansValues = [];
                if (ans === '正确') {
                    ansValues = ['true'];
                } else if (ans === '错误') {
                    ansValues = ['false'];
                } else {
                    ansValues = ans.replace(/[^A-Z]/gi, '').toUpperCase().split('');
                }

                const inputs = wrapper.querySelectorAll('input[type="radio"], input[type="checkbox"]');
                inputs.forEach(input => {
                    const name = input.name || "";
                    if (name.includes('markChoice') || name.includes('markJudge') || name.includes('markMultiChoice')) {
                        return;
                    }

                    if (ansValues.includes(input.value)) {
                        if (!input.checked) {
                            input.click();
                        }
                    } else {
                        if (input.type === 'checkbox' && input.checked) {
                            input.click();
                        }
                    }
                });
            });

            log('------------------------', '#b2bec3');
            log(`🎉 填涂完毕！\n✔️ 成功: ${successCount} 题\n❌ 缺失: ${failCount} 题`, '#6c5ce7', true);

            fillBtn.style.animation = 'none';
            fillBtn.innerHTML = '🔄 重新填涂';
        });

        document.body.appendChild(panel);
    }

    createUI();

})