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

  // ========== 前台布局（员工端） ==========
  function renderEmployeeLayout() {
    const menus = [
      { key: 'home', label: '首页', icon: '🏠', badge: getPendingConfirmCount() },
      { key: 'indicator-config', label: '绩效指标配置', icon: '⚙️' },
      { key: 'self-eval', label: '绩效自评', icon: '✏️', badge: getPendingSelfEvalCount() },
      { key: 'result-query', label: '绩效结果查询', icon: '📋' },
      { key: 'print', label: '绩效打印', icon: '🖨️' },
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
    ];

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
      ];
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
        { key: 'emp-home', label: '我的绩效', icon: '👤' },
      ];
    } else if (currentUser.role === 'sysadmin') {
      groupTitle = '系统管理端';
      menus = [
        { key: 'admin-home', label: '工作台', icon: '🏠' },
        { key: 'admin-org', label: '组织与人员管理', icon: '🏢' },
        { key: 'admin-config', label: '系统配置', icon: '⚙️' },
        { key: 'admin-stats', label: '结果统计与分析', icon: '📈' },
        { key: 'emp-home', label: '我的绩效', icon: '👤' },
      ];
    } else if (currentUser.role === 'admin') {
      groupTitle = '总经办';
      menus = [
        { key: 'admin-home', label: '工作台', icon: '🏠' },
        { key: 'supervisor-eval', label: '上级评价', icon: '⭐', badge: getSupervisorPending() },
        { key: 'admin-calibration', label: '绩效校准', icon: '⚖️', badge: getCalibrationPending() },
        { key: 'emp-home', label: '我的绩效', icon: '👤' },
      ];
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

  // 根据分数获取等级
  function getGrade(score, plan) {
    if (!plan || !plan.gradeRules) return null;
    const rules = [...plan.gradeRules].sort((a, b) => b.minScore - a.minScore);
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

  return {
    init, login, logout, navigate, handleLogin,
    closeModal, confirm, confirmCallback, toast,
    get currentUser() { return currentUser; },
    getDeptName, getPositionName, getEmployeeName, getIndicatorName, getIndicator,
    buildDeptTree, calcCompletionRate, calcIndicatorScore, calcTotalScore,
    calcCoefficient, getGrade, getTaskStatusText, getTaskStatusClass,
    getMyTasks, getSubordinates, getHRReviewPending, showModal, formatDate, getCurrentCycle,
    toggleUserMenu,
    showChangePassword,
    closeChangePassword,
    changePassword,
  };
})();
