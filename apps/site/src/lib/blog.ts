// blog.ts — 博客已迁移至独立 blog app (apps/blog)
// 此文件保留为空桩，避免 site 中旧博客引用报错
// 所有博客内容相关函数均返回空数组，site 不再生成博客页面

export interface BlogReference {
  title: string;
  url: string;
}

export interface BlogPostMeta {
  slug: string;
  title: string;
  date: string;
  category: string;
  excerpt: string;
  coverImage: string;
  locale: string;
}

export interface BlogPost extends BlogPostMeta {
  contentHtml: string;
  readTime: number;
  references: BlogReference[];
}

export function getPosts(locale: string): BlogPost[] {
  return [];
}

export function getAllPostSlugs(locale: string): string[] {
  return [];
}

export function getAllPostsMeta(locale: string): BlogPostMeta[] {
  return [];
}

export function getPostBySlug(locale: string, slug: string): BlogPost | null {
  return null;
}

export function getPostsByCategory(locale: string, category: string): BlogPost[] {
  return [];
}
