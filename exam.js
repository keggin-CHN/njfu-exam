// ==UserScript==
// @name         南林马院平时作业自动答题助手
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  利用Report页面获取答案，支持题库累积、导入、多格式导出、清空
// @author       Keggin
// @match        http://202.119.208.106/talk/ExamCase*General.jspx*
// @match        http://202.119.208.106/talk/ExamCaseReport*General.jspx*
// @match        http://202.119.208.106/talk/Default.jspx
// @match        http://202.119.208.57/talk/ExamCase*General.jspx*
// @match        http://202.119.208.57/talk/ExamCaseReport*General.jspx*
// @match        http://202.119.208.57/talk/Default.jspx
// @match        http://223.2.96.5:8080/talk/ExamCase*General.jspx*
// @match        http://223.2.96.5:8080/talk/ExamCaseReport*General.jspx*
// @match        http://223.2.96.5:8080/talk/Default.jspx
// @match        http://202.119.208.28/talk/ExamCase*General.jspx*
// @match        http://202.119.208.28/talk/ExamCaseReport*General.jspx*
// @match        http://202.119.208.28/talk/Default.jspx
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        window.close
// ==/UserScript==

(function() {
    'use strict';

    const href = window.location.href;
    const isReportPage = href.includes('ExamCaseReportGeneral');
    const isExamPage = href.includes('ExamCaseGeneral') && !isReportPage;
    const isDefaultPage = href.includes('Default.jspx');

    const ANSWER_KEY = 'examAnswers';
    const GLOBAL_Q_BANK = 'globalQuestionBank';

    function getBank() {
        const bankRaw = GM_getValue(GLOBAL_Q_BANK, '{}');
        let bank = {};
        try {
            bank = JSON.parse(bankRaw);
        } catch (e) {
            console.error('解析题库失败', e);
        }
        return bank;
    }

    function getCourseName() {
        let courseName = "未知课程";
        const titleText = document.title;
        const headerElement = document.querySelector('h1, h2, .ui-panel-title, td');
        let searchText = titleText + (headerElement ? headerElement.textContent : '');

        const tdElements = document.querySelectorAll('td');
        for (let td of tdElements) {
            if (td.textContent.includes('考试名称：')) {
                searchText += td.textContent;
                break;
            }
        }

        const keywords = {
            "毛概": "毛概",
            "纲要": "纲要",
            "原理": "马原",
            "形策": "形策",
            "习概": "习概",
            "习思想": "习概",
            "思法": "思法",
            "心健": "心健",
            "近代史": "纲要"
        };

        for (const key in keywords) {
            if (searchText.includes(key)) {
                courseName = keywords[key];
                break;
            }
        }

        if (courseName === "未知课程") {
            const host = window.location.hostname;
            const port = window.location.port;
            const ipMap = {
                "202.119.208.57": "毛概/纲要",
                "223.2.96.5": "原理/形策",
                "202.119.208.106": "习概",
                "202.119.208.28": "思法/心健"
            };
            if (host === "223.2.96.5" && port === "8080") {
                courseName = ipMap[host];
             } else if (ipMap[host]) {
                courseName = ipMap[host];
            }
        }
        return courseName;
    }

    function categorizeBank(bank) {
        const categories = {
            single: {},
            multi: {},
            judge: {}
        };
        for (const question in bank) {
            const data = bank[question];
            let answerStr;
            if (typeof data === 'object' && data !== null && data.answer) {
                answerStr = data.answer;
            } else {
                answerStr = data;
            }

            if (answerStr === '正确' || answerStr === '错误') {
                categories.judge[question] = data;
            } else if (answerStr && answerStr.length > 1) {
                categories.multi[question] = data;
            } else {
                categories.single[question] = data;
            }
        }
        return categories;
    }

    function downloadFile(filename, content, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function addBankManagerPanel(topPosition = '100px') {
        const panel = document.createElement('div');
        panel.style.cssText = `position: fixed; top: ${topPosition}; right: 20px; z-index: 9998; background: white; border: 1px solid #ccc; border-radius: 8px; padding: 15px; box-shadow: 0 4px 10px rgba(0,0,0,0.2); display: flex; flex-direction: column; gap: 10px;`;

        const createButton = (text, color, hoverColor) => {
            const button = document.createElement('button');
            button.textContent = text;
            button.style.cssText = `padding: 12px 20px; background: ${color}; color: white; border: none; border-radius: 5px; font-size: 14px; font-weight: bold; cursor: pointer; transition: background 0.2s;`;
            button.onmouseover = () => button.style.background = hoverColor;
            button.onmouseout = () => button.style.background = color;
            return button;
        };

        const viewButton = createButton('👁️ 查看题库状态', '#0984e3', '#74b9ff');
        viewButton.onclick = function() {
            const count = Object.keys(getBank()).length;
            alert(`南林马院作业助手 题库状态：\n\n- 累积题目总数: ${count} 道`);
        };

        const importButton = createButton('📤 导入题库 (JSON)', '#f0932b', '#fab1a0');
        importButton.onclick = () => {
            const importPanel = document.getElementById('gm-importer-panel');
            if (importPanel) {
                importPanel.style.display = 'block';
            }
        };

        const exportJSONButton = createButton('💾 导出为 JSON', '#6c5ce7', '#a29bfe');
        exportJSONButton.onclick = function() {
            const bank = getBank();
            const categorizedBank = categorizeBank(bank);
            const count = Object.keys(bank).length;
            if (count === 0) return alert('题库为空！');
            downloadFile('南林马院题库_分类.json', JSON.stringify(categorizedBank, null, 2), 'application/json');
            alert(`分类JSON题库已导出！\n共 ${count} 道题。`);
        };

        const exportTXTButton = createButton('💾 导出为 TXT', '#00cec9', '#81ecec');
        exportTXTButton.onclick = function() {
            const bank = getBank();
            const categories = categorizeBank(bank);
            let content = '';
            let count = 0;
            const formatCategory = (title, data) => {
                let text = `【${title}】\n\n`;
                let i = 1;
                for (const q in data) {
                    const item = data[q];
                    let answerStr, optionsList;
                    if (typeof item === 'object' && item !== null && item.answer) {
                        answerStr = item.answer;
                        optionsList = item.options;
                    } else {
                        answerStr = item;
                        optionsList = null;
                    }

                    const clean_q = q.replace(/^\d+[、.]\s*/, '');
                    text += `${i}. ${clean_q}\n`;

                    if (optionsList && optionsList.length > 0) {
                        text += optionsList.join('\n') + '\n';
                    }
                    text += `   答案: ${answerStr}\n\n`;
                    i++;
                    count++;
                }
                return text;
            };
            content += formatCategory('单选题', categories.single);
            content += formatCategory('多选题', categories.multi);
            content += formatCategory('判断题', categories.judge);
            if (count === 0) return alert('题库为空！');
            downloadFile('南林马院题库.txt', content, 'text/plain;charset=utf-8');
            alert(`TXT题库已导出！\n共 ${count} 道题。`);
        };

        const exportWordButton = createButton('💾 导出为 Word', '#2d3436', '#636e72');
        exportWordButton.onclick = function() {
            const bank = getBank();
            const categories = categorizeBank(bank);
            let content = '<html><head><meta charset="UTF-8"></head><body>';
            let count = 0;
            const formatCategory = (title, data) => {
                let html = `<h1>${title}</h1>`;
                let i = 1;
                for (const q in data) {
                    const item = data[q];
                    let answerStr, optionsList;
                    if (typeof item === 'object' && item !== null && item.answer) {
                        answerStr = item.answer;
                        optionsList = item.options;
                    } else {
                        answerStr = item;
                        optionsList = null;
                    }

                    const clean_q = q.replace(/^\d+[、.]\s*/, '');
                    html += `<p>${i}. ${clean_q}</p>`;

                    if (optionsList && optionsList.length > 0) {
                        optionsList.forEach(opt => {
                            html += `<p style="margin-left: 20px;">${opt}</p>`;
                        });
                    }
                    html += `<p><b>答案: ${answerStr}</b></p><hr>`;
                    i++;
                    count++;
                }
                return html;
            };
            content += formatCategory('单选题', categories.single);
            content += formatCategory('多选题', categories.multi);
            content += formatCategory('判断题', categories.judge);
            content += '</body></html>';
            if (count === 0) return alert('题库为空！');
            downloadFile('南林马院题库.doc', content, 'application/msword;charset=utf-8');
            alert(`Word题库已导出！\n共 ${count} 道题。`);
        };

        const deleteButton = createButton('🗑️ 清空题库', '#e74c3c', '#ff7675');
        deleteButton.onclick = function() {
            if (window.confirm('你确定要清空所有累积的题库吗？\n这个操作无法撤销！')) {
                GM_deleteValue(GLOBAL_Q_BANK);
                alert('题库已清空。');
            }
        };

        panel.appendChild(viewButton);
        panel.appendChild(importButton);
        panel.appendChild(exportJSONButton);
        panel.appendChild(exportTXTButton);
        panel.appendChild(exportWordButton);
        panel.appendChild(deleteButton);
        document.body.appendChild(panel);

        const importPanel = document.createElement('div');
        importPanel.id = 'gm-importer-panel';
        importPanel.style.cssText = `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 400px; background: white; border: 1px solid #ccc; border-radius: 8px; padding: 20px; box-shadow: 0 5px 15px rgba(0,0,0,0.3); z-index: 10000; display: none;`;

        const importTitle = document.createElement('h3');
        importTitle.textContent = '导入题库';
        importTitle.style.cssText = 'margin-top: 0;';

        const importText = document.createElement('p');
        importText.textContent = '粘贴JSON (平铺或分类均可):';

        const importTextarea = document.createElement('textarea');
        importTextarea.id = 'gm-import-textarea';
        importTextarea.style.cssText = 'width: 98%; height: 150px; margin-top: 10px; border: 1px solid #ccc; border-radius: 4px;';

        const importActions = document.createElement('div');
        importActions.style.cssText = 'margin-top: 15px; display: flex; justify-content: flex-end; gap: 10px;';

        const confirmImportButton = createButton('确认合并', '#2ecc71', '#27ae60');
        confirmImportButton.onclick = function() {
            let importedData;
            try {
                importedData = JSON.parse(importTextarea.value);
            } catch (e) {
                alert('导入失败！JSON 格式错误，请检查。');
                return;
            }

            if (typeof importedData !== 'object' || Array.isArray(importedData) || importedData === null) {
                alert('导入失败！JSON 必须是一个对象 { }。');
                return;
            }

            let flatBankToImport = {};
            if (importedData.single || importedData.multi || importedData.judge) {
                Object.assign(flatBankToImport, importedData.single || {});
                Object.assign(flatBankToImport, importedData.multi || {});
                Object.assign(flatBankToImport, importedData.judge || {});
            } else {
                flatBankToImport = importedData;
            }

            const oldBank = getBank();
            const importedCount = Object.keys(flatBankToImport).length;
            if (importedCount === 0) {
                 alert('导入了0道题，请检查JSON内容。');
                 return;
            }

            const mergedBank = Object.assign(oldBank, flatBankToImport);
            const newTotal = Object.keys(mergedBank).length;

            GM_setValue(GLOBAL_Q_BANK, JSON.stringify(mergedBank));
            alert(`导入成功！\n- 成功合并 ${importedCount} 道题\n- 题库总量: ${newTotal} 道`);
            importTextarea.value = '';
            importPanel.style.display = 'none';
        };

        const cancelImportButton = createButton('取消', '#e74c3c', '#c0392b');
        cancelImportButton.onclick = () => importPanel.style.display = 'none';

        importActions.appendChild(cancelImportButton);
        importActions.appendChild(confirmImportButton);
        importPanel.appendChild(importTitle);
        importPanel.appendChild(importText);
        importPanel.appendChild(importTextarea);
        importPanel.appendChild(importActions);
        document.body.appendChild(importPanel);
    }

    if (isReportPage) {
        console.log('检测到Report页面，准备提取答案(v2.1)...');

        function extractAnswers() {
            const answers = {};
            const questionElements = document.querySelectorAll('div[id*="j_idt191_content"] > span.choiceTitle:first-of-type, div[id*="j_idt191_content"] > hr + span.choiceTitle');
            if (questionElements.length === 0) {
                console.error('未能找到任何题目元素，请检查 "questionElements" 的选择器！');
                return null;
            }
            questionElements.forEach((element) => {
                try {
                    const questionText = element ? element.textContent.trim() : null;
                    const optionsContainer = element.nextElementSibling.nextElementSibling;
                    const answerContainer = optionsContainer ? optionsContainer.nextElementSibling : null;

                    const correctAnswerElement = answerContainer ? answerContainer.querySelector('span[style*="color:green"][style*="font-weight: bold"]') : null;
                    let correctAnswer = correctAnswerElement ? correctAnswerElement.textContent.trim() : null;

                    if (correctAnswer) {
                        correctAnswer = correctAnswer.replace(/[.\s]/g, '');
                        if (correctAnswer === "true") correctAnswer = "正确";
                        if (correctAnswer === "false") correctAnswer = "错误";
                    }

                    let options = [];
                    if (optionsContainer) {
                        const optionSpans = optionsContainer.querySelectorAll('div[id*="j_idt"] > span.choiceTitle, div[id*="j_idt"] > div.choiceTitle');
                        if (optionSpans.length > 0) {
                             optionSpans.forEach(span => options.push(span.textContent.trim()));
                        } else {
                            const simpleSpans = optionsContainer.querySelectorAll('span.choiceTitle, div.choiceTitle');
                             simpleSpans.forEach(span => options.push(span.textContent.trim()));
                        }
                    }

                    if (questionText && correctAnswer) {
                        answers[questionText] = { answer: correctAnswer, options: options };
                    } else {
                        console.warn('找到一个题目元素，但未能提取题干或答案', element);
                    }
                } catch (e) {
                    console.error('提取答案时出错:', e, element);
                }
            });
            console.log('提取到的答案：', answers);
            return answers;
        }

        function addExtractButton() {
            const button = document.createElement('button');
            button.textContent = '🚀 抓取答案并存入题库';
            button.style.cssText = `position: fixed; top: 100px; right: 20px; z-index: 9999; padding: 15px 25px; background: #ff4757; color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.3);`;
            button.onmouseover = () => button.style.background = '#ff6b81';
            button.onmouseout = () => button.style.background = '#ff4757';

            button.onclick = function() {
                const courseName = getCourseName();
                const newAnswers = extractAnswers();

                if (!newAnswers || Object.keys(newAnswers).length === 0) {
                    alert('❌ 未能提取到答案！');
                    return;
                }

                const oldBank = getBank();
                const oldBankKeys = Object.keys(oldBank);
                const newAnswersKeys = Object.keys(newAnswers);
                let repetitionCount = 0;

                for (const key of newAnswersKeys) {
                    if (oldBankKeys.includes(key)) {
                        repetitionCount++;
                    }
                }

                const mergedBank = Object.assign(oldBank, newAnswers);
                const newTotal = Object.keys(mergedBank).length;
                const newAdded = newAnswersKeys.length;

                GM_setValue(GLOBAL_Q_BANK, JSON.stringify(mergedBank));
                GM_setValue(ANSWER_KEY, JSON.stringify(newAnswers));

                alert(`✅ [${courseName}] 成功提取 ${newAdded} 道题！\n- 其中 ${repetitionCount} 道题与题库重复并已更新。\n\n累积题库中现在共有 ${newTotal} 道题。\n即将跳转...`);

                const examUrl = window.location.href.replace('ExamCaseReportGeneral', 'ExamCaseGeneral');
                window.location.href = examUrl;
            };
            document.body.appendChild(button);
        }

        addExtractButton();
        addBankManagerPanel('170px');

    } else if (isExamPage) {
        console.log('检测到答题页面');

        function fillAnswers(answers) {
            let filledCount = 0;
            const questionElements = document.querySelectorAll('a[id^="archor-"] + span.choiceTitle');
            if (questionElements.length === 0) {
                console.error('未能找到任何题目元素，请检查 "a[id^="archor-"] + span.choiceTitle" 的选择器！');
                return;
            }
            questionElements.forEach((element) => {
                try {
                    const questionText = element ? element.textContent.trim() : null;
                    if (questionText && answers[questionText]) {

                        let answerToSelect;
                        const answerData = answers[questionText];
                        if (typeof answerData === 'object' && answerData !== null && answerData.answer) {
                            answerToSelect = answerData.answer;
                        } else {
                            answerToSelect = answerData;
                        }

                        const optionsContainer = element.nextElementSibling.nextElementSibling;
                        const optionLabels = optionsContainer ? optionsContainer.querySelectorAll('label') : [];
                        if(optionLabels.length === 0) {
                            console.warn('找到了题干，但未找到选项', element);
                            return;
                        }
                        let found = false;
                        optionLabels.forEach(label => {
                            const optionText = label.textContent.trim();
                            const optionChar = optionText.charAt(0);
                            if (answerToSelect.includes(optionChar)) {
                                label.click();
                                console.log(`已填充: ${questionText} -> ${optionChar}`);
                                filledCount++;
                                found = true;
                            }
                        });
                        if(!found) {
                            console.warn(`找到了题干 "${questionText}"，但未找到匹配的答案选项 (e.g. "${answerToSelect.charAt(0)}")`);
                        }
                    }
                } catch (e) {
                    console.error('填充答案时出错:', e, element);
                }
            });
            return filledCount;
        }

        function addFillButton(answers) {
            const button = document.createElement('button');
            button.textContent = `✅ 填充答案 (题库: ${Object.keys(answers).length} 道)`;
            button.style.cssText = `position: fixed; top: 100px; right: 20px; z-index: 9999; padding: 15px 25px; background: #2ecc71; color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.3);`;
            button.onmouseover = () => button.style.background = '#27ae60';
            button.onmouseout = () => button.style.background = '#2ecc71';
            button.onclick = function() {
                const count = fillAnswers(answers);
                alert(`✅ 答案已填充完成！\n请仔细检查后提交试卷。\n(共 ${count} 个选项被点击)`);
                GM_deleteValue(ANSWER_KEY);
                button.remove();
            };
            document.body.appendChild(button);
        }

        const tempAnswersRaw = GM_getValue(ANSWER_KEY);
        let answers = getBank();
        try {
            if (tempAnswersRaw) {
                const tempAnswers = JSON.parse(tempAnswersRaw);
                console.log(`加载到刚抓取的 ${Object.keys(tempAnswers).length} 道题，进行合并`);
                Object.assign(answers, tempAnswers);
            }
        } catch (e) {
            console.error('解析临时答案时出错:', e);
            GM_deleteValue(ANSWER_KEY);
        }
        if (Object.keys(answers).length > 0) {
            addFillButton(answers);
        }

    } else if (isDefaultPage) {
        console.log('检测到主页，添加题库管理面板...');
        addBankManagerPanel('100px');
    }
})();
