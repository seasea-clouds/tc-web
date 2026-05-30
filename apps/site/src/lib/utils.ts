/**
 * 按逗号分割文本（英文/中文逗号、日文/阿拉伯语顿号），跳过括号内内容
 * 用于 JSON-LD 数据（机器读，非 UI 列表）
 */
export function splitByComma(text: string): string[] {
  return text
    .split(/[,，、،]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * 从 next-intl t 函数读取编号 key（如 coverItems1, coverItems2...）
 * 自动收集所有连续编号项，返回数组。用于 UI 列表渲染。
 * 先用 t.has() 检查 key 是否存在，避免触发 MISSING_MESSAGE 错误。
 * Fallback: 如果没有编号项，读取 prefix key 并用逗号分隔（非英语语言使用此方式）。
 */
export function getNumberedItems(
  t: { (key: string): string; has(key: string): boolean },
  prefix: string,
): string[] {
  const items: string[] = [];
  for (let i = 1; i <= 100; i++) {
    const key = `${prefix}${i}`;
    if (!t.has(key)) break;
    items.push(t(key));
  }
  // Fallback: 如果没有编号项，尝试读取 prefix key 并分割
  if (items.length === 0 && t.has(prefix)) {
    const raw = t(prefix);
    return raw
      .split(/[,，、،]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return items;
}
