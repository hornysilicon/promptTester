import { useEffect, useRef, useState } from "react";

interface Props {
  html: string;
}

const FRAME_STYLE =
  "body{margin:0;padding:10px;background:#0d0f13;color:#e6e6e6;" +
  'font-family:system-ui,-apple-system,"Segoe UI",sans-serif;font-size:14px;' +
  "line-height:1.6;white-space:pre-wrap;word-wrap:break-word;}" +
  "details{border:1px solid #2a2f3a;border-radius:6px;padding:8px;margin:8px 0;}" +
  "font{font-weight:inherit;}" +
  "hr{border-color:#2a2f3a;}";

export default function HtmlFrame({ html }: Props) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [height, setHeight] = useState(40);

  useEffect(() => {
    const frame = frameRef.current;
    if (frame === null) return;
    let observer: ResizeObserver | null = null;

    const sync = () => {
      const doc = frame.contentDocument;
      if (doc === null) return;
      const h =
        doc.documentElement.scrollHeight ||
        (doc.body !== null ? doc.body.scrollHeight : 0);
      setHeight(Math.max(40, h));
    };

    const attach = () => {
      const doc = frame.contentDocument;
      if (doc === null || doc.body === null) return;
      sync();
      if (observer !== null) observer.disconnect();
      observer = new ResizeObserver(sync);
      observer.observe(doc.body);
    };

    const onLoad = () => attach();
    frame.addEventListener("load", onLoad);
    attach();

    return () => {
      frame.removeEventListener("load", onLoad);
      if (observer !== null) observer.disconnect();
    };
  }, [html]);

  const doc = `<!doctype html><html><head><meta charset="utf-8"><style>${FRAME_STYLE}</style></head><body>${html}</body></html>`;

  return (
    <iframe
      ref={frameRef}
      className="html-frame"
      sandbox="allow-same-origin"
      srcDoc={doc}
      style={{ height }}
      title="Response preview"
    />
  );
}
