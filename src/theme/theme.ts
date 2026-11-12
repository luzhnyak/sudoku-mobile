import { useColorScheme } from 'react-native';

import { useSessionStore } from '../store/sessionStore';

const light = {
  dark: false,
  background: '#F4F6FB',
  surface: '#FFFFFF',
  surfaceMuted: '#EDF1F9',
  text: '#14213D',
  muted: '#50617E',
  border: '#D4DEEE',
  primary: '#214CC3',
  onPrimary: '#FFFFFF',
  primaryPressed: '#16368D',
  primaryTint: '#E3EBFF',
  hero: '#13378F',
  heroMuted: '#C9D8FF',
  heroBorder: '#5273BD',
  boardLine: '#A5B4CC',
  boardMajor: '#405676',
  peer: '#EDF3FC',
  match: '#CCDCFF',
  selected: '#B2C8FF',
  warning: '#963744',
  warningTint: '#FBE7EA',
  hint: '#795300',
  hintTint: '#FFF0CB',
};

const dark: typeof light = {
  dark: true,
  background: '#0E1525',
  surface: '#172137',
  surfaceMuted: '#202E48',
  text: '#F0F4FF',
  muted: '#B3C2DC',
  border: '#344665',
  primary: '#ADC4FF',
  onPrimary: '#102859',
  primaryPressed: '#D0DDFF',
  primaryTint: '#243B68',
  hero: '#173771',
  heroMuted: '#D3DFFF',
  heroBorder: '#5577BD',
  boardLine: '#425579',
  boardMajor: '#859BC2',
  peer: '#1D2C49',
  match: '#2B477A',
  selected: '#3D5C95',
  warning: '#FFB0B7',
  warningTint: '#512D40',
  hint: '#FFE3A1',
  hintTint: '#483C28',
};

export type Theme = typeof light;
export const layout = { inset: 16, radius: 20, maxWidth: 500 } as const;

export function useTheme(): Theme {
  const system = useColorScheme();
  const preference = useSessionStore((state) => state.settings.theme);
  return (preference === 'system' ? system === 'dark' : preference === 'dark') ? dark : light;
}
