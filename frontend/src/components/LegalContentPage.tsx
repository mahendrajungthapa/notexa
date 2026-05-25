'use client';

import { useEffect, useMemo, useState } from 'react';
import AuthHeader from '@/components/AuthHeader';
import SiteFooter from '@/components/SiteFooter';
import { publicApi } from '@/services/api';

type LegalSettingKey = 'privacy_policy' | 'terms_conditions';

interface LegalContentPageProps {
  settingKey: LegalSettingKey;
  title: string;
}

const allowedTags = new Set([
  'a', 'b', 'blockquote', 'br', 'em', 'h2', 'h3', 'h4', 'li', 'ol', 'p', 'strong', 'u', 'ul',
]);

const hasHtml = (content: string) => /<\/?[a-z][\s\S]*>/i.test(content);

function sanitizeAdminHtml(html: string) {
  if (typeof window === 'undefined') return '';

  const template = window.document.createElement('template');
  template.innerHTML = html;

  const clean = (node: Node) => {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === window.Node.TEXT_NODE) return;
      if (child.nodeType !== window.Node.ELEMENT_NODE) {
        child.parentNode?.removeChild(child);
        return;
      }

      const element = child as HTMLElement;
      const tag = element.tagName.toLowerCase();

      if (!allowedTags.has(tag)) {
        const parent = element.parentNode;
        if (!parent) return;
        while (element.firstChild) parent.insertBefore(element.firstChild, element);
        parent.removeChild(element);
        clean(parent as Node);
        return;
      }

      const href = tag === 'a' ? element.getAttribute('href') || '' : '';
      Array.from(element.attributes).forEach((attr) => element.removeAttribute(attr.name));

      if (tag === 'a') {
        const safeHref = /^(https?:|mailto:|#|\/)/i.test(href);
        if (safeHref) {
          element.setAttribute('href', href);
          element.setAttribute('rel', 'noopener noreferrer');
        }
      }

      clean(child);
    });
  };

  clean(template.content);
  return template.innerHTML;
}

export default function LegalContentPage({ settingKey, title }: LegalContentPageProps) {
  const [siteName, setSiteName] = useState('NotExA');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let ignore = false;

    publicApi.settings()
      .then((res) => {
        if (ignore) return;
        const payload = res.data?.data || {};
        setSiteName(payload.site_name || 'NotExA');
        setContent(String(payload[settingKey] || '').trim());
      })
      .catch(() => {
        if (!ignore) setFailed(true);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => { ignore = true; };
  }, [settingKey]);

  const containsHtml = hasHtml(content);
  const safeHtml = useMemo(() => sanitizeAdminHtml(content), [content]);

  return (
    <>
      <AuthHeader />
      <main className="min-h-screen bg-[#f8f9ff] px-6 py-28 lg:px-20">
        <article className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-indigo-600">{siteName}</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{title}</h1>

          <div className="mt-8 text-sm leading-7 text-slate-600">
            {loading && <p className="font-semibold text-slate-500">Loading admin content...</p>}
            {!loading && failed && (
              <p className="rounded-2xl border border-red-100 bg-red-50 p-4 font-semibold text-red-700">
                Unable to load this page from admin settings.
              </p>
            )}
            {!loading && !failed && !content && (
              <p className="rounded-2xl border border-amber-100 bg-amber-50 p-4 font-semibold text-amber-800">
                This page has not been published yet. Add content from Admin Settings, Legal Pages.
              </p>
            )}
            {!loading && !failed && content && containsHtml && (
              <div
                className="space-y-4 [&_a]:font-bold [&_a]:text-indigo-600 [&_blockquote]:border-l-4 [&_blockquote]:border-indigo-200 [&_blockquote]:pl-4 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-black [&_h2]:text-slate-900 [&_h3]:mt-6 [&_h3]:text-lg [&_h3]:font-black [&_h3]:text-slate-900 [&_li]:ml-5 [&_ol]:list-decimal [&_p]:text-slate-600 [&_strong]:font-black [&_ul]:list-disc"
                dangerouslySetInnerHTML={{ __html: safeHtml }}
              />
            )}
            {!loading && !failed && content && !containsHtml && (
              <div className="whitespace-pre-line text-slate-600">{content}</div>
            )}
          </div>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
