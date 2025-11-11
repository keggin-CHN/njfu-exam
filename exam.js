// ==UserScript==
// @name         南林马院平时作业自动答题助手
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  利用Report页面获取答案自动填充
// @author       Keggin
// @match        http://202.119.208.106/talk/ExamCase*General.jspx*
// @match        http://202.119.208.106/talk/ExamCaseReport*General.jspx*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        window.close
// ==/UserScript==

(function() {
    'use strict';

    const isReportPage = window.location.href.includes('ExamCaseReportGeneral');
    const isExamPage = window.location.href.includes('ExamCaseGeneral') && !isReportPage;
    const ANSWER_KEY = 'examAnswers';
    if (isReportPage) {
        console.log('检测到Report页面，准备提取答案...');
        addExtractButton();
        function extractAnswers() {
            const answers = {};

            const questionElements = document.querySelectorAll('div[id*="j_idt191_content"] > span.choiceTitle:first-of-type, div[id*="j_idt191_content"] > hr + span.choiceTitle');

            if (questionElements.length === 0) {
                console.error('未能找到任何题目元素，请检查 "questionElements" 的选择器！');
                return null;
            }

            questionElements.forEach((element) => {
                try {
                    const questionTextElement = element;
                    const questionText = questionTextElement ? questionTextElement.textContent.trim() : null;

                    let answerBlock = element.nextElementSibling;
                    if (answerBlock) {
                        answerBlock = answerBlock.nextElementSibling;
                    }
                    if (answerBlock) {
                        answerBlock = answerBlock.nextElementSibling;
                    }

                    const correctAnswerElement = answerBlock ? answerBlock.querySelector('span[style*="color:green"][style*="font-weight: bold"]') : null;
                    let correctAnswer = correctAnswerElement ? correctAnswerElement.textContent.trim() : null;

                    if (correctAnswer) {
                        correctAnswer = correctAnswer.replace(/[.\s]/g, '');
                        if (correctAnswer === "true") {
                            correctAnswer = "正确";
                        }
                        if (correctAnswer === "false") {
                            correctAnswer = "错误";
                        }
                    }

                    if (questionText && correctAnswer) {
                        answers[questionText] = correctAnswer;
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
            button.textContent = '🚀 抓取答案并返回答题页';
            button.style.cssText = `
                position: fixed; top: 100px; right: 20px; z-index: 9999;
                padding: 15px 25px; background: #ff4757; color: white;
                border: none; border-radius: 8px; font-size: 16px;
                font-weight: bold; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            `;
            button.onmouseover = () => button.style.background = '#ff6b81';
            button.onmouseout = () => button.style.background = '#ff4757';

            button.onclick = function() {
                const answers = extractAnswers();

                if (!answers || Object.keys(answers).length === 0) {
                    alert('❌ 未能提取到答案，请按F12检查控制台(Console)错误，并修改脚本中的CSS选择器！');
                    return;
                }

                GM_setValue(ANSWER_KEY, JSON.stringify(answers));

                alert(`✅ 成功提取 ${Object.keys(answers).length} 道题！\n即将跳转回答题页面...`);
                const examUrl = window.location.href.replace('ExamCaseReportGeneral', 'ExamCaseGeneral');
                window.location.href = examUrl;
            };

            document.body.appendChild(button);
        }
    }


    if (isExamPage) {
        console.log('检测到答题页面');

        const savedAnswersRaw = GM_getValue(ANSWER_KEY);

        if (savedAnswersRaw) {
            try {
                const answers = JSON.parse(savedAnswersRaw);
                console.log('找到保存的答案：', answers);
                addFillButton(answers);
            } catch (e) {
                console.error('解析保存的答案时出错:', e);
                GM_deleteValue(ANSWER_KEY);
            }
        }
        function fillAnswers(answers) {
            let filledCount = 0;

            const questionElements = document.querySelectorAll('a[id^="archor-"] + span.choiceTitle');

            if (questionElements.length === 0) {
                console.error('未能找到任何题目元素，请检查 "a[id^="archor-"] + span.choiceTitle" 的选择器！');
                return;
            }

            questionElements.forEach((element) => {
                try {
                    const questionTextElement = element;
                    const questionText = questionTextElement ? questionTextElement.textContent.trim() : null;


                    if (questionText && answers[questionText]) {
                        const answerToSelect = answers[questionText];

                        const optionsContainer = element.nextElementSibling.nextElementSibling;
                        const optionLabels = optionsContainer ? optionsContainer.querySelectorAll('label') : [];

                        if(optionLabels.length === 0) {
                            console.warn('找到了题干，但未找到选项，请检查 "element.nextElementSibling.nextElementSibling" 的选择器', element);
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
            button.textContent = '✅ 填充答案';
            button.style.cssText = `
                position: fixed; top: 100px; right: 20px; z-index: 9999;
                padding: 15px 25px; background: #2ecc71; color: white;
                border: none; border-radius: 8px; font-size: 16px;
                font-weight: bold; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            `;
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
    }
})();
