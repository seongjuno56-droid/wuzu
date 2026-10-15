import { Redirect, useLocalSearchParams } from 'expo-router';

import { BottomCTA } from '../../../components/BottomCTA';
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
      header={<Header title={`${template.name} 미리보기`} />}
      background={template.style.bg}
      footer={
        <BottomCTA>
          <Button label="이 템플릿으로 만들기" onPress={() => start(template.name)} />
        </BottomCTA>
      }
    >
      <TemplatePreview template={template} />
      {modal}
    </Screen>
  );
}
