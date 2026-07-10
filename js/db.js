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
      { id: 'E017', empNo: 'admin', name: '系统管理员', password: 'admin123', deptId: 'D004', positionId: 'P011', superiorId: null, role: 'sysadmin', hireDate: '2018-01-01', status: 'active', phone: '', email: 'admin@company.com' },
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
          cache = mergeData(cloudData, cache);
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

  // 合并云端和本地数据：按记录ID逐条比较，取 _updatedAt 更新的版本
  // 没有 _updatedAt 的记录（旧数据）：保留本地，避免云端脏数据覆盖
  // cloudEpoch > localEpoch 时：本地记录若不存在于云端且无 _updatedAt，视为已清理的种子数据，予以删除
  function mergeData(cloud, local, cloudEpoch) {
    var localEpoch = (local && local.settings && local.settings._cleanEpoch) || 0;
    var shouldClean = cloudEpoch && cloudEpoch > localEpoch;
    var result = JSON.parse(JSON.stringify(local));
    // 同步清理版本号
    if (shouldClean && result.settings) {
      result.settings._cleanEpoch = cloudEpoch;
    }
    for (var table in cloud) {
      if (!Array.isArray(cloud[table])) {
        // 非数组（如 settings）：合并 key，cloud 优先
        if (table === 'settings') {
          if (!result.settings) result.settings = {};
          for (var k in cloud.settings) {
            result.settings[k] = cloud.settings[k]; // cloud 优先（含 _cleanEpoch）
          }
        }
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
        // 云端清理后，本地记录不存在于云端且无 _updatedAt → 已删除的种子数据，清除
        if (shouldClean && !cloudMap[localItem.id] && !localItem._updatedAt) {
          return false; // 删除此条
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
      // 添加仅在云端存在的记录
      cloud[table].forEach(function(cloudItem) {
        if (cloudItem && cloudItem.id && !seenIds[cloudItem.id]) {
          result[table].push(JSON.parse(JSON.stringify(cloudItem)));
        }
      });
    }
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
