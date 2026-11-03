/**
 * 免费合规评估表单的「来源标识」两张表。
 *
 * 起因：表单只提交 email + message，来源只靠邮件主题里的英文 slug
 * （`🔥 New Inquiry — Regulations: gacc-decree-280-...`），运营收到邮件看不出
 * 是哪个语言、哪个模块、什么页面。方案（2026-10-29 用户确认的路线 A）：
 * 加 5 个 web3forms 隐藏字段 —— 语言 / 页面模块 / 页面标题 / 页面地址 / 来源标识，
 * 字段名直接用中文，邮件里就是中文标签，不用改邮件模板。
 *
 * 本文件只放「中文名」，不放任何界面文案；服务页的中文名与
 * packages/ui/messages/zh.json 的 Navbar.servicesDropdown 保持一致
 * （站内服务名唯一来源，那里有 CI 保证不漏翻）。
 */

/** 来源 slug → 中文模块名 */
export const FORM_MODULES: Record<string, string> = {
  home: '首页',
  about: '关于我们',
  faq: '常见问题',
  industries: '行业方案 · 列表',
  'industries-detail': '行业方案 · 详情',
  packages: '服务套餐',
  services: '服务总览',
  'services-gacc': '服务 · 海关总署食品注册',
  'services-label': '服务 · 中国标签合规性',
  'services-ccc': '服务 · CCC认证',
  'services-cosmetics': '服务 · 化妆品备案',
  'services-ecommerce': '服务 · 跨境电商',
  'services-brand': '服务 · 品牌保护',
  testimonials: '客户评价',
  quote: '报价单 · 服务选择',
  'blog-list': '洞察 · 列表',
  'blog-post': '洞察 · 文章',
  'regulations-list': '法规库 · 列表',
  'regulations-list-page': '法规库 · 列表（分页）',
  'regulations-detail': '法规库 · 详情',
};

/** 来源 slug → 中文页面标题（固定页用；文章/法规详情由调用点传真实的 zh 标题） */
export const FORM_PAGE_TITLES: Record<string, string> = {
  home: '首页',
  about: '关于我们',
  faq: '常见问题',
  industries: '行业方案',
  'industries-detail': '行业方案详情',
  packages: '服务套餐',
  services: '服务总览',
  'services-gacc': '海关总署食品注册',
  'services-label': '中国标签合规性',
  'services-ccc': 'CCC认证',
  'services-cosmetics': '化妆品备案',
  'services-ecommerce': '跨境电商',
  'services-brand': '品牌保护',
  testimonials: '客户评价',
  quote: '报价单',
  'blog-list': '洞察列表',
  'blog-post': '洞察文章',
  'regulations-list': '法规库',
  'regulations-list-page': '法规库列表',
  'regulations-detail': '法规详情',
};

export const FORM_MODULE_FALLBACK = '站内页面';
export const FORM_PAGE_TITLE_FALLBACK = '未命名页面';
