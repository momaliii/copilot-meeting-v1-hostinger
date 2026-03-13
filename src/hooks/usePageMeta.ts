import { useEffect } from 'react';

export function usePageMeta(title: string, description?: string) {
  useEffect(() => {
    const prev = document.title;
    document.title = title;

    let metaDesc = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    const prevDesc = metaDesc?.content;
    if (description && metaDesc) {
      metaDesc.content = description;
    }

    return () => {
      document.title = prev;
      if (prevDesc && metaDesc) metaDesc.content = prevDesc;
    };
  }, [title, description]);
}
