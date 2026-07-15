/**
 * 主应用逻辑 - 路由、认证、工具函数
 */
const App = (function () {
  let currentUser = null;
  let currentPage = null;

  function init() {
    // 恢复会话
    const session = sessionStorage.getItem('pms_session');
    if (session) {
      currentUser = JSON.parse(session);
      renderApp();
    } else {
      renderLogin();
    }
  }

  function login(empNo, password) {
    const employees = DB.getAll('employees');
    const user = employees.find(e => e.empNo === empNo && e.password === password && e.status === 'active');
    if (user) {
      currentUser = user;
      sessionStorage.setItem('pms_session', JSON.stringify(user));
      DB.log(user.name, '登录', `用户 ${user.name}(${user.empNo}) 登录系统`);
      renderApp();
      return { success: true };
    }
    return { success: false, message: '账号或密码错误，或账号已停用' };
  }

  function logout() {
    if (currentUser) {
      DB.log(currentUser.name, '退出', `用户 ${currentUser.name} 退出系统`);
    }
    currentUser = null;
    currentPage = null;
    sessionStorage.removeItem('pms_session');
    renderLogin();
  }

  function renderLogin() {
    document.getElementById('app').innerHTML = `
      <div class="login-container">
        <div class="login-card">
          <div class="login-logo">
            <div class="icon">📊</div>
            <h1>企业绩效管理系统</h1>
            <p>Enterprise Performance Management System</p>
          </div>
          <form id="loginForm" onsubmit="return false;">
            <div class="form-group">
              <label class="form-label">账号</label>
              <input type="text" class="form-input" id="loginEmpNo" placeholder="请输入账号" autocomplete="off">
            </div>
            <div class="form-group">
              <label class="form-label">密码</label>
              <input type="password" class="form-input" id="loginPassword" placeholder="请输入密码">
            </div>
            <div id="loginError" class="form-error hidden"></div>
            <button type="submit" class="btn btn-primary btn-block btn-lg" style="margin-top: 8px;" onclick="App.handleLogin()">
              登 录
            </button>
          </form>
        </div>
      </div>
    `;
  }

  function handleLogin() {
    const empNo = document.getElementById('loginEmpNo').value.trim();
    const password = document.getElementById('loginPassword').value;
    if (!empNo || !password) {
      showLoginError('请输入账号和密码');
      return;
    }
    const result = login(empNo, password);
    if (!result.success) {
      showLoginError(result.message);
    }
  }

  function showLoginError(msg) {
    const el = document.getElementById('loginError');
    el.textContent = msg;
    el.classList.remove('hidden');
  }

  function renderApp() {
    // 普通员工用前台布局，主管用混合布局，其他角色用后台布局
    if (currentUser.role === 'employee') {
      renderEmployeeLayout();
    } else if (currentUser.role === 'supervisor') {
      renderSupervisorLayout();
    } else {
      renderAdminLayout();
    }
  }

  // Check if a page is allowed for the current role based on permission matrix
  function hasPermission(pageKey) {
    // 默认权限（与权限矩阵页面默认值保持一致）
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
    var savedPerms = DB.getSetting('rolePermissions');
    var role = currentUser.role;
    // Map page keys to module keys
    var keyMap = {
      'home': 'home', 'emp-home': 'home', 'admin-home': 'home',
      'indicator-config': 'indicator',
      'self-eval': 'self-eval',
      'result-query': 'result',
      'print': 'print',
      'admin-org': 'org',
      'admin-indicators': 'indicators-lib',
      'admin-plans': 'plans',
      'admin-tasks': 'tasks', 'hr-review': 'tasks',
      'admin-calibration': 'calibration',
      'admin-stats': 'stats',
      'admin-config': 'config',
      'supervisor-eval': 'supervisor-eval',
    };
    var modKey = keyMap[pageKey];
    if (!modKey) return true; // Unknown pages are allowed by default

    // 已保存自定义权限：严格按配置判断，缺失默认拒绝
    if (savedPerms && savedPerms[modKey] && savedPerms[modKey][role] !== undefined) {
      return savedPerms[modKey][role];
    }
    // 未保存自定义权限：使用默认权限兜底
    if (!savedPerms) {
      return defaultPerms[modKey] ? !!defaultPerms[modKey][role] : false;
    }
    // 已启用自定义权限，但该模块/角色未配置：默认拒绝
    return false;
  }

  // ========== 前台布局（员工端） ==========
  function renderEmployeeLayout() {
    const menus = [
      { key: 'home', label: '首页', icon: '🏠', badge: getPendingConfirmCount() },
      { key: 'indicator-config', label: '绩效指标配置', icon: '⚙️' },
      { key: 'self-eval', label: '绩效自评', icon: '✏️', badge: getPendingSelfEvalCount() },
      { key: 'result-query', label: '绩效结果查询', icon: '📋' },
      { key: 'print', label: '绩效打印', icon: '🖨️' },
    ].filter(m => hasPermission(m.key));

    document.getElementById('app').innerHTML = `
      <div class="app-layout">
        <aside class="sidebar">
          <div class="sidebar-header">
            <div class="logo-icon">📊</div>
            <h2>绩效管理系统</h2>
          </div>
          <nav class="sidebar-nav">
            <div class="nav-group-title">员工端</div>
            ${menus.map(m => `<div class="nav-item" data-page="${m.key}" onclick="App.navigate('${m.key}')">
              <span class="nav-icon">${m.icon}</span>
              <span>${m.label}</span>
              ${m.badge && m.badge > 0 ? `<span class="nav-badge">${m.badge}</span>` : ''}
            </div>`).join('')}
          </nav>
          <div class="sidebar-footer">© 2026 企业绩效管理系统</div>
        </aside>
        <div class="main-area">
          <header class="topbar">
            <div class="topbar-left">
              <span class="page-title" id="pageTitle">首页</span>
            </div>
            <div class="topbar-right">
              <div class="user-menu-wrapper">
                <div class="topbar-user" onclick="App.toggleUserMenu(event)">
                  <div class="user-avatar">${currentUser.name.charAt(0)}</div>
                  <div class="user-info">
                    <div class="name">${currentUser.name}</div>
                    <div class="role">员工</div>
                  </div>
                </div>
                <div class="user-dropdown" id="userDropdown" style="display:none;">
                  <div class="user-dropdown-item" onclick="event.stopPropagation();App.showChangePassword()">🔑 修改密码</div>
                  <div class="user-dropdown-item danger" onclick="event.stopPropagation();App.logout()">🚚 退出登录</div>
                </div>
              </div>
            </div>
          </header>
          <main class="content-area" id="contentArea"></main>
        </div>
      </div>
    `;
    navigate('home');
  }

  // ========== 主管混合布局（员工功能 + 主管特有模块） ==========
  function renderSupervisorLayout() {
    const empMenus = [
      { key: 'emp-home', label: '首页', icon: '🏠', badge: getPendingConfirmCount() },
      { key: 'indicator-config', label: '绩效指标配置', icon: '⚙️' },
      { key: 'self-eval', label: '绩效自评', icon: '✏️', badge: getPendingSelfEvalCount() },
      { key: 'result-query', label: '绩效结果查询', icon: '📋' },
      { key: 'print', label: '绩效打印', icon: '🖨️' },
    ].filter(m => hasPermission(m.key));

    const supervisorMenus = [
      { key: 'supervisor-eval', label: '上级评价', icon: '⭐', badge: getSupervisorPending() },
    ];

    document.getElementById('app').innerHTML = `
      <div class="app-layout">
        <aside class="sidebar">
          <div class="sidebar-header">
            <div class="logo-icon">📊</div>
            <h2>绩效管理系统</h2>
          </div>
          <nav class="sidebar-nav">
            <div class="nav-group-title">员工端</div>
            ${empMenus.map(m => `<div class="nav-item" data-page="${m.key}" onclick="App.navigate('${m.key}')">
              <span class="nav-icon">${m.icon}</span>
              <span>${m.label}</span>
              ${m.badge && m.badge > 0 ? `<span class="nav-badge">${m.badge}</span>` : ''}
            </div>`).join('')}
            <div class="nav-group-title" style="margin-top:12px;">主管端</div>
            ${supervisorMenus.map(m => `<div class="nav-item" data-page="${m.key}" onclick="App.navigate('${m.key}')">
              <span class="nav-icon">${m.icon}</span>
              <span>${m.label}</span>
              ${m.badge && m.badge > 0 ? `<span class="nav-badge">${m.badge}</span>` : ''}
            </div>`).join('')}
          </nav>
          <div class="sidebar-footer">© 2026 企业绩效管理系统</div>
        </aside>
        <div class="main-area">
          <header class="topbar">
            <div class="topbar-left">
              <span class="page-title" id="pageTitle">首页</span>
            </div>
            <div class="topbar-right">
              <div class="user-menu-wrapper">
                <div class="topbar-user" onclick="App.toggleUserMenu(event)">
                  <div class="user-avatar">${currentUser.name.charAt(0)}</div>
                  <div class="user-info">
                    <div class="name">${currentUser.name}</div>
                    <div class="role">上级主管</div>
                  </div>
                </div>
                <div class="user-dropdown" id="userDropdown" style="display:none;">
                  <div class="user-dropdown-item" onclick="event.stopPropagation();App.showChangePassword()">🔑 修改密码</div>
                  <div class="user-dropdown-item danger" onclick="event.stopPropagation();App.logout()">🚚 退出登录</div>
                </div>
              </div>
            </div>
          </header>
          <main class="content-area" id="contentArea"></main>
        </div>
      </div>
    `;
    navigate(currentPage || 'emp-home');
  }

  // ========== 后台布局（管理端） ==========
  function renderAdminLayout() {
    let menus = [];
    let groupTitle = '管理端';

    if (currentUser.role === 'supervisor') {
      groupTitle = '主管端';
      menus = [
        { key: 'admin-home', label: '工作台', icon: '🏠' },
        { key: 'supervisor-eval', label: '上级评价', icon: '✏️', badge: getSupervisorPending() },
        { key: 'emp-home', label: '我的绩效', icon: '👤' },
        { key: 'result-query', label: '绩效结果查询', icon: '📋' },
        { key: 'print', label: '绩效打印', icon: '🖨️' },
      ].filter(m => hasPermission(m.key));
    } else if (currentUser.role === 'hr') {
      groupTitle = 'HR管理端';
      menus = [
        { key: 'admin-home', label: '工作台', icon: '🏠' },
        { key: 'admin-org', label: '组织与人员管理', icon: '🏢' },
        { key: 'admin-indicators', label: '指标库管理', icon: '📚' },
        { key: 'admin-plans', label: '考核方案管理', icon: '📋' },
        { key: 'admin-tasks', label: '考核计划与执行', icon: '🔄' },
        { key: 'hr-review', label: 'HR审核', icon: '🔍', badge: getHRReviewPending() },
        { key: 'admin-calibration', label: '绩效校准', icon: '⚖️', badge: getCalibrationPending() },
        { key: 'admin-stats', label: '结果统计与分析', icon: '📈' },
        { key: 'admin-config', label: '系统配置', icon: '⚙️' },
        { key: 'self-eval', label: '绩效自评', icon: '✏️', badge: getPendingSelfEvalCount() },
        { key: 'emp-home', label: '我的绩效', icon: '👤' },
        { key: 'result-query', label: '绩效结果查询', icon: '📋' },
        { key: 'print', label: '绩效打印', icon: '🖨️' },
      ].filter(m => hasPermission(m.key));
    } else if (currentUser.role === 'sysadmin') {
      groupTitle = '系统管理端';
      menus = [
        { key: 'admin-home', label: '工作台', icon: '🏠' },
        { key: 'admin-org', label: '组织与人员管理', icon: '🏢' },
        { key: 'admin-config', label: '系统配置', icon: '⚙️' },
        { key: 'admin-stats', label: '结果统计与分析', icon: '📈' },
        { key: 'self-eval', label: '绩效自评', icon: '✏️', badge: getPendingSelfEvalCount() },
        { key: 'emp-home', label: '我的绩效', icon: '👤' },
        { key: 'result-query', label: '绩效结果查询', icon: '📋' },
        { key: 'print', label: '绩效打印', icon: '🖨️' },
      ].filter(m => hasPermission(m.key));
    } else if (currentUser.role === 'admin') {
      groupTitle = '总经办';
      menus = [
        { key: 'admin-home', label: '工作台', icon: '🏠' },
        { key: 'supervisor-eval', label: '上级评价', icon: '⭐', badge: getSupervisorPending() },
        { key: 'admin-calibration', label: '绩效校准', icon: '⚖️', badge: getCalibrationPending() },
        { key: 'self-eval', label: '绩效自评', icon: '✏️', badge: getPendingSelfEvalCount() },
        { key: 'emp-home', label: '我的绩效', icon: '👤' },
        { key: 'result-query', label: '绩效结果查询', icon: '📋' },
        { key: 'print', label: '绩效打印', icon: '🖨️' },
      ].filter(m => hasPermission(m.key));
    }

    const roleLabels = {
      supervisor: '上级主管',
      hr: 'HR管理员',
      sysadmin: '系统管理员',
      admin: '总经理',
    };

    document.getElementById('app').innerHTML = `
      <div class="app-layout">
        <aside class="sidebar">
          <div class="sidebar-header">
            <div class="logo-icon">📊</div>
            <h2>绩效管理系统</h2>
          </div>
          <nav class="sidebar-nav">
            <div class="nav-group-title">${groupTitle}</div>
            ${menus.map(m => `<div class="nav-item ${m.key === currentPage ? 'active' : ''}" data-page="${m.key}" onclick="App.navigate('${m.key}')">
              <span class="nav-icon">${m.icon}</span>
              <span>${m.label}</span>
              ${m.badge && m.badge > 0 ? `<span class="nav-badge">${m.badge}</span>` : ''}
            </div>`).join('')}
          </nav>
          <div class="sidebar-footer">© 2026 企业绩效管理系统</div>
        </aside>
        <div class="main-area">
          <header class="topbar">
            <div class="topbar-left">
              <span class="page-title" id="pageTitle">工作台</span>
            </div>
            <div class="topbar-right">
              <div class="user-menu-wrapper">
                <div class="topbar-user" onclick="App.toggleUserMenu(event)">
                  <div class="user-avatar">${currentUser.name.charAt(0)}</div>
                  <div class="user-info">
                    <div class="name">${currentUser.name}</div>
                    <div class="role">${roleLabels[currentUser.role] || ''}</div>
                  </div>
                </div>
                <div class="user-dropdown" id="userDropdown" style="display:none;">
                  <div class="user-dropdown-item" onclick="event.stopPropagation();App.showChangePassword()">🔑 修改密码</div>
                  <div class="user-dropdown-item danger" onclick="event.stopPropagation();App.logout()">🚚 退出登录</div>
                </div>
              </div>
            </div>
          </header>
          <main class="content-area" id="contentArea"></main>
        </div>
      </div>
    `;
    navigate(currentPage || 'admin-home');
  }

  function getSupervisorPending() {
    const tasks = DB.getAll('assessmentTasks');
    const subordinates = DB.getAll('employees').filter(e => e.superiorId === currentUser.id);
    const subIds = subordinates.map(e => e.id);
    return tasks.filter(t => subIds.includes(t.employeeId) && t.status === 'hr_reviewed').length;
  }

  function getHRReviewPending() {
    return DB.getAll('assessmentTasks').filter(t => t.status === 'self_evaluated' || t.status === 'hr_reviewing').length;
  }

  function getPendingConfirmCount() {
    return App.getMyTasks().filter(t => t.status === 'pending_confirm').length;
  }

  function getPendingSelfEvalCount() {
    return App.getMyTasks().filter(t => t.status === 'pending_self_eval').length;
  }

  function getCalibrationPending() {
    return DB.getAll('assessmentTasks').filter(t => t.status === 'supervisor_done').length;
  }

  function navigate(page) {
    currentPage = page;
    // 更新导航高亮
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.page === page);
    });

    const contentArea = document.getElementById('contentArea');
    if (!contentArea) return;

    const pageTitles = {
      'home': '首页',
      'indicator-config': '绩效指标配置',
      'self-eval': '绩效自评',
      'result-query': '绩效结果查询',
      'print': '绩效打印',
      'emp-home': '我的绩效',
      'admin-home': '工作台',
      'admin-org': '组织与人员管理',
      'admin-indicators': '指标库管理',
      'admin-plans': '考核方案管理',
      'admin-tasks': '考核计划与执行',
      'admin-calibration': '绩效校准',
      'admin-stats': '结果统计与分析',
      'admin-config': '系统配置',
      'supervisor-eval': '上级评价',
      'hr-review': 'HR审核',
    };

    const titleEl = document.getElementById('pageTitle');
    if (titleEl) titleEl.textContent = pageTitles[page] || page;

    // 路由分发
    if (page.startsWith('admin-') || page === 'supervisor-eval' || page === 'hr-review') {
      Admin.render(page, contentArea);
    } else {
      Employee.render(page, contentArea);
    }
  }

  // ========== 工具函数 ==========
  function getDeptName(deptId) {
    const dept = DB.getById('departments', deptId);
    return dept ? dept.name : '-';
  }

  function getPositionName(posId) {
    const pos = DB.getById('positions', posId);
    return pos ? pos.name : '-';
  }

  function getEmployeeName(empId) {
    const emp = DB.getById('employees', empId);
    return emp ? emp.name : '-';
  }

  function getIndicatorName(indId) {
    const ind = DB.getById('indicators', indId);
    return ind ? ind.name : '-';
  }

  function getIndicator(id) {
    return DB.getById('indicators', id);
  }

  // 构建部门树
  function buildDeptTree(depts, parentId) {
    return depts
      .filter(d => d.parentId === parentId)
      .sort((a, b) => (a.sort || 0) - (b.sort || 0))
      .map(d => ({ ...d, children: buildDeptTree(depts, d.id) }));
  }

  // 计算完成率
  function calcCompletionRate(actual, target) {
    if (!target || target === 0) return 0;
    return Math.round((actual / target) * 10000) / 100;
  }

  // 计算单项得分
  function calcIndicatorScore(weight, completionRate) {
    return Math.round(weight * completionRate) / 100;
  }

  // 计算总分（支持双岗位加权）
  function calcTotalScore(indicators, scoreField, primaryWeight, concurrentWeight) {
    const pw = primaryWeight != null ? primaryWeight : 100;
    const cw = concurrentWeight != null ? concurrentWeight : 0;
    const hasConcurrent = cw > 0 && indicators.some(i => i.positionType === 'concurrent');
    if (!hasConcurrent) {
      return indicators.reduce((sum, ind) => {
        const score = scoreField === 'selfScore' ? ind.selfScore : (ind.supervisorScore || ind.selfScore);
        return Math.round((sum + (score || 0)) * 100) / 100;
      }, 0);
    }
    const primaryScore = indicators.filter(i => i.positionType !== 'concurrent').reduce((sum, ind) => {
      const score = scoreField === 'selfScore' ? ind.selfScore : (ind.supervisorScore || ind.selfScore);
      return sum + (score || 0);
    }, 0);
    const concurrentScore = indicators.filter(i => i.positionType === 'concurrent').reduce((sum, ind) => {
      const score = scoreField === 'selfScore' ? ind.selfScore : (ind.supervisorScore || ind.selfScore);
      return sum + (score || 0);
    }, 0);
    return Math.round((primaryScore * pw / 100 + concurrentScore * cw / 100) * 100) / 100;
  }

  // 计算考核系数
  function calcCoefficient(totalScore) {
    return Math.round((totalScore / 100) * 100) / 100;
  }

  // 计算融合外部评价后的绩效系数（任务未确认完成时可实时预览）
  function calcBlendedCoefficient(task, score) {
    const internalCoeff = calcCoefficient(score);
    const extWeight = task && task.externalWeight != null ? Number(task.externalWeight) : 0;
    const extCoeff = task && task.externalCoeff != null ? Number(task.externalCoeff) : null;
    if (extWeight > 0 && extCoeff != null) {
      if (Math.abs(extWeight - 1) < 1e-9) return extCoeff;
      return Math.round((internalCoeff * (1 - extWeight) + extCoeff * extWeight) * 100) / 100;
    }
    return internalCoeff;
  }

  // 根据分数获取等级（仅在有 minScore 配置时生效；新等级规则已不配置 minScore，改由人工选择）
  function getGrade(score, plan) {
    if (!plan || !plan.gradeRules) return null;
    const rules = plan.gradeRules.filter(r => r.minScore != null);
    if (rules.length === 0) return null;
    rules.sort((a, b) => b.minScore - a.minScore);
    for (const rule of rules) {
      if (score >= rule.minScore) return rule;
    }
    return rules[rules.length - 1];
  }

  // 获取任务状态文本
  function getTaskStatusText(status) {
    const map = {
      'pending_confirm': '待确认',
      'confirmed': '已确认',
      'pending_self_eval': '待自评',
      'self_evaluated': '已自评',
      'hr_reviewing': 'HR审核中',
      'hr_reviewed': 'HR已审核',
      'supervisor_evaluating': '上级评价中',
      'supervisor_done': '上级已评',
      'calibrated': '已校准',
      'completed': '已完成',
      'rejected': '已退回',
    };
    return map[status] || status;
  }

  function getTaskStatusClass(status) {
    const map = {
      'pending_confirm': 'status-pending',
      'confirmed': 'status-active',
      'pending_self_eval': 'status-progress',
      'self_evaluated': 'status-progress',
      'hr_reviewing': 'status-warning',
      'hr_reviewed': 'status-active',
      'supervisor_evaluating': 'status-active',
      'supervisor_done': 'status-active',
      'calibrated': 'status-done',
      'completed': 'status-completed',
      'rejected': 'status-warning',
    };
    return map[status] || 'status-pending';
  }

  // 获取当前用户的所有考核任务
  function getMyTasks() {
    return DB.getAll('assessmentTasks').filter(t => t.employeeId === currentUser.id);
  }

  // 获取下属员工
  function getSubordinates() {
    return DB.getAll('employees').filter(e => e.superiorId === currentUser.id);
  }

  // 弹窗
  function showModal(title, bodyHtml, footerHtml, size) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'appModal';
    overlay.innerHTML = `
      <div class="modal ${size === 'lg' ? 'modal-lg' : size === 'sm' ? 'modal-sm' : ''}">
        <div class="modal-header">
          <h3>${title}</h3>
          <button class="modal-close" onclick="App.closeModal()">×</button>
        </div>
        <div class="modal-body">${bodyHtml}</div>
        ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ''}
      </div>
    `;
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeModal();
    });
    document.body.appendChild(overlay);
    return overlay;
  }

  function closeModal() {
    const modal = document.getElementById('appModal');
    if (modal) modal.remove();
  }

  // 确认弹窗
  function confirm(message, onConfirm, title) {
    showModal(
      title || '确认操作',
      `<p>${message}</p>`,
      `<button class="btn" onclick="App.closeModal()">取消</button>
       <button class="btn btn-primary" onclick="App.confirmCallback()">确定</button>`,
      'sm'
    );
    document.getElementById('appModal')._onConfirm = onConfirm;
  }

  function confirmCallback() {
    const modal = document.getElementById('appModal');
    if (modal && modal._onConfirm) {
      modal._onConfirm();
    }
    closeModal();
  }

  // 提示消息
  function toast(message, type) {
    const t = document.createElement('div');
    t.style.cssText = `
      position: fixed; top: 80px; left: 50%; transform: translateX(-50%);
      padding: 10px 20px; border-radius: 8px; font-size: 14px; z-index: 9999;
      animation: slideDown 0.3s; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      ${type === 'success' ? 'background:#f6ffed;color:#52c41a;border:1px solid #b7eb8f;'
        : type === 'error' ? 'background:#fff2f0;color:#ff4d4f;border:1px solid #ffccc7;'
        : type === 'warning' ? 'background:#fffbe6;color:#faad14;border:1px solid #ffe58f;'
        : 'background:#e6f4ff;color:#1677ff;border:1px solid #91caff;'}
    `;
    t.textContent = message;
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.3s'; }, 2500);
    setTimeout(() => t.remove(), 3000);
  }

  // 格式化日期
  function formatDate(date) {
    if (!date) return '-';
    if (typeof date === 'string') return date;
    return new Date(date).toLocaleString('zh-CN', { hour12: false });
  }

  // 获取当前周期
  function getCurrentCycle() {
    const now = new Date();
    const month = now.getMonth() + 1;
    const quarter = Math.ceil(month / 3);
    return `${now.getFullYear()}-Q${quarter}`;
  }

  // ========== 用户菜单 & 修改密码 ==========
  function toggleUserMenu(e) {
    e.stopPropagation();
    var dd = document.getElementById('userDropdown');
    if (dd) {
      var isVisible = dd.style.display === 'block';
      dd.style.display = isVisible ? 'none' : 'block';
    }
  }

  document.addEventListener('click', function() {
    var dd = document.getElementById('userDropdown');
    if (dd) dd.style.display = 'none';
  });

  function showChangePassword() {
    var dd = document.getElementById('userDropdown');
    if (dd) dd.style.display = 'none';
    var html = '<div class="modal-overlay" id="pwdModalOverlay" onclick="if(event.target===this)App.closeChangePassword()">' +
      '<div class="modal modal-sm pwd-modal">' +
      '<div class="modal-header"><h3>🔑 修改密码</h3><button class="modal-close" onclick="App.closeChangePassword()">\u00d7</button></div>' +
      '<div class="modal-body">' +
      '<div class="pwd-error" id="pwdError"></div>' +
      '<div class="pwd-success" id="pwdSuccess"></div>' +
      '<div class="form-group"><label class="form-label">原密码</label><input type="password" class="form-input" id="pwdOld" placeholder="请输入原密码"></div>' +
      '<div class="form-group"><label class="form-label">新密码</label><input type="password" class="form-input" id="pwdNew" placeholder="请输入新密码（至少4位）"></div>' +
      '<div class="form-group"><label class="form-label">确认新密码</label><input type="password" class="form-input" id="pwdConfirm" placeholder="请再次输入新密码"></div>' +
      '</div>' +
      '<div class="modal-footer">' +
      '<button class="btn" onclick="App.closeChangePassword()">取消</button>' +
      '<button class="btn btn-primary" onclick="App.changePassword()">确认修改</button>' +
      '</div></div></div>';
    document.body.insertAdjacentHTML('beforeend', html);
    setTimeout(function() { document.getElementById('pwdOld').focus(); }, 100);
  }

  function closeChangePassword() {
    var overlay = document.getElementById('pwdModalOverlay');
    if (overlay) overlay.remove();
  }

  function changePassword() {
    var oldPwd = document.getElementById('pwdOld').value.trim();
    var newPwd = document.getElementById('pwdNew').value.trim();
    var confirmPwd = document.getElementById('pwdConfirm').value.trim();
    var errEl = document.getElementById('pwdError');
    var sucEl = document.getElementById('pwdSuccess');

    errEl.style.display = 'none';
    sucEl.style.display = 'none';

    if (!oldPwd) { errEl.textContent = '请输入原密码'; errEl.style.display = 'block'; return; }
    if (oldPwd !== currentUser.password) { errEl.textContent = '原密码不正确'; errEl.style.display = 'block'; return; }
    if (!newPwd) { errEl.textContent = '请输入新密码'; errEl.style.display = 'block'; return; }
    if (newPwd.length < 4) { errEl.textContent = '新密码至少需要4位'; errEl.style.display = 'block'; return; }
    if (newPwd !== confirmPwd) { errEl.textContent = '两次输入的新密码不一致'; errEl.style.display = 'block'; return; }
    if (newPwd === oldPwd) { errEl.textContent = '新密码不能与原密码相同'; errEl.style.display = 'block'; return; }

    DB.update('employees', currentUser.id, { password: newPwd });
    currentUser.password = newPwd;
    sessionStorage.setItem('pms_session', JSON.stringify(currentUser));
    DB.log(currentUser.name, '修改密码', '用户修改了登录密码');

    sucEl.textContent = '密码修改成功！';
    sucEl.style.display = 'block';
    setTimeout(function() { closeChangePassword(); }, 1500);
  }

  // 云端同步完成后：刷新当前用户数据并重新渲染界面
  function refreshAfterSync() {
    if (!currentUser) return;
    // 从DB重新获取当前用户最新数据（密码可能被其他浏览器修改）
    var freshUser = DB.getById('employees', currentUser.id);
    if (freshUser) {
      currentUser = freshUser;
      sessionStorage.setItem('pms_session', JSON.stringify(currentUser));
    }
    // 重新渲染当前页面
    if (currentPage) {
      navigate(currentPage);
    } else {
      renderApp();
    }
  }

  // 判断当前环境是否支持可靠的 window.print()（企业微信/移动端 WebView 对打印支持差）
  function isPrintSupported() {
    const ua = navigator.userAgent || '';
    const isWeCom = /wxwork/i.test(ua);
    const isMobile = /Mobi|Android|iPhone|iPod|iPad/i.test(ua) || (window.innerWidth > 0 && window.innerWidth < 768);
    return !isWeCom && !isMobile;
  }

  // 将 DOM 元素截图导出为图片（用于不支持打印的环境降级：企业微信/移动端）
  function captureElementToImage(sourceEl, opts) {
    opts = opts || {};
    const filename = opts.filename || 'print';
    const title = opts.title || '打印预览';
    if (typeof window.html2canvas !== 'function') {
      toast('当前环境不支持生成图片，已在新窗口打开预览', 'warning');
      try {
        const w = window.open('', '_blank');
        if (w) { w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>' + sourceEl.innerHTML + '</body></html>'); w.document.close(); }
      } catch (e) { toast('打开预览失败，请改用电脑浏览器打印', 'error'); }
      return Promise.resolve();
    }
    return window.html2canvas(sourceEl, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false })
      .then(canvas => {
        const dataUrl = canvas.toDataURL('image/png');
        const imgHtml = `<div style="text-align:center;"><img src="${dataUrl}" style="max-width:100%; border:1px solid #ddd; border-radius:6px;" /><div style="margin-top:12px; color:#666; font-size:13px;">长按图片可保存到相册，或点击下方按钮下载</div></div>`;
        showModal(title, imgHtml, `
          <button class="btn" onclick="App.closeModal()">关闭</button>
          <a class="btn btn-primary" href="${dataUrl}" download="${filename}.png">📥 下载图片</a>
        `, 'lg');
      })
      .catch(e => {
        console.error('[PMS] 截图失败', e);
        toast('生成图片失败：' + (e && e.message ? e.message : e), 'error');
      });
  }

  return {
    init, login, logout, navigate, handleLogin, renderApp,
    closeModal, confirm, confirmCallback, toast,
    get currentUser() { return currentUser; },
    getDeptName, getPositionName, getEmployeeName, getIndicatorName, getIndicator,
    buildDeptTree, calcCompletionRate, calcIndicatorScore, calcTotalScore,
    calcCoefficient, calcBlendedCoefficient, getGrade, getTaskStatusText, getTaskStatusClass,
    getMyTasks, getSubordinates, getHRReviewPending, showModal, formatDate, getCurrentCycle,
    hasPermission,
    toggleUserMenu,
    showChangePassword,
    closeChangePassword,
    changePassword,
    refreshAfterSync,
    isPrintSupported, captureElementToImage,
  };
})();
