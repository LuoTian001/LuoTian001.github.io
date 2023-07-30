---
title: MMclassification初实践（小白向）
author: Luo Tian
date: 2023-02-07 21:08:00
tags:
- MMLab
categories:
- MMLab
top_img:
summary:
top:
cover:
coverImg:

---
&#8195;&#8195;由于本人之前没有接触过python和机器学习的相关知识，这次图像分类的配置过程可谓一路艰辛……（悲
&#8195;&#8195;不过好在最后终于成功训练出了模型并进行了相应的测试，因此就把这次的配置过程记录下来，就当是一次避坑总结了。过程中也借鉴了一些博主的操作，我在文中都会有所提及。

**配置环境概览:**

>平台: Windows 11
Python: 3.9.16
GPU: 本地 GPU
CUDA: 11.7
cuDNN: 8.5
Pytorch: 1.13.1
OpenCV: 4.6.0
MMCV: 1.7.0
MMCls: 0.25.0
**PS: 自建训练集**

# 一、环境安装
&#8195;&#8195;整体环境框架如下：
![](/img/cls/3.png)
## 1. CUDA 与 cuDNN 安装
&#8195;&#8195;网上有很多的教程，这里就不再赘述了，不过我以后有时间会补充上滴。这里推荐一个：[【CUDA】cuda安装](https://blog.csdn.net/weixin_43848614/article/details/117221384)。
&#8195;&#8195;不过有一点要说明，在安装 CUDA 之前要先看一下自己的显卡最高支持的 CUDA 版本和适合于 Pytorch 的 CUDA 版本，版本安装错了后面会出现很多问题。
&#8195;&#8195;比如我的 NVIDIA GPU 最高支持到 CUDA 12.0，Pytorch 官网目前最高支持到 CUDA 11.7，因此选择 CUDA 11.7 就 OK。

## 2. ANACONDA 环境与 Pycharm 配置

