import { useState } from 'react';
import { KeyboardAvoidingView, Text, View } from 'react-native';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { AuthScreen, Button, Card, Checkbox, Choice, EmptyState, ErrorState, LoadingState, Screen, TextField } from './index';
import { strings } from '../lib/strings';
jest.mock('react-native-safe-area-context', () => { const mock = jest.requireActual<typeof import('react-native-safe-area-context/jest/mock')>('react-native-safe-area-context/jest/mock'); return mock.default; });
afterEach(cleanup);
it('botão bloqueia novos comandos durante carga e quando desabilitado', () => {
  const action = jest.fn(); const result = render(<Button label="Salvar fictício" onPress={action} loading />);
  expect(screen.getByRole('button').props.accessibilityState).toEqual({ busy: true, disabled: true }); fireEvent.press(screen.getByRole('button')); expect(action).not.toHaveBeenCalled();
  result.rerender(<Button label="Salvar fictício" onPress={action} disabled secondary />); fireEvent.press(screen.getByRole('button')); expect(action).not.toHaveBeenCalled();
  result.rerender(<Button label="Salvar fictício" onPress={action} />); fireEvent.press(screen.getByRole('button')); expect(action).toHaveBeenCalledTimes(1);
});
it('campo conserva atributos nativos, estilo e erro acessível', () => {
  const change = jest.fn(); render(<TextField label="Campo fictício" value="Texto" multiline editable={false} secureTextEntry style={{ minHeight: 80 }} errorText="Erro fictício" onChangeText={change} />);
  const input = screen.getByLabelText('Campo fictício'); expect(input.props.multiline).toBe(true); expect(input.props.editable).toBe(false); expect(input.props.secureTextEntry).toBe(true);
  expect(input).toHaveStyle({ minHeight: 80 }); expect(input.props.accessibilityHint).toBe('Erro fictício'); expect(screen.getByText('Erro fictício')).toBeTruthy();
});
it('campo controlado encaminha digitação sem manter valor próprio', () => {
  function Example() { const [value, setValue] = useState(''); return <TextField label="Nome fictício" value={value} onChangeText={setValue} />; }
  render(<Example />); fireEvent.changeText(screen.getByLabelText('Nome fictício'), 'Novo nome'); expect(screen.getByLabelText('Nome fictício').props.value).toBe('Novo nome');
});
it('card estático não cria ação e card interativo tem nome e executa uma ação', () => {
  const action = jest.fn(); const result = render(<Card><Text>Registro fictício</Text></Card>); expect(screen.queryByRole('button')).toBeNull();
  result.rerender(<Card label="Abrir registro" onPress={action}><Text>Registro fictício</Text></Card>); fireEvent.press(screen.getByRole('button', { name: 'Abrir registro' })); expect(action).toHaveBeenCalledTimes(1);
});
it('escolha reflete seleção e impede ação desabilitada', () => {
  const action = jest.fn(); const result = render(<Choice label="Opção fictícia" selected onPress={action} disabled />);
  expect(screen.getByRole('radio').props.accessibilityState).toEqual({ checked: true, disabled: true }); fireEvent.press(screen.getByRole('radio')); expect(action).not.toHaveBeenCalled();
  result.rerender(<Choice label="Opção fictícia" selected={false} onPress={action} />); fireEvent.press(screen.getByRole('radio')); expect(action).toHaveBeenCalledTimes(1);
});
it('checkbox comunica o próximo estado e bloqueia ação desabilitada', () => {
  const action = jest.fn(); const result = render(<Checkbox label="Item fictício" checked={false} onChange={action} />); fireEvent.press(screen.getByRole('checkbox')); expect(action).toHaveBeenLastCalledWith(true);
  result.rerender(<Checkbox label="Item fictício" checked onChange={action} />); fireEvent.press(screen.getByRole('checkbox')); expect(action).toHaveBeenLastCalledWith(false);
  result.rerender(<Checkbox label="Item fictício" checked onChange={action} disabled />); fireEvent.press(screen.getByRole('checkbox')); expect(action).toHaveBeenCalledTimes(2);
});
it('feedback oferece estado vazio, carga customizada e recuperação manual', () => {
  const retry = jest.fn(); const result = render(<View><LoadingState message="Carregando registros fictícios" /></View>); expect(screen.getByText('Carregando registros fictícios')).toBeTruthy();
  result.rerender(<View><EmptyState message="Sem registros fictícios" /></View>); expect(screen.getByText('Sem registros fictícios')).toBeTruthy(); expect(screen.queryByRole('button')).toBeNull();
  result.rerender(<View><ErrorState retry={retry} updating /></View>); expect(screen.getByRole('alert')).toHaveTextContent(strings.feedback.updatingError); fireEvent.press(screen.getByRole('button', { name: strings.feedback.retry })); expect(retry).toHaveBeenCalledTimes(1);
});
it('mensagem de erro específica substitui a mensagem padrão', () => {
  render(<ErrorState message="Falha fictícia conhecida" retry={() => undefined} />); expect(screen.getByRole('alert')).toHaveTextContent('Falha fictícia conhecida'); expect(screen.queryByText(strings.feedback.error)).toBeNull();
});
it('Screen mantém conteúdo e ativa tratamento de teclado somente quando solicitado', () => {
  const result = render(<Screen><Text>Conteúdo fictício</Text></Screen>); expect(screen.getByText('Conteúdo fictício')).toBeTruthy(); expect(result.UNSAFE_queryByType(KeyboardAvoidingView)).toBeNull();
  result.rerender(<Screen keyboard><Text>Conteúdo fictício</Text></Screen>); expect(result.UNSAFE_getByType(KeyboardAvoidingView)).toBeTruthy();
});
it('AuthScreen compõe o contêiner comum e mantém formulário rolável', () => {
  const result = render(<AuthScreen><TextField label="Acesso fictício" value="" /></AuthScreen>); expect(screen.getByLabelText('Acesso fictício')).toBeTruthy(); expect(result.UNSAFE_getByType(KeyboardAvoidingView)).toBeTruthy();
});
