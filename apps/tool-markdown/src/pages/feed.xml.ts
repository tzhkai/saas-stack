import rss from '@astrojs/rss';

const posts = [
  {
    slug: 'markdown-cheat-sheet-complete-guide',
    title: 'Markdown Cheat Sheet: The Complete Guide for Beginners (Free Online Editor)',
    description: 'Learn Markdown syntax from scratch with our complete cheat sheet. Covers headings, bold, italic, lists, code blocks, tables, and more. Try it live in our free editor.',
    date: '2026-04-28',
    category: 'Markdown Tutorial',
    readTime: '10 min',
  },
  {
    slug: 'how-to-write-markdown-step-by-step',
    title: 'How to Write Markdown: A Step-by-Step Guide for Beginners',
    description: 'New to Markdown? Follow this step-by-step guide to learn how to write Markdown from scratch. Covers headings, bold, italic, lists, links, images, and code blocks.',
    date: '2026-04-28',
    category: 'Markdown Tutorial',
    readTime: '8 min',
  },
  {
    slug: 'best-markdown-editors-tools-2026',
    title: '10 Best Markdown Editors & Tools in 2026 (Free & Paid)',
    description: 'We compare 10 best Markdown editors in 2026 — free, paid, online, and desktop. Find the right tool for writing, coding, and note-taking.',
    date: '2026-04-28',
    category: 'Tool Reviews',
    readTime: '7 min',
  },
  {
    slug: 'how-to-convert-markdown-to-html',
    title: 'How to Convert Markdown to HTML: Free Online Converter & Complete Guide',
    description: 'Learn how to convert Markdown to HTML using free online tools, desktop editors, and command-line libraries. Step-by-step guide with examples and a free converter.',
    date: '2026-04-28',
    category: 'Markdown Tutorial',
    readTime: '6 min',
  },
  {
    slug: 'what-is-markdown-complete-beginners-guide',
    title: 'What Is Markdown? A Complete Beginner\'s Guide to the Lightweight Markup Language',
    description: 'What is Markdown? Learn everything you need to know about the lightweight markup language - what it is, why it has become so popular, how to use it, and the best free tools.',
    date: '2026-04-28',
    category: 'Markdown Basics',
    readTime: '10 min',
  },
  {
    slug: 'markdown-for-developers-readme-docs-wikis',
    title: 'Markdown for Developers: How to Use Markdown in README, Docs, Wikis & More',
    description: 'A practical guide to using Markdown as a developer. Learn how to write great README files, API documentation, project wikis, GitHub issues, and technical guides.',
    date: '2026-04-28',
    category: 'Markdown Tutorial',
    readTime: '10 min',
  },
  {
    slug: 'markdown-vs-rich-text-editors-compared',
    title: 'Markdown vs Rich Text Editors: Which One Should You Use? [2026 Comparison]',
    description: 'Markdown or WYSIWYG? We compare both formats across 8 key criteria: learning curve, portability, version control, collaboration, and more. Plus a practical decision guide.',
    date: '2026-04-28',
    category: 'Markdown Comparison',
    readTime: '9 min',
  },
  {
    slug: 'markdown-syntax-complete-guide',
    title: 'The Complete Markdown Syntax Guide: Every Rule, Extension, and Feature Explained with Examples',
    description: 'The most comprehensive Markdown syntax reference on the web. Covers headings, bold, italic, lists, tables, code blocks, links, images, footnotes, task lists, emoji, math, Mermaid diagrams, and all GFM extensions.',
    date: '2026-04-28',
    category: 'Markdown Tutorial',
    readTime: '12 min',
  },
  {
    slug: 'markdown-tables-how-to-create-format-align',
    title: 'Markdown Tables: How to Create, Format & Align Tables in Markdown',
    description: 'Learn how to create, format, and align tables in Markdown. This complete guide covers basic syntax, column alignment, advanced tips, and common pitfalls with examples.',
    date: '2026-04-29',
    category: 'Markdown Tutorial',
    readTime: '8 min',
  },
  {
    slug: 'markdown-links-images-complete-guide',
    title: 'Markdown Links & Images: The Complete Guide to Adding Links, Images, and References',
    description: 'Master Markdown links and images with this complete guide. Learn inline links, reference-style links, auto-links, image syntax, image sizing, clickable images, and footnotes.',
    date: '2026-04-29',
    category: 'Markdown Tutorial',
    readTime: '7 min',
  },
];

export async function GET(context: any) {
  return rss({
    title: 'MarkdownMaster Blog',
    description: 'Tutorials, tips, and guides to help you master Markdown.',
    site: context.site,
    items: posts.map(post => ({
      title: post.title,
      pubDate: new Date(post.date),
      description: post.description,
      link: `/blog/${post.slug}/`,
      categories: [post.category],
    })),
    customData: '<language>en-us</language>',
  });
}