### 2.1 ANACONDA 安装
&#8195;&#8195;ANACONDA（conda）不仅自带了许多 Python 的包，同时可以创建 Python 虚拟环境，与系统自身的环境相隔离，方便一大堆包的管理。这里参考 [anaconda安装超详细版](https://blog.csdn.net/in546/article/details/117400839)。
- 下载：
[官网](https://www.anaconda.com)
[镜像站](https://mirrors.bfsu.edu.cn/anaconda/archive)（速度快，推荐，如下图）
![](/img/cls/1.png)
&#8195;&#8195;版本选择合适的即可，我选择的是最新的一个版本 Anaconda3-2022.10-Windows-x86_64.exe ，自带 Python3.9。
- 安装：
&#8195;&#8195;点击.exe** —— **Next** —— **Next** —— **选择一个合适的安装路径** — **Next** —— **全选（添加 conda 到环境变量中），Install** —— **Next** —— **两个√去掉** —— **Finish
&#8195;&#8195;里面有个“添加 conda 到环境变量中”的选项一定要选上！
- 检验安装：
&#8195;&#8195;在 windows 终端（cmd）输入 *python* ，回车，查看是否有 Python 环境，若显示 *Python 3.9.16* 就说明OK。
&#8195;&#8195;在 windows 终端（cmd）输入 *conda --version* ，回车，查看 conda 是否成功安装，若显示 *conda 22.9.0* 就说明OK。
- 更换 conda 源（加快第三方库的安装速度，不然后面急死人）
&#8195;&#8195;打开 Anaconda prompt，逐条输入：
{% codeblock %}
conda config --add channels https://mirrors.tuna.tsinghua.edu.cn/anaconda/pkgs/free/
conda config --add channels https://mirrors.tuna.tsinghua.edu.cn/anaconda/pkgs/main/
conda config --set show_channel_urls yes
{% endcodeblock %}
&#8195;&#8195;查看是否已更改下载源：
{% codeblock %}
conda config --show channels
{% endcodeblock %}
- 创建虚拟环境：
&#8195;&#8195;创建一个 Python 虚拟环境，这样方便后面对一大堆 py 包的管理。
{% codeblock %}
# 查看已有虚拟环境：
conda env list
conda info -e
# 创建虚拟环境
conda create -n env_name python=x.x
# 激活虚拟环境
activate env_name
# 删除虚拟环境
conda remove -n env_name --all
# 切换回默认环境
deactivate env_name
activate base
activate
{% endcodeblock %}
&#8195;&#8195;比如我创建虚拟环境为：*conda create -n pytorch_env python=3.9* 。过程中会让你输入 *y（yes）*进行确认。
&#8195;&#8195;在第一次创建虚拟环境的过程中可能会遇到 SSLErorr 的报错，意思是说需要安装 Open SSL ，网上的教程是到[Open SSL 官网](https://slproweb.com/products/Win32OpenSSL.html)下载相应版本的软件，安装过程中勾选 “The Windows system directory”。但是我的电脑因为系统保护等原因还是不行，这时候我发现 conda 的安装目录 *ANACODA\Library\bin\* 中有 openssl.exe 和 openssl.pdb 这两个文件，我把它们复制到 *C:\Windows\System32\* 中，意外的就好了（害。

### 2.2 在 PyCharm 2022 中使用 conda 虚拟环境
&#8195;&#8195;可选操作，实际中大部分过程 PyCharm 只被我当作了 python 文件的编辑器，运行全在终端上完成。这个虚拟环境因为我老早之前就用上了，第一次怎么添加的我记不清了，不过我这里推荐一个博客：[在pycharm中使用conda虚拟环境（conda虚拟环境是已经创建好的）](https://blog.csdn.net/qq_39417912/article/details/105470790)。

## 3. 第三方库安装
&#8195;&#8195;**第三方库的安装必须要切换到对应的虚拟环境中去安装！后面对这些库的使用也要在该虚拟环境下进行！**
&#8195;&#8195;比如我刚才创建好了一个虚拟环境 pytorch_env ，使用 conda 激活该虚拟环境之后，在该虚拟环境下面安装我们所用到的库，之后我想用这些库就切换到该环境即可。

### 3.1 Pytorch 安装
- 安装：
&#8195;&#8195;进入[官网](https://pytorch.org)，选择合适的版本：
![](/img/cls/2.png)
&#8195;&#8195;复制最后的那行代码到终端，回车等待安装完毕即可。
- 检验安装：
&#8195;&#8195;还是该虚拟环境，逐条输入以下语句：
{% codeblock %}
python
import torch
torch.cuda.is_available()
{% endcodeblock %}
&#8195;&#8195;若返回 true，就说明目前你所有操作都是正确的。

### 3.2 OpenMMLab 相关库安装
- 安装 mim
{% codeblock %}
pip install -U openmim
pip install openmim
{% endcodeblock %}
- 安装 mmcv-full
{% codeblock %}
mim install mmcv-full
{% endcodeblock %}
- 安装 MMClassification
&#8195;&#8195;按照官方的说法：
1. 从源码安装（推荐）：希望基于 MMClassification 框架开发自己的图像分类任务，需要添加新的功能，比如新的模型或是数据集，或者使用我们提供的各种工具。
2. 作为 Python 包安装：只是希望调用 MMClassification 的 API 接口，或者在自己的项目中导入 MMClassification 中的模块。
&#8195;&#8195;我使用的是第一种源码安装：
{% codeblock %}
git clone https://github.com/open-mmlab/mmclassification.git
cd mmclassification
pip install -v -e .
# "-v" 表示输出更多安装相关的信息
# "-e" 表示以可编辑形式安装，这样可以在不重新安装的情况下，让本地修改直接生效
{% endcodeblock %}
&#8195;&#8195;这个时候你的终端就进入了 mmclassification 文件目录中，不出意外，你可以在 *C:\Users\User_name\* 中找到该文件夹。
- MMcls 测试
&#8195;&#8195;下载下面的预训练模型：
{% codeblock %}
mim download mmcls --config resnet50_8xb32_in1k --dest .
{% endcodeblock %}
![](/img/cls/4.png)
&#8195;&#8195;运行测试脚本：
{% codeblock %}
python demo/image_demo.py demo/demo.JPEG resnet50_8xb32_in1k.py resnet50_8xb32_in1k_20210831-ea4938fc.pth --device cpu
{% endcodeblock %}
&#8195;&#8195;如果出现下图所示的结果，就表明配置工作已经全部结束，接下来就可以进行模型的训练了：
![](/img/cls/5.png)
&#8195;&#8195;如果出现了问题，先看看上述步骤是否有所遗漏，再看看官方文档的教程。如果上述的步骤有任何错误也欢迎在评论区告诉我。

# 二、模型训练

## 2.1准备数据集
&#8195;&#8195;我的数据集是在网上下载的 [flower 数据集](https://www.dropbox.com/s/snom6v4zfky0flx/flower_dataset.zip?dl=0)，有 5 个文件夹，每个文件夹名对应一种花，分别为：daisy, dandelion, rose, sunflower, tulip, 每种花含有图片 500+ 张，而我们要将这个数据处理成 mmcls 能够处理的文件组织形式—— ImageNet：
{% codeblock %}
flower_dataset
|--- meta
|	 |--- classmap.txt ——存放类与名称的对应关系
|	 |--- train.txt ——训练集文件信息
|	 |--- val.txt ——验证集文件信息
|	 |--- test.txt ——测试集文件信息
|--- train
|	 |--- class1 ——某一种花的图片存放目录
|	 |    |--- NAME1.jpg
|	 |    |--- ...
|	 |--- class2
|	 |    |--- NAME1.jpg
|	 |    |--- ...
|	 |--- class3
|	 |    |--- NAME1.jpg
|	 |    |--- ...
|	 |--- class4
|	 |    |--- NAME1.jpg
|	 |    |--- ...
|	 |--- class5
|	 |    |--- NAME1.jpg
|	 |    |--- ...
|--- val
|	 |--- class1
|	 |    |--- NAME1.jpg
|	 |    |--- ...
|	 |--- class2
|	 |    |--- NAME1.jpg
|	 |    |--- ...
|	 |--- class3
|	 |    |--- NAME1.jpg
|	 |    |--- ...
|	 |--- class4
|	 |    |--- NAME1.jpg
|	 |    |--- ...
|	 |--- class5
|	 |    |--- NAME1.jpg
|	 |    |--- ...
|--- test
|	 |--- class1
|	 |    |--- NAME1.jpg
|	 |    |--- ...
|	 |--- class2
|	 |    |--- NAME1.jpg
|	 |    |--- ...
|	 |--- class3
|	 |    |--- NAME1.jpg
|	 |    |--- ...
|	 |--- class4
|	 |    |--- NAME1.jpg
|	 |    |--- ...
|	 |--- class5
|	 |    |--- NAME1.jpg
|	 |    |--- ...
{% endcodeblock %}
*Ps：本次训练我没有用到测试集*
&#8195;&#8195;网上也有些博主的文件组织形式和这个略不同，其实问题不大，后期只需要指定对应的文件路径就行。
- Step 1.
&#8195;&#8195;我首先创建好了相应的文件夹，然后按照 train : val = 4 : 1 的比例对每一种花的图片进行数据划分，放入对应的 class 文件夹中。当然，我的图片种类比较少，所以就直接手动移动，网上也有博主分享了他们划分数据集的 Python 程序，可以借鉴使用一波。
- Step 2.
&#8195;&#8195;向 classmap.txt 文件写入以下内容：
{% codeblock %}
class1 daisy 0
class2 dandelion 1
class3 rose 2
class4 sunflower 3
class5 tulip 4
{% endcodeblock %}
&#8195;&#8195;向 train.txt 和 val.txt 文件中写入如下内容（test.txt 同理）：
{% codeblock %}
class1/A119.jpg 0
class1/A120.jpg 0
...
{% endcodeblock %}

&#8195;&#8195;当然，这个工作量太大了，我们不可能手写，这里我借用的是一位博主 [何小义的AI进阶路](https://blog.csdn.net/hzy459176895/article/details/123405552) 的程序：
{% codeblock lang:python %}
import os
import glob
import re
'''
生成train.txt  val.txt  test.txt
'''
# 需要改为您自己的路径
root_dir = "/xxx/data/cats_dogs"
# 在该路径下有train val test meta三个文件夹
train_dir = os.path.join(root_dir, "train")
val_dir = os.path.join(root_dir, "val")
test_dir = os.path.join(root_dir, "test")
meta_dir = os.path.join(root_dir, "meta")
 
def generate_txt(images_dir,map_dict):
    # 读取所有文件名
    imgs_dirs = glob.glob(images_dir+"/*/*")
 
    imgs_dirs = [ii.replace('\\', '/') for ii in imgs_dirs]
    images_dir = images_dir.replace('\\', '/')
 
    typename = images_dir.split("/")[-1]
    target_txt_path = os.path.join(meta_dir, typename+".txt")
    f = open(target_txt_path, "w")
    # 遍历所有图片名
    for img_dir in imgs_dirs:
        # 获取第一级目录名称
        filename = img_dir.split("/")[-2]
        num = map_dict[filename]
        # 写入文件
        relate_name = re.findall(typename+"/([\w / - .]*)",img_dir)
        f.write(relate_name[0]+" "+num+"\n")
 
def get_map_dict():
    # 读取所有类别映射关系
    class_map_dict = {}
    with open(os.path.join(meta_dir, "classmap.txt"),"r") as F:
        lines = F.readlines()
        for line in lines:
            line = line.split("\n")[0]
            filename, cls, num = line.split(" ")
            class_map_dict[filename] = num
    return class_map_dict
 
if __name__ == '__main__':
 
    class_map_dict = get_map_dict()
    generate_txt(images_dir=train_dir, map_dict=class_map_dict)
    generate_txt(images_dir=val_dir, map_dict=class_map_dict)
    generate_txt(images_dir=test_dir, map_dict=class_map_dict)
{% endcodeblock %}
&#8195;&#8195;然后数据集可以放在任何你想放置的地方，不过我为了调用方便，将数据集专门放在了 *mmclassification\data\* 文件夹中（要自己新建一个）。

## 2.1准备配置文件

### 配置文件结构

&#8195;&#8195;在 *configs\\_base_\* 文件夹下有 4 个基本组件类型，分别是：
1. 模型( model )
2. 数据( data )
3. 训练策略( schedule )
4. 运行设置( runtime )

&#8195;&#8195;在 *configs\* 中其他的文件夹则是各训练模型总的配置文件，比如 *configs\mobilenet_v2\mobilenet-v2_8xb32_in1k.py* 中可以看到该模型的配置属性：
{% codeblock lang:python %}
_base_ = [
    '../_base_/models/mobilenet_v2_1x.py',               # 模型
    '../_base_/datasets/imagenet_bs32_pil_resize.py',    # 数据
    '../_base_/schedules/imagenet_bs256_epochstep.py',   # 训练策略
    '../_base_/default_runtime.py'                       # 默认运行设置
]
{% endcodeblock %}
&#8195;&#8195;你可以选择任何合适的模型，我这里使用的是 resnet18b32x8 模型，因为我对 python 不熟，所以就按照官方的模板进行配置。

### 注册自己的数据集

&#8195;&#8195;新建 *mmcls\datasets\flower_dataset.py* ，建立自己的数据集定义脚本。
{% codeblock lang:python %}
import numpy as np
from .builder import DATASETS
from .base_dataset import BaseDataset

@DATASETS.register_module()
class FlowerDatasets(BaseDataset): # 这里要记好这个类的名称，之后会用到
    CLASSES = ["daisy", "dandelion", "rose", "sunflower", "tulip"] # 修改为自己的数据标签
    def load_annotations(self):
        assert isinstance(self.ann_file, str)
        data_infos = []
        with open(self.ann_file) as f:
            samples = [x.strip().split(' ') for x in f.readlines()]
            for filename, gt_label in samples:
                info = {'img_prefix': self.data_prefix,
                        'img_info': {'filename': filename},
                        'gt_label': np.array(gt_label, dtype=np.int64)}
                data_infos.append(info)
            return data_infos
{% endcodeblock %}

&#8195;&#8195;在 *mmcls\datasets\__init__.py* 中添加自己定义的数据集，进行注册：
{% codeblock lang:python %}
...
from .flower_dataset import FlowerDatasets # import 后面是类的名称
__all__ = [
    'BaseDataset', 'ImageNet', 'CIFAR10', 'CIFAR100', 'MNIST', 'FashionMNIST',
    'VOC', 'MultiLabelDataset', 'build_dataloader', 'build_dataset',
    'DistributedSampler', 'ConcatDataset', 'RepeatDataset',
    'ClassBalancedDataset', 'DATASETS', 'PIPELINES', 'ImageNet21k', 'SAMPLERS',
    'build_sampler', 'RepeatAugSampler', 'KFoldDataset', 'CUB',
    'CustomDataset', 'StanfordCars', 'FlowerDatasets' # 将自己类的名称添加到后面
]
...
{% endcodeblock %}

### 设置数据配置文件

&#8195;&#8195;新建 *config\_base_\datasets\flower_dataset.py*，导入自己的数据，并进行相关操作。
{% codeblock lang:python %}
# dataset settings
dataset_type = 'FlowerDatasets'  # 数据集名称，换成自己刚刚注册的那个名字
img_norm_cfg = dict(  #图像归一化配置，用来归一化输入的图像
    mean=[123.675, 116.28, 103.53], 
	std=[58.395, 57.12, 57.375], 
	to_rgb=True)  # 是否反转通道，使用 cv2, mmcv 读取图片默认为 BGR 通道顺序，这里 Normalize 均值方差数组的数值是以 RGB 通道顺序， 因此需要反转通道顺序
# 训练数据流水线
train_pipeline = [
    dict(type='LoadImageFromFile'),  # 读取图片
    dict(type='RandomResizedCrop', size=224),  # 随机缩放裁剪
    dict(type='RandomFlip', flip_prob=0.5, direction='horizontal'),  # 随机翻转
    dict(type='Normalize', **img_norm_cfg),  # 归一化
    dict(type='ImageToTensor', keys=['img']),  # image 转为 torch.Tensor
    dict(type='ToTensor', keys=['gt_label']),  # gt_label 转为 torch.Tensor
    dict(type='Collect', keys=['img', 'gt_label'])  # 图像和标签的集合
]
# 测试数据流水线
test_pipeline = [
    dict(type='LoadImageFromFile'),
    dict(type='Resize', size=(256, -1)),
    dict(type='CenterCrop', crop_size=224),
    dict(type='Normalize', **img_norm_cfg),
    dict(type='ImageToTensor', keys=['img']),
    dict(type='Collect', keys=['img'])  # test 时不传递 gt_label
]

data_root = '.../mmclassification/data/flower_dataset'  # 你的数据集根目录
data = dict(
    samples_per_gpu=32,  # dataloader.batch_size == self.samples_per_gpu  # 每批次样本数量
    workers_per_gpu=2,  # dataloader.num_workers == self.workers_per_gpu  # 1的话表示只有一个进程加载数据
    train=dict(  # 训练数据信息
        type=dataset_type,  # 数据集名称
        data_prefix=data_root + '/train',  # 对应到指定的文件夹和文件中
        ann_file=data_root + '/meta/train.txt',  # 数据集目录，当不存在 ann_file 时，类别信息从文件夹自动获取
        pipeline=train_pipeline),   # 数据集需要经过的数据流水线
    val=dict(   # 验证数据集信息
        type=dataset_type,
        data_prefix=data_root + '/val',
        ann_file=data_root + '/meta/val.txt',
        pipeline=test_pipeline),
    test=dict(   # 测试数据集信息
        # replace `data/val` with `data/test` for standard test
        type=dataset_type,
        data_prefix=data_root + '/val',
        ann_file=data_root + '/meta/val.txt',
        pipeline=test_pipeline
    )
)
evaluation = dict(  # evaluation hook 的配置
	interval=1,  # 验证期间的间隔，单位为 epoch 或者 iter， 取决于 runner 类型
	metric='accuracy')  # 验证期间使用的指标
{% endcodeblock %}

### 设置模型配置文件

&#8195;&#8195;访问 [Model Zoo](https://github.com/open-mmlab/mmclassification/blob/dev/docs/en/model_zoo.md)，找到本次训练使用的模型：
![](/img/cls/7.png)
&#8195;&#8195;点击 model，将模型下载到本地。为了方便管理，我统一放在了 *mmclassification\checkpoints\* 中，（自己新建一个文件夹）。
&#8195;&#8195;新建 *config\_base_\model\flowers_resnet18.py*，对模型进行初始化。
{% codeblock lang:python %}
# model settings
model = dict(
    type='ImageClassifier', # 分类器类型
    backbone=dict(
        type='ResNet', # 主干网络类型
        depth=18,  # 主干网络深度，这里是 18
        num_stages=4,  # 主干网络状态(stages)的数目，这些状态产生的特征图作为后续的 head 的输入
        out_indices=(3,),  # 输出的特征图输出索引。越远离输入图像，索引越大
        style='pytorch',
        init_cfg=dict(
            type='Pretrained',
            checkpoint='.../mmclassification/checkpoints/resnet18_batch256_imagenet_20200708-34ab8f90.pth',  # 读取预训练模型，这里是它的存放地址，换成自己的
            prefix='backbone',
            ),
        frozen_stages=2,  # 加入预训练模型时候，冻结前两层（实验证明，冻结部分权重，效果更好）
    ),
    neck=dict(type='GlobalAveragePooling'),  # 颈网络类型，neck：平均池化
    head=dict(
        type='LinearClsHead',  # 线性分类头
        num_classes=5,  # 输出类别数，与数据集的类别数一致，要自己修改
        in_channels=512,  # 输入通道数，与 neck 的输出通道一致，一般默认
        loss=dict(type='CrossEntropyLoss', loss_weight=1.0),  # 损失函数配置信息，分类，交叉熵
        topk=(1, 5),  # 评估指标，Top-k 准确率， 这里为 top1 与 top5 准确率
        )
)
{% endcodeblock %}

### 设置训练策略文件

&#8195;&#8195;可以新建也可以不新建，我直接用的 *config\_base_\schedules\imagenet_bs256.py* 。
{% codeblock lang:python %}
# 用于构建优化器的配置文件。支持 PyTorch 中的所有优化器，同时它们的参数与 PyTorch 里的优化器参数一致
optimizer = dict(type='SGD',         # 优化器类型
                lr=0.1,              # 优化器的学习率，参数的使用细节请参照对应的 PyTorch 文档
                momentum=0.9,        # 动量(Momentum)
                weight_decay=0.0001) # 权重衰减系数(weight decay)。
 # optimizer hook 的配置文件
optimizer_config = dict(grad_clip=None)  # 大多数方法不使用梯度限制(grad_clip)。
# 学习率调整配置，用于注册 LrUpdater hook。
lr_config = dict(policy='step',          # 调度流程(scheduler)的策略，也支持 CosineAnnealing, Cyclic 等
                 step=[30, 60, 90])      # 在 epoch 为 30, 60, 90 时，lr 进行衰减
runner = dict(type='EpochBasedRunner',   # 将使用的 runner 的类别，如 IterBasedRunner 或 EpochBasedRunner
            max_epochs=100)              # runner 总回合数， 对于 IterBasedRunner 使用 `max_iters`
{% endcodeblock %}

### 运行文件设置

&#8195;&#8195;在 *config\_base_\default_runtime.py* 中，设置多少批次打印日志，多少次迭代保存一次模型等等。
{% codeblock lang:python %}
# Checkpoint hook 的配置文件
checkpoint_config = dict(interval=1)   # 保存的间隔是 1，单位会根据 runner 不同变动，可以为 epoch 或者 iter。
# 日志配置信息。
log_config = dict(
    interval=25,                      # 打印日志的间隔，单位 iters
    hooks=[
        dict(type='TextLoggerHook'),          # 用于记录训练过程的文本记录器(logger)。
        # dict(type='TensorboardLoggerHook')  # 同样支持 Tensorboard 日志
    ])

dist_params = dict(backend='nccl')   # 用于设置分布式训练的参数，端口也同样可被设置
log_level = 'INFO'             # 日志的输出级别
load_from = None
resume_from = None             # 从给定路径里恢复检查点(checkpoints)，训练模式将从检查点保存的轮次开始恢复训练。
workflow = [('train', 1)]      # runner 的工作流程，[('train', 1)] 表示只有一个工作流且工作流仅执行一次。
work_dir = 'work_dir'          # 用于保存当前实验的模型检查点和日志的目录文件地址。
{% endcodeblock %}

### 设置模型主脚本

&#8195;&#8195;新建 *configs\resnet\flower_resnet18_b32x8_imagenet.py*，将上述四个配置文件按顺序加入进来。
{% codeblock lang:python %}
_base_ = [
    '../_base_/models/flowers_resnet18.py',  # model config
    '../_base_/datasets/flower_dataset.py',  # data config
    '../_base_/schedules/imagenet_bs256.py',  # schedules config
    '../_base_/default_runtime.py'  # runtime config
]
{% endcodeblock %}

## 2.2 训练
&#8195;&#8195;目录 *...\mmclassification\tools\* 中存放的是 mmcls 相关工具脚本，打开 *tools\train.py* ，这个就是启动训练的 Python 脚本。修改这两行：
{% codeblock lang:python %}
parser.add_argument('config', default="configs/resnet/flower_resnet18_b32x8_imagenet.py", help='train config file path')  # 添加模型主脚本的相对路径
parser.add_argument('--work-dir', default="train_result/flowers", help='the dir to save logs and models')  # 添加模型运行结果的保存路径，没有的话会自动创建
{% endcodeblock %}
&#8195;&#8195;在终端中输入
{% codeblock %}
python tools/train.py configs/resnet/flower_resnet18_b32x8_imagenet.py
{% endcodeblock %}
&#8195;&#8195;就开始了正式训练。结束之后，可以在 *train_result\flowers\* 中找到训练的结果。其中 latest.pth 就是最终训练好的模型文件。

## 2.3 验证
&#8195;&#8195;测试的脚本在 *tools\test.py* ，这次我们直接在终端中输入
{% codeblock %}
python tools/test.py configs/resnet/flower_resnet18_b32x8_imagenet.py train_result/flowers/latest.pth --out=val_res.json --metrics=accuracy
{% endcodeblock %}
&#8195;&#8195;测试完成终端便会打印 top1 与 top5 的准确率，同时在 *train_result\flowers\val_res.json* 中还可以看到更加详细的测试情况。

# 总结
&#8195;&#8195;配置过程太艰辛了，尤其是像我这种没有任何基础的小白，有任何一个步骤出现了问题后面就都会出错。不过万事开头难，还是要脚踏实地一步一步的来。

#### 附录

- [MMClassification 官方中文文档](https://mmclassification.readthedocs.io/zh_CN/latest/index.html)
- [MMCls Model Zoo](https://github.com/open-mmlab/mmclassification/blob/dev/docs/en/model_zoo.md)
- [mmclassification图像分类——模型训练](https://blog.csdn.net/Stone_hello/article/details/117026516)
- [记录一次 mmclassification 自定义数据训练和推理](https://blog.csdn.net/hzy459176895/article/details/123405552)
- [mmclassification自定义数据集并训练](https://blog.csdn.net/weixin_43216130/article/details/115312600)
- [mmclassification-安装使用](https://blog.csdn.net/weixin_34910922/article/details/107801656)
- [mmclassification安装与调试](https://blog.csdn.net/suiyingy/article/details/125452839)
