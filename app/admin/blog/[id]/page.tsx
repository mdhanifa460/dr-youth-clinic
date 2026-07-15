'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import BlogForm from '@/app/admin/components/BlogForm';
import { Loader } from 'lucide-react';

export default function EditBlogPostPage({
  params,
}: {
  params: { id: string };
}) {
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPost();
  }, []);

  const fetchPost = async () => {
    try {
      const res = await fetch(`/api/admin/blog/${params.id}`);
      const data = await res.json();
      if (data.success) {
        setPost(data.data);
      }
    } catch (error) {
      console.error('Error fetching post:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-4">
      <Link href="/admin/blog" className="text-blue-600 hover:underline text-sm">
        ← Back to Blog Posts
      </Link>
      <h1 className="text-3xl font-bold text-gray-800">Edit Post</h1>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : post ? (
        <BlogForm initialData={post} />
      ) : (
        <div className="text-center py-12 bg-white rounded-lg">
          <p className="text-red-600">Post not found</p>
        </div>
      )}
    </div>
  );
}
