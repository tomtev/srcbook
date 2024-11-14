import { db, Post } from 'astro:db';

export default async function() {
	await db.insert(Post).values(
		{
			title: 'Getting Started with TypeSite',
			slug: 'getting-started-with-typesite',
			content: 'Your content here...',
			excerpt: 'A brief introduction to typesite.com',
			publishedAt: new Date().toISOString(),
			author: 'John Doe',
			isPublished: true
		}
	);
}
