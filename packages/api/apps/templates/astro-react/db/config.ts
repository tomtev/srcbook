import { defineDb, defineTable, column } from 'astro:db';

const Post = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    title: column.text(),
    slug: column.text({ unique: true }),
    content: column.text(),
    excerpt: column.text(),
    publishedAt: column.text(),
    author: column.text(),
    isPublished: column.boolean({ default: false })
  }
});

export default defineDb({
  tables: { Post }
});
