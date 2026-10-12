import { fireEvent, render, screen, cleanup } from '@testing-library/react-native';
import { Button, Choice, Checkbox, Card, TextField } from './index';
import { Text, View } from 'react-native';
import { theme } from '../lib/theme';
afterEach(cleanup);
it('foco por teclado é visível e não executa comandos', () => {
  const press = jest.fn(); render(<Button label="Ação fictícia" onPress={press} />); fireEvent(screen.getByRole('button'), 'focus'); expect(screen.getByRole('button')).toHaveStyle({ borderColor: theme.text }); expect(press).not.toHaveBeenCalled(); fireEvent(screen.getByRole('button'), 'blur'); expect(screen.getByRole('button')).toHaveStyle({ borderColor: 'transparent' });
});
it('escolhas genéricas recebem contexto e estado selecionado', () => { render(<Choice context="Contato-chave" label="Sim" selected onPress={() => undefined} />); expect(screen.getByRole('radio', { name: 'Contato-chave: Sim' }).props.accessibilityState.checked).toBe(true); });
it('controles permitem ampliação de fonte e alvos mínimos sem altura fixa', () => {
  const result = render(<View><Button label="Rótulo comprido de demonstração" onPress={() => undefined} /></View>); expect(screen.getByText('Rótulo comprido de demonstração').props.allowFontScaling).toBe(true); expect(screen.getByRole('button')).toHaveStyle({ minHeight: 52, minWidth: 48 });
  result.rerender(<View><Checkbox label="Item fictício" checked={false} onChange={() => undefined} /></View>); expect(screen.getByRole('checkbox')).toHaveStyle({ minHeight: 48, minWidth: 48 });
});
it('campo anuncia bloqueio e mantém dica junto ao erro', () => { render(<TextField label="Campo fictício" editable={false} accessibilityHint="Dica fictícia" errorText="Erro fictício" />); expect(screen.getByLabelText('Campo fictício').props.accessibilityState.disabled).toBe(true); expect(screen.getByLabelText('Campo fictício').props.accessibilityHint).toBe('Dica fictícia. Erro fictício'); expect(screen.getByRole('alert')).toHaveTextContent('Erro fictício'); });
it('card navegável tem área e foco próprios', () => { render(<Card label="Abrir fictício" onPress={() => undefined}><Text>Fictício</Text></Card>); fireEvent(screen.getByRole('button'), 'focus'); expect(screen.getByRole('button')).toHaveStyle({ minHeight: 48, borderColor: theme.primary }); });
