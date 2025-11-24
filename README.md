# 南林马院平时作业自动答题助手


[![GitHub stars](https://img.shields.io/github/stars/keggin-CHN/njfu-exam?style=flat-square)](https://github.com/keggin-CHN/njfu-exam/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/keggin-CHN/njfu-exam?style=flat-square)](https://github.com/keggin-CHN/njfu-exam/network)

这是一个为南京林业大学马院在线作业系统设计的油猴脚本，旨在帮助学生自动化处理平时作业，提高学习效率。

关于马院系统的题库爬取和刷题APP移步作者的另一仓库:https://github.com/keggin-CHN/njfu_grinding
## ⚠️ 使用声明

**仅用于学习与技术研究，禁止用于任何商业用途。**

## 🎥 视频演示



https://github.com/user-attachments/assets/2de8c789-3c16-45b0-932a-6df58678a354



## ✨ 主要功能

- **答案自动提取**: 在作业的 "报告" 页面，脚本能自动抓取所有题目的正确答案。
- **题库自动累积**: 抓取到的答案会自动保存并累积，形成一个持久化的个人题库。
- **一键自动答题**: 在答题页面，脚本会利用已有的题库自动填充答案。
- **强大的题库管理**:
    - **状态查看**: 随时查看题库中累积的题目总数。
    - **多格式导出**: 支持将题库导出为 `JSON` (分类)、`TXT` 和 `Word` (.doc) 格式，方便复习和分享。
    - **题库导入**: 可以通过粘贴 `JSON` 数据，合并或导入他人的题库。
    - **一键清空**: 如果需要，可以清空所有本地存储的题目。

## 📸 核心截图

| 核心功能展示 | 自动填充答案 |
| :---: | :---: |
| ![题库管理面板](https://github.com/keggin-CHN/njfu-exam/blob/main/QQ20251114-213950.jpg?raw=true) | ![自动填充答案](https://github.com/keggin-CHN/njfu-exam/blob/main/QQ20251114-214004.jpg?raw=true) |

## 🚀 安装与使用

1.  **安装油猴 (Tampermonkey)**:
    -   如果你的浏览器没有安装油猴插件，请先从对应的浏览器商店安装：[点击安装](https://www.tampermonkey.net/)

2.  **安装本脚本**:
    -   点击 [这里](https://github.com/keggin-CHN/njfu-exam/raw/main/exam.js) 直接安装。

3.  **使用流程**:
    -   **首次使用**:
        1.  手动完成一次作业。
        2.  在提交后的 **报告页面**，点击红色的 **"🚀 抓取答案并存入题库"** 按钮。
    -   **后续答题**:
        1.  打开新的作业页面，点击绿色的 **"✅ 填充答案"** 按钮。
        2.  脚本会自动完成作答，请检查无误后手动提交。
