import { Redirect, useLocalSearchParams } from 'expo-router';

import { Button } from '../../../components/Button';
import { Header } from '../../../components/Header';
import { Screen } from '../../../components/Screen';
import { TemplatePreview } from '../../../components/TemplatePreview';
import { getTemplate } from '../../../data/templates';
import { getTheme } from '../../../data/themes';
import { useRequireLoginToCreate } from '../../../features/create/useRequireLoginToCreate';

export default function TemplateDetail() {
  const { theme: themeId, templateId } = useLocalSearchParams<{ theme: string; templateId: string }>();
  const theme = getTheme(themeId);
  const template = getTemplate(themeId, templateId);
  const { start, modal } = useRequireLoginToCreate();

  if (!theme || !template) return <Redirect href="/create" />;

  return (
    <Screen
      edges={['top']}
      background={template.style.bg}
      header={
        <Header
          title={theme.title}
          right={<Button label="제작하기" size="sm" onPress={() => start(template.name)} />}
        />
      }
    >
      <TemplatePreview template={template} />
      {modal}
    </Screen>
  );
}
