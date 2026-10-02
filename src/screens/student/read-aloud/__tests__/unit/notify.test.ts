import { Alert, Platform } from 'react-native';
import { notify } from '../../utils/notify';

test('native uses Alert, web uses the browser dialog', () => {
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  notify('Title', 'Message');
  expect(alertSpy).toHaveBeenCalledWith('Title', 'Message');

  const original = Object.getOwnPropertyDescriptor(Platform, 'OS')!;
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'web' });
  const g = global as any;
  const hadWindow = 'window' in g;
  if (!hadWindow) g.window = {};
  const prev = g.window.alert;
  g.window.alert = jest.fn();
  notify('Microphone Access', 'Allow it');
  expect(g.window.alert).toHaveBeenCalledWith('Microphone Access\n\nAllow it');
  g.window.alert = prev;
  if (!hadWindow) delete g.window;
  Object.defineProperty(Platform, 'OS', original);
});
