/**
 * @jest-environment jsdom
 */
import { applyDocumentChrome, documentChromeCss } from '../documentChrome';

describe('documentChrome', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '<div id="root"></div>';
  });

  it('locks html/body/#root scrolling and paints the theme background', () => {
    const css = documentChromeCss('rgb(245, 243, 238)');
    expect(css).toMatch(/html, body, #root \{[^}]*overflow-y: hidden !important/);
    expect(css).toMatch(/overflow: clip !important/);
    expect(css).toMatch(/height: 100% !important/);
    expect(css).toMatch(/background-color: rgb\(245, 243, 238\) !important/);
  });

  it('beats a later `overflow-x: hidden` reset that would make #root scrollable (the black band)', () => {
    applyDocumentChrome('rgb(245, 243, 238)');
    const landing = document.createElement('style');
    landing.textContent = 'html,body,#root{overflow-x:hidden;background:#0B0B0B}';
    document.head.appendChild(landing);
    const root = getComputedStyle(document.getElementById('root')!);
    expect(['hidden', 'clip']).toContain(root.overflowY);
  });

  it('re-applying updates one style element (theme switch), not a new one each time', () => {
    applyDocumentChrome('rgb(11, 11, 11)');
    applyDocumentChrome('rgb(245, 243, 238)');
    const els = document.querySelectorAll('#aivorah-document-chrome');
    expect(els).toHaveLength(1);
    expect(els[0].textContent).toContain('rgb(245, 243, 238)');
    expect(getComputedStyle(document.body).backgroundColor).toBe('rgb(245, 243, 238)');
  });

  it('is a no-op without a document (native)', () => {
    expect(() => applyDocumentChrome('#000', undefined)).not.toThrow();
  });
});
