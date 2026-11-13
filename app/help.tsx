import Constants from 'expo-constants';
import { StyleSheet, Text } from 'react-native';

import { Card, Page, PageHeading, SectionTitle } from '../src/components/ui/controls';
import { goBack } from '../src/hooks/navigation';
import { uk } from '../src/localization/uk';
import { useTheme } from '../src/theme/theme';

export default function HelpScreen() {
  const theme = useTheme();
  const version = Constants.expoConfig?.version;
  const bodyStyle = [styles.body, { color: theme.text }];

  return (
    <Page>
      <PageHeading title={uk.help.title} onBack={goBack} inline />
      <Card>
        <SectionTitle>{uk.help.rulesTitle}</SectionTitle>
        {uk.help.rules.map((rule) => <Text key={rule} style={bodyStyle}>{rule}</Text>)}
      </Card>
      <Card>
        <SectionTitle>{uk.help.controlsTitle}</SectionTitle>
        <Text style={bodyStyle}>{uk.help.controls}</Text>
        <Text style={bodyStyle}>{uk.help.remaining}</Text>
      </Card>
      <Card>
        <SectionTitle>{uk.help.aboutTitle}</SectionTitle>
        <Text style={bodyStyle}>{uk.help.about}</Text>
        {version && <Text style={[styles.version, { color: theme.muted }]}>{uk.help.version(version)}</Text>}
        <Text style={[styles.dedication, { color: theme.primary }]}>{uk.help.dedication}</Text>
      </Card>
    </Page>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: 16, lineHeight: 24 },
  version: { fontSize: 13, fontWeight: '600' },
  dedication: { fontSize: 21, lineHeight: 29, fontWeight: '800', marginTop: 4 },
});
