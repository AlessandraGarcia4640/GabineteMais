import { theme } from './theme';
function luminance(color: string) {
  const linear = (start: number) => { const value = parseInt(color.slice(start, start + 2), 16) / 255; return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * linear(1) + 0.7152 * linear(3) + 0.0722 * linear(5);
}
function contrast(a: string, b: string) { const x = luminance(a); const y = luminance(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
it('cálculo usa luminância relativa, com referências preto/branco', () => { expect(contrast('#000000', '#FFFFFF')).toBe(21); expect(contrast('#FFFFFF', '#FFFFFF')).toBe(1); });
it('texto e estados pressionados preservam contraste mínimo 4,5:1', () => {
  for (const foreground of [theme.text, theme.muted, theme.primary, theme.danger]) for (const background of [theme.surface, theme.background, theme.surfacePressed]) expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
  expect(contrast(theme.surface, theme.primary)).toBeGreaterThanOrEqual(4.5); expect(contrast(theme.surface, theme.primaryPressed)).toBeGreaterThanOrEqual(4.5); expect(contrast(theme.danger, theme.errorSurface)).toBeGreaterThanOrEqual(4.5);
});
it('bordas identificadoras dos controles preservam contraste mínimo 3:1', () => { for (const background of [theme.surface, theme.background, theme.surfacePressed]) expect(contrast(theme.border, background)).toBeGreaterThanOrEqual(3); });
