/**
 * 数据层 - 基于Supabase云端数据库 + localStorage备份
 * 包含种子数据和CRUD操作
 */
const DB = (function () {
  const STORAGE_KEY = 'pms_data_v11';
  const SUPABASE_URL = 'https://teaprkizzoxvsdytayhf.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlYXBya2l6em94dnNkeXRheWhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwMzYzODYsImV4cCI6MjA5ODYxMjM4Nn0.nR9OJRPuA40w_wESKC9CJruWu4JO6vcIVfmA0GL9Stc';
  let supabaseClient = null;

  function getSupabase() {
    if (!supabaseClient && typeof supabase !== 'undefined') {
      supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return supabaseClient;
  }

  // 种子数据 - 仅保留系统必需的最小初始化数据
  // 真实业务数据由Supabase云端数据库提供，合并后自动加载
  const seedData = {
    departments: [
      { id: 'D004', name: '人事部', parentId: null, managerId: null, sort: 4, desc: '负责人力资源管理与行政事务' },
    ],

    positions: [
      { id: 'P011', name: 'HR专员', deptId: 'D004', desc: '负责招聘培训等事务', indicatorIds: [] },
    ],

    employees: [
      { id: 'E017', empNo: 'admin', name: '系统管理员', password: 'admin123', deptId: 'D004', positionId: 'P011', superiorId: 'E012', role: 'sysadmin', hireDate: '2018-01-01', status: 'active', phone: '13800000017', email: 'admin@company.com' },
      { id: 'Emr4dyryiT7XB', empNo: '213949', name: '杨敬一', password: '123456', deptId: 'D001', positionId: 'P001', superiorId: null, role: 'admin', hireDate: '', status: 'active', phone: '', email: '' },
      { id: 'Emr4e0hmo0UTH', empNo: '213705', name: '葛宇', password: 'Lpj86337092', deptId: 'D001', positionId: 'Pmr4e2k2e53CW', superiorId: 'Emr4dyryiT7XB', role: 'supervisor', hireDate: '', status: 'active', phone: '', email: '' },
      { id: 'Emr4e3ijmGDDK', empNo: '213448', name: '陈俊', password: '123456', deptId: 'D001', positionId: 'Pmr4e2k2e53CW', superiorId: 'Emr4dyryiT7XB', role: 'supervisor', hireDate: '', status: 'active', phone: '', email: '' },
      { id: 'Emr4e4w6783MF', empNo: '213388', name: '李爽', password: '123456', deptId: 'D001', positionId: 'Pmr4e2k2e53CW', superiorId: 'Emr4dyryiT7XB', role: 'supervisor', hireDate: '', status: 'active', phone: '', email: '' },
      { id: 'Emr4eavtySNUI', empNo: '213591', name: '方桂笋', password: '5515138', deptId: 'D003', positionId: 'Pmr4eaa71CCZJ', superiorId: 'Emr4dyryiT7XB', role: 'supervisor', hireDate: '', status: 'active', phone: '', email: '' },
      { id: 'Emr4ec9oiXBDI', empNo: '213703', name: '鲁青春', password: '123456', deptId: 'Dmr4dn6xeASRR', positionId: 'Pmr4eb8n7GU8M', superiorId: 'Emr4dyryiT7XB', role: 'employee', hireDate: '', status: 'active', phone: '', email: '' },
      { id: 'Emr4eerelI0EH', empNo: '211237', name: '刘伟', password: '123456', deptId: 'Dmr4docfxDA5K', positionId: 'Pmr4ee83vMIPK', superiorId: 'Emr4dyryiT7XB', role: 'employee', hireDate: '', status: 'active', phone: '', email: '' },
      { id: 'Emr4eg4b6F2CH', empNo: '170848', name: '杨洪彪', password: 'Yhb000123', deptId: 'Dmr4doknz2A80', positionId: 'Pmr4efkg0EG7D', superiorId: 'Emr4dyryiT7XB', role: 'employee', hireDate: '', status: 'active', phone: '', email: '' },
      { id: 'Emr4ei96oO9UX', empNo: '211068', name: '张晓明', password: 'zff80523', deptId: 'Dmr4doy4y0ZF4', positionId: 'Pmr4ehnygJ4H9', superiorId: 'Emr4dyryiT7XB', role: 'employee', hireDate: '', status: 'active', phone: '', email: '' },
      { id: 'Emr4eliqdHEG6', empNo: '210013', name: '陈雷', password: '123456', deptId: 'Dmr4dpjibVCA7', positionId: 'Pmr4e7dh5P0XL', superiorId: 'Emr4e3ijmGDDK', role: 'employee', hireDate: '', status: 'active', phone: '', email: '' },
      { id: 'Emr4eme2oY9NP', empNo: '160083', name: '梁承志', password: '123456', deptId: 'Dmr4dpjibVCA7', positionId: 'Pmr4e7dh5P0XL', superiorId: 'Emr4e3ijmGDDK', role: 'employee', hireDate: '', status: 'active', phone: '', email: '' },
      { id: 'Emr4emytcLVZH', empNo: '213502', name: '刘学成', password: '123456', deptId: 'Dmr4dpjibVCA7', positionId: 'Pmr4ekqqaCB86', superiorId: 'Emr4e3ijmGDDK', role: 'employee', hireDate: '', status: 'active', phone: '', email: '' },
      { id: 'Emr4epqomGQ6P', empNo: '213765', name: '阚士辉', password: '123456', deptId: 'Dmr4dpyam4DCV', positionId: 'Pmr4ent332BW6', superiorId: 'Emr4dyryiT7XB', role: 'supervisor', hireDate: '', status: 'active', phone: '', email: '' },
      { id: 'Emr4eqru4D5C3', empNo: '210267', name: '曹健', password: '123456', deptId: 'Dmr4dqlm5SIXU', positionId: 'Pmr4eo9184XLI', superiorId: 'Emr4epqomGQ6P', role: 'employee', hireDate: '', status: 'active', phone: '', email: '' },
      { id: 'Emr4foaveTXGN', empNo: '213778', name: '孙彪', password: '123456', deptId: 'Dmr4dsrepC5W5', positionId: 'Pmr4flul5PSWM', superiorId: 'Emr4dyryiT7XB', role: 'supervisor', hireDate: '', status: 'active', phone: '', email: '' },
      { id: 'Emr4fotapEI14', empNo: '213884', name: '张江波', password: '123456', deptId: 'Dmr4dsrepC5W5', positionId: 'Pmr4fm00c9VUL', superiorId: 'Emr4foaveTXGN', role: 'employee', hireDate: '', status: 'active', phone: '', email: '' },
      { id: 'Emr4fpeywWR0L', empNo: '211027', name: '尤磊', password: '123456', deptId: 'Dmr4dqzc3L8X4', positionId: 'Pmr4eopyeXYUL', superiorId: 'Emr4foaveTXGN', role: 'employee', hireDate: '', status: 'active', phone: '', email: '' },
      { id: 'Emr4frrkv7NNH', empNo: '212917', name: '刘江超', password: '123456', deptId: 'Dmr4dsi179G6J', positionId: 'Pmr4e82mxM97V', superiorId: 'Emr4e0hmo0UTH', role: 'employee', hireDate: '', status: 'active', phone: '', email: '' },
      { id: 'Emr4fsa0eK26T', empNo: '213905', name: '孙中辉', password: '123456', deptId: 'Dmr4dszwyF7NQ', positionId: 'Pmr4fmdm4CTE1', superiorId: 'Emr4dyryiT7XB', role: 'employee', hireDate: '', status: 'active', phone: '', email: '' },
      { id: 'Emr4ft2nm5JKR', empNo: '160305', name: '董奔', password: '123456', deptId: 'Dmr4dtbes5M9M', positionId: 'Pmr4fmomdPRL5', superiorId: 'Emr4dyryiT7XB', role: 'supervisor', hireDate: '', status: 'active', phone: '', email: '' },
      { id: 'Emr4ftqec0DL1', empNo: '00643', name: '鹿守闯', password: '123456', deptId: 'Dmr4duxjyO1M7', positionId: 'Pmr4fn4mfM23Y', superiorId: 'Emr4ft2nm5JKR', role: 'employee', hireDate: '', status: 'active', phone: '', email: '' },
      { id: 'Emr4fu4guXKJS', empNo: '213486', name: '石同友', password: '123456', deptId: 'Dmr4dvbt9E1NR', positionId: 'Pmr4fn9ywD0CQ', superiorId: 'Emr4ft2nm5JKR', role: 'employee', hireDate: '', status: 'active', phone: '', email: '' },
      { id: 'Emr4fv4vnRQS8', empNo: '213986', name: '郑可', password: '123456', deptId: 'Dmr4dupj8L9Q6', positionId: 'Pmr4fmybyXK4L', superiorId: 'Emr4ft2nm5JKR', role: 'employee', hireDate: '', status: 'active', phone: '', email: '' },
      { id: 'Emr4fxk3q9HJO', empNo: '170670', name: '李光', password: '123456', deptId: 'Dmr4du513YK2K', positionId: 'Pmr4fx0ol7IOR', superiorId: 'Emr4dyryiT7XB', role: 'supervisor', hireDate: '', status: 'active', phone: '', email: '' },
      { id: 'Emr4fy5xjRDXL', empNo: '212804', name: '范海川', password: 'fan@123', deptId: 'Dmr4dtwgl391U', positionId: 'Pmr4fx68dJUAX', superiorId: 'Emr4dyryiT7XB', role: 'hr', hireDate: '', status: 'active', phone: '', email: '' },
      { id: 'Emr4fzdz451OC', empNo: '210150', name: '韩颖', password: '123456', deptId: 'Dmr4dtwgl391U', positionId: 'Pmr4fzq4eE0MO', superiorId: 'Emr4fy5xjRDXL', role: 'hr', hireDate: '', status: 'active', phone: '', email: '' },
    ],

    indicators: [],

    assessmentPlans: [],

    assessmentTasks: [],

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
    if (!cache) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
    var sb = getSupabase();
    if (sb) {
      // 先拉取云端最新数据，合并后再推送，避免覆盖其他人的修改
      sb.from("pms_data").select("data").eq("id", 1).single().then(function(r) {
        var cloudData = (r.data && r.data.data) ? r.data.data : null;
        if (cloudData) {
          var cloudEpoch = (cloudData.settings && cloudData.settings._cleanEpoch) || 0;
          cache = mergeData(cloudData, cache, cloudEpoch); // 传递 cloudEpoch 防止种子数据推回云端
          localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
        }
        sb.from("pms_data").upsert({ id: 1, data: cache, updated_at: new Date().toISOString() }).then(function(r2) {
          if (r2.error) console.warn("Supabase save error:", r2.error.message);
        });
      }).catch(function(e) {
        console.warn("Cloud merge-save failed, push directly:", e.message);
        sb.from("pms_data").upsert({ id: 1, data: cache, updated_at: new Date().toISOString() }).then(function(r2) {
          if (r2.error) console.warn("Supabase save error:", r2.error.message);
        });
      });
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
    item._updatedAt = Date.now();
    data[table].push(item);
    save();
    return item;
  }

  function update(table, id, updates) {
    const data = load();
    const arr = data[table] || [];
    const idx = arr.findIndex(item => item.id === id);
    if (idx >= 0) {
      arr[idx] = { ...arr[idx], ...updates, _updatedAt: Date.now() };
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
      // 记录删除标记，确保云端同步（mergeData）时不会把已删除的记录重新合并回来
      if (!data.settings) data.settings = {};
      if (!data.settings._deleted) data.settings._deleted = {};
      if (!data.settings._deleted[table]) data.settings._deleted[table] = {};
      data.settings._deleted[table][id] = Date.now();
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

  // 合并删除标记：云端与本地取并集（按各 id 的最新删除时间戳，任一端删除即生效）
  function mergeDeleted(cloudDeleted, localDeleted) {
    var merged = {};
    function gather(src) {
      if (!src) return;
      for (var t in src) {
        if (!merged[t]) merged[t] = {};
        for (var id in src[t]) {
          if (!merged[t][id] || src[t][id] > merged[t][id]) merged[t][id] = src[t][id];
        }
      }
    }
    gather(localDeleted);
    gather(cloudDeleted);
    return merged;
  }

  // 合并云端和本地数据：按记录ID逐条比较，取 _updatedAt 更新的版本
  // 没有 _updatedAt 的记录（旧数据）：保留本地，避免云端脏数据覆盖
  // cloudEpoch > localEpoch 时：本地记录若不存在于云端且无 _updatedAt，视为已清理的种子数据，予以删除
  // settings._deleted 中的 id：两端删除标记取并集，被标记的记录一律剔除（确保删除能跨云端同步）
  function mergeData(cloud, local, cloudEpoch) {
    var localEpoch = (local && local.settings && local.settings._cleanEpoch) || 0;
    var shouldClean = cloudEpoch && cloudEpoch > localEpoch;
    var result = JSON.parse(JSON.stringify(local));
    // 同步清理版本号
    if (shouldClean && result.settings) {
      result.settings._cleanEpoch = cloudEpoch;
    }
    // 合并删除标记（并集）
    var mergedDeleted = mergeDeleted(cloud.settings && cloud.settings._deleted, local.settings && local.settings._deleted);
    for (var table in cloud) {
      if (!Array.isArray(cloud[table])) {
        // 非数组（如 settings）：合并 key，cloud 优先（_deleted 单独合并，不走此分支）
        if (table === 'settings') {
          if (!result.settings) result.settings = {};
          for (var k in cloud.settings) {
            if (k === '_deleted') continue; // _deleted 由 mergeDeleted 处理
            // rolePermissions / wecomWebhook 等用户配置项：按 _updatedAt 时间戳合并，新的胜出；无时间戳则本地优先
            if (k === 'rolePermissions' || k === 'wecomWebhook') {
              var localRP = local && local.settings && local.settings[k];
              var cloudRP = cloud.settings[k];
              var localTime = localRP && localRP._updatedAt ? localRP._updatedAt : 0;
              var cloudTime = cloudRP && cloudRP._updatedAt ? cloudRP._updatedAt : 0;
              if (cloudTime > localTime) {
                result.settings[k] = JSON.parse(JSON.stringify(cloudRP));
              } else {
                result.settings[k] = JSON.parse(JSON.stringify(localRP || cloudRP));
              }
            } else {
              result.settings[k] = cloud.settings[k]; // cloud 优先（含 _cleanEpoch）
            }
          }
        }
        continue;
      }
      // 员工表以云端为权威：登录依赖账号密码，必须保证云端正确密码能纠正本地脏数据
      // （例如本地曾改过密码导致 _updatedAt 较新而永久优先云端）。云端有则用云端，
      // 仅把本地存在而云端未同步的记录作为补充保留，避免丢失本地新增员工。
      if (table === 'employees') {
        var empResult = (cloud[table] || []).filter(function(it) {
          return !(it && it.id && mergedDeleted[table] && mergedDeleted[table][it.id]);
        });
        var empCloudIds = {};
        empResult.forEach(function(it) { if (it && it.id) empCloudIds[it.id] = true; });
        (result[table] || []).forEach(function(localItem) {
          if (localItem && localItem.id && !empCloudIds[localItem.id] && !(mergedDeleted[table] && mergedDeleted[table][localItem.id])) {
            empResult.push(localItem);
          }
        });
        result[table] = empResult;
        continue;
      }
      if (!result[table]) {
        result[table] = JSON.parse(JSON.stringify(cloud[table]));
        continue;
      }
      var cloudMap = {};
      cloud[table].forEach(function(item) {
        if (item && item.id) cloudMap[item.id] = item;
      });
      var seenIds = {};
      result[table] = result[table].filter(function(localItem) {
        if (!localItem || !localItem.id) return true;
        seenIds[localItem.id] = true;
        // 云端清理后，本地记录不存在于云端 → 已删除的种子/废弃数据，清除
        if (shouldClean && !cloudMap[localItem.id]) {
          return false; // 删除此条（云端已无此记录，说明已被清理）
        }
        return true; // 保留，后续替换为更新版本
      }).map(function(localItem) {
        if (!localItem || !localItem.id) return localItem;
        var cloudItem = cloudMap[localItem.id];
        if (!cloudItem) return localItem; // 仅本地有，保留
        var localTime = localItem._updatedAt || 0;
        var cloudTime = cloudItem._updatedAt || 0;
        // 都有 _updatedAt：取更新的
        // 只有一方有 _updatedAt：取有 _updatedAt 的（说明刚被修改过）
        // 都没有 _updatedAt：保留本地（避免云端脏数据覆盖本地进度）
        if (localTime > 0 && cloudTime > 0) {
          return localTime >= cloudTime ? localItem : cloudItem;
        }
        if (localTime > 0 && cloudTime === 0) return localItem;
        if (cloudTime > 0 && localTime === 0) return cloudItem;
        return localItem; // 都没有，保留本地
      });
      // 添加仅在云端存在的记录（跳过已删除的）
      cloud[table].forEach(function(cloudItem) {
        if (cloudItem && cloudItem.id && !seenIds[cloudItem.id]) {
          if (mergedDeleted[table] && mergedDeleted[table][cloudItem.id]) return; // 已删除，不合并回来
          result[table].push(JSON.parse(JSON.stringify(cloudItem)));
        }
      });
      // 剔除被标记删除的记录（本端/他端删除后，云端仍推送回来的情况）
      if (mergedDeleted[table]) {
        result[table] = result[table].filter(function(item) {
          return !(item && item.id && mergedDeleted[table][item.id]);
        });
      }
    }
    // 写回合并后的删除标记
    if (result.settings) result.settings._deleted = mergedDeleted;
    return result;
  }

  async function refreshFromCloud() {
    var sb = getSupabase();
    if (!sb) return null;
    try {
      var r = await sb.from("pms_data").select("data").eq("id", 1).single();
      if (r.data && r.data.data) {
        var cloudData = r.data.data;
        var cloudEpoch = (cloudData.settings && cloudData.settings._cleanEpoch) || 0;
        load(); // 确保本地 cache 已加载
        cache = mergeData(cloudData, cache, cloudEpoch); // 传递 cloudEpoch 以支持数据清理同步
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
        return cache;
      }
    } catch(e) { console.warn("Cloud refresh failed:", e.message); }
    return null;
  }

  async function init() {
    var cloud = await refreshFromCloud();
    if (cloud) return cloud;
    load();
    if (cache) save();
    return cache;
  }

  // Settings: key-value store for system configuration
  function getSetting(key) {
    const data = load();
    if (!data.settings) return null;
    return data.settings[key] !== undefined ? data.settings[key] : null;
  }

  function setSetting(key, value) {
    const data = load();
    if (!data.settings) data.settings = {};
    data.settings[key] = value;
    save();
    return value;
  }

  return {
    load, save, reset, genId, init, refreshFromCloud,
    getAll, getById, insert, update, remove, log,
    getSetting, setSetting,
    get data() { return load(); }
  };
})();
