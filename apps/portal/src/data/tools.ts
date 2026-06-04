/**
 * Portal 工具注册表 — 单一真相源
 * 增删工具只需改这个文件 + 创建对应 page.tsx
 */

export interface ToolEntry {
  /** 工具 ID */
  id: string;
  /** Emoji 图标 */
  icon: string;
  /** 翻译 key（Check namespace） */
  titleKey: string;
  descKey: string;
  /** 路由路径（相对于 /c/） */
  path: string;
  /** 角标 */
  badge?: 'free' | 'new' | 'popular';
}

export interface ToolCategory {
  id: string;
  titleKey: string;
  descKey: string;
  icon: string;
  tools: ToolEntry[];
}

export const toolCategories: ToolCategory[] = [
  {
    id: 'check',
    titleKey: 'categoryCheckTitle',
    descKey: 'categoryCheckDesc',
    icon: '📋',
    tools: [
      { id: 'gacc', icon: '🍷', titleKey: 'reportModuleGacc', descKey: 'gaccDesc', path: '/check/gacc/', badge: 'free' },
      { id: 'label', icon: '🏷️', titleKey: 'reportModuleLabel', descKey: 'labelDesc', path: '/check/label/', badge: 'free' },
      { id: 'ccc', icon: '🔒', titleKey: 'reportModuleCcc', descKey: 'cccDesc', path: '/check/ccc/', badge: 'free' },
      { id: 'nmpa', icon: '💄', titleKey: 'reportModuleNmpa', descKey: 'nmpaDesc', path: '/check/nmpa/', badge: 'free' },
      { id: 'crossborder', icon: '🛒', titleKey: 'reportModuleCrossborder', descKey: 'crossborderDesc', path: '/check/crossborder/', badge: 'free' },
      { id: 'trademark', icon: '🛡️', titleKey: 'reportModuleTrademark', descKey: 'trademarkDesc', path: '/check/trademark/', badge: 'free' },
    ],
  },
];

export function allTools(): ToolEntry[] {
  return toolCategories.flatMap(c => c.tools);
}

export function findTool(id: string): ToolEntry | undefined {
  return allTools().find(t => t.id === id);
}
