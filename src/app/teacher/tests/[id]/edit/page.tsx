'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { TestEditor } from '@/components/TestEditor';
import { Test } from '@/types';

export default function EditTestPage() {
  const params = useParams();
  const router = useRouter();
  const [test, setTest] = useState<Test | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params?.id) return;
    const fetchTest = async () => {
      try {
        const res = await fetch(`/api/teacher/tests/${params.id}`);
        if (!res.ok) {
          router.push('/teacher');
          return;
        }
        const data = await res.json();
        if (data.test) {
          setTest(data.test);
        }
      } catch (err) {
        console.error(err);
        router.push('/teacher');
      } finally {
        setLoading(false);
      }
    };
    fetchTest();
  }, [params?.id, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!test) {
    return null;
  }

  return <TestEditor initialData={test} isEdit={true} />;
}
