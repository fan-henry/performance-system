/**
 * 员工端模块 - 首页、指标配置、绩效自评、结果查询、绩效打印
 */
const Employee = (function () {

  // HR打印筛选状态
  let printFilters = { planId: '', deptId: '', keyword: '' };
  let _printContainer = null;

  function render(page, container) {
    const user = App.currentUser;
    const pages = {
      'home': () => renderHome(container),
      'emp-home': () => renderHome(container),
      'indicator-config': () => renderIndicatorConfig(container),
      'self-eval': () => renderSelfEval(container),
      'result-query': () => renderResultQuery(container),
      'print': () => renderPrint(container),
    };
    (pages[page] || pages['home'])();
  }

  // ========== 首页 ==========
  function renderHome(container) {
    const user = App.currentUser;
    const announcements = DB.getAll('announcements').filter(a => a.status === 'published').slice(0, 5);
    const myTasks = App.getMyTasks();
    const pendingSelfEval = myTasks.filter(t => t.status === 'pending_self_eval' || t.status === 'confirmed');
    const pendingConfirmTasks = myTasks.filter(t => t.status === 'pending_confirm');
    const activeTasks = myTasks.filter(t => !['completed', 'rejected', 'calibrated'].includes(t.status));
    const completedTasks = myTasks.filter(t => ['completed', 'calibrated'].includes(t.status));
    // 已完成的不显示
    const progressTasks = activeTasks;

    // 进度条 - 每个活跃任务一张卡片
    let progressHtml = '';
    if (progressTasks.length > 0) {
      const statusMap = {
        'pending_confirm': { step: 0, label: '待确认考核计划' },
        'confirmed': { step: 1, label: '待自评' },
        'pending_self_eval': { step: 1, label: '待自评' },
        'self_evaluated': { step: 2, label: '等待HR审核' },
        'hr_reviewing': { step: 2, label: 'HR审核中' },
        'hr_reviewed': { step: 3, label: '等待上级评价' },
        'supervisor_evaluating': { step: 3, label: '上级评价中' },
        'supervisor_done': { step: 4, label: '等待HR校准' },
        'calibrated': { step: 5, label: '已校准（流程完成）' },
        'completed': { step: 5, label: '已完成' },
      };
      progressHtml = progressTasks.map(task => {
        const info = statusMap[task.status] || { step: 0, label: '' };
        const plan = DB.getById('assessmentPlans', task.planId);
        return `
        <div class="card">
          <div class="card-header"><h3>考核进度 - ${plan ? plan.name : '考核计划'}（${task.cycle}）</h3></div>
          <div class="card-body">
            <div class="flex items-center justify-between mb-4">
              <span class="status-tag ${App.getTaskStatusClass(task.status)}">${App.getTaskStatusText(task.status)}</span>
            </div>
            <div class="steps">
              <div class="step ${info.step >= 1 ? 'done' : ''}"><div class="step-num">1</div><span>计划确认</span></div>
              <div class="step-line"></div>
              <div class="step ${info.step === 1 ? 'active' : info.step > 1 ? 'done' : ''}"><div class="step-num">2</div><span>绩效自评</span></div>
              <div class="step-line"></div>
              <div class="step ${info.step === 2 ? 'active' : info.step > 2 ? 'done' : ''}"><div class="step-num">3</div><span>HR审核</span></div>
              <div class="step-line"></div>
              <div class="step ${info.step === 3 ? 'active' : info.step > 3 ? 'done' : ''}"><div class="step-num">4</div><span>上级评价</span></div>
              <div class="step-line"></div>
              <div class="step ${info.step >= 5 ? 'done' : info.step === 4 ? 'active' : ''}"><div class="step-num">5</div><span>HR校准</span></div>
            </div>
            <div class="alert alert-info">${info.label}</div>
            ${task.status === 'pending_confirm' ? `
              <div class="flex gap-2 mt-3">
                <button class="btn btn-primary" onclick="Employee.confirmPlan('${task.id}')">确认考核计划</button>
              </div>
            ` : ''}
            ${['confirmed','pending_self_eval','self_evaluated','hr_reviewing','hr_reviewed'].includes(task.status) ? `
              <div class="flex gap-2 mt-3">
                <button class="btn btn-primary" onclick="Employee.startSelfEval('${task.id}')">
                  ${['self_evaluated','hr_reviewing','hr_reviewed'].includes(task.status) ? '查看自评' : '开始自评'}
                </button>
              </div>
            ` : ''}
          </div>
        </div>`;
      }).join('');
    }

    container.innerHTML = `
      <div class="stat-grid">
        ${pendingConfirmTasks.length > 0 ? `
        <div class="stat-card">
          <div class="stat-icon orange">📌</div>
          <div class="stat-info">
            <div class="label">待确认计划</div>
            <div class="value">${pendingConfirmTasks.length}</div>
          </div>
        </div>` : ''}
        <div class="stat-card">
          <div class="stat-icon blue">📋</div>
          <div class="stat-info">
            <div class="label">待自评任务</div>
            <div class="value">${pendingSelfEval.length}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green">✅</div>
          <div class="stat-info">
            <div class="label">已完成考核</div>
            <div class="value">${completedTasks.length}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon purple">📊</div>
          <div class="stat-info">
            <div class="label">累计考核次数</div>
            <div class="value">${myTasks.length}</div>
          </div>
        </div>
        ${completedTasks.length > 0 ? `
        <div class="stat-card">
          <div class="stat-icon orange">🏆</div>
          <div class="stat-info">
            <div class="label">上次考核得分</div>
            <div class="value">${completedTasks[completedTasks.length - 1].finalScore || '-'}</div>
          </div>
        </div>` : ''}
      </div>

      ${progressHtml}

      <div class="card">
        <div class="card-header">
          <h3>系统公告</h3>
        </div>
        <div class="card-body">
          ${announcements.length > 0 ? announcements.map(a => `
            <div class="announcement-item" onclick="Employee.viewAnnouncement('${a.id}')">
              <div class="title">${a.title}</div>
              <div class="meta">发布人：${a.publisher} | 发布时间：${a.publishTime} | 接收范围：${a.scopeDetail}</div>
              <div class="preview">${a.content.substring(0, 100)}...</div>
            </div>
          `).join('') : '<div class="empty-state"><div class="icon">📭</div><p>暂无公告</p></div>'}
        </div>
      </div>
    `;
  }

  function viewAnnouncement(id) {
    const ann = DB.getById('announcements', id);
    if (!ann) return;
    App.showModal(ann.title, `
      <div class="text-sm text-tertiary mb-4">
        发布人：${ann.publisher} | 发布时间：${ann.publishTime} | 接收范围：${ann.scopeDetail}
      </div>
      <div style="white-space: pre-wrap; line-height: 1.8;">${ann.content}</div>
    `, `<button class="btn btn-primary" onclick="App.closeModal()">关闭</button>`);
  }

  // ========== 计划确认 ==========
  function confirmPlan(taskId) {
    const task = DB.getById('assessmentTasks', taskId);
    if (!task || task.status !== 'pending_confirm') return;
    // 先同步个人指标配置，确保岗位无关联指标时也能显示已配置的指标
    syncTaskIndicators();
    // 重新读取更新后的task
    const refreshedTask = DB.getById('assessmentTasks', taskId);
    const plan = DB.getById('assessmentPlans', refreshedTask.planId);
    const user = DB.getById('employees', refreshedTask.employeeId);
    const dept = DB.getById('departments', user.deptId);
    const pos = DB.getById('positions', user.positionId);

    let html = `
      <div class="alert alert-info">
        <span>📋 请仔细核对以下考核计划信息，确认无误后点击"确认计划"。如需调整考核指标，请点击下方"调整绩效指标"按钮。</span>
      </div>
      <div class="p-4 mb-4" style="background: var(--bg-page); border-radius: 8px;">
        <div class="flex gap-4 text-sm">
          <div><span class="text-tertiary">姓名：</span><strong>${user.name}</strong></div>
          <div><span class="text-tertiary">工号：</span>${user.empNo}</div>
          <div><span class="text-tertiary">部门：</span>${dept ? dept.name : '-'}</div>
          <div><span class="text-tertiary">岗位：</span>${pos ? pos.name : '-'}${refreshedTask.concurrentWeight > 0 ? ' + ' + (DB.getById('positions', user.concurrentPositionId)?.name || '') + '（兼任' + refreshedTask.concurrentWeight + '%）' : ''}</div>
          <div><span class="text-tertiary">考核方案：</span><strong>${plan.name}</strong></div>
          <div><span class="text-tertiary">考核周期：</span>${refreshedTask.cycle}</div>
          <div><span class="text-tertiary">评分模式：</span>${plan.scoreMode === 'percentage' ? '百分制' : '等级制'}</div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3>考核指标清单${refreshedTask.concurrentWeight > 0 ? '（本职' + refreshedTask.primaryWeight + '% + 兼任' + refreshedTask.concurrentWeight + '%）' : ''}</h3></div>
        <div class="card-body no-pad">
          <table class="data-table">
            <thead>
              <tr>
                <th>序号</th>
                <th>岗位</th>
                <th>指标名称</th>
                <th>分类</th>
                <th>考核周期</th>
                <th>计算公式</th>
                <th>权重</th>
                <th>目标值</th>
              </tr>
            </thead>
            <tbody>
    `;

    if (refreshedTask.indicators.length === 0) {
      html += `<tr><td colspan="8" style="text-align:center;padding:24px;color:#999;">暂未配置考核指标，请点击下方"调整绩效指标"按钮进行配置</td></tr>`;
    } else {
      refreshedTask.indicators.forEach((ind, i) => {
        const indicator = DB.getById('indicators', ind.indicatorId);
        const posTag = ind.positionType === 'concurrent' ? '<span class="tag tag-purple" style="font-size:11px;">兼任</span>' : '<span class="tag tag-blue" style="font-size:11px;">本职</span>';
        html += `
        <tr>
          <td>${i + 1}</td>
          <td>${posTag}</td>
          <td class="font-semibold">${indicator ? indicator.name : '未知指标'}</td>
          <td><span class="tag tag-blue">${indicator ? indicator.category : '-'}</span></td>
          <td>${indicator ? indicator.cycle : '-'}</td>
          <td class="text-sm text-tertiary">${indicator ? indicator.formula : '-'}</td>
          <td><strong>${ind.weight}%</strong></td>
          <td>${ind.targetValue || '-'}</td>
        </tr>
      `;
      });
    }

    html += `
            </tbody>
          </table>
        </div>
      </div>
      <div class="alert alert-warning mt-4">
        <span>⚠️ 确认后考核计划将进入"待自评"状态。如发现指标需要调整，请先点击"调整绩效指标"按钮修改后再确认。</span>
      </div>
    `;

    const hasIndicators = refreshedTask.indicators.length > 0;
    App.showModal('确认考核计划', html, `
      <button class="btn" onclick="App.closeModal()">关闭</button>
      <button class="btn" style="background:#f59e0b;color:#fff;" onclick="Employee.goToIndicatorConfig()">⚙️ 调整绩效指标</button>
      <button class="btn btn-primary" onclick="Employee.submitConfirm('${taskId}')" ${hasIndicators ? '' : 'disabled'}>✅ 确认计划</button>
    `, 'lg');
  }

  function submitConfirm(taskId) {
    // 确认前先同步最新的指标配置
    syncTaskIndicators();
    App.confirm('确认该考核计划后即可开始自评。确认后如需修改请联系HR。确定要确认吗？', () => {
      const now = new Date().toLocaleString('zh-CN', { hour12: false });
      DB.update('assessmentTasks', taskId, {
        status: 'pending_self_eval',
        confirmTime: now,
      });
      DB.log(App.currentUser.name, '计划确认', `确认 ${taskId} 考核计划`);
      App.closeModal();
      App.toast('考核计划确认成功，现在可以开始自评了！', 'success');
      renderHome(document.getElementById('contentArea'));
    });
  }

  function goToIndicatorConfig() {
    App.closeModal();
    App.toast('请调整考核指标后重新确认计划', 'info');
    App.navigate('indicator-config');
  }

  // ========== 绩效指标配置 ==========
  function renderIndicatorConfig(container) {
    const user = App.currentUser;
    const position = DB.getById('positions', user.positionId);
    const allIndicators = DB.getAll('indicators');
    const hasConcurrent = user.concurrentPositionId && user.concurrentWeight > 0;
    const concPosition = hasConcurrent ? DB.getById('positions', user.concurrentPositionId) : null;

    // 获取已保存的个人指标配置
    const savedConfig = JSON.parse(localStorage.getItem(`pms_indicator_config_${user.id}`) || 'null');

    let primaryIndicators, concurrentIndicators;

    if (hasConcurrent) {
      // 双岗位模式
      const primaryRecs = position && position.indicatorIds
        ? position.indicatorIds.map(id => DB.getById('indicators', id)).filter(Boolean)
        : [];
      const concRecs = concPosition && concPosition.indicatorIds
        ? concPosition.indicatorIds.map(id => DB.getById('indicators', id)).filter(Boolean)
        : [];

      if (savedConfig && savedConfig.primary) {
        primaryIndicators = savedConfig.primary;
        concurrentIndicators = savedConfig.concurrent || [];
      } else {
        // 默认推荐指标，均分权重
        primaryIndicators = primaryRecs.map((ind, i, arr) => ({
          ...ind, weight: Math.floor(100 / arr.length) + (i === arr.length - 1 ? 100 - Math.floor(100 / arr.length) * arr.length : 0),
        }));
        concurrentIndicators = concRecs.map((ind, i, arr) => ({
          ...ind, weight: Math.floor(100 / arr.length) + (i === arr.length - 1 ? 100 - Math.floor(100 / arr.length) * arr.length : 0),
        }));
      }
      Employee._hasConcurrent = true;
    } else {
      // 单岗位模式（兼容旧逻辑）
      const recommendedIndicators = position && position.indicatorIds
        ? position.indicatorIds.map(id => DB.getById('indicators', id)).filter(Boolean)
        : [];

      if (savedConfig && Array.isArray(savedConfig)) {
        primaryIndicators = savedConfig;
      } else if (savedConfig && savedConfig.primary) {
        primaryIndicators = savedConfig.primary;
      } else {
        primaryIndicators = recommendedIndicators.slice(0, 3).map((ind, i) => ({
          ...ind, weight: i === 0 ? 40 : i === 1 ? 35 : 25,
        }));
      }
      concurrentIndicators = [];
      Employee._hasConcurrent = false;
    }

    Employee._primaryIndicators = primaryIndicators;
    Employee._concurrentIndicators = concurrentIndicators;

    renderIndicatorConfigView(container, allIndicators);
  }

  function renderIndicatorConfigView(container, allIndicators) {
    const hasConcurrent = Employee._hasConcurrent;
    const user = App.currentUser;
    const position = DB.getById('positions', user.positionId);
    const concPosition = hasConcurrent ? DB.getById('positions', user.concurrentPositionId) : null;
    const categories = [...new Set(allIndicators.map(i => i.category))];
    const primaryInds = Employee._primaryIndicators;
    const concInds = Employee._concurrentIndicators;

    const primaryWeight = hasConcurrent ? (100 - user.concurrentWeight) : 100;
    const concurrentWeight = hasConcurrent ? user.concurrentWeight : 0;

    const primaryTotal = primaryInds.reduce((s, i) => s + (i.weight || 0), 0);
    const concTotal = concInds.reduce((s, i) => s + (i.weight || 0), 0);
    const allValid = primaryTotal === 100 && primaryInds.length > 0 && (!hasConcurrent || (concTotal === 100 && concInds.length > 0));

    // 指标库表格行渲染（双岗位时有两个添加按钮）
    function renderLibRows(filtered) {
      return filtered.map(ind => {
        const inPrimary = primaryInds.find(s => s.id === ind.id);
        const inConc = hasConcurrent && concInds.find(s => s.id === ind.id);
        let actionBtns;
        if (hasConcurrent) {
          actionBtns = `
            <button class="btn btn-sm ${inPrimary ? '' : 'btn-primary'}" style="padding:2px 8px;font-size:12px;"
              onclick="Employee.addIndicator('${ind.id}', 'primary')" ${inPrimary ? 'disabled' : ''}>
              ${inPrimary ? '✓本职' : '+本职'}
            </button>
            <button class="btn btn-sm ${inConc ? '' : 'btn-primary'}" style="padding:2px 8px;font-size:12px;margin-left:4px;"
              onclick="Employee.addIndicator('${ind.id}', 'concurrent')" ${inConc ? 'disabled' : ''}>
              ${inConc ? '✓兼任' : '+兼任'}
            </button>
          `;
        } else {
          actionBtns = `
            <button class="btn btn-sm btn-primary" onclick="Employee.addIndicator('${ind.id}', 'primary')"
              ${inPrimary ? 'disabled' : ''}>
              ${inPrimary ? '已添加' : '+ 添加'}
            </button>
          `;
        }
        return `
          <tr>
            <td class="font-semibold">${ind.name}</td>
            <td><span class="tag tag-blue">${ind.category}</span></td>
            <td>${ind.cycle}</td>
            <td class="text-sm text-tertiary">${ind.formula}</td>
            <td class="text-sm">${ind.minRate}% ~ ${ind.maxRate}%</td>
            <td style="white-space:nowrap;">${actionBtns}</td>
          </tr>
        `;
      }).join('');
    }

    // 已选指标列表渲染
    function renderSelectedList(inds, positionType, posName, posWeight) {
      const total = inds.reduce((s, i) => s + (i.weight || 0), 0);
      const tagColor = positionType === 'concurrent' ? 'tag-purple' : 'tag-blue';
      const posLabel = positionType === 'concurrent' ? '兼任' : '本职';
      return `
        <div class="card" style="${positionType === 'concurrent' ? 'margin-top:16px;' : ''}">
          <div class="card-header">
            <h3>${posName} <span class="tag ${tagColor}" style="font-size:11px;">${posLabel} ${posWeight}%</span></h3>
          </div>
          <div class="card-body">
            <div id="selectedList_${positionType}">
              ${inds.length === 0 ? `
                <div class="empty-state" style="padding:20px;"><div class="icon">📋</div><p>请从上方指标库添加考核指标</p></div>
              ` : inds.map((ind, idx) => `
                <div class="flex items-center justify-between p-4 mb-2" style="border:1px solid var(--border-light); border-radius:8px;">
                  <div class="flex-1">
                    <div class="font-semibold text-sm">${ind.name}</div>
                    <div class="text-sm text-tertiary">${ind.category} | ${ind.cycle}</div>
                  </div>
                  <div class="flex items-center gap-2">
                    <input type="number" class="form-input" style="width: 60px; text-align: center;" value="${ind.weight || 0}"
                      min="0" max="100" onchange="Employee.updateWeight(${idx}, this.value, '${positionType}')" />
                    <span class="text-sm">%</span>
                    <button class="btn btn-sm btn-link text-danger" onclick="Employee.removeIndicator(${idx}, '${positionType}')">移除</button>
                  </div>
                </div>
              `).join('')}
            </div>

            <div class="mt-4 p-4" style="background: ${total === 100 ? 'var(--success-bg)' : 'var(--danger-bg)'}; border-radius: 8px;" id="weightSummary_${positionType}">
              <div class="flex items-center justify-between">
                <span class="font-semibold">岗位内权重合计</span>
                <span class="text-xl font-bold ${total === 100 ? 'text-success' : 'text-danger'}">${total}%</span>
              </div>
              <div class="progress-bar ${total === 100 ? 'success' : ''} mt-2">
                <div class="fill" style="width: ${Math.min(total, 100)}%"></div>
              </div>
              ${total !== 100 ? `<div class="text-sm text-danger mt-2">⚠️ 权重合计必须为100%</div>` : '<div class="text-sm text-success mt-2">✓ 权重校验通过</div>'}
            </div>
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="alert alert-info">
        <span>💡 从企业指标库中选择适用于${hasConcurrent ? '本职和兼任' : '本'}岗位的考核指标，并分配权重（每个岗位的指标权重合计必须为100%）。保存后可在各考核周期复用。</span>
      </div>
      ${hasConcurrent ? `
        <div class="alert alert-warning">
          <span>📌 双岗位考核：${position.name}（权重${primaryWeight}%）+ ${concPosition.name}（权重${concurrentWeight}%）。请分别为两个岗位配置指标。</span>
        </div>
      ` : ''}

      <!-- 指标库浏览 -->
      <div class="card mb-4">
        <div class="card-header">
          <h3>企业指标库</h3>
          <select class="form-select" id="categoryFilter" style="width: auto;" onchange="Employee.filterIndicators()">
            <option value="">全部分类</option>
            ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
          </select>
        </div>
        <div class="card-body no-pad">
          <table class="data-table" id="indicatorLibTable">
            <thead>
              <tr>
                <th>指标名称</th>
                <th>分类</th>
                <th>考核周期</th>
                <th>计算公式</th>
                <th>取值范围</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              ${renderLibRows(allIndicators)}
            </tbody>
          </table>
        </div>
      </div>

      <!-- 已选指标配置 -->
      <div class="flex gap-4" style="align-items: flex-start; ${hasConcurrent ? '' : 'flex-direction:column;'}">
        <div style="${hasConcurrent ? 'flex:1;' : 'width:100%;'}">
          ${renderSelectedList(primaryInds, 'primary', position ? position.name : '本职岗位', primaryWeight)}
        </div>
        ${hasConcurrent ? `
          <div style="flex:1;">
            ${renderSelectedList(concInds, 'concurrent', concPosition ? concPosition.name : '兼任岗位', concurrentWeight)}
          </div>
        ` : ''}
      </div>

      <div class="flex gap-2 mt-4">
        <button class="btn btn-primary flex-1" onclick="Employee.saveConfig()" ${allValid ? '' : 'disabled'}>
          💾 保存配置
        </button>
        <button class="btn" onclick="Employee.resetConfig()">重置</button>
      </div>
    `;
  }

  function filterIndicators() {
    const category = document.getElementById('categoryFilter').value;
    const allIndicators = DB.getAll('indicators');
    const filtered = category ? allIndicators.filter(i => i.category === category) : allIndicators;
    const hasConcurrent = Employee._hasConcurrent;
    const primaryInds = Employee._primaryIndicators;
    const concInds = Employee._concurrentIndicators || [];

    const tbody = document.querySelector('#indicatorLibTable tbody');
    tbody.innerHTML = filtered.map(ind => {
      const inPrimary = primaryInds.find(s => s.id === ind.id);
      const inConc = hasConcurrent && concInds.find(s => s.id === ind.id);
      let actionBtns;
      if (hasConcurrent) {
        actionBtns = `
          <button class="btn btn-sm ${inPrimary ? '' : 'btn-primary'}" style="padding:2px 8px;font-size:12px;"
            onclick="Employee.addIndicator('${ind.id}', 'primary')" ${inPrimary ? 'disabled' : ''}>
            ${inPrimary ? '✓本职' : '+本职'}
          </button>
          <button class="btn btn-sm ${inConc ? '' : 'btn-primary'}" style="padding:2px 8px;font-size:12px;margin-left:4px;"
            onclick="Employee.addIndicator('${ind.id}', 'concurrent')" ${inConc ? 'disabled' : ''}>
            ${inConc ? '✓兼任' : '+兼任'}
          </button>
        `;
      } else {
        actionBtns = `
          <button class="btn btn-sm btn-primary" onclick="Employee.addIndicator('${ind.id}', 'primary')"
            ${inPrimary ? 'disabled' : ''}>
            ${inPrimary ? '已添加' : '+ 添加'}
          </button>
        `;
      }
      return `
        <tr>
          <td class="font-semibold">${ind.name}</td>
          <td><span class="tag tag-blue">${ind.category}</span></td>
          <td>${ind.cycle}</td>
          <td class="text-sm text-tertiary">${ind.formula}</td>
          <td class="text-sm">${ind.minRate}% ~ ${ind.maxRate}%</td>
          <td style="white-space:nowrap;">${actionBtns}</td>
        </tr>
      `;
    }).join('');
  }

  function addIndicator(indId, positionType) {
    const ind = DB.getById('indicators', indId);
    if (!ind) return;
    const arr = positionType === 'concurrent' ? Employee._concurrentIndicators : Employee._primaryIndicators;
    if (arr.find(s => s.id === indId)) return;
    arr.push({ ...ind, weight: 0 });
    renderIndicatorConfigView(document.getElementById('contentArea'), DB.getAll('indicators'));
  }

  function removeIndicator(idx, positionType) {
    const arr = positionType === 'concurrent' ? Employee._concurrentIndicators : Employee._primaryIndicators;
    arr.splice(idx, 1);
    renderIndicatorConfigView(document.getElementById('contentArea'), DB.getAll('indicators'));
  }

  function updateWeight(idx, value, positionType) {
    const arr = positionType === 'concurrent' ? Employee._concurrentIndicators : Employee._primaryIndicators;
    arr[idx].weight = parseInt(value) || 0;
    // 仅更新对应岗位的合计显示
    const total = arr.reduce((s, i) => s + (i.weight || 0), 0);
    const summary = document.getElementById(`weightSummary_${positionType}`);
    if (summary) {
      summary.style.background = total === 100 ? 'var(--success-bg)' : 'var(--danger-bg)';
      const valueEl = summary.querySelector('.text-xl');
      valueEl.textContent = total + '%';
      valueEl.className = `text-xl font-bold ${total === 100 ? 'text-success' : 'text-danger'}`;
      summary.querySelector('.progress-bar .fill').style.width = Math.min(total, 100) + '%';
      const msgEl = summary.querySelector('.mt-2:last-child');
      if (total === 100) {
        summary.querySelector('.progress-bar').classList.add('success');
        msgEl.innerHTML = '✓ 权重校验通过';
        msgEl.className = 'text-sm text-success mt-2';
      } else {
        summary.querySelector('.progress-bar').classList.remove('success');
        msgEl.innerHTML = '⚠️ 权重合计必须为100%';
        msgEl.className = 'text-sm text-danger mt-2';
      }
    }
    // 更新保存按钮状态
    const primaryTotal = Employee._primaryIndicators.reduce((s, i) => s + (i.weight || 0), 0);
    const concTotal = Employee._hasConcurrent ? Employee._concurrentIndicators.reduce((s, i) => s + (i.weight || 0), 0) : 100;
    const allValid = primaryTotal === 100 && Employee._primaryIndicators.length > 0 && (!Employee._hasConcurrent || (concTotal === 100 && Employee._concurrentIndicators.length > 0));
    const saveBtn = document.querySelector('.btn-primary[onclick*="saveConfig"]');
    if (saveBtn) saveBtn.disabled = !allValid;
  }

  // 将保存的指标配置同步到待确认的考核任务中
  function syncTaskIndicators() {
    const user = App.currentUser;
    const savedConfig = JSON.parse(localStorage.getItem(`pms_indicator_config_${user.id}`) || 'null');
    if (!savedConfig) return;

    const allTasks = DB.getAll('assessmentTasks');
    const pendingTasks = allTasks.filter(t => t.employeeId === user.id && t.status === 'pending_confirm');
    if (pendingTasks.length === 0) return;

    const hasConcurrent = user.concurrentPositionId && user.concurrentWeight > 0;

    if (hasConcurrent && savedConfig.primary) {
      // 双岗位模式
      const primaryIndicators = savedConfig.primary.map(ind => ({
        indicatorId: ind.id,
        weight: ind.weight || 0,
        positionType: 'primary',
        targetValue: '',
        targetNum: 100,
        actualValue: '',
        actualNum: null,
        completionRate: null,
        description: '',
        selfScore: null,
        supervisorScore: null,
      }));
      const concurrentIndicators = (savedConfig.concurrent || []).map(ind => ({
        indicatorId: ind.id,
        weight: ind.weight || 0,
        positionType: 'concurrent',
        targetValue: '',
        targetNum: 100,
        actualValue: '',
        actualNum: null,
        completionRate: null,
        description: '',
        selfScore: null,
        supervisorScore: null,
      }));
      const newIndicators = [...primaryIndicators, ...concurrentIndicators];
      pendingTasks.forEach(task => {
        DB.update('assessmentTasks', task.id, {
          indicators: newIndicators,
          primaryWeight: 100 - user.concurrentWeight,
          concurrentWeight: user.concurrentWeight,
        });
      });
    } else {
      // 单岗位模式
      const inds = Array.isArray(savedConfig) ? savedConfig : (savedConfig.primary || []);
      if (inds.length === 0) return;
      const newIndicators = inds.map(ind => ({
        indicatorId: ind.id,
        weight: ind.weight || 0,
        positionType: 'primary',
        targetValue: '',
        targetNum: 100,
        actualValue: '',
        actualNum: null,
        completionRate: null,
        description: '',
        selfScore: null,
        supervisorScore: null,
      }));
      pendingTasks.forEach(task => {
        DB.update('assessmentTasks', task.id, {
          indicators: newIndicators,
          primaryWeight: 100,
          concurrentWeight: 0,
        });
      });
    }
  }

  function saveConfig() {
    const user = App.currentUser;
    const hasConcurrent = Employee._hasConcurrent;
    const configData = hasConcurrent
      ? { primary: Employee._primaryIndicators, concurrent: Employee._concurrentIndicators }
      : Employee._primaryIndicators;
    localStorage.setItem(`pms_indicator_config_${user.id}`, JSON.stringify(configData));
    // 同步到待确认的考核任务
    syncTaskIndicators();
    DB.log(user.name, '指标配置', hasConcurrent ? '保存双岗位绩效指标配置' : '保存个人绩效指标配置');
    App.toast('指标配置保存成功，考核指标已同步更新！', 'success');
  }

  function resetConfig() {
    const user = App.currentUser;
    localStorage.removeItem(`pms_indicator_config_${user.id}`);
    renderIndicatorConfig(document.getElementById('contentArea'));
  }

  // ========== 绩效自评 ==========
  function renderSelfEval(container) {
    const user = App.currentUser;
    const myTasks = App.getMyTasks();
    // 可自评的任务：已确认 或 待自评 状态
    const evaluatableTasks = myTasks.filter(t => ['confirmed', 'pending_self_eval', 'self_evaluated', 'hr_reviewing', 'hr_reviewed'].includes(t.status));

    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3>绩效自评</h3>
        </div>
        <div class="card-body no-pad">
          ${evaluatableTasks.length === 0 ? `
            <div class="empty-state">
              <div class="icon">📝</div>
              <p>当前没有可自评的考核任务</p>
            </div>
          ` : `
            <table class="data-table">
              <thead>
                <tr>
                  <th>考核方案</th>
                  <th>考核周期</th>
                  <th>指标数量</th>
                  <th>自评得分</th>
                  <th>状态</th>
                  <th>自评时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                ${evaluatableTasks.map(t => {
                  const plan = DB.getById('assessmentPlans', t.planId);
                  const hasConcurrent = t.concurrentWeight > 0 && t.indicators.some(i => i.positionType === 'concurrent');
                  return `
                    <tr>
                      <td>${plan ? plan.name : '-'}</td>
                      <td>${t.cycle}</td>
                      <td>${t.indicators.length} 项</td>
                      <td>${t.selfTotalScore !== null && t.selfTotalScore !== undefined ? `<span class="font-bold text-primary">${t.selfTotalScore.toFixed(2)}</span>${hasConcurrent ? '<span class="text-sm text-tertiary">（加权）</span>' : ''}` : '-'}</td>
                      <td><span class="status-tag ${App.getTaskStatusClass(t.status)}">${App.getTaskStatusText(t.status)}</span></td>
                      <td>${t.selfEvalTime || '-'}</td>
                      <td>
                        <button class="btn btn-sm btn-primary" onclick="Employee.startSelfEval('${t.id}')">
                          ${['self_evaluated','hr_reviewing','hr_reviewed'].includes(t.status) ? '查看' : '开始自评'}
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          `}
        </div>
      </div>
    `;
  }

  function startSelfEval(taskId) {
    const task = DB.getById('assessmentTasks', taskId);
    if (!task) return;
    const plan = DB.getById('assessmentPlans', task.planId);
    const emp = DB.getById('employees', task.employeeId);
    const isReadOnly = !['confirmed', 'pending_self_eval'].includes(task.status);
    const hasConcurrent = task.concurrentWeight > 0 && task.indicators.some(i => i.positionType === 'concurrent');

    let html = `
      <div class="alert alert-info">
        <span>📋 考核方案：<strong>${plan.name}</strong> | 考核周期：${task.cycle} | 评分模式：${plan.scoreMode === 'percentage' ? '百分制' : '等级制'}</span>
      </div>
      <div class="alert alert-warning">
        <span>📐 评分规则：单项得分 = 权重 × 完成率 ÷ 100。完成率由员工手动填写，保留两位小数。</span>
      </div>
    `;

    // 如果是HR退回的，显示退回原因
    if (task.hrComment && task.status === 'pending_self_eval') {
      html += `
        <div class="alert alert-error">
          <strong>⚠️ HR退回原因：</strong>${task.hrComment}
        </div>
      `;
    }

    // 双岗位权重提示
    if (hasConcurrent) {
      const pos = DB.getById('positions', emp.positionId);
      const concPos = DB.getById('positions', emp.concurrentPositionId);
      html += `
        <div class="alert alert-info" style="background:#f0f7ff; border-color:#1677ff;">
          <strong>🔀 兼任岗位考核</strong><br>
          本职岗位（${pos ? pos.name : '-'}）权重 ${task.primaryWeight}%，兼任岗位（${concPos ? concPos.name : '-'}）权重 ${task.concurrentWeight}%。
          两岗位分别评价后按权重加权计算总分。
        </div>
      `;
    }

    // 按岗位分组渲染指标
    const primaryIndicators = task.indicators.filter(i => i.positionType !== 'concurrent');
    const concurrentIndicators = task.indicators.filter(i => i.positionType === 'concurrent');

    function renderIndicatorGroup(groupIndicators, groupLabel, startIndex, groupColor) {
      let groupHtml = '';
      if (groupIndicators.length === 0) return '';
      if (hasConcurrent) {
        groupHtml += `<div style="padding:8px 16px; background:${groupColor}; border-radius:8px 8px 0 0; font-weight:600; font-size:14px; margin-bottom:0;">${groupLabel}</div>`;
      }
      groupIndicators.forEach((ind, i) => {
        const idx = startIndex + i;
        const indicator = DB.getById('indicators', ind.indicatorId);
        const completionRate = ind.completionRate || '';
        const selfScore = ind.selfScore !== null ? ind.selfScore : (completionRate ? App.calcIndicatorScore(ind.weight, parseFloat(completionRate)) : '');

        groupHtml += `
          <div class="card mb-4" style="box-shadow: var(--shadow-md);${hasConcurrent ? ' border-radius:0 0 8px 8px;' : ''}">
            <div class="card-header">
              <h3>指标 ${idx + 1}：${indicator.name}</h3>
              <div class="flex gap-2">
                <span class="tag tag-blue">权重 ${ind.weight}%</span>
                <span class="tag tag-gray">${indicator.category}</span>
                <span class="tag tag-purple">${indicator.cycle}</span>
              </div>
            </div>
            <div class="card-body">
              <div class="flex gap-4 mb-4 text-sm" style="background: var(--bg-page); padding: 12px; border-radius: 8px;">
                <div><span class="text-tertiary">计算公式：</span>${indicator.formula}</div>
                <div><span class="text-tertiary">取值范围：</span>${indicator.minRate}% ~ ${indicator.maxRate}%</div>
              </div>
              <p class="text-sm text-secondary mb-4">${indicator.standard}</p>

              <div class="flex gap-4">
                <div class="form-group flex-1">
                  <label class="form-label">目标值<span class="required">*</span></label>
                  <input type="text" class="form-input" id="targetValue_${idx}" value="${ind.targetValue || ''}"
                    placeholder="请输入目标值，如：100万" ${isReadOnly ? 'readonly' : ''}>
                </div>
                <div class="form-group flex-1">
                  <label class="form-label">实际值<span class="required">*</span></label>
                  <input type="text" class="form-input" id="actualValue_${idx}" value="${ind.actualValue || ''}"
                    placeholder="请输入实际完成值" ${isReadOnly ? 'readonly' : ''}>
                </div>
              </div>

              <div class="flex gap-4">
                <div class="form-group flex-1">
                  <label class="form-label">完成率<span class="required">*</span></label>
                  <div class="flex items-center gap-2">
                    <input type="number" class="form-input" id="completionRate_${idx}" value="${completionRate}"
                      placeholder="请填写完成率" step="0.01" min="0" style="flex: 1;"
                      ${isReadOnly ? 'readonly' : ''} oninput="Employee.onRateChange(${idx})">
                    <span class="text-lg font-bold">%</span>
                  </div>
                  <div class="form-hint">请手动填写完成率，保留两位小数</div>
                  <div id="rateWarn_${idx}" class="form-error hidden"></div>
                </div>
                <div class="form-group flex-1">
                  <label class="form-label">自评得分</label>
                  <input type="text" class="form-input" id="selfScore_${idx}" value="${selfScore !== '' ? selfScore : ''}"
                    readonly style="font-size: 18px; font-weight: 700; color: var(--primary);">
                  <div class="form-hint">自动计算：权重${ind.weight}% × 完成率</div>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">完成情况描述<span class="required">*</span></label>
                <textarea class="form-textarea" id="description_${idx}" maxlength="500"
                  placeholder="请描述该指标的实际完成情况（最多500字）" ${isReadOnly ? 'readonly' : ''}
                  oninput="document.getElementById('descCount_${idx}').textContent=this.value.length">${ind.description || ''}</textarea>
                <div class="form-hint"><span id="descCount_${idx}">${(ind.description || '').length}</span>/500 字</div>
              </div>
            </div>
          </div>
        `;
      });
      return groupHtml;
    }

    html += renderIndicatorGroup(primaryIndicators, '📌 本职岗位指标（权重 ' + (task.primaryWeight || 100) + '%）', 0, '#e6f4ff');
    html += renderIndicatorGroup(concurrentIndicators, '🔀 兼任岗位指标（权重 ' + (task.concurrentWeight || 0) + '%）', primaryIndicators.length, '#f9f0ff');

    // 汇总
    const selfTotal = App.calcTotalScore(task.indicators, 'selfScore', task.primaryWeight, task.concurrentWeight);
    let summaryHtml = '';
    if (hasConcurrent) {
      const primaryScore = primaryIndicators.reduce((s, ind) => s + (ind.selfScore || 0), 0);
      const concurrentScore = concurrentIndicators.reduce((s, ind) => s + (ind.selfScore || 0), 0);
      summaryHtml = `
        <div class="flex gap-4 mb-2">
          <div class="flex-1 p-3" style="background:#e6f4ff; border-radius:8px;">
            <div class="text-sm text-tertiary">本职岗位得分</div>
            <div class="text-lg font-bold" style="color:#1677ff;" id="primarySubScore">${primaryScore.toFixed(2)}</div>
            <div class="text-sm text-tertiary">× ${(task.primaryWeight || 100)}% = <span id="primaryWeightedScore">${(primaryScore * (task.primaryWeight || 100) / 100).toFixed(2)}</span></div>
          </div>
          <div class="flex-1 p-3" style="background:#f9f0ff; border-radius:8px;">
            <div class="text-sm text-tertiary">兼任岗位得分</div>
            <div class="text-lg font-bold" style="color:#722ed1;" id="concurrentSubScore">${concurrentScore.toFixed(2)}</div>
            <div class="text-sm text-tertiary">× ${(task.concurrentWeight || 0)}% = <span id="concurrentWeightedScore">${(concurrentScore * (task.concurrentWeight || 0) / 100).toFixed(2)}</span></div>
          </div>
        </div>
      `;
    }
    html += `
      <div class="card" style="background: var(--primary-bg); border: 2px solid var(--primary);">
        <div class="card-body">
          ${summaryHtml}
          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm text-tertiary">自评总分${hasConcurrent ? '（加权）' : ''}</div>
              <div class="score-display" id="totalScore">${selfTotal.toFixed(2)}<span class="unit"> 分</span></div>
            </div>
            ${!isReadOnly ? `
              <div class="flex gap-2">
                <button class="btn btn-lg" onclick="Employee.saveSelfEvalDraft('${taskId}')">
                  💾 保存
                </button>
                <button class="btn btn-primary btn-lg" onclick="Employee.submitSelfEval('${taskId}')">
                  ✅ 提交自评
                </button>
              </div>
            ` : '<span class="tag tag-gray">只读模式</span>'}
          </div>
        </div>
      </div>
    `;

    App.showModal('绩效自评', html, '', 'lg');

    // 缓存当前任务
    Employee._currentTask = task;
    Employee._isReadOnly = isReadOnly;
  }

  function onRateChange(idx) {
    const rateStr = document.getElementById(`completionRate_${idx}`).value;
    const rate = parseFloat(rateStr) || 0;
    const indicator = Employee._currentTask.indicators[idx];
    const indDef = DB.getById('indicators', indicator.indicatorId);

    if (rate > 0) {
      // 自评得分 = 权重 × 完成率 ÷ 100，保留两位小数
      const score = Math.round(indicator.weight * rate) / 100;
      document.getElementById(`selfScore_${idx}`).value = score;

      // 校验取值范围
      const warnEl = document.getElementById(`rateWarn_${idx}`);
      if (rate < indDef.minRate || rate > indDef.maxRate) {
        warnEl.textContent = `⚠️ 完成率 ${rate}% 超出取值范围（${indDef.minRate}% ~ ${indDef.maxRate}%）`;
        warnEl.classList.remove('hidden');
      } else {
        warnEl.classList.add('hidden');
      }

      // 更新总分
      updateTotalScore();
    } else {
      document.getElementById(`selfScore_${idx}`).value = '';
      updateTotalScore();
    }
  }

  function updateTotalScore() {
    const task = Employee._currentTask;
    const hasConcurrent = task && task.concurrentWeight > 0 && task.indicators.some(i => i.positionType === 'concurrent');
    
    let primaryTotal = 0;
    let concurrentTotal = 0;
    task.indicators.forEach((ind, idx) => {
      const scoreEl = document.getElementById(`selfScore_${idx}`);
      const val = scoreEl && scoreEl.value ? parseFloat(scoreEl.value) : 0;
      if (ind.positionType === 'concurrent') {
        concurrentTotal += val;
      } else {
        primaryTotal += val;
      }
    });

    if (hasConcurrent) {
      const pw = task.primaryWeight || 100;
      const cw = task.concurrentWeight || 0;
      const weighted = primaryTotal * pw / 100 + concurrentTotal * cw / 100;
      const totalEl = document.getElementById('totalScore');
      if (totalEl) totalEl.innerHTML = weighted.toFixed(2) + '<span class="unit"> 分</span>';
      const psEl = document.getElementById('primarySubScore');
      if (psEl) psEl.textContent = primaryTotal.toFixed(2);
      const csEl = document.getElementById('concurrentSubScore');
      if (csEl) csEl.textContent = concurrentTotal.toFixed(2);
      const pwEl = document.getElementById('primaryWeightedScore');
      if (pwEl) pwEl.textContent = (primaryTotal * pw / 100).toFixed(2);
      const cwEl = document.getElementById('concurrentWeightedScore');
      if (cwEl) cwEl.textContent = (concurrentTotal * cw / 100).toFixed(2);
    } else {
      const totalEl = document.getElementById('totalScore');
      if (totalEl) totalEl.innerHTML = primaryTotal.toFixed(2) + '<span class="unit"> 分</span>';
    }
  }

  function saveSelfEvalDraft(taskId) {
    const task = Employee._currentTask;
    if (!task) return;

    // 收集已填写的数据（不校验必填）
    for (let i = 0; i < task.indicators.length; i++) {
      const targetEl = document.getElementById(`targetValue_${i}`);
      const actualEl = document.getElementById(`actualValue_${i}`);
      const descEl = document.getElementById(`description_${i}`);
      const rateEl = document.getElementById(`completionRate_${i}`);
      const scoreEl = document.getElementById(`selfScore_${i}`);

      task.indicators[i].targetValue = targetEl ? targetEl.value : '';
      task.indicators[i].actualValue = actualEl ? actualEl.value : '';
      task.indicators[i].description = descEl ? descEl.value : '';
      task.indicators[i].completionRate = rateEl && rateEl.value ? parseFloat(rateEl.value) : null;
      task.indicators[i].selfScore = scoreEl && scoreEl.value ? parseFloat(scoreEl.value) : null;
    }

    // 计算当前总分（可能部分未填）
    const hasConcurrent = task.concurrentWeight > 0 && task.indicators.some(i => i.positionType === 'concurrent');
    let primaryTotal = 0, concurrentTotal = 0;
    task.indicators.forEach(ind => {
      const score = ind.selfScore || 0;
      if (ind.positionType === 'concurrent') concurrentTotal += score;
      else primaryTotal += score;
    });
    task.selfTotalScore = hasConcurrent
      ? Math.round((primaryTotal * (task.primaryWeight || 100) / 100 + concurrentTotal * (task.concurrentWeight || 0) / 100) * 100) / 100
      : Math.round(primaryTotal * 100) / 100;

    DB.update('assessmentTasks', taskId, task);
    DB.log(App.currentUser.name, '绩效自评', `保存 ${task.cycle} 自评草稿`);
    App.toast('自评数据已保存，下次可继续填写', 'success');
  }

  function submitSelfEval(taskId) {
    const task = Employee._currentTask;
    if (!task) return;

    // 校验并收集数据
    for (let i = 0; i < task.indicators.length; i++) {
      const targetValue = document.getElementById(`targetValue_${i}`).value;
      const actualValue = document.getElementById(`actualValue_${i}`).value;
      const description = document.getElementById(`description_${i}`).value;
      const rate = document.getElementById(`completionRate_${i}`).value;
      const score = document.getElementById(`selfScore_${i}`).value;

      if (!targetValue) {
        App.toast(`请填写第 ${i + 1} 项指标的目标值`, 'error');
        return;
      }
      if (!actualValue) {
        App.toast(`请填写第 ${i + 1} 项指标的实际值`, 'error');
        return;
      }
      if (!rate) {
        App.toast(`请填写第 ${i + 1} 项指标的完成率`, 'error');
        return;
      }
      if (!description) {
        App.toast(`请填写第 ${i + 1} 项指标的完成情况描述`, 'error');
        return;
      }

      const indDef = DB.getById('indicators', task.indicators[i].indicatorId);
      const rateNum = parseFloat(rate);
      if (rateNum < indDef.minRate || rateNum > indDef.maxRate) {
        App.toast(`第 ${i + 1} 项指标完成率超出取值范围（${indDef.minRate}% ~ ${indDef.maxRate}%）`, 'error');
        return;
      }

      task.indicators[i].targetValue = targetValue;
      task.indicators[i].actualValue = actualValue;
      task.indicators[i].completionRate = rateNum;
      task.indicators[i].description = description;
      task.indicators[i].selfScore = parseFloat(score);
    }

    // 计算总分（支持双岗位加权）
    task.selfTotalScore = App.calcTotalScore(task.indicators, 'selfScore', task.primaryWeight, task.concurrentWeight);
    task.status = 'hr_reviewing';
    task.selfEvalTime = new Date().toLocaleString('zh-CN', { hour12: false });

    DB.update('assessmentTasks', taskId, task);
    DB.log(App.currentUser.name, '绩效自评', `提交 ${task.cycle} 绩效自评，总分 ${task.selfTotalScore}`);

    App.closeModal();
    App.toast('绩效自评提交成功！', 'success');
    renderSelfEval(document.getElementById('contentArea'));
  }

  // ========== 绩效结果查询 ==========
  function renderResultQuery(container) {
    const myTasks = App.getMyTasks().sort((a, b) => b.cycle.localeCompare(a.cycle));
    const completedTasks = myTasks.filter(t => t.status === 'completed' || t.status === 'calibrated' || t.supervisorTotalScore !== null);

    container.innerHTML = `
      <div class="card mb-4">
        <div class="card-header"><h3>考核结果列表</h3></div>
        <div class="card-body no-pad">
          ${completedTasks.length === 0 ? `
            <div class="empty-state"><div class="icon">📭</div><p>暂无考核结果</p></div>
          ` : `
            <table class="data-table">
              <thead>
                <tr>
                  <th>考核周期</th>
                  <th>考核方案</th>
                  <th>自评得分</th>
                  <th>上级评分</th>
                  <th>最终得分</th>
                  <th>等级/系数</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                ${completedTasks.map(t => {
                  const plan = DB.getById('assessmentPlans', t.planId);
                  const grade = t.finalGrade ? App.getGrade(t.finalScore, plan) : null;
                  return `
                    <tr>
                      <td class="font-semibold">${t.cycle}</td>
                      <td>${plan ? plan.name : '-'}</td>
                      <td>${t.selfTotalScore ? t.selfTotalScore.toFixed(2) : '-'}</td>
                      <td>${t.supervisorTotalScore ? t.supervisorTotalScore.toFixed(2) : '-'}</td>
                      <td class="font-bold text-primary">${t.finalScore ? t.finalScore.toFixed(2) : (t.supervisorTotalScore ? t.supervisorTotalScore.toFixed(2) : '-')}</td>
                      <td>
                        ${t.finalGrade ? `<span class="grade-display grade-${t.finalGrade}" style="font-size: 18px;">${t.finalGrade}</span>` : '-'}
                        ${plan && plan.scoreMode === 'percentage' ? `<span class="text-sm">(${App.calcBlendedCoefficient(t, t.finalScore || t.supervisorTotalScore || 0).toFixed(2)})</span>` : ''}
                      </td>
                      <td><span class="status-tag ${App.getTaskStatusClass(t.status)}">${App.getTaskStatusText(t.status)}</span></td>
                      <td>
                        <button class="btn btn-sm btn-link" onclick="Employee.viewResult('${t.id}')">查看明细</button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          `}
        </div>
      </div>

      ${completedTasks.length > 0 ? renderHistoryChart(completedTasks) : ''}
    `;
  }

  function renderHistoryChart(tasks) {
    const sorted = [...tasks].sort((a, b) => a.cycle.localeCompare(b.cycle));
    setTimeout(() => {
      const chartEl = document.getElementById('historyChart');
      if (!chartEl) return;
      const chart = echarts.init(chartEl);
      chart.setOption({
        tooltip: { trigger: 'axis' },
        legend: { data: ['自评得分', '上级评分', '最终得分'], bottom: 0 },
        grid: { left: '3%', right: '4%', bottom: '15%', top: '10%', containLabel: true },
        xAxis: { type: 'category', data: sorted.map(t => t.cycle) },
        yAxis: { type: 'value', name: '得分' },
        series: [
          { name: '自评得分', type: 'line', data: sorted.map(t => t.selfTotalScore || 0), smooth: true, itemStyle: { color: '#1677ff' } },
          { name: '上级评分', type: 'line', data: sorted.map(t => t.supervisorTotalScore || 0), smooth: true, itemStyle: { color: '#52c41a' } },
          { name: '最终得分', type: 'bar', data: sorted.map(t => t.finalScore || t.supervisorTotalScore || 0), itemStyle: { color: '#722ed1' } },
        ],
      });
      window.addEventListener('resize', () => chart.resize());
    }, 100);

    return `
      <div class="card">
        <div class="card-header"><h3>历史趋势</h3></div>
        <div class="card-body">
          <div id="historyChart" style="width: 100%; height: 300px;"></div>
        </div>
      </div>
    `;
  }

  function viewResult(taskId) {
    const task = DB.getById('assessmentTasks', taskId);
    if (!task) return;
    const plan = DB.getById('assessmentPlans', task.planId);
    const user = DB.getById('employees', task.employeeId);
    const hasConcurrent = task.concurrentWeight > 0 && task.indicators.some(i => i.positionType === 'concurrent');

    let html = `
      <div class="flex gap-4 mb-4">
        <div class="flex-1 p-4" style="background: var(--primary-bg); border-radius: 8px;">
          <div class="text-sm text-tertiary">最终得分${hasConcurrent ? '（加权）' : ''}</div>
          <div class="score-display">${(task.finalScore || task.supervisorTotalScore || 0).toFixed(2)}<span class="unit">分</span></div>
        </div>
        ${plan.scoreMode === 'percentage' ? `
          <div class="flex-1 p-4" style="background: var(--success-bg); border-radius: 8px;">
            <div class="text-sm text-tertiary">考核系数</div>
            <div class="score-display text-success">${App.calcBlendedCoefficient(task, task.finalScore || task.supervisorTotalScore || 0).toFixed(2)}</div>
          </div>
        ` : `
          <div class="flex-1 p-4" style="background: var(--success-bg); border-radius: 8px;">
            <div class="text-sm text-tertiary">绩效等级</div>
            <div class="grade-display grade-${task.finalGrade || 'C'}">${task.finalGrade || 'C'}</div>
          </div>
        `}
      </div>
    `;

    // 双岗位加权明细
    if (hasConcurrent) {
      const primaryIndicators = task.indicators.filter(i => i.positionType !== 'concurrent');
      const concurrentIndicators = task.indicators.filter(i => i.positionType === 'concurrent');
      const primarySelf = primaryIndicators.reduce((s, ind) => s + (ind.selfScore || 0), 0);
      const concurrentSelf = concurrentIndicators.reduce((s, ind) => s + (ind.selfScore || 0), 0);
      const primarySup = primaryIndicators.reduce((s, ind) => s + (ind.supervisorScore || 0), 0);
      const concurrentSup = concurrentIndicators.reduce((s, ind) => s + (ind.supervisorScore || 0), 0);
      const pos = DB.getById('positions', user.positionId);
      const concPos = DB.getById('positions', user.concurrentPositionId);
      html += `
        <div class="flex gap-4 mb-4">
          <div class="flex-1 p-3" style="background:#e6f4ff; border-radius:8px;">
            <div class="text-sm text-tertiary">📌 ${pos ? pos.name : '本职岗位'}（${task.primaryWeight}%）</div>
            <div class="text-sm">自评：<strong>${primarySelf.toFixed(2)}</strong> | 上级：<strong>${primarySup.toFixed(2)}</strong></div>
          </div>
          <div class="flex-1 p-3" style="background:#f9f0ff; border-radius:8px;">
            <div class="text-sm text-tertiary">🔀 ${concPos ? concPos.name : '兼任岗位'}（${task.concurrentWeight}%）</div>
            <div class="text-sm">自评：<strong>${concurrentSelf.toFixed(2)}</strong> | 上级：<strong>${concurrentSup.toFixed(2)}</strong></div>
          </div>
        </div>
      `;
    }

    // 各指标明细
    html += `
      <table class="data-table">
        <thead>
          <tr>
            <th>岗位</th>
            <th>指标名称</th>
            <th>权重</th>
            <th>目标值</th>
            <th>实际值</th>
            <th>完成率</th>
            <th>自评分</th>
            <th>上级分</th>
          </tr>
        </thead>
        <tbody>
          ${task.indicators.map(ind => {
            const indDef = DB.getById('indicators', ind.indicatorId);
            const posTag = ind.positionType === 'concurrent' ? '<span class="tag tag-purple" style="font-size:11px;">兼任</span>' : '<span class="tag tag-blue" style="font-size:11px;">本职</span>';
            return `
              <tr>
                <td>${posTag}</td>
                <td class="font-semibold">${indDef.name}</td>
                <td>${ind.weight}%</td>
                <td>${ind.targetValue || '-'}</td>
                <td>${ind.actualValue || '-'}</td>
                <td>${ind.completionRate ? ind.completionRate + '%' : '-'}</td>
                <td>${ind.selfScore ? ind.selfScore.toFixed(2) : '-'}</td>
                <td>${ind.supervisorScore ? ind.supervisorScore.toFixed(2) : '-'}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;

    if (task.supervisorComment) {
      html += `<div class="alert alert-info mt-4"><strong>上级评价：</strong>${task.supervisorComment}</div>`;
    }
    if (task.hrComment) {
      html += `<div class="alert alert-success mt-4"><strong>HR评价：</strong>${task.hrComment}</div>`;
    }

    App.showModal('绩效结果明细', html, `<button class="btn btn-primary" onclick="App.closeModal()">关闭</button>`, 'lg');
  }

  // ========== 绩效打印 ==========
  function renderPrint(container) {
    const isHR = App.currentUser && App.currentUser.role === 'hr';
    _printContainer = container;
    let tasks;
    if (isHR) {
      // HR管理角色：可查看并打印全体员工绩效（含筛选）
      tasks = getHRPrintableTasks();
    } else {
      tasks = App.getMyTasks().filter(t => ['completed', 'calibrated'].includes(t.status) || t.supervisorTotalScore !== null);
    }

    const scoreOf = (t) => t.finalScore != null ? t.finalScore.toFixed(2) : (t.supervisorTotalScore != null ? t.supervisorTotalScore.toFixed(2) : '-');

    // HR 筛选栏
    const plans = DB.getAll('assessmentPlans').sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    const depts = DB.getAll('departments').sort((a, b) => (a.sort || 0) - (b.sort || 0));
    const filterBar = isHR ? `
      <div class="filter-bar" style="display:flex; flex-wrap:wrap; gap:14px; align-items:flex-end; padding:14px 16px; background:#fafcff; border-bottom:1px solid var(--border);">
        <div class="form-group" style="margin:0;">
          <label class="form-label">考核方案</label>
          <select id="pfPlan" class="form-input" style="min-width:190px;">
            <option value="">全部方案</option>
            ${plans.map(p => `<option value="${p.id}" ${printFilters.planId === p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" style="margin:0;">
          <label class="form-label">部门</label>
          <select id="pfDept" class="form-input" style="min-width:160px;">
            <option value="">全部部门</option>
            ${depts.map(d => `<option value="${d.id}" ${printFilters.deptId === d.id ? 'selected' : ''}>${d.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" style="margin:0;">
          <label class="form-label">姓名</label>
          <input id="pfKeyword" class="form-input" style="min-width:150px;" placeholder="输入姓名关键字" value="${printFilters.keyword}">
        </div>
        <button class="btn btn-primary" onclick="Employee.applyPrintFilter()">🔍 查询</button>
        <button class="btn" onclick="Employee.resetPrintFilter()">↺ 重置</button>
        <span style="align-self:center; color:#888; font-size:13px; margin-left:auto;">共 ${tasks.length} 条</span>
      </div>
    ` : '';

    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3>${isHR ? '全员绩效打印（HR）' : '绩效打印'}</h3>
          ${isHR && tasks.length > 0 ? `<button class="btn btn-primary" onclick="Employee.printAll()">${App.isPrintSupported() ? '🖨️ 打印全部绩效表' : '📷 导出全部图片'}</button>` : ''}
        </div>
        ${filterBar}
        <div class="card-body no-pad">
          ${tasks.length === 0 ? `
            <div class="empty-state"><div class="icon">🖨️</div><p>暂无可打印的绩效表</p></div>
          ` : `
            <table class="data-table">
              <thead>
                <tr>
                  <th>考核周期</th>
                  <th>考核方案</th>
                  ${isHR ? `<th>姓名</th><th>部门</th>` : ''}
                  <th>最终得分</th>
                  <th>等级</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                ${tasks.map(t => {
                  const plan = DB.getById('assessmentPlans', t.planId);
                  const emp = isHR ? (DB.getById('employees', t.employeeId) || {}) : null;
                  const dept = isHR && emp ? (DB.getById('departments', emp.deptId) || {}) : null;
                  return `
                    <tr>
                      <td class="font-semibold">${t.cycle}</td>
                      <td>${plan ? plan.name : '-'}</td>
                      ${isHR ? `<td class="font-semibold">${emp.name || '-'}</td><td>${dept.name || '-'}</td>` : ''}
                      <td class="font-bold text-primary">${scoreOf(t)}</td>
                      <td>${t.finalGrade ? `<span class="grade-display grade-${t.finalGrade}" style="font-size:16px;">${t.finalGrade}</span>` : '-'}</td>
                      <td>
                        <button class="btn btn-sm btn-primary" onclick="Employee.previewPrint('${t.id}')">📋 预览打印</button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          `}
        </div>
      </div>
    `;
  }

  // 获取 HR 可打印的全部任务（含筛选条件 + 默认排序）
  function getHRPrintableTasks() {
    let tasks = DB.getAll('assessmentTasks').filter(t => ['completed', 'calibrated'].includes(t.status) || t.supervisorTotalScore !== null);
    if (printFilters.planId) tasks = tasks.filter(t => t.planId === printFilters.planId);
    if (printFilters.deptId) tasks = tasks.filter(t => { const e = DB.getById('employees', t.employeeId); return e && e.deptId === printFilters.deptId; });
    if (printFilters.keyword) {
      const kw = printFilters.keyword.trim().toLowerCase();
      tasks = tasks.filter(t => { const e = DB.getById('employees', t.employeeId); return e && e.name.toLowerCase().includes(kw); });
    }
    tasks.sort((a, b) => {
      const ea = DB.getById('employees', a.employeeId) || {};
      const eb = DB.getById('employees', b.employeeId) || {};
      const da = (DB.getById('departments', ea.deptId) || {}).name || '';
      const db = (DB.getById('departments', eb.deptId) || {}).name || '';
      if (da !== db) return da.localeCompare(db, 'zh');
      return (ea.name || '').localeCompare(eb.name || '', 'zh');
    });
    return tasks;
  }

  // HR 应用筛选
  function applyPrintFilter() {
    const planEl = document.getElementById('pfPlan');
    const deptEl = document.getElementById('pfDept');
    const kwEl = document.getElementById('pfKeyword');
    printFilters.planId = planEl ? planEl.value : '';
    printFilters.deptId = deptEl ? deptEl.value : '';
    printFilters.keyword = kwEl ? kwEl.value : '';
    if (_printContainer) renderPrint(_printContainer);
  }

  // HR 重置筛选
  function resetPrintFilter() {
    printFilters = { planId: '', deptId: '', keyword: '' };
    if (_printContainer) renderPrint(_printContainer);
  }

  // 构建单个绩效表打印内容（员工/HR通用）
  function buildPrintContent(task) {
    const plan = DB.getById('assessmentPlans', task.planId);
    const user = DB.getById('employees', task.employeeId);
    const dept = DB.getById('departments', user.deptId);
    const pos = DB.getById('positions', user.positionId);
    const concPos = task.concurrentWeight > 0 ? DB.getById('positions', user.concurrentPositionId) : null;
    const hasConcurrent = task.concurrentWeight > 0 && task.indicators.some(i => i.positionType === 'concurrent');

    // 分离本职和兼任指标
    const primaryIndicators = task.indicators.filter(i => i.positionType !== 'concurrent');
    const concurrentIndicators = task.indicators.filter(i => i.positionType === 'concurrent');

    // 计算各岗位小计
    const calcSubtotal = (inds, field) => {
      const total = inds.reduce((sum, ind) => sum + (ind[field] || 0), 0);
      return inds.length > 0 ? total.toFixed(2) : '-';
    };

    const primarySelfSub = calcSubtotal(primaryIndicators, 'selfScore');
    const primarySuperSub = calcSubtotal(primaryIndicators, 'supervisorScore');
    const primaryCalibSub = calcSubtotal(primaryIndicators, 'calibratedScore');
    const concurrentSelfSub = calcSubtotal(concurrentIndicators, 'selfScore');
    const concurrentSuperSub = calcSubtotal(concurrentIndicators, 'supervisorScore');
    const concurrentCalibSub = calcSubtotal(concurrentIndicators, 'calibratedScore');

    // 岗位标签
    const posTag = (isConc) => isConc
      ? '<span style="background:#f9f0ff;color:#722ed1;padding:1px 6px;border-radius:3px;font-size:11px;">兼任</span>'
      : '<span style="background:#e6f4ff;color:#1677ff;padding:1px 6px;border-radius:3px;font-size:11px;">本职</span>';

    // 渲染指标行
    const renderIndRow = (ind, seq, isConc) => {
      const indDef = DB.getById('indicators', ind.indicatorId);
      return `
        <tr>
          <td style="padding:4px 6px; border:1px solid #ddd; text-align:center;">${seq}</td>
          <td style="padding:4px 6px; border:1px solid #ddd;">${posTag(isConc)}</td>
          <td style="padding:4px 6px; border:1px solid #ddd;">${indDef.name}</td>
          <td style="padding:4px 6px; border:1px solid #ddd; text-align:center;">${ind.weight}%</td>
          <td style="padding:4px 6px; border:1px solid #ddd;">${ind.targetValue || '-'}</td>
          <td style="padding:4px 6px; border:1px solid #ddd;">${ind.actualValue || '-'}</td>
          <td style="padding:4px 6px; border:1px solid #ddd; text-align:center;">${ind.completionRate ? ind.completionRate + '%' : '-'}</td>
          <td style="padding:4px 6px; border:1px solid #ddd; white-space:pre-wrap; word-wrap:break-word; max-width:120px;">${ind.description || '-'}</td>
          <td style="padding:4px 6px; border:1px solid #ddd; text-align:center;">${ind.selfScore ? ind.selfScore.toFixed(2) : '-'}</td>
          <td style="padding:4px 6px; border:1px solid #ddd; text-align:center;">${ind.supervisorScore ? ind.supervisorScore.toFixed(2) : '-'}</td>
          <td style="padding:4px 6px; border:1px solid #ddd; text-align:center;">${ind.calibratedScore ? ind.calibratedScore.toFixed(2) : (ind.supervisorScore ? ind.supervisorScore.toFixed(2) : '-')}</td>
        </tr>`;
    };

    // 构建指标表格体
    let tbodyRows = '';
    let seq = 1;
    if (hasConcurrent) {
      // 本职岗位指标
      if (primaryIndicators.length > 0) {
        tbodyRows += `<tr><td colspan="11" style="padding:4px 8px; background:#e6f4ff; font-weight:bold; border:1px solid #ddd;">📌 本职岗位：${pos ? pos.name : '-'}（权重 ${task.primaryWeight || 100}%）</td></tr>`;
        primaryIndicators.forEach(ind => { tbodyRows += renderIndRow(ind, seq, false); seq++; });
        tbodyRows += `<tr style="font-weight:bold; background:#f0f7ff;"><td colspan="8" style="padding:4px 6px; border:1px solid #ddd; text-align:right;">本职小计</td><td style="padding:4px 6px; border:1px solid #ddd; text-align:center;">${primarySelfSub}</td><td style="padding:4px 6px; border:1px solid #ddd; text-align:center;">${primarySuperSub}</td><td style="padding:4px 6px; border:1px solid #ddd; text-align:center;">${primaryCalibSub}</td></tr>`;
      }
      // 兼任岗位指标
      if (concurrentIndicators.length > 0) {
        tbodyRows += `<tr><td colspan="11" style="padding:4px 8px; background:#f9f0ff; font-weight:bold; border:1px solid #ddd;">🔀 兼任岗位：${concPos ? concPos.name : '-'}（权重 ${task.concurrentWeight || 0}%）</td></tr>`;
        concurrentIndicators.forEach(ind => { tbodyRows += renderIndRow(ind, seq, true); seq++; });
        tbodyRows += `<tr style="font-weight:bold; background:#f0f7ff;"><td colspan="8" style="padding:4px 6px; border:1px solid #ddd; text-align:right;">兼任小计</td><td style="padding:4px 6px; border:1px solid #ddd; text-align:center;">${concurrentSelfSub}</td><td style="padding:4px 6px; border:1px solid #ddd; text-align:center;">${concurrentSuperSub}</td><td style="padding:4px 6px; border:1px solid #ddd; text-align:center;">${concurrentCalibSub}</td></tr>`;
      }
      // 加权合计行
      tbodyRows += `<tr style="font-weight:bold; background:#fff7e6;"><td colspan="8" style="padding:4px 6px; border:1px solid #ddd; text-align:right;">加权合计（×权重）</td><td style="padding:4px 6px; border:1px solid #ddd; text-align:center;">${task.selfTotalScore ? task.selfTotalScore.toFixed(2) : '-'}</td><td style="padding:4px 6px; border:1px solid #ddd; text-align:center;">${task.supervisorTotalScore ? task.supervisorTotalScore.toFixed(2) : '-'}</td><td style="padding:4px 6px; border:1px solid #ddd; text-align:center;">${task.finalScore ? task.finalScore.toFixed(2) : '-'}</td></tr>`;
    } else {
      // 单岗位模式
      task.indicators.forEach(ind => { tbodyRows += renderIndRow(ind, seq, false); seq++; });
      tbodyRows += `<tr style="font-weight:bold; background:#f5f5f5;"><td colspan="8" style="padding:4px 6px; border:1px solid #ddd; text-align:right;">合计</td><td style="padding:4px 6px; border:1px solid #ddd; text-align:center;">${task.selfTotalScore ? task.selfTotalScore.toFixed(2) : '-'}</td><td style="padding:4px 6px; border:1px solid #ddd; text-align:center;">${task.supervisorTotalScore ? task.supervisorTotalScore.toFixed(2) : '-'}</td><td style="padding:4px 6px; border:1px solid #ddd; text-align:center;">${task.finalScore ? task.finalScore.toFixed(2) : (task.supervisorTotalScore ? task.supervisorTotalScore.toFixed(2) : '-')}</td></tr>`;
    }

    const finalScoreText = task.finalScore != null ? task.finalScore.toFixed(2) : (task.supervisorTotalScore != null ? task.supervisorTotalScore.toFixed(2) : '-');
    const coefText = plan.scoreMode === 'percentage' ? App.calcBlendedCoefficient(task, task.finalScore || task.supervisorTotalScore || 0).toFixed(2) : (task.finalGrade || '-');
    const scoreLabel = plan.scoreMode === 'percentage' ? '系数' : '等级';

    return `
      <div id="printContent" style="background:#fff; padding:24px; border:1px solid var(--border); border-radius:8px; font-size:12px; page-break-inside: avoid;">
        <div style="text-align:center; margin-bottom:16px;">
          <h1 style="font-size:16px; margin-bottom:4px;">吉麦新能源绩效考核表</h1>
          <p style="color:#666; font-size:12px;">${plan.name}</p>
        </div>
        <table style="width:100%; border-collapse:collapse; margin-bottom:12px; font-size:12px;">
          <tr>
            <td style="padding:4px 6px; border:1px solid #ddd; width:12%; background:#f5f5f5;">姓名</td>
            <td style="padding:4px 6px; border:1px solid #ddd; width:18%;">${user.name}</td>
            <td style="padding:4px 6px; border:1px solid #ddd; width:12%; background:#f5f5f5;">工号</td>
            <td style="padding:4px 6px; border:1px solid #ddd; width:18%;">${user.empNo}</td>
            <td style="padding:4px 6px; border:1px solid #ddd; width:12%; background:#f5f5f5;">部门</td>
            <td style="padding:4px 6px; border:1px solid #ddd; width:28%;">${dept ? dept.name : '-'}</td>
          </tr>
          <tr>
            <td style="padding:4px 6px; border:1px solid #ddd; background:#f5f5f5;">岗位</td>
            <td style="padding:4px 6px; border:1px solid #ddd;" colspan="5">
              ${pos ? pos.name : '-'}${hasConcurrent ? `（本职 ${task.primaryWeight || 100}%）` : ''}
              ${hasConcurrent ? ` + ${concPos ? concPos.name : ''}（兼任 ${task.concurrentWeight || 0}%）` : ''}
            </td>
          </tr>
          <tr>
            <td style="padding:4px 6px; border:1px solid #ddd; background:#f5f5f5;">考核周期</td>
            <td style="padding:4px 6px; border:1px solid #ddd;">${task.cycle}</td>
            <td style="padding:4px 6px; border:1px solid #ddd; background:#f5f5f5;">评分模式</td>
            <td style="padding:4px 6px; border:1px solid #ddd;" colspan="3">${plan.scoreMode === 'percentage' ? '百分制' : '等级制'}</td>
          </tr>
        </table>
        <table style="width:100%; border-collapse:collapse; margin-bottom:12px; font-size:12px;">
          <thead>
            <tr style="background:#f0f7ff;">
              <th style="padding:4px 6px; border:1px solid #ddd; width:4%;">序号</th>
              <th style="padding:4px 6px; border:1px solid #ddd; width:7%;">岗位</th>
              <th style="padding:4px 6px; border:1px solid #ddd; width:16%;">考核指标</th>
              <th style="padding:4px 6px; border:1px solid #ddd; width:5%;">权重</th>
              <th style="padding:4px 6px; border:1px solid #ddd; width:8%;">目标值</th>
              <th style="padding:4px 6px; border:1px solid #ddd; width:8%;">实际值</th>
              <th style="padding:4px 6px; border:1px solid #ddd; width:6%;">完成率</th>
              <th style="padding:4px 6px; border:1px solid #ddd; width:16%;">完成情况描述</th>
              <th style="padding:4px 6px; border:1px solid #ddd; width:6%;">自评分</th>
              <th style="padding:4px 6px; border:1px solid #ddd; width:6%;">上级分</th>
              <th style="padding:4px 6px; border:1px solid #ddd; width:6%;">校准分</th>
            </tr>
          </thead>
          <tbody>
            ${tbodyRows}
          </tbody>
        </table>
        <table style="width:100%; border-collapse:collapse; margin-bottom:12px; font-size:12px;">
          <tr>
            <td style="padding:4px 6px; border:1px solid #ddd; background:#f0f7ff; width:20%;">最终得分</td>
            <td style="padding:4px 6px; border:1px solid #ddd; font-weight:bold;">${finalScoreText} 分</td>
            <td style="padding:4px 6px; border:1px solid #ddd; background:#f0f7ff; width:20%;">绩效${scoreLabel}</td>
            <td style="padding:4px 6px; border:1px solid #ddd; font-weight:bold;">${coefText}</td>
          </tr>
        </table>
        ${task.supervisorComment ? `<p style="margin:6px 0; font-size:12px;"><strong>上级评价：</strong>${task.supervisorComment}</p>` : ''}
        ${task.hrComment ? `<p style="margin:6px 0; font-size:12px;"><strong>HR评价：</strong>${task.hrComment}</p>` : ''}
        ${task.calibReason ? `<p style="margin:6px 0; font-size:12px;"><strong>绩效校准原因：</strong>${task.calibReason}</p>` : ''}
        <div style="margin-top:32px; font-size:12px;">
          <p>员工签字：___________________</p>
          <p style="color:#999; margin-top:6px;">日期：____年____月____日</p>
        </div>
      </div>
    `;
  }

  function previewPrint(taskId) {
    const task = DB.getById('assessmentTasks', taskId);
    if (!task) return;
    const html = `
      <div style="max-width: 900px; margin: 0 auto;">
        <div class="alert alert-info">
          <span>🖨️ 以下是绩效表预览，点击下方"打印"按钮可打印。</span>
        </div>
        ${buildPrintContent(task)}
      </div>
    `;
    const printBtnLabel = App.isPrintSupported() ? '🖨️ 打印' : '📷 导出图片';
    App.showModal('绩效表预览', html, `
      <button class="btn" onclick="App.closeModal()">关闭</button>
      <button class="btn btn-primary" onclick="Employee.doPrint()">${printBtnLabel}</button>
    `, 'lg');
  }

  // HR角色：批量打印全体员工绩效表（合并到一个打印窗口，按人分页）
  function printAll() {
    const isHR = App.currentUser && App.currentUser.role === 'hr';
    if (!isHR) return;
    const tasks = getHRPrintableTasks();
    if (tasks.length === 0) { App.toast('暂无可打印的绩效表', 'warning'); return; }
    let body = '';
    tasks.forEach(t => {
      body += `<div style="page-break-after: always; margin-bottom: 24px;">${buildPrintContent(t)}</div>`;
    });
    if (App.isPrintSupported()) {
      const win = window.open('', '_blank');
      win.document.write(`
        <html><head><title>全员绩效表打印</title>
        <style>
          body { font-family: -apple-system, 'Microsoft YaHei', sans-serif; padding: 20px; }
          h1 { text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
          th, td { border: 1px solid #ddd; padding: 8px; }
          th { background: #f0f7ff; }
          @media print { body { padding: 0; } @page { size: landscape; } }
        </style></head><body>${body}</body></html>
      `);
      win.document.close();
      setTimeout(() => { win.print(); }, 300);
    } else {
      // 降级：企业微信/移动端不支持直接打印，渲染为图片导出
      const tmp = document.createElement('div');
      tmp.style.cssText = 'position:absolute; left:-10000px; top:0; width:1000px; background:#fff; padding:20px; box-sizing:border-box;';
      tmp.innerHTML = body;
      document.body.appendChild(tmp);
      App.captureElementToImage(tmp, { filename: '全员绩效表', title: '全员绩效表（图片导出）' }).then(function() {
        setTimeout(function() { if (tmp.parentNode) tmp.parentNode.removeChild(tmp); }, 800);
      });
      App.toast('当前环境不支持直接打印，已为你生成可保存的图片', 'info');
    }
  }

  function doPrint() {
    const printContent = document.getElementById('printContent');
    if (!printContent) return;
    if (App.isPrintSupported()) {
      const win = window.open('', '_blank');
      win.document.write(`
        <html><head><title>绩效表打印</title>
        <style>
          body { font-family: -apple-system, 'Microsoft YaHei', sans-serif; padding: 20px; }
          h1 { text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
          th, td { border: 1px solid #ddd; padding: 8px; }
          th { background: #f0f7ff; }
          @media print { body { padding: 0; } @page { size: landscape; } }
        </style></head><body>${printContent.innerHTML}</body></html>
      `);
      win.document.close();
      setTimeout(() => { win.print(); }, 300);
    } else {
      // 降级：企业微信/移动端不支持直接打印，渲染为图片导出
      App.captureElementToImage(printContent, { filename: '绩效表', title: '绩效表（图片导出）' });
      App.toast('当前环境不支持直接打印，已为你生成可保存的图片', 'info');
    }
  }

  return {
    render, viewAnnouncement,
    confirmPlan, submitConfirm, goToIndicatorConfig,
    filterIndicators, addIndicator, removeIndicator, updateWeight, saveConfig, resetConfig,
    startSelfEval, onRateChange, saveSelfEvalDraft, submitSelfEval,
    viewResult, previewPrint, doPrint, printAll, applyPrintFilter, resetPrintFilter,
  };
})();
