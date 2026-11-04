# AmesChronicle: 7-Page Interactive Feature Engineering & XAI Visual Workbench

**AmesChronicle** 是一个面向数据科学课程与实际房产估值场景的**深度数据分析、多阶段特征工程、4阶段消融验证与 SHAP 可解释性多页交互式视觉工作台**。

本项目不仅展示最终预测精度，更重点还原了**「怎么分析数据的 $\rightarrow$ 从数据分析中看出哪些特征有用 $\rightarrow$ 构造特征后得到了什么定量结果」**的完整因果证据链。

---

## 核心分析结论与特征工程收益总览

基于经典 **Ames Housing Dataset**（2,762 套去重有效房产交易，79 维原始特征），通过 5 阶段特征工程将特征空间重构扩张至 **103 维**，并在 6 种主流机器学习模型上执行严格交叉验证消融：

| 消融阶段 / 增量步骤 | 核心数据分析发现 (How We Analyzed) | 构造/引入的关键特征 (What We Added) | 交叉验证 $R^2$ | 预测误差 RMSE ($) | 独立误差削减 ($\Delta$ RMSE) |
| :--- | :--- | :--- | :---: | :---: | :---: |
| **Stage 0: 原始基线** | 直接输入原始数值特征，未处理离群值、缺失语义与偏态分布 | 16 维基础原始数值列 | `0.8501` | `$30,254` | 基线起点 |
| **Step 1: 离群手术与缺失语义** | **Cook's Distance ($D_i$)** 定位 `GrLivArea > 4000 sq.ft` 未完工异常低价交易；**非空 vs NA 房价分层检验**发现 `NA` 代表物理无壁炉/无地下室（价差达 `$65k~$88k`） | 剔除高杠杆异常点 + `HasFireplace`, `HasBasement`, 社区中位数插补 `LotFrontage` | `0.8649` | `$28,411` | **`-$1,843`** |
| **Step 2: 偏态长尾正态化** | **偏度 ($\gamma_1=1.81$) 与 Q-Q 正态分位图**发现房价及面积呈强右偏长尾，导致豪宅端残差异方差发散 | `SalePrice_Log1p`, `LotArea_BoxCox` ($\lambda=0.02$), `GrLivArea_Log1p` | `0.8775` | `$26,841` | **`-$1,570`** |
| **Step 3: 空间与卫浴碎片聚合** | **分楼层相关性拆解**发现单看一楼 (`r=0.62`) 或二楼 (`r=0.27`) 会把平房与双层住宅割裂；4个卫浴计数极度稀疏 | `TotalSF = TotalBsmtSF + 1stFlrSF + 2ndFlrSF` (`r=0.824`), `TotalBath` (`r=0.638`) | `0.8889` | `$25,419` | **`-$1,422`** |
| **Step 4: 品质×空间超线性交互** | **按建筑品质分 4 档回归斜率拆解**发现：低品质房每平尺仅涨 `$52`，而 9-10 级豪宅每平尺暴涨 `$139`（**2.67 倍斜率跃迁**） | `OverallQual_x_TotalSF = OverallQual × TotalSF`（单特征相关性跃升至 **`r=0.865`**，全模型第 1） | `0.9022` | `$23,760` | **`-$1,659`** |
| **Step 5: 房龄折旧与精装协同** | **房龄 × 翻新年限分组均值对比**发现：30 年以上老房若近 12 年内翻新，均价高出未翻新老房 **`+$34,000+`** | `HouseAge`, `RemodAge`, `QualityWeightedAge` (`r=0.742`), `AmenityScore` (`r=0.812`) | `0.9092` | `$22,881` | **`-$879`** |
| **Step 6: 28社区经验贝叶斯编码** | **ANOVA 方差分析**发现 28 个社区解释 `54%+` 房价方差，但小社区样本不足 10 套，直接 One-Hot 极易过拟合 | 5 折交叉经验贝叶斯平滑编码 `Neighborhood_TE` (`r=0.746`) + `Qual_x_Neighborhood_TE` (`r=0.838`) | **`0.9272`** | **`$21,081`** | **`-$1,800`** |

---

## 7 页全屏交互式可视化工作台架构

