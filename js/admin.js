/**
 * 管理端模块 - 工作台、组织管理、指标库、考核方案、考核执行、绩效校准、统计分析、系统配置、上级评价
 */
const Admin = (function () {

  function render(page, container) {
    const pages = {
      'admin-home': () => renderDashboard(container),
      'admin-org': () => renderOrgManagement(container),
      'admin-indicators': () => renderIndicatorLibrary(container),
      'admin-plans': () => renderAssessmentPlans(container),
      'admin-tasks': () => renderTaskManagement(container),
      'admin-calibration': () => renderCalibration(container),
      'admin-stats': () => renderStatistics(container),
      'admin-config': () => renderSystemConfig(container),
      'supervisor-eval': () => renderSupervisorEval(container),
      'hr-review': () => renderHRReview(container),
    };
    (pages[page] || pages['admin-home'])();
  }

  // ========== 工作台 ==========
  function renderDashboard(container) {
    const employees = DB.getAll('employees').filter(e => e.status === 'active');
    const tasks = DB.getAll('assessmentTasks');
    const plans = DB.getAll('assessmentPlans');
    const activePlan = plans.find(p => p.status === 'active');
    const completedTasks = tasks.filter(t => t.status === 'completed');
    const evaluatingTasks = tasks.filter(t => !['completed', 'rejected'].includes(t.status));

    // 各状态统计
    const statusCounts = {
      'pending_confirm': tasks.filter(t => t.status === 'pending_confirm').length,
      'pending_self_eval': tasks.filter(t => t.status === 'pending_self_eval' || t.status === 'confirmed').length,
      'self_evaluated': tasks.filter(t => t.status === 'self_evaluated' || t.status === 'hr_reviewing').length,
      'supervisor_evaluating': tasks.filter(t => ['hr_reviewed', 'supervisor_evaluating', 'supervisor_done'].includes(t.status)).length,
      'completed': tasks.filter(t => t.status === 'completed').length,
    };

    container.innerHTML = `
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-icon blue">👥</div>
          <div class="stat-info">
            <div class="label">在职员工</div>
            <div class="value">${employees.length}</div>
            <div class="sub">人</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green">📋</div>
          <div class="stat-info">
            <div class="label">考核方案</div>
            <div class="value">${plans.length}</div>
            <div class="sub">个方案</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon orange">🔄</div>
          <div class="stat-info">
            <div class="label">进行中考核</div>
            <div class="value">${evaluatingTasks.length}</div>
            <div class="sub">人待处理</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon purple">✅</div>
          <div class="stat-info">
            <div class="label">已完成考核</div>
            <div class="value">${completedTasks.length}</div>
            <div class="sub">人次</div>
          </div>
        </div>
      </div>

      ${activePlan ? `
      <div class="card mb-4">
        <div class="card-header">
          <h3>当前考核进度 - ${activePlan.name}</h3>
          <span class="tag tag-green">${activePlan.scoreMode === 'percentage' ? '百分制' : '等级制'}</span>
        </div>
        <div class="card-body">
          <div class="stat-grid" style="margin-bottom:0;">
            <div class="stat-card" style="box-shadow:none; border:1px solid var(--border-light);">
              <div class="stat-icon" style="background:#f5f5f5; color:var(--text-tertiary);">⏳</div>
              <div class="stat-info"><div class="label">待确认</div><div class="value" style="font-size:20px;">${statusCounts.pending_confirm}</div></div>
            </div>
            <div class="stat-card" style="box-shadow:none; border:1px solid var(--border-light);">
              <div class="stat-icon" style="background:var(--primary-light); color:var(--primary);">📝</div>
              <div class="stat-info"><div class="label">待自评</div><div class="value" style="font-size:20px;">${statusCounts.pending_self_eval}</div></div>
            </div>
            <div class="stat-card" style="box-shadow:none; border:1px solid var(--border-light);">
              <div class="stat-icon" style="background:var(--warning-bg); color:var(--warning);">📤</div>
              <div class="stat-info"><div class="label">待审核</div><div class="value" style="font-size:20px;">${statusCounts.self_evaluated}</div></div>
            </div>
            <div class="stat-card" style="box-shadow:none; border:1px solid var(--border-light);">
              <div class="stat-icon" style="background:var(--success-bg); color:var(--success);">✅</div>
              <div class="stat-info"><div class="label">已完成</div><div class="value" style="font-size:20px;">${statusCounts.completed}</div></div>
            </div>
          </div>
          <div class="mt-4">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm text-tertiary">整体完成进度</span>
              <span class="text-sm font-bold">${tasks.length > 0 ? Math.round(statusCounts.completed / tasks.length * 100) : 0}%</span>
            </div>
            <div class="progress-bar success">
              <div class="fill" style="width: ${tasks.length > 0 ? (statusCounts.completed / tasks.length * 100) : 0}%"></div>
            </div>
          </div>
        </div>
      </div>` : ''}

      <div class="chart-grid">
        <div class="card">
          <div class="card-header"><h3>考核状态分布</h3></div>
          <div class="card-body">
            <div id="statusChart" style="width:100%; height:280px;"></div>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h3>部门人数分布</h3></div>
          <div class="card-body">
            <div id="deptChart" style="width:100%; height:280px;"></div>
          </div>
        </div>
      </div>

      <div class="card mt-4">
        <div class="card-header"><h3>最新动态</h3></div>
        <div class="card-body no-pad">
          <table class="data-table">
            <thead><tr><th>操作人</th><th>操作类型</th><th>操作详情</th><th>时间</th></tr></thead>
            <tbody>
              ${DB.getAll('operationLogs').slice(-8).reverse().map(log => `
                <tr>
                  <td>${log.operator}</td>
                  <td><span class="tag tag-blue">${log.type}</span></td>
                  <td>${log.detail}</td>
                  <td class="text-sm text-tertiary">${log.operateTime}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // 渲染图表
    setTimeout(() => {
      const statusChart = echarts.init(document.getElementById('statusChart'));
      statusChart.setOption({
        tooltip: { trigger: 'item' },
        legend: { bottom: 0 },
        series: [{
          type: 'pie', radius: ['40%', '70%'],
          data: [
            { value: statusCounts.pending_confirm, name: '待确认', itemStyle: { color: '#bfbfbf' } },
            { value: statusCounts.pending_self_eval, name: '待自评', itemStyle: { color: '#1677ff' } },
            { value: statusCounts.self_evaluated, name: '待审核', itemStyle: { color: '#faad14' } },
            { value: statusCounts.supervisor_evaluating, name: '评价中', itemStyle: { color: '#13c2c2' } },
            { value: statusCounts.completed, name: '已完成', itemStyle: { color: '#52c41a' } },
          ].filter(d => d.value > 0),
          label: { formatter: '{b}: {c} ({d}%)' },
        }],
      });

      const depts = DB.getAll('departments').filter(d => !d.parentId);
      const deptCounts = depts.map(d => {
        const count = employees.filter(e => e.deptId === d.id || isUnderDept(e.deptId, d.id)).length;
        return { name: d.name, value: count };
      }).filter(d => d.value > 0);

      const deptChart = echarts.init(document.getElementById('deptChart'));
      deptChart.setOption({
        tooltip: { trigger: 'axis' },
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
        xAxis: { type: 'category', data: deptCounts.map(d => d.name), axisLabel: { interval: 0, rotate: 0 } },
        yAxis: { type: 'value', name: '人数' },
        series: [{ type: 'bar', data: deptCounts.map(d => d.value), itemStyle: { color: '#1677ff', borderRadius: [4,4,0,0] } }],
      });

      window.addEventListener('resize', () => { statusChart.resize(); deptChart.resize(); });
    }, 100);
  }

  function isUnderDept(deptId, parentId) {
    const depts = DB.getAll('departments');
    let current = depts.find(d => d.id === deptId);
    while (current && current.parentId) {
      if (current.parentId === parentId) return true;
      current = depts.find(d => d.id === current.parentId);
    }
    return false;
  }

  // ========== 组织与人员管理 ==========
  function renderOrgManagement(container) {
    Admin._orgTab = Admin._orgTab || 'dept';
    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div class="flex gap-2">
            <button class="btn ${Admin._orgTab === 'dept' ? 'btn-primary' : ''}" onclick="Admin.switchOrgTab('dept')">部门管理</button>
            <button class="btn ${Admin._orgTab === 'position' ? 'btn-primary' : ''}" onclick="Admin.switchOrgTab('position')">岗位管理</button>
            <button class="btn ${Admin._orgTab === 'employee' ? 'btn-primary' : ''}" onclick="Admin.switchOrgTab('employee')">员工管理</button>
            <button class="btn ${Admin._orgTab === 'permission' ? 'btn-primary' : ''}" onclick="Admin.switchOrgTab('permission')">权限分配</button>
          </div>
        </div>
        <div class="card-body" id="orgTabContent"></div>
      </div>
    `;
    renderOrgTab();
  }

  function switchOrgTab(tab) {
    Admin._orgTab = tab;
    renderOrgManagement(document.getElementById('contentArea'));
  }

  function renderOrgTab() {
    const content = document.getElementById('orgTabContent');
    if (Admin._orgTab === 'dept') renderDeptTab(content);
    else if (Admin._orgTab === 'position') renderPositionTab(content);
    else if (Admin._orgTab === 'employee') renderEmployeeTab(content);
    else if (Admin._orgTab === 'permission') renderPermissionTab(content);
  }

  function renderDeptTab(container) {
    const depts = DB.getAll('departments');
    const tree = App.buildDeptTree(depts, null);

    container.innerHTML = `
      <div class="flex gap-4" style="align-items: flex-start;">
        <div style="width: 400px;">
          <div class="flex justify-between mb-4">
            <h3 class="font-semibold">组织架构</h3>
            <button class="btn btn-primary btn-sm" onclick="Admin.editDept(null)">+ 新增部门</button>
          </div>
          <div id="deptTree">${renderDeptTreeHtml(tree)}</div>
        </div>
        <div class="flex-1" id="deptDetail">
          <div class="empty-state"><div class="icon">🏢</div><p>点击左侧部门查看详情</p></div>
        </div>
      </div>
    `;
  }

  function renderDeptTreeHtml(nodes, level) {
    if (!nodes || nodes.length === 0) return '';
    return nodes.map(node => `
      <div class="tree-node">
        <div class="tree-item" onclick="Admin.viewDept('${node.id}')">
          <span class="tree-icon">${node.children && node.children.length ? '📂' : '📁'}</span>
          <span class="tree-label">${node.name}</span>
          <span class="text-sm text-tertiary">${DB.getAll('employees').filter(e => e.deptId === node.id).length}人</span>
        </div>
        ${node.children && node.children.length ? `<div class="tree-children">${renderDeptTreeHtml(node.children, (level||0)+1)}</div>` : ''}
      </div>
    `).join('');
  }

  function viewDept(deptId) {
    const dept = DB.getById('departments', deptId);
    const employees = DB.getAll('employees').filter(e => e.deptId === deptId && e.status === 'active');
    const manager = dept.managerId ? DB.getById('employees', dept.managerId) : null;
    const childDepts = DB.getAll('departments').filter(d => d.parentId === deptId);

    document.getElementById('deptDetail').innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3>${dept.name}</h3>
          <div class="flex gap-2">
            <button class="btn btn-sm" onclick="Admin.editDept('${dept.id}')">编辑</button>
            <button class="btn btn-sm btn-danger" onclick="Admin.deleteDept('${dept.id}')">删除</button>
          </div>
        </div>
        <div class="card-body">
          <div class="flex gap-4 mb-4">
            <div class="flex-1 p-4" style="background:var(--bg-page); border-radius:8px;">
              <div class="text-sm text-tertiary">部门负责人</div>
              <div class="font-semibold">${manager ? manager.name : '未设置'}</div>
            </div>
            <div class="flex-1 p-4" style="background:var(--bg-page); border-radius:8px;">
              <div class="text-sm text-tertiary">部门人数</div>
              <div class="font-semibold">${employees.length} 人</div>
            </div>
            <div class="flex-1 p-4" style="background:var(--bg-page); border-radius:8px;">
              <div class="text-sm text-tertiary">下级部门</div>
              <div class="font-semibold">${childDepts.length} 个</div>
            </div>
          </div>
          <p class="text-sm text-secondary mb-4">${dept.desc || '暂无描述'}</p>

          <h4 class="font-semibold mb-2">部门成员</h4>
          <table class="data-table">
            <thead><tr><th>工号</th><th>姓名</th><th>岗位</th><th>状态</th></tr></thead>
            <tbody>
              ${employees.map(e => {
                const pos = DB.getById('positions', e.positionId);
                return `<tr>
                  <td>${e.empNo}</td>
                  <td class="font-semibold">${e.name}</td>
                  <td>${pos ? pos.name : '-'}</td>
                  <td><span class="status-tag status-active">在职</span></td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function editDept(deptId) {
    const dept = deptId ? DB.getById('departments', deptId) : null;
    const depts = DB.getAll('departments');
    const employees = DB.getAll('employees').filter(e => e.status === 'active');

    const html = `
      <form id="deptForm">
        <div class="form-group">
          <label class="form-label">部门名称<span class="required">*</span></label>
          <input type="text" class="form-input" name="name" value="${dept ? dept.name : ''}" required>
        </div>
        <div class="form-group">
          <label class="form-label">上级部门</label>
          <select class="form-select" name="parentId">
            <option value="">无（顶级部门）</option>
            ${depts.filter(d => d.id !== deptId).map(d => `<option value="${d.id}" ${dept && dept.parentId === d.id ? 'selected' : ''}>${d.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">部门负责人</label>
          <select class="form-select" name="managerId">
            <option value="">未指定</option>
            ${employees.map(e => `<option value="${e.id}" ${dept && dept.managerId === e.id ? 'selected' : ''}>${e.name}（${e.empNo}）</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">排序号</label>
          <input type="number" class="form-input" name="sort" value="${dept ? (dept.sort || 1) : 1}" min="1">
        </div>
        <div class="form-group">
          <label class="form-label">部门描述</label>
          <textarea class="form-textarea" name="desc">${dept ? (dept.desc || '') : ''}</textarea>
        </div>
      </form>
    `;

    App.showModal(dept ? '编辑部门' : '新增部门', html, `
      <button class="btn" onclick="App.closeModal()">取消</button>
      <button class="btn btn-primary" onclick="Admin.saveDept('${deptId || ''}')">保存</button>
    `);
  }

  function saveDept(deptId) {
    const form = document.getElementById('deptForm');
    const data = {
      name: form.name.value.trim(),
      parentId: form.parentId.value || null,
      managerId: form.managerId.value || null,
      sort: parseInt(form.sort.value) || 1,
      desc: form.desc.value.trim(),
    };
    if (!data.name) { App.toast('请输入部门名称', 'error'); return; }

    if (deptId) {
      DB.update('departments', deptId, data);
      DB.log(App.currentUser.name, '部门管理', `修改部门：${data.name}`);
    } else {
      data.id = DB.genId('D');
      DB.insert('departments', data);
      DB.log(App.currentUser.name, '部门管理', `新增部门：${data.name}`);
    }
    App.closeModal();
    App.toast('保存成功', 'success');
    renderOrgTab();
  }

  function deleteDept(deptId) {
    const childDepts = DB.getAll('departments').filter(d => d.parentId === deptId);
    const employees = DB.getAll('employees').filter(e => e.deptId === deptId && e.status === 'active');
    if (childDepts.length > 0 || employees.length > 0) {
      App.toast('该部门下存在子部门或员工，无法删除', 'error');
      return;
    }
    App.confirm('确定删除该部门吗？', () => {
      const dept = DB.getById('departments', deptId);
      DB.remove('departments', deptId);
      DB.log(App.currentUser.name, '部门管理', `删除部门：${dept.name}`);
      App.toast('删除成功', 'success');
      renderOrgTab();
    });
  }

  function renderPositionTab(container) {
    const positions = DB.getAll('positions');
    const depts = DB.getAll('departments');

    container.innerHTML = `
      <div class="flex justify-between mb-4">
        <h3 class="font-semibold">岗位列表</h3>
        <button class="btn btn-primary btn-sm" onclick="Admin.editPosition(null)">+ 新增岗位</button>
      </div>
      <table class="data-table">
        <thead>
          <tr><th>岗位名称</th><th>所属部门</th><th>关联指标</th><th>职责描述</th><th>操作</th></tr>
        </thead>
        <tbody>
          ${positions.map(p => {
            const dept = depts.find(d => d.id === p.deptId);
            const indicatorNames = (p.indicatorIds || []).map(id => App.getIndicatorName(id));
            return `<tr>
              <td class="font-semibold">${p.name}</td>
              <td>${dept ? dept.name : '-'}</td>
              <td>${indicatorNames.map(n => `<span class="tag tag-blue" style="margin:1px;">${n}</span>`).join('')}</td>
              <td class="text-sm text-tertiary">${(p.desc || '').substring(0, 40)}${p.desc && p.desc.length > 40 ? '...' : ''}</td>
              <td>
                <button class="btn btn-sm btn-link" onclick="Admin.editPosition('${p.id}')">编辑</button>
                <button class="btn btn-sm btn-link text-danger" onclick="Admin.deletePosition('${p.id}')">删除</button>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    `;
  }

  function editPosition(posId) {
    const pos = posId ? DB.getById('positions', posId) : null;
    const depts = DB.getAll('departments');
    const indicators = DB.getAll('indicators');

    const html = `
      <form id="posForm">
        <div class="form-group">
          <label class="form-label">岗位名称<span class="required">*</span></label>
          <input type="text" class="form-input" name="name" value="${pos ? pos.name : ''}" required>
        </div>
        <div class="form-group">
          <label class="form-label">所属部门<span class="required">*</span></label>
          <select class="form-select" name="deptId" required>
            <option value="">请选择</option>
            ${depts.map(d => `<option value="${d.id}" ${pos && pos.deptId === d.id ? 'selected' : ''}>${d.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">关联绩效指标（推荐指标）</label>
          <div class="checkbox-group" style="max-height:200px; overflow-y:auto;">
            ${indicators.map(ind => `
              <label class="checkbox-item">
                <input type="checkbox" name="indicators" value="${ind.id}" ${pos && (pos.indicatorIds || []).includes(ind.id) ? 'checked' : ''}>
                <span>${ind.name} <span class="text-tertiary text-sm">(${ind.category})</span></span>
              </label>
            `).join('')}
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">职责描述</label>
          <textarea class="form-textarea" name="desc">${pos ? (pos.desc || '') : ''}</textarea>
        </div>
      </form>
    `;

    App.showModal(pos ? '编辑岗位' : '新增岗位', html, `
      <button class="btn" onclick="App.closeModal()">取消</button>
      <button class="btn btn-primary" onclick="Admin.savePosition('${posId || ''}')">保存</button>
    `);
  }

  function savePosition(posId) {
    const form = document.getElementById('posForm');
    const indicatorIds = Array.from(form.querySelectorAll('input[name="indicators"]:checked')).map(cb => cb.value);
    const data = {
      name: form.name.value.trim(),
      deptId: form.deptId.value,
      desc: form.desc.value.trim(),
      indicatorIds,
    };
    if (!data.name || !data.deptId) { App.toast('请填写完整信息', 'error'); return; }

    if (posId) {
      DB.update('positions', posId, data);
      DB.log(App.currentUser.name, '岗位管理', `修改岗位：${data.name}`);
    } else {
      data.id = DB.genId('P');
      DB.insert('positions', data);
      DB.log(App.currentUser.name, '岗位管理', `新增岗位：${data.name}`);
    }
    App.closeModal();
    App.toast('保存成功', 'success');
    renderOrgTab();
  }

  function deletePosition(posId) {
    const employees = DB.getAll('employees').filter(e => e.positionId === posId && e.status === 'active');
    if (employees.length > 0) {
      App.toast('该岗位下存在员工，无法删除', 'error');
      return;
    }
    App.confirm('确定删除该岗位吗？', () => {
      const pos = DB.getById('positions', posId);
      DB.remove('positions', posId);
      DB.log(App.currentUser.name, '岗位管理', `删除岗位：${pos.name}`);
      App.toast('删除成功', 'success');
      renderOrgTab();
    });
  }

  function renderEmployeeTab(container) {
    const employees = DB.getAll('employees');
    const depts = DB.getAll('departments');

    container.innerHTML = `
      <div class="flex justify-between mb-4">
        <div class="filter-bar">
          <div class="form-group">
            <label class="form-label">搜索</label>
            <input type="text" class="form-input" id="empSearch" placeholder="姓名/工号" oninput="Admin.filterEmployees()">
          </div>
          <div class="form-group">
            <label class="form-label">部门</label>
            <select class="form-select" id="empDeptFilter" onchange="Admin.filterEmployees()">
              <option value="">全部部门</option>
              ${depts.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">状态</label>
            <select class="form-select" id="empStatusFilter" onchange="Admin.filterEmployees()">
              <option value="">全部</option>
              <option value="active">在职</option>
              <option value="resigned">离职</option>
            </select>
          </div>
        </div>
        <div>
          <button class="btn btn-primary btn-sm" onclick="Admin.editEmployee(null)">+ 新增员工</button>
        </div>
      </div>
      <table class="data-table" id="empTable">
        <thead>
          <tr><th>工号</th><th>姓名</th><th>部门</th><th>岗位</th><th>上级主管</th><th>角色</th><th>状态</th><th>入职日期</th><th>操作</th></tr>
        </thead>
        <tbody>
          ${renderEmployeeRows(employees)}
        </tbody>
      </table>
    `;
  }

  function renderEmployeeRows(employees) {
    return employees.map(e => {
      const dept = DB.getById('departments', e.deptId);
      const pos = DB.getById('positions', e.positionId);
      const superior = e.superiorId ? DB.getById('employees', e.superiorId) : null;
      const roleMap = { employee: '员工', supervisor: '上级主管', hr: 'HR管理员', sysadmin: '系统管理员', admin: '总经理' };
      return `<tr>
        <td>${e.empNo}</td>
        <td class="font-semibold">${e.name}</td>
        <td>${dept ? dept.name : '-'}</td>
        <td>${pos ? pos.name : '-'}</td>
        <td>${superior ? superior.name : '-'}</td>
        <td><span class="tag ${e.role === 'hr' ? 'tag-purple' : e.role === 'supervisor' ? 'tag-green' : e.role === 'sysadmin' ? 'tag-orange' : e.role === 'admin' ? 'tag-red' : 'tag-gray'}">${roleMap[e.role] || e.role}</span></td>
        <td><span class="status-tag ${e.status === 'active' ? 'status-active' : 'status-pending'}">${e.status === 'active' ? '在职' : '离职'}</span></td>
        <td class="text-sm">${e.hireDate}</td>
        <td>
          <button class="btn btn-sm btn-link" onclick="Admin.editEmployee('${e.id}')">编辑</button>
          <button class="btn btn-sm btn-link" onclick="Admin.resetPassword('${e.id}')">重置密码</button>
          ${e.status === 'active' ? `<button class="btn btn-sm btn-link text-warning" onclick="Admin.toggleEmpStatus('${e.id}')">离职</button>` : ''}
          <button class="btn btn-sm btn-link text-danger" onclick="Admin.deleteEmployee('${e.id}')">删除</button>
        </td>
      </tr>`;
    }).join('');
  }

  function filterEmployees() {
    const search = document.getElementById('empSearch').value.toLowerCase();
    const deptFilter = document.getElementById('empDeptFilter').value;
    const statusFilter = document.getElementById('empStatusFilter').value;
    let employees = DB.getAll('employees');
    if (search) employees = employees.filter(e => e.name.toLowerCase().includes(search) || e.empNo.includes(search));
    if (deptFilter) employees = employees.filter(e => e.deptId === deptFilter);
    if (statusFilter) employees = employees.filter(e => e.status === statusFilter);
    document.querySelector('#empTable tbody').innerHTML = renderEmployeeRows(employees);
  }

  function editEmployee(empId) {
    const emp = empId ? DB.getById('employees', empId) : null;
    const depts = DB.getAll('departments');
    const positions = DB.getAll('positions');
    const employees = DB.getAll('employees').filter(e => e.status === 'active' && e.id !== empId);

    const html = `
      <form id="empForm">
        <div class="flex gap-4">
          <div class="form-group flex-1">
            <label class="form-label">工号<span class="required">*</span></label>
            <input type="text" class="form-input" name="empNo" value="${emp ? emp.empNo : ''}" required>
          </div>
          <div class="form-group flex-1">
            <label class="form-label">姓名<span class="required">*</span></label>
            <input type="text" class="form-input" name="name" value="${emp ? emp.name : ''}" required>
          </div>
        </div>
        <div class="flex gap-4">
          <div class="form-group flex-1">
            <label class="form-label">部门<span class="required">*</span></label>
            <select class="form-select" name="deptId" required onchange="Admin.updatePositionOptions()">
              <option value="">请选择</option>
              ${depts.map(d => `<option value="${d.id}" ${emp && emp.deptId === d.id ? 'selected' : ''}>${d.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group flex-1">
            <label class="form-label">岗位<span class="required">*</span></label>
            <select class="form-select" name="positionId" required id="positionSelect">
              <option value="">请选择</option>
              ${positions.map(p => `<option value="${p.id}" ${emp && emp.positionId === p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="flex gap-4">
          <div class="form-group flex-1">
            <label class="form-label">上级主管<span class="required">*</span></label>
            <select class="form-select" name="superiorId" required>
              <option value="">请选择</option>
              ${employees.map(e => `<option value="${e.id}" ${emp && emp.superiorId === e.id ? 'selected' : ''}>${e.name}（${e.empNo}）</option>`).join('')}
            </select>
          </div>
          <div class="form-group flex-1">
            <label class="form-label">系统角色</label>
            <select class="form-select" name="role">
              <option value="employee" ${emp && emp.role === 'employee' ? 'selected' : ''}>普通员工</option>
              <option value="supervisor" ${emp && emp.role === 'supervisor' ? 'selected' : ''}>上级主管</option>
              <option value="hr" ${emp && emp.role === 'hr' ? 'selected' : ''}>HR管理员</option>
              <option value="sysadmin" ${emp && emp.role === 'sysadmin' ? 'selected' : ''}>系统管理员</option>
              <option value="admin" ${emp && emp.role === 'admin' ? 'selected' : ''}>总经理</option>
            </select>
          </div>
        </div>
        <div class="flex gap-4">
          <div class="form-group flex-1">
            <label class="form-label">入职日期<span class="required">*</span></label>
            <input type="date" class="form-input" name="hireDate" value="${emp ? emp.hireDate : ''}" required>
          </div>
          <div class="form-group flex-1">
            <label class="form-label">手机号</label>
            <input type="text" class="form-input" name="phone" value="${emp ? emp.phone || '' : ''}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">邮箱</label>
          <input type="email" class="form-input" name="email" value="${emp ? emp.email || '' : ''}">
        </div>
        <div class="form-group">
          <label class="form-label">员工标签</label>
          <input type="text" class="form-input" name="tags" value="${emp && emp.tags ? emp.tags.join(',') : ''}" placeholder="多个标签用逗号分隔，如：核心骨干,高潜,新员工">
          <div class="text-sm text-tertiary mt-1">标签用于快速筛选被考核人范围</div>
        </div>
        <div class="card mt-4" style="background:var(--bg-page);">
          <div class="card-body">
            <div class="flex items-center justify-between mb-2">
              <h4 style="margin:0;">🔀 兼任岗位设置</h4>
              <label class="flex items-center gap-1 text-sm">
                <input type="checkbox" name="hasConcurrent" ${emp && emp.concurrentPositionId ? 'checked' : ''} onchange="Admin.toggleConcurrentPosition()">
                <span>启用兼任岗位</span>
              </label>
            </div>
            <div id="concurrentSection" style="display:${emp && emp.concurrentPositionId ? 'block' : 'none'};">
              <div class="flex gap-4">
                <div class="form-group flex-1">
                  <label class="form-label">兼任岗位</label>
                  <select class="form-select" name="concurrentPositionId" id="concurrentPositionSelect">
                    <option value="">请选择</option>
                    ${positions.map(p => `<option value="${p.id}" ${emp && emp.concurrentPositionId === p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group" style="width:140px;">
                  <label class="form-label">兼任权重(%)</label>
                  <input type="number" class="form-input" name="concurrentWeight" value="${emp && emp.concurrentWeight ? emp.concurrentWeight : 30}" min="1" max="99" style="text-align:center;">
                </div>
              </div>
              <div class="text-sm text-tertiary">本职权重 = 100% - 兼任权重。如兼任30%，则本职70%。两岗位将分别评价后按权重加权计算总分。</div>
            </div>
          </div>
        </div>
      </form>
    `;

    App.showModal(emp ? '编辑员工' : '新增员工', html, `
      <button class="btn" onclick="App.closeModal()">取消</button>
      <button class="btn btn-primary" onclick="Admin.saveEmployee('${empId || ''}')">保存</button>
    `);
  }

  function updatePositionOptions() {
    const deptId = document.getElementById('empForm').deptId.value;
    const positions = DB.getAll('positions').filter(p => p.deptId === deptId);
    const select = document.getElementById('positionSelect');
    select.innerHTML = '<option value="">请选择</option>' + positions.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
  }

  function toggleConcurrentPosition() {
    const cb = document.querySelector('input[name="hasConcurrent"]');
    const section = document.getElementById('concurrentSection');
    if (cb && section) section.style.display = cb.checked ? 'block' : 'none';
  }

  function saveEmployee(empId) {
    const form = document.getElementById('empForm');
    const data = {
      empNo: form.empNo.value.trim(),
      name: form.name.value.trim(),
      deptId: form.deptId.value,
      positionId: form.positionId.value,
      superiorId: form.superiorId.value || null,
      role: form.role.value,
      hireDate: form.hireDate.value,
      phone: form.phone.value.trim(),
      email: form.email.value.trim(),
      tags: form.tags.value.trim() ? form.tags.value.split(',').map(t => t.trim()).filter(Boolean) : [],
      status: 'active',
    };

    // 兼任岗位
    const hasConcurrent = form.hasConcurrent && form.hasConcurrent.checked;
    if (hasConcurrent) {
      const concurrentPositionId = form.concurrentPositionId.value;
      const concurrentWeight = parseInt(form.concurrentWeight.value) || 30;
      if (!concurrentPositionId) {
        App.toast('请选择兼任岗位', 'error');
        return;
      }
      if (concurrentPositionId === data.positionId) {
        App.toast('兼任岗位不能与本职岗位相同', 'error');
        return;
      }
      if (concurrentWeight < 1 || concurrentWeight > 99) {
        App.toast('兼任权重需在1~99之间', 'error');
        return;
      }
      data.concurrentPositionId = concurrentPositionId;
      data.concurrentWeight = concurrentWeight;
    } else {
      data.concurrentPositionId = null;
      data.concurrentWeight = 0;
    }
    if (!data.empNo || !data.name || !data.deptId || !data.positionId) {
      App.toast('请填写必填项', 'error');
      return;
    }

    if (empId) {
      DB.update('employees', empId, data);
      DB.log(App.currentUser.name, '员工管理', `修改员工信息：${data.name}(${data.empNo})`);
    } else {
      data.id = DB.genId('E');
      data.password = '123456';
      DB.insert('employees', data);
      DB.log(App.currentUser.name, '员工管理', `新增员工：${data.name}(${data.empNo})，初始密码123456`);
    }
    App.closeModal();
    App.toast('保存成功', 'success');
    renderOrgTab();
  }

  function resetPassword(empId) {
    const emp = DB.getById('employees', empId);
    App.confirm(`确定将 ${emp.name} 的密码重置为 123456 吗？`, () => {
      DB.update('employees', empId, { password: '123456' });
      DB.log(App.currentUser.name, '员工管理', `重置员工密码：${emp.name}(${emp.empNo})`);
      App.toast('密码已重置为 123456', 'success');
    });
  }

  function toggleEmpStatus(empId) {
    const emp = DB.getById('employees', empId);
    App.confirm(`确定将 ${emp.name} 设为离职状态吗？离职后将不参与后续考核。`, () => {
      DB.update('employees', empId, { status: 'resigned' });
      DB.log(App.currentUser.name, '员工管理', `员工离职：${emp.name}(${emp.empNo})`);
      App.toast('操作成功', 'success');
      renderOrgTab();
    });
  }

  function deleteEmployee(empId) {
    const emp = DB.getById('employees', empId);
    if (!emp) return;

    // 检查是否有下属
    const subordinates = DB.getAll('employees').filter(e => e.superiorId === empId);
    if (subordinates.length > 0) {
      App.toast('该员工下还有下属（' + subordinates.length + '人），请先调整下属的直接上级后再删除', 'error');
      return;
    }

    // 检查是否有未完成的考核任务
    const activeTasks = DB.getAll('assessmentTasks').filter(t => t.employeeId === empId && !['completed', 'rejected'].includes(t.status));
    if (activeTasks.length > 0) {
      App.toast('该员工有 ' + activeTasks.length + ' 个未完成的考核任务，无法删除', 'error');
      return;
    }

    App.confirm('确定删除员工 ' + emp.name + '（' + emp.empNo + '）吗？\n删除后不可恢复，该员工的历史考核记录也将一并删除。', () => {
      // 删除关联考核任务
      const tasks = DB.getAll('assessmentTasks').filter(t => t.employeeId === empId);
      tasks.forEach(t => DB.remove('assessmentTasks', t.id));
      // 删除员工
      DB.remove('employees', empId);
      DB.log(App.currentUser.name, '员工管理', '删除员工：' + emp.name + '(' + emp.empNo + ')，关联考核任务' + tasks.length + '条');
      App.toast('删除成功', 'success');
      renderOrgTab();
    });
  }

  function renderPermissionTab(container) {
    const roles = [
      { id: 'employee', name: '普通员工', desc: '查看公告、自评打分、查询结果、打印绩效表' },
      { id: 'supervisor', name: '上级主管', desc: '包含员工权限 + 上级评价' },
      { id: 'hr', name: 'HR管理员', desc: '指标库维护、考核方案配置、校准、统计分析、组织人员管理' },
      { id: 'sysadmin', name: '系统管理员', desc: '权限分配、日志审计、数据备份、系统公告管理' },
      { id: 'admin', name: '总经理', desc: '全部管理权限' },
    ];

    // Module key → actual nav page key mapping
    var moduleNavMap = {
      'home': ['home', 'emp-home', 'admin-home'],
      'indicator': ['indicator-config'],
      'self-eval': ['self-eval'],
      'result': ['result-query'],
      'print': ['print'],
      'org': ['admin-org'],
      'indicators-lib': ['admin-indicators'],
      'plans': ['admin-plans'],
      'tasks': ['admin-tasks', 'hr-review'],
      'calibration': ['admin-calibration'],
      'stats': ['admin-stats'],
      'config': ['admin-config'],
      'supervisor-eval': ['supervisor-eval'],
    };

    var modules = [
      { key: 'home', name: '首页/工作台' },
      { key: 'indicator', name: '绩效指标配置' },
      { key: 'self-eval', name: '绩效自评' },
      { key: 'result', name: '绩效结果查询' },
      { key: 'print', name: '绩效打印' },
      { key: 'org', name: '组织与人员管理' },
      { key: 'indicators-lib', name: '指标库管理' },
      { key: 'plans', name: '考核方案管理' },
      { key: 'tasks', name: '考核计划与执行' },
      { key: 'calibration', name: '绩效校准' },
      { key: 'stats', name: '统计分析' },
      { key: 'config', name: '系统配置' },
      { key: 'supervisor-eval', name: '上级评价' },
    ];

    // Default permissions (matches original hardcoded values)
    var defaultPerms = {
      'home': { employee: true, supervisor: true, hr: true, sysadmin: true, admin: true },
      'indicator': { employee: true, supervisor: true, hr: false, sysadmin: false, admin: false },
      'self-eval': { employee: true, supervisor: true, hr: true, sysadmin: true, admin: true },
      'result': { employee: true, supervisor: true, hr: true, sysadmin: true, admin: true },
      'print': { employee: true, supervisor: true, hr: true, sysadmin: true, admin: true },
      'org': { employee: false, supervisor: false, hr: true, sysadmin: true, admin: true },
      'indicators-lib': { employee: false, supervisor: false, hr: true, sysadmin: false, admin: true },
      'plans': { employee: false, supervisor: false, hr: true, sysadmin: false, admin: true },
      'tasks': { employee: false, supervisor: true, hr: true, sysadmin: false, admin: true },
      'calibration': { employee: false, supervisor: false, hr: true, sysadmin: false, admin: true },
      'stats': { employee: false, supervisor: true, hr: true, sysadmin: true, admin: true },
      'config': { employee: false, supervisor: false, hr: false, sysadmin: true, admin: true },
      'supervisor-eval': { employee: false, supervisor: true, hr: false, sysadmin: false, admin: false },
    };

    // Load saved permissions from DB
    var savedPerms = DB.getSetting('rolePermissions') || {};
    // Merge defaults with saved
    var currentPerms = {};
    modules.forEach(function(m) {
      currentPerms[m.key] = {};
      roles.forEach(function(r) {
        var savedVal = savedPerms[m.key] && savedPerms[m.key][r.id] !== undefined ? savedPerms[m.key][r.id] : null;
        currentPerms[m.key][r.id] = savedVal !== null ? savedVal : (defaultPerms[m.key] && defaultPerms[m.key][r.id] !== undefined ? defaultPerms[m.key][r.id] : false);
      });
    });

    container.innerHTML = `
      <div class="alert alert-info">
        <span>💡 勾选对应模块来控制各角色导航栏可见的页面。修改后点击「保存权限」生效。</span>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>角色</th>
            <th>权限范围</th>
          </tr>
        </thead>
        <tbody>
          ${roles.map(r => `<tr>
            <td><span class="tag ${r.id === 'hr' ? 'tag-purple' : r.id === 'supervisor' ? 'tag-green' : r.id === 'sysadmin' ? 'tag-orange' : r.id === 'admin' ? 'tag-red' : 'tag-gray'}">${r.name}</span></td>
            <td class="text-sm">${r.desc}</td>
          </tr>`).join('')}
        </tbody>
      </table>

      <div class="flex justify-between items-center mt-4 mb-2">
        <h3 class="font-semibold">页面权限矩阵</h3>
        <button class="btn btn-primary btn-sm" onclick="Admin.savePermissionMatrix()">💾 保存权限</button>
      </div>
      <table class="data-table" id="permMatrixTable">
        <thead>
          <tr>
            <th>功能模块</th>
            ${roles.map(r => '<th style="text-align:center;">' + r.name + '</th>').join('')}
          </tr>
        </thead>
        <tbody>
          ${modules.map(m => {
            return '<tr>' +
              '<td class="font-semibold">' + m.name + '</td>' +
              roles.map(r => {
                var checked = currentPerms[m.key][r.id] ? ' checked' : '';
                return '<td style="text-align:center;"><input type="checkbox" data-module="' + m.key + '" data-role="' + r.id + '"' + checked + ' style="width:18px;height:18px;cursor:pointer;"></td>';
              }).join('') +
            '</tr>';
          }).join('')}
        </tbody>
      </table>
    `;
  }

  function savePermissionMatrix() {
    var perms = { _updatedAt: Date.now() };
    document.querySelectorAll('#permMatrixTable input[type="checkbox"]').forEach(function(cb) {
      var mod = cb.dataset.module;
      var role = cb.dataset.role;
      if (!perms[mod]) perms[mod] = {};
      perms[mod][role] = cb.checked;
    });
    DB.setSetting('rolePermissions', perms);
    DB.log(App.currentUser.name, '权限配置', '更新页面权限矩阵');
    // 保存后立即重渲染导航，无需重新登录
    if (typeof App.renderApp === 'function') {
      App.renderApp();
    }
    App.toast('权限配置已保存', 'success');
  }

  // ========== 指标库管理 ==========
  function renderIndicatorLibrary(container) {
    const indicators = DB.getAll('indicators');
    const categories = [...new Set(indicators.map(i => i.category))];

    container.innerHTML = `
      <div class="flex justify-between mb-4">
        <div class="filter-bar">
          <div class="form-group">
            <label class="form-label">分类</label>
            <select class="form-select" id="indCategoryFilter" onchange="Admin.filterIndicators()">
              <option value="">全部分类</option>
              ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">搜索</label>
            <input type="text" class="form-input" id="indSearch" placeholder="指标名称" oninput="Admin.filterIndicators()">
          </div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="Admin.editIndicator(null)">+ 新增指标</button>
      </div>
      <table class="data-table" id="indTable">
        <thead>
          <tr><th>指标名称</th><th>分类</th><th>考核周期</th><th>计算公式</th><th>取值范围</th><th>适用岗位</th><th>操作</th></tr>
        </thead>
        <tbody>
          ${indicators.map(ind => {
            const positions = (ind.applicablePositions || []).map(pid => App.getPositionName(pid));
            return `<tr>
              <td class="font-semibold">${ind.name}</td>
              <td><span class="tag tag-blue">${ind.category}</span></td>
              <td>${ind.cycle}</td>
              <td class="text-sm text-tertiary">${ind.formula}</td>
              <td class="text-sm">${ind.minRate}% ~ ${ind.maxRate}%</td>
              <td class="text-sm">${positions.map(p => `<span class="tag tag-gray" style="margin:1px;">${p}</span>`).join('')}</td>
              <td>
                <button class="btn btn-sm btn-link" onclick="Admin.editIndicator('${ind.id}')">编辑</button>
                <button class="btn btn-sm btn-link text-danger" onclick="Admin.deleteIndicator('${ind.id}')">删除</button>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    `;
  }

  function filterIndicators() {
    const category = document.getElementById('indCategoryFilter').value;
    const search = document.getElementById('indSearch').value.toLowerCase();
    let indicators = DB.getAll('indicators');
    if (category) indicators = indicators.filter(i => i.category === category);
    if (search) indicators = indicators.filter(i => i.name.toLowerCase().includes(search));
    document.querySelector('#indTable tbody').innerHTML = indicators.map(ind => {
      const positions = (ind.applicablePositions || []).map(pid => App.getPositionName(pid));
      return `<tr>
        <td class="font-semibold">${ind.name}</td>
        <td><span class="tag tag-blue">${ind.category}</span></td>
        <td>${ind.cycle}</td>
        <td class="text-sm text-tertiary">${ind.formula}</td>
        <td class="text-sm">${ind.minRate}% ~ ${ind.maxRate}%</td>
        <td class="text-sm">${positions.map(p => `<span class="tag tag-gray" style="margin:1px;">${p}</span>`).join('')}</td>
        <td>
          <button class="btn btn-sm btn-link" onclick="Admin.editIndicator('${ind.id}')">编辑</button>
          <button class="btn btn-sm btn-link text-danger" onclick="Admin.deleteIndicator('${ind.id}')">删除</button>
        </td>
      </tr>`;
    }).join('');
  }

  function editIndicator(indId) {
    const ind = indId ? DB.getById('indicators', indId) : null;
    const positions = DB.getAll('positions');

    const html = `
      <form id="indForm">
        <div class="flex gap-4">
          <div class="form-group flex-1">
            <label class="form-label">指标名称<span class="required">*</span></label>
            <input type="text" class="form-input" name="name" value="${ind ? ind.name : ''}" required>
          </div>
          <div class="form-group" style="width:150px;">
            <label class="form-label">分类<span class="required">*</span></label>
            <input type="text" class="form-input" name="category" value="${ind ? ind.category : ''}" list="categoryList" required>
            <datalist id="categoryList">
              <option value="业绩"><option value="管理"><option value="质量"><option value="效率"><option value="服务"><option value="战略"><option value="财务">
            </datalist>
          </div>
          <div class="form-group" style="width:120px;">
            <label class="form-label">考核周期<span class="required">*</span></label>
            <select class="form-select" name="cycle">
              <option value="月" ${ind && ind.cycle === '月' ? 'selected' : ''}>月</option>
              <option value="季" ${ind && ind.cycle === '季' ? 'selected' : ''}>季</option>
              <option value="年" ${ind && ind.cycle === '年' ? 'selected' : ''}>年</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">计算公式</label>
          <input type="text" class="form-input" name="formula" value="${ind ? ind.formula || '' : ''}" placeholder="如：实际销售额/目标销售额×100%">
        </div>
        <div class="flex gap-4">
          <div class="form-group" style="width:150px;">
            <label class="form-label">完成率下限(%)<span class="required">*</span></label>
            <input type="number" class="form-input" name="minRate" value="${ind ? ind.minRate : 70}" min="0" max="100" required>
          </div>
          <div class="form-group" style="width:150px;">
            <label class="form-label">完成率上限(%)<span class="required">*</span></label>
            <input type="number" class="form-input" name="maxRate" value="${ind ? ind.maxRate : 120}" min="100" required>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">评分标准说明<span class="required">*</span></label>
          <textarea class="form-textarea" name="standard" required>${ind ? ind.standard || '' : ''}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">适用岗位（推荐）</label>
          <div class="checkbox-group" style="max-height:150px; overflow-y:auto;">
            ${positions.map(p => `
              <label class="checkbox-item">
                <input type="checkbox" name="positions" value="${p.id}" ${ind && (ind.applicablePositions || []).includes(p.id) ? 'checked' : ''}>
                <span>${p.name}</span>
              </label>
            `).join('')}
          </div>
        </div>
      </form>
    `;

    App.showModal(ind ? '编辑指标' : '新增指标', html, `
      <button class="btn" onclick="App.closeModal()">取消</button>
      <button class="btn btn-primary" onclick="Admin.saveIndicator('${indId || ''}')">保存</button>
    `);
  }

  function saveIndicator(indId) {
    const form = document.getElementById('indForm');
    const applicablePositions = Array.from(form.querySelectorAll('input[name="positions"]:checked')).map(cb => cb.value);
    const data = {
      name: form.name.value.trim(),
      category: form.category.value.trim(),
      cycle: form.cycle.value,
      formula: form.formula.value.trim(),
      minRate: parseInt(form.minRate.value),
      maxRate: parseInt(form.maxRate.value),
      standard: form.standard.value.trim(),
      applicablePositions,
    };
    if (!data.name || !data.category || !data.standard) { App.toast('请填写必填项', 'error'); return; }

    if (indId) {
      DB.update('indicators', indId, data);
      DB.log(App.currentUser.name, '指标库管理', `修改指标：${data.name}`);
    } else {
      data.id = DB.genId('I');
      DB.insert('indicators', data);
      DB.log(App.currentUser.name, '指标库管理', `新增指标：${data.name}`);
    }
    App.closeModal();
    App.toast('保存成功', 'success');
    renderIndicatorLibrary(document.getElementById('contentArea'));
  }

  function deleteIndicator(indId) {
    App.confirm('确定删除该指标吗？', () => {
      const ind = DB.getById('indicators', indId);
      DB.remove('indicators', indId);
      DB.log(App.currentUser.name, '指标库管理', `删除指标：${ind.name}`);
      App.toast('删除成功', 'success');
      renderIndicatorLibrary(document.getElementById('contentArea'));
    });
  }

  // ========== 考核方案管理 ==========
  function renderAssessmentPlans(container) {
    const plans = DB.getAll('assessmentPlans');

    container.innerHTML = `
      <div class="flex justify-between mb-4">
        <h3 class="font-semibold">考核方案列表</h3>
        <button class="btn btn-primary btn-sm" onclick="Admin.editPlan(null)">+ 新建考核方案</button>
      </div>
      <div class="stat-grid">
        ${plans.map(plan => {
          const taskCount = DB.getAll('assessmentTasks').filter(t => t.planId === plan.id).length;
          const completedCount = DB.getAll('assessmentTasks').filter(t => t.planId === plan.id && t.status === 'completed').length;
          return `
            <div class="card" style="cursor:pointer;" onclick="Admin.viewPlan('${plan.id}')">
              <div class="card-body">
                <div class="flex items-center justify-between mb-2">
                  <h3 class="font-semibold">${plan.name}</h3>
                  <span class="status-tag ${plan.status === 'active' ? 'status-active' : 'status-completed'}">${plan.status === 'active' ? '进行中' : '已结束'}</span>
                </div>
                <div class="flex gap-4 text-sm mb-4">
                  <span><span class="text-tertiary">评分模式：</span>${plan.scoreMode === 'percentage' ? '百分制' : '等级制'}</span>
                  <span><span class="text-tertiary">联薪方式：</span>${plan.salaryMode === 'coefficient' ? '系数制' : '等级制'}</span>
                </div>
                <div class="flex gap-4">
                  <div class="flex-1 p-2" style="background:var(--bg-page); border-radius:4px; text-align:center;">
                    <div class="text-lg font-bold">${taskCount}</div>
                    <div class="text-sm text-tertiary">参与人数</div>
                  </div>
                  <div class="flex-1 p-2" style="background:var(--success-bg); border-radius:4px; text-align:center;">
                    <div class="text-lg font-bold text-success">${completedCount}</div>
                    <div class="text-sm text-tertiary">已完成</div>
                  </div>
                  <div class="flex-1 p-2" style="background:var(--primary-light); border-radius:4px; text-align:center;">
                    <div class="text-lg font-bold text-primary">${taskCount > 0 ? Math.round(completedCount/taskCount*100) : 0}%</div>
                    <div class="text-sm text-tertiary">完成率</div>
                  </div>
                </div>
                <div class="flex gap-2 mt-3" onclick="event.stopPropagation()">
                  ${plan.status === 'active' ? `<button class="btn btn-sm btn-primary" onclick="Admin.endPlan('${plan.id}')">结束</button>` : ''}
                  <button class="btn btn-sm btn-link" onclick="Admin.editPlan('${plan.id}')">编辑</button>
                  <button class="btn btn-sm btn-link text-danger" onclick="Admin.deletePlan('${plan.id}')">删除</button>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function viewPlan(planId) {
    const plan = DB.getById('assessmentPlans', planId);
    const tasks = DB.getAll('assessmentTasks').filter(t => t.planId === planId);

    const html = `
      <div class="flex gap-4 mb-4">
        <div class="flex-1 p-4" style="background:var(--bg-page); border-radius:8px;">
          <div class="text-sm text-tertiary">方案名称</div>
          <div class="font-semibold">${plan.name}</div>
        </div>
        <div class="flex-1 p-4" style="background:var(--bg-page); border-radius:8px;">
          <div class="text-sm text-tertiary">评分模式</div>
          <div class="font-semibold">${plan.scoreMode === 'percentage' ? '百分制' : '等级制'}</div>
        </div>
        <div class="flex-1 p-4" style="background:var(--bg-page); border-radius:8px;">
          <div class="text-sm text-tertiary">联薪方式</div>
          <div class="font-semibold">${plan.salaryMode === 'coefficient' ? '系数制' : '等级制'}</div>
        </div>
      </div>

      ${plan.scoreMode === 'grade' ? `
        <h4 class="font-semibold mb-2">等级规则</h4>
        <table class="data-table mb-4">
          <thead><tr><th>等级</th><th>含义</th><th>系数</th></tr></thead>
          <tbody>
            ${plan.gradeRules.map(r => `<tr>
              <td><span class="grade-display grade-${r.grade}" style="font-size:16px;">${r.grade}</span></td>
              <td>${r.label}</td>
              <td>${r.coefficient}</td>
            </tr>`).join('')}
          </tbody>
        </table>

        <h4 class="font-semibold mb-2">分布限制</h4>
        <div class="flex gap-4 mb-4">
          ${Object.entries(plan.distributionLimit || {}).map(([grade, limit]) => `
            <div class="p-2" style="background:var(--bg-page); border-radius:4px; text-align:center; min-width:80px;">
              <div class="grade-display grade-${grade}" style="font-size:14px;">${grade}</div>
              <div class="text-sm">${limit}%</div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <h4 class="font-semibold mb-2">考核流程</h4>
      <div class="steps mb-4">
        ${plan.flow.map((step, i) => {
          const flowLabels = { self_eval: '自评', hr_review: 'HR审核', supervisor_eval: '上级评', calibration: '校准', confirm: '结果确认' };
          return `${i > 0 ? '<div class="step-line"></div>' : ''}<div class="step done"><div class="step-num">${i+1}</div><span>${flowLabels[step] || step}</span></div>`;
        }).join('')}
      </div>

      <h4 class="font-semibold mb-2">参与员工 (${tasks.length}人)</h4>
      <table class="data-table">
        <thead><tr><th>工号</th><th>姓名</th><th>部门</th><th>状态</th><th>得分</th><th>等级</th></tr></thead>
        <tbody>
          ${tasks.map(t => {
            const emp = DB.getById('employees', t.employeeId);
            const dept = emp ? DB.getById('departments', emp.deptId) : null;
            return `<tr>
              <td>${emp ? emp.empNo : '-'}</td>
              <td class="font-semibold">${emp ? emp.name : '-'}</td>
              <td>${dept ? dept.name : '-'}</td>
              <td><span class="status-tag ${App.getTaskStatusClass(t.status)}">${App.getTaskStatusText(t.status)}</span></td>
              <td>${t.finalScore ? t.finalScore.toFixed(2) : '-'}</td>
              <td>${t.finalGrade ? `<span class="grade-display grade-${t.finalGrade}" style="font-size:14px;">${t.finalGrade}</span>` : '-'}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    `;

    const footerBtns = `
      <button class="btn" onclick="App.closeModal()">关闭</button>
      ${plan.status === 'active' ? `<button class="btn btn-primary" onclick="Admin.endPlan('${planId}')">结束方案</button>` : ''}
      <button class="btn btn-link" onclick="Admin.editPlan('${planId}')">编辑</button>
      <button class="btn btn-danger" onclick="Admin.deletePlan('${planId}')">删除</button>
    `;
    App.showModal('考核方案详情', html, footerBtns, 'lg');
  }

  // 结束考核方案
  function endPlan(planId) {
    const plan = DB.getById('assessmentPlans', planId);
    const tasks = DB.getAll('assessmentTasks').filter(t => t.planId === planId);
    const unfinishedCount = tasks.filter(t => t.status !== 'completed').length;

    let warnMsg = `确认结束「${plan.name}」？结束後方案将标记为"已结束"，不可再基于此方案生成新的考核计划。`;
    if (unfinishedCount > 0) {
      warnMsg += `\n\n注意：该方案下还有 ${unfinishedCount} 个考核任务未完成，结束后这些任务仍可继续操作。`;
    }

    App.confirm(warnMsg, () => {
      DB.update('assessmentPlans', planId, { status: 'completed' });
      DB.log(App.currentUser.name, '考核方案', `结束考核方案：${plan.name}`);
      App.closeModal();
      App.toast('方案已结束', 'success');
      renderAssessmentPlans(document.getElementById('contentArea'));
    });
  }

  // 删除考核方案
  function deletePlan(planId) {
    const plan = DB.getById('assessmentPlans', planId);
    const tasks = DB.getAll('assessmentTasks').filter(t => t.planId === planId);

    if (tasks.length > 0) {
      App.toast('该方案下已有考核任务，无法删除。如需终止请使用"结束方案"', 'error');
      return;
    }

    App.confirm(`确认删除考核方案「${plan.name}」？此操作不可恢复。`, () => {
      DB.remove('assessmentPlans', planId);
      DB.log(App.currentUser.name, '考核方案', `删除考核方案：${plan.name}`);
      App.closeModal();
      App.toast('方案已删除', 'success');
      renderAssessmentPlans(document.getElementById('contentArea'));
    });
  }

  function editPlan(planId) {
    const plan = planId ? DB.getById('assessmentPlans', planId) : null;
    const depts = DB.getAll('departments');

    const html = `
      <form id="planForm">
        <div class="form-group">
          <label class="form-label">方案名称<span class="required">*</span></label>
          <input type="text" class="form-input" name="name" value="${plan ? plan.name : ''}" placeholder="如：月度销售绩效考核方案" required>
        </div>
        <div class="flex gap-4">
          <div class="form-group" style="width:150px;">
            <label class="form-label">评分模式</label>
            <select class="form-select" name="scoreMode" onchange="Admin.onPlanScoreModeChange()">
              <option value="percentage" ${plan && plan.scoreMode === 'percentage' ? 'selected' : ''}>百分制</option>
              <option value="grade" ${plan && plan.scoreMode === 'grade' ? 'selected' : ''}>等级制</option>
            </select>
          </div>
          <div class="form-group" style="width:150px;">
            <label class="form-label">联薪方式</label>
            <select class="form-select" name="salaryMode" id="planSalaryMode">
              <option value="coefficient" ${plan && plan.salaryMode === 'coefficient' ? 'selected' : ''}>系数制</option>
              <option value="grade" ${plan && plan.salaryMode === 'grade' ? 'selected' : ''}>等级制</option>
            </select>
          </div>
        </div>

        <div id="gradeRulesSection">
          <h4 class="font-semibold mb-2">等级规则配置</h4>
        <table class="data-table mb-4">
          <thead><tr><th>等级</th><th>含义</th><th>系数</th><th>占比上限(%)</th></tr></thead>
          <tbody id="gradeRulesBody">
            ${(plan ? plan.gradeRules : [
              { grade: 'A', label: '卓越', coefficient: 1.2 },
              { grade: 'B', label: '优秀', coefficient: 1.1 },
              { grade: 'C', label: '合格', coefficient: 1.0 },
              { grade: 'D', label: '待改进', coefficient: 0.9 },
              { grade: 'E', label: '不合格', coefficient: 0.8 },
            ]).map((r, i) => {
              const limit = plan && plan.distributionLimit ? plan.distributionLimit[r.grade] : '';
              return `<tr>
                <td><span class="grade-display grade-${r.grade}" style="font-size:16px;">${r.grade}</span></td>
                <td><input type="text" class="form-input" value="${r.label}" style="width:100px;"></td>
                <td><input type="number" class="form-input" value="${r.coefficient}" step="0.1" style="width:80px;"></td>
                <td><input type="number" class="form-input" value="${limit}" style="width:80px;"></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
        </div>

        <div class="alert alert-info">
          <span>📋 考核流程：自评 → HR审核 → 上级评 → 校准 → 结果确认</span>
        </div>
      </form>
    `;

    App.showModal(plan ? '编辑考核方案' : '新建考核方案', html, `
      <button class="btn" onclick="App.closeModal()">取消</button>
      <button class="btn btn-primary" onclick="Admin.savePlan('${planId || ''}')">保存</button>
    `, 'lg');

    // 初始化评分模式联动
    setTimeout(() => onPlanScoreModeChange(), 50);
  }

  function onPlanScoreModeChange() {
    const scoreMode = document.querySelector('select[name="scoreMode"]');
    const salaryMode = document.getElementById('planSalaryMode');
    const gradeSection = document.getElementById('gradeRulesSection');
    if (!scoreMode || !salaryMode || !gradeSection) return;
    const mode = scoreMode.value;
    if (mode === 'percentage') {
      salaryMode.value = 'coefficient';
      gradeSection.style.display = 'none';
    } else {
      salaryMode.value = 'grade';
      gradeSection.style.display = '';
    }
  }

  function savePlan(planId) {
    const form = document.getElementById('planForm');
    const data = {
      name: form.name.value.trim(),
      scoreMode: form.scoreMode.value,
      salaryMode: form.salaryMode.value,
      flow: ['self_eval', 'hr_review', 'supervisor_eval', 'calibration', 'confirm'],
      status: 'active',
      targetScope: { depts: [], positions: [], employees: [] },
    };

    // 收集等级规则
    const rows = document.querySelectorAll('#gradeRulesBody tr');
    data.gradeRules = [];
    data.distributionLimit = {};
    rows.forEach(row => {
      const inputs = row.querySelectorAll('input');
      const grade = row.querySelector('.grade-display').textContent.trim();
      data.gradeRules.push({
        grade,
        label: inputs[0].value,
        coefficient: parseFloat(inputs[1].value) || 1.0,
      });
      if (inputs[2].value) data.distributionLimit[grade] = parseInt(inputs[2].value);
    });

    if (!data.name) { App.toast('请输入方案名称', 'error'); return; }

    if (planId) {
      DB.update('assessmentPlans', planId, data);
      DB.log(App.currentUser.name, '考核方案', `修改考核方案：${data.name}`);
    } else {
      data.id = DB.genId('AP');
      data.createdAt = new Date().toISOString().split('T')[0];
      DB.insert('assessmentPlans', data);
      DB.log(App.currentUser.name, '考核方案', `创建考核方案：${data.name}`);
    }
    App.closeModal();
    App.toast('保存成功', 'success');
    renderAssessmentPlans(document.getElementById('contentArea'));
  }

  // ========== 考核计划与执行 ==========
  function renderTaskManagement(container) {
    const tasks = DB.getAll('assessmentTasks');
    const plans = DB.getAll('assessmentPlans');

    // 收集所有唯一的考核周期
    const cycles = [...new Set(tasks.map(t => t.cycle).filter(Boolean))].sort();

    container.innerHTML = `
      <div class="flex justify-between mb-4">
        <div class="filter-bar">
          <div class="form-group">
            <label class="form-label">考核方案</label>
            <select class="form-select" id="taskPlanFilter" onchange="Admin.filterTasks()">
              <option value="">全部</option>
              ${plans.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">考核周期</label>
            <select class="form-select" id="taskCycleFilter" onchange="Admin.filterTasks()">
              <option value="">全部</option>
              ${cycles.map(c => `<option value="${c}">${c}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">状态</label>
            <select class="form-select" id="taskStatusFilter" onchange="Admin.filterTasks()">
              <option value="">全部</option>
              <option value="pending_confirm">待确认</option>
              <option value="pending_self_eval">待自评</option>
              <option value="self_evaluated">已自评(待HR审)</option>
              <option value="hr_reviewing">HR审核中</option>
              <option value="hr_reviewed">HR已审核</option>
              <option value="supervisor_evaluating">上级评价中</option>
              <option value="supervisor_done">上级已评</option>
              <option value="calibrated">已校准</option>
              <option value="completed">已完成</option>
            </select>
          </div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="Admin.generateTasks()">⚡ 批量生成考核计划</button>
      </div>

      <div class="stat-grid mb-4">
        <div class="stat-card" style="box-shadow:none; border:1px solid var(--border-light);">
          <div class="stat-icon" style="background:#f5f5f5; color:var(--text-tertiary);">📋</div>
          <div class="stat-info"><div class="label">考核总人数</div><div class="value" style="font-size:20px;">${tasks.length}</div></div>
        </div>
        <div class="stat-card" style="box-shadow:none; border:1px solid var(--border-light);">
          <div class="stat-icon" style="background:var(--primary-light); color:var(--primary);">⏳</div>
          <div class="stat-info"><div class="label">待自评</div><div class="value" style="font-size:20px;">${tasks.filter(t => ['pending_self_eval','confirmed'].includes(t.status)).length}</div></div>
        </div>
        <div class="stat-card" style="box-shadow:none; border:1px solid var(--border-light);">
          <div class="stat-icon" style="background:var(--warning-bg); color:var(--warning);">📤</div>
          <div class="stat-info"><div class="label">待HR审核</div><div class="value" style="font-size:20px;">${tasks.filter(t => t.status === 'self_evaluated' || t.status === 'hr_reviewing').length}</div></div>
        </div>
        <div class="stat-card" style="box-shadow:none; border:1px solid var(--border-light);">
          <div class="stat-icon" style="background:var(--success-bg); color:var(--success);">✅</div>
          <div class="stat-info"><div class="label">已完成</div><div class="value" style="font-size:20px;">${tasks.filter(t => t.status === 'completed').length}</div></div>
        </div>
      </div>

      <table class="data-table" id="taskTable">
        <thead>
          <tr><th>工号</th><th>姓名</th><th>部门</th><th>考核周期</th><th>状态</th><th>自评得分</th><th>上级评分</th><th>最终得分</th><th>等级</th><th>操作</th></tr>
        </thead>
        <tbody>
          ${renderTaskRows(tasks)}
        </tbody>
      </table>
    `;
  }

  function renderTaskRows(tasks) {
    return tasks.map(t => {
      const emp = DB.getById('employees', t.employeeId);
      const dept = emp ? DB.getById('departments', emp.deptId) : null;
      const plan = DB.getById('assessmentPlans', t.planId);
      const extW = t.externalWeight != null ? Number(t.externalWeight) : 0;
      const externalCoeff = t.externalCoeff != null ? Number(t.externalCoeff) : null;
      const isExternalFull = extW === 1 && externalCoeff != null;
      // 外部评价100%时直接显示最终绩效系数，无需内部评分完成
      const coeffDisplay = isExternalFull
        ? externalCoeff.toFixed(2)
        : (plan && plan.scoreMode === 'percentage' && t.finalScore != null
            ? App.calcBlendedCoefficient(t, t.finalScore).toFixed(2)
            : (t.finalCoefficient ? t.finalCoefficient : ''));
      const isCompleted = t.status === 'completed';
      // 已完成的任务不再显示"确认完成"按钮（外部100%是静态属性，需排除已完成状态）
      const canComplete = !isCompleted && (isExternalFull || t.status === 'supervisor_done' || t.status === 'calibrated');
      return `<tr>
        <td>${emp ? emp.empNo : '-'}</td>
        <td class="font-semibold">${emp ? emp.name : '-'}</td>
        <td>${dept ? dept.name : '-'}</td>
        <td>${t.cycle}</td>
        <td><span class="status-tag ${App.getTaskStatusClass(t.status)}">${App.getTaskStatusText(t.status)}</span></td>
        <td>${t.selfTotalScore ? t.selfTotalScore.toFixed(2) : '-'}</td>
        <td>${t.supervisorTotalScore ? t.supervisorTotalScore.toFixed(2) : '-'}</td>
        <td class="font-bold text-primary">${t.finalScore ? t.finalScore.toFixed(2) : '-'}</td>
        <td>${t.finalGrade ? `<span class="grade-display grade-${t.finalGrade}" style="font-size:14px;">${t.finalGrade}</span>` : '-'}${coeffDisplay ? ' <span class="text-muted">(' + coeffDisplay + ')</span>' : ''}</td>
        <td>
          <button class="btn btn-sm btn-link" onclick="Admin.viewTask('${t.id}')">详情</button>
          ${canComplete && !(t.status === 'supervisor_done' && emp && emp.role === 'admin') ? `<button class="btn btn-sm btn-link text-success" onclick="Admin.completeTask('${t.id}')">确认完成</button>` : ''}
          ${t.status !== 'pending_confirm' ? `<button class="btn btn-sm btn-link text-danger" onclick="Admin.returnTask('${t.id}')">退回</button>` : ''}
          <button class="btn btn-sm btn-link text-danger" onclick="Admin.deleteTask('${t.id}')">删除</button>
        </td>
      </tr>`;
    }).join('');
  }

  function filterTasks() {
    const planFilter = document.getElementById('taskPlanFilter').value;
    const cycleFilter = document.getElementById('taskCycleFilter').value;
    const statusFilter = document.getElementById('taskStatusFilter').value;
    let tasks = DB.getAll('assessmentTasks');
    if (planFilter) tasks = tasks.filter(t => t.planId === planFilter);
    if (cycleFilter) tasks = tasks.filter(t => t.cycle === cycleFilter);
    if (statusFilter) tasks = tasks.filter(t => t.status === statusFilter);
    document.querySelector('#taskTable tbody').innerHTML = renderTaskRows(tasks);
  }

  function generateTasks() {
    const plans = DB.getAll('assessmentPlans').filter(p => p.status === 'active');
    const employees = DB.getAll('employees').filter(e => e.status === 'active');

    // 收集所有员工标签
    const allTags = new Set();
    employees.forEach(e => {
      if (e.tags && Array.isArray(e.tags)) e.tags.forEach(t => allTags.add(t));
    });

    const currentYear = new Date().getFullYear();
    const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');

    const html = `
      <div class="alert alert-info">
        <span>💡 选择考核方案和考核周期，系统将自动为范围内的员工生成考核计划。</span>
      </div>
      <form id="genForm">
        <div class="flex gap-4">
          <div class="form-group flex-1">
            <label class="form-label">考核方案<span class="required">*</span></label>
            <select class="form-select" name="planId" required>
              <option value="">请选择</option>
              ${plans.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group" style="width:240px;">
            <label class="form-label">考核周期<span class="required">*</span></label>
            <div class="flex gap-2">
              <select class="form-select" name="cycleYear" required>
                ${[...Array(5)].map((_, i) => {
                  const y = currentYear - 1 + i;
                  return `<option value="${y}" ${y === currentYear ? 'selected' : ''}>${y}年</option>`;
                }).join('')}
              </select>
              <select class="form-select" name="cycleMonth" required>
                ${[...Array(12)].map((_, i) => {
                  const m = String(i + 1).padStart(2, '0');
                  return `<option value="${m}" ${m === currentMonth ? 'selected' : ''}>${m}月</option>`;
                }).join('')}
              </select>
            </div>
          </div>
        </div>
        <div class="form-group">
          <div class="flex items-center justify-between mb-2">
            <label class="form-label mb-0">被考核员工范围</label>
            <div class="flex gap-2 items-center">
              <button type="button" class="btn btn-sm btn-link" onclick="Admin.toggleAllEmployees()">全选</button>
              <button type="button" class="btn btn-sm btn-link" onclick="Admin.toggleInvertEmployees()">反选</button>
            </div>
          </div>
          ${allTags.size > 0 ? `
          <div class="flex gap-1 flex-wrap mb-2" id="tagFilterBar">
            <span class="text-sm text-tertiary mr-1">标签筛选：</span>
            <span class="tag-pill tag-all active" data-tag="" onclick="Admin.filterByTag('')">全部</span>
            ${[...allTags].sort().map(t => `<span class="tag-pill" data-tag="${t}" onclick="Admin.filterByTag('${t}')">${t}</span>`).join('')}
          </div>
          ` : ''}
          <div class="checkbox-group" style="max-height:280px; overflow-y:auto;" id="employeeCheckboxGroup">
            ${employees.map(e => {
              const dept = DB.getById('departments', e.deptId);
              const pos = DB.getById('positions', e.positionId);
              const tagStr = (e.tags && e.tags.length > 0) ? e.tags.map(t => `<span class="emp-tag-mini">${t}</span>`).join('') : '';
              return `<label class="checkbox-item" data-tags="${(e.tags || []).join(',')}">
                <input type="checkbox" name="employees" value="${e.id}" checked>
                <span>${e.name}（${e.empNo}）- ${dept ? dept.name : ''} / ${pos ? pos.name : ''} ${tagStr}</span>
              </label>`;
            }).join('')}
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">考核指标设置</label>
          <div class="alert alert-warning">
            <span>系统将根据员工岗位关联的推荐指标自动生成考核指标项，权重默认均分。生成后可逐人调整。</span>
          </div>
        </div>
      </form>
    `;

    App.showModal('批量生成考核计划', html, `
      <button class="btn" onclick="App.closeModal()">取消</button>
      <button class="btn btn-primary" onclick="Admin.doGenerateTasks()">生成</button>
    `);
  }

  function doGenerateTasks() {
    const form = document.getElementById('genForm');
    const planId = form.planId.value;
    const cycleYear = form.cycleYear.value;
    const cycleMonth = form.cycleMonth.value;
    const cycle = cycleYear && cycleMonth ? `${cycleYear}-${cycleMonth}` : '';
    const selectedEmps = Array.from(form.querySelectorAll('input[name="employees"]:checked')).map(cb => cb.value);
    if (!planId) { App.toast('请选择考核方案', 'error'); return; }
    if (!cycleYear || !cycleMonth) { App.toast('请选择考核周期', 'error'); return; }
    if (selectedEmps.length === 0) { App.toast('请选择被考核员工', 'error'); return; }

    const plan = DB.getById('assessmentPlans', planId);
    let count = 0;
    selectedEmps.forEach(empId => {
      // 检查是否已存在
      const existing = DB.getAll('assessmentTasks').find(t => t.planId === planId && t.employeeId === empId && t.cycle === cycle);
      if (existing) return;

      const emp = DB.getById('employees', empId);
      const pos = DB.getById('positions', emp.positionId);
      let indicatorIds = pos && pos.indicatorIds && pos.indicatorIds.length > 0 ? pos.indicatorIds : [];
      // 岗位无关联指标时，尝试从员工个人配置（localStorage）获取
      if (indicatorIds.length === 0) {
        const savedConfig = JSON.parse(localStorage.getItem('pms_indicator_config_' + empId) || 'null');
        if (savedConfig) {
          const cfgArr = Array.isArray(savedConfig) ? savedConfig : (savedConfig.primary || []);
          indicatorIds = cfgArr.map(ind => ind.id);
        }
      }
      const weight = Math.floor(100 / indicatorIds.length);
      const lastWeight = 100 - weight * (indicatorIds.length - 1);

      const indicators = indicatorIds.map((indId, i) => {
        return {
          indicatorId: indId,
          weight: i === indicatorIds.length - 1 ? lastWeight : weight,
          positionType: 'primary',
          targetValue: '',
          targetNum: 100,
          actualValue: '',
          actualNum: null,
          completionRate: null,
          description: '',
          selfScore: null,
          supervisorScore: null,
        };
      });

      // 兼任岗位指标
      const taskData = {
        id: DB.genId('T'),
        planId,
        employeeId: empId,
        cycle: cycle,
        status: 'pending_confirm',
        confirmTime: null,
        selfEvalTime: null,
        indicators,
        primaryWeight: 100,
        concurrentWeight: 0,
        selfTotalScore: null,
        supervisorTotalScore: null,
        finalScore: null,
        finalGrade: null,
        finalCoefficient: null,
        supervisorComment: '',
        hrComment: '',
        calibrated: false,
      };

      if (emp.concurrentPositionId && emp.concurrentWeight > 0) {
        const concPos = DB.getById('positions', emp.concurrentPositionId);
        let concIndicatorIds = concPos && concPos.indicatorIds && concPos.indicatorIds.length > 0 ? concPos.indicatorIds : [];
        // 兼任岗位也无关联指标时，从个人配置获取
        if (concIndicatorIds.length === 0) {
          const savedConfig = JSON.parse(localStorage.getItem('pms_indicator_config_' + empId) || 'null');
          if (savedConfig && savedConfig.concurrent) {
            concIndicatorIds = savedConfig.concurrent.map(ind => ind.id);
          }
        }
        if (concIndicatorIds.length > 0) {
          const concWeight = Math.floor(100 / concIndicatorIds.length);
          const concLastWeight = 100 - concWeight * (concIndicatorIds.length - 1);
          concIndicatorIds.forEach((indId, i) => {
            indicators.push({
              indicatorId: indId,
              weight: i === concIndicatorIds.length - 1 ? concLastWeight : concWeight,
              positionType: 'concurrent',
              targetValue: '',
              targetNum: 100,
              actualValue: '',
              actualNum: null,
              completionRate: null,
              description: '',
              selfScore: null,
              supervisorScore: null,
            });
          });
          taskData.primaryWeight = 100 - emp.concurrentWeight;
          taskData.concurrentWeight = emp.concurrentWeight;
        }
      }

      DB.insert('assessmentTasks', taskData);
      count++;
    });

    DB.log(App.currentUser.name, '考核计划', `生成考核计划：${plan.name}，共${count}人`);
    App.closeModal();
    App.toast(`成功生成 ${count} 份考核计划`, 'success');
    renderTaskManagement(document.getElementById('contentArea'));
  }

  function toggleAllEmployees() {
    const items = document.querySelectorAll('#employeeCheckboxGroup .checkbox-item');
    const visibleItems = Array.from(items).filter(item => item.style.display !== 'none');
    const allChecked = visibleItems.every(item => item.querySelector('input[name="employees"]').checked);
    visibleItems.forEach(item => {
      item.querySelector('input[name="employees"]').checked = !allChecked;
    });
  }

  function toggleInvertEmployees() {
    const items = document.querySelectorAll('#employeeCheckboxGroup .checkbox-item');
    items.forEach(item => {
      if (item.style.display === 'none') return;
      const cb = item.querySelector('input[name="employees"]');
      if (cb) cb.checked = !cb.checked;
    });
  }

  let _currentTagFilter = '';

  function filterByTag(tag) {
    _currentTagFilter = tag;
    // 更新标签样式
    document.querySelectorAll('#tagFilterBar .tag-pill').forEach(el => {
      el.classList.toggle('active', el.dataset.tag === tag);
    });
    // 筛选员工列表，并同步勾选状态
    const items = document.querySelectorAll('#employeeCheckboxGroup .checkbox-item');
    items.forEach(item => {
      const cb = item.querySelector('input[name="employees"]');
      if (!tag) {
        item.style.display = '';
        if (cb) cb.checked = true;
      } else {
        const tags = item.dataset.tags || '';
        const match = tags.split(',').includes(tag);
        item.style.display = match ? '' : 'none';
        if (cb) cb.checked = match;
      }
    });
  }

  function viewTask(taskId) {
    const task = DB.getById('assessmentTasks', taskId);
    if (!task) return;
    const plan = DB.getById('assessmentPlans', task.planId);
    const emp = DB.getById('employees', task.employeeId);
    const dept = emp ? DB.getById('departments', emp.deptId) : null;
    const pos = emp ? DB.getById('positions', emp.positionId) : null;
    const superior = emp && emp.superiorId ? DB.getById('employees', emp.superiorId) : null;

    const html = `
      <div class="flex gap-4 mb-4">
        <div class="flex-1 p-3" style="background:var(--bg-page); border-radius:8px;">
          <div class="text-sm text-tertiary">员工</div>
          <div class="font-semibold">${emp ? emp.name : '-'}（${emp ? emp.empNo : '-'}）</div>
        </div>
        <div class="flex-1 p-3" style="background:var(--bg-page); border-radius:8px;">
          <div class="text-sm text-tertiary">部门/岗位</div>
          <div class="font-semibold">${dept ? dept.name : '-'} / ${pos ? pos.name : '-'}</div>
        </div>
        <div class="flex-1 p-3" style="background:var(--bg-page); border-radius:8px;">
          <div class="text-sm text-tertiary">上级主管</div>
          <div class="font-semibold">${superior ? superior.name : '-'}</div>
        </div>
      </div>

      <div class="steps mb-4">
        <div class="step ${['confirmed','pending_self_eval','self_evaluated','hr_reviewing','hr_reviewed','supervisor_evaluating','supervisor_done','calibrated','completed'].includes(task.status) ? 'done' : task.status === 'pending_confirm' ? 'active' : ''}"><div class="step-num">1</div><span>计划确认</span></div>
        <div class="step-line"></div>
        <div class="step ${['self_evaluated','hr_reviewing','hr_reviewed','supervisor_evaluating','supervisor_done','calibrated','completed'].includes(task.status) ? 'done' : ['confirmed','pending_self_eval'].includes(task.status) ? 'active' : ''}"><div class="step-num">2</div><span>绩效自评</span></div>
        <div class="step-line"></div>
        <div class="step ${['hr_reviewed','supervisor_evaluating','supervisor_done','calibrated','completed'].includes(task.status) ? 'done' : ['self_evaluated','hr_reviewing'].includes(task.status) ? 'active' : ''}"><div class="step-num">3</div><span>HR审核</span></div>
        <div class="step-line"></div>
        <div class="step ${['supervisor_done','calibrated','completed'].includes(task.status) ? 'done' : ['hr_reviewed','supervisor_evaluating'].includes(task.status) ? 'active' : ''}"><div class="step-num">4</div><span>上级评价</span></div>
        <div class="step-line"></div>
        <div class="step ${['calibrated','completed'].includes(task.status) ? 'done' : task.status === 'supervisor_done' ? 'active' : ''}"><div class="step-num">5</div><span>HR校准</span></div>
        <div class="step-line"></div>
        <div class="step ${task.status === 'completed' ? 'done' : task.status === 'calibrated' ? 'active' : ''}"><div class="step-num">6</div><span>结果确认</span></div>
      </div>

      <table class="data-table">
        <thead>
          <tr><th>指标</th><th>权重</th><th>目标值</th><th>实际值</th><th>完成率</th><th>自评分</th><th>上级分</th></tr>
        </thead>
        <tbody>
          ${task.indicators.map(ind => {
            const indDef = DB.getById('indicators', ind.indicatorId);
            return `<tr>
              <td class="font-semibold">${indDef.name}</td>
              <td>${ind.weight}%</td>
              <td>${ind.targetValue || '-'}</td>
              <td>${ind.actualValue || '-'}</td>
              <td>${ind.completionRate ? ind.completionRate + '%' : '-'}</td>
              <td>${ind.selfScore ? ind.selfScore.toFixed(2) : '-'}</td>
              <td>${ind.supervisorScore ? ind.supervisorScore.toFixed(2) : '-'}</td>
            </tr>`;
          }).join('')}
        </tbody>
        <tfoot>
          <tr style="font-weight:700; background:var(--bg-page);">
            <td colspan="5">合计</td>
            <td>${task.selfTotalScore ? task.selfTotalScore.toFixed(2) : '-'}</td>
            <td>${task.supervisorTotalScore ? task.supervisorTotalScore.toFixed(2) : '-'}</td>
          </tr>
        </tfoot>
      </table>

      ${task.supervisorComment ? `<div class="alert alert-info mt-4"><strong>上级评价：</strong>${task.supervisorComment}</div>` : ''}
      ${task.hrComment ? `<div class="alert alert-success mt-4"><strong>HR评价：</strong>${task.hrComment}</div>` : ''}
    `;

    App.showModal('考核详情', html, `<button class="btn btn-primary" onclick="App.closeModal()">关闭</button>`, 'lg');
  }

  function completeTask(taskId) {
    const task = DB.getById('assessmentTasks', taskId);
    const plan = DB.getById('assessmentPlans', task.planId);

    // 外部评价100%：无需内部评分，直接以外部系数作为最终结果
    const extW = task.externalWeight != null ? Number(task.externalWeight) : 0;
    const externalCoeff = task.externalCoeff != null ? Number(task.externalCoeff) : null;
    const isExternalFull = extW === 1 && externalCoeff != null;

    let finalScore, finalGrade, finalCoefficient, internalCoefficient;

    if (isExternalFull) {
      finalScore = externalCoeff * 100;
      finalCoefficient = externalCoeff;
      internalCoefficient = externalCoeff;
      if (plan.scoreMode === 'percentage') {
        finalGrade = task.finalGrade || null;
      } else {
        const grade = App.getGrade(finalScore, plan);
        finalGrade = grade ? grade.grade : (task.finalGrade || 'C');
      }
    } else {
      finalScore = task.finalScore || task.supervisorTotalScore || 0;
      // 先算出内部系数（融合前）
      if (plan.scoreMode === 'percentage') {
        finalCoefficient = App.calcCoefficient(finalScore);
        finalGrade = task.finalGrade;
      } else {
        const grade = App.getGrade(finalScore, plan);
        finalGrade = grade ? grade.grade : (task.finalGrade || 'C');
        finalCoefficient = grade ? grade.coefficient : 1.0;
      }
      internalCoefficient = finalCoefficient;

      // 外部评价融合：最终系数 = 内部系数×(1−占比) + 外部系数×占比
      if (extW > 0 && externalCoeff != null) {
        finalCoefficient = Math.round((finalCoefficient * (1 - extW) + externalCoeff * extW) * 1000) / 1000;
      }
    }

    let blendedInfo = '';
    if (extW > 0 && externalCoeff != null) {
      blendedInfo = `（含外部评价${Math.round(extW * 100)}%：内部 ${internalCoefficient} → 外部 ${externalCoeff}）`;
    }

    const detail = plan.scoreMode === 'percentage'
      ? `系数：${finalCoefficient}${blendedInfo}`
      : `等级：${finalGrade}${blendedInfo}`;
    App.confirm(`确认完成该员工的考核？最终得分：${finalScore.toFixed(2)}，${detail}`, () => {
      const upd = {
        status: 'completed',
        finalScore,
        finalGrade,
        finalCoefficient,
      };
      // 仅在确有外部评价时记录内部/外部明细，便于追溯与统计
      if (extW > 0 && externalCoeff != null) {
        upd.internalCoefficient = internalCoefficient;
        upd.externalCoeff = externalCoeff;
        upd.externalWeight = extW;
      }
      DB.update('assessmentTasks', taskId, upd);
      DB.log(App.currentUser.name, '考核完成', `确认完成考核：${App.getEmployeeName(task.employeeId)}，得分${finalScore.toFixed(2)}，系数${finalCoefficient}${blendedInfo}`);
      App.toast('考核已完成', 'success');
      renderTaskManagement(document.getElementById('contentArea'));
    });
  }

  // 退回到指定考核节点
  function returnTask(taskId) {
    const task = DB.getById('assessmentTasks', taskId);
    if (!task) return;

    // 考核流程节点定义：step → 退回后设置的状态
    const workflowNodes = [
      { step: 1, label: '计划确认', status: 'pending_confirm' },
      { step: 2, label: '绩效自评', status: 'pending_self_eval' },
      { step: 3, label: 'HR审核', status: 'self_evaluated' },
      { step: 4, label: '上级评价', status: 'hr_reviewed' },
      { step: 5, label: 'HR校准', status: 'supervisor_done' },
      { step: 6, label: '结果确认', status: 'calibrated' },
    ];

    // 当前所处步骤
    const stepMap = {
      'pending_confirm': 1,
      'confirmed': 1, 'pending_self_eval': 2,
      'self_evaluated': 3, 'hr_reviewing': 3, 'hr_reviewed': 3,
      'supervisor_evaluating': 4, 'supervisor_done': 4,
      'calibrated': 5,
      'completed': 6,
    };
    const currentStep = stepMap[task.status] || 1;

    // 可退回的节点 = 当前步骤之前的所有节点
    const returnableNodes = workflowNodes.filter(n => n.step < currentStep);

    if (returnableNodes.length === 0) {
      App.toast('当前阶段无法退回', 'warning');
      return;
    }

    const emp = DB.getById('employees', task.employeeId);
    const html = `
      <div class="alert alert-warning">
        <span>⚠️ 退回后，该员工的考核将回到所选节点重新进行，后续已完成的流程数据将保留但可重新提交。</span>
      </div>
      <div class="form-group">
        <label class="form-label">当前考核对象</label>
        <div class="font-semibold">${emp ? emp.name + '（' + emp.empNo + '）' : '-'}</div>
        <div class="text-sm text-tertiary">当前状态：${App.getTaskStatusText(task.status)}</div>
      </div>
      <div class="form-group">
        <label class="form-label">退回到节点<span class="required">*</span></label>
        <select class="form-select" id="returnTargetNode">
          ${returnableNodes.map(n => `<option value="${n.status}">${n.label}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">退回原因<span class="required">*</span></label>
        <textarea class="form-textarea" id="returnReason" rows="3" placeholder="请说明退回原因，员工和相关人员将看到此说明"></textarea>
      </div>
    `;

    App.showModal('退回考核任务', html, `
      <button class="btn" onclick="App.closeModal()">取消</button>
      <button class="btn btn-danger" onclick="Admin.doReturnTask('${taskId}')">确认退回</button>
    `);
  }

  function doReturnTask(taskId) {
    const targetStatus = document.getElementById('returnTargetNode').value;
    const reason = document.getElementById('returnReason').value.trim();

    if (!targetStatus) {
      App.toast('请选择退回节点', 'error');
      return;
    }
    if (!reason) {
      App.toast('请填写退回原因', 'error');
      return;
    }

    const task = DB.getById('assessmentTasks', taskId);
    const oldStatusText = App.getTaskStatusText(task.status);

    const statusTextMap = {
      'pending_confirm': '计划确认',
      'pending_self_eval': '绩效自评',
      'self_evaluated': 'HR审核',
      'hr_reviewed': '上级评价',
      'supervisor_done': 'HR校准',
      'calibrated': '结果确认',
    };

    App.confirm(`确认将此考核退回到「${statusTextMap[targetStatus]}」节点？`, () => {
      // 根据退回到的节点，清除后续阶段的所有评分数据
      const updateData = {
        status: targetStatus,
        returnReason: reason,
        returnedAt: new Date().toISOString(),
        returnedFrom: task.status,
        hrComment: '',
      };

      // 退回到"绩效自评"：清除自评之后的所有数据
      if (targetStatus === 'pending_self_eval') {
        updateData.selfTotalScore = null;
        updateData.supervisorTotalScore = null;
        updateData.finalScore = null;
        updateData.finalCoefficient = null;
        updateData.finalGrade = null;
        updateData.supervisorComment = '';
        // 清除所有指标的评分
        if (task.indicators) {
          updateData.indicators = task.indicators.map(ind => ({
            ...ind,
            selfScore: null,
            supervisorScore: null,
            calibratedScore: null,
            completionRate: null,
            actualValue: null,
            description: null,
          }));
        }
      }

      // 退回到"HR审核"：清除上级评价及之后的数据
      if (targetStatus === 'hr_reviewing') {
        updateData.supervisorTotalScore = null;
        updateData.finalScore = null;
        updateData.finalCoefficient = null;
        updateData.finalGrade = null;
        updateData.supervisorComment = '';
        if (task.indicators) {
          updateData.indicators = task.indicators.map(ind => ({
            ...ind,
            supervisorScore: null,
            calibratedScore: null,
          }));
        }
      }

      // 退回到"上级评价"：清除上级评价及校准数据
      if (targetStatus === 'supervisor_evaluating') {
        updateData.supervisorTotalScore = null;
        updateData.supervisorComment = '';
        updateData.finalScore = null;
        updateData.finalCoefficient = null;
        updateData.finalGrade = null;
        if (task.indicators) {
          updateData.indicators = task.indicators.map(ind => ({
            ...ind,
            supervisorScore: null,
            calibratedScore: null,
          }));
        }
      }

      // 退回到"HR校准"：清除校准结果数据
      if (targetStatus === 'supervisor_done') {
        updateData.finalScore = null;
        updateData.finalCoefficient = null;
        updateData.finalGrade = null;
        updateData.calibrated = false;
        if (task.indicators) {
          updateData.indicators = task.indicators.map(ind => ({
            ...ind,
            calibratedScore: null,
          }));
        }
      }

      // 退回到"计划确认"：清除所有后续数据，要求重新确认考核计划
      if (targetStatus === 'pending_confirm') {
        updateData.selfTotalScore = null;
        updateData.supervisorTotalScore = null;
        updateData.finalScore = null;
        updateData.finalCoefficient = null;
        updateData.finalGrade = null;
        updateData.supervisorComment = '';
        updateData.confirmTime = null;
        updateData.selfEvalTime = null;
        updateData.calibrated = false;

        // 清除所有指标的评分数据和相关信息
        if (task.indicators) {
          updateData.indicators = task.indicators.map(ind => ({
            ...ind,
            selfScore: null,
            supervisorScore: null,
            calibratedScore: null,
            completionRate: null,
            actualValue: null,
            description: null,
          }));
        }
      }

      DB.update('assessmentTasks', taskId, updateData);
      DB.log(App.currentUser.name, '考核退回', `退回 ${App.getEmployeeName(task.employeeId)} 的考核：${oldStatusText} → ${statusTextMap[targetStatus]}，原因：${reason}`);

      App.closeModal();
      App.toast(`已退回到「${statusTextMap[targetStatus]}」节点，相关评分数据已清除`, 'success');
      renderTaskManagement(document.getElementById('contentArea'));
    });
  }

  function deleteTask(taskId) {
    const task = DB.getById('assessmentTasks', taskId);
    if (!task) return;
    const emp = DB.getById('employees', task.employeeId);
    App.confirm(`确认删除「${emp ? emp.name : ''}（${emp ? emp.empNo : ''}）」的考核计划？此操作不可恢复。`, () => {
      DB.remove('assessmentTasks', taskId);
      DB.log(App.currentUser.name, '考核计划', `删除考核计划：${emp ? emp.name : ''}（${emp ? emp.empNo : ''}），周期${task.cycle}`);
      App.toast('已删除', 'success');
      renderTaskManagement(document.getElementById('contentArea'));
    });
  }

  // 判断任务是否为"总经理角色且已 HR 审核但尚未上级评价"（需自动跳过上级评价）
  function isGMReviewed(t) {
    const emp = DB.getById('employees', t.employeeId);
    return emp && emp.role === 'admin' && t.status === 'hr_reviewed';
  }

  // 获取当前得分（兼容总经理角色 HR 审核后自动跳过上级评价的特例）
  function getCurrentScoreForDisplay(t) {
    if (t.finalScore != null) return t.finalScore;
    if (t.supervisorTotalScore != null) return t.supervisorTotalScore;
    if (isGMReviewed(t) && t.selfTotalScore != null) return t.selfTotalScore;
    return null;
  }

  function renderCalibrationRow(t) {
    const emp = DB.getById('employees', t.employeeId);
    const dept = emp ? DB.getById('departments', emp.deptId) : null;
    const plan = DB.getById('assessmentPlans', t.planId);
    const rawScore = getCurrentScoreForDisplay(t);
    const score = rawScore != null ? rawScore : 0;
    const isPercent = plan && plan.scoreMode === 'percentage';
    // 融合外部评价后的绩效系数（未确认完成时实时计算）
    const coeff = App.calcBlendedCoefficient(t, score);
    // 等级制下不根据得分自动默认等级，仅显示已评定的等级；同时显示等级对应的系数数值
    const grade = t.finalGrade || null;
    let coeffDisplay = isPercent ? coeff : null;
    if (!isPercent && grade && plan && plan.gradeRules) {
      const rule = plan.gradeRules.find(r => r.grade === grade);
      if (rule && rule.coefficient != null) coeffDisplay = Number(rule.coefficient);
    }
    const gradeCell = coeffDisplay != null
      ? `<span class="font-bold" style="${coeffDisplay >= 1 ? 'color:var(--success);' : 'color:var(--danger);'}">${coeffDisplay.toFixed(2)}</span>`
      : (grade ? `<span class="grade-display grade-${grade}" style="font-size:14px;">${grade}</span>` : '-');
    // 考核进度：显示真实流程状态（便于查看谁已到校准节点、谁还在前序环节）
    const statusCell = `<span class="status-tag ${App.getTaskStatusClass(t.status)}">${App.getTaskStatusText(t.status)}</span>`;
    const hasConcurrent = t.concurrentWeight > 0;
    // 外单位评价标记：已设置占比且系数时才显示
    const hasExternal = t.externalWeight != null && Number(t.externalWeight) > 0 && t.externalCoeff != null;
    const extTag = hasExternal
      ? ` <span class="tag tag-orange" style="font-size:11px;" title="${(t.externalNote || '').replace(/"/g, '&quot;')}">含外部${Math.round(Number(t.externalWeight) * 100)}%</span>`
      : '';
    // 已进入校准流程节点（上级评价完成及之后）才可校准；总经理角色 HR 审核后也可校准
    const canCalibrate = ['supervisor_done', 'calibrated', 'completed'].includes(t.status) || isGMReviewed(t);
    const calibBtn = canCalibrate
      ? `<button class="btn btn-sm btn-primary" onclick="Admin.calibrateTask('${t.id}')">校准</button>`
      : `<button class="btn btn-sm btn-primary" disabled style="opacity:.45;cursor:not-allowed;">校准</button>`;
    // 外部评价：不依赖考核节点，随时可维护（外单位领导不登录系统，由HR/管理员代填）
    const extBtn = `<button class="btn btn-sm" onclick="Admin.editExternalEval('${t.id}')" title="维护外单位领导评价系数">外部评价</button>`;
    return `<tr>
      <td>${emp ? emp.empNo : '-'}</td>
      <td class="font-semibold">${emp ? emp.name : '-'}${hasConcurrent ? ' <span class="tag tag-purple" style="font-size:11px;">兼任</span>' : ''}${extTag}</td>
      <td>${dept ? dept.name : '-'}</td>
      <td>${plan ? plan.name : '-'}</td>
      <td>${t.cycle || '-'}</td>
      <td>${t.selfTotalScore != null ? t.selfTotalScore.toFixed(2) : '-'}</td>
      <td>${t.supervisorTotalScore != null ? t.supervisorTotalScore.toFixed(2) : '-'}</td>
      <td class="font-bold text-primary">${rawScore != null ? rawScore.toFixed(2) : '-'}</td>
      <td>${gradeCell}</td>
      <td>${statusCell}</td>
      <td>${extBtn} ${calibBtn}</td>
    </tr>`;
  }

  // 外部评价维护弹窗（任务面板，随时可改；外单位领导不登录系统）
  function editExternalEval(taskId) {
    const task = DB.getById('assessmentTasks', taskId);
    if (!task) return;
    const w = task.externalWeight != null ? Number(task.externalWeight) * 100 : 30;
    const c = task.externalCoeff != null ? Number(task.externalCoeff) : '';
    const note = task.externalNote || '';
    const html = `
      <div class="alert alert-info">为不登录系统的外单位领导维护评价系数。最终系数 = 内部系数 ×(1−占比) + 外部系数 ×占比。</div>
      <div class="form-group">
        <label class="form-label">外单位评价系数</label>
        <input class="form-input" id="extCoeff" type="number" step="0.01" value="${c}" placeholder="如 1.1">
      </div>
      <div class="form-group">
        <label class="form-label">外单位占比（%）</label>
        <input class="form-input" id="extWeight" type="number" step="1" min="0" max="100" value="${w}">
        <span class="text-sm text-tertiary">占该员工最终系数的权重，0 表示不参与融合</span>
      </div>
      <div class="form-group">
        <label class="form-label">备注（选填）</label>
        <textarea class="form-textarea" id="extNote" rows="2" placeholder="外单位评价人 / 日期等">${note}</textarea>
      </div>
    `;
    App.showModal('外部评价维护', html, `
      <button class="btn" onclick="App.closeModal()">取消</button>
      <button class="btn btn-primary" onclick="Admin.saveExternalEval('${taskId}')">保存</button>
    `);
  }

  function saveExternalEval(taskId) {
    const coeffEl = document.getElementById('extCoeff');
    const weightEl = document.getElementById('extWeight');
    const noteEl = document.getElementById('extNote');
    const coeffRaw = coeffEl.value.trim();
    const weightPct = parseFloat(weightEl.value);
    if (isNaN(weightPct) || weightPct < 0 || weightPct > 100) {
      App.toast('占比须为 0~100 的数字', 'error'); return;
    }
    let coeff = null;
    if (coeffRaw !== '') {
      coeff = parseFloat(coeffRaw);
      if (isNaN(coeff)) { App.toast('系数须为数字', 'error'); return; }
    }
    const weight = weightPct / 100;
    const upd = { externalWeight: weight, externalNote: noteEl.value.trim(), externalCoeff: coeff };
    DB.update('assessmentTasks', taskId, upd);
    App.closeModal();
    App.toast('外部评价已保存', 'success');
    // 重新渲染当前所在页面（外部评价按钮仅出现在绩效校准列表）
    const area = document.getElementById('contentArea');
    if (area && document.getElementById('calibListArea')) {
      renderCalibration(area);
    } else if (area && typeof renderTaskManagement === 'function') {
      renderTaskManagement(area);
    }
  }

  let _calibSortDir = null; // 绩效校准列表排序状态：null=默认(按方案/周期分组), 'desc'=当前得分高到低, 'asc'=低到高

  function renderCalibrationGroups(tasks) {
    if (tasks.length === 0) {
      return `<div class="p-4 text-center text-tertiary">暂无待校准数据</div>`;
    }
    // Group by plan → cycle
    const groups = {};
    tasks.forEach(t => {
      const planId = t.planId;
      const cycle = t.cycle || '未知周期';
      if (!groups[planId]) groups[planId] = {};
      if (!groups[planId][cycle]) groups[planId][cycle] = [];
      groups[planId][cycle].push(t);
    });
    // Sort plans by name, cycles by descending order
    const sortedPlans = Object.keys(groups).sort((a, b) => {
      const pa = DB.getById('assessmentPlans', a);
      const pb = DB.getById('assessmentPlans', b);
      return (pa ? pa.name : '') > (pb ? pb.name : '') ? 1 : -1;
    });

    return sortedPlans.map(planId => {
      const plan = DB.getById('assessmentPlans', planId);
      const cycles = Object.keys(groups[planId]).sort().reverse();
      return `<div class="calib-group">
        <div class="calib-group-title" style="padding:10px 16px; background:var(--bg-page); font-weight:600; font-size:14px; border-bottom:1px solid var(--border-color); display:flex; align-items:center; gap:8px;">
          <span>📋</span><span>${plan ? plan.name : planId}</span>
          <span style="color:var(--text-tertiary); font-weight:400; font-size:12px;">（${cycles.length} 个周期）</span>
        </div>
        ${cycles.map(cycle => {
          let cycleTasks = groups[planId][cycle];
          if (_calibSortDir) {
            cycleTasks = [...cycleTasks].sort((a, b) => {
              const sa = getCurrentScoreForDisplay(a) != null ? getCurrentScoreForDisplay(a) : 0;
              const sb = getCurrentScoreForDisplay(b) != null ? getCurrentScoreForDisplay(b) : 0;
              return _calibSortDir === 'desc' ? sb - sa : sa - sb;
            });
          }
          return `<div style="padding-left:0;">
            <div style="padding:6px 16px; font-size:13px; font-weight:500; color:var(--text-secondary); background:var(--bg-card-hover, #fafafa); border-bottom:1px solid var(--border-color);">
              🗓️ ${cycle} <span style="font-weight:400; font-size:12px; color:var(--text-tertiary);">（${cycleTasks.length} 人）</span>
            </div>
            <table class="data-table" style="margin:0;">
              <thead>
                <tr><th>工号</th><th>姓名</th><th>部门</th><th>考核方案</th><th>考核周期</th><th>自评得分</th><th>上级评分</th><th>当前得分</th><th>${plan && plan.scoreMode === 'percentage' ? '绩效系数' : '当前等级'}</th><th>考核进度</th><th>操作</th></tr>
              </thead>
              <tbody>${cycleTasks.map(t => renderCalibrationRow(t)).join('')}</tbody>
            </table>
          </div>`;
        }).join('')}
      </div>`;
    }).join('');
  }

  function renderCalibration(container) {
    const plans = DB.getAll('assessmentPlans').filter(p => p.status === 'active' || p.status === 'completed');
    // 显示所有正在进行的考核任务（不限状态），便于查看谁需要考核及考核进度
    const validPlanIds = new Set(plans.map(p => p.id));
    const tasks = DB.getAll('assessmentTasks').filter(t => validPlanIds.has(t.planId));

    container.innerHTML = `
      <div class="flex justify-between mb-4">
        <div class="filter-bar">
          <div class="form-group" style="position:relative;">
            <label class="form-label">考核方案</label>
            <button type="button" class="form-select multi-select-trigger" id="calibPlanTrigger" onclick="Admin.toggleMultiSelect('calibPlan')" style="text-align:left;">
              全部考核方案
            </button>
            <div class="multi-select-dropdown" id="calibPlanDropdown" style="display:none;">
              ${plans.map(p => `<label class="multi-select-item"><input type="checkbox" value="${p.id}" onchange="Admin.onMultiSelectChange('calibPlan')"> ${p.name}</label>`).join('')}
            </div>
          </div>
          <div class="form-group" style="position:relative;">
            <label class="form-label">考核周期</label>
            <button type="button" class="form-select multi-select-trigger" id="calibCycleTrigger" onclick="Admin.toggleMultiSelect('calibCycle')" style="text-align:left;">
              全部考核周期
            </button>
            <div class="multi-select-dropdown" id="calibCycleDropdown" style="display:none;">
              ${[...new Set(tasks.map(t => t.cycle).filter(Boolean))].sort().reverse().map(c => `<label class="multi-select-item"><input type="checkbox" value="${c}" onchange="Admin.onMultiSelectChange('calibCycle')"> ${c}</label>`).join('')}
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">校准状态</label>
            <select class="form-select" id="calibStatusFilter" onchange="Admin.filterCalibration()" style="min-width:120px;">
              <option value="all">全部</option>
              <option value="pending">待校准</option>
              <option value="done">已校准</option>
            </select>
          </div>
        </div>
        <div class="flex items-center">
          <button class="btn btn-sm ${_calibSortDir ? 'btn-primary' : ''}" onclick="Admin.toggleCalibSort()" title="按当前得分排序">
            ⇅ 排序${_calibSortDir === 'desc' ? '：得分↓' : (_calibSortDir === 'asc' ? '：得分↑' : '')}
          </button>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><h3>校准列表</h3></div>
        <div class="card-body no-pad" id="calibListArea">
          ${renderCalibrationGroups(tasks)}
        </div>
      </div>
    `;

  }

  function toggleMultiSelect(name) {
    const dd = document.getElementById(name + 'Dropdown');
    const isOpen = dd.style.display === 'block';
    // Close all others
    document.querySelectorAll('.multi-select-dropdown').forEach(d => d.style.display = 'none');
    dd.style.display = isOpen ? 'none' : 'block';
    if (!isOpen) {
      // Close on outside click
      setTimeout(() => {
        document.addEventListener('click', function closeMS(e) {
          if (!e.target.closest('.multi-select-dropdown') && !e.target.closest('.multi-select-trigger')) {
            document.querySelectorAll('.multi-select-dropdown').forEach(d => d.style.display = 'none');
            document.removeEventListener('click', closeMS);
          }
        });
      }, 0);
    }
  }

  function onMultiSelectChange(name) {
    const cbs = document.querySelectorAll(`#${name}Dropdown input[type="checkbox"]`);
    const checked = Array.from(cbs).filter(cb => cb.checked);
    const trigger = document.getElementById(name + 'Trigger');
    const all = cbs.length;
    if (checked.length === 0 || checked.length === all) {
      trigger.textContent = name === 'calibPlan' ? '全部考核方案' : '全部考核周期';
    } else {
      trigger.textContent = `已选 ${checked.length} 项`;
    }
    filterCalibration();
  }

  function filterCalibration() {
    const planCbs = document.querySelectorAll('#calibPlanDropdown input[type="checkbox"]:checked');
    const cycleCbs = document.querySelectorAll('#calibCycleDropdown input[type="checkbox"]:checked');
    const statusEl = document.getElementById('calibStatusFilter');
    const planIds = Array.from(planCbs).map(cb => cb.value);
    const cycles = Array.from(cycleCbs).map(cb => cb.value);
    const statusFilter = statusEl ? statusEl.value : 'all';
    // 基准列表：所有正在进行的考核任务（不限状态）
    const validPlanIds = new Set(DB.getAll('assessmentPlans').filter(p => p.status === 'active' || p.status === 'completed').map(p => p.id));
    let tasks = DB.getAll('assessmentTasks').filter(t => validPlanIds.has(t.planId));
    if (planIds.length > 0) tasks = tasks.filter(t => planIds.includes(t.planId));
    if (cycles.length > 0) tasks = tasks.filter(t => cycles.includes(t.cycle));
    if (statusFilter === 'pending') tasks = tasks.filter(t => t.status === 'supervisor_done' || isGMReviewed(t));
    if (statusFilter === 'done') tasks = tasks.filter(t => t.status === 'calibrated' || t.status === 'completed');
    document.getElementById('calibListArea').innerHTML = renderCalibrationGroups(tasks);
  }

  function toggleCalibSort() {
    _calibSortDir = _calibSortDir === null ? 'desc' : (_calibSortDir === 'desc' ? 'asc' : null);
    filterCalibration();
  }

  function calibrateTask(taskId) {
    let task = DB.getById('assessmentTasks', taskId);
    if (!task) return;
    const plan = DB.getById('assessmentPlans', task.planId);
    const emp = DB.getById('employees', task.employeeId);
    // 总经理角色 HR 审核后自动跳过上级评价：点击校准时先同步自评得分作为当前得分
    if (isGMReviewed(task)) {
      DB.update('assessmentTasks', taskId, {
        status: 'supervisor_done',
        supervisorTotalScore: task.selfTotalScore,
        supervisorComment: '总经理角色自动跳过上级评价，自评得分作为当前得分',
      });
      task = DB.getById('assessmentTasks', taskId);
    }
    const currentScore = task.finalScore || task.supervisorTotalScore || 0;
    const isPercent = plan && plan.scoreMode === 'percentage';
    const hasConcurrent = task.concurrentWeight > 0 && task.indicators.some(i => i.positionType === 'concurrent');
    // 等级制下不根据得分自动默认等级：若已有评定结果则选中，否则留空让人工选择
    const currentGrade = task.finalGrade || (isPercent ? App.calcCoefficient(currentScore).toFixed(2) : '');

    const gradeSection = isPercent ? `
        <div class="form-group">
          <label class="form-label">绩效系数</label>
          <input type="text" id="calibCoeffDisplay" class="form-input" value="${App.calcBlendedCoefficient(task, currentScore).toFixed(2)}" readonly style="background:var(--bg-page);color:var(--text-tertiary);">
          <div class="form-hint">已按得分÷100算出内部系数，并融合外部评价权重</div>
        </div>` : `
        <div class="form-group">
          <label class="form-label">调整后等级<span class="required">*</span></label>
          <select class="form-select" name="adjustedGrade">
            ${!task.finalGrade ? `<option value="" disabled ${currentGrade === '' ? 'selected' : ''}>— 请选择等级 —</option>` : ''}
            ${plan.gradeRules.map(r => `<option value="${r.grade}" ${currentGrade === r.grade ? 'selected' : ''}>${r.grade} - ${r.label}（系数${r.coefficient}）</option>`).join('')}
          </select>
          <div class="form-hint">请人工选择等级（不按得分自动默认）</div>
        </div>`;

    const html = `
      <div class="flex gap-4 mb-4">
        <div class="flex-1 p-3" style="background:var(--bg-page); border-radius:8px;">
          <div class="text-sm text-tertiary">员工</div>
          <div class="font-semibold">${emp.name}（${emp.empNo}）</div>
        </div>
        <div class="flex-1 p-3" style="background:var(--bg-page); border-radius:8px;">
          <div class="text-sm text-tertiary">考核周期</div>
          <div class="font-semibold">${task.cycle}</div>
        </div>
      </div>
      ${hasConcurrent ? `<div class="alert alert-info" style="background:#f0f7ff; border-color:#1677ff; margin-bottom:16px;"><strong>🔀 兼任岗位</strong>　本职${task.primaryWeight}% + 兼任${task.concurrentWeight}% = 加权总分</div>` : ''}

      <div class="flex gap-4 mb-4">
        <div class="flex-1 p-3" style="background:var(--primary-light); border-radius:8px;">
          <div class="text-sm text-tertiary">自评得分${hasConcurrent ? '（加权）' : ''}</div>
          <div class="text-xl font-bold">${task.selfTotalScore ? task.selfTotalScore.toFixed(2) : '-'}</div>
        </div>
        <div class="flex-1 p-3" style="background:var(--success-bg); border-radius:8px;">
          <div class="text-sm text-tertiary">上级评分${hasConcurrent ? '（加权）' : ''}</div>
          <div class="text-xl font-bold text-success">${task.supervisorTotalScore ? task.supervisorTotalScore.toFixed(2) : '-'}</div>
        </div>
        <div class="flex-1 p-3" style="background:var(--warning-bg); border-radius:8px;">
          <div class="text-sm text-tertiary">当前得分</div>
          <div class="text-xl font-bold text-warning">${currentScore.toFixed(2)}</div>
        </div>
      </div>

      <form id="calibForm" data-task-id="${taskId}">
        <div class="form-group">
          <label class="form-label">调整后得分<span class="required">*</span></label>
          <input type="number" class="form-input" name="adjustedScore" value="${currentScore.toFixed(2)}" step="0.01" required${isPercent ? ' oninput="Admin.onCalibScoreChange()"' : ''}>
          <div class="form-hint">调整后得分将作为最终得分</div>
        </div>
        ${gradeSection}
        <div class="form-group">
          <label class="form-label">校准原因</label>
          <textarea class="form-textarea" name="reason" placeholder="选填，说明本次校准调整的依据（如：综合平衡、强制分布等）">${task.calibReason || ''}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">HR评价备注</label>
          <textarea class="form-textarea" name="hrComment" placeholder="可选">${task.hrComment || ''}</textarea>
        </div>
      </form>
    `;

    App.showModal('绩效校准 - ' + emp.name, html, `
      <button class="btn" onclick="App.closeModal()">取消</button>
      <button class="btn btn-primary" onclick="Admin.saveCalibration('${taskId}')">确认校准</button>
    `);
  }

  function saveCalibration(taskId) {
    const form = document.getElementById('calibForm');
    const adjustedScore = parseFloat(form.adjustedScore.value);
    const reason = form.reason.value.trim();
    const hrComment = form.hrComment.value.trim();

    if (!adjustedScore) { App.toast('请填写调整后得分', 'error'); return; }

    const task = DB.getById('assessmentTasks', taskId);
    const plan = DB.getById('assessmentPlans', task.planId);
    const isPercent = plan && plan.scoreMode === 'percentage';
    // 等级制下必须人工选择等级，否则拦截
    if (!isPercent && !form.adjustedGrade.value) { App.toast('请选择调整后等级', 'error'); return; }
    const beforeScore = task.finalScore || task.supervisorTotalScore || 0;
    const beforeInternalCoeff = App.calcCoefficient(beforeScore);
    const beforeBlendedCoeff = App.calcBlendedCoefficient(task, beforeScore);
    const afterInternalCoeff = App.calcCoefficient(adjustedScore);
    const afterBlendedCoeff = App.calcBlendedCoefficient(task, adjustedScore);
    const beforeGrade = task.finalGrade || (isPercent ? beforeBlendedCoeff.toFixed(2) : '未评定');
    const adjustedGrade = isPercent ? afterBlendedCoeff.toFixed(2) : form.adjustedGrade.value;
    const gradeRule = !isPercent ? plan.gradeRules.find(r => r.grade === adjustedGrade) : null;

    // 记录校准历史
    DB.insert('calibrationRecords', {
      id: DB.genId('CR'),
      taskId,
      employeeId: task.employeeId,
      beforeScore,
      afterScore: adjustedScore,
      beforeGrade,
      afterGrade: adjustedGrade,
      operator: App.currentUser.name,
      operateTime: new Date().toLocaleString('zh-CN', { hour12: false }),
      reason,
    });

    // 更新任务
    DB.update('assessmentTasks', taskId, {
      finalScore: adjustedScore,
      finalGrade: adjustedGrade,
      finalCoefficient: isPercent ? afterBlendedCoeff : (gradeRule ? gradeRule.coefficient : 1.0),
      calibrated: true,
      status: 'calibrated',
      hrComment,
      calibReason: reason,
    });

    const gradeLog = isPercent ? `系数 ${beforeBlendedCoeff.toFixed(2)}→${afterBlendedCoeff.toFixed(2)}` : `${beforeGrade}→${adjustedGrade}`;
    DB.log(App.currentUser.name, '绩效校准', `校准 ${App.getEmployeeName(task.employeeId)}：${beforeScore.toFixed(2)}→${adjustedScore.toFixed(2)}，${gradeLog}`);
    App.closeModal();
    App.toast('校准成功', 'success');
    renderCalibration(document.getElementById('contentArea'));
  }

  function onCalibScoreChange() {
    const scoreEl = document.querySelector('input[name="adjustedScore"]');
    const coeffEl = document.getElementById('calibCoeffDisplay');
    const form = document.getElementById('calibForm');
    if (scoreEl && coeffEl) {
      const taskId = form && form.dataset.taskId ? form.dataset.taskId : null;
      const task = taskId ? DB.getById('assessmentTasks', taskId) : null;
      const score = parseFloat(scoreEl.value) || 0;
      coeffEl.value = App.calcBlendedCoefficient(task, score).toFixed(2);
    }
  }

  // ========== 结果统计与分析 ==========
  // 所有状态的中文映射及颜色
  const ALL_STATUS_MAP = {
    'pending_confirm':        { text: '待确认',      tag: 'tag-gray' },
    'confirmed':              { text: '已确认',      tag: 'tag-gray' },
    'pending_self_eval':      { text: '待自评',      tag: 'tag-orange' },
    'self_evaluated':         { text: '已自评',      tag: 'tag-blue' },
    'hr_reviewing':           { text: 'HR审核中',    tag: 'tag-blue' },
    'hr_reviewed':            { text: '已HR审核',    tag: 'tag-blue' },
    'supervisor_evaluating':  { text: '上级评价中',  tag: 'tag-purple' },
    'supervisor_done':        { text: '已评价',      tag: 'tag-teal' },
    'calibrated':             { text: '已校准',      tag: 'tag-blue' },
    'completed':              { text: '已完成',      tag: 'tag-green' },
    'rejected':               { text: '已退回',     tag: 'tag-red' },
  };

  function getEvaluatedTasks() {
    return DB.getAll('assessmentTasks');
  }

  function renderStatistics(container) {
    const tasks = getEvaluatedTasks();
    const plans = DB.getAll('assessmentPlans');
    const cycles = [...new Set(tasks.map(t => t.cycle).filter(Boolean))].sort().reverse();

    container.innerHTML = `
      <div class="flex justify-between mb-4">
        <div class="filter-bar">
          <div class="form-group" style="position:relative;">
            <label class="form-label">考核方案</label>
            <button type="button" class="form-select multi-select-trigger" id="statsPlanTrigger" onclick="Admin.toggleMultiSelect('statsPlan')" style="text-align:left;">
              全部考核方案
            </button>
            <div class="multi-select-dropdown" id="statsPlanDropdown" style="display:none;">
              ${plans.map(p => `<label class="multi-select-item"><input type="checkbox" value="${p.id}" onchange="Admin.onStatsMultiSelectChange('statsPlan')"> ${p.name}</label>`).join('')}
            </div>
          </div>
          <div class="form-group" style="position:relative;">
            <label class="form-label">考核周期</label>
            <button type="button" class="form-select multi-select-trigger" id="statsCycleTrigger" onclick="Admin.toggleMultiSelect('statsCycle')" style="text-align:left;">
              全部考核周期
            </button>
            <div class="multi-select-dropdown" id="statsCycleDropdown" style="display:none;">
              ${cycles.map(c => `<label class="multi-select-item"><input type="checkbox" value="${c}" onchange="Admin.onStatsMultiSelectChange('statsCycle')"> ${c}</label>`).join('')}
            </div>
          </div>
          <div class="form-group" style="position:relative;">
            <label class="form-label">状态</label>
            <button type="button" class="form-select multi-select-trigger" id="statsStatusTrigger" onclick="Admin.toggleMultiSelect('statsStatus')" style="text-align:left;">
              全部状态
            </button>
            <div class="multi-select-dropdown" id="statsStatusDropdown" style="display:none;">
              ${Object.entries(ALL_STATUS_MAP).map(([k, v]) =>
                `<label class="multi-select-item"><input type="checkbox" value="${k}" onchange="Admin.onStatsMultiSelectChange('statsStatus')"> <span class="tag ${v.tag}" style="font-size:11px;">${v.text}</span></label>`
              ).join('')}
            </div>
          </div>
        </div>
        <div class="flex items-end gap-2">
          <button class="btn" onclick="Admin.exportStats()">📥 导出</button>
          <button class="btn" onclick="Admin.printStats()">${App.isPrintSupported() ? '🖨️ 打印' : '📷 导出图片'}</button>
          <button class="btn btn-primary" onclick="Admin.openWecomSend()">📨 发送企微群</button>
        </div>
      </div>

      <div id="statsResultArea"></div>
    `;

    renderStatsResult();
  }

  // 渲染单行统计
  function renderStatsRow(t, seq) {
    const emp = DB.getById('employees', t.employeeId);
    const dept = emp ? DB.getById('departments', emp.deptId) : null;
    const plan = DB.getById('assessmentPlans', t.planId);
    const rawScore = getCurrentScoreForDisplay(t);
    const score = rawScore != null ? rawScore : 0;
    const isPercent = plan && plan.scoreMode === 'percentage';
    const stInfo = ALL_STATUS_MAP[t.status] || { text: t.status, tag: 'tag-gray' };
    const renDanChouCoef = t.renDanChouCoef != null ? t.renDanChouCoef : '';
    const remark = t.remark || '';
    // 绩效系数：百分制下融合外部评价；等级制下显示等级对应的系数数值
    let displayCoeff = null;
    if (isPercent) {
      const extWeight = t.externalWeight != null ? Number(t.externalWeight) : 0;
      const extCoeff = t.externalCoeff != null ? Number(t.externalCoeff) : null;
      if (Math.abs(extWeight - 1) < 1e-9 && extCoeff != null) {
        displayCoeff = extCoeff;
      } else if (rawScore != null) {
        displayCoeff = App.calcBlendedCoefficient(t, score);
      }
    } else {
      const grade = t.finalGrade;
      if (grade && plan && plan.gradeRules) {
        const rule = plan.gradeRules.find(r => r.grade === grade);
        if (rule && rule.coefficient != null) displayCoeff = Number(rule.coefficient);
      }
    }
    return `<tr>
      <td>${seq}</td>
      <td>${emp ? emp.empNo : '-'}</td>
      <td class="font-semibold">${emp ? emp.name : '-'}</td>
      <td>${dept ? dept.name : '-'}</td>
      <td>${rawScore != null ? score.toFixed(2) : '-'}</td>
      <td>${displayCoeff != null
        ? displayCoeff.toFixed(2)
        : (t.finalGrade ? `<span class="grade-display grade-${t.finalGrade}" style="font-size:14px;">${t.finalGrade}</span>` : '-')
      }</td>
      <td><input type="text" class="form-input" style="width:80px; padding:2px 6px; font-size:13px; text-align:center;" value="${renDanChouCoef}" placeholder="—" onchange="Admin.saveStatsField('${t.id}','renDanChouCoef',this.value)" /></td>
      <td><input type="text" class="form-input" style="width:120px; padding:2px 6px; font-size:13px;" value="${remark}" placeholder="—" onchange="Admin.saveStatsField('${t.id}','remark',this.value)" /></td>
      <td><span class="tag ${stInfo.tag}">${stInfo.text}</span></td>
      <td><button class="btn btn-sm" onclick="Admin.viewStatsDetail('${t.id}')">📋 详情</button></td>
    </tr>`;
  }

  // 分类渲染统计列表（按考核方案→考核周期分组）
  function renderStatsGroups(tasks) {
    if (tasks.length === 0) {
      return `<div class="p-4 text-center text-tertiary">暂无符合条件的数据</div>`;
    }
    // 按 plan → cycle 分组
    const groups = {};
    tasks.forEach(t => {
      const planId = t.planId;
      const cycle = t.cycle || '未知周期';
      if (!groups[planId]) groups[planId] = {};
      if (!groups[planId][cycle]) groups[planId][cycle] = [];
      groups[planId][cycle].push(t);
    });
    // 按方案名排序，周期降序
    const sortedPlans = Object.keys(groups).sort((a, b) => {
      const pa = DB.getById('assessmentPlans', a);
      const pb = DB.getById('assessmentPlans', b);
      return (pa ? pa.name : '') > (pb ? pb.name : '') ? 1 : -1;
    });

    return sortedPlans.map(planId => {
      const plan = DB.getById('assessmentPlans', planId);
      const cycles = Object.keys(groups[planId]).sort().reverse();
      return `<div class="stats-group">
        <div style="padding:10px 16px; background:var(--bg-page); font-weight:600; font-size:14px; border-bottom:1px solid var(--border-color); display:flex; align-items:center; gap:8px;">
          <span>📋</span><span>${plan ? plan.name : planId}</span>
          <span style="color:var(--text-tertiary); font-weight:400; font-size:12px;">（${cycles.length} 个周期，共${groups[planId][Object.keys(groups[planId])[0]] ? tasks.filter(t=>t.planId===planId).length : 0} 人）</span>
        </div>
        ${cycles.map(cycle => {
          const cycleTasks = groups[planId][cycle];
          let seq = 1;
          return `<div>
            <div style="padding:6px 16px; font-size:13px; font-weight:500; color:var(--text-secondary); background:var(--bg-card-hover, #fafafa); border-bottom:1px solid var(--border-color);">
              🗓️ ${cycle} <span style="font-weight:400; font-size:12px; color:var(--text-tertiary);">（${cycleTasks.length} 人）</span>
            </div>
            <table class="data-table" style="margin:0;" data-plan="${planId}" data-cycle="${cycle}">
              <thead>
                <tr><th>序号</th><th>工号</th><th>姓名</th><th>部门</th><th>最终得分</th><th>绩效系数</th><th>人单酬系数</th><th>备注</th><th>状态</th><th>详情</th></tr>
              </thead>
              <tbody>
                ${cycleTasks.map(t => renderStatsRow(t, seq++)).join('')}
              </tbody>
            </table>
          </div>`;
        }).join('')}
      </div>`;
    }).join('');
  }

  function renderStatsResult() {
    const planCbs = document.querySelectorAll('#statsPlanDropdown input[type="checkbox"]:checked');
    const cycleCbs = document.querySelectorAll('#statsCycleDropdown input[type="checkbox"]:checked');
    const statusCbs = document.querySelectorAll('#statsStatusDropdown input[type="checkbox"]:checked');
    const planIds = Array.from(planCbs).map(cb => cb.value);
    const cycleVals = Array.from(cycleCbs).map(cb => cb.value);
    const statusVals = Array.from(statusCbs).map(cb => cb.value);
    let tasks = getEvaluatedTasks();
    if (planIds.length > 0) tasks = tasks.filter(t => planIds.includes(t.planId));
    if (cycleVals.length > 0) tasks = tasks.filter(t => cycleVals.includes(t.cycle));
    if (statusVals.length > 0) tasks = tasks.filter(t => statusVals.includes(t.status));

    const allScores = tasks.map(t => t.finalScore || t.supervisorTotalScore || 0).filter(s => s > 0);
    const avgScore = allScores.length > 0 ? (allScores.reduce((a,b) => a+b, 0) / allScores.length) : 0;
    const maxScore = allScores.length > 0 ? Math.max(...allScores) : 0;
    const minScore = allScores.length > 0 ? Math.min(...allScores) : 0;

    const area = document.getElementById('statsResultArea');
    if (!area) return;
    area.innerHTML = `
      <div class="stat-grid mb-4">
        <div class="stat-card"><div class="stat-icon blue">📊</div><div class="stat-info"><div class="label">参与人数</div><div class="value">${tasks.length}</div></div></div>
        <div class="stat-card"><div class="stat-icon green">📈</div><div class="stat-info"><div class="label">平均得分</div><div class="value">${avgScore.toFixed(2)}</div></div></div>
        <div class="stat-card"><div class="stat-icon orange">⬆️</div><div class="stat-info"><div class="label">最高分</div><div class="value">${maxScore.toFixed(2)}</div></div></div>
        <div class="stat-card"><div class="stat-icon red">⬇️</div><div class="stat-info"><div class="label">最低分</div><div class="value">${minScore.toFixed(2)}</div></div></div>
      </div>
      <div class="card">
        <div class="card-body no-pad">
          <div id="statsGroupsArea">${renderStatsGroups(tasks)}</div>
        </div>
      </div>
    `;
  }

  function onStatsMultiSelectChange(name) {
    const cbs = document.querySelectorAll(`#${name}Dropdown input[type="checkbox"]`);
    const checked = Array.from(cbs).filter(cb => cb.checked);
    const trigger = document.getElementById(name + 'Trigger');
    const labelMap = { statsPlan: '全部考核方案', statsCycle: '全部考核周期', statsStatus: '全部状态' };
    if (checked.length === 0 || checked.length === cbs.length) {
      trigger.textContent = labelMap[name] || `已选 ${checked.length} 项`;
    } else {
      trigger.textContent = `已选 ${checked.length} 项`;
    }
    renderStatsResult();
  }

  // ========== 发送结果到企业微信群（群机器人 Webhook） ==========
  // 读取当前筛选后的任务（与统计列表筛选条件保持一致）
  function getFilteredStatsTasks() {
    const planCbs = document.querySelectorAll('#statsPlanDropdown input[type="checkbox"]:checked');
    const cycleCbs = document.querySelectorAll('#statsCycleDropdown input[type="checkbox"]:checked');
    const statusCbs = document.querySelectorAll('#statsStatusDropdown input[type="checkbox"]:checked');
    const planIds = Array.from(planCbs).map(cb => cb.value);
    const cycleVals = Array.from(cycleCbs).map(cb => cb.value);
    const statusVals = Array.from(statusCbs).map(cb => cb.value);
    let tasks = getEvaluatedTasks();
    if (planIds.length > 0) tasks = tasks.filter(t => planIds.includes(t.planId));
    if (cycleVals.length > 0) tasks = tasks.filter(t => cycleVals.includes(t.cycle));
    if (statusVals.length > 0) tasks = tasks.filter(t => statusVals.includes(t.status));
    return tasks;
  }

  // 根据当前筛选结果生成默认播报文案（企业微信 markdown 语法）
  function buildWecomSummary(tasks) {
    const scores = tasks.map(t => t.finalScore || t.supervisorTotalScore || 0).filter(s => s > 0);
    const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const max = scores.length ? Math.max(...scores) : 0;
    const min = scores.length ? Math.min(...scores) : 0;
    const cycles = [...new Set(tasks.map(t => t.cycle).filter(Boolean))];
    const cycleText = cycles.length ? cycles.join('、') : '本期';
    const completed = tasks.filter(t => t.status === 'completed').length;
    return [
      `## 绩效结果播报`,
      `> 考核周期：**${cycleText}**`,
      `> 参与人数：**${tasks.length} 人**　已完成：**${completed} 人**`,
      `> 平均得分：**${avg.toFixed(2)}**`,
      `> 最高分：**${max.toFixed(2)}**　最低分：**${min.toFixed(2)}**`,
      ``,
      `请相关同事登录系统查看个人绩效详情。`
    ].join('\n');
  }

  // 打开"发送企微群"弹窗：顶部配置 Webhook 地址（可修改），下方为消息内容框
  function openWecomSend() {
    const tasks = getFilteredStatsTasks();
    const saved = DB.getSetting('wecomWebhook');
    const hookUrl = (saved && saved.url) ? saved.url : (typeof saved === 'string' ? saved : '');
    const html = `
      <div class="alert alert-info">通过企业微信群机器人 Webhook 发送。请先在目标群「添加群机器人」获取 Webhook 地址。</div>
      <div class="form-group">
        <label class="form-label">Webhook 地址（修改后点「保存地址」即可，无需发送）</label>
        <input class="form-input" id="wecomHook" type="text" value="${hookUrl}" placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxxxxxxx">
      </div>
      <div class="form-group">
        <label class="form-label">消息内容（支持 markdown 语法，标题请写成 <code>## 标题</code> 格式）</label>
        <textarea class="form-textarea" id="wecomMsg" rows="9" placeholder="在此输入要发送到群的消息内容...&#10;例如：&#10;## 6月份绩效评价通知&#10;绩效评价已经完成，请大家将绩效表打印签字后提交至人资行政部。&#10;时间截止：7月15日15:00前" style="font-family:var(--font-mono,monospace); font-size:13px; line-height:1.6;"></textarea>
        <span class="text-sm text-tertiary">系统会自动规范化标题语法（##标题 → ## 标题）。</span>
      </div>
    `;
    App.showModal('发送消息到企微群', html, `
      <button class="btn" onclick="App.closeModal()">取消</button>
      <button class="btn" onclick="Admin.saveWecomHook()">💾 保存地址</button>
      <button class="btn btn-primary" onclick="Admin.sendWecomMessage()">发送</button>
    `);
  }

  // 规范化用户输入的 markdown 标题语法：#标题 -> # 标题，兼容企微解析
  function normalizeMarkdown(content) {
    if (!content) return content;
    // 处理行首的 # 标题语法：每行最多匹配 6 个 #
    return content.replace(/^(#{1,6})\s*([^\s#][^\n]*)/gm, function(_, hashes, text) {
      return hashes + ' ' + text.trim();
    });
  }

  function sendWecomMessage() {
    const hookEl = document.getElementById('wecomHook');
    const msgEl = document.getElementById('wecomMsg');
    if (!hookEl || !msgEl) return;
    const url = (hookEl.value || '').trim();
    const content = (msgEl.value || '').trim();
    if (!url) { App.toast('请填写 Webhook 地址', 'error'); return; }
    if (!/^https?:\/\/.+/i.test(url)) {
      App.toast('Webhook 地址格式不正确（需以 http:// 或 https:// 开头）', 'error'); return;
    }
    if (!content) { App.toast('消息内容不能为空', 'error'); return; }
    // 自动修正 markdown 标题语法（如 ##标题 -> ## 标题），确保企微能正确解析
    const normalizedContent = normalizeMarkdown(content);
    // 保存 Webhook（带时间戳，跨云端合并时新的胜出）
    DB.setSetting('wecomWebhook', { url: url, _updatedAt: Date.now() });
    const payload = { msgtype: 'markdown', markdown: { content: normalizedContent } };
    // 企业微信 Webhook 无 CORS 响应头：用 no-cors + text/plain 盲发（跳过预检，读不到返回体）
    fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload)
    }).then(function() {
      App.closeModal();
      App.toast('已发送，请到企业微信群确认', 'success');
    }).catch(function(e) {
      App.toast('发送失败：' + (e && e.message ? e.message : '网络错误'), 'error');
    });
  }

  // 仅保存 Webhook 地址，不发送消息（弹窗内独立保存）
  function saveWecomHook() {
    const hookEl = document.getElementById('wecomHook');
    if (!hookEl) return;
    const url = (hookEl.value || '').trim();
    if (!url) { App.toast('地址为空，未保存', 'error'); return; }
    if (!/^https?:\/\/.+/i.test(url)) {
      App.toast('Webhook 地址格式不正确（需以 http:// 或 https:// 开头）', 'error'); return;
    }
    DB.setSetting('wecomWebhook', { url: url, _updatedAt: Date.now() });
    App.toast('Webhook 地址已保存', 'success');
  }

  // CSV导出（直接从任务数据读取，支持分组结构）
  function exportStats() {
    // 获取筛选条件（与查询按钮一致）
    const planCbs = document.querySelectorAll('#statsPlanDropdown input[type="checkbox"]:checked');
    const cycleCbs = document.querySelectorAll('#statsCycleDropdown input[type="checkbox"]:checked');
    const statusCbs = document.querySelectorAll('#statsStatusDropdown input[type="checkbox"]:checked');

    const planIds = Array.from(planCbs).map(cb => cb.value);
    const cycleVals = Array.from(cycleCbs).map(cb => cb.value);
    const statusVals = Array.from(statusCbs).map(cb => cb.value);

    // 获取任务数据（与renderStatsGroups相同逻辑）
    let tasks = getEvaluatedTasks();
    if (planIds.length > 0 && !planIds.includes('all')) tasks = tasks.filter(t => planIds.includes(t.planId));
    if (cycleVals.length > 0 && !cycleVals.includes('all')) tasks = tasks.filter(t => cycleVals.includes(t.cycle));
    if (statusVals.length > 0) tasks = tasks.filter(t => statusVals.includes(t.status));

    if (tasks.length === 0) { alert('没有符合条件的数据可导出'); return; }

    // ========== 按照用户模板格式导出 ==========
    // 模板格式：单个工作表，每人多行（每个指标一行），人员信息列按人员进行纵向单元格合并
    const rows = [];

    // 列索引常量
    const C = { seq:0, empNo:1, name:2, dept:3, position:4, indicator:5, weight:6, target:7, actual:8, rate:9, desc:10, self:11, sup:12, calib:13, finalScore:14, coeff:15, internalCoeff:16, extCoeff:17, extWeight:18 };
    // 需要按人员进行纵向合并的列：工号、姓名、部门、职务、最终得分、绩效系数（新增的外部评价列在 coeff 之后，不影响合并）
    const MERGE_COLS = [C.empNo, C.name, C.dept, C.position, C.finalScore, C.coeff];

    // 标题行
    rows.push(['序号', '工号', '姓名', '部门', '职务', '指标项', '权重', '目标值', '实际值', '完成率', '完成情况描述', '自评分', '上级分', '校准分', '最终得分', '绩效系数', '内部系数', '外部系数', '外部占比']);

    const merges = [];   // 单元格合并信息
    let seq = 1;
    tasks.forEach(t => {
      const emp = DB.getById('employees', t.employeeId);
      const plan = DB.getById('assessmentPlans', t.planId);
      const isPercent = plan && plan.scoreMode === 'percentage';
      const finalScore = t.finalScore || t.supervisorTotalScore || t.selfTotalScore || '';
      // 绩效系数：百分制融合外部评价（外部100%时不依赖内部得分）；等级制显示等级对应系数
      let coeff = '';
      if (isPercent) {
        const _w = t.externalWeight != null ? Number(t.externalWeight) : 0;
        const _ec = t.externalCoeff != null ? Number(t.externalCoeff) : null;
        if (Math.abs(_w - 1) < 1e-9 && _ec != null) {
          coeff = _ec.toFixed(2);
        } else if (finalScore) {
          coeff = App.calcBlendedCoefficient(t, finalScore).toFixed(2);
        }
      } else {
        const grade = t.finalGrade;
        if (grade && plan && plan.gradeRules) {
          const rule = plan.gradeRules.find(r => r.grade === grade);
          if (rule && rule.coefficient != null) coeff = Number(rule.coefficient).toFixed(2);
        }
      }
      // 外部评价展示值：有外部占比且系数时才输出，否则内部系数=最终系数
      const _w = t.externalWeight != null ? Number(t.externalWeight) : 0;
      const _ec = t.externalCoeff != null ? Number(t.externalCoeff) : null;
      const _hasExt = _w > 0 && _ec != null;
      const internalCoeffVal = _hasExt ? (t.internalCoefficient != null ? t.internalCoefficient : coeff) : coeff;
      const extCoeffVal = _hasExt ? _ec : '';
      const extWeightVal = _hasExt ? Math.round(_w * 100) + '%' : '';
      // 完成情况描述：优先取 ind.description（自评页填写的“完成情况描述”），其次 ind.completionDesc
      const getDesc = (ind) => (ind.description != null && String(ind.description).trim() !== '' ? ind.description : (ind.completionDesc || ''));

      const dataStart = rows.length;  // 该人员首条数据行（合并区间起点）

      // 如果有指标数据，按指标导出（每个指标一行）
      if (t.indicators && t.indicators.length > 0) {
        t.indicators.forEach((ind, idx) => {
          const indicator = DB.getById('indicators', ind.indicatorId);
          const indName = indicator ? indicator.name : (ind.name || '未知指标');
          // 第一个指标行：填写人员信息
          if (idx === 0) {
            rows.push([
              seq,
              emp ? emp.empNo : '',
              emp ? emp.name : '',
              emp ? App.getDeptName(emp.deptId) : '',
              emp ? App.getPositionName(emp.positionId) : '',
              indName,
              ind.weight || '',
              ind.targetValue || '',
              ind.actualValue || '',
              ind.completionRate || '',
              getDesc(ind),
              ind.selfScore || '',
              ind.supervisorScore || '',
              ind.calibratedScore || '',
              finalScore,
              coeff,
              internalCoeffVal,
              extCoeffVal,
              extWeightVal
            ]);
          } else {
            // 后续指标行：人员信息留空（合并后由首行统一展示）
            rows.push([
              null,  // 序号留空
              null,  // 工号留空
              null,  // 姓名留空
              null,  // 部门留空
              null,  // 职务留空
              indName,
              ind.weight || '',
              ind.targetValue || '',
              ind.actualValue || '',
              ind.completionRate || '',
              getDesc(ind),
              ind.selfScore || '',
              ind.supervisorScore || '',
              ind.calibratedScore || '',
              null,  // 最终得分留空
              null,  // 绩效系数留空
              null,  // 内部系数留空
              null,  // 外部系数留空
              null   // 外部占比留空
            ]);
          }
        });
      } else {
        // 如果没有指标数据，导出一行汇总信息
        rows.push([
          seq,
          emp ? emp.empNo : '',
          emp ? emp.name : '',
          emp ? App.getDeptName(emp.deptId) : '',
          emp ? App.getPositionName(emp.positionId) : '',
          '汇总',
          '',
          '',
          '',
          '',
          '',
          t.selfTotalScore || '',
          t.supervisorTotalScore || '',
          t.finalScore || '',
          finalScore,
          coeff,
          internalCoeffVal,
          extCoeffVal,
          extWeightVal
        ]);
      }

      // 记录该人员的合并区间（仅当占多行时才合并）
      const dataEnd = rows.length - 1;  // 该人员最后一条数据行（合并区间终点）
      if (dataEnd > dataStart) {
        MERGE_COLS.forEach(c => merges.push({ s: { r: dataStart, c }, e: { r: dataEnd, c } }));
      }

      // 每个人之间添加空行
      rows.push([]);
      seq++;
    });

    // 添加底部签字行
    rows.push([]);
    rows.push(['编制', '', '', '', '', '', '', '', '', '', '', '', '', '', '审核', '', '', '', '批准', '']);

    // 生成Excel（单个工作表）
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);

    // 单元格合并：按人员纵向合并 工号/姓名/部门/职务/最终得分/绩效系数
    if (merges.length > 0) ws['!merges'] = merges;

    // 设置列宽
    ws['!cols'] = [
      {wch:6},   // 序号
      {wch:10},  // 工号
      {wch:8},   // 姓名
      {wch:12},  // 部门
      {wch:12},  // 职务
      {wch:20},  // 指标项
      {wch:8},   // 权重
      {wch:12},  // 目标值
      {wch:12},  // 实际值
      {wch:10},  // 完成率
      {wch:30},  // 完成情况描述
      {wch:10},  // 自评分
      {wch:10},  // 上级分
      {wch:10},  // 校准分
      {wch:10},  // 最终得分
      {wch:10},  // 绩效系数
      {wch:10},  // 内部系数
      {wch:10},  // 外部系数
      {wch:10}   // 外部占比
    ];

    XLSX.utils.book_append_sheet(wb, ws, '结果统计');
    XLSX.writeFile(wb, '结果统计与分析.xlsx');
  }








  // 设置 Excel 单元格样式（兼容 SheetJS 社区版）
  function setXlsxCellStyle(ws, row, col, style) {
    const addr = XLSX.utils.encode_cell({ r: row, c: col });
    if (!ws[addr]) ws[addr] = { t: 's', v: '' };
    if (!ws[addr].s) ws[addr].s = {};
    Object.assign(ws[addr].s, style);
  }


  // 统计打印
  // 统计打印（含考核方案→考核周期分组标题）
  function printStats() {
    const planCbs = document.querySelectorAll('#statsPlanDropdown input[type="checkbox"]:checked');
    const cycleCbs = document.querySelectorAll('#statsCycleDropdown input[type="checkbox"]:checked');
    const statusCbs = document.querySelectorAll('#statsStatusDropdown input[type="checkbox"]:checked');
    const planIds = Array.from(planCbs).map(cb => cb.value);
    const cycleVals = Array.from(cycleCbs).map(cb => cb.value);
    const statusVals = Array.from(statusCbs).map(cb => cb.value);
    const cycleText = cycleVals.length === 1 ? cycleVals[0] : '全部';
    let tasks = getEvaluatedTasks();
    if (planIds.length > 0) tasks = tasks.filter(t => planIds.includes(t.planId));
    if (cycleVals.length > 0) tasks = tasks.filter(t => cycleVals.includes(t.cycle));
    if (statusVals.length > 0) tasks = tasks.filter(t => statusVals.includes(t.status));

    if (tasks.length === 0) {
      App.toast('暂无符合条件的绩效数据', 'warning');
      return;
    }

    // 按考核方案→考核周期分组
    const groups = {};
    tasks.forEach(t => {
      const planId = t.planId;
      const cycle = t.cycle || '未知周期';
      if (!groups[planId]) groups[planId] = {};
      if (!groups[planId][cycle]) groups[planId][cycle] = [];
      groups[planId][cycle].push(t);
    });
    const sortedPlans = Object.keys(groups).sort((a, b) => {
      const pa = DB.getById('assessmentPlans', a);
      const pb = DB.getById('assessmentPlans', b);
      return (pa ? pa.name : '') > (pb ? pb.name : '') ? 1 : -1;
    });

    const planGroupsHTML = sortedPlans.map(planId => {
      const plan = DB.getById('assessmentPlans', planId);
      const cycles = Object.keys(groups[planId]).sort().reverse();
      return `        <div style="margin-bottom:10px;">
        <div style="padding:5px 10px; background:#e6f4ff; font-weight:bold; font-size:10pt; border:1px solid #1677ff; border-bottom:none; letter-spacing:1px;">
          📋 ${plan ? plan.name : planId}（${cycles.length} 个考核周期）
        </div>
        ${cycles.map(cycle => {
          const ct = groups[planId][cycle];
          const rows = ct.map((t, i) => {
            const emp = DB.getById('employees', t.employeeId);
            const dept = emp ? DB.getById('departments', emp.deptId) : null;
            const pos = emp ? DB.getById('positions', emp.positionId) : null;
            const rawScoreForPrint = getCurrentScoreForDisplay(t);
            const isPercentPrint = plan && plan.scoreMode === 'percentage';
            // 百分制：外部评价100%时不依赖内部得分，直接取 externalCoeff；否则按当前得分融合外部评价
            // 等级制：按 finalGrade 查找对应等级的 coefficient 数值
            let _coefDisplay = '-';
            if (isPercentPrint) {
              const extWeight = t.externalWeight != null ? Number(t.externalWeight) : 0;
              const extCoeff = t.externalCoeff != null ? Number(t.externalCoeff) : null;
              if (Math.abs(extWeight - 1) < 1e-9 && extCoeff != null) {
                _coefDisplay = extCoeff.toFixed(2);
              } else if (rawScoreForPrint != null) {
                _coefDisplay = App.calcBlendedCoefficient(t, rawScoreForPrint).toFixed(2);
              }
            } else {
              const grade = t.finalGrade;
              if (grade && plan && plan.gradeRules) {
                const rule = plan.gradeRules.find(r => r.grade === grade);
                if (rule && rule.coefficient != null) {
                  _coefDisplay = Number(rule.coefficient).toFixed(2);
                }
              }
            }
            const renDanChouCoef = t.renDanChouCoef != null ? t.renDanChouCoef : '';
            const remark = t.remark || '';
            return `<tr>
              <td style="padding:3px 5px; border:1px solid #000; width:5%; font-size:9pt;">${i + 1}</td>
              <td style="padding:3px 5px; border:1px solid #000; width:15%; text-align:left; font-size:9pt;">${dept ? dept.name : '-'}</td>
              <td style="padding:3px 5px; border:1px solid #000; width:10%; font-size:9pt;">${emp ? emp.empNo : '-'}</td>
              <td style="padding:3px 5px; border:1px solid #000; width:10%; text-align:left; font-size:9pt;">${emp ? emp.name : '-'}</td>
              <td style="padding:3px 5px; border:1px solid #000; width:12%; text-align:left; font-size:9pt;">${pos ? pos.name : '-'}</td>
              <td style="padding:3px 5px; border:1px solid #000; width:10%; font-size:9pt;">${_coefDisplay}</td>
              <td style="padding:3px 5px; border:1px solid #000; width:10%; font-size:9pt;">${renDanChouCoef}</td>
              <td style="padding:3px 5px; border:1px solid #000; width:12%; font-size:9pt; text-align:left;">${remark}</td>
            </tr>`;
          }).join('');
          return `<div>
            <div style="padding:3px 10px; background:#f5f8ff; font-size:9pt; font-weight:bold; border:1px solid #1677ff; border-bottom:none; text-align:left;">
              🗓️ ${cycle}（${ct.length} 人）
            </div>
            <table style="width:100%; border-collapse:collapse; margin-bottom:0;">
              <thead><tr>
                <th style="padding:4px 6px; border:1px solid #000; background:#f0f0f0; font-size:9pt;">序号</th>
                <th style="padding:4px 6px; border:1px solid #000; background:#f0f0f0; font-size:9pt;">部门</th>
                <th style="padding:4px 6px; border:1px solid #000; background:#f0f0f0; font-size:9pt;">工号</th>
                <th style="padding:4px 6px; border:1px solid #000; background:#f0f0f0; font-size:9pt;">姓名</th>
                <th style="padding:4px 6px; border:1px solid #000; background:#f0f0f0; font-size:9pt;">职务</th>
                <th style="padding:4px 6px; border:1px solid #000; background:#f0f0f0; font-size:9pt;">绩效系数</th>
                <th style="padding:4px 6px; border:1px solid #000; background:#f0f0f0; font-size:9pt;">人单酬系数</th>
                <th style="padding:4px 6px; border:1px solid #000; background:#f0f0f0; font-size:9pt;">备注</th>
              </tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>`;
        }).join('')}
      </div>`;
    }).join('');

    const printDate = new Date().toLocaleDateString('zh-CN');
    const statsHeader = `
      <h1 style="font-size:14pt; text-align:center; margin-bottom:3px; font-weight:bold; letter-spacing:2px;">吉麦新能源部长级及以上人员${cycleText}绩效系数统计表</h1>
      <div style="text-align:center; font-size:8pt; color:#666; margin-bottom:10px;">打印时间：${printDate}</div>`;
    const statsFooter = `
      <div style="display:flex; justify-content:space-between; margin-top:20px; padding:0 10%; font-size:8pt;">
        <div style="font-size:9pt;">编制：___________________</div>
        <div style="font-size:9pt;">审核：___________________</div>
        <div style="font-size:9pt;">批准：___________________</div>
      </div>`;

    if (App.isPrintSupported()) {
      // 桌面浏览器：直接调用系统打印
      const oldFrame = document.getElementById('printStatsFrame');
      if (oldFrame) oldFrame.remove();
      const iframe = document.createElement('iframe');
      iframe.id = 'printStatsFrame';
      iframe.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;border:none;z-index:99999;';
      document.body.appendChild(iframe);
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      doc.write(`
        <html><head><meta charset="UTF-8"><title>绩效系数统计表</title>
        <style>
          @page { size: portrait; margin: 8mm; }
          body { font-family: 'SimSun', serif; font-size: 9pt; color: #000; padding: 12px; }
          h1 { font-size: 14pt; text-align: center; margin-bottom: 3px; font-weight: bold; letter-spacing: 2px; }
          .sub { text-align: center; font-size: 8pt; color: #666; margin-bottom: 10px; }
          .footer { display: flex; justify-content: space-between; margin-top: 20px; padding: 0 10%; font-size: 8pt; }
          .footer-item { text-align: center; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style></head><body>
        ${statsHeader}
        ${planGroupsHTML}
        ${statsFooter}
        <script>setTimeout(function(){ window.print(); }, 300);</script>
        </body></html>
      `);
      doc.close();
      iframe.contentWindow.focus();
      iframe.contentWindow.onafterprint = function() { iframe.remove(); };
    } else {
      // 降级：企业微信/移动端不支持直接打印，渲染为图片导出
      const tmp = document.createElement('div');
      tmp.style.cssText = 'position:absolute; left:-10000px; top:0; width:794px; background:#fff; padding:12px; box-sizing:border-box;';
      tmp.innerHTML = statsHeader + planGroupsHTML + statsFooter;
      document.body.appendChild(tmp);
      App.captureElementToImage(tmp, { filename: '绩效系数统计表', title: '绩效系数统计表（图片导出）' }).then(function() {
        setTimeout(function() { if (tmp.parentNode) tmp.parentNode.removeChild(tmp); }, 800);
      });
      App.toast('当前环境不支持直接打印，已为你生成可保存的图片', 'info');
    }
  }

  // 保存人单酬系数/备注到任务数据
  function saveStatsField(taskId, field, value) {
    const task = DB.getById('assessmentTasks', taskId);
    if (!task) return;
    DB.update('assessmentTasks', taskId, { [field]: value });
  }

  // ========== 结果统计详情弹窗 ==========
  function viewStatsDetail(taskId) {
    const task = DB.getById('assessmentTasks', taskId);
    if (!task) return;
    const plan = DB.getById('assessmentPlans', task.planId);
    const emp = DB.getById('employees', task.employeeId);
    const dept = emp ? DB.getById('departments', emp.deptId) : null;
    const pos = emp ? DB.getById('positions', emp.positionId) : null;
    const hasConcurrent = task.concurrentWeight > 0 && task.indicators.some(i => i.positionType === 'concurrent');
    const isPercent = plan && plan.scoreMode === 'percentage';

    let html = '';

    const rawScoreForDetail = getCurrentScoreForDisplay(task);
    const detailScore = rawScoreForDetail != null ? rawScoreForDetail : 0;

    // 基本信息
    html += `
      <table class="data-table mb-4">
        <tr><td style="width:15%; background:#f5f5f5; font-weight:600;">姓名</td><td style="width:18%;">${emp ? emp.name : '-'}</td>
        <td style="width:15%; background:#f5f5f5; font-weight:600;">工号</td><td style="width:18%;">${emp ? emp.empNo : '-'}</td>
        <td style="width:15%; background:#f5f5f5; font-weight:600;">部门</td><td style="width:19%;">${dept ? dept.name : '-'}</td></tr>
        <tr><td style="background:#f5f5f5; font-weight:600;">岗位</td><td>${pos ? pos.name : '-'}</td>
        <td style="background:#f5f5f5; font-weight:600;">考核周期</td><td>${task.cycle}</td>
        <td style="background:#f5f5f5; font-weight:600;">考核方案</td><td>${plan ? plan.name : '-'}</td></tr>
        <tr><td style="background:#f5f5f5; font-weight:600;">评分模式</td><td>${isPercent ? '百分制' : '等级制'}</td>
        <td style="background:#f5f5f5; font-weight:600;">当前状态</td><td colspan="3">
          <span class="tag ${task.status === 'completed' ? 'tag-green' : task.status === 'calibrated' ? 'tag-blue' : 'tag-orange'}">
            ${task.status === 'completed' ? '已完成' : task.status === 'calibrated' ? '已校准' : '已评价'}
          </span>
        </td></tr>
      </table>
    `;

    // 得分汇总卡片
    html += `
      <div class="flex gap-4 mb-4">
        <div class="flex-1 p-4" style="background: var(--primary-bg); border-radius: 8px;">
          <div class="text-sm text-tertiary">最终得分${hasConcurrent ? '（加权）' : ''}</div>
          <div class="score-display" style="font-size:28px; font-weight:700; color:var(--primary);">${detailScore.toFixed(2)}<span class="unit" style="font-size:14px;">分</span></div>
        </div>
        <div class="flex-1 p-4" style="background: var(--success-bg); border-radius: 8px;">
          <div class="text-sm text-tertiary">自评总分</div>
          <div class="score-display" style="font-size:28px; font-weight:700; color:var(--success);">${(task.selfTotalScore || 0).toFixed(2)}<span class="unit" style="font-size:14px;">分</span></div>
        </div>
        <div class="flex-1 p-4" style="background: #fff7e6; border-radius: 8px;">
          <div class="text-sm text-tertiary">上级评分</div>
          <div class="score-display" style="font-size:28px; font-weight:700; color: #fa8c16;">${(task.supervisorTotalScore || 0).toFixed(2)}<span class="unit" style="font-size:14px;">分</span></div>
        </div>
        ${isPercent ? `
          <div class="flex-1 p-4" style="background: #f9f0ff; border-radius: 8px;">
            <div class="text-sm text-tertiary">考核系数</div>
            <div class="score-display" style="font-size:28px; font-weight:700; color: #722ed1;">${isPercent && rawScoreForDetail != null ? App.calcBlendedCoefficient(task, rawScoreForDetail) : '-'}</div>
          </div>
        ` : `
          <div class="flex-1 p-4" style="background: #f9f0ff; border-radius: 8px;">
            <div class="text-sm text-tertiary">绩效等级</div>
            <div style="font-size:24px; font-weight:700; margin-top:4px;">
              <span class="grade-display grade-${task.finalGrade || 'C'}" style="font-size:20px;">${task.finalGrade || '-'}</span>
            </div>
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
      const concPos = emp ? DB.getById('positions', emp.concurrentPositionId) : null;
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

    // 指标明细表
    html += `
      <div class="text-sm text-tertiary mb-2">📊 考核指标明细</div>
      <table class="data-table mb-4">
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
            <th>校准分</th>
          </tr>
        </thead>
        <tbody>
          ${task.indicators.map(ind => {
            const indDef = DB.getById('indicators', ind.indicatorId);
            const posTag = ind.positionType === 'concurrent'
              ? '<span class="tag tag-purple" style="font-size:11px;">兼任</span>'
              : '<span class="tag tag-blue" style="font-size:11px;">本职</span>';
            return `
              <tr>
                <td>${posTag}</td>
                <td class="font-semibold">${indDef ? indDef.name : '未知指标'}</td>
                <td>${ind.weight}%</td>
                <td>${ind.targetValue || '-'}</td>
                <td>${ind.actualValue || '-'}</td>
                <td>${ind.completionRate != null ? ind.completionRate + '%' : '-'}</td>
                <td>${ind.selfScore != null ? ind.selfScore.toFixed(2) : '-'}</td>
                <td>${ind.supervisorScore != null ? ind.supervisorScore.toFixed(2) : '-'}</td>
                <td>${ind.calibratedScore != null ? `<strong class="text-primary">${ind.calibratedScore.toFixed(2)}</strong>` : '-'}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;

    // 完成情况描述（如果有）
    const hasDesc = task.indicators.some(i => i.completionDesc);
    if (hasDesc) {
      html += `
        <div class="text-sm text-tertiary mb-2">📝 完成情况描述</div>
        <table class="data-table mb-4">
          <thead>
            <tr><th>指标名称</th><th>完成情况描述</th></tr>
          </thead>
          <tbody>
            ${task.indicators.filter(i => i.completionDesc).map(ind => {
              const indDef = DB.getById('indicators', ind.indicatorId);
              return `<tr>
                <td style="width:20%;" class="font-semibold">${indDef ? indDef.name : '-'}</td>
                <td style="white-space:pre-wrap;">${ind.completionDesc}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      `;
    }

    // 评价意见
    if (task.supervisorComment) {
      html += `<div class="alert alert-info mb-2"><strong>💬 上级评价意见：</strong>${task.supervisorComment}</div>`;
    }
    if (task.hrComment) {
      html += `<div class="alert alert-success mb-2"><strong>💬 HR审核意见：</strong>${task.hrComment}</div>`;
    }
    if (task.calibReason) {
      html += `<div class="alert alert-warning mb-2"><strong>🔧 绩效校准原因：</strong>${task.calibReason}</div>`;
    }
    if (task.returnReason) {
      html += `<div class="alert alert-warning mb-2"><strong>↩️ 退回原因：</strong>${task.returnReason}</div>`;
    }

    App.showModal('考核详情 - ' + (emp ? emp.name : ''), html, `<button class="btn btn-primary" onclick="App.closeModal()">关闭</button>`, 'lg');
  }

  // ========== 系统配置 ==========
  function renderSystemConfig(container) {
    Admin._configTab = Admin._configTab || 'announcement';
    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div class="flex gap-2">
            <button class="btn ${Admin._configTab === 'announcement' ? 'btn-primary' : ''}" onclick="Admin.switchConfigTab('announcement')">公告管理</button>
            <button class="btn ${Admin._configTab === 'role' ? 'btn-primary' : ''}" onclick="Admin.switchConfigTab('role')">角色权限</button>
            <button class="btn ${Admin._configTab === 'log' ? 'btn-primary' : ''}" onclick="Admin.switchConfigTab('log')">操作日志</button>
          </div>
        </div>
        <div class="card-body" id="configTabContent"></div>
      </div>
    `;
    renderConfigTab();
  }

  function switchConfigTab(tab) {
    Admin._configTab = tab;
    renderSystemConfig(document.getElementById('contentArea'));
  }

  function renderConfigTab() {
    const content = document.getElementById('configTabContent');
    if (Admin._configTab === 'announcement') renderAnnouncementTab(content);
    else if (Admin._configTab === 'role') renderRoleTab(content);
    else if (Admin._configTab === 'log') renderLogTab(content);
  }

  function renderAnnouncementTab(container) {
    const announcements = DB.getAll('announcements');
    container.innerHTML = `
      <div class="flex justify-between mb-4">
        <h3 class="font-semibold">系统公告</h3>
        <button class="btn btn-primary btn-sm" onclick="Admin.editAnnouncement(null)">+ 发布公告</button>
      </div>
      <table class="data-table">
        <thead><tr><th>标题</th><th>接收范围</th><th>发布人</th><th>发布时间</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          ${announcements.map(a => `<tr>
            <td class="font-semibold">${a.title}</td>
            <td>${a.scopeDetail}</td>
            <td>${a.publisher}</td>
            <td class="text-sm">${a.publishTime}</td>
            <td><span class="status-tag status-active">${a.status === 'published' ? '已发布' : '草稿'}</span></td>
            <td>
              <button class="btn btn-sm btn-link" onclick="Admin.editAnnouncement('${a.id}')">编辑</button>
              <button class="btn btn-sm btn-link text-danger" onclick="Admin.deleteAnnouncement('${a.id}')">删除</button>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    `;
  }

  function editAnnouncement(annId) {
    const ann = annId ? DB.getById('announcements', annId) : null;
    const html = `
      <form id="annForm">
        <div class="form-group">
          <label class="form-label">公告标题<span class="required">*</span></label>
          <input type="text" class="form-input" name="title" value="${ann ? ann.title : ''}" required>
        </div>
        <div class="form-group">
          <label class="form-label">接收范围<span class="required">*</span></label>
          <select class="form-select" name="scope">
            <option value="all" ${ann && ann.scope === 'all' ? 'selected' : ''}>全员</option>
            <option value="dept" ${ann && ann.scope === 'dept' ? 'selected' : ''}>指定部门</option>
            <option value="position" ${ann && ann.scope === 'position' ? 'selected' : ''}>指定岗位</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">公告内容<span class="required">*</span></label>
          <textarea class="form-textarea" name="content" style="min-height:200px;" required>${ann ? ann.content : ''}</textarea>
        </div>
      </form>
    `;
    App.showModal(ann ? '编辑公告' : '发布公告', html, `
      <button class="btn" onclick="App.closeModal()">取消</button>
      <button class="btn btn-primary" onclick="Admin.saveAnnouncement('${annId || ''}')">发布</button>
    `);
  }

  function saveAnnouncement(annId) {
    const form = document.getElementById('annForm');
    const data = {
      title: form.title.value.trim(),
      scope: form.scope.value,
      scopeDetail: form.scope.value === 'all' ? '全员' : form.scope.value === 'dept' ? '指定部门' : '指定岗位',
      content: form.content.value.trim(),
      publisher: App.currentUser.name,
      publishTime: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
      status: 'published',
    };
    if (!data.title || !data.content) { App.toast('请填写完整', 'error'); return; }

    if (annId) {
      DB.update('announcements', annId, data);
    } else {
      data.id = DB.genId('AN');
      DB.insert('announcements', data);
    }
    DB.log(App.currentUser.name, '公告管理', `${annId ? '修改' : '发布'}公告：${data.title}`);
    App.closeModal();
    App.toast('保存成功', 'success');
    renderConfigTab();
  }

  function deleteAnnouncement(annId) {
    App.confirm('确定删除该公告吗？', () => {
      const ann = DB.getById('announcements', annId);
      DB.remove('announcements', annId);
      DB.log(App.currentUser.name, '公告管理', `删除公告：${ann.title}`);
      App.toast('删除成功', 'success');
      renderConfigTab();
    });
  }

  function renderRoleTab(container) {
    const roles = [
      { id: 'employee', name: '普通员工', desc: '查看公告、自评打分、查询结果、打印绩效表' },
      { id: 'supervisor', name: '上级主管', desc: '包含员工权限 + 上级评价' },
      { id: 'hr', name: 'HR管理员', desc: '指标库维护、考核方案配置、校准、统计分析、组织人员管理' },
      { id: 'sysadmin', name: '系统管理员', desc: '权限分配、日志审计、数据备份、系统公告管理' },
      { id: 'admin', name: '总经理', desc: '全部管理权限' },
    ];

    container.innerHTML = `
      <div class="alert alert-info">
        <span>💡 系统预置四类角色，支持自定义角色并分配权限。权限控制粒度：页面级（是否可见）+ 按钮级（增/删/改/查/导出/打印）。</span>
      </div>
      <table class="data-table">
        <thead><tr><th>角色</th><th>权限范围</th><th>操作</th></tr></thead>
        <tbody>
          ${roles.map(r => `<tr>
            <td><span class="tag ${r.id === 'hr' ? 'tag-purple' : r.id === 'supervisor' ? 'tag-green' : r.id === 'sysadmin' ? 'tag-orange' : r.id === 'admin' ? 'tag-red' : 'tag-gray'}">${r.name}</span></td>
            <td class="text-sm">${r.desc}</td>
            <td><button class="btn btn-sm btn-link" onclick="App.toast('角色权限详情查看权限矩阵', 'info')">查看权限</button></td>
          </tr>`).join('')}
        </tbody>
      </table>
    `;
  }

  function renderLogTab(container) {
    const logs = DB.getAll('operationLogs').sort((a,b) => b.operateTime.localeCompare(a.operateTime));
    container.innerHTML = `
      <div class="alert alert-warning">
        <span>⚠️ 操作日志不可删除、不可修改，确保审计合规。</span>
      </div>
      <div class="filter-bar mb-4">
        <div class="form-group">
          <label class="form-label">操作人</label>
          <input type="text" class="form-input" id="logOperator" placeholder="操作人" oninput="Admin.filterLogs()">
        </div>
        <div class="form-group">
          <label class="form-label">操作类型</label>
          <select class="form-select" id="logType" onchange="Admin.filterLogs()">
            <option value="">全部</option>
            <option value="登录">登录</option>
            <option value="退出">退出</option>
            <option value="指标配置">指标配置</option>
            <option value="绩效自评">绩效自评</option>
            <option value="考核方案">考核方案</option>
            <option value="考核计划">考核计划</option>
            <option value="绩效校准">绩效校准</option>
            <option value="部门管理">部门管理</option>
            <option value="员工管理">员工管理</option>
            <option value="公告管理">公告管理</option>
          </select>
        </div>
      </div>
      <table class="data-table" id="logTable">
        <thead><tr><th>操作人</th><th>操作时间</th><th>操作类型</th><th>操作详情</th><th>IP地址</th></tr></thead>
        <tbody>
          ${logs.map(log => `<tr>
            <td class="font-semibold">${log.operator}</td>
            <td class="text-sm">${log.operateTime}</td>
            <td><span class="tag tag-blue">${log.type}</span></td>
            <td class="text-sm">${log.detail}</td>
            <td class="text-sm text-tertiary">${log.ip}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    `;
  }

  function filterLogs() {
    const operator = document.getElementById('logOperator').value.toLowerCase();
    const type = document.getElementById('logType').value;
    let logs = DB.getAll('operationLogs').sort((a,b) => b.operateTime.localeCompare(a.operateTime));
    if (operator) logs = logs.filter(l => l.operator.toLowerCase().includes(operator));
    if (type) logs = logs.filter(l => l.type === type);
    document.querySelector('#logTable tbody').innerHTML = logs.map(log => `<tr>
      <td class="font-semibold">${log.operator}</td>
      <td class="text-sm">${log.operateTime}</td>
      <td><span class="tag tag-blue">${log.type}</span></td>
      <td class="text-sm">${log.detail}</td>
      <td class="text-sm text-tertiary">${log.ip}</td>
    </tr>`).join('');
  }

  // ========== HR审核 ==========
  function renderHRReview(container) {
    const pendingTasks = DB.getAll('assessmentTasks').filter(t => t.status === 'self_evaluated');
    const reviewingTasks = DB.getAll('assessmentTasks').filter(t => t.status === 'hr_reviewing');
    const reviewedTasks = DB.getAll('assessmentTasks').filter(t => ['hr_reviewed', 'supervisor_evaluating', 'supervisor_done', 'calibrated', 'completed'].includes(t.status));

    container.innerHTML = `
      <div class="alert alert-info">
        <span>🔍 员工提交自评后，HR对自评内容进行审核确认。审核通过后流转至上级评价环节。</span>
      </div>

      <div class="stat-grid mb-4">
        <div class="stat-card"><div class="stat-icon orange">⏳</div><div class="stat-info"><div class="label">待审核</div><div class="value">${pendingTasks.length}</div></div></div>
        <div class="stat-card"><div class="stat-icon blue">🔍</div><div class="stat-info"><div class="label">审核中</div><div class="value">${reviewingTasks.length}</div></div></div>
        <div class="stat-card"><div class="stat-icon green">✅</div><div class="stat-info"><div class="label">已审核</div><div class="value">${reviewedTasks.length}</div></div></div>
      </div>

      <div class="card">
        <div class="card-header"><h3>审核列表</h3></div>
        <div class="card-body no-pad">
          ${pendingTasks.length === 0 && reviewingTasks.length === 0 ? `<div class="empty-state"><div class="icon">📭</div><p>暂无需要审核的考核任务</p></div>` : `
            <table class="data-table">
              <thead><tr><th>工号</th><th>姓名</th><th>部门</th><th>考核周期</th><th>自评得分</th><th>指标数</th><th>状态</th><th>操作</th></tr></thead>
              <tbody>
                ${[...pendingTasks, ...reviewingTasks].map(t => {
                  const emp = DB.getById('employees', t.employeeId);
                  const dept = emp ? DB.getById('departments', emp.deptId) : null;
                  return `<tr>
                    <td>${emp ? emp.empNo : '-'}</td>
                    <td class="font-semibold">${emp ? emp.name : '-'}</td>
                    <td>${dept ? dept.name : '-'}</td>
                    <td>${t.cycle}</td>
                    <td class="font-bold">${t.selfTotalScore ? t.selfTotalScore.toFixed(2) : '-'}</td>
                    <td>${t.indicators.length} 项</td>
                    <td><span class="status-tag ${App.getTaskStatusClass(t.status)}">${App.getTaskStatusText(t.status)}</span></td>
                    <td>
                      <button class="btn btn-sm btn-primary" onclick="Admin.doHRReview('${t.id}')">审核</button>
                    </td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          `}
        </div>
      </div>
    `;
  }

  function doHRReview(taskId) {
    const task = DB.getById('assessmentTasks', taskId);
    if (!task) return;
    const plan = DB.getById('assessmentPlans', task.planId);
    const emp = DB.getById('employees', task.employeeId);
    const dept = emp ? DB.getById('departments', emp.deptId) : null;
    const pos = emp ? DB.getById('positions', emp.positionId) : null;
    // 已审核通过及后续状态才只读
    const isReadOnly = ['hr_reviewed', 'supervisor_evaluating', 'supervisor_done', 'calibrated', 'completed'].includes(task.status);

    // 如果是待审核状态，先改为"审核中"
    if (task.status === 'self_evaluated') {
      DB.update('assessmentTasks', taskId, { status: 'hr_reviewing' });
      task.status = 'hr_reviewing';
    }

    let html = `
      <div class="flex gap-4 mb-4">
        <div class="flex-1 p-3" style="background:var(--bg-page); border-radius:8px;">
          <div class="text-sm text-tertiary">员工</div>
          <div class="font-semibold">${emp.name}（${emp.empNo}）</div>
        </div>
        <div class="flex-1 p-3" style="background:var(--bg-page); border-radius:8px;">
          <div class="text-sm text-tertiary">部门 / 岗位</div>
          <div class="font-semibold">${dept ? dept.name : '-'} / ${pos ? pos.name : '-'}${emp.concurrentPositionId ? ' +' + (DB.getById('positions', emp.concurrentPositionId)?.name || '') : ''}</div>
        </div>
        <div class="flex-1 p-3" style="background:var(--bg-page); border-radius:8px;">
          <div class="text-sm text-tertiary">考核方案 / 周期</div>
          <div class="font-semibold">${plan.name} / ${task.cycle}</div>
        </div>
        <div class="flex-1 p-3" style="background:var(--primary-light); border-radius:8px;">
          <div class="text-sm text-tertiary">自评总分${task.concurrentWeight > 0 ? '（加权）' : ''}</div>
          <div class="text-xl font-bold text-primary" id="hrReviewTotalScore">${task.selfTotalScore ? task.selfTotalScore.toFixed(2) : '0.00'}</div>
        </div>
      </div>

      <div class="alert alert-warning mb-4">
        <span>⚠️ HR审核时可调整员工填写的目标值、实际值和完成率，调整完成率后自评得分将自动重新计算。${task.concurrentWeight > 0 ? '双岗位将按权重加权计算总分。' : ''}</span>
      </div>

      <h4 class="font-semibold mb-2">指标审核（可编辑）</h4>
      <table class="data-table mb-4">
        <thead><tr><th style="min-width:120px;">指标</th><th>权重</th><th>目标值</th><th>实际值</th><th>完成率（%）</th><th>自评得分</th><th style="min-width:180px;">完成情况描述</th></tr></thead>
        <tbody>
          ${task.indicators.map((ind, idx) => {
            const indDef = DB.getById('indicators', ind.indicatorId);
            const readOnlyAttr = isReadOnly ? 'readonly' : '';
            return `<tr>
              <td class="font-semibold">${indDef ? indDef.name : '未知指标'}</td>
              <td>${ind.weight}%</td>
              <td><input type="text" class="form-input" id="hr_targetValue_${idx}" value="${ind.targetValue || ''}" ${readOnlyAttr}></td>
              <td><input type="text" class="form-input" id="hr_actualValue_${idx}" value="${ind.actualValue || ''}" ${readOnlyAttr}></td>
              <td>
                <input type="number" class="form-input" id="hr_completionRate_${idx}" value="${ind.completionRate || ''}"
                  step="0.01" min="0" max="999" ${readOnlyAttr} oninput="Admin.onHRCompletionRateChange('${taskId}', ${idx})" style="width:100px;">
              </td>
              <td class="font-bold" id="hr_selfScore_${idx}" style="color:var(--primary);">${ind.selfScore ? ind.selfScore.toFixed(2) : '0.00'}</td>
              <td class="text-sm" style="max-width:200px; word-wrap:break-word; white-space:pre-wrap;">${ind.description || '-'}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>

      <div class="form-group mt-4">
        <label class="form-label">HR审核意见</label>
        <textarea class="form-textarea" id="hrReviewComment" placeholder="请输入审核意见（可选）" ${isReadOnly ? 'readonly' : ''}>${task.hrComment || ''}</textarea>
      </div>
    `;

    const footerBtns = isReadOnly ? `
      <button class="btn btn-primary" onclick="App.closeModal()">关闭</button>
    ` : `
      <button class="btn" onclick="App.closeModal()">取消</button>
      <button class="btn btn-danger" onclick="Admin.rejectHRReview('${taskId}')">↩️ 退回修改</button>
      <button class="btn btn-link" onclick="Admin.saveHRReview('${taskId}')">💾 保存调整</button>
      <button class="btn btn-primary" onclick="Admin.approveHRReview('${taskId}')">✅ 审核通过</button>
    `;

    App.showModal('HR审核 - ' + emp.name, html, footerBtns, 'lg');
  }

  // HR审核中调整完成率，自动计算自评得分
  function onHRCompletionRateChange(taskId, idx) {
    const task = DB.getById('assessmentTasks', taskId);
    if (!task) return;
    const rate = parseFloat(document.getElementById(`hr_completionRate_${idx}`).value) || 0;
    const weight = task.indicators[idx].weight;
    const score = App.calcIndicatorScore(weight, rate);
    document.getElementById(`hr_selfScore_${idx}`).textContent = score.toFixed(2);
    // 更新总分
    updateHRTotalScore(taskId);
  }

  // 更新HR审核弹窗中的总分
  function updateHRTotalScore(taskId) {
    const task = DB.getById('assessmentTasks', taskId);
    if (!task) return;
    const hasConcurrent = task.concurrentWeight > 0 && task.indicators.some(i => i.positionType === 'concurrent');
    let primaryTotal = 0;
    let concurrentTotal = 0;
    task.indicators.forEach((ind, idx) => {
      const scoreEl = document.getElementById(`hr_selfScore_${idx}`);
      const val = scoreEl ? (parseFloat(scoreEl.textContent) || 0) : (ind.selfScore || 0);
      if (ind.positionType === 'concurrent') {
        concurrentTotal += val;
      } else {
        primaryTotal += val;
      }
    });
    const total = hasConcurrent
      ? primaryTotal * (task.primaryWeight || 100) / 100 + concurrentTotal * (task.concurrentWeight || 0) / 100
      : primaryTotal;
    const totalEl = document.getElementById('hrReviewTotalScore');
    if (totalEl) totalEl.textContent = Math.round(total * 100) / 100;
  }

  // 保存HR审核调整（silent=true时不显示toast）
  function saveHRReview(taskId, silent = false) {
    const task = DB.getById('assessmentTasks', taskId);
    if (!task) return;

    for (let i = 0; i < task.indicators.length; i++) {
      const targetValue = document.getElementById(`hr_targetValue_${i}`).value;
      const actualValue = document.getElementById(`hr_actualValue_${i}`).value;
      const completionRate = parseFloat(document.getElementById(`hr_completionRate_${i}`).value) || 0;
      const selfScore = parseFloat(document.getElementById(`hr_selfScore_${i}`).textContent) || 0;

      task.indicators[i].targetValue = targetValue;
      task.indicators[i].actualValue = actualValue;
      task.indicators[i].completionRate = completionRate;
      task.indicators[i].selfScore = selfScore;
    }

    const totalScore = App.calcTotalScore(task.indicators, 'selfScore', task.primaryWeight, task.concurrentWeight);
    const comment = document.getElementById('hrReviewComment').value;

    DB.update('assessmentTasks', taskId, {
      indicators: task.indicators,
      selfTotalScore: Math.round(totalScore * 100) / 100,
      hrComment: comment,
    });

    DB.log(App.currentUser.name, 'HR审核调整', `调整 ${App.getEmployeeName(task.employeeId)} 的自评指标`);
    if (!silent) App.toast('审核调整已保存！', 'success');
  }

  function approveHRReview(taskId) {
    const task = DB.getById('assessmentTasks', taskId);
    if (!task || !['self_evaluated', 'hr_reviewing'].includes(task.status)) return;

    const emp = DB.getById('employees', task.employeeId);
    const isGM = emp && emp.role === 'admin';
    const confirmMsg = isGM
      ? '确认审核通过？该员工为总经理角色，审核通过后将自动跳过上级评价并进入校准环节，自评得分将作为当前得分。'
      : '确认审核通过？审核通过后该任务将流转至上级评价环节。';

    App.confirm(confirmMsg, () => {
      // 先静默保存当前调整
      saveHRReview(taskId, true);
      const updatedTask = DB.getById('assessmentTasks', taskId);

      if (isGM) {
        // 总经理角色：无直属上级，HR审核通过后直接跳过上级评价，进入校准环节
        DB.update('assessmentTasks', taskId, {
          status: 'supervisor_done',
          supervisorTotalScore: updatedTask.selfTotalScore,
          supervisorComment: '总经理角色自动跳过上级评价，自评得分作为当前得分',
        });
        DB.log(App.currentUser.name, 'HR审核', `审核通过 ${App.getEmployeeName(task.employeeId)} 的自评（总经理角色，自动进入校准环节）`);
        App.closeModal();
        App.toast('HR审核通过，总经理角色已自动进入校准环节！', 'success');
        renderCalibration(document.getElementById('contentArea'));
      } else {
        DB.update('assessmentTasks', taskId, { status: 'hr_reviewed' });
        DB.log(App.currentUser.name, 'HR审核', `审核通过 ${App.getEmployeeName(task.employeeId)} 的自评`);
        App.closeModal();
        App.toast('HR审核通过，已流转至上级评价！', 'success');
        renderHRReview(document.getElementById('contentArea'));
      }
    });
  }

  // HR退回自评
  function rejectHRReview(taskId) {
    const task = DB.getById('assessmentTasks', taskId);
    if (!task || !['self_evaluated', 'hr_reviewing'].includes(task.status)) return;

    const comment = document.getElementById('hrReviewComment').value.trim();
    if (!comment) {
      App.toast('退回时请填写审核意见，说明需要修改的内容', 'error');
      return;
    }

    App.confirm('确定退回该自评？员工将重新进行绩效自评。', () => {
      // 清除自评数据，员工需重新填写
      var updateData = {
        status: 'pending_self_eval',
        selfTotalScore: null,
        hrComment: comment,
        returnReason: comment,
        returnedAt: new Date().toISOString(),
        returnedFrom: task.status,
      };
      if (task.indicators) {
        updateData.indicators = task.indicators.map(function(ind) {
          return Object.assign({}, ind, {
            selfScore: null,
            completionRate: null,
            actualValue: null,
            description: null,
          });
        });
      }
      DB.update('assessmentTasks', taskId, updateData);
      DB.log(App.currentUser.name, 'HR退回', `退回 ${App.getEmployeeName(task.employeeId)} 的自评，原因：${comment}`);
      App.closeModal();
      App.toast('已退回，员工需重新完成自评！', 'success');
      renderHRReview(document.getElementById('contentArea'));
    });
  }

  // ========== 上级评价 ==========
  function renderSupervisorEval(container) {
    const subordinates = App.getSubordinates();
    const subIds = subordinates.map(e => e.id);
    const tasks = DB.getAll('assessmentTasks').filter(t => subIds.includes(t.employeeId) && t.status === 'hr_reviewed');

    // 也展示待评价和已评价的
    const allSubTasks = DB.getAll('assessmentTasks').filter(t => subIds.includes(t.employeeId) && ['hr_reviewed', 'supervisor_evaluating', 'supervisor_done', 'calibrated', 'completed'].includes(t.status));

    container.innerHTML = `
      <div class="alert alert-info">
        <span>✏️ 对下属员工的自评结果进行评价打分。评分完成后将提交HR审核。</span>
      </div>

      <div class="stat-grid mb-4">
        <div class="stat-card"><div class="stat-icon orange">📤</div><div class="stat-info"><div class="label">待评价</div><div class="value">${tasks.length}</div></div></div>
        <div class="stat-card"><div class="stat-icon green">✅</div><div class="stat-info"><div class="label">已评价</div><div class="value">${allSubTasks.filter(t => ['supervisor_done','calibrated','completed'].includes(t.status)).length}</div></div></div>
        <div class="stat-card"><div class="stat-icon blue">👥</div><div class="stat-info"><div class="label">下属人数</div><div class="value">${subordinates.length}</div></div></div>
      </div>

      <div class="card">
        <div class="card-header"><h3>评价列表</h3></div>
        <div class="card-body no-pad">
          ${allSubTasks.length === 0 ? `<div class="empty-state"><div class="icon">📭</div><p>暂无需要评价的考核任务</p></div>` : `
            <table class="data-table">
              <thead><tr><th>工号</th><th>姓名</th><th>部门</th><th>考核周期</th><th>自评得分</th><th>上级评分</th><th>状态</th><th>操作</th></tr></thead>
              <tbody>
                ${allSubTasks.map(t => {
                  const emp = DB.getById('employees', t.employeeId);
                  const dept = emp ? DB.getById('departments', emp.deptId) : null;
                  return `<tr>
                    <td>${emp.empNo}</td>
                    <td class="font-semibold">${emp.name}</td>
                    <td>${dept ? dept.name : '-'}</td>
                    <td>${t.cycle}</td>
                    <td class="font-bold">${t.selfTotalScore ? t.selfTotalScore.toFixed(2) : '-'}</td>
                    <td class="font-bold">${t.supervisorTotalScore ? t.supervisorTotalScore.toFixed(2) : '-'}</td>
                    <td><span class="status-tag ${App.getTaskStatusClass(t.status)}">${App.getTaskStatusText(t.status)}</span></td>
                    <td>
                      ${t.status === 'hr_reviewed' ? `<button class="btn btn-sm btn-primary" onclick="Admin.doSupervisorEval('${t.id}')">去评价</button>` : `<button class="btn btn-sm btn-link" onclick="Admin.doSupervisorEval('${t.id}')">查看</button>`}
                    </td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          `}
        </div>
      </div>
    `;
  }

  function doSupervisorEval(taskId) {
    const task = DB.getById('assessmentTasks', taskId);
    if (!task) return;
    const plan = DB.getById('assessmentPlans', task.planId);
    const emp = DB.getById('employees', task.employeeId);
    const isReadOnly = !['hr_reviewed'].includes(task.status);
    const hasConcurrent = task.concurrentWeight > 0 && task.indicators.some(i => i.positionType === 'concurrent');

    let html = `
      <div class="flex gap-4 mb-4">
        <div class="flex-1 p-3" style="background:var(--bg-page); border-radius:8px;">
          <div class="text-sm text-tertiary">员工</div>
          <div class="font-semibold">${emp.name}（${emp.empNo}）</div>
        </div>
        <div class="flex-1 p-3" style="background:var(--bg-page); border-radius:8px;">
          <div class="text-sm text-tertiary">考核周期</div>
          <div class="font-semibold">${task.cycle}</div>
        </div>
        <div class="flex-1 p-3" style="background:var(--primary-light); border-radius:8px;">
          <div class="text-sm text-tertiary">自评总分${hasConcurrent ? '（加权）' : ''}</div>
          <div class="text-xl font-bold text-primary">${task.selfTotalScore ? task.selfTotalScore.toFixed(2) : '-'}</div>
        </div>
      </div>
    `;

    // 双岗位提示
    if (hasConcurrent) {
      const pos = DB.getById('positions', emp.positionId);
      const concPos = DB.getById('positions', emp.concurrentPositionId);
      html += `
        <div class="alert alert-info" style="background:#f0f7ff; border-color:#1677ff;">
          <strong>🔀 兼任岗位考核</strong>　本职（${pos ? pos.name : '-'}）${task.primaryWeight}% + 兼任（${concPos ? concPos.name : '-'}）${task.concurrentWeight}% = 加权总分
        </div>
      `;
    }

    // 按岗位分组渲染指标
    const primaryIndicators = task.indicators.filter(i => i.positionType !== 'concurrent');
    const concurrentIndicators = task.indicators.filter(i => i.positionType === 'concurrent');

    function renderSupGroup(groupIndicators, groupLabel, startIndex, groupColor) {
      let groupHtml = '';
      if (groupIndicators.length === 0) return '';
      if (hasConcurrent) {
        groupHtml += `<div style="padding:8px 16px; background:${groupColor}; border-radius:8px 8px 0 0; font-weight:600; font-size:14px;">${groupLabel}</div>`;
      }
      groupIndicators.forEach((ind, i) => {
        const idx = startIndex + i;
        const indDef = DB.getById('indicators', ind.indicatorId);
        const supervisorScore = ind.supervisorScore || '';
        groupHtml += `
          <div class="card mb-4" style="box-shadow:var(--shadow-md);${hasConcurrent ? ' border-radius:0 0 8px 8px;' : ''}">
            <div class="card-header">
              <h3>指标 ${idx + 1}：${indDef.name}</h3>
              <span class="tag tag-blue">权重 ${ind.weight}%</span>
            </div>
            <div class="card-body">
              <div class="flex gap-4 mb-4 text-sm" style="background:var(--bg-page); padding:12px; border-radius:8px;">
                <div><span class="text-tertiary">目标值：</span>${ind.targetValue || '-'}</div>
                <div><span class="text-tertiary">实际值：</span>${ind.actualValue || '-'}</div>
                <div><span class="text-tertiary">完成率：</span>${ind.completionRate ? ind.completionRate + '%' : '-'}</div>
                <div><span class="text-tertiary">自评分：</span><strong>${ind.selfScore ? ind.selfScore.toFixed(2) : '-'}</strong></div>
              </div>
              ${ind.description ? `<p class="text-sm text-secondary mb-4">📝 ${ind.description}</p>` : ''}
              <div class="form-group">
                <label class="form-label">上级评分<span class="required">*</span></label>
                <input type="number" class="form-input" id="supScore_${idx}" value="${supervisorScore}" step="0.01"
                  placeholder="请输入该指标的评分" ${isReadOnly ? 'readonly' : ''} oninput="Admin.calcSupTotal()">
                <div class="form-hint">评分 = 权重 × 完成率 × 100（参考自评完成率，可根据实际表现调整）</div>
              </div>
            </div>
          </div>
        `;
      });
      return groupHtml;
    }

    html += renderSupGroup(primaryIndicators, '📌 本职岗位指标（权重 ' + (task.primaryWeight || 100) + '%）', 0, '#e6f4ff');
    html += renderSupGroup(concurrentIndicators, '🔀 兼任岗位指标（权重 ' + (task.concurrentWeight || 0) + '%）', primaryIndicators.length, '#f9f0ff');

    // 汇总
    const supTotal = App.calcTotalScore(task.indicators, 'supervisorScore', task.primaryWeight, task.concurrentWeight);
    let summaryHtml = '';
    if (hasConcurrent) {
      const primaryScore = primaryIndicators.reduce((s, ind) => s + (ind.supervisorScore || 0), 0);
      const concurrentScore = concurrentIndicators.reduce((s, ind) => s + (ind.supervisorScore || 0), 0);
      summaryHtml = `
        <div class="flex gap-4 mb-2">
          <div class="flex-1 p-3" style="background:#e6f4ff; border-radius:8px;">
            <div class="text-sm text-tertiary">本职岗位评分</div>
            <div class="text-lg font-bold" style="color:#1677ff;" id="supPrimaryScore">${primaryScore.toFixed(2)}</div>
            <div class="text-sm text-tertiary">× ${(task.primaryWeight || 100)}% = <span id="supPrimaryWeighted">${(primaryScore * (task.primaryWeight || 100) / 100).toFixed(2)}</span></div>
          </div>
          <div class="flex-1 p-3" style="background:#f9f0ff; border-radius:8px;">
            <div class="text-sm text-tertiary">兼任岗位评分</div>
            <div class="text-lg font-bold" style="color:#722ed1;" id="supConcurrentScore">${concurrentScore.toFixed(2)}</div>
            <div class="text-sm text-tertiary">× ${(task.concurrentWeight || 0)}% = <span id="supConcurrentWeighted">${(concurrentScore * (task.concurrentWeight || 0) / 100).toFixed(2)}</span></div>
          </div>
        </div>
      `;
    }
    html += `
      <div class="card" style="background:var(--primary-bg); border:2px solid var(--primary);">
        <div class="card-body">
          ${summaryHtml}
          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm text-tertiary">上级评分总分${hasConcurrent ? '（加权）' : ''}</div>
              <div class="score-display" id="supTotal">${supTotal.toFixed(2)}<span class="unit"> 分</span></div>
            </div>
            ${!isReadOnly ? `<button class="btn btn-primary btn-lg" onclick="Admin.submitSupervisorEval('${taskId}')">✅ 提交评价</button>` : '<span class="tag tag-gray">只读模式</span>'}
          </div>
        </div>
      </div>
      ${!isReadOnly ? `
        <div class="form-group mt-4">
          <label class="form-label">上级评价备注</label>
          <textarea class="form-textarea" id="supComment" placeholder="请输入对该员工的整体评价">${task.supervisorComment || ''}</textarea>
        </div>
      ` : task.supervisorComment ? `<div class="alert alert-info mt-4"><strong>上级评价：</strong>${task.supervisorComment}</div>` : ''}
    `;

    App.showModal('上级评价 - ' + emp.name, html, '', 'lg');
    Admin._currentTask = task;
    Admin._isReadOnly = isReadOnly;
  }

  function calcSupTotal() {
    const task = Admin._currentTask;
    const hasConcurrent = task && task.concurrentWeight > 0 && task.indicators.some(i => i.positionType === 'concurrent');
    let primaryTotal = 0;
    let concurrentTotal = 0;
    task.indicators.forEach((ind, idx) => {
      const el = document.getElementById(`supScore_${idx}`);
      const val = el && el.value ? parseFloat(el.value) : 0;
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
      const totalEl = document.getElementById('supTotal');
      if (totalEl) totalEl.innerHTML = weighted.toFixed(2) + '<span class="unit"> 分</span>';
      const psEl = document.getElementById('supPrimaryScore');
      if (psEl) psEl.textContent = primaryTotal.toFixed(2);
      const csEl = document.getElementById('supConcurrentScore');
      if (csEl) csEl.textContent = concurrentTotal.toFixed(2);
      const pwEl = document.getElementById('supPrimaryWeighted');
      if (pwEl) pwEl.textContent = (primaryTotal * pw / 100).toFixed(2);
      const cwEl = document.getElementById('supConcurrentWeighted');
      if (cwEl) cwEl.textContent = (concurrentTotal * cw / 100).toFixed(2);
    } else {
      const totalEl = document.getElementById('supTotal');
      if (totalEl) totalEl.innerHTML = primaryTotal.toFixed(2) + '<span class="unit"> 分</span>';
    }
  }

  function submitSupervisorEval(taskId) {
    const task = Admin._currentTask;
    if (!task) return;

    for (let i = 0; i < task.indicators.length; i++) {
      const score = document.getElementById(`supScore_${i}`).value;
      if (!score) { App.toast(`请填写第 ${i+1} 项指标的评分`, 'error'); return; }
      task.indicators[i].supervisorScore = parseFloat(score);
    }

    task.supervisorTotalScore = App.calcTotalScore(task.indicators, 'supervisorScore', task.primaryWeight, task.concurrentWeight);
    task.status = 'supervisor_done';
    task.supervisorComment = document.getElementById('supComment')?.value || '';

    DB.update('assessmentTasks', taskId, task);
    DB.log(App.currentUser.name, '上级评价', `完成 ${App.getEmployeeName(task.employeeId)} 的上级评价，评分 ${task.supervisorTotalScore}`);

    App.closeModal();
    App.toast('评价提交成功！', 'success');
    renderSupervisorEval(document.getElementById('contentArea'));
  }
  return {
    render,
    switchOrgTab,
    editDept,
    viewDept,
    deleteDept,
    saveDept,
    editPosition,
    deletePosition,
    savePosition,
    filterEmployees,
    editEmployee,
    resetPassword,
    toggleEmpStatus,
    deleteEmployee,
    updatePositionOptions,
    toggleConcurrentPosition,
    saveEmployee,
    filterIndicators,
    editIndicator,
    deleteIndicator,
    saveIndicator,
    editPlan,
    viewPlan,
    endPlan,
    deletePlan,
    onPlanScoreModeChange,
    savePlan,
    filterTasks,
    generateTasks,
    viewTask,
    completeTask,
    returnTask,
    deleteTask,
    toggleAllEmployees,
    toggleInvertEmployees,
    filterByTag,
    doGenerateTasks,
    doReturnTask,
    calibrateTask,
    toggleMultiSelect,
    onMultiSelectChange,
    filterCalibration,
    toggleCalibSort,
    onCalibScoreChange,
    editExternalEval,
    saveExternalEval,
    saveCalibration,
    onStatsMultiSelectChange,
    openWecomSend,
    sendWecomMessage,
    saveWecomHook,
    exportStats,
    printStats,
    saveStatsField,
    viewStatsDetail,
    switchConfigTab,
    editAnnouncement,
    deleteAnnouncement,
    saveAnnouncement,
    filterLogs,
    doHRReview,
    onHRCompletionRateChange,
    rejectHRReview,
    savePermissionMatrix,
    saveHRReview,
    approveHRReview,
    doSupervisorEval,
    calcSupTotal,
    submitSupervisorEval
  };
})();
