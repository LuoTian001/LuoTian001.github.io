---
title: OpenMMLab 实战营打卡 - 第 3 课
author: Luo Tian
date: 2023-02-04 14:59:15
tags:
- MMLab
categories:
- MMLab
top_img: /img/MMlab.jpg
summary:
top:
cover: /img/MMlab.jpg
coverImg:
---

**MMcls 实例应用 & 超算平台的使用**

## MMClasification
![MMcls](/img/MMlab/19.png)
- 深度学习模型的训练涉及几个方面:
&#8195;&#8195;1. 模型结构：模型有几层、每层多少通道数等等
&#8195;&#8195;2. 数据集：用什么数据训练模型: 数据集划分、数据文件路径、数据增强策略等等
&#8195;&#8195;3. 训练策略：梯度下降算法、学习率参数、batch size 训练总轮次、学习率变化策略等等
&#8195;&#8195;4. 运行时：GPU 、分布式环境配置等等
&#8195;&#8195;5. 一些辅助功能：如打印日志、定时保存 checkpoint 等等
- 在 OpenMMLab 项目中，所有这些项目都涵盖在一个配置文件中，一个配置文件定义了一个完整的训练过程：
&#8195;&#8195;1. model 字段定义模型
&#8195;&#8195;2. data 字段定义数据
&#8195;&#8195;3. optimizer、Ir_config 等字段定义训练策略
&#8195;&#8195;4. load_from 字段定义与训练模型的参数文件
- 配置文件的运作方式如下：
![配置文件的运作方式](/img/MMlab/20.png)
- 图像分类模型的构成：
![图像分类模型的构成](/img/MMlab/21.png)
- 图像分类模型的构建：
![图像分类模型的构建](/img/MMlab/22.png)
- 数据集的构建：
![数据集的构建](/img/MMlab/23.png)
- 定义数据加载流水线：
![数据加载流水线](/img/MMlab/24.png)
- 配置学习策略：
![学习策略](/img/MMlab/25.png)
- 预训练模型库：
[MODEL ZOO SUMMARY](https://mmclassification.readthedocs.io/en/latest/modelzoo statistics.html)

## 相关链接
- MMLab 官方主页
&#8195;&#8195;[bilibili-OpenMMLab](https://space.bilibili.com/1293512903)
&#8195;&#8195;[GitHub-OpenMMLab](https://github.com/open-mmlab)
- MMLab 官方中文文档
&#8195;&#8195;<font color=blue>[mmcv](https://mmcv.readthedocs.io/zh_CN/latest/)</font>
&#8195;&#8195;<font color=blue>[mmengine](https://mmengine.readthedocs.io/zh_CN/latest/)</font>
&#8195;&#8195;<font color=blue>[mmdetection](https://mmdetection.readthedocs.io/zh_CN/latest/)</font>
&#8195;&#8195;<font color=blue>[mmclassification](https://mmclassification.readthedocs.io/zh_CN/latest/)</font>
&#8195;&#8195;<font color=blue>[mmsegmentation](https://mmsegmentation.readthedocs.io/zh_CN/latest/)</font>
- 其他
&#8195;&#8195;<font color=blue>[北京超算用户手册_(点击下载)](/FilesForDownload/北京超级云计算中心使用手册-2022夏季版.pdf)</font>
&#8195;&#8195;<font color=blue>[宁夏超算N30用户手册_(点击下载)](/FilesForDownload/宁夏超算云N30区用户手册v2.4.pdf)</font>
&#8195;&#8195;<font color=blue>[超算平台实例操作代码_(点击下载)](/FilesForDownload/output.lin.pdf)</font>
&#8195;&#8195;<font color=blue>[OpenMMLab 2.0 源码阅读和调试「必备」技巧](https://zhuanlan.zhihu.com/p/580885852)</font>
&#8195;&#8195;<font color=blue>[北京超算云计算平台深度学习环境配置](https://zhuanlan.zhihu.com/p/602883781)</font>







