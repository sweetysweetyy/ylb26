import { useEffect, useState } from "react";

import { spClient as supabase } from "@/studioproduit/lib/db";

const cache = new Map<string, string>();

export function useSignedUrl(path?: string | null) {
  const [url, setUrl] = useState<string | null>(path ? (cache.get(path) ?? null) : null);

  useEffect(() => {
    let active = true;
    if (!path) {
      setUrl(null);
      return;
    }
    const cached = cache.get(path);
    if (cached) {
      setUrl(cached);
      return;
    }
    supabase.storage
      .from("studioproduit-photos")
      .createSignedUrl(path, 60 * 60)
      .then(({ data }: { data: any }) => {
        if (!active || !data?.signedUrl) return;
        cache.set(path, data.signedUrl);
        setUrl(data.signedUrl);
      });
    return () => {
      active = false;
    };
  }, [path]);

  return url;
}

export function SignedImage({
  path,
  alt,
  className,
}: {
  path?: string | null;
  alt: string;
  className?: string;
}) {
  const url = useSignedUrl(path);
  if (!url) return <div className={`animate-pulse bg-secondary ${className ?? ""}`} />;
  return <img src={url} alt={alt} className={className} loading="lazy" />;
}