前端采用 **React + TypeScript + Tailwind CSS + Framer Motion**，深度集成 GitHub 顶级开源数据可视化引擎（**Apache ECharts 5**、**ECharts-GL 3D WebGL**、**Nivo (`@nivo/heatmap`, `@nivo/radar`)**），支持顶部 7 页导航栏、底部翻页控制器以及键盘 `←` / `→` 方向键丝滑切换：

1. **Page 01 · 全链路总览与交互式流水线 (`Page1HeroPipeline.tsx`)**
   - 弹簧物理数字跳动动画 (`AnimatedNumber`) + 6 节点交互式特征工程流水线（点击任意节点实时预览该阶段分析方法、衍生特征与误差削减轨迹）。
2. **Page 02 · 离群点外科手术与缺失值真相 (`Page2OutlierMissingLab.tsx`)**
   - **实验 A**：拖动 **Cook's D 杠杆切除阈值滑块**或点击一键切除手术，实时观察异常点消失、回归线从 `$107.1/sq.ft` 校准至 `$114.6/sq.ft`。
   - **实验 B**：点击任意缺失字段胶囊，动态展示『有该设施 vs 字段为 NA』时的真实成交均价断层。
3. **Page 03 · 偏态长尾动态变形记 (`Page3SkewnessMorphLab.tsx`)**
   - 支持**一键自动播放 `Raw (0%) → Box-Cox (100%)` 连续变形动画**或手动拖拽幂变换进度滑块，实时观察直方图、核密度曲线 (KDE) 与正态 Q-Q 分位图如何从右偏长尾收敛为标准高斯分布。
4. **Page 04 · 5 大特征发现因果工坊 (`Page4FeatureDiscoveryStudio.tsx`)**
   - 点击顶部 5 个特征发现任务卡片（`Mission 01` ~ `Mission 05`），中央画布动态切换为对应的实证图表（分层回归斜率跃迁图、空间碎片聚合对比图、老房翻新折旧分岔图、父子特征相关性跃升图、社区贝叶斯平滑图），右侧同步展示「三步因果推导链」。
5. **Page 05 · WebGL 3D 响应曲面与特征血缘桑基图 (`Page5Topology3DSankey.tsx`)**
   - 左侧渲染可 360° 自由旋转的 **ECharts-GL 3D 超线性响应曲面**（支持自动旋转开关与真实交易散点叠加）；右侧支持切换 **全链路特征血缘桑基图 (Sankey)** 与 **Nivo 10×10 相关性热力矩阵**。
6. **Page 06 · 28 社区经验贝叶斯编码与高维平行坐标 (`View4SpatialParallel.tsx`)**
   - 28 社区气泡矩阵 + **Nivo 六维社区雷达对比图 (`@nivo/radar`)** + **ECharts 7 轴可刷选平行坐标探索器 (Brushable Parallel Coordinates)**。
7. **Page 07 · 交互式特征消融沙盒与 SHAP 实时估值模拟器 (`Page7AblationSandboxShap.tsx`)**
   - **自选特征消融沙盒**：亲手勾选/取消 6 大特征工程模块，右侧 6 种机器学习模型的预测误差与 $R^2$ 实时动态重算。
   - **SHAP 实时房产估值模拟器**：支持 4 类典型房源一键预设（顶豪庄园、标准改善、老城精翻、基础刚需）及多维滑块调节，实时绘制 **加性 SHAP 美元级正负归因瀑布图**。

---

## 快速启动指南

```bash
# 一键启动后端 FastAPI 推理服务 (8000端口) 与前端交互式工作台 (5173端口)
chmod +x run_workbench.sh
./run_workbench.sh
```

或者分别启动：

```bash
# 1. 运行 Python 5阶段特征工程与消融流水线（生成最新 JSON 分析产物）
python3 -m src.pipeline

# 2. 运行单元测试套件
python3 -m pytest -v

# 3. 启动 FastAPI 后端服务
python3 -m uvicorn src.server:app --host 127.0.0.1 --port 8000

# 4. 启动前端可视化工作台
cd web && npm run dev -- --host 127.0.0.1 --port 5173
```

完整的数学推导与分步代码报告亦同步提供在 Jupyter Notebook：`notebooks/ames_feature_engineering_study.ipynb`。
