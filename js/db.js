/**
 * 数据层 - 基于localStorage的数据管理
 * 包含种子数据和CRUD操作
 */
const DB = (function () {
  const STORAGE_KEY = 'pms_data_v11';

  // 种子数据
  const seedData = {
    departments: [
      { id: 'D001', name: '总经办', parentId: null, managerId: 'E001', sort: 1, desc: '公司最高管理层' },
      { id: 'D002', name: '销售部', parentId: null, managerId: 'E004', sort: 2, desc: '负责公司产品销售与客户关系维护' },
      { id: 'D003', name: '技术部', parentId: null, managerId: 'E008', sort: 3, desc: '负责产品研发与技术支持' },
      { id: 'D004', name: '人事部', parentId: null, managerId: 'E012', sort: 4, desc: '负责人力资源管理与行政事务' },
      { id: 'D005', name: '财务部', parentId: null, managerId: 'E015', sort: 5, desc: '负责公司财务管理与核算' },
      { id: 'D006', name: '销售一组', parentId: 'D002', managerId: 'E005', sort: 1, desc: '销售部第一小组' },
      { id: 'D007', name: '销售二组', parentId: 'D002', managerId: 'E007', sort: 2, desc: '销售部第二小组' },
      { id: 'D008', name: '前端组', parentId: 'D003', managerId: 'E009', sort: 1, desc: '前端开发团队' },
      { id: 'D009', name: '后端组', parentId: 'D003', managerId: 'E011', sort: 2, desc: '后端开发团队' },
    ],

    positions: [
      { id: 'P001', name: '总经理', deptId: 'D001', desc: '全面负责公司经营管理', indicatorIds: ['I001', 'I002', 'I003'] },
      { id: 'P002', name: '副总经理', deptId: 'D001', desc: '协助总经理管理公司业务', indicatorIds: ['I001', 'I002'] },
      { id: 'P003', name: '销售总监', deptId: 'D002', desc: '负责销售战略与团队管理', indicatorIds: ['I003', 'I004', 'I005'] },
      { id: 'P004', name: '销售经理', deptId: 'D006', desc: '负责销售团队日常管理', indicatorIds: ['I004', 'I005', 'I006'] },
      { id: 'P005', name: '销售专员', deptId: 'D006', desc: '负责产品销售与客户开发', indicatorIds: ['I005', 'I006', 'I007'] },
      { id: 'P006', name: '销售专员', deptId: 'D007', desc: '负责产品销售与客户开发', indicatorIds: ['I005', 'I006', 'I007'] },
      { id: 'P007', name: '技术总监', deptId: 'D003', desc: '负责技术架构与研发管理', indicatorIds: ['I001', 'I008', 'I009'] },
      { id: 'P008', name: '前端工程师', deptId: 'D008', desc: '负责前端开发工作', indicatorIds: ['I008', 'I009', 'I010'] },
      { id: 'P009', name: '后端工程师', deptId: 'D009', desc: '负责后端开发工作', indicatorIds: ['I009', 'I010', 'I011'] },
      { id: 'P010', name: 'HR经理', deptId: 'D004', desc: '负责人力资源全面管理', indicatorIds: ['I001', 'I012', 'I013'] },
      { id: 'P011', name: 'HR专员', deptId: 'D004', desc: '负责招聘培训等事务', indicatorIds: ['I012', 'I013', 'I014'] },
      { id: 'P012', name: '财务经理', deptId: 'D005', desc: '负责财务管理工作', indicatorIds: ['I001', 'I015', 'I016'] },
      { id: 'P013', name: '会计', deptId: 'D005', desc: '负责日常会计核算', indicatorIds: ['I015', 'I016', 'I017'] },
    ],

    employees: [
      { id: 'E001', empNo: '10001', name: '张明', password: '123456', deptId: 'D001', positionId: 'P001', superiorId: null, role: 'admin', hireDate: '2018-03-15', status: 'active', phone: '13800000001', email: 'zhangming@company.com' },
      { id: 'E002', empNo: '10002', name: '李华', password: '123456', deptId: 'D001', positionId: 'P002', superiorId: 'E001', role: 'supervisor', hireDate: '2019-06-01', status: 'active', phone: '13800000002', email: 'lihua@company.com' },
      { id: 'E003', empNo: '10003', name: '王芳', password: '123456', deptId: 'D002', positionId: 'P003', superiorId: 'E001', role: 'supervisor', hireDate: '2019-01-10', status: 'active', phone: '13800000003', email: 'wangfang@company.com' },
      { id: 'E004', empNo: '10004', name: '赵强', password: '123456', deptId: 'D002', positionId: 'P003', superiorId: 'E001', role: 'supervisor', hireDate: '2018-09-20', status: 'active', phone: '13800000004', email: 'zhaoqiang@company.com', tags: ['核心骨干', '高潜'], concurrentPositionId: 'P002', concurrentWeight: 30 },
      { id: 'E005', empNo: '10005', name: '陈丽', password: '123456', deptId: 'D006', positionId: 'P004', superiorId: 'E004', role: 'supervisor', hireDate: '2020-03-15', status: 'active', phone: '13800000005', email: 'chenli@company.com', tags: ['核心骨干'] },
      { id: 'E006', empNo: '10006', name: '刘洋', password: '123456', deptId: 'D006', positionId: 'P005', superiorId: 'E005', role: 'employee', hireDate: '2021-07-01', status: 'active', phone: '13800000006', email: 'liuyang@company.com', tags: ['新员工'] },
      { id: 'E007', empNo: '10007', name: '周敏', password: '123456', deptId: 'D007', positionId: 'P004', superiorId: 'E004', role: 'supervisor', hireDate: '2020-05-20', status: 'active', phone: '13800000007', email: 'zhoumin@company.com' },
      { id: 'E008', empNo: '10008', name: '吴军', password: '123456', deptId: 'D003', positionId: 'P007', superiorId: 'E001', role: 'supervisor', hireDate: '2018-11-10', status: 'active', phone: '13800000008', email: 'wujun@company.com' },
      { id: 'E009', empNo: '10009', name: '郑伟', password: '123456', deptId: 'D008', positionId: 'P008', superiorId: 'E008', role: 'supervisor', hireDate: '2020-08-15', status: 'active', phone: '13800000009', email: 'zhengwei@company.com' },
      { id: 'E010', empNo: '10010', name: '孙磊', password: '123456', deptId: 'D008', positionId: 'P008', superiorId: 'E009', role: 'employee', hireDate: '2022-02-01', status: 'active', phone: '13800000010', email: 'sunlei@company.com', tags: ['新员工', '高潜'] },
      { id: 'E011', empNo: '10011', name: '钱鑫', password: '123456', deptId: 'D009', positionId: 'P009', superiorId: 'E008', role: 'supervisor', hireDate: '2021-01-10', status: 'active', phone: '13800000011', email: 'qianxin@company.com' },
      { id: 'E012', empNo: '10012', name: '冯雪', password: '123456', deptId: 'D004', positionId: 'P010', superiorId: 'E001', role: 'hr', hireDate: '2019-04-01', status: 'active', phone: '13800000012', email: 'fengxue@company.com' },
      { id: 'E013', empNo: '10013', name: '陈晓', password: '123456', deptId: 'D004', positionId: 'P011', superiorId: 'E012', role: 'hr', hireDate: '2022-06-15', status: 'active', phone: '13800000013', email: 'chenxiao@company.com' },
      { id: 'E014', empNo: '10014', name: '卫国', password: '123456', deptId: 'D004', positionId: 'P011', superiorId: 'E012', role: 'employee', hireDate: '2023-03-01', status: 'active', phone: '13800000014', email: 'weiguo@company.com' },
      { id: 'E015', empNo: '10015', name: '蒋涛', password: '123456', deptId: 'D005', positionId: 'P012', superiorId: 'E001', role: 'supervisor', hireDate: '2018-07-10', status: 'active', phone: '13800000015', email: 'jiangtao@company.com' },
      { id: 'E016', empNo: '10016', name: '杨静', password: '123456', deptId: 'D005', positionId: 'P013', superiorId: 'E015', role: 'employee', hireDate: '2022-09-01', status: 'active', phone: '13800000016', email: 'yangjing@company.com' },
      { id: 'E017', empNo: 'admin', name: '系统管理员', password: 'admin123', deptId: 'D004', positionId: 'P011', superiorId: 'E012', role: 'sysadmin', hireDate: '2018-01-01', status: 'active', phone: '13800000017', email: 'admin@company.com' },
    ],

    indicators: [
      { id: 'I001', name: '战略目标达成率', category: '战略', cycle: '年', formula: '实际完成战略目标数/计划战略目标数×100%', minRate: 70, maxRate: 120, standard: '考核年度战略目标的完成情况，达成率越高得分越高', applicablePositions: ['P001', 'P002', 'P007', 'P010', 'P012'] },
      { id: 'I002', name: '团队管理满意度', category: '管理', cycle: '季', formula: '团队满意度评分均值', minRate: 70, maxRate: 120, standard: '通过下属匿名评分评估管理者的团队管理能力', applicablePositions: ['P001', 'P002'] },
      { id: 'I003', name: '销售额完成率', category: '业绩', cycle: '月', formula: '实际销售额/目标销售额×100%', minRate: 70, maxRate: 120, standard: '考核当月销售目标的完成情况', applicablePositions: ['P003', 'P004'] },
      { id: 'I004', name: '客户开发数', category: '业绩', cycle: '月', formula: '实际新开发客户数/目标客户数×100%', minRate: 70, maxRate: 120, standard: '考核新客户开发数量完成情况', applicablePositions: ['P003', 'P004'] },
      { id: 'I005', name: '销售回款率', category: '业绩', cycle: '月', formula: '实际回款金额/应收金额×100%', minRate: 70, maxRate: 120, standard: '考核销售回款的及时性和完整性', applicablePositions: ['P003', 'P004', 'P005'] },
      { id: 'I006', name: '客户满意度', category: '服务', cycle: '季', formula: '客户满意度评分均值/100×100%', minRate: 70, maxRate: 120, standard: '通过客户调查问卷评估服务满意度', applicablePositions: ['P004', 'P005'] },
      { id: 'I007', name: '销售增长率', category: '业绩', cycle: '月', formula: '(本月销售额-上月销售额)/上月销售额×100%', minRate: 70, maxRate: 120, standard: '考核月度销售增长情况', applicablePositions: ['P005'] },
      { id: 'I008', name: '项目按时交付率', category: '效率', cycle: '月', formula: '按时交付项目数/总项目数×100%', minRate: 70, maxRate: 120, standard: '考核项目按计划时间节点交付的比例', applicablePositions: ['P007', 'P008'] },
      { id: 'I009', name: '代码质量合格率', category: '质量', cycle: '月', formula: '合格代码行数/总代码行数×100%', minRate: 70, maxRate: 120, standard: '通过代码审查和测试评估代码质量', applicablePositions: ['P007', 'P008', 'P009'] },
      { id: 'I010', name: 'Bug修复及时率', category: '效率', cycle: '月', formula: '按时修复Bug数/总Bug数×100%', minRate: 70, maxRate: 120, standard: '考核Bug在规定时间内修复的比例', applicablePositions: ['P008', 'P009'] },
      { id: 'I011', name: '系统可用性', category: '质量', cycle: '月', formula: '系统正常运行时间/总时间×100%', minRate: 70, maxRate: 120, standard: '考核系统稳定运行情况，目标99.5%以上', applicablePositions: ['P009'] },
      { id: 'I012', name: '招聘完成率', category: '业绩', cycle: '月', formula: '实际招聘到岗人数/计划招聘人数×100%', minRate: 70, maxRate: 120, standard: '考核招聘计划的完成情况', applicablePositions: ['P010', 'P011'] },
      { id: 'I013', name: '培训计划执行率', category: '效率', cycle: '季', formula: '实际执行培训场次/计划培训场次×100%', minRate: 70, maxRate: 120, standard: '考核培训计划的执行情况', applicablePositions: ['P010', 'P011'] },
      { id: 'I014', name: '员工满意度', category: '服务', cycle: '年', formula: '员工满意度评分均值/100×100%', minRate: 70, maxRate: 120, standard: '通过员工匿名调查评估HR服务质量', applicablePositions: ['P011'] },
      { id: 'I015', name: '预算执行率', category: '财务', cycle: '月', formula: '实际支出/预算支出×100%', minRate: 70, maxRate: 120, standard: '考核部门预算执行情况', applicablePositions: ['P012', 'P013'] },
      { id: 'I016', name: '财务报表准确率', category: '质量', cycle: '月', formula: '准确报表数/总报表数×100%', minRate: 70, maxRate: 120, standard: '考核财务报表编制的准确性', applicablePositions: ['P012', 'P013'] },
      { id: 'I017', name: '账务处理及时率', category: '效率', cycle: '月', formula: '及时处理账务数/总账务数×100%', minRate: 70, maxRate: 120, standard: '考核日常账务处理的及时性', applicablePositions: ['P013'] },
    ],

    assessmentPlans: [
      {
        id: 'AP001',
        name: '2026年第二季度绩效考核方案',
        cycle: '2026-Q2',
        scoreMode: 'percentage', // percentage | grade
        salaryMode: 'coefficient', // coefficient | grade
        targetScope: { depts: [], positions: [], employees: [] }, // empty = all
        flow: ['self_eval', 'hr_review', 'supervisor_eval', 'calibration', 'confirm'],
        gradeRules: [
          { grade: 'A', label: '卓越', minScore: 110, coefficient: 1.2 },
          { grade: 'B', label: '优秀', minScore: 100, coefficient: 1.1 },
          { grade: 'C', label: '合格', minScore: 90, coefficient: 1.0 },
          { grade: 'D', label: '待改进', minScore: 80, coefficient: 0.9 },
          { grade: 'E', label: '不合格', minScore: 0, coefficient: 0.8 },
        ],
        distributionLimit: { A: 20, B: 30, C: 40, D: 10, E: 5 },
        status: 'active',
        createdAt: '2026-04-01',
      },
      {
        id: 'AP002',
        name: '2026年第一季度绩效考核方案',
        cycle: '2026-Q1',
        scoreMode: 'grade',
        salaryMode: 'grade',
        targetScope: { depts: ['D001', 'D004'], positions: [], employees: [] },
        flow: ['self_eval', 'hr_review', 'supervisor_eval', 'calibration', 'confirm'],
        gradeRules: [
          { grade: 'A', label: '卓越', minScore: 110, coefficient: 1.2 },
          { grade: 'B', label: '优秀', minScore: 100, coefficient: 1.1 },
          { grade: 'C', label: '合格', minScore: 90, coefficient: 1.0 },
          { grade: 'D', label: '待改进', minScore: 80, coefficient: 0.9 },
          { grade: 'E', label: '不合格', minScore: 0, coefficient: 0.8 },
        ],
        distributionLimit: { A: 20, B: 30, C: 40, D: 10, E: 5 },
        status: 'completed',
        createdAt: '2026-01-01',
      },
    ],

    // 考核计划（为每位员工生成的具体考核任务）
    assessmentTasks: [],

    // 校准记录
    calibrationRecords: [],

    announcements: [],

    operationLogs: [],
  };

  let cache = null;

  function load() {
    if (cache) return cache;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        cache = JSON.parse(raw);
        return cache;
      } catch (e) {
        console.error('数据解析失败，重置为种子数据', e);
      }
    }
    cache = JSON.parse(JSON.stringify(seedData));
    save();
    return cache;
  }

  function save() {
    if (cache) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
    }
  }

  function reset() {
    cache = JSON.parse(JSON.stringify(seedData));
    save();
    return cache;
  }

  function genId(prefix) {
    return prefix + Date.now().toString(36) + Math.random().toString(36).substr(2, 4).toUpperCase();
  }

  // 通用CRUD
  function getAll(table) {
    const data = load();
    return data[table] || [];
  }

  function getById(table, id) {
    const data = load();
    return (data[table] || []).find(item => item.id === id);
  }

  function insert(table, item) {
    const data = load();
    if (!data[table]) data[table] = [];
    if (!item.id) item.id = genId(table.charAt(0).toUpperCase());
    data[table].push(item);
    save();
    return item;
  }

  function update(table, id, updates) {
    const data = load();
    const arr = data[table] || [];
    const idx = arr.findIndex(item => item.id === id);
    if (idx >= 0) {
      arr[idx] = { ...arr[idx], ...updates };
      save();
      return arr[idx];
    }
    return null;
  }

  function remove(table, id) {
    const data = load();
    const arr = data[table] || [];
    const idx = arr.findIndex(item => item.id === id);
    if (idx >= 0) {
      const removed = arr.splice(idx, 1)[0];
      save();
      return removed;
    }
    return null;
  }

  function log(operator, type, detail, ip) {
    const entry = {
      id: genId('L'),
      operator,
      operateTime: new Date().toLocaleString('zh-CN', { hour12: false }),
      type,
      detail,
      ip: ip || '127.0.0.1',
    };
    insert('operationLogs', entry);
    return entry;
  }

  return {
    load, save, reset, genId,
    getAll, getById, insert, update, remove, log,
    get data() { return load(); }
  };
})();
