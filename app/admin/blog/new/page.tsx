'use client';

import Link from 'next/link';
import BlogForm from '@/app/admin/components/BlogForm';

export default function NewBlogPostPage() {
  return (
    <div className="p-8 space-y-4">
      <Link href="/admin/blog" className="text-blue-600 hover:underline text-sm">
        ← Back to Blog Posts
      </Link>
      <h1 className="text-3xl font-bold text-gray-800">New Post</h1>

      <BlogForm />
    </div>
  );
}
